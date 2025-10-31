# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Additional tool integrations
- Workflow templates
- Export/Import workflows
- Execution history
- Debug mode with breakpoints
- Multi-LLM provider support

## [0.1.0] - 2025-10-31

### Added

#### Core Features
- Initial release of SentientFlow
- Visual workflow builder with ReactFlow canvas
- Drag-and-drop node creation from palette
- Node collision detection and auto-positioning
- 12 node types across 4 categories (Core, Tools, Logic, Data)
  - Core: Start, Agent, End, Note
  - Tools: File Search, Guardrails, MCP
  - Logic: If/Else, While, User Approval
  - Data: Transform, Set State
- Real-time LLM response streaming via SSE
- Node properties panel for configuration
- Execution panel with live event stream viewer
- Workflow compilation and validation
- Zustand state management for workflows
- TypeScript strict mode with comprehensive type definitions
- Dark theme UI with Tailwind CSS v4

#### Framework & AI Integration
- **Sentient Agent Framework v0.3.0 compliance** (100% verified)
- **GPT-5 integration** with reasoning effort support (low/medium/high)
- **Thinking transparency**: Collapsible agent reasoning process display
- **Multi-agent workflows**: Automatic variable passing between agents
- **Framework-compliant SSE events**: Monotonic ULID Event IDs with DefaultIdGenerator
- **Event streaming patterns**: TEXT_BLOCK, TEXT_CHUNK, ERROR, DONE events
- **Node-based transparency**: Each node shows role-specific execution details
  - Start: Input variables
  - Agent: Variables, decision-making, prompt construction, changes
  - End: Final variables and execution status

#### Testing & Quality
- Comprehensive test suite: 14 Framework compliance tests (all passing)
- Test coverage: SSEHook, NodeAwareResponseHandler, event streams, Session/Query initialization
- Inline documentation for Framework integration points
- Verified event ID monotonicity and ordering

#### Frontend Architecture
- Next.js 16 with App Router
- React 19 with client-side interactivity
- ReactFlow 12.9 for visual canvas
- Zustand 5.0 for state management
- React Hook Form + Zod for form validation
- Lucide React for icons
- Tailwind CSS v4 for styling

#### Backend Architecture
- FastAPI 0.115 with async/await
- Sentient Agent Framework 0.3 for agent execution
- OpenAI API 1.59 for LLM calls (GPT-5 support)
- CEL (cel-python 0.4.0) for expression evaluation
- Pydantic 2.10 for data validation
- Uvicorn 0.34 for ASGI server
- Server-Sent Events (SSE) for Framework-compliant streaming
- SSEHook with DefaultIdGenerator for monotonic Event IDs
- NodeAwareResponseHandler for node-specific event routing

#### Developer Experience
- CLAUDE.md for AI-assisted development
- TypeScript path aliases (@/*)
- Hot reload for both frontend and backend
- Comprehensive type safety
- Clear project structure and separation of concerns

[Unreleased]: https://github.com/hoddukzoa12/sentientFlow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/hoddukzoa12/sentientFlow/releases/tag/v0.1.0
