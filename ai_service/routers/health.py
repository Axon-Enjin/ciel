"""
Health Check Router
Provides health and readiness endpoints
Date: 2026-06-25
"""

from fastapi import APIRouter, status
from pydantic import BaseModel
from datetime import datetime, timezone
import sys

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: datetime
    version: str
    python_version: str
    environment: str


class ReadinessResponse(BaseModel):
    """Readiness check response model."""
    ready: bool
    checks: dict


@router.get("/", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint.
    Returns basic service health information.
    """
    from ..config import settings
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc),
        version="1.0.0",
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        environment=settings.ENVIRONMENT,
    )


@router.get("/ready", response_model=ReadinessResponse, status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness check endpoint.
    Verifies that all dependencies are available.
    """
    from ..config import settings
    from ..services.supabase_client import supabase_client

    checks: dict = {
        "config_loaded": bool(settings.SUPABASE_URL),
        "ai_configured": settings.ai_ready,
    }

    # Check Supabase connectivity
    try:
        supabase_healthy = await supabase_client.health_check()
        checks["database_connected"] = supabase_healthy
    except Exception as e:
        checks["database_connected"] = False
        checks["database_error"] = str(e)

    # Only probe Foundry when credentials are actually configured — otherwise
    # the call is guaranteed to fail and just adds latency. AI is an optional
    # dependency: the service degrades to template output when it's absent.
    if settings.ai_ready:
        from ..services.foundry_client import foundry_client

        try:
            checks["foundry_accessible"] = await foundry_client.health_check()
        except Exception as e:
            checks["foundry_accessible"] = False
            checks["foundry_error"] = str(e)
    else:
        checks["foundry_accessible"] = None  # not configured

    # Readiness reflects only required dependencies (config + database).
    # Foundry is intentionally excluded so the offline/template path is "ready".
    ready = bool(checks["config_loaded"]) and bool(checks.get("database_connected"))

    return ReadinessResponse(
        ready=ready,
        checks=checks,
    )


@router.get("/ping", status_code=status.HTTP_200_OK)
async def ping():
    """Simple ping endpoint for load balancers."""
    return {"ping": "pong"}

# Made with Bob
