@echo off
title OKIKE WhatsApp Reminders Outreach
cd /d "%~dp0"
echo ==================================================
echo ⚡ Starting OKIKE WhatsApp Bulk Reminder Script...
echo ==================================================
echo.
npm run send-reminders
echo.
echo ==================================================
echo Script execution finished. Press any key to exit.
echo ==================================================
pause
