@echo off
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo HR System - GitHub Push Automation
echo ===================================================

:: Check for Git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in PATH.
    echo Please download and install Git from: https://git-scm.com/download/win
    echo After installing, restart this script.
    pause
    exit /b
)

:: Check for Git Identity (Fix for "Author identity unknown")
git config user.email >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [*] Setting up Git identity...
    git config --global user.email "jayabimainvestments@gmail.com"
    git config --global user.name "Jayabima Investments"
)

:: Initialize Git if not already done
if not exist ".git" (
    echo [*] Initializing new Git repository...
    git init
    git branch -M main
) else (
    echo [*] Git repository already exists.
)

:: Add files
echo [*] Adding files to Git...
git add .

:: Commit
echo [*] Committing changes...
git commit -m "Updated configuration for cloud deployment"

:: Ask for GitHub URL
echo.
echo Please create a NEW PRIVATE REPOSITORY on GitHub (https://github.com/new)
echo Once created, copy the HTTPS URL (e.g., https://github.com/username/repo.git)
set /p git_url="Paste your GitHub Repository URL here: "

if "%git_url%"=="" (
    echo [ERROR] Repository URL cannot be empty.
    pause
    exit /b
)

:: Set remote
git remote remove origin >nul 2>nul
git remote add origin %git_url%

:: Push
echo [*] Pushing to GitHub...
echo (You may be asked to log in via a popup window)
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo [SUCCESS] Your code is now on GitHub!
    echo Next steps:
    echo 1. Connect this repo to Back4App.com (for Backend)
    echo 2. Connect this repo to Vercel.com (for Frontend)
    echo ===================================================
) else (
    echo.
    echo [ERROR] Failed to push to GitHub. Please check your URL and connection.
)

pause
