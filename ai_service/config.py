"""
Ciel AI Service Configuration
Manages environment variables and settings
Date: 2026-06-25
"""

from pathlib import Path

from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Supabase Configuration (defaults allow local dev/tests without .env)
    SUPABASE_URL: str = "http://127.0.0.1:54321"
    SUPABASE_SERVICE_KEY: str = "dev-service-key"

    # Microsoft Foundry Configuration (GPT-only runtime — see cr-ciel-002)
    # FOUNDRY_ENDPOINT is the BARE resource endpoint (no /openai path), e.g.
    # https://<resource>.services.ai.azure.com — the AsyncAzureOpenAI client
    # appends the Responses-API route itself.
    FOUNDRY_ENDPOINT: str = "https://example.invalid"
    FOUNDRY_API_KEY: str = ""
    # Azure data-plane API version. gpt-5.x reasoning models on the Responses
    # API need a recent preview version; "preview" is NOT a valid value here.
    FOUNDRY_API_VERSION: str = "2025-04-01-preview"
    # Single GPT deployment powers every AI task (generation + critique).
    # The concrete deployment name is set in the Foundry portal; "gpt-5.4" is
    # the team default. Critique is a separate GPT pass, not a separate model.
    FOUNDRY_DEPLOYMENT_GPT: str = "gpt-5.4"

    # GPT-5.x are reasoning models: they reject temperature/top_p/max_tokens and
    # require max_completion_tokens. Set False for a classic (gpt-4o-class)
    # deployment that uses temperature + max_tokens instead.
    FOUNDRY_REASONING_MODEL: bool = True
    # Reasoning effort per task. Critique uses a higher effort for a deeper,
    # Reasoning effort per task. "high" makes gpt-5.x dramatically slower
    # (tens of seconds → timeouts); "medium" gives a substantive critique in a
    # few seconds, which is the better UX for the interactive ToC flow.
    FOUNDRY_REASONING_EFFORT_GENERATION: str = "medium"
    FOUNDRY_REASONING_EFFORT_CRITIQUE: str = "medium"

    # Model SDK client tuning. Reasoning models are slow, so allow a generous
    # per-request timeout and a single retry (avoids 3× stacking on real fails).
    FOUNDRY_TIMEOUT_SECONDS: float = 90.0
    FOUNDRY_MAX_RETRIES: int = 1
    EMBEDDING_TIMEOUT_SECONDS: float = 15.0
    EMBEDDING_MAX_RETRIES: int = 0
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Token Budget (per SDD §8)
    MAX_TOKENS_TOC_GENERATION: int = 12000
    # Critique is intentionally concise (a few short failure prompts), so it
    # needs a small budget — a large one just makes the reasoning model slower.
    MAX_TOKENS_CRITIQUE: int = 3000
    MAX_TOKENS_GRANT_SECTION: int = 6000
    
    # Feature Flags
    ENABLE_TOC_CRITIQUE: bool = True
    ENABLE_STREAMING: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        # Resolve .env next to this module so it loads no matter the cwd
        # (e.g. running uvicorn from the repo root).
        env_file = str(Path(__file__).resolve().parent / ".env")
        case_sensitive = True
        extra = "ignore"

    # Placeholder values that must never count as real credentials.
    _PLACEHOLDER_KEYS = {"", "your_foundry_api_key_here", "your_foundry_key"}

    @property
    def ai_ready(self) -> bool:
        """Whether live Foundry model calls are configured.

        Single source of truth for "do we have real AI credentials?" — used to
        gate model generation, adversarial critique, and embedding-based
        retrieval. When False, the service degrades to deterministic template
        output and keyword search instead of making doomed network calls.
        """
        return self.FOUNDRY_API_KEY.strip() not in self._PLACEHOLDER_KEYS


# Global settings instance
settings = Settings()

# Made with Bob
