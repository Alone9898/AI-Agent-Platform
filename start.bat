@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "ROOT=%~dp0"
set "LOG_FILE=%ROOT%start.log"
pushd "%ROOT%" || exit /b 1

title Xingyao Agent Platform - Start

if /I "%~1"=="--admin" (
    shift /1
    goto :after_admin_check
)

if /I "%~1"=="--no-admin" (
    shift /1
    goto :after_admin_check
)

net session >nul 2>&1
if errorlevel 1 (
    echo Requesting administrator permission...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%ComSpec%' -ArgumentList '/k', '""%~f0"" --admin %*' -WorkingDirectory '%ROOT%' -Verb RunAs"
    exit /b 0
)

:after_admin_check

echo ========================================
echo   Xingyao Agent Platform
echo   Restart client and backend
echo ========================================
echo.
echo [%DATE% %TIME%] start.bat launched > "%LOG_FILE%"

call :require_tool node "Node.js"
if errorlevel 1 goto :fail

call :require_tool npm "npm"
if errorlevel 1 goto :fail

call :require_tool cargo "Rust/Cargo"
if errorlevel 1 goto :fail

set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%" (
    set "PATH=%CARGO_BIN%;%PATH%"
    call :log "[OK] Rust path configured"
) else (
    call :log "[WARN] Rust path not found: %USERPROFILE%\.cargo\bin"
)
echo.

call :log "[0/3] Cleaning old client and ports..."
call :kill_process ai-agent-platform.exe
call :kill_port 1420
call :kill_port 3000
call :wait_port_free 1420
if errorlevel 1 goto :fail
call :wait_port_free 3000
if errorlevel 1 goto :fail
call :log "[OK] Cleanup completed"
echo.

call :log "[1/3] Building NestJS backend..."
pushd "%ROOT%nestjs"
call npm.cmd run build
if errorlevel 1 (
    popd
    goto :fail
)
if not exist "dist\main.js" (
    call :log "[FAIL] Backend entry not found: nestjs\dist\main.js"
    popd
    goto :fail
)
popd
call :log "[OK] Backend build completed"
echo.

if /I "%~1"=="--check" (
    call :log "[OK] Check mode completed"
    popd
    exit /b 0
)

call :log "[2/3] Starting Tauri desktop app..."
call :log "[INFO] Backend URL: http://localhost:3000"
call :log "[INFO] Frontend dev URL: http://localhost:1420"
echo.
call npx.cmd tauri dev -v
if errorlevel 1 (
    call :log "[FAIL] Tauri dev exited with error code %ERRORLEVEL%"
    goto :fail
)

popd
pause
exit /b 0

:log
echo %~1
echo [%DATE% %TIME%] %~1>> "%LOG_FILE%"
exit /b 0

:kill_process
tasklist /FI "IMAGENAME eq %~1" 2>nul | find /I "%~1" >nul
if not errorlevel 1 (
    call :log "[INFO] Closing old client: %~1"
    taskkill /F /T /IM "%~1" >nul 2>&1
)
exit /b 0

:kill_port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%~1.*LISTENING" 2^>nul') do (
    if not "%%a"=="0" (
        call :log "[INFO] Releasing port %~1, PID %%a"
        taskkill /F /T /PID %%a >nul 2>&1
    )
)
exit /b 0

:wait_port_free
for /l %%i in (1,1,20) do (
    netstat -ano | findstr ":%~1.*LISTENING" >nul 2>&1
    if errorlevel 1 exit /b 0
    ping 127.0.0.1 -n 2 >nul
)
call :log "[FAIL] Port %~1 is still busy"
exit /b 1

:require_tool
where %1 >nul 2>&1
if errorlevel 1 (
    call :log "[FAIL] %~2 was not found. Please install it first."
    exit /b 1
)
exit /b 0

:fail
echo.
call :log "[FAIL] Start failed. Please check the error above or start.log."
popd
pause
exit /b 1
