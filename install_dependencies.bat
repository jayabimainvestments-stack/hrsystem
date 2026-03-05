@echo off
echo Installing dependencies...
cd backend
call npm install
cd ../frontend
call npm install
echo.
echo Dependencies installed successfully!
pause
