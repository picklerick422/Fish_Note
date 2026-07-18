# 拾光便签 · 鸿蒙 PC 封装设计（方案 A：rawfile 内置壳）

- 日期：2026-07-18
- 状态：已获用户批准
- 目标设备：鸿蒙 PC（2in1 形态），DevEco Studio 直连自动签名安装（自用）。SDK 基线：compatibleSdkVersion `6.1.0(23)`（DevEco 默认）——要求设备系统 ≥ HarmonyOS 6.1；若低于此版本需调低（下限 API 12，受 `getUIContext().getHostContext()` 约束）

## 1. 背景与目标

现有 `app/` 是纯前端 React 便签应用（localStorage 持久化）。目标：封装为鸿蒙 PC 上完整可用的原生应用。

**关键事实**：Electron 无法运行在鸿蒙 PC 上（官方无支持）。鸿蒙上的等价方案是 ArkTS 原生壳 + ArkWeb（Web 组件）加载本地 Web 资源（`resource://rawfile/`）。经用户确认：放弃 Electron，只做鸿蒙 PC。

**范围外**：Windows/macOS/Linux 打包、Web 包热更新、上架应用市场、ArkTS 原生重写 UI。

## 2. 架构与工程结构

单仓库双工程，Web 构建产物经脚本单向同步进壳。壳只负责加载与系统交互（文件保存/选择），不含业务逻辑。

```
Fish_note/
├── app/                        # 现有 React 应用（结构不动）
├── harmony/                    # DevEco 工程（新增，DevEco Studio 打开此目录）
│   ├── AppScope/
│   │   ├── app.json5           # bundleName: com.fishnote.app
│   │   └── resources/          # 应用名「拾光便签」、图标
│   ├── entry/src/main/
│   │   ├── ets/entryability/EntryAbility.ets
│   │   ├── ets/pages/Index.ets           # ArkWeb 壳页面（核心）
│   │   ├── resources/rawfile/webapp/     # vite 产物（git 忽略，脚本生成）
│   │   └── module.json5
│   ├── build-profile.json5、hvigorfile.ts 等构建配置
│   └── oh-package.json5
└── scripts/sync-webapp.sh      # 一键：app 构建 → 拷入 rawfile
```

## 3. Web 侧改造（其余零改动）

1. **`app/src/App.tsx`**：`BrowserRouter` → `HashRouter`（`react-router` 包内直接导出）。原因：`resource://` 协议下无 history 服务，hash 路由是唯一可靠方案；浏览器开发模式不受影响。
2. **`app/src/lib/download.ts`（新增共享模块）**：统一下载出口 `downloadBlob(filename, blob)`——若存在壳注入的 `window.fishNoteShell`，将 Blob 转 base64 后调 `fishNoteShell.saveFile(filename, base64)`（失败 `notify.error`）；否则维持 `<a download>` 浏览器行为。全应用三个导出入口统一走它：设置页备份导出（DataSection）、报告导出（reportUtils.downloadMarkdown）、便签右键导出 .md（NoteListCard.exportNoteMd）。（最终评审修正：最初 spec 只清点了 DataSection 一处，漏了后两个入口。）
3. **`app/src/pages/settings/DataSection.tsx` 的 `doReset()`**：`location.assign('/')` 在 `resource://.../index.html` 下会导航离开应用页面，改为 `location.hash = '#/'` + `location.reload()`（浏览器下行为等价）。

前提已满足、无需改动的项：vite `base: './'`（相对路径）、AI 层（mock 离线可用，OpenAI 走 fetch）。

## 4. 鸿蒙壳实现

### Index.ets（约 150 行）

- 全屏 `Web({ src: 'resource://rawfile/webapp/index.html', controller })`
- 属性：
  - `.domStorageAccess(true)` — localStorage 持久化的前提（默认 false，必须显式开启）
  - `.javaScriptAccess(true)`
  - `.zoomAccess(false)` — 桌面应用禁手势缩放
- **导入（文件选择）**：`onShowFileSelector` 事件 → 拉起 `DocumentViewPicker`（@ohos.file.picker）过滤 `.json`（备份文件为 JSON；zip 仅是 Markdown 导出格式，不可回导）→ 选中 uri 交还 `FileSelectorResult.handleFileList()`，Web 端 `<input type="file">` 无感知
- **导出（文件保存）**：`javaScriptProxy` 注入 `fishNoteShell.saveFile(name, base64)` → 壳用 `DocumentViewPicker.save()` 让用户选保存位置 → `@ohos.file.fs` 写入。
  - 决策：选 JS Bridge 而非 `WebDownloadDelegate`，因 blob: URL 在 ArkWeb 下载代理中的行为文档未明确，桥方案确定可行
- `onErrorReceive` 记 hilog（资源内置包内，加载失败即打包错误，无需 UI 兜底）

### EntryAbility.ets

标准模板：windowStage 加载 `pages/Index`。不做自定义窗口逻辑（2in1 自由窗口 + 系统标题栏默认行为）。

### 配置

- `module.json5`：`deviceTypes: ["2in1", "tablet"]`；`requestPermissions: [ohos.permission.INTERNET]`（OpenAI 兼容 API 用）
- `app.json5`：`bundleName: com.fishnote.app`（用户建工程时实际选定值）；应用显示名「拾光便签」

## 5. 构建与安装流程

```bash
./scripts/sync-webapp.sh
# 等价于：cd app && npm run build
#        清空 harmony/entry/src/main/resources/rawfile/webapp/ 后拷入 app/dist/*
```

然后 DevEco Studio 打开 `harmony/` → 连接鸿蒙 PC（开发者模式）→ Run（hvigor 打包 + 自动签名 + 安装）。

`rawfile/webapp/` 加入 `.gitignore`（构建产物不入库）。

## 6. 错误处理与边界

- AI 网络错误/用户取消：Web 层已有完整处理（toast + AbortSignal），壳不参与
- localStorage 容量（ArkWeb 约 10MB 级）：纯文本便签远够用；现有导出功能兜底
- 导入文件校验：沿用 DataSection 现有逻辑（Web 层）
- 数据生命周期：数据随应用卸载删除；备份手段 = 导出 zip

## 7. 验证清单

**本环境可验证**（Web 侧）：改造后 `npm run build` 通过；浏览器中路由、导出/导入回归正常。

**需用户在 DevEco/真机执行**（ArkTS 侧交付代码，未经本地构建验证）：

1. hvigor 构建通过，真机安装成功
2. 六页面导航（含 `g+h/n/m/r/s` 快捷键）
3. 便签增删改；**杀进程重开数据仍在**（验证 domStorageAccess 持久化）
4. mock AI 流式输出（快速记录 → 结构化）
5. 导出 JSON 备份与 Markdown zip（DocumentViewPicker.save）、导入 JSON 备份（DocumentViewPicker.select）
6. 深色主题切换
7. （可选）设置中填 OpenAI 兼容 API 验证联网

## 8. 风险与备选

| 风险 | 影响 | 备选 |
|---|---|---|
| javaScriptProxy 注入时机晚于页面 JS 检测 | 导出走不到桥 | 桥检测改为调用时动态判断（本设计已按此实现） |
| ArkWeb 对某些 CSS/API 兼容差异 | 个别样式异常 | ArkWeb 基于 Chromium，风险低；发现后个案处理 |
| 自动签名证书过期 | 应用无法启动 | DevEco 重新签名安装（自用可接受） |

## 9. 已确认决策

- 只做鸿蒙 PC，放弃 Electron（用户选择）
- 方案 A：rawfile 内置壳（用户选择）
- DevEco 直连自动签名安装（用户选择）
- bundleName `com.fishnote.app`（建工程时实际选定）、应用名「拾光便签」、deviceTypes 含 tablet（用户确认默认值）
