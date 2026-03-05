@echo off
SET PSQL_PATH="pgsql\bin\psql.exe"
SET CREATEDB_PATH="pgsql\bin\createdb.exe"
SET DB_NAME=hr_db
SET DB_USER=postgres
SET DB_PASS=123456
SET BACKUP_FILE="DATABASE_BACKUP\hr_db_full_backup.sql"

echo ==========================================
echo HR SYSTEM PORTABLE RESTORE TOOL
echo ==========================================

if not exist %BACKUP_FILE% (
    echo [ERROR] Backup file not found: %BACKUP_FILE%
    pause
    exit /b 1
)

echo [1/3] Checking Database (%DB_NAME%)...
SET PGPASSWORD=%DB_PASS%

REM Try to create the database
%CREATEDB_PATH% -U %DB_USER% -h localhost -p 5433 %DB_NAME% 2>nul

echo [2/3] Restoring Data...
%PSQL_PATH% -U %DB_USER% -h localhost -p 5433 -d %DB_NAME% -f %BACKUP_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Restore failed! Please ensure PostgreSQL service is running on this PC.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Finalizing...
echo ✅ System restored successfully!
echo You can now run the system using the 'launch_system.bat' file.
echo ==========================================
pause
