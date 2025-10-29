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

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /api/workflows/{id}/execute` - Execute workflow (coming soon)

## Architecture

```
src/
├── workflows/       # Workflow compilation and execution
├── agents/          # Node executors (Agent, Transform, etc.)
├── api/             # FastAPI routes
├── tools/           # Tool integrations (MCP, FileSearch, etc.)
└── config/          # Application settings
```

## Development

```bash
# Type checking
mypy src/

# Testing
pytest

# Linting
flake8 src/
```
