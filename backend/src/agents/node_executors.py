"""Node executors for different node types."""

import time
import httpx
import logging
from typing import Any, Dict, List, Optional
from string import Template

from openai import AsyncOpenAI
from sentient_agent_framework import ResponseHandler

from src.workflows.execution_context import ExecutionContext
from src.config.settings import settings
from src.utils.cel_evaluator import CELEvaluator, CELEvaluationError

logger = logging.getLogger(__name__)


class ExecutionResult:
    """Result of node execution."""

    def __init__(
        self,
        success: bool,
        next_nodes: List[str] = None,
        error: str = None,
        duration: float = None,
        metadata: Dict[str, Any] = None,
    ):
        self.success = success
        self.next_nodes = next_nodes or []
        self.error = error
        self.duration = duration
        self.metadata = metadata or {}  # For branch info, loop state, etc.


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
            # Handle both old format (variables) and new format (inputVariables + stateVariables)
            input_variables = node_data.get("inputVariables", [])
            state_variables = node_data.get("stateVariables", [])

            # Fallback to old format if new format not present
            if not input_variables and not state_variables:
                legacy_variables = node_data.get("variables", [])
                input_variables = legacy_variables  # Treat as input variables

            # Auto-initialize input_as_text from context if available
            # This is the user's workflow input from the frontend
            input_text = context.get_variable("input_as_text")
            if input_text is not None:
                context.set_variable("input_as_text", input_text)

            # Process input variables (read-only workflow inputs)
            for variable in input_variables:
                var_name = variable["name"]

                # Skip if already exists in context (preserve initial_variables)
                if context.get_variable(var_name) is not None:
                    logger.info(f"[START] Skipping '{var_name}' - already exists in context")
                    continue

                var_type = variable["type"]
                default_value = variable.get("defaultValue")

                # Type conversion
                typed_value = self._convert_type(var_type, default_value)
                context.set_variable(var_name, typed_value)

            # Process state variables (user-defined state)
            for variable in state_variables:
                var_name = variable["name"]

                # Skip if already exists in context (preserve initial_variables)
                if context.get_variable(var_name) is not None:
                    logger.info(f"[START] Skipping '{var_name}' - already exists in context")
                    continue

                var_type = variable["type"]
                default_value = variable.get("defaultValue")

                # Type conversion
                typed_value = self._convert_type(var_type, default_value)
                context.set_variable(var_name, typed_value)

            # ===== THINKING TRANSPARENCY: Start Node =====
            # Framework streaming pattern for transparency events.
            # Shows input variables to user for workflow understanding.
            start_thinking_stream = response_handler.create_text_stream("AGENT_THINKING", node_id=node_id)

            await start_thinking_stream.emit_chunk("Start\n\n")

            # Get all variables from context
            all_vars = context.get_all_variables()

            if all_vars:
                await start_thinking_stream.emit_chunk("Input variables:\n")
                for var_name, var_value in all_vars.items():
                    value_preview = str(var_value)[:100] + ('...' if len(str(var_value)) > 100 else '')
                    await start_thinking_stream.emit_chunk(f"  - {var_name}: {value_preview}\n")
                await start_thinking_stream.emit_chunk("\n")
            else:
                await start_thinking_stream.emit_chunk("No input variables\n\n")

            await start_thinking_stream.complete()
            # ===== END THINKING TRANSPARENCY =====

            duration = time.time() - start_time
            return ExecutionResult(success=True, duration=duration)

        except Exception as e:
            await response_handler.emit_error(
                error_message=f"Start node error: {str(e)}", error_code=500
            )
            return ExecutionResult(success=False, error=str(e))

    def _convert_type(self, var_type: str, value: Any) -> Any:
        """Convert variable value to proper type."""
        if value is None or value == "":
            return None

        if var_type == "number":
            try:
                return float(value)
            except (ValueError, TypeError):
                return 0.0
        elif var_type == "boolean":
            if isinstance(value, bool):
                return value
            return str(value).lower() in ("true", "1", "yes")
        elif var_type == "object":
            if isinstance(value, dict):
                return value
            # Try to parse JSON string (schema)
            try:
                import json
                return json.loads(str(value))
            except:
                return {}
        elif var_type == "list":
            if isinstance(value, list):
                return value
            # Try to parse JSON array first
            try:
                import json
                parsed = json.loads(str(value))
                if isinstance(parsed, list):
                    return parsed
            except:
                pass
            # Fallback: CSV string parsing ("apple, banana, cherry")
            try:
                if isinstance(value, str) and "," in value:
                    return [item.strip() for item in value.split(",") if item.strip()]
            except:
                pass
            return []
        else:  # string or unknown
            return str(value) if value is not None else ""


class AgentNodeExecutor(BaseNodeExecutor):
    """Executor for Agent nodes (LLM calls)."""

    def __init__(self):
        pass  # Client initialized per execution

    async def _get_api_key(self, provider: str) -> str:
        """Get API key from connections or fallback to environment variable."""
        try:
            # Query active connection endpoint
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://localhost:8000/api/connections/provider/{provider}/active",
                    timeout=5.0
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("api_key"):
                        return data["api_key"]
        except Exception as e:
            # Log warning but continue to fallback
            print(f"Warning: Failed to fetch connection for {provider}: {e}")

        # Fallback to environment variable
        if provider == "openai":
            return settings.openai_api_key
        else:
            raise ValueError(f"No API key available for provider: {provider}")

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
            # 1. Get provider and load API key
            provider = node_data.get("provider", "openai")
            api_key = await self._get_api_key(provider)

            # Initialize client with retrieved API key
            client = AsyncOpenAI(api_key=api_key)

            # 2. Get all available variables and render prompts
            all_variables = context.get_all_variables()

            # Render prompts with variables
            system_prompt = self._render_template(
                node_data.get("systemPrompt", ""), all_variables
            )
            user_prompt_template = node_data.get("userPrompt", "")

            # Try template rendering
            if user_prompt_template:
                user_prompt = self._render_template(user_prompt_template, all_variables)

                # Check if template had unreplaced variables (safe_substitute artifact)
                # If ${...} pattern still exists, variables weren't substituted
                if '${' in user_prompt and '}' in user_prompt:
                    # Template rendering failed, trigger fallback
                    user_prompt = ""
            else:
                user_prompt = ""

            # Smart fallback: if user_prompt is empty or failed, try common variable names
            if not user_prompt or not user_prompt.strip():
                # Try common input variable names in priority order
                # agent_response is first for multi-agent workflows (Agent 2 uses Agent 1's output)
                for var_name in ['agent_response', 'input_as_text', 'user_input', 'query', 'message', 'prompt']:
                    if var_name in all_variables and all_variables[var_name]:
                        user_prompt = str(all_variables[var_name])
                        break

            # 3. Get model (GPT-5 only)
            model = node_data.get("model", "gpt-5")
            reasoning_effort = node_data.get("reasoningEffort", "medium")

            # 4. Emit node start event
            await response_handler.emit_text_block(
                event_name="NODE_START",
                content=f"Agent node '{node_data.get('name', node_id)}' starting",
                node_id=node_id,
            )

            # ===== THINKING TRANSPARENCY: Pre-Execution =====
            # Framework Pattern: create_text_stream() → emit_chunk() → complete()
            # This generates TEXT_CHUNK events (content_type: "chunked.text")
            # which enable streaming display in Sentient Chat UI.
            #
            # Key Framework Concepts:
            # - create_text_stream(): Creates StreamEventEmitter with unique stream_id
            # - emit_chunk(): Emits TextChunkEvent with incremental content
            # - complete(): Marks stream as complete, Framework handles cleanup
            #
            # Multiple streams with same event_name are supported - each has unique stream_id.
            # This allows concurrent thinking streams from different nodes or execution phases.
            #
            # Why TEXT_CHUNK instead of TEXT_BLOCK?
            # - TEXT_BLOCK: Atomic, all-or-nothing content (content_type: "atomic.textblock")
            # - TEXT_CHUNK: Streaming, progressive content (content_type: "chunked.text")
            # We use TEXT_CHUNK for thinking transparency to enable real-time streaming display.
            pre_thinking_stream = response_handler.create_text_stream("AGENT_THINKING", node_id=node_id)

            # Node name
            await pre_thinking_stream.emit_chunk(f"{node_data.get('name', 'Agent')}\n\n")

            # Variables at execution
            if all_variables:
                await pre_thinking_stream.emit_chunk("Variables at execution:\n")
                for var_name, var_value in all_variables.items():
                    value_preview = str(var_value)[:100] + ('...' if len(str(var_value)) > 100 else '')
                    await pre_thinking_stream.emit_chunk(f"  - {var_name}: {value_preview}\n")
                await pre_thinking_stream.emit_chunk("\n")

            # Decision making
            await pre_thinking_stream.emit_chunk("Decision making:\n")
            await pre_thinking_stream.emit_chunk(f"  - Selected model: {model}\n")
            await pre_thinking_stream.emit_chunk(f"  - Why: configured in node settings\n")
            await pre_thinking_stream.emit_chunk(f"  - Reasoning effort: {reasoning_effort}\n")
            await pre_thinking_stream.emit_chunk(f"  - Why: balance between speed and quality\n\n")

            # Prompt construction
            await pre_thinking_stream.emit_chunk("Prompt construction:\n")
            if system_prompt:
                await pre_thinking_stream.emit_chunk(f"  - System prompt: \"{system_prompt}\"\n")
            if user_prompt:
                await pre_thinking_stream.emit_chunk(f"  - User prompt: \"{user_prompt}\"\n")
            await pre_thinking_stream.emit_chunk(f"  - Why these prompts: based on node configuration and input variables\n\n")

            # Complete pre-execution thinking stream
            await pre_thinking_stream.complete()
            # ===== END THINKING TRANSPARENCY =====

            # 5. Create streaming request
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

            openai_stream = await client.chat.completions.create(**api_params)

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

            # ===== THINKING TRANSPARENCY: Post-Execution =====
            # Show variable changes after LLM execution.
            # This completes the transparency cycle for agent nodes.
            post_thinking_stream = response_handler.create_text_stream("AGENT_THINKING", node_id=node_id)

            # Show variable changes
            await post_thinking_stream.emit_chunk("\nVariable changes:\n")
            response_preview = full_response[:100] + ('...' if len(full_response) > 100 else '')
            await post_thinking_stream.emit_chunk(
                f"  - Created '{output_var}': \"{response_preview}\" ({len(full_response)} characters)\n"
            )

            # Complete post-execution thinking stream
            await post_thinking_stream.complete()
            # ===== END THINKING TRANSPARENCY =====

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
            # ===== THINKING TRANSPARENCY: End Node =====
            # Framework streaming pattern for workflow completion summary.
            # Shows final variables and execution status for transparency.
            end_thinking_stream = response_handler.create_text_stream("AGENT_THINKING", node_id=node_id)

            await end_thinking_stream.emit_chunk("End\n\n")
            await end_thinking_stream.emit_chunk("Execution completed:\n")

            # Show final variables
            all_vars = context.get_all_variables()
            if all_vars:
                await end_thinking_stream.emit_chunk("  - Final variables:\n")
                for var_name, var_value in all_vars.items():
                    value_preview = str(var_value)[:100] + ('...' if len(str(var_value)) > 100 else '')
                    await end_thinking_stream.emit_chunk(f"    - {var_name}: {value_preview}\n")

            await end_thinking_stream.emit_chunk("  - Workflow result: Success\n")

            await end_thinking_stream.complete()
            # ===== END THINKING TRANSPARENCY =====

            # Emit final context as JSON (for programmatic access)
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


class TransformNodeExecutor(BaseNodeExecutor):
    """Executor for Transform nodes - data transformation with CEL expressions."""

    def __init__(self):
        self.cel_evaluator = CELEvaluator()

    async def execute(
        self,
        node_id: str,
        node_data: Dict[str, Any],
        context: ExecutionContext,
        response_handler: ResponseHandler,
    ) -> ExecutionResult:
        """Execute Transform node - evaluate CEL expressions and create new variables."""
        start_time = time.time()

        try:
            output_type = node_data.get("outputType", "expressions")
            assignments = node_data.get("assignments", [])
            node_name = node_data.get("name", "Transform")

            if not assignments:
                await response_handler.emit_text_block(
                    event_name="NODE_COMPLETE",
                    content=f"Transform node '{node_name}' has no assignments, skipping",
                    node_id=node_id,
                )
                duration = time.time() - start_time
                return ExecutionResult(success=True, duration=duration)

            # Get current context for CEL evaluation
            cel_context = context.get_all_variables()

            if output_type == "object":
                # Create single object with all assignments
                result_object = {}
                for assignment in assignments:
                    key = assignment["key"]
                    expression = assignment["value"]

                    try:
                        result_object[key] = self.cel_evaluator.evaluate(
                            expression, cel_context
                        )
                    except CELEvaluationError as e:
                        await response_handler.emit_error(
                            error_message=f"Transform error evaluating '{key}': {str(e)}",
                            error_code=400,
                        )
                        return ExecutionResult(success=False, error=str(e))

                # Store as single variable (use node name as variable name)
                output_var = node_name.lower().replace(" ", "_")
                context.set_variable(output_var, result_object)

                await response_handler.emit_text_block(
                    event_name="NODE_COMPLETE",
                    content=f"Transform node '{node_name}' created object with {len(assignments)} properties",
                    node_id=node_id,
                )

            else:  # "expressions" - individual variables
                for assignment in assignments:
                    key = assignment["key"]
                    expression = assignment["value"]

                    try:
                        value = self.cel_evaluator.evaluate(expression, cel_context)
                        context.set_variable(key, value)
                    except CELEvaluationError as e:
                        await response_handler.emit_error(
                            error_message=f"Transform error evaluating '{key}': {str(e)}",
                            error_code=400,
                        )
                        return ExecutionResult(success=False, error=str(e))

                await response_handler.emit_text_block(
                    event_name="NODE_COMPLETE",
                    content=f"Transform node '{node_name}' created {len(assignments)} variable(s)",
                    node_id=node_id,
                )

            duration = time.time() - start_time
            return ExecutionResult(success=True, duration=duration)

        except Exception as e:
            await response_handler.emit_error(
                error_message=f"Transform node error: {str(e)}", error_code=500
            )
            return ExecutionResult(success=False, error=str(e))


class SetStateNodeExecutor(BaseNodeExecutor):
    """Executor for SetState nodes - variable assignment with CEL evaluation."""

    def __init__(self):
        self.cel_evaluator = CELEvaluator()

    async def execute(
        self,
        node_id: str,
        node_data: Dict[str, Any],
        context: ExecutionContext,
        response_handler: ResponseHandler,
    ) -> ExecutionResult:
        """Execute SetState node - assign variables with CEL expressions."""
        start_time = time.time()

        try:
            assignments = node_data.get("assignments", [])

            if not assignments:
                await response_handler.emit_text_block(
                    event_name="NODE_COMPLETE",
                    content="SetState node has no assignments, skipping",
                    node_id=node_id,
                )
                duration = time.time() - start_time
                return ExecutionResult(success=True, duration=duration)

            # Get current context for CEL evaluation
            cel_context = context.get_all_variables()

            for assignment in assignments:
                key = assignment["key"]
                value_expr = assignment["value"]

                try:
                    # Evaluate CEL expression
                    value = self.cel_evaluator.evaluate(value_expr, cel_context)
                    context.set_variable(key, value)
                except CELEvaluationError as e:
                    await response_handler.emit_error(
                        error_message=f"SetState error evaluating '{key}': {str(e)}",
                        error_code=400,
                    )
                    return ExecutionResult(success=False, error=str(e))

            await response_handler.emit_text_block(
                event_name="NODE_COMPLETE",
                content=f"SetState node updated {len(assignments)} variable(s)",
                node_id=node_id,
            )

            duration = time.time() - start_time
            return ExecutionResult(success=True, duration=duration)

        except Exception as e:
            await response_handler.emit_error(
                error_message=f"SetState node error: {str(e)}", error_code=500
            )
            return ExecutionResult(success=False, error=str(e))


# Executor registry
NODE_EXECUTORS = {
    "start": StartNodeExecutor(),
    "agent": AgentNodeExecutor(),
    "end": EndNodeExecutor(),
    "transform": TransformNodeExecutor(),
    "setState": SetStateNodeExecutor(),
    # More executors will be added here (ifElse, while, etc.)
}
