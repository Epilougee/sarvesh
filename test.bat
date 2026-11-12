@echo off
title EduSchedule - Test Suite Runner
color 0E
cd /d "%~dp0"

echo ====================================================================
echo           EduSchedule - Running Integration Test Suite
echo ====================================================================
echo.

python test_app.py

echo.
echo ====================================================================
pause

