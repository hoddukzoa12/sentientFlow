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
                node_id=node_id,
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
            user_prompt_template = node_data.get("userPrompt", "")
            user_prompt = self._render_template(user_prompt_template, context.get_all_variables())

            # Smart fallback: if user_prompt is empty, try common variable names
            if not user_prompt or not user_prompt.strip():
                variables = context.get_all_variables()
                # Try common input variable names in priority order
                for var_name in ['input_as_text', 'user_input', 'query', 'message', 'prompt']:
                    if var_name in variables and variables[var_name]:
                        user_prompt = str(variables[var_name])
                        break

            # 2. Get model (GPT-5 only)
            model = node_data.get("model", "gpt-5")
            reasoning_effort = node_data.get("reasoningEffort", "medium")

            # 3. Emit node start event
            await response_handler.emit_text_block(
                event_name="NODE_START",
                content=f"Agent node '{node_data.get('name', node_id)}' starting",
                node_id=node_id,
            )

            # 4. Create streaming request
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if user_prompt:
                messages.append({"role": "user", "content": user_prompt})

            # 5. Build API parameters for GPT-5
            api_params = {
                "model": model,
                "messages": messages,
                "stream": True,
            }

            # Add GPT-5 reasoning effort parameter
            if reasoning_effort:
                api_params["reasoning_effort"] = reasoning_effort

            openai_stream = await self.client.chat.completions.create(**api_params)

            # 6. Stream response with separate thinking and response streams
            thinking_stream = response_handler.create_text_stream("AGENT_THINKING", node_id=node_id)
            response_stream = response_handler.create_text_stream("AGENT_RESPONSE", node_id=node_id)

            full_thinking = ""
            full_response = ""

            async for chunk in openai_stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta

                    # Capture thinking/reasoning content (GPT-5 specific)
                    if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                        full_thinking += delta.reasoning_content
                        await thinking_stream.emit_chunk(delta.reasoning_content)

                    # Capture regular response content
                    if delta.content:
                        full_response += delta.content
                        await response_stream.emit_chunk(delta.content)

            # 7. Complete both streams
            await thinking_stream.complete()
            await response_stream.complete()

            # 8. Save result to context
            output_var = node_data.get("outputVariable", "agent_response")
            context.set_variable(output_var, full_response)

            # 9. Emit completion
            await response_handler.emit_text_block(
                event_name="NODE_COMPLETE",
                content=f"Agent node '{node_data.get('name', node_id)}' completed",
                node_id=node_id,
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
                node_id=node_id,
            )

            # Emit final context as JSON
            await response_handler.emit_json(
                event_name="FINAL_CONTEXT", data=context.to_dict()
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
