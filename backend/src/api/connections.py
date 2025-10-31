"""API endpoints for managing LLM provider connections."""

import json
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ..database.client import db
from ..security.encryption import encryption_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/connections", tags=["connections"])


def _parse_config(config):
    """Parse config from DB (handles both str and dict)."""
    return json.loads(config) if isinstance(config, str) else config


# Request/Response Models
class ConnectionCreate(BaseModel):
    """Request model for creating a new connection."""
    provider: str = Field(..., pattern="^(openai|anthropic|gemini|grok)$")
    name: str = Field(..., min_length=1, max_length=255)
    api_key: str = Field(..., min_length=1)
    config: dict = Field(default_factory=dict)


class ConnectionResponse(BaseModel):
    """Response model for connection (without API key)."""
    id: str
    user_id: Optional[str]
    provider: str
    name: str
    config: dict
    is_active: bool
    created_at: str
    updated_at: str


class ConnectionUpdate(BaseModel):
    """Request model for updating a connection."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    api_key: Optional[str] = Field(None, min_length=1)
    config: Optional[dict] = None


# Endpoints
@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(connection: ConnectionCreate):
    """
    Create a new LLM provider connection.

    Encrypts the API key before storing in database.
    """
    try:
        # Encrypt API key
        encrypted_key = encryption_service.encrypt(connection.api_key)

        # Insert into database
        query = """
            INSERT INTO connections (provider, name, encrypted_api_key, config)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_id, provider, name, config, is_active,
                      created_at, updated_at
        """

        row = await db.fetchrow(
            query,
            connection.provider,
            connection.name,
            encrypted_key,
            json.dumps(connection.config),
        )

        logger.info(f"Created connection: {row['id']} ({connection.provider})")

        return ConnectionResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            provider=row["provider"],
            name=row["name"],
            config=_parse_config(row["config"]),
            is_active=row["is_active"],
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to create connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create connection: {str(e)}"
        )


@router.get("", response_model=List[ConnectionResponse])
async def list_connections(provider: Optional[str] = None):
    """
    List all connections (without API keys).

    Optionally filter by provider.
    """
    try:
        if provider:
            query = """
                SELECT id, user_id, provider, name, config, is_active,
                       created_at, updated_at
                FROM connections
                WHERE provider = $1
                ORDER BY created_at DESC
            """
            rows = await db.fetch(query, provider)
        else:
            query = """
                SELECT id, user_id, provider, name, config, is_active,
                       created_at, updated_at
                FROM connections
                ORDER BY created_at DESC
            """
            rows = await db.fetch(query)

        return [
            ConnectionResponse(
                id=str(row["id"]),
                user_id=str(row["user_id"]) if row["user_id"] else None,
                provider=row["provider"],
                name=row["name"],
                config=_parse_config(row["config"]),
                is_active=row["is_active"],
                created_at=row["created_at"].isoformat(),
                updated_at=row["updated_at"].isoformat(),
            )
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Failed to list connections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list connections: {str(e)}"
        )


@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: UUID):
    """Get a specific connection by ID (without API key)."""
    try:
        query = """
            SELECT id, user_id, provider, name, config, is_active,
                   created_at, updated_at
            FROM connections
            WHERE id = $1
        """

        row = await db.fetchrow(query, connection_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection {connection_id} not found"
            )

        return ConnectionResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            provider=row["provider"],
            name=row["name"],
            config=_parse_config(row["config"]),
            is_active=row["is_active"],
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection: {str(e)}"
        )


@router.patch("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(connection_id: UUID, update: ConnectionUpdate):
    """Update a connection's name, API key, or config."""
    try:
        # Build dynamic update query
        updates = []
        values = []
        param_num = 1

        if update.name is not None:
            updates.append(f"name = ${param_num}")
            values.append(update.name)
            param_num += 1

        if update.api_key is not None:
            encrypted_key = encryption_service.encrypt(update.api_key)
            updates.append(f"encrypted_api_key = ${param_num}")
            values.append(encrypted_key)
            param_num += 1

        if update.config is not None:
            updates.append(f"config = ${param_num}")
            values.append(json.dumps(update.config))
            param_num += 1

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        values.append(connection_id)
        query = f"""
            UPDATE connections
            SET {", ".join(updates)}
            WHERE id = ${param_num}
            RETURNING id, user_id, provider, name, config, is_active,
                      created_at, updated_at
        """

        row = await db.fetchrow(query, *values)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection {connection_id} not found"
            )

        logger.info(f"Updated connection: {connection_id}")

        return ConnectionResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            provider=row["provider"],
            name=row["name"],
            config=_parse_config(row["config"]),
            is_active=row["is_active"],
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update connection: {str(e)}"
        )


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(connection_id: UUID):
    """Delete a connection."""
    try:
        query = "DELETE FROM connections WHERE id = $1 RETURNING id"
        row = await db.fetchrow(query, connection_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection {connection_id} not found"
            )

        logger.info(f"Deleted connection: {connection_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete connection: {str(e)}"
        )


@router.patch("/{connection_id}/activate", response_model=ConnectionResponse)
async def activate_connection(connection_id: UUID):
    """
    Set a connection as active and deactivate all others of the same provider.
    """
    try:
        # Get the connection's provider
        provider_query = "SELECT provider FROM connections WHERE id = $1"
        provider_row = await db.fetchrow(provider_query, connection_id)

        if not provider_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection {connection_id} not found"
            )

        provider = provider_row["provider"]

        # Deactivate all connections for this provider
        deactivate_query = """
            UPDATE connections
            SET is_active = false
            WHERE provider = $1
        """
        await db.execute(deactivate_query, provider)

        # Activate the specified connection
        activate_query = """
            UPDATE connections
            SET is_active = true
            WHERE id = $1
            RETURNING id, user_id, provider, name, config, is_active,
                      created_at, updated_at
        """
        row = await db.fetchrow(activate_query, connection_id)

        logger.info(f"Activated connection: {connection_id} ({provider})")

        return ConnectionResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            provider=row["provider"],
            name=row["name"],
            config=_parse_config(row["config"]),
            is_active=row["is_active"],
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to activate connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate connection: {str(e)}"
        )


@router.get("/{connection_id}/key")
async def get_decrypted_key(connection_id: UUID):
    """
    Get decrypted API key for a connection.

    ⚠️ Internal use only - should not be exposed to frontend.
    This endpoint is used by the backend to retrieve API keys for LLM calls.
    """
    try:
        query = "SELECT encrypted_api_key FROM connections WHERE id = $1"
        row = await db.fetchrow(query, connection_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection {connection_id} not found"
            )

        # Decrypt the API key
        api_key = encryption_service.decrypt(row["encrypted_api_key"])

        return {"api_key": api_key}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get decrypted key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get decrypted key: {str(e)}"
        )


@router.get("/provider/{provider}/active")
async def get_active_connection_key(provider: str):
    """
    Get the decrypted API key for the active connection of a provider.

    ⚠️ Internal use only - used by AgentNodeExecutor to load API keys.
    Falls back to environment variable if no active connection exists.
    """
    try:
        query = """
            SELECT encrypted_api_key
            FROM connections
            WHERE provider = $1 AND is_active = true
            LIMIT 1
        """
        row = await db.fetchrow(query, provider)

        if not row:
            return {"api_key": None, "source": "env"}

        # Decrypt the API key
        api_key = encryption_service.decrypt(row["encrypted_api_key"])

        return {"api_key": api_key, "source": "db"}

    except Exception as e:
        logger.error(f"Failed to get active connection key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active connection key: {str(e)}"
        )
