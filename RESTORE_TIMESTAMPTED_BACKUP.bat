@echo off
SET PSQL_PATH="pgsql\bin\psql.exe"
SET DROPDB_PATH="pgsql\bin\dropdb.exe"
SET CREATEDB_PATH="pgsql\bin\createdb.exe"
SET DB_NAME=hr_db
SET DB_USER=postgres
SET DB_PASS=123456
SET BACKUP_DIR=%~dp0..\..\..\HR_BACKUPS

echo ==========================================
echo HR SYSTEM TIMESTAMPED RESTORE TOOL
echo ==========================================
echo.
echo Available backups in %BACKUP_DIR%:
echo ------------------------------------------
dir /b %BACKUP_DIR%\hr_db_backup_*.sql
echo ------------------------------------------
echo.

set /p TIMESTAMP="Enter the full backup filename (e.g., hr_db_backup_2026-02-24T04-04-32.sql): "

:: Check if file exists as entered, if not, try appending .sql
if exist "%BACKUP_DIR%\%TIMESTAMP%" (
    SET BACKUP_FILE="%BACKUP_DIR%\%TIMESTAMP%"
) else if exist "%BACKUP_DIR%\%TIMESTAMP%.sql" (
    SET BACKUP_FILE="%BACKUP_DIR%\%TIMESTAMP%.sql"
) else (
    echo [ERROR] Backup file not found: "%BACKUP_DIR%\%TIMESTAMP%"
    echo Please make sure the filename is correct.
    pause
    exit /b 1
)

echo.
echo WARNING: This will DELETE all local HR data on this PC 
echo and replace it ONLY with data from the selected backup.
echo.
set /p confirm="Are you sure? (Y/N): "
if /i "%confirm%" neq "Y" exit /b

echo [1/4] Dropping existing database...
SET PGPASSWORD=%DB_PASS%
%DROPDB_PATH% -U %DB_USER% -h localhost -p 5433 %DB_NAME% --if-exists 2>nul

echo [2/4] Creating fresh database...
%CREATEDB_PATH% -U %DB_USER% -h localhost -p 5433 %DB_NAME%

echo [3/4] Restoring Data from %TIMESTAMP%...
%PSQL_PATH% -U %DB_USER% -h localhost -p 5433 -d %DB_NAME% -f %BACKUP_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Restore failed!
    pause
    exit /b %ERRORLEVEL%
)

echo [4/4] Finalizing...
echo ✅ Data successfully restored from %TIMESTAMP%!
echo ==========================================
pause
