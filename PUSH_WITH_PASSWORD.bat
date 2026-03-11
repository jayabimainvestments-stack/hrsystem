@echo off
echo ===================================================
echo HR System - GitHub Push (Password Update)
echo ===================================================
echo.
echo ඔබේ GitHub username සහ නව password ඇතුල් කරන්න:
echo.
set /p gh_user="GitHub Username: "
set /p gh_pass="GitHub New Password: "

echo.
echo [*] Credentials update කරමින්...
"C:\Program Files\Git\cmd\git.exe" config --global credential.helper manager-core
"C:\Program Files\Git\cmd\git.exe" remote set-url origin https://%gh_user%:%gh_pass%@github.com/jayabimainvestments-stack/hrsystem.git

echo [*] GitHub වෙත push කරමින්...
"C:\Program Files\Git\cmd\git.exe" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo [SUCCESS] Code GitHub හි ඇත! 
    echo ===================================================
    echo.
    echo දැන් Render.com deploy steps follow කරන්න:
    echo DEPLOY_GUIDE.md ගොනුව විවෘත කරන්න.
) else (
    echo.
    echo [ERROR] Push fail. Username/Password නිවැරදිදැයි check කරන්න.
)

:: Security: Remove password from URL after push
"C:\Program Files\Git\cmd\git.exe" remote set-url origin https://github.com/jayabimainvestments-stack/hrsystem.git

echo.
pause
