@echo off
rem Windows 原生构建脚本：typecheck + 测试 + 打包 nsis (x64)
rem 用法：
rem   scripts\build-win.bat            完整流程（安装依赖 + 检查 + 打包）
rem   set SKIP_INSTALL=1 ^&^& scripts\build-win.bat   跳过 pnpm install
rem   set SKIP_TESTS=1   ^&^& scripts\build-win.bat   跳过 typecheck 和测试
setlocal
cd /d "%~dp0.."

rem 国内网络：Electron 二进制走 npmmirror（GitHub 直连不通）
if not defined ELECTRON_MIRROR set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

if not "%SKIP_INSTALL%"=="1" (
  echo ==^> pnpm install
  call pnpm install || exit /b 1
)

if not "%SKIP_TESTS%"=="1" (
  echo ==^> typecheck
  call pnpm typecheck || exit /b 1
  echo ==^> vitest
  call pnpm test || exit /b 1
)

rem electron-vite 5 的构建进度条在非 TTY 环境会崩（process.stdout.clearLine），
rem 用 NODE_OPTIONS 注入 no-op polyfill（与 CI 同一方案）。
echo ==^> electron-vite build
set NODE_OPTIONS=--require %CD%\scripts\tty-polyfill.cjs
call pnpm build || exit /b 1

echo ==^> electron-builder --win --x64
call pnpm exec electron-builder --win --x64 %* || exit /b 1

echo ==^> 完成，产物在 dist\
dir /b dist\*.exe
