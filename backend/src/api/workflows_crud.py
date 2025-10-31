"""API endpoints for workflow CRUD operations."""

import json
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ..database.client import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workflows", tags=["workflows-crud"])


def _parse_definition(definition):
    """Parse definition from DB (handles both str and dict)."""
    return json.loads(definition) if isinstance(definition, str) else definition


# Request/Response Models
class WorkflowCreate(BaseModel):
    """Request model for creating a new workflow."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="")
    definition: dict = Field(
        ...,
        description="Complete workflow definition including nodes, edges, and variables"
    )


class WorkflowResponse(BaseModel):
    """Response model for workflow."""
    id: str
    user_id: Optional[str]
    name: str
    description: str
    definition: dict
    created_at: str
    updated_at: str


class WorkflowUpdate(BaseModel):
    """Request model for updating a workflow."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    definition: Optional[dict] = None


class WorkflowListItem(BaseModel):
    """Response model for workflow list (without full definition)."""
    id: str
    user_id: Optional[str]
    name: str
    description: str
    created_at: str
    updated_at: str


# Endpoints
@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(workflow: WorkflowCreate):
    """
    Create a new workflow.

    Stores the complete workflow definition (nodes, edges, variables) as JSONB.
    """
    try:
        query = """
            INSERT INTO workflows (name, description, definition)
            VALUES ($1, $2, $3)
            RETURNING id, user_id, name, description, definition,
                      created_at, updated_at
        """

        row = await db.fetchrow(
            query,
            workflow.name,
            workflow.description,
            json.dumps(workflow.definition),
        )

        logger.info(f"Created workflow: {row['id']} ({workflow.name})")

        return WorkflowResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            name=row["name"],
            description=row["description"],
            definition=_parse_definition(row["definition"]),
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to create workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workflow: {str(e)}"
        )


@router.get("", response_model=List[WorkflowListItem])
async def list_workflows(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None
):
    """
    List workflows (without full definition for performance).

    Supports pagination and search by name.
    """
    try:
        if search:
            query = """
                SELECT id, user_id, name, description, created_at, updated_at
                FROM workflows
                WHERE name ILIKE $1
                ORDER BY updated_at DESC
                LIMIT $2 OFFSET $3
            """
            rows = await db.fetch(query, f"%{search}%", limit, offset)
        else:
            query = """
                SELECT id, user_id, name, description, created_at, updated_at
                FROM workflows
                ORDER BY updated_at DESC
                LIMIT $1 OFFSET $2
            """
            rows = await db.fetch(query, limit, offset)

        return [
            WorkflowListItem(
                id=str(row["id"]),
                user_id=str(row["user_id"]) if row["user_id"] else None,
                name=row["name"],
                description=row["description"],
                created_at=row["created_at"].isoformat(),
                updated_at=row["updated_at"].isoformat(),
            )
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Failed to list workflows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list workflows: {str(e)}"
        )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: UUID):
    """Get a specific workflow by ID (with full definition)."""
    try:
        query = """
            SELECT id, user_id, name, description, definition,
                   created_at, updated_at
            FROM workflows
            WHERE id = $1
        """

        row = await db.fetchrow(query, workflow_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        return WorkflowResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            name=row["name"],
            description=row["description"],
            definition=_parse_definition(row["definition"]),
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workflow: {str(e)}"
        )


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: UUID, update: WorkflowUpdate):
    """Update a workflow's name, description, or definition."""
    try:
        # Build dynamic update query
        updates = []
        values = []
        param_num = 1

        if update.name is not None:
            updates.append(f"name = ${param_num}")
            values.append(update.name)
            param_num += 1

        if update.description is not None:
            updates.append(f"description = ${param_num}")
            values.append(update.description)
            param_num += 1

        if update.definition is not None:
            updates.append(f"definition = ${param_num}")
            values.append(json.dumps(update.definition))
            param_num += 1

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        values.append(workflow_id)
        query = f"""
            UPDATE workflows
            SET {", ".join(updates)}
            WHERE id = ${param_num}
            RETURNING id, user_id, name, description, definition,
                      created_at, updated_at
        """

        row = await db.fetchrow(query, *values)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        logger.info(f"Updated workflow: {workflow_id}")

        return WorkflowResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            name=row["name"],
            description=row["description"],
            definition=_parse_definition(row["definition"]),
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update workflow: {str(e)}"
        )


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(workflow_id: UUID):
    """Delete a workflow."""
    try:
        query = "DELETE FROM workflows WHERE id = $1 RETURNING id"
        row = await db.fetchrow(query, workflow_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        logger.info(f"Deleted workflow: {workflow_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workflow: {str(e)}"
        )


@router.get("/{workflow_id}/duplicate", response_model=WorkflowResponse)
async def duplicate_workflow(workflow_id: UUID):
    """Duplicate an existing workflow."""
    try:
        # Get original workflow
        get_query = """
            SELECT name, description, definition
            FROM workflows
            WHERE id = $1
        """
        original = await db.fetchrow(get_query, workflow_id)

        if not original:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        # Create duplicate with modified name
        duplicate_name = f"{original['name']} (Copy)"
        create_query = """
            INSERT INTO workflows (name, description, definition)
            VALUES ($1, $2, $3)
            RETURNING id, user_id, name, description, definition,
                      created_at, updated_at
        """

        row = await db.fetchrow(
            create_query,
            duplicate_name,
            original["description"],
            json.dumps(original["definition"]) if isinstance(original["definition"], dict) else original["definition"],
        )

        logger.info(f"Duplicated workflow: {workflow_id} -> {row['id']}")

        return WorkflowResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row["user_id"] else None,
            name=row["name"],
            description=row["description"],
            definition=_parse_definition(row["definition"]),
            created_at=row["created_at"].isoformat(),
            updated_at=row["updated_at"].isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to duplicate workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate workflow: {str(e)}"
        )
