@echo off
setlocal enabledelayedexpansion

echo ===============================================
echo   SentientFlow Development Servers
echo ===============================================
echo.

REM Check if dependencies are installed
if not exist frontend\node_modules (
    echo [WARNING] Frontend dependencies not found. Running npm install...
    cd frontend
    call npm install
    cd ..
    echo.
)

if not exist backend\venv (
    echo [ERROR] Backend virtual environment not found. Please run install.bat first.
    pause
    exit /b 1
)

REM Check .env file
if not exist backend\.env (
    echo [ERROR] backend\.env file not found
    echo   Please create backend\.env with your OPENAI_API_KEY:
    echo   copy backend\.env.example backend\.env
    echo   # Then edit backend\.env and add your API key
    echo.
    pause
    exit /b 1
)

REM Check if OPENAI_API_KEY is set
findstr /C:"OPENAI_API_KEY=" backend\.env | findstr /V /C:"OPENAI_API_KEY=$" | findstr /V /C:"OPENAI_API_KEY=\"\"" >nul
if %errorlevel% neq 0 (
    echo [ERROR] OPENAI_API_KEY is not set in backend\.env
    echo   Please edit backend\.env and add your OpenAI API key
    echo.
    pause
    exit /b 1
)

echo [OK] Environment configuration valid
echo.
echo Starting Frontend (http://localhost:3000)...
echo Starting Backend (http://localhost:8000)...
echo.
echo Press Ctrl+C to stop both servers
echo.
echo ===============================================
echo.

REM Start both servers using npm script
npm start

pause
