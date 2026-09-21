@echo off
title Dang khoi chay He thong Quan ly CTV...
color 0A
echo ========================================================
echo   HE THONG QUAN LY CTV - DANG KHOI CHAY DOCKER...
echo ========================================================
echo.

REM 1. Kiem tra xem Docker Desktop da duoc bat chua
docker info >nul 2>&1
if errorlevel 1 goto DOCKER_ERROR

echo [1/3] Dang khoi chay cac dich vu bang Docker Compose...
docker compose up -d
if errorlevel 1 goto COMPOSE_ERROR

echo.
echo [2/3] Dang cho he thong va Database khoi tao...
echo (Luu y: Lan dau chay co the mat 1-2 phut de khoi tao)
echo.

set RETRY_COUNT=0

:CHECK_PORT
set /a RETRY_COUNT+=1
if %RETRY_COUNT% gtr 30 goto TIMEOUT_ERROR

powershell -Command "try { $res = Invoke-WebRequest -Uri 'http://localhost:8000' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto READY

timeout /t 3 >nul
echo ... [%RETRY_COUNT%/30] dang cho ung dung san sang tai http://localhost:8000 ...
goto CHECK_PORT

:READY
echo.
echo ========================================================
echo   [3/3] HE THONG DA SAN SANG! DANG MO TRINH DUYET...
echo ========================================================
start http://localhost:8000
exit

:COMPOSE_ERROR
color 0C
echo.
echo ========================================================
echo   [LOI] KHONG THE KHOI CHAY CONTAINER DOCKER!
echo ========================================================
echo Nguyen nhan pho bien:
echo - Cong 4000 hoac 8000 dang bi tien trinh khac chiem dung!
echo - Neu ban dang chay 'npm run dev' trong VS Code, hay nhan Ctrl+C de tat di.
echo - Kiem tra lai ung dung Docker Desktop xem co container nao bi loi khong.
echo.
pause
exit

:TIMEOUT_ERROR
color 0C
echo.
echo ========================================================
echo   [CANH BAO] QUA THOI GIAN CHO - HE THONG CHUA SAN SANG!
echo ========================================================
echo Ung dung van chua phan hoi tai http://localhost:8000 sau 90 giay.
echo Vui long mo Docker Desktop de kiem tra log cua 'schedulo-frontend' va 'schedulo-backend'.
echo.
pause
exit

:DOCKER_ERROR
color 0C
echo.
echo ========================================================
echo   [LOI] DOCKER DESKTOP CHUA DUOC BAT!
echo ========================================================
echo Vui long mo ung dung Docker Desktop va cho den khi bieu tuong con ca voi dung yen (mau xanh).
echo Sau do nhap dub lai file Chay_PhanMem.bat nay.
echo.
pause
exit