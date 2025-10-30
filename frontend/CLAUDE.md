# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SentientFlow** is a visual workflow builder for the Sentient Agent Framework. Users create AI agent workflows through a drag-and-drop canvas interface built with ReactFlow. The application allows defining workflow logic, transformations, conditionals, and agent behaviors visually, with the goal of compiling these visual workflows into executable agents.

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript (strict mode), Tailwind CSS v4, @xyflow/react v12.9.1, Zustand v5.0.8

## Development Commands

```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Production build
npm start          # Run production server
npm run lint       # ESLint checks
npx tsc --noEmit   # Type checking without emitting files
```

## Architecture Overview

### State Management Pattern

The application uses **bidirectional synchronization** between Zustand (source of truth) and ReactFlow (rendering engine):

```
User Action → FlowCanvas → Zustand Store ↔ ReactFlow State
                                ↓
                         All Components
```

**Key files**:
- `/lib/store/workflow-store.ts`: Zustand store with `nodes`, `edges`, `selectedNodeId`
- `/components/canvas/FlowCanvas.tsx`: Syncs Zustand → ReactFlow via `useEffect`

**Critical sync mechanism** (`FlowCanvas.tsx:68-74`):
```typescript
useEffect(() => {
  setReactFlowNodes(nodes as Node[]);
}, [nodes, setReactFlowNodes]);
```
This ensures immediate updates when node content changes (e.g., Note node text editing). Previous implementation only synced on array length changes, causing delayed updates.

### Node System Architecture

**12 Node Types** organized in 4 categories:

1. **Core**: `start` (workflow entry), `agent` (LLM calls), `end` (workflow exit), `note` (annotations)
2. **Tools**: `fileSearch` (file operations), `guardrails` (validation), `mcp` (MCP server calls)
3. **Logic**: `ifElse` (branching), `while` (loops), `userApproval` (human-in-the-loop)
4. **Data**: `transform` (CEL expressions), `setState` (variable assignment)

**Type Safety**: Discriminated union in `/types/workflow.ts`:
```typescript
export type NodeData =
  | StartNodeData
  | AgentNodeData
  | IfElseNodeData
  | ... // 12 total variants

export interface WorkflowNode extends Node {
  type: NodeType;
  data: NodeData;
}
```

Each node component is in `/components/canvas/nodes/{NodeType}Node.tsx` and uses ReactFlow's `NodeProps<NodeDataType>` for type safety.

### Multi-Handle Output Nodes

Three node types have **dynamic multiple output handles**:

**IfElseNode**:
- Dynamic handles per condition (id = `condition.id`)
- Always has "else" handle as fallback
- Internal row layout: each condition is a flex row with label + handle

**UserApprovalNode**:
- Fixed 2 handles: `approve` and `reject`
- Internal row layout with color-coded labels (green/red)

**WhileNode**:
- `loop` handle (continues iteration)
- `exit` handle (breaks loop)

**Pattern**: Each output option is a separate `<Handle id={uniqueId} type="source" position={Position.Right} />` positioned inside the node body as flex rows.

### Node Collision Detection

Prevents visual overlap when dragging/dropping nodes.

**Algorithm** (`/lib/utils/node-collision.ts`):
1. `NODE_DIMENSIONS` map: pixel dimensions for each node type
2. `rectanglesOverlap()`: 2D AABB collision detection
3. `findNonOverlappingPosition()`:
   - Max 50 attempts
   - On collision: shift right +40px, then down +100px
   - Called on node creation and drag stop

**Invocation points**:
- `FlowCanvas.onNodeDragStop()`: after dragging
- `WorkflowCanvas.handleNodeCreate()`: when adding from palette

### Property Panel System

`/components/panels/PropertiesPanel.tsx` dynamically renders editors based on `selectedNodeId` and node type.

**Specialized UI Components** (`/components/ui/`):
- `KeyValueEditor`: Transform/SetState assignments, MCP parameters
- `ConditionEditor`: If/Else conditions with CEL expressions
- `VariableEditor`: Start node variables with type selection (string, number, boolean, object, list)
- `TagInput`: Array inputs with Enter-to-add, X-to-remove
- `ExpressionInput`: CEL expression textarea with syntax hints

**Pattern**: Each node type has a dedicated properties component function (e.g., `AgentNodeProperties`) that calls `updateNode(nodeId, partialData)` on change.

## Key Patterns and Conventions

### Start Node Protection

Start nodes **cannot be deleted** by users (application policy).

**Implementation** (`FlowCanvas.tsx:200-209`):
```typescript
const filteredChanges = changes.filter((change) => {
  if (change.type === 'remove') {
    const node = reactFlowNodes.find(n => n.id === change.id);
    if (node?.type === 'start') {
      return false; // Block deletion
    }
  }
  return true;
});
```

### Node ID Convention

- Format: `${type}-${timestamp}` (e.g., `agent-1701234567890`)
- Exception: Start node always uses `start-initial`
- Generated in `node-defaults.ts:getDefaultNodeData()`

### Edge ID Convention

- Format: `edge-${source}-${target}`
- Generated in `FlowCanvas.onConnect()`
- Handles multi-handle connections via `sourceHandle` and `targetHandle` properties

### Position Persistence

Node positions persist automatically via `onNodesChange` callback:

```typescript
if (change.type === 'position' && change.dragging === false && change.position) {
  // Update Zustand with final position after drag ends
  setNodes(updatedNodes as WorkflowNode[]);
}
```

## Critical Behaviors

1. **Start Node Deletion**: Blocked in `onNodesChange` filter
2. **Edge Auto-Cleanup**: ReactFlow automatically removes edges when source/target node deleted
3. **Selection Reset**: `selectedNodeId` set to null when selected node deleted
4. **Collision Prevention**: All node placements checked against existing nodes
5. **Real-time Updates**: Node data changes immediately reflected in canvas (via `nodes` dependency in useEffect)

## Future Integration: Sentient Framework

The codebase is being prepared for integration with the Python-based Sentient Agent Framework:

- **Current state**: Visual workflow builder (UI only)
- **Planned**: Backend service to compile visual workflows → executable AbstractAgent instances
- **Execution model**: Event streaming via SSE (Server-Sent Events)
- **Node executors**: Each node type will map to a backend executor (AgentNodeExecutor, TransformNodeExecutor, etc.)

When implementing backend integration:
- Workflow JSON serialization via Zustand store export
- SSE client in `/hooks/useEventStream.ts` (to be created)
- Execution panel in `/components/execution/` (to be created)
- Event types: TEXT_BLOCK, TEXT_CHUNK, JSON, ERROR, DONE

## TypeScript Path Aliases

`@/*` maps to project root, configured in `tsconfig.json`:
```typescript
import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { WorkflowNode } from "@/types/workflow";
```

## Styling Conventions

- **Theme**: Dark mode only (black background, gray borders)
- **Utility-first**: Tailwind classes only, no CSS modules
- **Node colors**: Green (core), Blue (agents), Yellow (tools/note), Orange (logic), Purple (data)
- **Selected state**: `border-blue-500` on selected nodes
- **Font**: Geist font family (loaded in `app/layout.tsx`)
