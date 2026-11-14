@echo off
title CAATH Owner Testing
cd /d "V:\CAATH\CAATH"

if not exist "node_modules" (
  echo CAATH needs its local components prepared once.
  echo Please ask Codex to prepare CAATH testing.
  pause
  exit /b 1
)

echo Starting CAATH for owner testing...
echo Keep this window open while you test.
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'"
npm run dev

echo CAATH testing has stopped. You may close this window.
pause
