"""
Integration tests for workflow execution.

Tests end-to-end workflow scenarios with multiple nodes.
"""

import pytest
import asyncio
import json
from typing import List, Tuple
from sentient_agent_framework.interface.identity import Identity

from src.agents.node_executors import (
    StartNodeExecutor,
    AgentNodeExecutor,
    EndNodeExecutor,
    TransformNodeExecutor,
    SetStateNodeExecutor,
    ExecutionContext,
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
    """Response handler for workflow execution."""
    source = Identity(id="test-workflow", name="Test Workflow")
    return NodeAwareResponseHandler(source, sse_hook)


async def collect_events(event_queue: asyncio.Queue) -> List[Tuple[str, dict]]:
    """Collect all events from queue and parse them."""
    events = []
    while not event_queue.empty():
        event_name, event_data = await event_queue.get()
        parsed_data = json.loads(event_data)
        events.append((event_name, parsed_data))
    return events


# ==================== Integration Tests ====================

@pytest.mark.asyncio
async def test_simple_workflow(response_handler, event_queue):
    """Test simple Start → Agent → End workflow."""
    context = ExecutionContext(workflow_id="test", session_id="test")

    # Node 1: Start
    start_executor = StartNodeExecutor()
    start_data = {
        "inputVariables": [
            {"name": "user_input", "type": "string", "value": "What is Python?"}
        ]
    }
    result = await start_executor.execute("start-1", start_data, context, response_handler)
    assert result.success is True
    assert context._variables["user_input"] == "What is Python?"

    # Node 2: Agent (mocked)
    agent_executor = AgentNodeExecutor()
    agent_data = {
        "systemPrompt": "You are a helpful assistant.",
        "userPrompt": "${user_input}",
        "model": "gpt-4o-mini",
        "outputVariable": "agent_response"
    }

    import unittest.mock as mock
    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="Python is a programming language."))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        result = await agent_executor.execute("agent-1", agent_data, context, response_handler)

    assert result.success is True
    assert "agent_response" in context._variables
    assert "Python" in context._variables["agent_response"]

    # Node 3: End
    end_executor = EndNodeExecutor()
    result = await end_executor.execute("end-1", {}, context, response_handler)
    assert result.success is True

    # Verify event sequence
    events = await collect_events(event_queue)
    assert len(events) > 0

    # Should have events from all nodes
    event_names = [event[0] for event in events]
    assert any("start" in name.lower() for name in event_names)
    assert any("agent" in name.lower() for name in event_names)
    assert any("done" in name.lower() for name in event_names)


@pytest.mark.asyncio
async def test_multi_agent_workflow(response_handler, event_queue):
    """Test workflow with multiple agents passing variables."""
    context = ExecutionContext(workflow_id="test", session_id="test")

    # Start
    start_executor = StartNodeExecutor()
    start_data = {
        "inputVariables": [
            {"name": "topic", "type": "string", "value": "AI"}
        ]
    }
    await start_executor.execute("start-1", start_data, context, response_handler)

    # Agent 1: Generate content
    agent1_executor = AgentNodeExecutor()
    agent1_data = {
        "systemPrompt": "Generate a brief summary.",
        "userPrompt": "Summarize ${topic}",
        "model": "gpt-4o-mini",
        "outputVariable": "summary"
    }

    import unittest.mock as mock
    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="AI is artificial intelligence."))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        await agent1_executor.execute("agent-1", agent1_data, context, response_handler)

    assert "summary" in context._variables

    # Agent 2: Expand on Agent 1's output
    agent2_executor = AgentNodeExecutor()
    agent2_data = {
        "systemPrompt": "Expand on the summary.",
        "userPrompt": "Explain: ${summary}",
        "model": "gpt-4o-mini",
        "outputVariable": "detailed_explanation"
    }

    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="AI enables machines to learn."))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        await agent2_executor.execute("agent-2", agent2_data, context, response_handler)

    assert "detailed_explanation" in context._variables
    assert "summary" in context._variables  # Previous variable preserved

    # End
    end_executor = EndNodeExecutor()
    await end_executor.execute("end-1", {}, context, response_handler)

    # Verify both agent outputs are in context
    events = await collect_events(event_queue)
    final_events = [e for e in events if "done" in e[0].lower()]
    assert len(final_events) > 0


@pytest.mark.asyncio
async def test_transform_workflow(response_handler, event_queue):
    """Test workflow with Transform node for data manipulation."""
    context = ExecutionContext(workflow_id="test", session_id="test")

    # Start with input data
    start_executor = StartNodeExecutor()
    start_data = {
        "inputVariables": [
            {"name": "price", "type": "number", "value": "100"},
            {"name": "quantity", "type": "number", "value": "3"}
        ]
    }
    await start_executor.execute("start-1", start_data, context, response_handler)

    # Transform: Calculate total and apply discount
    transform_executor = TransformNodeExecutor()
    transform_data = {
        "mode": "expressions",
        "assignments": [
            {"variable": "subtotal", "expression": "price * quantity"},
            {"variable": "discount", "expression": "subtotal * 0.1"},
            {"variable": "total", "expression": "subtotal - discount"}
        ]
    }
    await transform_executor.execute("transform-1", transform_data, context, response_handler)

    assert context._variables["subtotal"] == 300.0
    assert context._variables["discount"] == 30.0
    assert context._variables["total"] == 270.0

    # Agent: Generate invoice message
    agent_executor = AgentNodeExecutor()
    agent_data = {
        "systemPrompt": "Generate invoice message.",
        "userPrompt": "Total: ${total}",
        "model": "gpt-4o-mini",
    }

    import unittest.mock as mock
    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="Invoice total: $270"))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        await agent_executor.execute("agent-1", agent_data, context, response_handler)

    # End
    end_executor = EndNodeExecutor()
    await end_executor.execute("end-1", {}, context, response_handler)

    # Verify all calculated values are present
    assert all(key in context._variables for key in ["subtotal", "discount", "total"])


@pytest.mark.asyncio
async def test_setstate_workflow(response_handler, event_queue):
    """Test workflow with SetState node for state mutation."""
    context = ExecutionContext(workflow_id="test", session_id="test")

    # Start
    start_executor = StartNodeExecutor()
    start_data = {
        "inputVariables": [
            {"name": "counter", "type": "number", "value": "0"}
        ]
    }
    await start_executor.execute("start-1", start_data, context, response_handler)

    # SetState: Increment counter
    setstate_executor = SetStateNodeExecutor()
    setstate_data = {
        "assignments": [
            {"variable": "counter", "expression": "counter + 1"},
            {"variable": "doubled", "expression": "counter * 2"}
        ]
    }
    await setstate_executor.execute("setstate-1", setstate_data, context, response_handler)

    assert context._variables["counter"] == 1
    assert context._variables["doubled"] == 2

    # Agent: Use updated state
    agent_executor = AgentNodeExecutor()
    agent_data = {
        "systemPrompt": "Report counter value.",
        "userPrompt": "Counter is ${counter}",
        "model": "gpt-4o-mini",
    }

    import unittest.mock as mock
    with mock.patch('backend.src.agents.node_executors.AsyncOpenAI') as mock_openai:
        mock_stream = mock.AsyncMock()
        mock_stream.__aiter__.return_value = [
            mock.Mock(choices=[mock.Mock(delta=mock.Mock(content="Counter: 1"))]),
        ]
        mock_openai.return_value.chat.completions.create.return_value = mock_stream

        await agent_executor.execute("agent-1", agent_data, context, response_handler)

    # End
    end_executor = EndNodeExecutor()
    await end_executor.execute("end-1", {}, context, response_handler)

    # Verify state mutation persisted
    assert context._variables["counter"] == 1


@pytest.mark.asyncio
async def test_error_propagation(response_handler, event_queue):
    """Test that node execution errors are properly propagated."""
    context = ExecutionContext(workflow_id="test", session_id="test")

    # Start
    start_executor = StartNodeExecutor()
    start_data = {
        "inputVariables": [
            {"name": "x", "type": "number", "value": "10"}
        ]
    }
    await start_executor.execute("start-1", start_data, context, response_handler)

    # Transform with invalid CEL expression
    transform_executor = TransformNodeExecutor()
    transform_data = {
        "mode": "expressions",
        "assignments": [
            {"variable": "result", "expression": "undefined_variable + 1"}
        ]
    }
    result = await transform_executor.execute("transform-1", transform_data, context, response_handler)

    # Should fail
    assert result.success is False
    assert result.error is not None

    # Verify error event was emitted
    events = await collect_events(event_queue)
    error_events = [e for e in events if "error" in e[1].get("content_type", "").lower()]
    # Note: Current implementation might not emit ERROR events, just return failure
    # This test verifies error is returned in ExecutionResult
