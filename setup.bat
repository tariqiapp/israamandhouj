@echo off
title Tariqi Setup
echo Starting Tariqi Setup...

:: Get the directory where this script is located
cd /d "%~dp0"

:: 1. Check if Node.js is installed
echo [1/3] Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo ========================================================
    echo ERROR: Node.js is not installed!
    echo Node.js is required to run the backend and frontend.
    echo Please download and install it from https://nodejs.org/
    echo ========================================================
    pause
    exit /b 1
)
echo Node.js is installed!

:: 2. Create the .env file in backend if it doesn't exist
echo.
echo [2/3] Checking environment variables...
if not exist "backend\.env" (
    echo Creating backend\.env with default configuration...
    echo PORT=3000> backend\.env
    echo JWT_SECRET=change_this_to_a_long_random_string_before_production>> backend\.env
    echo DB_PATH=./tariqi.db>> backend\.env
    echo Created backend\.env successfully.
) else (
    echo backend\.env already exists.
)

:: 3. Install backend dependencies
echo.
echo [3/3] Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo =========================================
echo Setup is complete! 
echo All dependencies have been installed.
echo You can now double-click "start.bat" to launch Tariqi.
echo =========================================
pause
