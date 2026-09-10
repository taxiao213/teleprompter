#!/usr/bin/env bash
# macOS 构建脚本：typecheck + 测试 + 打包 dmg（arm64 + x64）
# 用法：
#   bash scripts/build-mac.sh            # 完整流程（安装依赖 + 检查 + 打包）
#   SKIP_INSTALL=1 bash scripts/build-mac.sh   # 跳过 pnpm install
#   SKIP_TESTS=1   bash scripts/build-mac.sh   # 跳过 typecheck 和测试
#   bash scripts/build-mac.sh --arm64    # 额外参数透传给 electron-builder
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

echo "==> electron-builder --mac"
pnpm exec electron-builder --mac "$@"

echo "==> 完成，产物在 dist/"
ls -lh dist/*.dmg
