#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SentientFlow Development Servers${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Check if dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}! Frontend dependencies not found. Running npm install...${NC}"
    cd frontend && npm install && cd ..
    echo ""
fi

if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}! Backend virtual environment not found. Please run ./install.sh first.${NC}"
    exit 1
fi

# Check .env file
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}✗ backend/.env file not found${NC}"
    echo -e "${YELLOW}  Please create backend/.env with your OPENAI_API_KEY:${NC}"
    echo -e "${YELLOW}  cp backend/.env.example backend/.env${NC}"
    echo -e "${YELLOW}  # Then edit backend/.env and add your API key${NC}"
    echo ""
    exit 1
fi

# Check if OPENAI_API_KEY is set in .env
if ! grep -q "OPENAI_API_KEY=" backend/.env || grep -q "OPENAI_API_KEY=$" backend/.env || grep -q "OPENAI_API_KEY=\"\"" backend/.env; then
    echo -e "${RED}✗ OPENAI_API_KEY is not set in backend/.env${NC}"
    echo -e "${YELLOW}  Please edit backend/.env and add your OpenAI API key${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Environment configuration valid${NC}"
echo ""
echo -e "${CYAN}Starting Frontend (http://localhost:3000)...${NC}"
echo -e "${MAGENTA}Starting Backend (http://localhost:8000)...${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Start backend in background
cd backend
source venv/bin/activate
python main.py 2>&1 | while IFS= read -r line; do echo -e "${MAGENTA}[Backend]${NC} $line"; done &
BACKEND_PID=$!
cd ..

# Start frontend in background
cd frontend
npm run dev 2>&1 | while IFS= read -r line; do echo -e "${CYAN}[Frontend]${NC} $line"; done &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
