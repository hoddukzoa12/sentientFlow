"""Workflow Agent - executes visual workflows using Sentient Framework."""

import logging
from typing import Dict, Any

from sentient_agent_framework import AbstractAgent, Query, Session, ResponseHandler

from src.workflows.models import WorkflowDefinition
from src.workflows.compiler import WorkflowCompiler
from src.workflows.execution_context import ExecutionContext
from src.agents.node_executors import NODE_EXECUTORS

logger = logging.getLogger(__name__)


class WorkflowAgent(AbstractAgent):
    """Agent that executes visual workflows."""

    def __init__(self, workflow: WorkflowDefinition, input_variables: Dict[str, Any] = None):
        self.workflow = workflow
        self.compiler = WorkflowCompiler(workflow)
        self.input_variables = input_variables or {}

    async def assist(
        self,
        session: Session,
        query: Query,
        response_handler: ResponseHandler,
    ):
        """Execute the workflow."""
        # Create execution context
        context = ExecutionContext(
            workflow_id=self.workflow.id,
            session_id=str(session.activity_id),
            initial_variables=self.input_variables
        )

        try:
            # 1. Validate workflow
            validation = self.compiler.validate()
            if not validation["valid"]:
                error_msg = f"Invalid workflow: {', '.join(validation['errors'])}"
                await response_handler.emit_error(
                    error_message=error_msg, error_code=400
                )
                return

            # 2. Find start node
            start_node = self.compiler.find_start_node()
            if not start_node:
                await response_handler.emit_error(
                    error_message="No start node found", error_code=400
                )
                return

            # 3. Execute workflow starting from start node
            await self._execute_from_node(
                start_node.id, context, response_handler
            )

            # Note: DONE event is emitted by workflows.py via handler.complete()

        except Exception as e:
            logger.error(f"Workflow execution error: {str(e)}", exc_info=True)
            await response_handler.emit_error(
                error_message=f"Execution error: {str(e)}", error_code=500
            )

    async def _execute_from_node(
        self,
        node_id: str,
        context: ExecutionContext,
        response_handler: ResponseHandler,
    ):
        """Execute workflow starting from a specific node."""
        visited = set()
        queue = [node_id]

        while queue:
            current_node_id = queue.pop(0)

            # Prevent infinite loops
            if current_node_id in visited:
                continue
            visited.add(current_node_id)

            # Get node
            node = self.compiler.nodes_map.get(current_node_id)
            if not node:
                logger.warning(f"Node {current_node_id} not found")
                continue

            # Get executor for this node type
            executor = NODE_EXECUTORS.get(node.type)
            if not executor:
                logger.warning(f"No executor for node type {node.type}")
                # Skip this node and continue to next
                next_nodes = self.compiler.get_next_nodes(current_node_id)
                queue.extend([n.id for n in next_nodes])
                continue

            # Execute node
            logger.info(f"Executing node {current_node_id} (type={node.type})")
            result = await executor.execute(
                node_id=current_node_id,
                node_data=node.data,
                context=context,
                response_handler=response_handler,
            )

            # Record execution
            context.record_execution(
                node_id=current_node_id,
                success=result.success,
                duration=result.duration,
                error=result.error,
            )

            # If failed, stop execution
            if not result.success:
                logger.error(f"Node {current_node_id} failed: {result.error}")
                break

            # Get next nodes
            next_nodes = self.compiler.get_next_nodes(current_node_id)
            queue.extend([n.id for n in next_nodes])
