"""
Unit tests for node executors.

Tests individual node executor implementations for correctness,
error handling, and Framework compliance.
"""

import pytest
import asyncio
from typing import Dict, Any
from ulid import ULID
from sentient_agent_framework.interface.identity import Identity

from src.agents.node_executors import (
    StartNodeExecutor,
    AgentNodeExecutor,
    EndNodeExecutor,
    TransformNodeExecutor,
    SetStateNodeExecutor,
    ExecutionContext,
    ExecutionResult,
)
from src.api.workflows import SSEHook, NodeAwareResponseHandler


# ==================== Fixtures ====================

@pytest.fixture
def event_queue():
    """Event queue for capturing SSE events."""
    return asyncio.Queue()


@pytest.fixture
def sse_hook(event_queue):
    """SSE hook for event emission."""
    return SSEHook(event_queue)


@pytest.fixture
def response_handler(sse_hook):
    """Response handler for node execution."""
    source = Identity(id="test-source", name="Test Source")
    return NodeAwareResponseHandler(source, sse_hook)


@pytest.fixture
def execution_context():
    """Execution context with test variables."""
    return ExecutionContext(
        workflow_id="test-workflow",
        session_id="test-session",
        initial_variables={"user_input": "test input"}
    )


# ==================== StartNodeExecutor Tests ====================

@pytest.mark.asyncio
async def test_start_node_variable_initialization(response_handler, event_queue):
    """Test Start node initializes variables correctly."""
    executor = StartNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test")

    node_data = {
        "inputVariables": [
            {"name": "username", "type": "string", "value": "Alice"},
            {"name": "age", "type": "number", "value": "25"},
            {"name": "active", "type": "boolean", "value": "true"},
        ],
        "stateVariables": [
            {"name": "counter", "type": "number", "value": "0"},
        ]
    }

    result = await executor.execute("start-1", node_data, context, response_handler)

    assert result.success is True
    assert context._variables["username"] == "Alice"
    assert context._variables["age"] == 25.0
    assert context._variables["active"] is True
    assert context._variables["counter"] == 0.0


@pytest.mark.asyncio
async def test_start_node_type_conversion(response_handler, event_queue):
    """Test Start node type conversion for different variable types."""
    executor = StartNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test")

    node_data = {
        "inputVariables": [
            {"name": "str_val", "type": "string", "value": "hello"},
            {"name": "num_val", "type": "number", "value": "42.5"},
            {"name": "bool_true", "type": "boolean", "value": "TRUE"},
            {"name": "bool_false", "type": "boolean", "value": "false"},
            {"name": "obj_val", "type": "object", "value": '{"key": "value"}'},
            {"name": "list_val", "type": "list", "value": '["a", "b", "c"]'},
            {"name": "csv_list", "type": "list", "value": "x,y,z"},
        ]
    }

    result = await executor.execute("start-1", node_data, context, response_handler)

    assert context._variables["str_val"] == "hello"
    assert context._variables["num_val"] == 42.5
    assert context._variables["bool_true"] is True
    assert context._variables["bool_false"] is False
    assert context._variables["obj_val"] == {"key": "value"}
    assert context._variables["list_val"] == ["a", "b", "c"]
    assert context._variables["csv_list"] == ["x", "y", "z"]


@pytest.mark.asyncio
async def test_start_node_preserves_existing_context(response_handler, event_queue):
    """Test Start node preserves initial_variables over node defaults."""
    executor = StartNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={"username": "Bob"})

    node_data = {
        "inputVariables": [
            {"name": "username", "type": "string", "value": "Alice"},
            {"name": "age", "type": "number", "value": "25"},
        ]
    }

    result = await executor.execute("start-1", node_data, context, response_handler)

    # Existing context value should be preserved
    assert context._variables["username"] == "Bob"
    # New variable should be added
    assert context._variables["age"] == 25.0


@pytest.mark.asyncio
async def test_start_node_legacy_format(response_handler, event_queue):
    """Test Start node handles legacy 'variables' format."""
    executor = StartNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test")

    # Old format: single "variables" array
    node_data = {
        "variables": [
            {"name": "username", "type": "string", "value": "Alice"},
            {"name": "age", "type": "number", "value": "25"},
        ]
    }

    result = await executor.execute("start-1", node_data, context, response_handler)

    assert result.success is True
    assert context._variables["username"] == "Alice"
    assert context._variables["age"] == 25.0


# ==================== AgentNodeExecutor Tests ====================

@pytest.mark.asyncio
async def test_agent_node_template_rendering(response_handler, event_queue):
    """Test Agent node renders templates with variables."""
    executor = AgentNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={
        "username": "Alice",
        "topic": "Python programming"
    })

    node_data = {
        "systemPrompt": "You are helping ${username}.",
        "userPrompt": "Explain ${topic} in simple terms.",
        "model": "gpt-4o-mini",
        "outputVariable": "response"
    }

    # Mock OpenAI API call
    import unittest.mock as mock
    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="Test response"))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        result = await executor.execute("agent-1", node_data, context, response_handler)

    assert result.success is True
    # Verify template was rendered (check in mock call)
    call_args = mock_openai.return_value.chat.completions.create.call_args
    messages = call_args[1]["messages"]
    assert any("Alice" in str(msg) for msg in messages)
    assert any("Python programming" in str(msg) for msg in messages)


@pytest.mark.asyncio
async def test_agent_node_fallback_variables(response_handler, event_queue):
    """Test Agent node falls back to common variables when userPrompt empty."""
    executor = AgentNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={
        "user_input": "What is AI?",
        "input_as_text": "Tell me about AI"
    })

    node_data = {
        "systemPrompt": "You are a helpful assistant.",
        "userPrompt": "",  # Empty user prompt triggers fallback
        "model": "gpt-4o-mini",
    }

    import unittest.mock as mock
    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="AI response"))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        result = await executor.execute("agent-1", node_data, context, response_handler)

    # Should fall back to input_as_text or user_input
    assert result.success is True


@pytest.mark.asyncio
async def test_agent_node_output_variable(response_handler, event_queue):
    """Test Agent node saves response to custom output variable."""
    executor = AgentNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={"user_input": "test"})

    node_data = {
        "systemPrompt": "You are a helper.",
        "userPrompt": "Say hello",
        "model": "gpt-4o-mini",
        "outputVariable": "custom_response"  # Custom variable name
    }

    import unittest.mock as mock
    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="Hello!"))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        result = await executor.execute("agent-1", node_data, context, response_handler)

    assert result.success is True
    assert "custom_response" in context.variables
    assert "Hello!" in context._variables["custom_response"]


# ==================== EndNodeExecutor Tests ====================

@pytest.mark.asyncio
async def test_end_node_completion(response_handler, event_queue):
    """Test End node emits completion events."""
    executor = EndNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={
        "final_result": "Success",
        "status": "completed"
    })

    result = await executor.execute("end-1", {}, context, response_handler)

    assert result.success is True

    # Check for completion events in queue
    events = []
    while not event_queue.empty():
        events.append(await event_queue.get())

    # Should have thinking event and done event
    assert len(events) >= 2
    assert any("done" in event[0].lower() for event in events)


@pytest.mark.asyncio
async def test_end_node_final_context_emission(response_handler, event_queue):
    """Test End node emits final context as JSON."""
    executor = EndNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={
        "result": "Complete",
        "count": 42
    })

    result = await executor.execute("end-1", {}, context, response_handler)

    assert result.success is True

    # Verify final context was emitted
    events = []
    while not event_queue.empty():
        event_name, event_data = await event_queue.get()
        events.append((event_name, event_data))

    # Should contain final variables
    import json
    for event_name, event_data in events:
        parsed = json.loads(event_data)
        if "content" in parsed and isinstance(parsed["content"], str):
            if "result" in parsed["content"] and "count" in parsed["content"]:
                assert True
                return

    # If we get here, final context wasn't found
    pytest.fail("Final context not found in events")


# ==================== TransformNodeExecutor Tests ====================

@pytest.mark.asyncio
async def test_transform_expressions_mode(response_handler, event_queue):
    """Test Transform node in expressions mode."""
    executor = TransformNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={
        "x": 10,
        "y": 20
    })

    node_data = {
        "mode": "expressions",
        "assignments": [
            {"variable": "sum", "expression": "x + y"},
            {"variable": "product", "expression": "x * y"},
            {"variable": "message", "expression": '"Result is " + string(sum)'}
        ]
    }

    result = await executor.execute("transform-1", node_data, context, response_handler)

    assert result.success is True
    assert context._variables["sum"] == 30
    assert context._variables["product"] == 200
    assert "Result is 30" in context._variables["message"]


@pytest.mark.asyncio
async def test_transform_object_mode(response_handler, event_queue):
    """Test Transform node in object mode."""
    executor = TransformNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={
        "name": "Alice",
        "age": 25
    })

    node_data = {
        "mode": "object",
        "outputVariable": "user",
        "assignments": [
            {"variable": "name", "expression": "name"},
            {"variable": "age", "expression": "age"},
            {"variable": "adult", "expression": "age >= 18"}
        ]
    }

    result = await executor.execute("transform-1", node_data, context, response_handler)

    assert result.success is True
    assert "user" in context.variables
    assert context._variables["user"]["name"] == "Alice"
    assert context._variables["user"]["age"] == 25
    assert context._variables["user"]["adult"] is True


@pytest.mark.asyncio
async def test_transform_empty_assignments(response_handler, event_queue):
    """Test Transform node handles empty assignments gracefully."""
    executor = TransformNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={"x": 10})

    node_data = {
        "mode": "expressions",
        "assignments": []
    }

    result = await executor.execute("transform-1", node_data, context, response_handler)

    # Should succeed but not change context
    assert result.success is True
    assert context._variables["x"] == 10


@pytest.mark.asyncio
async def test_transform_cel_error_handling(response_handler, event_queue):
    """Test Transform node handles CEL evaluation errors."""
    executor = TransformNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={"x": 10})

    node_data = {
        "mode": "expressions",
        "assignments": [
            {"variable": "result", "expression": "undefined_variable + 1"}
        ]
    }

    result = await executor.execute("transform-1", node_data, context, response_handler)

    # Should fail with error
    assert result.success is False
    assert result.error is not None


# ==================== SetStateNodeExecutor Tests ====================

@pytest.mark.asyncio
async def test_setstate_basic_assignment(response_handler, event_queue):
    """Test SetState node basic variable assignment."""
    executor = SetStateNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={"x": 10})

    node_data = {
        "assignments": [
            {"variable": "y", "expression": "20"},
            {"variable": "z", "expression": "30"}
        ]
    }

    result = await executor.execute("setstate-1", node_data, context, response_handler)

    assert result.success is True
    assert context._variables["x"] == 10  # Preserved
    assert context._variables["y"] == 20
    assert context._variables["z"] == 30


@pytest.mark.asyncio
async def test_setstate_cel_expressions(response_handler, event_queue):
    """Test SetState node with CEL expressions."""
    executor = SetStateNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={
        "count": 5,
        "multiplier": 3
    })

    node_data = {
        "assignments": [
            {"variable": "count", "expression": "count + 1"},
            {"variable": "result", "expression": "count * multiplier"}
        ]
    }

    result = await executor.execute("setstate-1", node_data, context, response_handler)

    assert result.success is True
    assert context._variables["count"] == 6
    assert context._variables["result"] == 18  # (5+1) * 3


@pytest.mark.asyncio
async def test_setstate_empty_assignments(response_handler, event_queue):
    """Test SetState node skips execution when no assignments."""
    executor = SetStateNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={"x": 10})

    node_data = {
        "assignments": []
    }

    result = await executor.execute("setstate-1", node_data, context, response_handler)

    assert result.success is True
    assert context._variables["x"] == 10


@pytest.mark.asyncio
async def test_setstate_error_handling(response_handler, event_queue):
    """Test SetState node handles CEL evaluation errors."""
    executor = SetStateNodeExecutor()
    context = ExecutionContext(workflow_id="test", session_id="test", initial_variables={"x": 10})

    node_data = {
        "assignments": [
            {"variable": "y", "expression": "nonexistent_var + 1"}
        ]
    }

    result = await executor.execute("setstate-1", node_data, context, response_handler)

    assert result.success is False
    assert result.error is not None
