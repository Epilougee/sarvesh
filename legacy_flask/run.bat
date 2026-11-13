@echo off
setlocal
cd /d "%~dp0"
title EduSchedule - Faculty and Timetable Management

echo ====================================================================
echo        EduSchedule - Faculty and Timetable Management System
echo ====================================================================
echo.

set PYTHON_CMD=python
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python was not found on your computer.
        echo Please install Python from https://www.python.org/
        echo Make sure to check "Add Python to PATH" during installation.
        echo.
        pause
        exit /b 1
    )
    set PYTHON_CMD=py
)

echo [*] Python detected:
%PYTHON_CMD% --version
echo.

echo [*] Checking Flask installation...
%PYTHON_CMD% -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [*] Installing Flask via pip...
    %PYTHON_CMD% -m pip install flask
)
echo [OK] Flask is ready.
echo.

if not exist timetable.db (
    echo [*] Initializing database and demo data...
    %PYTHON_CMD% seed.py
    echo [OK] Database created.
    echo.
)

echo ====================================================================
echo   Server URL: http://127.0.0.1:5000
echo ====================================================================
echo   Demo Logins:
echo     Admin:   admin                    (Password: admin123)
echo     Admin:   admin@campus.edu         (Password: admin123)
echo     Faculty: ramesh.sharma@campus.edu (Password: password123)
echo ====================================================================
echo   Keep this window open while using the application.
echo   To stop the server, press Ctrl + C.
echo ====================================================================
echo.

%PYTHON_CMD% app.py

echo.
echo Server stopped.
pause
