"""
Ciel AI Service Configuration
Manages environment variables and settings
Date: 2026-06-25
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Supabase Configuration (defaults allow local dev/tests without .env)
    SUPABASE_URL: str = "http://127.0.0.1:54321"
    SUPABASE_SERVICE_KEY: str = "dev-service-key"

    # Microsoft Foundry Configuration
    FOUNDRY_ENDPOINT: str = "https://example.invalid"
    FOUNDRY_API_KEY: str = ""
    FOUNDRY_DEPLOYMENT_SONNET: str = "claude-sonnet-3-5"
    FOUNDRY_DEPLOYMENT_OPUS: str = "claude-opus-3"
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Token Budget (per SDD §8)
    MAX_TOKENS_TOC_GENERATION: int = 12000
    MAX_TOKENS_CRITIQUE: int = 10000
    MAX_TOKENS_GRANT_SECTION: int = 6000
    
    # Feature Flags
    ENABLE_TOC_CRITIQUE: bool = True
    ENABLE_STREAMING: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

# Made with Bob
