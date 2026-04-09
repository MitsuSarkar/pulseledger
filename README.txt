PulseLedger Offline EXE Build (Fixed v2)

What changed:
- Electron now loads the app from the internal local server at http://127.0.0.1:4000
- The server serves BOTH the API and the built frontend
- This avoids blank-screen issues from file:// loading in packaged Electron

How to build on Windows:
1) Extract this ZIP
2) Double-click build-windows.bat
3) Wait for build to finish
4) Open the release folder and run the EXE

If you still see a symbolic-link privilege error during electron-builder:
- Turn on Windows Developer Mode
- Run build-windows.bat again