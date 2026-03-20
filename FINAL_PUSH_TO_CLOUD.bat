@echo off
echo ===================================================
echo HR System - Full Cloud Deployment (Hugging Face)
echo ===================================================

echo [*] Deploying Backend to Hugging Face...
cd backend
git add .
git commit -m "Backend Update"
git push hf main --force
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend push failed!
)
cd ..

echo [*] Deploying Frontend to Hugging Face...
cd frontend
git add .
git commit -m "Frontend Update"
git push hf main --force
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend push failed!
)
cd ..

echo ===================================================
echo [SUCCESS] Cloud Deployment Complete!
echo කරුණාකර විනාඩි 2-3ක් රැඳී සිට පිටුව Hard Refresh (Ctrl+F5) කරන්න.
echo ===================================================
pause
