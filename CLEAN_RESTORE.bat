@echo off
SET PSQL_PATH="pgsql\bin\psql.exe"
SET DROPDB_PATH="pgsql\bin\dropdb.exe"
SET CREATEDB_PATH="pgsql\bin\createdb.exe"
SET DB_NAME=hr_db
SET DB_USER=postgres
SET DB_PASS=123456
SET BACKUP_FILE="DATABASE_BACKUP\hr_db_full_backup.sql"

echo ==========================================
echo HR SYSTEM CLEAN RESTORE TOOL (FIX CONFLICTS)
echo ==========================================
echo WARNING: This will DELETE all local HR data on this PC 
echo and replace it ONLY with data from the Portable Disk.
echo.
set /p confirm="Are you sure? (Y/N): "
if /i "%confirm%" neq "Y" exit /b

if not exist %BACKUP_FILE% (
    echo [ERROR] Backup file not found: %BACKUP_FILE%
    pause
    exit /b 1
)

echo [1/4] Dropping existing database...
SET PGPASSWORD=%DB_PASS%
%DROPDB_PATH% -U %DB_USER% -h localhost -p 5433 %DB_NAME% --if-exists 2>nul

echo [2/4] Creating fresh database...
%CREATEDB_PATH% -U %DB_USER% -h localhost -p 5433 %DB_NAME%

echo [3/4] Restoring Data from Disk...
%PSQL_PATH% -U %DB_USER% -h localhost -p 5433 -d %DB_NAME% -f %BACKUP_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Restore failed!
    pause
    exit /b %ERRORLEVEL%
)

echo [4/4] Finalizing...
echo ✅ Data successfully replaced with Portable Disk data!
echo ==========================================
pause
