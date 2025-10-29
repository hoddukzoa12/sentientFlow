@echo off
setlocal enabledelayedexpansion

echo ===============================================
echo   SentientFlow Installation Script
echo ===============================================
echo.

REM Check Node.js version
echo [1/5] Checking Node.js version...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18 or later.
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detected
echo.

REM Check Python version
echo [2/5] Checking Python version...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.9 or later.
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION% detected
echo.

REM Install frontend dependencies
echo [3/5] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    exit /b 1
)
echo [OK] Frontend dependencies installed
cd ..
echo.

REM Create Python virtual environment
echo [4/5] Setting up backend environment...
cd backend

if exist venv (
    echo [WARNING] Virtual environment already exists
) else (
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        exit /b 1
    )
    echo [OK] Virtual environment created
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    call venv\Scripts\deactivate.bat
    exit /b 1
)
echo [OK] Backend dependencies installed
call venv\Scripts\deactivate.bat
cd ..
echo.

REM Check .env file
echo [5/5] Checking environment configuration...
if not exist backend\.env (
    echo [WARNING] backend\.env file not found
    echo   Please create backend\.env with your OPENAI_API_KEY:
    echo   copy backend\.env.example backend\.env
    echo   # Then edit backend\.env and add your API key
) else (
    echo [OK] backend\.env file exists
)
echo.

echo ===============================================
echo   Installation complete!
echo ===============================================
echo.
echo To start the development servers:
echo   npm start  or  start.bat
echo.
pause
