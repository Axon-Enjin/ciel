
"""
Ciel AI Service - FastAPI Application
Implements PRD-F1 Theory of Change Generator
Date: 2026-06-25
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import settings
from .routers import grants, health, mande, toc

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events."""
    # Startup
    logger.info("Starting Ciel AI Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Foundry endpoint configured: {bool(settings.FOUNDRY_ENDPOINT)}")
    logger.info(f"Supabase URL: {settings.SUPABASE_URL}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Ciel AI Service...")


# Create FastAPI app
app = FastAPI(
    title="Ciel AI Service",
    description="AI-native Impact Operating System - Theory of Change Generator",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(toc.router, prefix="/toc", tags=["theory-of-change"])
app.include_router(grants.router, prefix="/grants", tags=["grants"])
app.include_router(mande.router, prefix="/mande", tags=["mande"])


@app.get("/")
async def root():
    """Root endpoint - service info."""
    return {
        "service": "Ciel AI Service",
        "version": "1.0.0",
        "status": "operational",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ai_service.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.ENVIRONMENT == "development",
    )