"""API routes for workflow execution."""

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sentient_agent_framework import DefaultServer, Query

from src.workflows.models import WorkflowDefinition, WorkflowExecutionRequest
from src.agents.workflow_agent import WorkflowAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


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
        agent = WorkflowAgent(workflow)

        # 2. Create default server
        server = DefaultServer(agent)

        # 3. Create query
        query = Query(
            user_request=f"Execute workflow {workflow_id}",
            files=[],
            metadata=request.inputVariables or {},
        )

        # 4. Execute with SSE streaming
        logger.info(f"Executing workflow {workflow_id}")

        async def event_generator():
            """Generate SSE events."""
            try:
                # Use DefaultServer's assist_endpoint which handles SSE
                async for event in server._assist_stream(query):
                    # Format as SSE
                    event_type = event.get("event", "message")
                    data = event.get("data", "")

                    yield f"event: {event_type}\n"
                    yield f"data: {data}\n\n"

            except Exception as e:
                logger.error(f"Stream error: {str(e)}", exc_info=True)
                yield f"event: ERROR\n"
                yield f'data: {{"errorMessage": "{str(e)}", "errorCode": 500}}\n\n'

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
