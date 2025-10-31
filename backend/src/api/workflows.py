"""API routes for workflow execution."""

import asyncio
import json
import logging
from typing import Dict, Any, cast

from fastapi import APIRouter, HTTPException, Query as QueryParam
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

# ============================================================================
# Workflow Registry (In-Memory Storage)
# ============================================================================

# TODO: Replace with persistent storage (Redis, Database, etc.)
_workflow_registry: Dict[str, WorkflowDefinition] = {}


class SSEHook(Hook):
    """
    Custom Hook implementation for SSE event streaming.

    Framework Compliance:
    ---------------------
    - Implements Hook interface from sentient_agent_framework.interface.hook
    - Uses DefaultIdGenerator to ensure monotonic ULID Event IDs with 10ms minimum increment
    - Properly sets event.id via get_next_id() for correct event ordering in Sentient Chat
    - Serializes events using model_dump_json() for Framework Event format compliance

    This implementation is considered BEST PRACTICE for Sentient Framework integration.

    Key Framework Concepts:
    -----------------------
    - Event IDs: ULIDs (Universally Unique Lexicographically Sortable Identifiers)
      provide both uniqueness and chronological ordering, critical for event replay
      and distributed system synchronization.

    - DefaultIdGenerator: Ensures monotonicity by enforcing minimum 10ms increment
      between successive Event IDs, preventing timestamp collisions that could
      break event ordering in multi-threaded environments.

    - Hook Interface: Framework's event emission abstraction that decouples event
      generation from transmission mechanism (SSE, WebSocket, stdout, etc.)

    Usage:
    ------
    >>> event_queue = asyncio.Queue()
    >>> hook = SSEHook(event_queue)
    >>> handler = NodeAwareResponseHandler(identity, hook)
    >>> await handler.emit_text_block("AGENT_THINKING", "Processing...")
    """

    def __init__(self, event_queue: asyncio.Queue):
        self._queue = event_queue
        self._id_generator = DefaultIdGenerator()

    async def emit(self, event: Event):
        """
        Emit Framework Event with proper ID management.

        Critical Implementation Details:
        ---------------------------------
        1. Casts event to BaseEvent to access id attribute
        2. Calls get_next_id() to ensure monotonic ULID generation
        3. Serializes entire Event object using model_dump_json() (Framework format)
        4. Puts (event_name, serialized_data) tuple into queue for SSE transmission

        This ensures:
        - Event ordering is preserved across concurrent streams
        - Event IDs never decrease (monotonicity)
        - Full Event metadata is transmitted (source, timestamp, content_type, etc.)
        """
        # CRITICAL: Ensure monotonically increasing Event IDs
        event = cast(BaseEvent, event)
        event.id = await self._id_generator.get_next_id(event.id)

        # Extract event_name and serialize Event as-is
        event_name = event.event_name
        event_data = event.model_dump_json()

        await self._queue.put((event_name, event_data))


class NodeAwareResponseHandler(DefaultResponseHandler):
    """
    ResponseHandler with node-specific event routing for workflow execution.

    Framework Compliance:
    ---------------------
    - Extends DefaultResponseHandler from sentient_agent_framework
    - Implements node_id routing using event_name encoding pattern
    - Fully compatible with Framework's ResponseHandler interface

    Node Routing Pattern (NON-STANDARD but COMPLIANT):
    ---------------------------------------------------
    Encodes node_id into event_name as "{event_name}::{node_id}"

    Example:
        Input:  event_name="AGENT_THINKING", node_id="agent-123"
        Output: encoded_name="AGENT_THINKING::agent-123"

    Frontend Decoding:
        const [eventName, nodeId] = event_name.split("::", 2)

    Why This Pattern?
    -----------------
    Framework doesn't provide built-in metadata attachment mechanism for
    custom routing information. We have two options:

    1. **Current approach** (event_name encoding):
       - Pros: Simple, works with any Framework version, no schema changes
       - Cons: Non-idiomatic, couples routing info to event_name

    2. **Alternative** (use source.id field):
       - Pros: More idiomatic, cleaner separation of concerns
       - Cons: Requires source Identity per node, more complex setup

    We chose option 1 for simplicity and backwards compatibility.

    Framework Compliance Note:
    --------------------------
    This is COMPLIANT because Framework allows any string as event_name.
    The "::" separator is never used by Framework's built-in event names,
    so there's no collision risk.
    """

    def __init__(self, source: Identity, hook: Hook):
        super().__init__(source, hook)
        self._current_node_id: str | None = None

    def set_node_id(self, node_id: str | None):
        """
        Set current node_id context for subsequent events.

        This allows setting node_id once at the start of node execution,
        rather than passing it to every emit_text_block() call.

        Args:
            node_id: Node identifier to encode in subsequent events, or None to clear
        """
        self._current_node_id = node_id

    async def emit_text_block(self, event_name: str, content: str, node_id: str = None):
        """
        Extended emit_text_block with node-specific routing.

        Encodes node_id into event_name for frontend routing to specific nodes.

        Args:
            event_name: Base event name (e.g., "AGENT_THINKING", "NODE_START")
            content: Event content/message
            node_id: Optional node identifier (uses _current_node_id if not provided)

        Emits:
            TextBlockEvent with encoded event_name containing node routing information

        Example:
            >>> await handler.emit_text_block("NODE_START", "Starting agent", node_id="agent-123")
            # Emits TextBlockEvent with event_name="NODE_START::agent-123"
        """
        # Encode node_id in event_name for routing
        if node_id or self._current_node_id:
            actual_node_id = node_id or self._current_node_id
            encoded_name = f"{event_name}::{actual_node_id}"
        else:
            encoded_name = event_name

        await super().emit_text_block(encoded_name, content)

    def create_text_stream(self, event_name: str, node_id: str | None = None):
        """
        Extended create_text_stream with node-specific routing.

        Creates StreamEventEmitter that generates TextChunkEvents with encoded
        event_name for frontend routing.

        Args:
            event_name: Base event name (e.g., "AGENT_THINKING", "AGENT_RESPONSE")
            node_id: Optional node identifier (uses _current_node_id if not provided)

        Returns:
            StreamEventEmitter: Framework object for streaming text chunks

        Example:
            >>> stream = handler.create_text_stream("AGENT_THINKING", node_id="agent-123")
            >>> await stream.emit_chunk("Processing input...")
            >>> await stream.emit_chunk("Generating response...")
            >>> await stream.complete()
            # Emits TextChunkEvents with event_name="AGENT_THINKING::agent-123"
        """
        # Encode node_id in event_name for routing
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
        # 0. Validate input variables
        if "input_as_text" not in request.inputVariables:
            raise HTTPException(
                status_code=400,
                detail="Missing required variable 'input_as_text' in inputVariables"
            )

        if not request.inputVariables["input_as_text"]:
            raise HTTPException(
                status_code=400,
                detail="Variable 'input_as_text' cannot be empty"
            )

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


@router.post("/{workflow_id}/register")
async def register_workflow(workflow_id: str, workflow_definition: WorkflowDefinition):
    """
    Register a workflow in the registry for CLI access.

    This allows the workflow to be accessed via the /assist endpoint.

    Args:
        workflow_id: Unique workflow identifier
        workflow_definition: Complete workflow definition

    Returns:
        Registration confirmation
    """
    try:
        _workflow_registry[workflow_id] = workflow_definition
        logger.info(f"Registered workflow: {workflow_id}")

        return {
            "success": True,
            "workflowId": workflow_id,
            "message": f"Workflow '{workflow_definition.name}' registered successfully",
        }

    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assist/{workflow_id}")
async def assist_workflow(
    workflow_id: str,
    query: str = QueryParam(..., description="User query/message to process"),
    input_variables: str = QueryParam("{}", description="JSON-encoded input variables"),
):
    """
    Framework-compatible /assist endpoint for CLI clients.

    This endpoint provides compatibility with Sentient-Agent-Client and other
    CLI tools that expect the standard /assist interface.

    Args:
        workflow_id: Registered workflow identifier
        query: User query to process
        input_variables: JSON-encoded dict of input variables

    Returns:
        SSE stream of execution events (Framework-compliant)

    Example:
        GET /api/workflows/assist/my-workflow?query=Hello&input_variables={"context":"test"}
    """
    try:
        # 1. Lookup workflow from registry
        if workflow_id not in _workflow_registry:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow '{workflow_id}' not found. Please register it first using POST /{workflow_id}/register"
            )

        workflow_definition = _workflow_registry[workflow_id]

        # 2. Parse input variables
        try:
            parsed_input_variables = json.loads(input_variables)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON in input_variables parameter: {str(e)}"
            )

        # 3. Add query as input_as_text (standard convention)
        parsed_input_variables["input_as_text"] = query

        # 4. Create workflow agent
        agent = WorkflowAgent(workflow_definition, parsed_input_variables)

        # 5. Create Sentient Framework query
        sentient_query = SentientQuery(
            id=ULID(),
            prompt=query
        )

        # 6. Execute with SSE streaming (reuse existing logic)
        logger.info(f"CLI executing workflow {workflow_id} with query: {query[:100]}")

        async def event_generator():
            """Generate SSE events using async queue and Framework Hook system."""
            event_queue = asyncio.Queue()

            # Create SSEHook for event conversion
            hook = SSEHook(event_queue)

            # Create Identity for the agent
            source_identity = Identity(id="workflow-processor", name="Workflow Agent")

            # Create NodeAwareResponseHandler (Framework-compliant)
            handler = NodeAwareResponseHandler(source_identity, hook)

            # Create Session
            session_obj = SessionObject(
                processor_id="workflow-processor",
                activity_id=ULID(),
                request_id=ULID(),
                interactions=[]
            )
            session = DefaultSession(session_obj)

            # Run agent.assist in background task
            async def run_agent():
                try:
                    await agent.assist(session, sentient_query, handler)
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assist endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
