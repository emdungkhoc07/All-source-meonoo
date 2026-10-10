@echo off
title Trinh Bien Tap Decks Rankmatch - Meono
cd /d "%~dp0"
echo ========================================================
echo   DANG KHOI CHAY TRINH BIEN TAP DECKS RANKMATCH
echo   URL: http://localhost:3333
echo ========================================================
start "" http://localhost:3333
node server.js
pause