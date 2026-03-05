@echo off
setlocal
echo Creating a backup of the HR System...

:: Get timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "timestamp=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%"
set "backup_file=HR_System_Backup_%timestamp%.zip"

:: Use PowerShell to zip, excluding node_modules
powershell -Command "Compress-Archive -Path 'backend', 'frontend', '*.md', '*.bat', '*.json' -DestinationPath '%backup_file%' -CompressionLevel Optimal"

echo.
echo Backup created: %backup_file%
echo.
echo instructions:
echo 1. Move this ZIP file to your Google Drive / Pen Drive.
echo 2. On the new computer, extract it.
echo 3. Open the folder and run 'install_dependencies.bat' (if you haven't already).
echo 4. Run 'start_servers.bat'.
echo.
pause
