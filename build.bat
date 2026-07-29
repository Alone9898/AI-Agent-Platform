@echo off
chcp 65001 >nul
title AI Agent Platform - 构建中...

echo ========================================
echo   AI Agent Platform
echo   正在构建发布版...
echo ========================================
echo.

:: 配置 Rust 环境
set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%" (
    set "PATH=%CARGO_BIN%;%PATH%"
    echo [OK] Rust 环境已配置
) else (
    echo [FAIL] 未找到 Rust 环境，请先安装 Rust
    pause
    exit /b 1
)

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

:: 2. 构建 Tauri 桌面应用
echo [2/2] 构建 Tauri 桌面应用（可能需要几分钟）...
cd /d "%~dp0"
call npx tauri build
if %errorlevel% neq 0 (
    echo [FAIL] Tauri 构建失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo [DONE] 构建完成！
echo.
echo 产物位置：
echo   主程序:   src-tauri\target\release\ai-agent-platform.exe
echo   NSIS 安装: src-tauri\target\release\bundle\nsis\AI Agent Platform_1.0.0_x64-setup.exe
echo   MSI 安装:  src-tauri\target\release\bundle\msi\AI Agent Platform_1.0.0_x64_en-US.msi
echo ========================================

pause
