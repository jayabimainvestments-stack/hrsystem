@echo off
echo ===================================================
echo GitHub Password Update Tool
echo ===================================================
echo.
echo ඔබේ GitHub password වෙනස් කළ නිසා Windows Credential Manager
echo update කළ යුතුය. මෙය ස්වයංක්‍රීයව reset කරනු ලැබේ.
echo.

:: Remove old GitHub credentials from Windows Credential Manager
echo [1] පැරණි GitHub credentials remove කරමින්...
cmdkey /delete:git:https://github.com
cmdkey /delete:https://github.com

echo [2] Git credential helper reset කරමින්...
"C:\Program Files\Git\cmd\git.exe" config --global credential.helper manager-core

echo.
echo [OK] Credentials cleared! 
echo.
echo ================================================
echo ඊළඟ step: GitHub වෙත code push කිරීම
echo ================================================
echo.

:: Test push to trigger fresh login
echo [3] GitHub සම්බන්ධතාව test කරමින්...
cd /d "g:\HR\ANTIGRAVITY\HR\HR PACEGE"
"C:\Program Files\Git\cmd\git.exe" fetch origin

echo.
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] GitHub සම්බන්ධතාව සාර්ථකයි!
    echo දැන් PUSH_TO_GITHUB.bat ධාවනය කළ හැක.
) else (
    echo Login popup window ඔස්සේ GitHub ගිණුමට ලොග් වන්න:
    echo   Username: jayabimainvestments-stack
    echo   Password: ඔබේ නව GitHub password
)

echo.
pause
