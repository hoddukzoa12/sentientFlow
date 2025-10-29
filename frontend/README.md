# SentientFlow Frontend

Visual workflow builder interface for SentientFlow, built with Next.js 16 and ReactFlow.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **UI Library**: ReactFlow 12.9 for canvas
- **State Management**: Zustand 5.0
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Language**: TypeScript (strict mode)

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm, yarn, pnpm, or bun

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The workflow editor is available at `/workflow/[id]` (e.g., `http://localhost:3000/workflow/test`).

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with fonts
│   ├── page.tsx             # Landing page
│   └── workflow/[id]/       # Workflow editor page
│       └── page.tsx
│
├── components/              # React components
│   ├── canvas/             # Canvas-related components
│   │   ├── FlowCanvas.tsx  # ReactFlow canvas wrapper
│   │   ├── WorkflowHeader.tsx
│   │   └── nodes/          # Node type components
│   │       ├── index.ts    # Node exports
│   │       ├── StartNode.tsx
│   │       ├── AgentNode.tsx
│   │       └── ...         # Other node types
│   ├── execution/          # Execution-related components
│   │   ├── ExecutionPanel.tsx
│   │   └── EventStreamViewer.tsx
│   ├── panels/             # Side panels
│   │   ├── NodePanel.tsx   # Node palette
│   │   └── PropertiesPanel.tsx
│   └── ui/                 # Reusable UI components
│       ├── KeyValueEditor.tsx
│       ├── ConditionEditor.tsx
│       └── ...
│
├── lib/                    # Utilities and helpers
│   ├── store/              # Zustand stores
│   │   └── workflow-store.ts
│   └── utils/              # Utility functions
│       ├── node-collision.ts
│       ├── node-defaults.ts
│       └── utils.ts
│
├── types/                  # TypeScript type definitions
│   ├── workflow.ts         # Workflow types
│   └── execution.ts        # Execution types
│
├── hooks/                  # Custom React hooks
│   └── useWorkflowExecution.ts
│
└── public/                 # Static assets

## Key Features

### Visual Canvas
- Drag-and-drop node creation
- Automatic collision detection
- Node connection via edges
- Viewport controls (zoom, pan)
- MiniMap for navigation

### Node System
12 node types across 4 categories:
- **Core**: Start, Agent, End, Note
- **Tools**: FileSearch, Guardrails, MCP
- **Logic**: If/Else, While, UserApproval
- **Data**: Transform, SetState

### State Management
- Zustand for global workflow state
- Bidirectional sync with ReactFlow
- Real-time updates on node changes

### Execution System
- Server-Sent Events (SSE) for streaming
- Real-time LLM response display
- Event stream viewer
- Execution status tracking

## Development Guide

### Adding a New Node Type

1. **Define type** in `/types/workflow.ts`:
```typescript
export type NodeType = "start" | "yourNode" | ...;
export interface YourNodeData extends BaseNodeData {
  yourProperty: string;
}
```

2. **Create component** in `/components/canvas/nodes/YourNode.tsx`:
```typescript
export function YourNode({ data, selected }: NodeProps<YourNodeData>) {
  return (
    <div className={`px-3 py-2 rounded-lg border-2 ...`}>
      {/* Node UI */}
    </div>
  );
}
```

3. **Register node** in `/components/canvas/FlowCanvas.tsx`:
```typescript
const nodeTypes: NodeTypes = {
  // ...existing
  yourNode: YourNode,
};
```

4. **Add to palette** in `/components/panels/NodePanel.tsx`

5. **Add properties UI** in `/components/panels/PropertiesPanel.tsx`

### Styling Conventions

- Use Tailwind utility classes only
- Dark theme: `bg-black`, `bg-gray-900`, `border-gray-800`
- Selected states: `border-blue-500`
- Node colors:
  - Core: Green (`bg-green-500`)
  - Tools: Yellow (`bg-yellow-500`)
  - Logic: Orange (`bg-orange-500`)
  - Data: Purple (`bg-purple-500`)

### TypeScript

- Strict mode enabled
- Path aliases: `@/*` maps to project root
- Use discriminated unions for node data types
- Prefer `interface` for component props

## Environment Variables

No frontend environment variables required for development. Backend URL is hardcoded to `http://localhost:8000`.

For production, update SSE endpoints in:
- `/hooks/useWorkflowExecution.ts`

## Documentation

For comprehensive architecture and development guidelines, see [CLAUDE.md](./CLAUDE.md).

## Backend Integration

Frontend communicates with FastAPI backend via:
- **REST API**: Workflow execution requests
- **SSE**: Real-time event streaming
- **Endpoints**: `POST /api/workflows/{id}/execute`

Ensure backend is running on `http://localhost:8000` before executing workflows.

## License

MIT License - see [LICENSE](../LICENSE) for details.
