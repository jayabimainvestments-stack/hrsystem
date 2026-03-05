@echo off
echo Starting HR Management System...

:: Start Backend with nodemon for auto-restarts
start "HRMS Backend" cmd /k "cd backend && npm run dev"

:: Start Frontend
start "HRMS Frontend" cmd /k "cd frontend && npm run dev -- --host"

echo Servers started in separate windows.
echo Frontend: http://localhost:5173
echo Backend: http://localhost:5000
pause
