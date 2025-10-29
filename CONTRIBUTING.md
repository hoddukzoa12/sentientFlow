# Contributing to SentientFlow

First off, thank you for considering contributing to SentientFlow! It's people like you that make SentientFlow such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold this standard.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots, etc.)
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (OS, Node.js version, Python version, browser)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternative solutions** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** if you've added code that should be tested
4. **Ensure the test suite passes** (`npm test` for frontend, `pytest` for backend)
5. **Update documentation** if needed
6. **Write a clear commit message** following our commit conventions

## Development Setup

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

**Key Technologies:**
- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- ReactFlow 12.9

**Important Files:**
- `/types/workflow.ts` - Type definitions
- `/lib/store/workflow-store.ts` - Zustand state management
- `/components/canvas/` - Canvas and node components
- `/components/panels/` - Properties and node palette

### Backend Development

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Key Technologies:**
- FastAPI 0.115
- Sentient Agent Framework 0.3
- Pydantic 2.10
- AsyncOpenAI

**Important Files:**
- `/src/workflows/compiler.py` - Workflow compilation
- `/src/agents/node_executors.py` - Node execution logic
- `/src/api/workflows.py` - API endpoints

## Coding Standards

### TypeScript/React (Frontend)

- **Use TypeScript** with strict mode enabled
- **Prefer function components** with hooks
- **Use "use client"** directive for interactive components
- **Follow file naming**: `ComponentName.tsx` for components, `kebab-case.ts` for utilities
- **Use Tailwind classes** only (no CSS modules)
- **Props interface naming**: `ComponentNameProps`

**Example:**
```typescript
"use client";

interface MyComponentProps {
  data: string;
  onUpdate: (value: string) => void;
}

export function MyComponent({ data, onUpdate }: MyComponentProps) {
  // Implementation
}
```

### Python (Backend)

- **Follow PEP 8** style guide
- **Use type hints** for all function parameters and return values
- **Use async/await** for I/O operations
- **Docstrings** for all public functions and classes
- **File naming**: `snake_case.py`

**Example:**
```python
async def execute_node(
    node_id: str,
    node_data: Dict[str, Any],
    context: ExecutionContext,
) -> ExecutionResult:
    """
    Execute a workflow node.

    Args:
        node_id: Unique identifier for the node
        node_data: Node configuration data
        context: Execution context with variables

    Returns:
        ExecutionResult with success status and next nodes
    """
    # Implementation
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(canvas): add zoom controls to workflow canvas

fix(agent): resolve streaming timeout issue

docs(readme): update installation instructions
```

## Testing

### Frontend Tests

```bash
cd frontend
npm test              # Run all tests
npm test -- --watch   # Run tests in watch mode
```

### Backend Tests

```bash
cd backend
pytest                    # Run all tests
pytest tests/test_compiler.py  # Run specific test file
pytest -v                 # Verbose output
```

## Documentation

- Update README.md and README.ko.md for user-facing changes
- Update CLAUDE.md for architecture or development workflow changes
- Add inline comments for complex logic
- Document new node types in the Node Types table

## Node Implementation Guide

When adding a new node type:

1. **Update types** (`/types/workflow.ts`):
   ```typescript
   export type NodeType = "start" | "agent" | "yourNewNode" | ...;
   export interface YourNewNodeData extends BaseNodeData {
     // Node-specific properties
   }
   ```

2. **Create node component** (`/components/canvas/nodes/YourNewNode.tsx`):
   ```typescript
   export function YourNewNode({ data, selected }: NodeProps<YourNewNodeData>) {
     // Node rendering
   }
   ```

3. **Add to node registry** (`/components/canvas/FlowCanvas.tsx`):
   ```typescript
   const nodeTypes: NodeTypes = {
     // ... existing nodes
     yourNewNode: YourNewNode,
   };
   ```

4. **Create executor** (`/backend/src/agents/node_executors.py`):
   ```python
   class YourNewNodeExecutor(BaseNodeExecutor):
       async def execute(self, node_id, node_data, context, response_handler):
           # Node execution logic
   ```

5. **Add to executor registry**:
   ```python
   NODE_EXECUTORS = {
       # ... existing executors
       "yourNewNode": YourNewNodeExecutor(),
   }
   ```

## Questions?

Feel free to open an issue for questions or join our discussions. We're here to help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
