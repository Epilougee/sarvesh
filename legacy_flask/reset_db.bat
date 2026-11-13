@echo off
title EduSchedule - Reset Database
color 0A
cd /d "%~dp0"

echo ====================================================================
echo           EduSchedule - Reset Database and Seed Demo Data
echo ====================================================================
echo.

python seed.py

echo.
echo [OK] Database reset to clean demo state!
echo ====================================================================
pause

