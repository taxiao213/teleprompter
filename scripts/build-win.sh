#!/usr/bin/env bash
# 在 macOS 上交叉构建 Windows 安装包（nsis x64）
# 用法同 build-mac.sh；额外参数透传给 electron-builder
set -euo pipefail
cd "$(dirname "$0")/.."

# 国内网络：Electron 二进制走 npmmirror（GitHub 直连不通）
export ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"

if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  echo "==> pnpm install"
  pnpm install
fi

if [ "${SKIP_TESTS:-0}" != "1" ]; then
  echo "==> typecheck"
  pnpm typecheck
  echo "==> vitest"
  pnpm test
fi

# electron-vite 5 的构建进度条在非 TTY 环境会崩（process.stdout.clearLine），
# 用 script(1) 套一层伪 TTY。
echo "==> electron-vite build"
script -q /dev/null pnpm build

echo "==> electron-builder --win --x64"
pnpm exec electron-builder --win --x64 "$@"

echo "==> 完成，产物在 dist/"
ls -lh dist/*.exe
