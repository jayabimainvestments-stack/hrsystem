@echo off
echo ==========================================
echo HR SYSTEM EMERGENCY STATUS CHECK
echo ==========================================
echo.
node emergency_check.js
echo.
echo ------------------------------------------
echo If you see 0 records for 'users' or 'employees', 
echo then we need to RESTORE from backup.
echo.
echo If you see records there, the data is SAFE, 
echo and maybe only Performance history was cleared.
echo ------------------------------------------
pause
