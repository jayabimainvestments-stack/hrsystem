@echo off
setlocal
echo ==========================================
echo HRMS Database Export for Supabase
echo ==========================================
echo.

set PG_DUMP_PATH="g:\HR\ANTIGRAVITY\HR\HR PACEGE\pgsql\bin\pg_dump.exe"
set EXPORT_FILE="g:\HR\ANTIGRAVITY\HR\HR PACEGE\hr_db_for_supabase.sql"

echo Exporting database...
%PG_DUMP_PATH% -U postgres -h localhost -p 5432 hr_db > %EXPORT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Database exported to: hr_db_for_supabase.sql
    echo.
    echo දැන් මෙම පියවර අනුගමනය කරන්න:
    echo 1. Supabase Dashboard එකට යන්න.
    echo 2. "SQL Editor" එක තෝරන්න.
    echo 3. මෙම hr_db_for_supabase.sql ගොනුව Notepad එකකින් විවෘත කර එහි ඇති සියල්ල Copy කර Supabase SQL Editor එකට Paste කරන්න.
    echo 4. "Run" බොත්තම ඔබන්න.
) else (
    echo.
    echo [ERROR] Export failed! Please ensure the HR system is running.
)

pause
