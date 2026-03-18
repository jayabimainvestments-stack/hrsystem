@echo off
title Biometric Auto-Sync Bridge
echo ===================================================
echo HR System - Biometric Auto-Sync Bridge
echo ===================================================
echo [*] Starting sync background process...
echo [*] Device: 192.168.1.11
echo [*] Server: Online Cloud Portal
echo.
echo [!] Keep this window open for automatic syncing every 10 minutes.
echo [!] To run this automatically when PC starts:
echo     1. Press Win+R, type 'shell:startup' and press Enter.
echo     2. Create a shortcut of THIS file in that folder.
echo.
echo [*] Starting local bridge server (port 7700)...
start /min cmd /c "cd /d "%~dp0backend" && node local_bridge.js"
timeout /t 3 >nul

echo [*] Starting sync process...
node "%~dp0backend\local_sync.js"
pause
