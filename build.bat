@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
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
    echo 下载地址: https://rustup.rs/
    pause
    exit /b 1
)

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)
echo [OK] Node.js 已检测到
echo.

:: 进入项目根目录
cd /d "%~dp0"

:: 安装根目录依赖（如果需要 tauri cli）
if not exist "node_modules\.bin\tauri.cmd" (
    echo [0/4] 安装 Tauri CLI...
    call npm install
    if %errorlevel% neq 0 (
        echo [FAIL] Tauri CLI 安装失败！
        pause
        exit /b 1
    )
) else (
    echo [0/4] Tauri CLI 已安装
)
echo.

:: 1. 安装前端依赖并构建
echo [1/4] 安装前端依赖...
cd /d "%~dp0frontend"
if not exist "node_modules" call npm install
echo [1/4] 构建前端...
call npm run build
if %errorlevel% neq 0 (
    echo [FAIL] 前端构建失败！
    pause
    exit /b 1
)
echo [OK] 前端构建完成
echo.

:: 2. 安装后端依赖并构建
echo [2/4] 安装后端依赖...
cd /d "%~dp0nestjs"
if not exist "node_modules" call npm install
echo [2/4] 构建 NestJS 后端...
call npm run build
if %errorlevel% neq 0 (
    echo [FAIL] 后端构建失败！
    pause
    exit /b 1
)
echo [OK] 后端构建完成
echo.

:: 3. 安装 Rust 依赖
echo [3/4] 检查 Rust 依赖...
cd /d "%~dp0src-tauri"
if not exist "target" (
    echo 首次构建，正在下载 Rust 依赖（可能需要几分钟）...
    cargo fetch
)
echo [OK] Rust 依赖就绪
echo.

:: 4. 构建 Tauri 桌面应用
echo [4/4] 构建 Tauri 桌面应用（可能需要几分钟）...
cd /d "%~dp0"
call npx tauri build
if %errorlevel% neq 0 (
    echo.
    echo [FAIL] Tauri 构建失败！常见原因：
    echo   1. Rust 未正确安装 - 运行 rustup update
    echo   2. Visual Studio Build Tools 未安装
    echo   3. WiX Toolset 未安装（MSI 打包需要）
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
endlocal
