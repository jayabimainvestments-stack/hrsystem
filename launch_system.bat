@echo off
cd /d "n:\ANTIGRAVITY\HR PACKEGE\HR PACEGE"
start "HRMS Backend" cmd /k "cd backend && npm start"
start "HRMS Frontend" cmd /k "cd frontend && npm run dev -- --host"
ping 127.0.0.1 -n 6 > nul
start chrome http://localhost:5173
