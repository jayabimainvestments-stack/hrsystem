@echo off
echo ==========================================
echo HR SYSTEM FORCE CLEANUP & RESTART
echo ==========================================

echo [1/3] Closing existing HR System windows...
taskkill /F /FI "WINDOWTITLE eq HRMS Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq HRMS Frontend*" /T >nul 2>&1

echo [2/3] Cleaning up stale background processes...
:: Kill node processes holding common ports if they exist
taskkill /F /IM node.exe /T >nul 2>&1

echo [3/3] Restarting System with Fixed Code...
timeout /t 2 >nul
call launch_portable.bat

echo.
echo System restarted! Please refresh your browser.
pause
