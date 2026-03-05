@echo off
echo ==========================================
echo HR SYSTEM PERFORMANCE HISTORY CLEANUP
echo ==========================================
echo.
echo WARNING: This will DELETE all:
echo 1. Weekly Performance Data
echo 2. Monthly Performance Approvals
echo 3. Performance Appraisals
echo 4. Performance Salary Overrides (Salary Sheet data)
echo.
set /p confirm="Are you sure you want to proceed? (Y/N): "
if /i "%confirm%" neq "Y" exit /b

echo [1/2] Checking environment...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in your PATH. 
    echo Please install Node.js to run this cleanup.
    pause
    exit /b 1
)

echo [2/2] Cleaning up data...
node cleanup_performance.js

echo.
echo ✅ Performance history has been cleared!
echo ==========================================
pause
