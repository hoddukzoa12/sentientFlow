"""SentientFlow Backend - Main FastAPI Application."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config.settings import settings
from src.api.workflows import router as workflows_router

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="SentientFlow Backend",
    description="Backend service for executing visual workflows with Sentient Framework",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(workflows_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return JSONResponse({
        "status": "ok",
        "message": "SentientFlow Backend is running",
        "version": "0.1.0"
    })


@app.get("/health")
async def health():
    """Detailed health check."""
    return JSONResponse({
        "status": "healthy",
        "services": {
            "api": "up",
            "sentient_framework": "ready"
        }
    })


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting SentientFlow Backend on {settings.host}:{settings.port}")
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower()
    )
