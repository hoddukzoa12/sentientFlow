"""SentientFlow Backend - Main FastAPI Application."""

import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load .env file explicitly
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

from src.config.settings import settings
from src.api.workflows import router as workflows_router
from src.api.connections import router as connections_router
from src.api.workflows_crud import router as workflows_crud_router
from src.database.client import db

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup
    logger.info("Starting up SentientFlow Backend...")
    try:
        await db.connect()
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down SentientFlow Backend...")
    await db.disconnect()
    logger.info("Database connection closed")


# Create FastAPI app
app = FastAPI(
    title="SentientFlow Backend",
    description="Backend service for executing visual workflows with Sentient Framework",
    version="0.1.0",
    lifespan=lifespan
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
app.include_router(connections_router)
app.include_router(workflows_crud_router)


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
    # Check database connection
    db_status = "up"
    try:
        if db.pool:
            await db.fetchval("SELECT 1")
        else:
            db_status = "disconnected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "down"

    return JSONResponse({
        "status": "healthy" if db_status == "up" else "degraded",
        "services": {
            "api": "up",
            "database": db_status,
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
