"""
Unit tests to verify Sentient Agent Framework v0.3.0 compliance.

Tests cover:
- SSEHook Event ID generation (monotonic ULIDs)
- Event serialization and structure
- NodeAwareResponseHandler event routing
- Multiple concurrent streams
- Session and Query initialization
- DONE event emission via complete()
"""

import asyncio
import json
import pytest
from ulid import ULID

from sentient_agent_framework import Query, Session
from sentient_agent_framework.interface.session import SessionObject
from sentient_agent_framework.implementation.default_session import DefaultSession
from sentient_agent_framework.implementation.default_id_generator import DefaultIdGenerator
from sentient_agent_framework.interface.identity import Identity
from sentient_agent_framework.interface.events import (
    BaseEvent,
    TextBlockEvent,
    TextChunkEvent,
    DoneEvent
)

from src.api.workflows import SSEHook, NodeAwareResponseHandler


# ============================================================================
# SSEHook Tests - Event ID Generation and Monotonicity
# ============================================================================

@pytest.mark.asyncio
async def test_ssehook_monotonic_event_ids():
    """
    Test that SSEHook generates monotonically increasing Event IDs.

    Framework Requirement: DefaultIdGenerator ensures 10ms minimum increment
    between successive Event IDs to prevent timestamp collisions.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)

    # Create 5 consecutive events
    event_ids = []
    for i in range(5):
        event = TextBlockEvent(
            id=ULID(),
            event_name="TEST_EVENT",
            content=f"Test message {i}",
            source="test-source"  # source is string (source ID), not Identity object
        )
        await hook.emit(event)

        # Extract event from queue
        event_name, event_data = await event_queue.get()
        parsed_event = json.loads(event_data)
        event_ids.append(parsed_event["id"])

    # Verify monotonicity: each ID should be greater than the previous
    for i in range(1, len(event_ids)):
        current_ulid = ULID.from_str(event_ids[i])
        previous_ulid = ULID.from_str(event_ids[i-1])
        assert current_ulid > previous_ulid, \
            f"Event ID {i} ({event_ids[i]}) not greater than previous ({event_ids[i-1]})"


@pytest.mark.asyncio
async def test_ssehook_event_serialization():
    """
    Test that SSEHook properly serializes Framework Events.

    Framework Requirement: Events must be serialized using model_dump_json()
    to include all Framework metadata (source, timestamp, content_type, etc.)
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)

    # Create event with full metadata
    event = TextBlockEvent(
        id=ULID(),
        event_name="AGENT_THINKING",
        content="Processing input...",
        source="test-agent"  # source is string (source ID)
    )

    await hook.emit(event)

    # Verify serialized event structure
    event_name, event_data = await event_queue.get()
    parsed_event = json.loads(event_data)

    assert event_name == "AGENT_THINKING"
    assert parsed_event["event_name"] == "AGENT_THINKING"
    assert parsed_event["content"] == "Processing input..."
    assert parsed_event["content_type"] == "atomic.textblock"
    assert "id" in parsed_event
    assert "source" in parsed_event
    assert "schema_version" in parsed_event
    assert parsed_event["source"] == "test-agent"  # source is string, not object


@pytest.mark.asyncio
async def test_ssehook_multiple_events():
    """
    Test that SSEHook handles multiple events in correct order.

    Verifies queue-based event streaming maintains FIFO order.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)

    # Emit multiple events with different names
    events_to_emit = [
        ("NODE_START", "Node starting"),
        ("AGENT_THINKING", "Thinking..."),
        ("AGENT_RESPONSE", "Response text"),
        ("NODE_COMPLETE", "Node completed")
    ]

    for event_name, content in events_to_emit:
        event = TextBlockEvent(
            id=ULID(),
            event_name=event_name,
            content=content,
            source="test"  # source is string
        )
        await hook.emit(event)

    # Verify all events received in order
    for expected_name, expected_content in events_to_emit:
        event_name, event_data = await event_queue.get()
        parsed_event = json.loads(event_data)

        assert event_name == expected_name
        assert parsed_event["content"] == expected_content


# ============================================================================
# NodeAwareResponseHandler Tests - Event Name Encoding
# ============================================================================

@pytest.mark.asyncio
async def test_nodeaware_handler_event_name_encoding():
    """
    Test that NodeAwareResponseHandler encodes node_id into event_name.

    Pattern: "{event_name}::{node_id}"
    Example: "AGENT_THINKING::agent-123"

    This is the core routing mechanism for node-specific events.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Test emit_text_block with explicit node_id
    await handler.emit_text_block("NODE_START", "Starting node", node_id="agent-123")

    event_name, event_data = await event_queue.get()
    parsed_event = json.loads(event_data)

    # Verify encoding pattern
    assert event_name == "NODE_START::agent-123"
    assert parsed_event["event_name"] == "NODE_START::agent-123"
    assert parsed_event["content"] == "Starting node"


@pytest.mark.asyncio
async def test_nodeaware_handler_set_node_id():
    """
    Test that set_node_id() context applies to subsequent events.

    This allows setting node_id once at the start of node execution,
    rather than passing it to every emit call.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Set node context
    handler.set_node_id("agent-456")

    # Emit without explicit node_id - should use context
    await handler.emit_text_block("NODE_START", "Starting with context")

    event_name, event_data = await event_queue.get()
    parsed_event = json.loads(event_data)

    assert event_name == "NODE_START::agent-456"
    assert parsed_event["event_name"] == "NODE_START::agent-456"


@pytest.mark.asyncio
async def test_nodeaware_handler_explicit_overrides_context():
    """
    Test that explicit node_id parameter overrides set_node_id() context.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Set context node_id
    handler.set_node_id("agent-context")

    # Emit with explicit node_id - should override context
    await handler.emit_text_block("NODE_START", "Override test", node_id="agent-explicit")

    event_name, _ = await event_queue.get()

    assert event_name == "NODE_START::agent-explicit"


@pytest.mark.asyncio
async def test_nodeaware_handler_no_node_id():
    """
    Test that events without node_id use plain event_name.

    This ensures backwards compatibility with events that don't need routing.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Emit without any node_id
    await handler.emit_text_block("WORKFLOW_START", "Workflow beginning")

    event_name, event_data = await event_queue.get()
    parsed_event = json.loads(event_data)

    # Should NOT have "::" encoding
    assert event_name == "WORKFLOW_START"
    assert "::" not in event_name
    assert parsed_event["event_name"] == "WORKFLOW_START"


# ============================================================================
# Text Stream Tests - Multiple Concurrent Streams
# ============================================================================

@pytest.mark.asyncio
async def test_create_text_stream_with_node_id():
    """
    Test that create_text_stream() encodes node_id in event_name.

    Framework Pattern: create_text_stream() → emit_chunk() → complete()
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Create stream with node_id
    stream = handler.create_text_stream("AGENT_THINKING", node_id="agent-789")

    # Emit chunks
    await stream.emit_chunk("Chunk 1\n")
    await stream.emit_chunk("Chunk 2\n")
    await stream.complete()

    # Verify all chunks have encoded event_name
    # Note: Stream complete() does NOT emit DONE - only handler.complete() does
    for i in range(2):  # 2 chunks
        event_name, event_data = await event_queue.get()
        parsed_event = json.loads(event_data)

        assert event_name == "AGENT_THINKING::agent-789"
        assert parsed_event["event_name"] == "AGENT_THINKING::agent-789"
        assert parsed_event["content_type"] == "chunked.text"
        assert "stream_id" in parsed_event

    # Stream complete() emits final chunk to mark stream finished
    # Only handler.complete() emits lowercase "done" event to signal end of session


@pytest.mark.asyncio
async def test_multiple_concurrent_streams_same_event_name():
    """
    Test that multiple concurrent streams with same event_name work correctly.

    Framework Guarantee: Each stream has unique stream_id for differentiation.
    This is critical for multi-node workflows where multiple agents emit
    AGENT_THINKING events simultaneously.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Create two concurrent streams with same event_name
    stream1 = handler.create_text_stream("AGENT_THINKING", node_id="agent-1")
    stream2 = handler.create_text_stream("AGENT_THINKING", node_id="agent-2")

    # Emit chunks interleaved
    await stream1.emit_chunk("Agent 1 thinking...\n")
    await stream2.emit_chunk("Agent 2 thinking...\n")
    await stream1.emit_chunk("Agent 1 continues...\n")
    await stream2.complete()
    await stream1.complete()

    # Collect all events
    # Note: Stream complete() emits final chunks, not "done" events
    events = []
    while not event_queue.empty():
        event_name, event_data = await event_queue.get()
        events.append((event_name, json.loads(event_data)))

    # Verify TEXT_CHUNK events (stream complete() may emit final space chunk)
    text_chunks = [e for e in events if e[1]["content_type"] == "chunked.text"]

    # Should have at least 4 chunks (2 emit_chunk calls per stream)
    # complete() may add 1-2 more chunks depending on Framework implementation
    assert len(text_chunks) >= 4, f"Expected at least 4 chunks, got {len(text_chunks)}"

    # Verify unique stream_ids
    stream_ids = [e[1]["stream_id"] for e in text_chunks]
    assert len(set(stream_ids)) == 2, "Should have 2 unique stream_ids"

    # Verify node routing - each stream should have at least 2 chunks
    node1_chunks = [e for e in text_chunks if e[0] == "AGENT_THINKING::agent-1"]
    node2_chunks = [e for e in text_chunks if e[0] == "AGENT_THINKING::agent-2"]

    assert len(node1_chunks) >= 2, f"Agent 1 should have at least 2 chunks"
    assert len(node2_chunks) >= 2, f"Agent 2 should have at least 2 chunks"


# ============================================================================
# Session and Query Tests - Framework Initialization
# ============================================================================

@pytest.mark.asyncio
async def test_session_initialization():
    """
    Test that Session is properly initialized with SessionObject.

    Framework Requirement: DefaultSession requires SessionObject with
    processor_id, activity_id, request_id, and interactions.
    """
    session_obj = SessionObject(
        processor_id="workflow-processor",
        activity_id=ULID(),
        request_id=ULID(),
        interactions=[]
    )
    session = DefaultSession(session_obj)

    # Verify session initialized correctly
    assert session._session_object.processor_id == "workflow-processor"
    assert isinstance(session._session_object.activity_id, ULID)
    assert isinstance(session._session_object.request_id, ULID)
    assert session._session_object.interactions == []


@pytest.mark.asyncio
async def test_query_initialization():
    """
    Test that Query is properly initialized with ULID.

    Framework Requirement: Query must have unique ULID identifier.
    """
    query_id = ULID()
    query = Query(id=query_id, prompt="Test query")

    assert query.id == query_id
    assert query.prompt == "Test query"


# ============================================================================
# DONE Event Tests - Completion Handling
# ============================================================================

@pytest.mark.asyncio
async def test_handler_complete_emits_done_event():
    """
    Test that handler.complete() emits DONE event.

    Framework Requirement: complete() must emit DoneEvent to signal
    end of event stream. This is critical for SSE stream termination.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Call complete()
    await handler.complete()

    # Verify DONE event (Framework uses lowercase "done")
    event_name, event_data = await event_queue.get()
    parsed_event = json.loads(event_data)

    assert event_name == "done"  # Framework uses lowercase
    assert parsed_event["event_name"] == "done"
    assert parsed_event["content_type"] == "atomic.done"
    assert "id" in parsed_event
    assert "schema_version" in parsed_event


# ============================================================================
# Integration Tests - Full Event Flow
# ============================================================================

@pytest.mark.asyncio
async def test_full_event_flow():
    """
    Test complete event flow for a workflow execution.

    Simulates:
    1. WORKFLOW_START
    2. NODE_START
    3. AGENT_THINKING (streaming)
    4. AGENT_RESPONSE (streaming)
    5. NODE_COMPLETE
    6. DONE
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # 1. Workflow start
    await handler.emit_text_block("WORKFLOW_START", "Starting workflow")

    # 2. Node start
    await handler.emit_text_block("NODE_START", "Starting agent node", node_id="agent-1")

    # 3. Agent thinking stream
    thinking_stream = handler.create_text_stream("AGENT_THINKING", node_id="agent-1")
    await thinking_stream.emit_chunk("Analyzing input...\n")
    await thinking_stream.emit_chunk("Generating response...\n")
    await thinking_stream.complete()

    # 4. Agent response stream
    response_stream = handler.create_text_stream("AGENT_RESPONSE", node_id="agent-1")
    await response_stream.emit_chunk("The answer is ")
    await response_stream.emit_chunk("42.")
    await response_stream.complete()

    # 5. Node complete
    await handler.emit_text_block("NODE_COMPLETE", "Agent node completed", node_id="agent-1")

    # 6. Workflow complete
    await handler.complete()

    # Verify event sequence
    # Note: Stream complete() emits final chunk, handler.complete() emits DONE
    expected_sequence = [
        ("WORKFLOW_START", "atomic.textblock"),
        ("NODE_START::agent-1", "atomic.textblock"),
        ("AGENT_THINKING::agent-1", "chunked.text"),  # chunk 1
        ("AGENT_THINKING::agent-1", "chunked.text"),  # chunk 2
        ("AGENT_THINKING::agent-1", "chunked.text"),  # chunk 3 from complete()
        ("AGENT_RESPONSE::agent-1", "chunked.text"),  # chunk 1
        ("AGENT_RESPONSE::agent-1", "chunked.text"),  # chunk 2
        ("AGENT_RESPONSE::agent-1", "chunked.text"),  # chunk 3 from complete()
        ("NODE_COMPLETE::agent-1", "atomic.textblock"),
        ("done", "atomic.done"),  # From handler.complete() (lowercase)
    ]

    actual_sequence = []
    while not event_queue.empty():
        event_name, event_data = await event_queue.get()
        parsed_event = json.loads(event_data)
        actual_sequence.append((event_name, parsed_event["content_type"]))

    assert len(actual_sequence) == len(expected_sequence)
    for i, (expected, actual) in enumerate(zip(expected_sequence, actual_sequence)):
        assert actual == expected, f"Event {i}: expected {expected}, got {actual}"


@pytest.mark.asyncio
async def test_event_id_ordering_across_streams():
    """
    Test that Event IDs maintain monotonic ordering across multiple streams.

    This is critical for event replay and distributed system synchronization.
    """
    event_queue = asyncio.Queue()
    hook = SSEHook(event_queue)
    source = Identity(id="workflow-processor", name="Workflow Agent")
    handler = NodeAwareResponseHandler(source, hook)

    # Create multiple streams and emit events
    stream1 = handler.create_text_stream("STREAM_1")
    stream2 = handler.create_text_stream("STREAM_2")

    await stream1.emit_chunk("S1 chunk 1\n")
    await stream2.emit_chunk("S2 chunk 1\n")
    await stream1.emit_chunk("S1 chunk 2\n")
    await stream2.emit_chunk("S2 chunk 2\n")
    await stream1.complete()
    await stream2.complete()

    # Collect all Event IDs
    event_ids = []
    while not event_queue.empty():
        _, event_data = await event_queue.get()
        parsed_event = json.loads(event_data)
        event_ids.append(parsed_event["id"])

    # Verify monotonicity across all events
    for i in range(1, len(event_ids)):
        current_ulid = ULID.from_str(event_ids[i])
        previous_ulid = ULID.from_str(event_ids[i-1])
        assert current_ulid > previous_ulid, \
            f"Event {i} ID not monotonic: {event_ids[i]} <= {event_ids[i-1]}"
