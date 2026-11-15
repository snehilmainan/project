@echo off
setlocal
echo Starting UpVote server...

where node >nul 2>nul
if %errorlevel% equ 0 (
    node src\server.js
) else if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" src\server.js
) else (
    echo [ERROR] Node.js executable not found in PATH.
    echo Please install Node.js from https://nodejs.org or add it to your system PATH.
    pause
)
