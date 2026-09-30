@echo off
setlocal enabledelayedexpansion
title TraceMesh OSINT Command Center

:: Ensure current working directory is the script folder
cd /d "%~dp0"

cls
color 0B
echo ================================================================
echo   ████████╗██████╗  █████╗  ██████╗███████╗███╗   ███╗███████╗
echo   ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝████╗ ████║██╔════╝
echo      ██║   ██████╔╝███████║██║     █████╗  ██╔████╔██║█████╗  
echo      ██║   ██╔══██╗██╔══██║██║     ██╔══╝  ██║╚██╔╝██║██╔══╝  
echo      ██║   ██║  ██║██║  ██║╚██████╗███████╗██║ ╚═╝ ██║███████╗
echo      ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝     ╚═╝╚══════╝
echo                     TACTICAL OSINT COMMAND HUD
echo ================================================================
echo.

:: Verify Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js is not found in your PATH!
    echo Please install Node.js v20+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Verify pnpm is installed
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0E
    echo [WARN] pnpm is not found. Attempting to run via npx pnpm...
    set PNPM_CMD=npx pnpm
) else (
    set PNPM_CMD=pnpm
)

echo [*] Initializing TraceMesh Dual-Engine Runtime...
echo.
echo ================================================================
echo   LOCAL HOST ACCESS ENDPOINTS:
echo   --------------------------------------------------------------
echo   [*] Frontend Web HUD:    http://localhost:3000
echo   [*] Backend REST API:    http://localhost:3001
echo   [*] API Health Status:   http://localhost:3001/health
echo   [*] Active Tool Registry:http://localhost:3001/tools
echo ================================================================
echo.
echo [*] Launching browser to http://localhost:3000 in 4 seconds...
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

echo [*] Starting API (NestJS) + Frontend (Next.js) concurrently...
echo [*] Press Ctrl+C in this terminal window to stop the servers.
echo ----------------------------------------------------------------
echo.

call %PNPM_CMD% dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Server process exited with code %ERRORLEVEL%.
    pause
)
