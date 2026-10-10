@echo off
title Meono Server
color 0A
echo ===================================================
echo               EXPLODING KITTEN (SERVER)
echo ===================================================
echo  [Debug] game_viewdecks : Hien thi chong bai rut
echo  [Link Web Local]: http://localhost:3000
echo ===================================================
cd /d "%~dp0explodingkittens(sever)"
node server.js
pause
