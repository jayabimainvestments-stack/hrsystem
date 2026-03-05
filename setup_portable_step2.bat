@echo off
cd /d "%~dp0"

echo.
echo ===================================================
echo   Portable PostgreSQL Setup (Step 2)
echo ===================================================
echo.

if not exist "postgresql*.zip" (
    echo [ERROR] PostgreSQL ZIP file not found!
    echo.
    echo Please follow these steps:
    echo 1. Go to: https://www.enterprisedb.com/download-postgresql-binaries
    echo 2. Click "Download" for version 14.x or 15.x -- Windows x86-64.
    echo 3. Save the ZIP file to this folder:
    echo    %~dp0
    echo.
    echo 4. Run this script again.
    echo.
    pause
    exit /b 1
)

echo [INFO] Extracting PostgreSQL...
powershell -Command "Get-ChildItem postgresql*.zip | Expand-Archive -DestinationPath . -Force"

if exist pgsql (
    echo [SUCCESS] PostgreSQL extracted successfully.
    echo.
    echo Now you can run 'launch_portable.bat' to start the system.
) else (
    echo [ERROR] Extraction failed. Please try extracting manually.
)

pause
