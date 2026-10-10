@echo off
title Meono x Discord Webhook Bridge
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
set /p choice="Nhap lua chon cua ban [1 hoac 2, mac dinh la 1]: "

if "%choice%"=="2" goto LOCAL_RUNNER
goto RENDER_STANDALONE

:RENDER_STANDALONE
echo.
echo [Khoi dong] Dang ket noi toi Server Meo No tren Render.com...
if exist "%~dp0meono_discord_bridge\Discord_Meono(thongbao_WenhookAPI)" (
    cd /d "%~dp0meono_discord_bridge\Discord_Meono(thongbao_WenhookAPI)"
) else (
    cd /d "%~dp0meono_discord_bridge"
)
npm start
goto END

:LOCAL_RUNNER
echo.
echo [Khoi dong] Dang bat Game Server Local kem Discord Hook...
if exist "%~dp0meono_discord_bridge\Discord_Meono(thongbao_WenhookAPI)" (
    cd /d "%~dp0meono_discord_bridge\Discord_Meono(thongbao_WenhookAPI)"
) else (
    cd /d "%~dp0meono_discord_bridge"
)
npm run runner
goto END

:END
pause
