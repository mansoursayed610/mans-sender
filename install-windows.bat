@echo off
title MANS SENDER - Installing...
color 0A
echo.
echo  ========================================
echo    MANS SENDER v2.0 - Installing
echo  ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed!
    echo Please download from: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.
echo [*] Installing dependencies...
npm install --production
echo.
echo [OK] Installation complete!
echo.
echo  ========================================
echo    Run start.bat to launch MANS SENDER
echo  ========================================
echo.
pause
