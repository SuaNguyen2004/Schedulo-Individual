@echo off
title Dang khoi chay He thong Quan ly CTV...
color 0A
echo ========================================================
echo   HE THONG QUAN LY CTV - DANG KHOI CHAY DOCKER...
echo ========================================================
echo.

:: 1. Kiem tra xem Docker Desktop da duoc bat chua
docker info >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] Docker Desktop chua duoc bat hoac dang khoi dong!
    echo Vui long mo ung dung Docker Desktop tren Windows va cho den khi bieu tuong con ca voi dung yen (mau xanh).
    echo Sau do nhap dub lai file Chay_PhanMem.bat nay.
    echo.
    pause
    exit
)

echo [1/3] Dang khoi chay cac dich vu bang Docker Compose...
docker compose up -d

echo.
echo [2/3] Dang cho he thong va Database khoi tao...
echo (Luu y: Lan dau chay co the mat 1-2 phut de tai va khoi tao Database)
echo.

:: Vong lap kiem tra cho den khi port 4000 phan hoi
:CHECK_PORT
powershell -Command "try { $res = Invoke-WebRequest -Uri 'http://localhost:4000' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    goto READY
)

timeout /t 3 >nul
echo ... dang cho ung dung san sang tai http://localhost:4000 ...
goto CHECK_PORT

:READY
echo.
echo ========================================================
echo   [3/3] HE THONG DA SAN SANG! DANG MO TRINH DUYET...
echo ========================================================
start http://localhost:4000
exit