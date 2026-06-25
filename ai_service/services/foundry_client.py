"""
Microsoft Foundry client for AI model access.

Provides access to Claude models (Sonnet for generation, Opus for critique)
via Azure AI Foundry. Implements streaming, token budgets, and error handling.
"""

import logging
from typing import List, Dict, Any, Optional, AsyncIterator
from anthropic import AsyncAnthropic
import json

from ai_service.config import settings

logger = logging.getLogger(__name__)


class FoundryClient:
    """
    Microsoft Foundry client wrapper for Claude models.
    
    Uses Claude 3.5 Sonnet for ToC generation and Claude 3 Opus for critique.
    Implements token budgets per SDD §8: 12k generation, 10k critique.
    """
    
    def __init__(self):
        """Initialize Anthropic client for Azure AI Foundry."""
        self.client = AsyncAnthropic(
            api_key=settings.FOUNDRY_API_KEY,
            base_url=settings.FOUNDRY_ENDPOINT,
        )
        
        # Model configurations per SDD §8
        self.sonnet_model = "claude-3-5-sonnet-20241022"  # For generation
        self.opus_model = "claude-3-opus-20240229"  # For critique
        
        # Token budgets
        self.max_tokens_generation = settings.MAX_TOKENS_TOC_GENERATION  # 12000
        self.max_tokens_critique = settings.MAX_TOKENS_CRITIQUE  # 10000
    
    async def generate_toc(
        self,
        system_prompt: str,
        user_prompt: str,
        evidence_context: str,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> AsyncIterator[str] | str:
        """
        Generate Theory of Change using Claude Sonnet.
        
        Args:
            system_prompt: System instructions for ToC generation
            user_prompt: User's problem statement and context
            evidence_context: Retrieved evidence chunks for grounding
            temperature: Sampling temperature (0-1)
            stream: Whether to stream the response
            
        Returns:
            Generated ToC as streaming iterator or complete string
        """
        try:
            messages = [
                {
                    "role": "user",
                    "content": f"""# Evidence Context

{evidence_context}

# User Request

{user_prompt}

Generate a Theory of Change following the system instructions. Ground all claims in the provided evidence or explicitly mark as [UNVERIFIED - needs human input]."""
                }
            ]
            
            if stream:
                return self._stream_response(
                    model=self.sonnet_model,
                    system=system_prompt,
                    messages=messages,
                    max_tokens=self.max_tokens_generation,
                    temperature=temperature,
                )
            else:
                response = await self.client.messages.create(
                    model=self.sonnet_model,
                    system=system_prompt,
                    messages=messages,
                    max_tokens=self.max_tokens_generation,
                    temperature=temperature,
                )
                return response.content[0].text
                
        except Exception as e:
            logger.error(f"ToC generation failed: {e}")
            raise
    
    async def _stream_response(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[str]:
        """
        Stream response from Claude.
        
        Args:
            model: Model identifier
            system: System prompt
            messages: Conversation messages
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Yields:
            Text chunks as they are generated
        """
        try:
            async with self.client.messages.stream(
                model=model,
                system=system,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            ) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            raise
    
    async def generate_critique(
        self,
        toc_content: str,
        evidence_context: str,
        temperature: float = 0.3,
    ) -> str:
        """
        Generate adversarial critique using Claude Opus.
        
        Uses lower temperature for more focused, critical analysis.
        
        Args:
            toc_content: The generated ToC to critique
            evidence_context: Evidence that was used for grounding
            temperature: Sampling temperature (lower for critique)
            
        Returns:
            Critique text with identified issues and severity
        """
        try:
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

            messages = [
                {
                    "role": "user",
                    "content": f"""# Theory of Change to Critique

{toc_content}

# Evidence Context Used

{evidence_context}

Provide a thorough critique following the system instructions. Focus on substantive issues that could affect program success."""
                }
            ]
            
            response = await self.client.messages.create(
                model=self.opus_model,
                system=system_prompt,
                messages=messages,
                max_tokens=self.max_tokens_critique,
                temperature=temperature,
            )
            
            return response.content[0].text
            
        except Exception as e:
            logger.error(f"Critique generation failed: {e}")
            raise
    
    async def extract_structured_output(
        self,
        text: str,
        schema: Dict[str, Any],
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract structured data from text using Claude.
        
        Useful for parsing ToC into structured format or extracting
        specific fields from generated content.
        
        Args:
            text: Text to parse
            schema: JSON schema describing desired structure
            model: Model to use (defaults to Sonnet)
            
        Returns:
            Parsed structured data
        """
        try:
            model = model or self.sonnet_model
            
            system_prompt = f"""Extract structured information from the provided text according to this JSON schema:

{json.dumps(schema, indent=2)}

Return ONLY valid JSON matching the schema. Do not include any other text."""

            messages = [
                {
                    "role": "user",
                    "content": text
                }
            ]
            
            response = await self.client.messages.create(
                model=model,
                system=system_prompt,
                messages=messages,
                max_tokens=4000,
                temperature=0.0,  # Deterministic for structured extraction
            )
            
            # Parse JSON from response
            json_text = response.content[0].text.strip()
            # Remove markdown code blocks if present
            if json_text.startswith("```"):
                json_text = json_text.split("```")[1]
                if json_text.startswith("json"):
                    json_text = json_text[4:]
            
            return json.loads(json_text)
            
        except Exception as e:
            logger.error(f"Structured extraction failed: {e}")
            raise
    
    async def health_check(self) -> bool:
        """
        Check Foundry API connectivity.
        
        Returns:
            True if API is accessible, False otherwise
        """
        try:
            # Simple test request
            response = await self.client.messages.create(
                model=self.sonnet_model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10,
            )
            return True
        except Exception as e:
            logger.error(f"Foundry health check failed: {e}")
            return False


# Global instance
foundry_client = FoundryClient()

# Made with Bob
