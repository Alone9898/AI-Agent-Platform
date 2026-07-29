@echo off
chcp 65001 >nul 2>&1
title AI Agent Platform - 启动中...

echo ========================================
echo   AI Agent Platform
echo   正在启动...
echo ========================================
echo.

:: 配置 Rust 环境
set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%" (
    set "PATH=%CARGO_BIN%;%PATH%"
    echo [OK] Rust 环境已配置
) else (
    echo [WARN] 未找到 Rust 环境，请先安装 Rust
)

echo.

:: 检测并释放被占用的端口
echo [0/2] 检查端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":1420.*LISTENING" 2^>nul') do (
    echo [INFO] 发现端口 1420 被 PID %%a 占用，正在释放...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING" 2^>nul') do (
    echo [INFO] 发现端口 3000 被 PID %%a 占用，正在释放...
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] 端口检查完成
echo.

:: 1. 构建 NestJS 后端
echo [1/2] 构建 NestJS 后端...
cd /d "%~dp0nestjs"
call npm run build
if %errorlevel% neq 0 (
    echo [FAIL] 后端构建失败！
    pause
    exit /b 1
)
echo [OK] 后端构建完成
echo.

:: 2. 启动 Tauri 开发模式
echo [2/2] 启动 Tauri 桌面应用...
cd /d "%~dp0"
call npx tauri dev
if %errorlevel% neq 0 (
    echo [FAIL] Tauri 启动失败！
    pause
    exit /b 1
)

pause
