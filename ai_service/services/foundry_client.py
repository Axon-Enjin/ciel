"""
Microsoft Foundry client for AI model access.

GPT-only runtime (see cr-ciel-002): a single GPT deployment on Microsoft
Foundry powers Theory-of-Change generation and the adversarial
"intelligent-failure" critique. The critique is a separate GPT pass with a
distinct privileged system prompt and a deeper reasoning effort — single-model
self-critique, not a different model family.

Talks to Foundry through the OpenAI-compatible Azure client. GPT-5.x are
reasoning models, so requests use ``max_completion_tokens`` + ``reasoning_effort``
and omit ``temperature`` (set ``FOUNDRY_REASONING_MODEL=false`` for a classic
gpt-4o-class deployment that uses ``temperature`` + ``max_tokens``).
"""

import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional
from urllib.parse import urlparse

from openai import AsyncAzureOpenAI

from ai_service.config import settings

logger = logging.getLogger(__name__)


class FoundryClient:
    """Microsoft Foundry (Azure OpenAI) client wrapper for the GPT runtime.

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

        # Token budgets per SDD §8.
        self.max_tokens_generation = settings.MAX_TOKENS_TOC_GENERATION  # 12000
        self.max_tokens_critique = settings.MAX_TOKENS_CRITIQUE  # 10000

    @property
    def client(self) -> AsyncAzureOpenAI:
        """Lazily construct the Azure OpenAI client with bounded timeout/retries."""
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
                api_key=settings.FOUNDRY_API_KEY,
                azure_endpoint=base_endpoint,
                api_version=settings.FOUNDRY_API_VERSION,
                timeout=settings.FOUNDRY_TIMEOUT_SECONDS,
                max_retries=settings.FOUNDRY_MAX_RETRIES,
            )
        return self._client

    def _completion_kwargs(
        self,
        max_tokens: int,
        temperature: float,
        reasoning_effort: str,
    ) -> Dict[str, Any]:
        """Assemble request params for the configured model class.

        Reasoning models (GPT-5.x) reject ``temperature``/``max_tokens`` and use
        ``max_completion_tokens`` + ``reasoning_effort``. Classic models use the
        traditional ``temperature`` + ``max_tokens`` pair.
        """
        if settings.FOUNDRY_REASONING_MODEL:
            # `reasoning_effort` isn't a top-level kwarg on chat.completions in all
            # SDK versions — pass it through extra_body so it lands in the request
            # JSON regardless of the installed openai version.
            return {
                "max_completion_tokens": max_tokens,
                "extra_body": {"reasoning_effort": reasoning_effort},
            }
        return {
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

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
        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"""# Evidence Context

{evidence_context}

# User Request

{user_prompt}

Generate a Theory of Change following the system instructions. Ground all claims in the provided evidence or explicitly mark as [UNVERIFIED - needs human input]. Return a single valid JSON object.""",
            },
        ]

        kwargs = self._completion_kwargs(
            max_tokens=self.max_tokens_generation,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_GENERATION,
        )

        if stream:
            return self._stream_response(messages=messages, **kwargs)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                **kwargs,
            )
            return response.choices[0].message.content or ""
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
        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"""# Need and context

{user_prompt}

Return 2-3 clarifying questions as JSON.""",
            },
        ]
        kwargs = self._completion_kwargs(
            max_tokens=2000,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_GENERATION,
        )
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                **kwargs,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Interrogation generation failed: {e}")
            raise

    async def _stream_response(
        self,
        messages: List[Dict[str, str]],
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream a chat completion from the GPT deployment.

        Yields text deltas as they are generated.
        """
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
                **kwargs,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
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
        system_prompt = """You are an expert evaluator of Theories of Change for social sector programs. Your role is to provide adversarial critique to identify potential flaws, gaps, and risks.

Analyze the ToC for:
1. **Logic Gaps**: Are causal pathways well-justified? Are there missing links?
2. **Evidence Quality**: Are claims properly grounded in evidence? Is evidence tier appropriate?
3. **Assumptions**: Are critical assumptions identified and testable?
4. **Context**: Are contextual factors and risks adequately addressed?
5. **Feasibility**: Is the intervention realistic given typical resource constraints?

For each issue found, provide:
- **Issue**: Clear description of the problem
- **Severity**: CRITICAL (blocks implementation), HIGH (major risk), MEDIUM (should address), LOW (minor improvement)
- **Recommendation**: Specific suggestion for improvement

Be constructively critical. The goal is to strengthen the ToC, not reject it."""

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"""# Theory of Change to Critique

{toc_content}

# Evidence Context Used

{evidence_context}

Provide a thorough critique following the system instructions. Focus on substantive issues that could affect program success.""",
            },
        ]

        kwargs = self._completion_kwargs(
            max_tokens=self.max_tokens_critique,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_CRITIQUE,
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                **kwargs,
            )
            return response.choices[0].message.content or ""
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
        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"{user_prompt}\n\nDraft the proposal sections following the system "
                    "instructions. Ground every claim in the provided ToC nodes/evidence or "
                    "mark it [UNVERIFIED - needs human input]. Return a single valid JSON object."
                ),
            },
        ]

        kwargs = self._completion_kwargs(
            max_tokens=self.max_tokens_generation,
            temperature=temperature,
            reasoning_effort=settings.FOUNDRY_REASONING_EFFORT_GENERATION,
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                **kwargs,
            )
            return response.choices[0].message.content or ""
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

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ]

        kwargs = self._completion_kwargs(
            max_tokens=4000,
            temperature=0.0,  # Deterministic for structured extraction.
            reasoning_effort="low",
        )

        try:
            response = await self.client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                response_format={"type": "json_object"},
                **kwargs,
            )
            return json.loads(response.choices[0].message.content or "{}")
        except Exception as e:
            logger.error(f"Structured extraction failed: {e}")
            raise

    async def health_check(self) -> bool:
        """Check Foundry API connectivity.

        Returns:
            True if the GPT deployment responds, False otherwise.
        """
        try:
            await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "ping"}],
                **self._completion_kwargs(
                    max_tokens=16,
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
