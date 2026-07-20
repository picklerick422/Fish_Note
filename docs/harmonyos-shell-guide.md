# HarmonyOS ArkWeb 壳完整实践指南

本文档记录将 FishNote Web 应用封装为 HarmonyOS ArkWeb 原生壳的完整方案，涵盖从基础加载到沉浸式窗口、拖拽、主题同步等全部关键问题的解决路径。

---

## 目录

1. [基础架构](#1-基础架构)
2. [WebView 加载与配置](#2-webview-加载与配置)
3. [沉浸式窗口（无标题栏）](#3-沉浸式窗口无标题栏)
4. [窗口拖拽](#4-窗口拖拽)
5. [系统三键避让](#5-系统三键避让)
6. [深浅色主题同步](#6-深浅色主题同步)
7. [JS 桥接（原生能力）](#7-js-桥接原生能力)
8. [构建与同步流程](#8-构建与同步流程)
9. [常见问题与陷阱](#9-常见问题与陷阱)
10. [关键文件速查](#10-关键文件速查)

---

## 1. 基础架构

### 双栈结构

```
Fish_note/
├── app/                          # React Web 应用
│   ├── src/
│   │   ├── components/Layout.tsx # App Shell（PageHeader + 侧栏）
│   │   ├── components/SidebarRail.tsx
│   │   └── ...
│   └── dist/                     # Vite 构建产物
├── harmony/                      # HarmonyOS ArkWeb 原生壳
│   └── entry/src/main/ets/
│       ├── entryability/EntryAbility.ets  # 窗口级配置
│       └── pages/Index.ets                # WebView 壳页面
└── scripts/
    └── sync-webapp.sh            # Web 构建 → 鸿蒙 resfile 同步
```

**运行模型**：
- Web 应用独立开发（`npm run dev`，热更新）
- 需要真机/模拟器验证时：`sync-webapp.sh` 构建并复制产物到 `harmony/entry/.../resfile/webapp/`
- DevEco Studio 构建鸿蒙壳，WebView 从 `resfile` 加载 `file://` 协议的 Web 产物

---

## 2. WebView 加载与配置

### 为什么用 resfile + file:// 而不是 resource://rawfile

`resource://rawfile` 协议的 CORS origin 为 `null`，会导致子资源 JS/CSS 被拦截，页面白屏。**必须使用 `setPathAllowingUniversalAccess` + `file://` 协议**。

```typescript
// Index.ets — onControllerAttached
const ctx = this.getUIContext().getHostContext()
if (ctx) {
  this.controller.setPathAllowingUniversalAccess([ctx.resourceDir])
  this.controller.loadUrl('file://' + ctx.resourceDir + '/webapp/index.html')
}
```

> `resfile` 编译后位于沙盒目录 `/data/storage/el1/bundle/entry/resources/resfile/`

### WebView 关键配置

| 配置 | 值 | 原因 |
|------|-----|------|
| `fileAccess(true)` | 必需 | 允许加载本地文件 |
| `domStorageAccess(true)` | 必需 | localStorage 持久化 |
| `darkMode(WebDarkMode.Auto)` | 推荐 | 跟随系统深浅色 |
| `javaScriptAccess(true)` | 必需 | JS bridge 依赖 |
| `zoomAccess(false)` | 推荐 | 桌面设备禁用手势缩放 |

### 完整 Web 组件配置

```typescript
Web({ src: '', controller: this.controller })
  .fileAccess(true)
  .domStorageAccess(true)
  .darkMode(WebDarkMode.Auto)
  .javaScriptAccess(true)
  .zoomAccess(false)
  .javaScriptProxy({
    object: this.shell,
    name: 'fishNoteShell',
    methodList: ['saveFile', 'startMoving', 'setDarkMode'],
    controller: this.controller,
  })
  .width('100%')
  .height('100%')
```

---

## 3. 沉浸式窗口（无标题栏）

### 目标

去掉原生标题栏装饰，让 Web 内容延伸到窗口边缘（边缘到边缘），同时保留系统三键（最小化/最大化/关闭）。

### 实现（EntryAbility.ets）

```typescript
const mainWindow = windowStage.getMainWindowSync()

// 1. 隐藏标题栏装饰（API 11+）
mainWindow.setWindowDecorVisible(false)

// 2. 启用沉浸式布局：内容延伸到状态栏和导航栏背后（API 9+）
await mainWindow.setWindowLayoutFullScreen(true)

// 3. 系统栏背景透明化（API 9+）
await mainWindow.setWindowSystemBarProperties({
  statusBarColor: '#00000000',
  navigationBarColor: '#00000000',
  statusBarContentColor: '#000000',       // 浅色模式用暗图标
  navigationBarContentColor: '#000000',
})
```

### ArkUI 侧 Stack 布局

```typescript
Stack() {
  Web({ ... })
    .width('100%').height('100%')

  // 顶层：窄条拖拽回落层
  Row() { ... }
    .width('100%').height(12)
}
.alignContent(Alignment.Top)
.expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
```

`expandSafeArea` 确保 WebView 绘制到系统安全区域（状态栏/导航栏背后），实现真正的边缘到边缘。

---

## 4. 窗口拖拽

### 核心挑战

没有可见标题栏后，用户无法拖拽窗口。需要在不遮挡 Web 交互元素的前提下，在正确的位置响应拖拽。

### 最终方案：双层拖拽

**第一层（ArkUI）**：12vp 窄条位于窗口最顶部，仅覆盖标题栏的极顶部区域。左 35% 响应拖拽，右 65%（对应系统三键区和操作区）事件穿透。

**第二层（Web → JS bridge）**：Web 的 `<header>` 元素整体可拖拽（调用 `fishNoteShell.startMoving()`），但 `actions` 区域（搜索栏、按钮）通过 `stopPropagation` 排除。

### ArkUI 层代码

```typescript
Row() {
  Blank()
    .layoutWeight(35)
    .onTouch((event: TouchEvent) => {
      if (event.type === TouchType.Down) {
        const w = AppStorage.get<window.Window>('mainWindow')
        if (w) { w.startMoving().catch(() => {}) }
      }
    })
  Blank()
    .layoutWeight(65)
    .hitTestBehavior(HitTestMode.None)
}
.width('100%').height(12)
```

### Web 层代码（Layout.tsx）

```tsx
<header
  onPointerDown={() => {
    const shell = (window as any).fishNoteShell
    if (shell?.startMoving) shell.startMoving()
  }}
>
  <div>标题区域（继承拖拽）</div>
  <div onPointerDown={(e) => e.stopPropagation()}>
    搜索栏 / 按钮（不触发拖拽）
  </div>
</header>
```

### JS Bridge 方法（Index.ets FishNoteShell）

```typescript
startMoving(): void {
  try {
    const w = AppStorage.get<window.Window>('mainWindow')
    if (w) { w.startMoving().catch(() => {}) }
  } catch (_) { /* 静默 */ }
}
```

> `startMoving()` 是 API 14+ 的系统级窗口拖拽，仅在自由窗口模式（2-in-1 设备）生效。非支持场景下静默失败。

---

## 5. 系统三键避让

### 问题

系统三键（最小化/最大化/关闭）浮在窗口右上角，会与 Web 页面的搜索栏、按钮等右上角元素重叠。

### 解决方案：CSS 变量 + 动态注入

#### ArkWeb 注入（Index.ets onPageEnd）

```typescript
.onPageEnd(() => {
  const btnW = (this.btnRect?.width ?? 138) + 12  // 三键宽度 + 12vp 边距
  const btnH = (this.btnRect?.height ?? 40) + 4   // 三键高度 + 4vp
  this.controller.runJavaScript(
    `(function(){
      var s = document.documentElement.style
      s.setProperty('--system-btn-width', '${btnW}px')
      s.setProperty('--system-btn-height', '${btnH}px')
    })()`
  )
})
```

#### CSS 默认值（index.css）

```css
:root {
  --system-btn-width: 0px;    /* 浏览器默认 0，仅 ArkWeb 注入生效 */
  --system-btn-height: 44px;  /* 浏览器默认 44px */
}
```

#### 应用（Layout.tsx）

```tsx
<header style={{
  height: 'var(--system-btn-height, 44px)',
  paddingRight: 'var(--system-btn-width, 0px)',
}}>
```

`paddingRight` 将 header 的 actions 区域左移，为系统三键留出空间。

#### 三键区域信息获取（EntryAbility.ets）

```typescript
const btnRect = mainWindow.getTitleButtonRect()
AppStorage.setOrCreate('titleButtonRect', btnRect)
mainWindow.on('windowTitleButtonRectChange', (rect) => {
  AppStorage.setOrCreate('titleButtonRect', rect)
})
```

> `getTitleButtonRect()` 返回 `{ right, top, width, height }`。API 11+。不支持时使用默认值 `{ width: 138, height: 40 }`。

---

## 6. 深浅色主题同步

### 问题

Web 端切换深色模式后，系统状态栏图标仍为暗色（不可见）。需要 Web 通知原生侧同步切换。

### 方案：JS Bridge 双向同步

#### Web → 原生（App.tsx）

```typescript
useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  // 同步系统状态栏/导航栏图标颜色
  const shell = (window as any).fishNoteShell
  if (shell?.setDarkMode) {
    shell.setDarkMode(theme === 'dark')
  }
}, [theme])
```

#### 原生侧（Index.ets FishNoteShell）

```typescript
setDarkMode(isDark: boolean): void {
  try {
    const w = AppStorage.get<window.Window>('mainWindow')
    if (w) {
      const color = isDark ? '#FFFFFF' : '#000000'
      w.setWindowSystemBarProperties({
        statusBarContentColor: color,
        navigationBarContentColor: color,
      })
    }
  } catch (_) { /* 静默 */ }
}
```

### 关键点

- 状态栏图标颜色 `#000000` = 暗色图标（浅色背景用），`#FFFFFF` = 亮色图标（深色背景用）
- WebView 自身的 `darkMode(WebDarkMode.Auto)` 仅影响 Web 内容的 `prefers-color-scheme`，不影响系统栏
- 必须通过 JS bridge 手动同步

---

## 7. JS 桥接（原生能力）

### FishNoteShell 类

```typescript
class FishNoteShell {
  // 文件导出：将 base64 数据保存到用户选择的位置
  saveFile(filename: string, base64: string): void

  // 窗口拖拽：Web 标题区域 pointerdown 时调用
  startMoving(): void

  // 主题同步：Web 切换深浅色时调用
  setDarkMode(isDark: boolean): void
}
```

### 注册

```typescript
.javaScriptProxy({
  object: this.shell,
  name: 'fishNoteShell',
  methodList: ['saveFile', 'startMoving', 'setDarkMode'],
  controller: this.controller,
})
```

> **重要**：`javaScriptProxy` 注册对象**禁止声明属性**，只能声明方法。模块级变量（如 `shellContext`）不受此限。

### 文件选择器接管

```typescript
.onShowFileSelector((event) => {
  if (!event) return false
  this.pickFile(event)  // 拉起 DocumentViewPicker，过滤 .json
  return true
})
```

---

## 8. 构建与同步流程

### 日常开发

```bash
cd app && npm run dev        # Web 热更新开发
```

### 鸿蒙验证

```bash
bash scripts/sync-webapp.sh  # 构建 Web + 复制产物到 harmony/resfile/
```

然后在 DevEco Studio 中构建鸿蒙壳并部署到模拟器/真机。

### sync-webapp.sh 核心逻辑

```bash
cd "$APP_DIR"
npm run build                           # tsc -b && vite build
rm -rf "$DST_DIR"/*
cp -r "$APP_DIR/dist/"* "$DST_DIR/"    # 复制全部产物
```

### Vite 构建要点

- `base: './'` — 相对路径，兼容 `file://` 协议
- `manualChunks` — 手动拆分 vendor 包
- 构建产物输出到 `app/dist/`（实际为 `~/.cache/fishnote/dist` 的符号链接）

---

## 9. 常见问题与陷阱

### 9.1 virtiofs 文件系统限制

若项目位于 virtiofs 共享目录（如虚拟机共享文件夹），git 和 npm 的 chmod 操作会失败：

- **git**：`git init`、`git remote add` 等写 `.git/config` 的操作可能失败。绕过：手动编辑 `.git/config`。
- **npm**：`npm install` 在 bin 链接阶段 chmod → EPERM。绕过：影子安装（symlink node_modules 到本地盘）。

### 9.2 ArkWeb 组件层级与事件穿透

- ArkUI Stack 中，上层组件默认拦截所有事件
- 想让事件到达下层（WebView），需使用 `HitTestMode.None`
- **不要用全屏透明层做拖拽**——会阻挡整个 WebView 交互

### 9.3 TitleButtonRect 兼容性

- `getTitleButtonRect()` 是 API 11+，部分设备可能不支持
- 始终提供 try-catch 回退 + 默认值 `{ width: 138, height: 40 }`

### 9.4 Web 端默认值策略

CSS 变量的浏览器默认值应为 **0 或无害值**：`--system-btn-width: 0px`、`--shell-drag-height: 0px`。仅在 ArkWeb 壳内由 `runJavaScript` 注入实际值。

### 9.5 startMoving 前置条件

`window.startMoving()` 仅在**自由窗口模式**下生效（2-in-1 设备的多窗口模式）。全屏/分屏模式下会静默失败，不影响正常使用。

### 9.6 图片与链接的拖拽

ArkWeb 中拖拽 `<img>` 或 `<a>` 会显示 `file://` 路径。全局阻止：

```css
img, a { -webkit-user-drag: none; }
```

---

## 10. 关键文件速查

| 文件 | 职责 |
|------|------|
| `harmony/.../EntryAbility.ets` | 窗口装饰隐藏、沉浸式布局、TitleButtonRect 监听、AppStorage 初始化 |
| `harmony/.../Index.ets` | WebView 加载、JS bridge 注册、CSS 变量注入、ArkUI 拖拽回落层 |
| `app/src/components/Layout.tsx` | PageHeader（高度/拖拽/避让）、usePageHeader hook |
| `app/src/index.css` | CSS 变量默认值、深色主题 token、拖拽阻止规则 |
| `app/src/App.tsx` | 主题切换 + 通知原生侧同步系统栏颜色 |
| `app/src/components/ui/tooltip.tsx` | Tooltip 深色模式适配 |
| `app/src/lib/download.ts` | 导出：检测 fishNoteShell 桥，走原生或浏览器下载 |
| `scripts/sync-webapp.sh` | Web 构建 + 同步到鸿蒙 resfile |

---

## 附录：顶栏设计演变摘要

| 迭代 | 高度 | 标题 | 搜索栏/按钮 | 拖拽方式 |
|------|------|------|------------|---------|
| 初版 | `clamp(56px, 5vh, 72px)` | `24px`，小标题在下方 | `h-9` (36px) | ArkUI 40vp × 100% |
| 优化 | `var(--system-btn-height, 44px)` | `22px`，小标题右置基线对齐 | `h-7` (28px) | ArkUI 12vp × 35% + Web header JS bridge |

核心原则：**顶栏高度匹配系统三键，标题区可拖拽，操作区不遮挡，系统栏颜色跟随主题**。
