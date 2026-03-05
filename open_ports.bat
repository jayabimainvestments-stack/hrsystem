@echo off
echo Opening Firewall Ports for HRMS...
netsh advfirewall firewall add rule name="HRMS Port 5000" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="HRMS Port 5173" dir=in action=allow protocol=TCP localport=5173
echo Ports 5000 and 5173 opened successfully!
pause
