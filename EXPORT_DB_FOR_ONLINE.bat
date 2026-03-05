@echo off
setlocal
echo ==========================================
echo HRMS Database Export for Cloud Migration
echo ==========================================
echo.

set DB_NAME=hr_db
set DB_USER=postgres
set EXPORT_FILE=hr_db_cloud_export.sql

echo Setting up export path...
set EXPORT_PATH=%~dp0%EXPORT_FILE%

echo Exporting database...
"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U %DB_USER% %DB_NAME% > "%EXPORT_PATH%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Database exported to: %EXPORT_FILE%
    echo.
    echo ඔබගේ Online Database (Supabase/Neon) එකට මෙය Import කිරීමට පහත පියවර අනුගමනය කරන්න:
    echo 1. Cloud Database console එකේ "SQL Editor" එකට යන්න.
    echo 2. මෙම %EXPORT_FILE% ගොනුවේ ඇති දත්ත Copy කර එතැන Paste කර Run කරන්න.
) else (
    echo.
    echo [ERROR] Export failed! Please check if PostgreSQL 15 is installed and the DB name is correct.
)

pause
