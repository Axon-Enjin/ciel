"""
Microsoft Foundry client for AI model access.

GPT-only runtime (see cr-ciel-002): a single GPT deployment on Microsoft
Foundry powers Theory-of-Change generation and the adversarial
"intelligent-failure" critique. The critique is a separate GPT pass with a
distinct privileged system prompt and a deeper reasoning effort — single-model
self-critique, not a different model family.

Talks to Foundry via the **Responses API** through ``AsyncAzureOpenAI``. The
``gpt-5.x`` deployments on this Foundry resource are only exposed on the
Responses API (``/openai/responses``) — the legacy chat-completions route 404s
— so all calls go through ``client.responses.create``. The dedicated Azure
client (``azure_endpoint`` + ``api_version``) is used because the raw
``/openai/v1`` base URL routes the Responses endpoint unreliably.

GPT-5.x are reasoning models, so requests use ``max_output_tokens`` +
``reasoning={"effort": ...}`` and omit ``temperature`` (set
``FOUNDRY_REASONING_MODEL=false`` for a classic gpt-4o-class deployment that
uses ``temperature`` instead). When JSON output is required, the input text must
contain the word "json" (a Responses-API constraint for ``text.format`` of type
``json_object``).
"""

import json
import logging
from typing import Any, AsyncIterator, Dict, Optional
from urllib.parse import urlparse

from openai import AsyncAzureOpenAI

from ai_service.config import settings

logger = logging.getLogger(__name__)

_JSON_FORMAT = {"type": "json_object"}


class FoundryClient:
    """Microsoft Foundry (Azure OpenAI) Responses-API wrapper for the GPT runtime.

    One deployment serves both generation and critique. Token budgets follow
    SDD §8: 12k generation, 10k critique.
    """

    def __init__(self):
        """Configure model + budget settings; defer SDK client creation.

        The ``AsyncAzureOpenAI`` client is built lazily on first use so importing
        this module never requires valid Foundry credentials (mirrors the
        Supabase client). This keeps the app importable for tests/local boot.
        """
        self._client: Optional[AsyncAzureOpenAI] = None

        # GPT-only: one deployment for every task (generation + critique).
        self.model = settings.FOUNDRY_DEPLOYMENT_GPT

        # Token budgets per SDD §8 (output-token budgets on the Responses API).
        self.max_tokens_generation = settings.MAX_TOKENS_TOC_GENERATION  # 12000
        self.max_tokens_critique = settings.MAX_TOKENS_CRITIQUE  # 10000

    @property
    def client(self) -> AsyncAzureOpenAI:
        """Lazily construct the Azure OpenAI client with bounded timeout/retries.

        ``FOUNDRY_ENDPOINT`` must be the **bare resource** endpoint, e.g.
        ``https://<resource>.services.ai.azure.com`` (no ``/openai/v1`` suffix).
        """
        if self._client is None:
            # AsyncAzureOpenAI expects the resource *base* origin
            # (https://<resource>.services.ai.azure.com) and appends the
            # deployment path itself. Tolerate a full path in FOUNDRY_ENDPOINT
            # (e.g. ".../openai/v1/responses") by reducing it to scheme://host.
            parsed = urlparse(settings.FOUNDRY_ENDPOINT)
            base_endpoint = (
                f"{parsed.scheme}://{parsed.netloc}"
                if parsed.scheme and parsed.netloc
                else settings.FOUNDRY_ENDPOINT
            )
            self._client = AsyncAzureOpenAI(
                azure_endpoint=base_endpoint,
                api_key=settings.FOUNDRY_API_KEY,
                api_version=settings.FOUNDRY_API_VERSION,
                timeout=settings.FOUNDRY_TIMEOUT_SECONDS,
                max_retries=settings.FOUNDRY_MAX_RETRIES,
            )
        return self._client

    def _response_kwargs(
        self,
        max_tokens: int,
        temperature: float,
        reasoning_effort: str,
    ) -> Dict[str, Any]:
        """Assemble Responses-API params for the configured model class.

        Reasoning models (GPT-5.x) use ``max_output_tokens`` +
        ``reasoning={"effort": ...}`` and reject ``temperature``. Classic models
        use ``max_output_tokens`` + ``temperature``.
        """
        kwargs: Dict[str, Any] = {"max_output_tokens": max_tokens}
        if settings.FOUNDRY_REASONING_MODEL:
            kwargs["reasoning"] = {"effort": reasoning_effort}
        else:
            kwargs["temperature"] = temperature
        return kwargs

    async def generate_toc(
        self,
        system_prompt: str,
        user_prompt: str,
        evidence_context: str,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> AsyncIterator[str] | str:
        """Generate a Theory of Change with the Foundry GPT deployment.

        Args:
            system_prompt: System instructions for ToC generation.
            user_prompt: User's problem statement and context.
            evidence_context: Retrieved evidence chunks for grounding.
            temperature: Sampling temperature (ignored for reasoning models).
            stream: Whether to stream the response.

        Returns:
            Generated ToC as a streaming iterator or a complete JSON string.
        """
        # The input must mention "json" to use JSON output mode on the
        # Responses API — the closing instruction below satisfies that.
        input_text = f"""# Evidence Context

{evidence_context}

# User Request

{user_prompt}

Generate a Theory of Change following the system instructions. Ground all claims in the provided evidence or explicitly mark as [UNVERIFIED - needs human input]. Return a single valid JSON object."""

        kwargs = self._response_kwargs(
            max_tokens=self.max_tokens_generation,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_GENERATION,
        )

        if stream:
            return self._stream_response(
                instructions=system_prompt,
                input_text=input_text,
                json_mode=True,
                **kwargs,
            )

        try:
            response = await self.client.responses.create(
                model=self.model,
                instructions=system_prompt,
                input=input_text,
                text={"format": _JSON_FORMAT},
                **kwargs,
            )
            return response.output_text or ""
        except Exception as e:
            logger.error(f"ToC generation failed: {e}")
            raise

    async def generate_interrogation(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.5,
    ) -> str:
        """Generate root-cause clarifying questions as JSON."""
        input_text = f"""# Need and context

{user_prompt}

Return 2-3 clarifying questions as a single valid JSON object."""
        kwargs = self._response_kwargs(
            max_tokens=2000,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_GENERATION,
        )
        try:
            response = await self.client.responses.create(
                model=self.model,
                instructions=system_prompt,
                input=input_text,
                text={"format": _JSON_FORMAT},
                **kwargs,
            )
            return response.output_text or ""
        except Exception as e:
            logger.error(f"Interrogation generation failed: {e}")
            raise

    async def _stream_response(
        self,
        instructions: str,
        input_text: str,
        json_mode: bool = False,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream a Responses-API completion from the GPT deployment.

        Yields text deltas as they are generated.
        """
        create_kwargs: Dict[str, Any] = {
            "model": self.model,
            "instructions": instructions,
            "input": input_text,
            "stream": True,
            **kwargs,
        }
        if json_mode:
            create_kwargs["text"] = {"format": _JSON_FORMAT}

        try:
            stream = await self.client.responses.create(**create_kwargs)
            async for event in stream:
                if event.type == "response.output_text.delta":
                    yield event.delta
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            raise

    async def generate_critique(
        self,
        toc_content: str,
        evidence_context: str,
        temperature: float = 0.3,
    ) -> str:
        """Generate an adversarial critique with a separate GPT pass.

        Uses a distinct privileged system prompt and a deeper reasoning effort
        for a more focused, critical analysis (cr-ciel-002 §2).

        Args:
            toc_content: The generated ToC to critique.
            evidence_context: Evidence that was used for grounding.
            temperature: Sampling temperature (ignored for reasoning models).

        Returns:
            Critique text with identified issues and severity.
        """
        system_prompt = """You are an expert evaluator of Theories of Change for social sector programs. You surface the most likely ways this program will fail in the real world — concise, high-signal "intelligent failure" warnings a practitioner must confront before committing.

Return the TOP 2-3 failure modes only. For each, write ONE short paragraph (max 2 sentences) that:
- names a concrete way similar programs have failed in comparable contexts,
- ties it to a specific assumption, logic gap, evidence weakness, or feasibility risk in THIS ToC,
- and implies what to watch or plan for.

Lead each with its severity in brackets, e.g. "[HIGH] ...". Be specific and blunt. No preamble, no headings, no overall summary, no closing remarks — just the 2-3 warnings as a plain list."""

        input_text = f"""# Theory of Change to Critique

{toc_content}

# Evidence Context Used

{evidence_context}

Give the 2-3 most important failure-mode warnings for this Theory of Change."""

        kwargs = self._response_kwargs(
            max_tokens=self.max_tokens_critique,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_CRITIQUE,
        )

        try:
            response = await self.client.responses.create(
                model=self.model,
                instructions=system_prompt,
                input=input_text,
                **kwargs,
            )
            return response.output_text or ""
        except Exception as e:
            logger.error(f"Critique generation failed: {e}")
            raise

    async def generate_grant(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
    ) -> str:
        """
        Draft a funder-matched grant proposal (PRD-F2).

        Lower temperature than ToC generation for grounded, funder-aligned prose
        (ignored for reasoning models). Returns a JSON string of
        {"sections": [...]} per the system prompt.
        """
        input_text = (
            f"{user_prompt}\n\nDraft the proposal sections following the system "
            "instructions. Ground every claim in the provided ToC nodes/evidence or "
            "mark it [UNVERIFIED - needs human input]. Return a single valid JSON object."
        )

        kwargs = self._response_kwargs(
            max_tokens=self.max_tokens_generation,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_GENERATION,
        )

        try:
            response = await self.client.responses.create(
                model=self.model,
                instructions=system_prompt,
                input=input_text,
                text={"format": _JSON_FORMAT},
                **kwargs,
            )
            return response.output_text or ""
        except Exception as e:
            logger.error(f"Grant generation failed: {e}")
            raise

    async def extract_structured_output(
        self,
        text: str,
        schema: Dict[str, Any],
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extract structured JSON from text using the GPT deployment.

        Useful for parsing a ToC into structured format or extracting specific
        fields from generated content.

        Args:
            text: Text to parse.
            schema: JSON schema describing the desired structure.
            model: Deployment override (defaults to the configured GPT model).

        Returns:
            Parsed structured data.
        """
        system_prompt = f"""Extract structured information from the provided text according to this JSON schema:

{json.dumps(schema, indent=2)}

Return ONLY a valid JSON object matching the schema. Do not include any other text."""

        # Append an explicit JSON instruction so the input satisfies the
        # Responses-API "must contain 'json'" rule for JSON output mode.
        input_text = f"{text}\n\nReturn the result as a single valid JSON object."

        kwargs = self._response_kwargs(
            max_tokens=4000,
            temperature=0.0,  # Deterministic for structured extraction.
            reasoning_effort="low",
        )

        try:
            response = await self.client.responses.create(
                model=model or self.model,
                instructions=system_prompt,
                input=input_text,
                text={"format": _JSON_FORMAT},
                **kwargs,
            )
            return json.loads(response.output_text or "{}")
        except Exception as e:
            logger.error(f"Structured extraction failed: {e}")
            raise

    async def health_check(self) -> bool:
        """Check Foundry API connectivity.

        Returns:
            True if the GPT deployment responds, False otherwise.
        """
        try:
            await self.client.responses.create(
                model=self.model,
                input="ping",
                **self._response_kwargs(
                    max_tokens=1000,
                    temperature=0.0,
                    reasoning_effort="low",
                ),
            )
            return True
        except Exception as e:
            logger.error(f"Foundry health check failed: {e}")
            return False


# Global instance
foundry_client = FoundryClient()

# Made with Bob
