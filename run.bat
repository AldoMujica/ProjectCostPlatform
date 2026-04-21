@echo off
setlocal

cd /d "%~dp0backend"

echo Syncing dependencies...
call npm install
if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
)

if not exist ".env" (
    echo WARNING: backend\.env not found. Server may fail to connect to DB.
)

echo.
echo Starting Alenstec backend on http://localhost:3000
echo Press Ctrl+C to stop.
echo.

call npm run dev

endlocal
