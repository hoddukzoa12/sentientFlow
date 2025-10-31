"""Application configuration settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database
    database_url: str = ""

    # Security
    encryption_key: str = ""

    # LLM API Keys
    openai_api_key: str = ""

    # Logging
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Global settings instance
settings = Settings()
