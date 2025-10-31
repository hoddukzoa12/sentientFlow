# SentientFlow Backend

Backend service for executing visual workflows built with the Sentient Agent Framework.

## Setup

### 1. Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 4. Run Development Server

```bash
python main.py
```

The server will start on `http://localhost:8000`.

## API Endpoints

### Health & Status
- `GET /` - Health check
- `GET /health` - Detailed health status

### Workflow Execution
- `POST /api/workflows/{workflow_id}/execute` - Execute workflow with SSE streaming
- `GET /api/workflows/assist/{workflow_id}` - CLI-compatible assist endpoint
- `POST /api/workflows/{workflow_id}/validate` - Validate workflow without executing
- `POST /api/workflows/{workflow_id}/register` - Register workflow for CLI access

### SSE Event Streaming

The backend uses **Server-Sent Events (SSE)** for real-time workflow execution streaming. Events are 100% compliant with **Sentient Agent Framework v0.3.0**.

**Event Types:**
- `TEXT_BLOCK` - Atomic text content (`content_type: "atomic.textblock"`)
- `TEXT_CHUNK` - Streaming text chunks (`content_type: "chunked.text"`)
- `ERROR` - Error events (`content_type: "atomic.error"`)
- `done` - Workflow completion (`content_type: "atomic.done"`)

**Custom Event Names:**
- `WORKFLOW_START` - Workflow execution begins
- `NODE_START` - Node execution begins
- `AGENT_THINKING` - Agent reasoning process (streaming)
- `AGENT_RESPONSE` - Agent final response (streaming)
- `NODE_COMPLETE` - Node execution completes

**Example SSE Stream:**
```
event: WORKFLOW_START
data: {"event_name":"WORKFLOW_START","content":"Starting workflow...","content_type":"atomic.textblock","id":"01K8WE...","source":"workflow-processor"}

event: AGENT_THINKING::agent-123
data: {"event_name":"AGENT_THINKING::agent-123","content":"Analyzing input...","content_type":"chunked.text","stream_id":"stream-456","id":"01K8WE...","source":"workflow-processor"}

event: AGENT_RESPONSE::agent-123
data: {"event_name":"AGENT_RESPONSE::agent-123","content":"The answer is 42.","content_type":"chunked.text","stream_id":"stream-789","id":"01K8WE...","source":"workflow-processor"}

event: done
data: {"event_name":"done","content_type":"atomic.done","id":"01K8WE...","source":"workflow-processor"}
```

**Node Routing:** Events use `event_name::node_id` encoding for routing to specific nodes in the frontend. Example: `AGENT_THINKING::agent-123` routes to node `agent-123`.

## Architecture

```
src/
├── workflows/       # Workflow compilation and execution
├── agents/          # Node executors (Agent, Transform, etc.)
│   ├── workflow_agent.py     # Main WorkflowAgent (AbstractAgent)
│   └── node_executors.py     # Individual node executors
├── api/             # FastAPI routes
│   └── workflows.py           # SSEHook, NodeAwareResponseHandler
├── tools/           # Tool integrations (MCP, FileSearch, etc.)
└── config/          # Application settings
```

### Framework Integration

**Sentient Agent Framework v0.3.0 Compliance:**

1. **SSEHook** - Custom Hook implementation for SSE streaming
   - Uses `DefaultIdGenerator` for monotonic ULID Event IDs
   - Ensures event ordering with 10ms minimum increment
   - Serializes events using `model_dump_json()`

2. **NodeAwareResponseHandler** - Extended ResponseHandler with node routing
   - Encodes node_id into event_name (`event_name::node_id`)
   - Supports both explicit node_id parameter and context management
   - Full compatibility with Framework's ResponseHandler interface

3. **Event Emission Patterns**
   - `emit_text_block()` - Atomic content (NODE_START, NODE_COMPLETE)
   - `create_text_stream()` → `emit_chunk()` → `complete()` - Streaming (AGENT_THINKING, AGENT_RESPONSE)
   - `complete()` - Emits lowercase "done" event to signal workflow completion

4. **Node Transparency**
   - Start node: Shows input variables
   - Agent node: Shows variables, decision-making, prompt construction, variable changes
   - End node: Shows final variables and execution status

## Development

```bash
# Type checking
mypy src/

# Testing (14 Framework compliance tests)
pytest tests/test_framework_compliance.py -v

# Linting
flake8 src/
```

## GPT-5 Integration

**Supported Features:**
- `reasoning_effort`: "low", "medium", "high" (configurable per agent)
- Separate thinking and response streams
- Real-time streaming of reasoning process to frontend
