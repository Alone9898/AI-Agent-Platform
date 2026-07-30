@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "ROOT=%~dp0"
pushd "%ROOT%" || exit /b 1

title AI Agent Platform - Build

echo ========================================
echo   AI Agent Platform
echo   Building release package
echo ========================================
echo.

call :require_tool node "Node.js"
if errorlevel 1 goto :fail

call :require_tool npm "npm"
if errorlevel 1 goto :fail

call :require_tool cargo "Rust/Cargo"
if errorlevel 1 goto :fail

set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%" (
    set "PATH=%CARGO_BIN%;%PATH%"
    echo [OK] Rust toolchain path configured
) else (
    echo [WARN] Rust toolchain path was not found in "%USERPROFILE%\.cargo\bin"
)
echo.

if not exist "node_modules" (
    echo [0/4] Installing root dependencies...
    call npm.cmd install
    if errorlevel 1 goto :fail
) else (
    echo [0/4] Root dependencies already installed
)
echo.

echo [1/4] Building frontend...
pushd "%ROOT%frontend"
if not exist "node_modules" (
    call npm.cmd install
    if errorlevel 1 (
        popd
        goto :fail
    )
)
call npm.cmd run build
if errorlevel 1 (
    popd
    goto :fail
)
if not exist "dist\index.html" (
    echo [FAIL] Frontend build output not found: frontend\dist\index.html
    popd
    goto :fail
)
popd
echo [OK] Frontend build completed
echo.

echo [2/4] Building NestJS backend...
pushd "%ROOT%nestjs"
if not exist "node_modules" (
    call npm.cmd install
    if errorlevel 1 (
        popd
        goto :fail
    )
)
call npm.cmd run build
if errorlevel 1 (
    popd
    goto :fail
)
if not exist "dist\main.js" (
    echo [FAIL] Backend build output not found: nestjs\dist\main.js
    popd
    goto :fail
)
popd
echo [OK] Backend build completed
echo.

echo [3/4] Building Tauri app (NSIS only)...
call npx.cmd tauri build --bundles nsis
if errorlevel 1 goto :fail

echo.
echo ========================================
echo [DONE] Build completed
echo Output:
echo   Frontend: frontend\dist
echo   Backend:  nestjs\dist
echo   Tauri:    src-tauri\target\release\bundle\nsis
echo   Binary:   src-tauri\target\release\ai-agent-platform.exe
echo ========================================

popd
pause
exit /b 0

:require_tool
where %1 >nul 2>&1
if errorlevel 1 (
    echo [FAIL] %2 was not found.
    exit /b 1
)
exit /b 0

:fail
echo.
echo [FAIL] Build failed.
popd
pause
exit /b 1
