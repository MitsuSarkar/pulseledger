@echo off
echo Installing dependencies...
call npm install
if errorlevel 1 goto :fail

echo Clearing electron-builder cache...
call npm run clear:builder-cache

echo Building PulseLedger portable EXE...
call npm run dist:win
if errorlevel 1 goto :fail

echo.
echo Build complete. Check the release folder.
pause
exit /b 0

:fail
echo.
echo Build failed.
echo If you see a symbolic link privilege error, turn on Windows Developer Mode and run this again.
pause
exit /b 1