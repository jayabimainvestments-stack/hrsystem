@echo off
title HRMS Data Backup Utility
echo Starting HRMS Data Backup...
cd /d "%~dp0"
node backend/scripts/backup_db.js
pause
