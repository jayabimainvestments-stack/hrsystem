@echo off
SETLOCAL EnableDelayedExpansion

set GIT="C:\Program Files\Git\cmd\git.exe"

echo ===================================================
echo HR System - GitHub Push Automation
echo ===================================================

:: Check Git Identity
%GIT% config --global user.email >nul 2>nul
%GIT% config --global user.email "jayabimainvestments@gmail.com"
%GIT% config --global user.name "Jayabima Investments"
%GIT% config --global credential.helper manager-core

:: Initialize Git if not already done
if not exist ".git" (
    echo [*] Initializing new Git repository...
    %GIT% init
    %GIT% branch -M main
    %GIT% remote add origin https://github.com/jayabimainvestments-stack/hrsystem.git
) else (
    echo [*] Git repository already exists.
    :: Ensure remote is set correctly
    %GIT% remote set-url origin https://github.com/jayabimainvestments-stack/hrsystem.git
)

:: Add files
echo [*] Adding files to Git...
%GIT% add .

:: Commit (allow empty commits)
echo [*] Committing changes...
%GIT% commit -m "Updated configuration for cloud deployment" --allow-empty

:: Push
echo [*] Pushing to GitHub...
echo (ඔබේ GitHub password ඇතුල් කිරීමට popup window එකක් ලැබෙනු ඇත)
%GIT% push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo [SUCCESS] Code GitHub හි ඇත!
    echo ===================================================
    echo.
    echo ඊළඟ steps:
    echo 1. Back4App.com - Backend deploy කිරීම
    echo 2. Vercel.com   - Frontend deploy කිරීම
    echo.
    echo DEPLOY_GUIDE.md ගොනුව කියවන්න.
) else (
    echo.
    echo [ERROR] Push fail. UPDATE_GIT_PASSWORD.bat ධාවනය කර නැවත උත්සාහ කරන්න.
)

pause
