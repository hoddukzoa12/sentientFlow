"""Node executors for different node types."""

import time
from typing import Any, Dict, List
from string import Template

from openai import AsyncOpenAI
from sentient_agent_framework import ResponseHandler

from src.workflows.execution_context import ExecutionContext
from src.config.settings import settings


class ExecutionResult:
    """Result of node execution."""

    def __init__(
        self,
        success: bool,
        next_nodes: List[str] = None,
        error: str = None,
        duration: float = None,
    ):
        self.success = success
        self.next_nodes = next_nodes or []
        self.error = error
        self.duration = duration


class BaseNodeExecutor:
    """Base class for node executors."""

    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Render template string with variables."""
        if not template:
            return ""

        try:
            # Use Python's Template for simple ${var} substitution
            tmpl = Template(template)
            return tmpl.safe_substitute(variables)
        except Exception as e:
            # If template rendering fails, return as-is
            return template


class StartNodeExecutor(BaseNodeExecutor):
    """Executor for Start nodes."""

    async def execute(
        self,
        node_id: str,
        node_data: Dict[str, Any],
        context: ExecutionContext,
        response_handler: ResponseHandler,
    ) -> ExecutionResult:
        """Execute Start node - initialize variables."""
        start_time = time.time()

        try:
            # Set initial variables
            variables = node_data.get("variables", [])
            for variable in variables:
                var_name = variable["name"]
                var_type = variable["type"]
                default_value = variable.get("defaultValue")

                # Type conversion
                if var_type == "number" and default_value:
                    typed_value = float(default_value)
                elif var_type == "boolean":
                    typed_value = str(default_value).lower() in ("true", "1", "yes")
                else:
                    typed_value = default_value

                context.set_variable(var_name, typed_value)

            # Emit start event
            await response_handler.emit_text_block(
                event_name="WORKFLOW_START",
                content=f"Workflow started with {len(variables)} variables",
            )

            duration = time.time() - start_time
            return ExecutionResult(success=True, duration=duration)

        except Exception as e:
            await response_handler.emit_error(
                error_message=f"Start node error: {str(e)}", error_code=500
            )
            return ExecutionResult(success=False, error=str(e))


class AgentNodeExecutor(BaseNodeExecutor):
    """Executor for Agent nodes (LLM calls)."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def execute(
        self,
        node_id: str,
        node_data: Dict[str, Any],
        context: ExecutionContext,
        response_handler: ResponseHandler,
    ) -> ExecutionResult:
        """Execute Agent node - call LLM with streaming."""
        start_time = time.time()

        try:
            # 1. Render prompts with variables
            system_prompt = self._render_template(
                node_data.get("systemPrompt", ""), context.get_all_variables()
            )
            user_prompt = self._render_template(
                node_data.get("userPrompt", ""), context.get_all_variables()
            )

            # 2. Get model parameters
            model = node_data.get("model", "gpt-4o")
            temperature = node_data.get("temperature", 0.7)
            max_tokens = node_data.get("maxTokens", 2000)

            # 3. Emit node start event
            await response_handler.emit_text_block(
                event_name="NODE_START",
                content=f"Agent node '{node_data.get('name', node_id)}' starting",
            )

            # 4. Create streaming request
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if user_prompt:
                messages.append({"role": "user", "content": user_prompt})

            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            # 5. Stream response
            stream_id = response_handler.create_text_stream(event_name="AGENT_RESPONSE")
            full_response = ""

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    await response_handler.emit_text_chunk(
                        stream_id=stream_id, content=content, is_complete=False
                    )

            # 6. Complete stream
            await response_handler.emit_text_chunk(
                stream_id=stream_id, content="", is_complete=True
            )

            # 7. Save result to context
            output_var = node_data.get("outputVariable", "agent_response")
            context.set_variable(output_var, full_response)

            # 8. Emit completion
            await response_handler.emit_text_block(
                event_name="NODE_COMPLETE",
                content=f"Agent node '{node_data.get('name', node_id)}' completed",
            )

            duration = time.time() - start_time
            return ExecutionResult(success=True, duration=duration)

        except Exception as e:
            await response_handler.emit_error(
                error_message=f"Agent node error: {str(e)}", error_code=500
            )
            return ExecutionResult(success=False, error=str(e))


class EndNodeExecutor(BaseNodeExecutor):
    """Executor for End nodes."""

    async def execute(
        self,
        node_id: str,
        node_data: Dict[str, Any],
        context: ExecutionContext,
        response_handler: ResponseHandler,
    ) -> ExecutionResult:
        """Execute End node - workflow completion."""
        start_time = time.time()

        try:
            # Emit completion event
            await response_handler.emit_text_block(
                event_name="WORKFLOW_COMPLETE",
                content="Workflow execution completed successfully",
            )

            # Emit final context as JSON
            await response_handler.emit_json(
                event_name="FINAL_CONTEXT", content=context.to_dict()
            )

            duration = time.time() - start_time
            return ExecutionResult(success=True, duration=duration)

        except Exception as e:
            await response_handler.emit_error(
                error_message=f"End node error: {str(e)}", error_code=500
            )
            return ExecutionResult(success=False, error=str(e))


# Executor registry
NODE_EXECUTORS = {
    "start": StartNodeExecutor(),
    "agent": AgentNodeExecutor(),
    "end": EndNodeExecutor(),
    # More executors will be added here
}
