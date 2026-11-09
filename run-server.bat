@echo off
title Personal Expense Tracker Server
echo ========================================================
echo   Starting Personal Expense Tracker Local Server
echo ========================================================
echo.
echo NOTE: Make sure MySQL is running in your XAMPP Control Panel!
echo.
echo Server starting at: http://localhost:8000
echo Press Ctrl+C to stop the server anytime.
echo.
"C:\xampp\php\php.exe" -S localhost:8000
pause

