@echo off
setlocal

:: --- Configuration ---
set "PG_DIR=%~dp0pgsql"
set "DATA_DIR=%~dp0backend\pg_data"
set "LOG_FILE=%~dp0backend\postgres_portable.log"

:: Check if pgsql folder exists
if not exist "%PG_DIR%\bin\postgres.exe" (
    echo.
    echo [ERROR] PostgreSQL binaries not found in "%PG_DIR%"!
    echo.
    echo Please download PostgreSQL Portable binaries and extract them to:
    echo %PG_DIR%
    echo.
    echo Structure should be:
    echo   %~dp0pgsql\bin\postgres.exe
    echo   %~dp0pgsql\lib\...
    echo.
    pause
    exit /b 1
)

:: Check if data directory exists, if not initialize it
if not exist "%DATA_DIR%" (
    echo [INFO] Initializing new database in "%DATA_DIR%"...
    mkdir "%DATA_DIR%"
    "%PG_DIR%\bin\initdb.exe" -D "%DATA_DIR%" -U postgres -A trust -E UTF8
)

:: Start PostgreSQL locally
echo [INFO] Starting Portable PostgreSQL...
start "PostgreSQL Portable" /MIN "%PG_DIR%\bin\postgres.exe" -D "%DATA_DIR%" -p 5433

:: Wait for DB to start
timeout /t 5 >nul

:: Start App
echo [INFO] Starting HR System...
call start_servers.bat
