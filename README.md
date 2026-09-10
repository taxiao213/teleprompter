# 隐形提词器 Stealth Prompter

录口播视频时给你看的提词器 —— **屏幕录制、截图、会议共享都看不到它**。
对标芦笋提词器，支持 macOS 与 Windows。

## 功能

- **录屏隐形**：一键开关（`setContentProtection`），录制视频/截图时不含提词窗
- **隐形自检**：一键检测当前机器上提词窗是否真的对采集不可见
- **智能跟读**：离线语音识别（sherpa-onnx 中英双语流式模型），滚动自动跟随语速；识别不可用时自动回退匀速滚动
- **核心提词**：透明悬浮窗、置顶、无边框、可拖拽缩放、逐行高亮、匀速滚动
- **文稿导入**：支持导入 Markdown / TXT 文件，文件名作为标题
- **外观调节**：字号、速度、行距、字距、文字/背景颜色、背景不透明度、对齐
- **镜像翻转**：水平/垂直镜像，适配物理提词器玻璃反射
- **全局快捷键**：提词中生效（默认 Space 播放/暂停、↑↓ 调速、R 回到开头），可自定义
- **点击穿透**：鼠标穿透提词窗操作下层应用
- **中英双语**界面

## 开发

```bash
pnpm install        # 首次安装（.npmrc 已配置 electron 国内镜像；pnpm-workspace.yaml 已配多平台架构）
pnpm dev            # 开发模式（HMR）
pnpm build          # 构建到 out/
pnpm typecheck      # 类型检查
pnpm test           # 单元测试（Vitest）
```

## 打包

```bash
bash scripts/build-mac.sh     # macOS：typecheck + 测试 + dmg（arm64 + x64）
bash scripts/build-win.sh     # 在 macOS 上交叉构建 Windows nsis x64
scripts\build-win.bat         # Windows 原生构建 nsis x64
```

脚本默认先跑 typecheck 和测试，可用 `SKIP_INSTALL=1` / `SKIP_TESTS=1` 跳过对应步骤，
额外参数会透传给 electron-builder（如 `bash scripts/build-mac.sh --arm64`）。

打包需 Electron 下载镜像：`export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`（脚本已内置默认值）

## 智能跟读

- 首次使用需在设置面板下载离线识别模型（约 200MB，ModelScope 源，国内可达）
- 模型文件存于 `userData/models/zipformer-bilingual/`，识别全程在本机完成
- macOS 首次启用会请求麦克风权限
- 模型未下载/引擎加载失败/麦克风被拒 → 自动回退为匀速滚动，跟读功能永不阻塞提词

## 平台兼容性说明（录屏隐形）

| 环境 | 隐形是否生效 |
|---|---|
| Windows 10 2004+（截图 / OBS / 会议软件） | ✅ 彻底消失 |
| macOS 系统截图、系统录屏、QuickTime | ✅ |
| OBS ≤ 29 / OBS「窗口采集」源 | ✅ |
| 浏览器网页版会议（getDisplayMedia） | ✅ |
| OBS 30+ 的「macOS 屏幕采集」源（macOS 15+） | ⚠️ 会被采集（Apple 平台限制） |
| 相机/摄像头直录 | ✅ 天然不受影响 |

macOS 15+ 使用 ScreenCaptureKit 的采集方会绕过系统级窗口保护（Electron 官方确认无解，
Apple 有意为之）。录制前请用应用内「隐形自检」确认当前环境，OBS 用户请改用「窗口采集」源。

## 安装未签名包

- macOS：首次打开被 Gatekeeper 拦截时，右键 App →「打开」
- Windows：SmartScreen 提示时选「仍要运行」

## 已知打包说明

- sherpa-onnx 原生模块通过 `asarUnpack` 按平台解包；mac dmg 会附带另一架构的
  dylib（约 +30MB），后续可用 per-arch 过滤优化
- Windows 交叉构建依赖 `supportedArchitectures`（pnpm-workspace.yaml）安装
  `sherpa-onnx-win-x64`；正式发布建议 GitHub Actions 按平台矩阵构建
- `app-builder-lib` 需要 `@electron/get >= 3.1`（已在 pnpm-workspace.yaml 里 override）

## 技术栈

Electron + electron-vite + React + TypeScript + Tailwind CSS + zustand +
sherpa-onnx（离线 ASR）。主进程为播放状态与设置的唯一事实源，双渲染窗口通过
IPC 广播保持同步。
