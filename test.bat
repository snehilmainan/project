@echo off
setlocal
echo Running UpVote automated test suite...

where node >nul 2>nul
if %errorlevel% equ 0 (
    node tests\api.test.js
) else if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" tests\api.test.js
) else (
    echo [ERROR] Node.js executable not found in PATH.
    pause
)
