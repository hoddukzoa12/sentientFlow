# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Transform node with CEL expression evaluation
- If/Else node with conditional branching
- While node with loop execution
- SetState node for variable management
- File Search tool integration
- MCP server integration
- Guardrails node for content validation
- User Approval node for human-in-the-loop workflows

## [0.1.0] - 2025-01-XX

### Added
- Initial release of SentientFlow
- Visual workflow builder with ReactFlow canvas
- Drag-and-drop node creation from palette
- Node collision detection and auto-positioning
- Core node types: Start, Agent, End, Note
- Agent node with OpenAI integration
- Real-time LLM response streaming via SSE
- Node properties panel for configuration
- Execution panel with live event stream viewer
- Workflow compilation and validation
- Backend API with FastAPI
- Sentient Agent Framework integration
- Zustand state management for workflows
- TypeScript strict mode with comprehensive type definitions
- Dark theme UI with Tailwind CSS v4
- MIT License
- Comprehensive documentation (README.md, README.ko.md, CONTRIBUTING.md)

### Frontend Architecture
- Next.js 16 with App Router
- React 19 with client-side interactivity
- ReactFlow 12.9 for visual canvas
- Zustand 5.0 for state management
- React Hook Form + Zod for form validation
- Lucide React for icons
- Tailwind CSS v4 for styling

### Backend Architecture
- FastAPI 0.115 with async/await
- Sentient Agent Framework 0.3 for agent execution
- OpenAI API 1.59 for LLM calls
- Pydantic 2.10 for data validation
- Uvicorn 0.34 for ASGI server
- Server-Sent Events (SSE) for streaming

### Developer Experience
- CLAUDE.md for AI-assisted development
- TypeScript path aliases (@/*)
- Hot reload for both frontend and backend
- Comprehensive type safety
- Clear project structure and separation of concerns

[Unreleased]: https://github.com/hoddukzoa12/sentientFlow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/hoddukzoa12/sentientFlow/releases/tag/v0.1.0
