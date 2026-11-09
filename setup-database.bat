@echo off
title Expense Tracker - Database Setup
echo ========================================================
echo   Setting up 'expense_tracker' MySQL Database
echo ========================================================
echo.
echo Checking connection to MySQL on localhost:3306...
"C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS expense_tracker;" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Could not connect to MySQL!
    echo Please make sure you have clicked [Start] next to MySQL in the XAMPP Control Panel.
    echo.
    pause
    exit /b 1
)

echo Importing database schema and sample data...
"C:\xampp\mysql\bin\mysql.exe" -u root expense_tracker < database.sql
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Database 'expense_tracker' has been created and configured!
) else (
    echo.
    echo [ERROR] Failed to import database.sql.
)
echo.
pause

