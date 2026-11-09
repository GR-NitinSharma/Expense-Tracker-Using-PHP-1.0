@echo off
title Expense Tracker Development Server

:: -------------------------------------------------------------
:: Kill any process that is already listening on port 8000
:: -------------------------------------------------------------
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process on port 8000 (PID=%%a) ...
    taskkill /PID %%a /F >nul 2>&1
)

:: -------------------------------------------------------------
:: Start the PHP built‑in server
:: -------------------------------------------------------------
set "PROJECT_ROOT=%~dp0"
set "PHP_EXE=C:\xampp\php\php.exe"

if not exist "%PHP_EXE%" (
    echo ERROR: PHP executable not found at %PHP_EXE%
    pause
    exit /b 1
)

echo Starting PHP development server on http://localhost:8000
"%PHP_EXE%" -S localhost:8000 -t "%PROJECT_ROOT%"

pause
