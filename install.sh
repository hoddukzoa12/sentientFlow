#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SentientFlow Installation Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Check Node.js version
echo -e "${BLUE}[1/5]${NC} Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js 18 or later.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version $NODE_VERSION detected. Please install Node.js 18 or later.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"
echo ""

# Check Python version
echo -e "${BLUE}[2/5]${NC} Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is not installed. Please install Python 3.9 or later.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 9 ]; }; then
    echo -e "${RED}✗ Python $PYTHON_VERSION detected. Please install Python 3.9 or later.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $PYTHON_VERSION detected${NC}"
echo ""

# Install frontend dependencies
echo -e "${BLUE}[3/5]${NC} Installing frontend dependencies..."
cd frontend
if npm install; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
    exit 1
fi
cd ..
echo ""

# Create Python virtual environment
echo -e "${BLUE}[4/5]${NC} Setting up backend environment..."
cd backend

if [ -d "venv" ]; then
    echo -e "${YELLOW}! Virtual environment already exists${NC}"
else
    if python3 -m venv venv; then
        echo -e "${GREEN}✓ Virtual environment created${NC}"
    else
        echo -e "${RED}✗ Failed to create virtual environment${NC}"
        exit 1
    fi
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
if pip install -r requirements.txt; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install backend dependencies${NC}"
    deactivate
    exit 1
fi
deactivate
cd ..
echo ""

# Check .env file
echo -e "${BLUE}[5/5]${NC} Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}! Warning: backend/.env file not found${NC}"
    echo -e "${YELLOW}  Please create backend/.env with your OPENAI_API_KEY:${NC}"
    echo -e "${YELLOW}  cp backend/.env.example backend/.env${NC}"
    echo -e "${YELLOW}  # Then edit backend/.env and add your API key${NC}"
else
    echo -e "${GREEN}✓ backend/.env file exists${NC}"
fi
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "To start the development servers:"
echo -e "  ${BLUE}npm start${NC}  or  ${BLUE}./start.sh${NC}"
echo ""
