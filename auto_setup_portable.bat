@echo off
setlocal
cd /d "%~dp0"

echo [1/4] Downloading PostgreSQL Portable Binaries (This may take a while)...
curl -L -o postgresql.zip https://get.enterprisedb.com/postgresql/postgresql-14.10-1-windows-binaries.zip

if not exist postgresql.zip (
    echo [ERROR] Download failed! Please check your internet connection.
    pause
    exit /b 1
)

echo [2/4] Extracting files...
powershell -Command "Expand-Archive -Path postgresql.zip -DestinationPath ."

if exist pgsql (
    echo [INFO] pgsql folder found.
) else (
    echo [ERROR] Extraction failed or pgsql folder not found.
    pause
    exit /b 1
)

echo [3/4] Cleaning up...
del postgresql.zip

echo [4/4] Portable Environment Ready!
echo You can now use 'launch_portable.bat' to start the system.
pause
