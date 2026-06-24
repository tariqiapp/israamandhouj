@echo off
title Tariqi Runner
echo Starting Tariqi...

:: Get the directory where this script is located
cd /d "%~dp0"

:: Start the backend in a new command prompt window
start "Tariqi Backend" cmd /k "cd backend && npm run dev"

:: Start the frontend in a new command prompt window (using port 51319 to match your backend CORS config)
start "Tariqi Frontend" cmd /k "npx serve -l 51319"

:: Wait a few seconds for the servers to start
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

:: Open the local link in the default browser
echo Opening Tariqi in your browser...
start http://localhost:51319

echo Both services have been started and the browser has been opened!
pause
