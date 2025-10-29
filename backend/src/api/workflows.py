"""API routes for workflow execution."""

import asyncio
import json
import logging
from typing import Dict, Any, cast

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sentient_agent_framework import Query as SentientQuery, Session, DefaultResponseHandler
from sentient_agent_framework.interface.session import SessionObject
from sentient_agent_framework.implementation.default_session import DefaultSession
from sentient_agent_framework.implementation.default_id_generator import DefaultIdGenerator
from sentient_agent_framework.interface.hook import Hook
from sentient_agent_framework.interface.identity import Identity
from sentient_agent_framework.interface.events import (
    Event,
    BaseEvent,
    TextBlockEvent,
    TextChunkEvent,
    DocumentEvent,
    ErrorEvent,
    DoneEvent
)
from ulid import ULID

from src.workflows.models import WorkflowDefinition, WorkflowExecutionRequest
from src.agents.workflow_agent import WorkflowAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class SSEHook(Hook):
    """Custom Hook for SSE event streaming with Framework-compliant event handling."""

    def __init__(self, event_queue: asyncio.Queue):
        self._queue = event_queue
        self._id_generator = DefaultIdGenerator()

    async def emit(self, event: Event):
        """Emit Framework Event with proper ID management."""
        # CRITICAL: Ensure monotonically increasing Event IDs
        event = cast(BaseEvent, event)
        event.id = await self._id_generator.get_next_id(event.id)

        # Extract event_name and serialize Event as-is
        event_name = event.event_name
        event_data = event.model_dump_json()

        await self._queue.put((event_name, event_data))


class NodeAwareResponseHandler(DefaultResponseHandler):
    """ResponseHandler with nodeId support for workflow execution."""

    def __init__(self, source: Identity, hook: Hook):
        super().__init__(source, hook)
        self._current_node_id: str | None = None

    def set_node_id(self, node_id: str | None):
        """Set current node_id context for subsequent events."""
        self._current_node_id = node_id

    async def emit_text_block(self, event_name: str, content: str, node_id: str = None):
        """Extended emit_text_block with optional node_id."""
        # Encode node_id in event_name
        if node_id or self._current_node_id:
            actual_node_id = node_id or self._current_node_id
            encoded_name = f"{event_name}::{actual_node_id}"
        else:
            encoded_name = event_name

        await super().emit_text_block(encoded_name, content)

    def create_text_stream(self, event_name: str, node_id: str | None = None):
        """Extended create_text_stream with optional node_id."""
        # Encode node_id in event_name
        if node_id or self._current_node_id:
            actual_node_id = node_id or self._current_node_id
            encoded_name = f"{event_name}::{actual_node_id}"
        else:
            encoded_name = event_name

        return super().create_text_stream(encoded_name)


@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    request: WorkflowExecutionRequest,
):
    """
    Execute a workflow with Server-Sent Events streaming.

    Args:
        workflow_id: Workflow ID
        request: Execution request with workflow definition and input variables

    Returns:
        SSE stream of execution events
    """
    try:

        # 1. Create workflow agent
        workflow = request.workflowDefinition
        agent = WorkflowAgent(workflow, request.inputVariables)

        # 2. Create query
        query = SentientQuery(
            id=ULID(),
            prompt=f"Execute workflow {workflow_id}"
        )

        # 3. Execute with SSE streaming
        logger.info(f"Executing workflow {workflow_id}")

        async def event_generator():
            """Generate SSE events using async queue and Framework Hook system."""
            event_queue = asyncio.Queue()

            # 1. Create SSEHook for event conversion
            hook = SSEHook(event_queue)

            # 2. Create Identity for the agent
            source_identity = Identity(id="workflow-processor", name="Workflow Agent")

            # 3. Create NodeAwareResponseHandler (Framework-compliant)
            handler = NodeAwareResponseHandler(source_identity, hook)

            # 4. Create Session
            session_obj = SessionObject(
                processor_id="workflow-processor",
                activity_id=ULID(),
                request_id=ULID(),
                interactions=[]
            )
            session = DefaultSession(session_obj)

            # 5. Run agent.assist in background task
            async def run_agent():
                try:
                    await agent.assist(session, query, handler)
                    await handler.complete()  # Framework's complete() emits DoneEvent
                except Exception as e:
                    logger.error(f"Agent execution error: {str(e)}", exc_info=True)
                    await handler.emit_error(str(e), 500)
                    await handler.complete()

            agent_task = asyncio.create_task(run_agent())

            # Stream events from queue as SSE
            try:
                while True:
                    event_type, data = await event_queue.get()
                    yield f"event: {event_type}\ndata: {data}\n\n"

                    if event_type == "DONE":
                        # Small delay to ensure DONE event is transmitted before closing stream
                        await asyncio.sleep(0.05)
                        break
            except Exception as e:
                logger.error(f"Stream error: {str(e)}", exc_info=True)
                yield f"event: ERROR\ndata: {json.dumps({'errorMessage': str(e), 'errorCode': 500})}\n\n"
            finally:
                await agent_task  # Wait for task to complete

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            },
        )

    except Exception as e:
        logger.error(f"Workflow execution error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{workflow_id}/validate")
async def validate_workflow(workflow_definition: WorkflowDefinition):
    """
    Validate a workflow without executing it.

    Args:
        workflow_definition: Workflow to validate

    Returns:
        Validation result
    """
    try:
        from src.workflows.compiler import WorkflowCompiler

        compiler = WorkflowCompiler(workflow_definition)
        validation = compiler.validate()

        return {
            "valid": validation["valid"],
            "errors": validation.get("errors", []),
            "nodeCount": validation.get("nodeCount", 0),
            "edgeCount": validation.get("edgeCount", 0),
        }

    except Exception as e:
        logger.error(f"Validation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
