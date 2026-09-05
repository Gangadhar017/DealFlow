@echo off
title DealFlow360
cd /d "%~dp0"
echo ================================================
echo   DealFlow360 - starting...
echo   Browser: http://localhost:4300
echo ================================================
if not exist node_modules call npm install
start "" http://localhost:4300
node server.js
pause
