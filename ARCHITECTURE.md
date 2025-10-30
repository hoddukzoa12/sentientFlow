# SentientFlow Architecture

## System Overview

SentientFlow is a visual workflow builder for creating AI agent workflows powered by the Sentient Agent Framework. Users design workflows through a drag-and-drop canvas interface, test execution in real-time, and export to deployable agent systems.

### Core Capabilities

- **Visual Workflow Design**: Drag-and-drop node-based interface for workflow creation
- **Real-Time Preview**: Live execution testing with streaming output display
- **Framework Integration**: Built on Sentient Agent Framework v0.3.0 for agent development
- **Multi-Node Support**: 12 node types across Core, Tools, Logic, and Data categories
- **Type Safety**: Full TypeScript on frontend, Python type hints on backend

### Key Features

- Node-based workflow canvas with collision detection
- Real-time SSE (Server-Sent Events) streaming
- GPT-5 integration with reasoning effort control
- Zustand + ReactFlow bidirectional state synchronization
- Framework-compliant event system with monotonic IDs
- Execution context management with variable scoping

---

## High-Level Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌───────────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  WorkflowCanvas   │  │  Properties  │  │   Preview    │ │
│  │   (ReactFlow)     │  │    Panel     │  │    Panel     │ │
│  └─────────┬─────────┘  └──────────────┘  └──────┬───────┘ │
│            │                                       │         │
│  ┌─────────▼───────────────────────────────────┐ │         │
│  │        Zustand Store (Workflow State)       │ │         │
│  └─────────────────────────────────────────────┘ │         │
│                                                   │         │
└───────────────────────────────────────────────────┼─────────┘
                                                    │
                       SSE Stream                   │
                       (HTTP/EventSource)           │
                                                    │
┌───────────────────────────────────────────────────▼─────────┐
│                         Backend                             │
│  ┌────────────────────┐     ┌─────────────────────────┐    │
│  │  FastAPI Routes    │────▶│  WorkflowAgent          │    │
│  │  /api/workflows    │     │  (Sentient Framework)   │    │
│  └────────┬───────────┘     └───────────┬─────────────┘    │
│           │                              │                  │
│           │                              │                  │
│  ┌────────▼───────────┐     ┌───────────▼─────────────┐    │
│  │  SSEHook +         │     │  Node Executors         │    │
│  │  DefaultIdGen      │     │  (Start/Agent/End)      │    │
│  └────────────────────┘     └─────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 │ API Calls
                                 ▼
                        ┌─────────────────┐
                        │  OpenAI GPT-5   │
                        └─────────────────┘
```

### Communication Flow

1. **Workflow Creation**: User designs workflow on canvas → Zustand store updated → ReactFlow renders
2. **Execution Request**: Preview panel sends POST /api/workflows/{id}/execute with workflow JSON
3. **Backend Processing**: FastAPI → WorkflowAgent → Node Executors → Sentient Framework Events
4. **Event Streaming**: SSEHook with DefaultIdGenerator → Framework Events → SSE stream
5. **Frontend Updates**: useWorkflowExecution parses events → Updates UI state → Preview displays results

---

## Technology Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Canvas**: @xyflow/react v12.9.1 (ReactFlow)
- **State Management**: Zustand v5.0.8
- **Type Safety**: Discriminated unions for node types

### Backend

- **Web Framework**: FastAPI 0.115.6
- **Language**: Python 3.13 with type hints
- **Agent Framework**: Sentient Agent Framework v0.3.0
- **LLM Integration**: OpenAI Python SDK (GPT-5 with reasoning_effort)
- **Event Streaming**: Server-Sent Events (SSE)
- **Data Validation**: Pydantic v2

### Communication Protocol

- **Streaming**: SSE (Server-Sent Events)
- **Format**: `event: {event_name}\ndata: {JSON}\n\n`
- **Event System**: Sentient Framework Events
  - **Framework Types**: TextBlockEvent, TextChunkEvent, DocumentEvent, ErrorEvent, DoneEvent
  - **Custom Names**: WORKFLOW_START, AGENT_THINKING, NODE_COMPLETE, etc.

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── workflow/[id]/           # Workflow editor route
│       └── page.tsx
├── components/
│   ├── canvas/                  # Canvas and nodes
│   │   ├── FlowCanvas.tsx       # ReactFlow wrapper
│   │   ├── WorkflowCanvas.tsx   # Main canvas component
│   │   └── nodes/               # 12 node components
│   ├── panels/                  # Side panels
│   │   ├── PropertiesPanel.tsx  # Node properties editor
│   │   └── NodePalette.tsx      # Node creation palette
│   └── preview/                 # Execution preview
│       ├── PreviewPanel.tsx     # Preview container
│       ├── ChatInterface.tsx    # Message display
│       └── ChatInput.tsx        # Execution controls
├── lib/
│   ├── store/
│   │   └── workflow-store.ts    # Zustand state management
│   └── utils/
│       ├── node-collision.ts    # Collision detection
│       ├── node-defaults.ts     # Node factory
│       └── sse-parser.ts        # SSE stream parser
├── types/
│   ├── workflow.ts              # Node type definitions
│   ├── execution.ts             # Event types
│   └── preview.ts               # Preview types
└── hooks/
    └── useWorkflowExecution.ts  # Execution hook
```

### State Management Pattern

**Bidirectional Synchronization** between Zustand (source of truth) and ReactFlow (rendering):

```typescript
// Zustand Store (workflow-store.ts)
interface WorkflowState {
  nodes: WorkflowNode[];
  edges: Edge[];
  selectedNodeId: string | null;

  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
}

// FlowCanvas.tsx - Sync Zustand → ReactFlow
useEffect(() => {
  setReactFlowNodes(nodes as Node[]);
}, [nodes, setReactFlowNodes]);

// FlowCanvas.tsx - Sync ReactFlow → Zustand
const onNodesChange = useCallback((changes: NodeChange[]) => {
  // Filter out start node deletions
  // Update Zustand on position changes
  setNodes(updatedNodes as WorkflowNode[]);
}, [nodes, setNodes]);
```

**Critical**: The `useEffect` dependency on `nodes` ensures immediate canvas updates when node data changes (e.g., Note text editing).

### Node System

**12 Node Types** organized in 4 categories:

#### Core Nodes
- **start**: Workflow entry point, variable initialization
- **agent**: LLM calls with GPT-5 reasoning_effort support
- **end**: Workflow completion
- **note**: Canvas annotations (no execution)

#### Tool Nodes
- **fileSearch**: File system operations
- **guardrails**: Input/output validation
- **mcp**: MCP server integrations

#### Logic Nodes
- **ifElse**: Conditional branching with CEL expressions
- **while**: Loop execution
- **userApproval**: Human-in-the-loop decision points

#### Data Nodes
- **transform**: CEL expression transformations
- **setState**: Variable assignment

### Node Type Safety

**Discriminated Union Pattern** for type safety:

```typescript
// types/workflow.ts
export type NodeData =
  | StartNodeData
  | AgentNodeData
  | IfElseNodeData
  | TransformNodeData
  | EndNodeData
  | NoteNodeData
  | ... // 12 total variants

export interface WorkflowNode extends Node {
  type: NodeType;
  data: NodeData;
}

// Component example
export function AgentNode({ data }: NodeProps<AgentNodeData>) {
  // TypeScript knows data is AgentNodeData
  return <div>{data.systemPrompt}</div>;
}
```

### Multi-Handle Output Nodes

Three node types have **dynamic multiple output handles**:

**IfElseNode**:
```typescript
// Dynamic handles per condition
conditions.map(condition => (
  <Handle id={condition.id} type="source" position={Position.Right} />
))
// Plus "else" fallback handle
```

**UserApprovalNode**:
```typescript
// Fixed 2 handles
<Handle id="approve" type="source" />
<Handle id="reject" type="source" />
```

**WhileNode**:
```typescript
<Handle id="loop" type="source" />   // Continue iteration
<Handle id="exit" type="source" />   // Break loop
```

### Collision Detection

Prevents node overlap during drag/drop operations.

**Algorithm** (`lib/utils/node-collision.ts`):
```typescript
const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  start: { width: 240, height: 180 },
  agent: { width: 280, height: 320 },
  // ... all 12 types
};

function findNonOverlappingPosition(
  position: XYPosition,
  nodeType: NodeType,
  existingNodes: WorkflowNode[]
): XYPosition {
  // Max 50 attempts
  // On collision: shift right +40px, then down +100px
  // Uses AABB (Axis-Aligned Bounding Box) collision detection
}
```

**Invocation Points**:
- `FlowCanvas.onNodeDragStop()`: After manual dragging
- `WorkflowCanvas.handleNodeCreate()`: When adding from palette

### Properties Panel System

Dynamic rendering based on selected node type:

```typescript
// components/panels/PropertiesPanel.tsx
export function PropertiesPanel() {
  const { selectedNodeId, nodes, updateNode } = useWorkflowStore();
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  switch (selectedNode?.type) {
    case 'agent': return <AgentNodeProperties />;
    case 'ifElse': return <IfElseNodeProperties />;
    // ... per-type editors
  }
}
```

**Specialized UI Components**:
- `KeyValueEditor`: Transform/SetState assignments, MCP parameters
- `ConditionEditor`: If/Else conditions with CEL expressions
- `VariableEditor`: Start node variables with type selection
- `TagInput`: Array inputs with Enter-to-add
- `ExpressionInput`: CEL expression textarea

### Preview Panel Architecture

Real-time execution visualization with SSE streaming.

**Key Files**:
- `PreviewPanel.tsx`: Container and state management
- `ChatInterface.tsx`: Message and block display
- `ChatInput.tsx`: Execution controls (Send/Stop buttons)
- `NodeBlockContainer.tsx`: Node execution block rendering

**Event Flow**:
```
useWorkflowExecution hook
  ↓ (SSE events)
nodeBlocks (computed)
  ↓ (merged with userMessages)
chatItems (sorted by timestamp)
  ↓ (rendered)
ChatInterface
```

**Node Block Structure**:
```typescript
interface NodeExecutionBlock {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'executing' | 'completed' | 'error';
  thinkingChunks: string[];      // GPT-5 reasoning
  streamingThinking: string;     // Current thinking stream
  responseChunks: string[];      // LLM responses
  streamingResponse: string;     // Current response stream
  error?: string;
}
```

---

## Backend Architecture

### Directory Structure

```
backend/
├── main.py                      # FastAPI application entry
├── src/
│   ├── api/
│   │   └── workflows.py         # SSE endpoint + SSEHook
│   ├── agents/
│   │   ├── workflow_agent.py    # WorkflowAgent implementation
│   │   └── node_executors.py    # Node executor implementations
│   ├── workflows/
│   │   ├── models.py            # Pydantic models
│   │   ├── compiler.py          # Workflow validation
│   │   └── execution_context.py # Variable management
│   └── config/
│       └── settings.py          # Configuration
└── requirements.txt
```

### Sentient Framework Integration

**Framework Components Used**:
- `AbstractAgent`: Base for WorkflowAgent
- `ResponseHandler`: Event emission interface (DefaultResponseHandler subclassed)
- `Hook`: Event propagation (custom SSEHook)
- `Session`: Execution context
- `Events`: TextBlockEvent, TextChunkEvent, DocumentEvent, ErrorEvent, DoneEvent
- `DefaultIdGenerator`: Monotonic ULID generation

**Key Decision**: Using FastAPI instead of DefaultServer while maintaining Framework compliance.

### SSEHook with DefaultIdGenerator

**Critical Component** for Framework-compliant event streaming:

```python
# src/api/workflows.py
class SSEHook(Hook):
    """Custom Hook for SSE event streaming with Framework-compliant event handling."""

    def __init__(self, event_queue: asyncio.Queue):
        self._queue = event_queue
        self._id_generator = DefaultIdGenerator()  # CRITICAL: Monotonic IDs

    async def emit(self, event: Event):
        """Emit Framework Event with proper ID management."""
        # Ensure monotonically increasing Event IDs
        event = cast(BaseEvent, event)
        event.id = await self._id_generator.get_next_id(event.id)

        # Extract event_name and serialize Event as-is
        event_name = event.event_name
        event_data = event.model_dump_json()

        await self._queue.put((event_name, event_data))
```

**Why DefaultIdGenerator is Critical**:
- Ensures monotonically increasing ULID Event IDs
- 10ms minimum increment between events
- Required for event ordering in Sentient Chat
- Missing this caused out-of-order event issues

### NodeAwareResponseHandler

**Extended ResponseHandler** with nodeId support:

```python
class NodeAwareResponseHandler(DefaultResponseHandler):
    """ResponseHandler with nodeId support for workflow execution."""

    def __init__(self, source: Identity, hook: Hook):
        super().__init__(source, hook)
        self._current_node_id: str | None = None

    def set_node_id(self, node_id: str | None):
        """Set current node_id context for subsequent events."""
        self._current_node_id = node_id

    async def emit_text_block(self, event_name: str, content: str, node_id: str = None):
        """Extended emit_text_block with optional node_id."""
        # Encode node_id in event_name as "event_name::node_id"
        if node_id or self._current_node_id:
            actual_node_id = node_id or self._current_node_id
            encoded_name = f"{event_name}::{actual_node_id}"
        else:
            encoded_name = event_name

        await super().emit_text_block(encoded_name, content)

    def create_text_stream(self, event_name: str, node_id: str | None = None):
        """Extended create_text_stream with optional node_id."""
        # Encode node_id in event_name
        if node_id or self._current_node_id:
            actual_node_id = node_id or self._current_node_id
            encoded_name = f"{event_name}::{actual_node_id}"
        else:
            encoded_name = event_name

        return super().create_text_stream(encoded_name)
```

**NodeId Encoding**: Uses the `"event_name::node_id"` pattern to attach node context to Framework events without modifying the Event schema. See [NodeId Encoding](#nodeid-encoding) section for details.

### Node Executor Pattern

**Base Executor**:
```python
# src/agents/node_executors.py
class BaseNodeExecutor:
    """Base class for node executors."""

    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Render template string with variables using Python Template."""
        tmpl = Template(template)
        return tmpl.safe_substitute(variables)
```

**Executor Implementations**:

#### StartNodeExecutor
```python
async def execute(
    self, node_id: str, node_data: Dict, context: ExecutionContext,
    response_handler: ResponseHandler
) -> ExecutionResult:
    # Set initial variables from node configuration
    for variable in node_data.get("variables", []):
        context.set_variable(variable["name"], typed_value)

    await response_handler.emit_text_block(
        event_name="WORKFLOW_START",
        content=f"Workflow started with {len(variables)} variables",
        node_id=node_id
    )
```

#### AgentNodeExecutor
```python
async def execute(...) -> ExecutionResult:
    # 1. Render prompts with context variables
    system_prompt = self._render_template(node_data["systemPrompt"], context.get_all_variables())
    user_prompt = self._render_template(node_data["userPrompt"], context.get_all_variables())

    # 2. Create streaming request with GPT-5 reasoning_effort
    openai_stream = await self.client.chat.completions.create(
        model="gpt-5",
        messages=[...],
        stream=True,
        reasoning_effort=node_data.get("reasoningEffort", "medium")
    )

    # 3. Stream response with separate thinking and response streams
    thinking_stream = response_handler.create_text_stream("AGENT_THINKING", node_id=node_id)
    response_stream = response_handler.create_text_stream("AGENT_RESPONSE", node_id=node_id)

    async for chunk in openai_stream:
        if hasattr(delta, 'reasoning_content'):  # GPT-5 thinking
            await thinking_stream.emit_chunk(delta.reasoning_content)
        if delta.content:                        # Regular response
            await response_stream.emit_chunk(delta.content)

    # 4. Save result to context
    context.set_variable(node_data["outputVariable"], full_response)
```

#### EndNodeExecutor
```python
async def execute(...) -> ExecutionResult:
    # Emit completion event
    await response_handler.emit_text_block(
        event_name="WORKFLOW_COMPLETE",
        content="Workflow execution completed successfully",
        node_id=node_id
    )

    # Emit final context as JSON
    await response_handler.emit_json(
        event_name="FINAL_CONTEXT", data=context.to_dict()
    )
```

**Executor Registry**:
```python
NODE_EXECUTORS = {
    "start": StartNodeExecutor(),
    "agent": AgentNodeExecutor(),
    "end": EndNodeExecutor(),
}
```

### Execution Context

**Variable Scoping and Management**:

```python
# src/workflows/execution_context.py
class ExecutionContext:
    """Manages variable scope during workflow execution."""

    def __init__(self, initial_variables: Dict[str, Any] = None):
        self._variables: Dict[str, Any] = initial_variables or {}

    def set_variable(self, name: str, value: Any) -> None:
        """Set variable in context."""
        self._variables[name] = value

    def get_variable(self, name: str, default: Any = None) -> Any:
        """Get variable from context."""
        return self._variables.get(name, default)

    def get_all_variables(self) -> Dict[str, Any]:
        """Get all variables for template rendering."""
        return self._variables.copy()
```

### WorkflowAgent Implementation

**Main orchestration logic**:

```python
# src/agents/workflow_agent.py
class WorkflowAgent(AbstractAgent):
    """Agent that executes visual workflows."""

    def __init__(self, workflow: WorkflowDefinition, input_variables: Dict[str, Any]):
        self.workflow = workflow
        self.context = ExecutionContext(input_variables)

    async def assist(
        self, session: Session, query: Query,
        response_handler: ResponseHandler
    ) -> None:
        # 1. Find start node
        start_node = next((n for n in self.workflow.nodes if n.type == "start"), None)

        # 2. Initialize context with start node variables
        # ... (handled by StartNodeExecutor)

        # 3. Execute workflow from start node
        await self._execute_from_node(start_node.id, self.context, response_handler)

        # Note: DONE event emitted by workflows.py via handler.complete()

    async def _execute_from_node(
        self, node_id: str, context: ExecutionContext,
        response_handler: ResponseHandler
    ) -> None:
        """Execute workflow starting from given node."""
        node = self._get_node_by_id(node_id)
        executor = NODE_EXECUTORS.get(node.type)

        # Execute current node
        result = await executor.execute(node_id, node.data, context, response_handler)

        # Find next nodes via edges
        next_nodes = self._get_next_nodes(node_id)

        # Recursive execution (will be iterative with loops/branches)
        for next_node_id in next_nodes:
            await self._execute_from_node(next_node_id, context, response_handler)
```

---

## Communication Protocol

### SSE Event Streaming

**Protocol**: Server-Sent Events (SSE) over HTTP

**Format**:
```
event: {event_name}\n
data: {Framework Event JSON}\n
\n
```

**Example Stream**:
```
event: WORKFLOW_START
data: {"id":"01JBVW...","event_name":"WORKFLOW_START","content_type":"atomic.textblock","content":"Workflow started","source":{"id":"workflow-processor","name":"Workflow Agent"},"timestamp":"2025-10-30T03:41:19.829Z"}

event: AGENT_THINKING::agent-1761763268398
data: {"id":"01JBVW...","event_name":"AGENT_THINKING::agent-1761763268398","content_type":"chunked.text","content":"Let me analyze...","stream_id":"stream-123","is_complete":false,...}

event: AGENT_RESPONSE::agent-1761763268398
data: {"id":"01JBVW...","event_name":"AGENT_RESPONSE::agent-1761763268398","content_type":"chunked.text","content":"Hello! How...","stream_id":"stream-456","is_complete":false,...}

event: DONE
data: {"id":"01JBVW...","event_name":"DONE","content_type":"atomic.done","timestamp":"2025-10-30T03:41:22.723Z"}
```

### Framework Event Structure

**Base Event Fields** (all events):
```typescript
{
  id: string;              // ULID (monotonically increasing)
  event_name: string;      // Event type (encoded with ::node_id)
  content_type: string;    // Event category
  source: {
    id: string;            // Source identity
    name: string;
  };
  timestamp: string;       // ISO 8601
}
```

**Event Types by content_type**:

| content_type | Framework Event | Primary Usage |
|-------------|----------------|---------------|
| atomic.textblock | TextBlockEvent | Workflow milestones (WORKFLOW_START, NODE_COMPLETE) |
| chunked.text | TextChunkEvent | Streaming LLM output (AGENT_THINKING, AGENT_RESPONSE) |
| atomic.json | DocumentEvent | Structured data (FINAL_CONTEXT) |
| atomic.error | ErrorEvent | Error messages and codes |
| atomic.done | DoneEvent | Workflow completion signal |

#### 1. atomic.textblock
```typescript
{
  content_type: "atomic.textblock",
  content: string          // Text content
}
```
Used for: WORKFLOW_START, NODE_START, NODE_COMPLETE, WORKFLOW_COMPLETE

#### 2. chunked.text
```typescript
{
  content_type: "chunked.text",
  content: string,         // Chunk content
  stream_id: string,       // Stream identifier
  is_complete: boolean     // Stream completion flag
}
```
Used for: AGENT_THINKING, AGENT_RESPONSE (streaming LLM output)

#### 3. atomic.json
```typescript
{
  content_type: "atomic.json",
  data: object             // JSON payload
}
```
Used for: FINAL_CONTEXT (workflow result)

#### 4. atomic.error
```typescript
{
  content_type: "atomic.error",
  content: {
    error_message: string,
    error_code: number
  }
}
```
Used for: Error handling

#### 5. atomic.done
```typescript
{
  content_type: "atomic.done"
}
```
Used for: Workflow completion signal

### NodeId Encoding

**Pattern**: `event_name::node_id`

**Example**: `"AGENT_THINKING::agent-1761763268398"`

**Frontend Parsing**:
```typescript
const eventName = event.type;  // "AGENT_THINKING::agent-1761763268398"
let actualEventName = eventName;
let nodeId: string | undefined;

if (eventName.includes("::")) {
  const parts = eventName.split("::", 2);
  actualEventName = parts[0];  // "AGENT_THINKING"
  nodeId = parts[1];           // "agent-1761763268398"
}
```

### Stream Completion Handling

**Critical Implementation Detail**: 50ms delay before stream closure

```python
# src/api/workflows.py - event_generator()
while True:
    event_type, data = await event_queue.get()
    yield f"event: {event_type}\ndata: {data}\n\n"

    if event_type == "DONE":
        # Small delay to ensure DONE event is transmitted before closing stream
        await asyncio.sleep(0.05)
        break
```

**Why 50ms Delay is Needed**:
- Without delay: Generator exits immediately after yielding DONE
- Stream closes before DONE event reaches client buffer
- Frontend never receives DONE → status stuck at "running"
- With delay: Event loop processes yielded data before generator exits
- Frontend receives DONE → `setStatus("completed")` → UI updates correctly

---

## Workflow Execution Pipeline

### Execution Flow

```
1. User clicks "Send" in Preview Panel
   ↓
2. Frontend: useWorkflowExecution.execute()
   - Generates execution ID: exec-{timestamp}
   - Sets status: "running"
   - Creates AbortController for cancellation
   ↓
3. Frontend: POST /api/workflows/{id}/execute
   - Body: { workflowId, workflowDefinition, inputVariables }
   ↓
4. Backend: workflows.py execute_workflow()
   - Create WorkflowAgent with workflow + variables
   - Create SentientQuery
   - Start event_generator() coroutine
   ↓
5. Backend: event_generator()
   - Create event queue + SSEHook + DefaultIdGenerator
   - Create NodeAwareResponseHandler
   - Create Session
   - Start agent.assist() in background task
   ↓
6. Backend: agent.assist()
   - Find start node
   - Execute _execute_from_node() recursively
   ↓
7. Backend: Node Execution Loop
   For each node:
   - Get executor from NODE_EXECUTORS registry
   - Execute node (emit events via ResponseHandler)
   - Find next nodes from edges
   - Recurse to next nodes
   ↓
8. Backend: Event Emission
   - Node executors call response_handler methods
   - NodeAwareResponseHandler encodes nodeId
   - DefaultResponseHandler creates Framework Events
   - SSEHook receives events
   - DefaultIdGenerator assigns monotonic IDs
   - Events queued for SSE streaming
   ↓
9. Backend: SSE Streaming
   - event_generator() reads from queue
   - Yields "event: {name}\ndata: {json}\n\n"
   - On DONE: 50ms delay then break
   ↓
10. Frontend: parseSSEStream()
    - Parses SSE format
    - Yields { type, data } objects
    ↓
11. Frontend: Event Processing
    - Parse nodeId from event_name
    - Switch on content_type
    - Update events array
    - Update streamBuffers for chunked.text
    - Set status on atomic.done
    ↓
12. Frontend: UI Updates
    - useWorkflowExecution returns updated state
    - PreviewPanel computes nodeBlocks
    - ChatInterface renders messages + blocks
    - Status updates → Send button enabled
```

### Node Execution Order

**Current Implementation**: Depth-First Sequential

```python
async def _execute_from_node(self, node_id: str, ...):
    # Execute current node
    result = await executor.execute(...)

    # Get next nodes
    next_nodes = self._get_next_nodes(node_id)

    # Execute next nodes sequentially
    for next_node_id in next_nodes:
        await self._execute_from_node(next_node_id, ...)
```

**Future**: Topological sort for parallel execution where possible

### Variable Management

**Flow**:
1. Start node: Initialize variables from node configuration
2. Agent node:
   - Render prompts with `_render_template(template, context.get_all_variables())`
   - Save LLM response to `context.set_variable(outputVariable, response)`
3. Transform node: Evaluate CEL expression, save result
4. SetState node: Assign value to variable
5. End node: Emit final context via `emit_json(data=context.to_dict())`

**Template Rendering** (Python Template syntax):
```python
# Node config
systemPrompt: "You are ${role}"
userPrompt: "Process this: ${input_as_text}"

# Context
{ "role": "assistant", "input_as_text": "Hello" }

# Rendered
systemPrompt: "You are assistant"
userPrompt: "Process this: Hello"
```

---

## Key Design Patterns

### 1. Executor Pattern
**Purpose**: Decouple node execution logic from workflow orchestration

**Implementation**:
- `BaseNodeExecutor`: Common template rendering
- Concrete executors: StartNodeExecutor, AgentNodeExecutor, EndNodeExecutor
- Registry: `NODE_EXECUTORS` dict maps node type → executor instance
- Interface: `async def execute(...) -> ExecutionResult`

**Benefits**:
- Easy to add new node types
- Testable in isolation
- Consistent execution interface

### 2. Observer Pattern
**Purpose**: Event-driven architecture for streaming updates

**Implementation**:
- **Subject**: ResponseHandler emits events
- **Observer**: SSEHook receives and queues events
- **Notification**: SSE stream transmits to frontend
- **Subscriber**: useWorkflowExecution processes events

**Benefits**:
- Decoupled event production from consumption
- Multiple observers possible (logging, monitoring, etc.)
- Real-time UI updates

### 3. Strategy Pattern
**Purpose**: Different output strategies for multi-handle nodes

**Implementation**:
- IfElseNode: Dynamic condition handles
- UserApprovalNode: Approve/reject handles
- WhileNode: Loop/exit handles
- Each implements different output selection logic

**Benefits**:
- Flexible branching logic
- Consistent Handle API
- Easy to add new output strategies

### 4. Compiler Pattern
**Purpose**: Transform visual workflow → executable graph

**Implementation**:
- **Source**: Visual workflow (nodes + edges JSON)
- **Analysis**: Validation, cycle detection
- **Optimization**: (Future) Topological sort for parallel execution
- **Code Generation**: WorkflowAgent with node executors

**Benefits**:
- Validation before execution
- Optimization opportunities
- Clear separation of design vs. execution

### 5. Template Method Pattern
**Purpose**: Define execution skeleton, allow customization per node type

**Implementation**:
```python
# BaseNodeExecutor defines template
class BaseNodeExecutor:
    def _render_template(self, template, variables):
        # Common template rendering logic
        pass

# Concrete executors customize behavior
class AgentNodeExecutor(BaseNodeExecutor):
    async def execute(self, ...):
        # Use inherited _render_template
        system_prompt = self._render_template(...)
        # Custom LLM execution logic
```

### 6. Hook System Pattern
**Purpose**: Framework extensibility for event handling

**Implementation**:
- Framework defines `Hook` interface
- Custom `SSEHook` implements for SSE streaming
- `ResponseHandler` calls `hook.emit(event)`
- Allows plugging in different event sinks (DB, queue, etc.)

**Benefits**:
- Framework compliance
- Extensible event handling
- Clean separation of concerns

---

## Data Models

### Frontend TypeScript Types

#### Node Types
```typescript
// types/workflow.ts
export type NodeType =
  | 'start' | 'agent' | 'end' | 'note'           // Core
  | 'fileSearch' | 'guardrails' | 'mcp'          // Tools
  | 'ifElse' | 'while' | 'userApproval'          // Logic
  | 'transform' | 'setState';                     // Data

export type NodeData =
  | StartNodeData
  | AgentNodeData
  | IfElseNodeData
  | TransformNodeData
  | EndNodeData
  | NoteNodeData
  | FileSearchNodeData
  | GuardrailsNodeData
  | McpNodeData
  | WhileNodeData
  | UserApprovalNodeData
  | SetStateNodeData;

export interface WorkflowNode extends Node {
  id: string;
  type: NodeType;
  position: XYPosition;
  data: NodeData;
}
```

#### Variable Type
```typescript
export interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
}
```

#### Node Data Examples
```typescript
export interface StartNodeData extends BaseNodeData {
  nodeType: 'start';
  inputVariables: Variable[];   // User-provided inputs
  stateVariables: Variable[];   // Internal state
}

export interface AgentNodeData extends BaseNodeData {
  nodeType: 'agent';
  name: string;
  systemPrompt: string;
  userPrompt: string;
  model: 'gpt-5';
  reasoningEffort: 'low' | 'medium' | 'high';
  outputVariable: string;
}

export interface IfElseNodeData extends BaseNodeData {
  nodeType: 'ifElse';
  conditions: Condition[];      // Dynamic output handles
}
```

#### Execution Types
```typescript
// types/execution.ts
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error';

export type WorkflowEvent =
  | TextBlockEvent
  | TextChunkEvent
  | JsonEvent
  | ErrorEvent
  | DoneEvent;

export interface TextBlockEvent {
  type: 'TEXT_BLOCK';
  timestamp: number;
  eventName: string;
  content: string;
  nodeId?: string;
}

export interface TextChunkEvent {
  type: 'TEXT_CHUNK';
  timestamp: number;
  streamId: string;
  eventName: string;
  content: string;
  isComplete: boolean;
  nodeId?: string;
}
```

### Backend Pydantic Models

#### Workflow Models
```python
# src/workflows/models.py
class WorkflowDefinition(BaseModel):
    id: str
    name: str
    version: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    variables: List[Dict[str, Any]]

class WorkflowExecutionRequest(BaseModel):
    workflowId: str
    workflowDefinition: WorkflowDefinition
    inputVariables: Dict[str, Any]
```

#### Node Data
```python
# Validated at runtime from Dict[str, Any]
# StartNodeData
{
    "nodeType": "start",
    "variables": [
        {"name": "input_as_text", "type": "string", "defaultValue": ""},
        ...
    ]
}

# AgentNodeData
{
    "nodeType": "agent",
    "name": "Agent Name",
    "systemPrompt": "You are ${role}",
    "userPrompt": "${input_as_text}",
    "model": "gpt-5",
    "reasoningEffort": "medium",
    "outputVariable": "agent_response"
}
```

---

## Recent Architectural Changes (v0.1.0)

### 1. Framework-Compliant SSE Format
**Change**: Migrated from custom event structure to full Framework Event serialization

**Before**:
```python
# Custom SSEHook (old)
if event.content_type == "atomic.textblock":
    yield f"event: TEXT_BLOCK\ndata: {json.dumps({'eventName': event.event_name, 'content': event.content})}\n\n"
```

**After**:
```python
# Framework-compliant SSEHook (new)
event_name = event.event_name
event_data = event.model_dump_json()  # Full Event object
yield f"event: {event_name}\ndata: {event_data}\n\n"
```

**Impact**: Enables Sentient Chat compatibility and proper Framework integration

### 2. DefaultIdGenerator Integration
**Change**: Added DefaultIdGenerator to SSEHook for monotonic event IDs

**Before**: Events had ULIDs but not guaranteed monotonic
**After**:
```python
self._id_generator = DefaultIdGenerator()
event.id = await self._id_generator.get_next_id(event.id)
```

**Impact**: Ensures proper event ordering (10ms minimum increment)

### 3. NodeAwareResponseHandler
**Change**: Extended DefaultResponseHandler with nodeId encoding

**Pattern**: `"event_name::node_id"`

**Impact**: Attach node context to Framework events without schema changes

### 4. Content_type Fixes
**Change**: Fixed Frontend parsing for Framework content_type values

**Before**: `"atomic.textchunk"`, `"atomic.document"`
**After**: `"chunked.text"`, `"atomic.json"`

**Impact**: Events now correctly parsed and displayed

### 5. DONE Event Deduplication
**Change**: Removed duplicate DONE emission from workflow_agent.py

**Before**: Both workflow_agent.py and workflows.py emitted DONE events
**After**: Only workflows.py emits via `handler.complete()`

**Impact**: Single, proper DoneEvent (content_type="atomic.done")

### 6. Stream Flush Delay
**Change**: Added 50ms delay before closing SSE stream after DONE event

```python
if event_type == "DONE":
    await asyncio.sleep(0.05)  # Ensure transmission
    break
```

**Impact**: Prevents race condition where DONE event lost before stream closes

### 7. GPT-5 Reasoning Effort
**Change**: Added `reasoning_effort` parameter support for GPT-5

```python
api_params = {
    "model": "gpt-5",
    "messages": messages,
    "stream": True,
    "reasoning_effort": node_data.get("reasoningEffort", "medium")
}
```

**Impact**: Supports low/medium/high reasoning modes for GPT-5

### 8. Separate Thinking and Response Streams
**Change**: Split GPT-5 output into thinking and response streams

```python
thinking_stream = response_handler.create_text_stream("AGENT_THINKING", node_id=node_id)
response_stream = response_handler.create_text_stream("AGENT_RESPONSE", node_id=node_id)

if hasattr(delta, 'reasoning_content'):  # GPT-5 thinking
    await thinking_stream.emit_chunk(delta.reasoning_content)
if delta.content:                        # Regular response
    await response_stream.emit_chunk(delta.content)
```

**Impact**: Separate visualization of reasoning process vs. final answer

---

## Future Architecture Considerations

### Additional Node Executors (In Progress)

**Transform Node**:
- CEL expression evaluation
- Variable transformation
- Type conversion

**IfElse Node**:
- Condition evaluation (CEL expressions)
- Multi-branch execution
- Dynamic handle routing

**While Node**:
- Loop condition evaluation
- Loop state management
- Break/continue handling

**SetState Node**:
- Variable assignment
- Type validation
- State mutation

### Tool Integrations (Planned)

**File Search Node**:
- File system operations
- Search patterns
- File content reading

**MCP Node**:
- MCP server connections
- Tool calling
- Parameter passing

**Guardrails Node**:
- Input validation
- Output validation
- Content filtering

### Multi-User Support (Future)

**Architecture Changes Needed**:
- Authentication system (JWT)
- User database (PostgreSQL)
- Workflow persistence per user
- Project management
- Access control

**Database Schema**:
```
users (id, email, password_hash, created_at)
projects (id, user_id, name, created_at, updated_at)
workflows (id, project_id, name, definition_json, version)
executions (id, workflow_id, status, started_at, completed_at, result_json)
```

### Multi-LLM Provider Support (Future)

**Planned Providers**:
- OpenAI (current)
- Anthropic Claude
- Google Gemini
- Local models (Ollama)

**Architecture Changes**:
- Abstract LLM client interface
- Provider configuration per agent node
- Model selection UI
- API key management per user

### Workflow Templates (Future)

**Features**:
- Pre-built workflow templates
- Template marketplace
- Version control
- Import/export

**Storage**:
- Template repository
- Metadata (category, tags, author)
- Usage analytics

### Performance Optimization (Future)

**Parallel Execution**:
- Topological sort for dependency graph
- Concurrent node execution where possible
- Resource pooling for LLM calls

**Caching**:
- LLM response caching for repeated inputs
- Workflow definition caching
- Execution result caching

### Monitoring and Observability (Future)

**Metrics**:
- Workflow execution time
- Node execution time
- LLM API latency
- Error rates

**Logging**:
- Structured logging (JSON)
- Log aggregation (ELK stack)
- Distributed tracing

---

## Deployment Architecture (Future)

### Production Stack

```
┌─────────────────────────────────────────────────────────┐
│                      Load Balancer                      │
│                    (nginx/AWS ALB)                      │
└────────────────┬────────────────────┬───────────────────┘
                 │                    │
         ┌───────▼───────┐    ┌──────▼──────┐
         │   Frontend    │    │   Frontend  │
         │  (Next.js)    │    │  (Next.js)  │
         │  [Container]  │    │ [Container] │
         └───────┬───────┘    └──────┬──────┘
                 │                    │
         ┌───────▼────────────────────▼───────┐
         │        API Gateway/Router          │
         └───────┬────────────────────┬───────┘
                 │                    │
         ┌───────▼───────┐    ┌──────▼──────┐
         │    Backend    │    │   Backend   │
         │   (FastAPI)   │    │  (FastAPI)  │
         │  [Container]  │    │ [Container] │
         └───────┬───────┘    └──────┬──────┘
                 │                    │
         ┌───────▼────────────────────▼───────┐
         │        PostgreSQL Database          │
         │         (Managed Service)           │
         └────────────────────────────────────┘
```

### Container Orchestration

**Docker Compose** (Development):
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  postgres:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
```

**Kubernetes** (Production):
- Frontend deployment (3+ replicas)
- Backend deployment (5+ replicas)
- PostgreSQL StatefulSet
- Redis for session management
- Horizontal Pod Autoscaling
- Ingress for load balancing

---

## Security Considerations

### Current Implementation

**Frontend**:
- CORS configured for localhost development
- Input validation before API calls
- TypeScript strict mode for type safety

**Backend**:
- Pydantic validation for all inputs
- Environment variables for secrets
- No authentication (development only)

### Production Requirements (Future)

**Authentication**:
- JWT-based authentication
- OAuth 2.0 integration
- Session management with Redis
- Password hashing (bcrypt)

**Authorization**:
- Role-based access control (RBAC)
- Workflow ownership validation
- API rate limiting

**Data Protection**:
- HTTPS only
- API key encryption at rest
- Database encryption
- Audit logging

**API Security**:
- CORS whitelist for production domains
- Request size limits
- Input sanitization
- SQL injection prevention (SQLAlchemy ORM)
- XSS prevention (React default escaping)

---

## Conclusion

SentientFlow's architecture demonstrates a clean separation of concerns between visual design (frontend) and execution runtime (backend), connected by a robust SSE streaming protocol that maintains Framework compliance while supporting real-time UI updates.

Key architectural strengths:
- **Type Safety**: Full TypeScript + Python type hints
- **Framework Compliance**: Proper Sentient Framework v0.3.0 integration
- **Extensibility**: Executor pattern for easy node type additions
- **Real-Time Updates**: SSE streaming with monotonic event ordering
- **Separation of Concerns**: Clear boundaries between components

The architecture is designed for future scalability with planned support for additional node types, multi-user capabilities, and deployment to production environments.
