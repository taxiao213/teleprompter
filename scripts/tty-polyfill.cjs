// electron-vite 5 的构建进度输出会无条件调用 process.stdout.clearLine/moveCursor/
// cursorTo（transform-reporter 插件 + renderStart 钩子），在 GitHub Actions 等
// 非 TTY 管道环境这些方法不存在，build 直接崩。
// 通过 `NODE_OPTIONS="--require scripts/tty-polyfill.cjs"` 注入，补上 no-op。
if (typeof process.stdout.clearLine !== 'function') {
  process.stdout.clearLine = () => {};
}
if (typeof process.stdout.moveCursor !== 'function') {
  process.stdout.moveCursor = () => {};
}
if (typeof process.stdout.cursorTo !== 'function') {
  process.stdout.cursorTo = () => {};
}
