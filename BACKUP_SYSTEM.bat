@echo off
SET PG_DUMP_PATH="pgsql\bin\pg_dump.exe"
SET DB_NAME=hr_db
SET DB_USER=postgres
SET DB_PASS=123456
SET BACKUP_FILE="DATABASE_BACKUP\hr_db_full_backup.sql"

echo ==========================================
echo HR SYSTEM PORTABLE BACKUP TOOL
echo ==========================================

if not exist "DATABASE_BACKUP" mkdir "DATABASE_BACKUP"

echo [1/2] Backing up Database (%DB_NAME%)...
SET PGPASSWORD=%DB_PASS%
%PG_DUMP_PATH% -U %DB_USER% -h localhost -p 5433 -F p -v -f %BACKUP_FILE% %DB_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database backup failed! Please check if PostgreSQL is running.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/2] Verifying Backup File...
if exist %BACKUP_FILE% (
    echo ✅ Database backup successful: %BACKUP_FILE%
) else (
    echo ❌ Backup file was not created.
)

echo.
echo ==========================================
echo SUCCESS: System is ready for portable use!
echo You can now unplug this drive and move to another PC.
echo ==========================================
pause
