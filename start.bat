@echo off
title MANS SENDER v2.0
color 0A
echo.
echo  ========================================
echo    MANS SENDER v2.0 - Starting...
echo  ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [*] First run - Installing dependencies...
    npm install --production
    echo.
)

echo [*] Starting server...
echo [*] Open browser: http://localhost:3001
echo.
echo  To stop: Press Ctrl+C
echo  ========================================
echo.

start "" http://localhost:3001
node server.js
pause
