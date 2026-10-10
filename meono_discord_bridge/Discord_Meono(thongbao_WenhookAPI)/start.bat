@echo off
title Meono Discord Bridge
color 0B

echo ===============================================================
echo             MEONO x DISCORD WEBHOOK INTEGRATION
echo ===============================================================
echo.
echo  Chon che do khoi chay:
echo.
echo  [1] Ket noi toi Game Server tren Render.com (Online - Mac dinh)
echo      - Ket noi truc tiep toi https://explodingkitten-sever.onrender.com
echo      - Tu dong danh thuc va duy tri Server Render 24/7 khong bi ngu dong
echo      - Thong bao: Mo phong, Vao phong, Ket thuc van dau
echo.
echo  [2] Chay Local Game Server + Discord Hook (Offline Dev)
echo      - Tu dong bat Game Server Local (Port 3000) kem Discord Hook
echo.
echo ===============================================================
set /p choice="Nhap lua chon [1 hoac 2, mac dinh 1]: "

if "%choice%"=="2" goto LOCAL_RUNNER
goto RENDER_STANDALONE

:RENDER_STANDALONE
echo.
echo [Khoi dong] Dang ket noi toi Server Meo No tren Render.com...
npm start
goto END

:LOCAL_RUNNER
echo.
echo [Khoi dong] Dang bat Game Server Local kem Discord Hook...
npm run runner
goto END

:END
pause
