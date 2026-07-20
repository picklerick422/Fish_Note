# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 环境偏好

- 本环境是虚拟机（目录与真机共享，网络走真机代理）。给任何预览地址时绑定 `0.0.0.0` 并用 `hostname -I` 取虚拟机局域网 IP，让用户在真机浏览器打开。
- 代码注释与 UI 文案均为中文，新代码保持一致。
- 未配置测试框架。
- 不要读取 `design.md`（不在仓库中）。

## 项目概述

鱼记 (Fish Note) — 智能便签应用。参考 [SpringNote](https://github.com/Radiant303/SpringNote) 实现的纯前端 Web 应用，功能为便签记录 + AI 整理/报告生成 + 对话式记忆检索（RAG）。无服务器依赖，全部数据存 localStorage。

**双栈架构**：
- `app/` — React Web 应用（主要代码）
- `harmony/` — HarmonyOS ArkWeb 原生壳，将 Web 应用打包为鸿蒙原生应用（平板/二合一设备）

`info.md`（调研）和 `plan.md`（开发计划）为背景文档。

## 常用命令

均在 `app/` 目录下执行：

```bash
npm install        # 首次需要（node_modules 未提交）
npm run dev        # Vite 开发服务器，端口 3000
npm run build      # tsc -b && vite build（类型检查 + 打包）
npm run lint       # ESLint
npm run preview    # 预览构建产物
```

### 同步 Web 产物到鸿蒙壳

```bash
bash scripts/sync-webapp.sh   # 构建 app/ 并复制产物到 harmony/entry/.../resfile/webapp/
```

该脚本执行 `npm run build` + 复制 `app/dist/` → `harmony/entry/src/main/resources/resfile/webapp/`。

开发时在 `app/` 下跑 `npm run dev` 即可热更新；仅在需要真机/模拟器调试鸿蒙壳时才跑同步脚本。

## 技术栈与关键依赖

**Web 应用**：
- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS 3 + shadcn/ui（Radix UI 组件）
- zustand 5（状态管理 + localStorage 持久化）
- react-router v7（HashRouter）
- react-markdown + remark-gfm + rehype-highlight + highlight.js（Markdown 渲染）
- recharts（图表）、framer-motion（动画）、date-fns（日期）

**鸿蒙壳**：
- HarmonyOS SDK 6.1.0(23)
- ArkWeb + ArkTS
- 图标生成：`scripts/gen-icons.py`（Pillow）

## 整体架构

```
app/src/
├── ai/              # AI 可插拔 Provider 层
│   ├── provider.ts      # AIProvider 统一接口定义
│   ├── index.ts         # getAIProvider() — 根据设置返回 mock/openai 实例
│   ├── mockEngine.ts    # 本地模拟引擎（离线可演示全部 AI 功能）
│   └── openaiProvider.ts # OpenAI 兼容 API Provider
├── store/           # zustand 状态切片
│   ├── useNotesStore.ts    # 便签 + 笔记本 CRUD、搜索/过滤
│   ├── useChatStore.ts     # 回忆书对话消息
│   ├── useReportsStore.ts  # 报告（日报/周报/月报）
│   ├── useSettingsStore.ts # 主题、AI 配置、用户名、resetAllData()
│   ├── useStatsStore.ts    # 统计数据（派生指标 + 成就）
│   ├── useUIStore.ts       # 侧栏折叠等 UI 状态
│   └── seed.ts             # 首次使用种子数据
├── pages/           # 路由页面
│   ├── Home.tsx         # 首页工作台（快速记录、热力图、今日摘要）
│   ├── Notes.tsx        # 便签编辑（Markdown 编辑器 + 笔记本列表）
│   ├── Memory.tsx       # 回忆书 AI 对话（类 ChatGPT RAG）
│   ├── Reports.tsx      # 报告中心（生成/查看日报/周报/月报）
│   ├── Stats.tsx        # 统计面板（热力图、趋势图、成就墙）
│   └── Settings.tsx     # 设置（AI 配置、偏好、数据管理）
├── components/      # 共享组件 + shadcn/ui 组件
│   ├── Layout.tsx       # 侧栏导航布局（HashRouter + Outlet）
│   ├── SidebarRail.tsx  # 左侧窄图标导航栏
│   ├── CommandPalette.tsx # ⌘K 命令面板
│   ├── shared/          # 业务共享组件（Heatmap、MarkdownRenderer、StreamingText 等）
│   └── ui/              # shadcn/ui 组件（button、dialog、dropdown-menu 等）
├── lib/             # 工具函数
│   ├── persistStorage.ts # localStorage 写盘节流（1000ms）
│   ├── download.ts       # 导出下载（浏览器 <a download> / 鸿蒙壳原生桥）
│   ├── date.ts           # 日期工具
│   └── utils.ts          # cn()、uid() 等
├── hooks/           # 自定义 hooks
├── types/index.ts   # 全局类型定义
├── migrate.ts       # 数据版本迁移（main.tsx 首个 import）
└── main.tsx         # 入口
```

## 关键架构决策

### AI Provider 可插拔模式

`AIProvider` 接口（`app/src/ai/provider.ts`）定义 6 个方法：`chat`、`structure`、`complete`、`summarize`、`extractTodos`、`generateReport`、`ask`。所有页面通过 `getAIProvider()` 获取当前 Provider，不直接依赖底层实现。内置 `mockEngine` 离线模拟全部功能，`openaiProvider` 接 OpenAI 兼容 API。用户可在设置页切换。

### 持久化与节流

所有 zustand store 通过 `zustand/middleware/persist` 持久化到 localStorage，使用 `createThrottledStorage(1000)` 节流——同一 key 在 1 秒内的多次写入只落盘最后一次，避免流式输出/连续击键时的性能问题。`beforeunload` 时 flush 所有 pending 写入。

### 数据版本迁移

`app/src/migrate.ts` 必须是 `main.tsx` 的第一个 import（ES 模块按 import 顺序求值），在任何 store 水合之前执行。版本号变更时清空全部 `sg-*` localStorage key，由 seed 重新注入。

### 鸿蒙壳桥接

鸿蒙 ArkWeb 壳（`harmony/entry/src/main/ets/pages/Index.ets`）：
- 使用 `file://` + `setPathAllowingUniversalAccess` 加载 resfile 中的 Web 产物（`resource://rawfile` 有 CORS 限制，子资源会被拦截）
- `javaScriptProxy` 注入 `window.fishNoteShell.saveFile(filename, base64)` 用于备份导出
- `onShowFileSelector` 接管 `<input type="file">` 用于恢复备份（过滤 `.json`）
- `darkMode(WebDarkMode.Auto)` 跟随系统深浅色
- `domStorageAccess(true)` 启用 localStorage

Web 侧 `app/src/lib/download.ts` 检测 `window.fishNoteShell`：存在则走原生桥，否则走浏览器 `<a download>`。

### Vite 构建

- `base: './'` — 相对路径，兼容 file:// 协议
- `manualChunks` — 手动拆分：`vendor-react`、`vendor-charts`、`vendor-markdown`、`vendor-motion`
- `@` alias → `./src`

### TypeScript

- `erasableSyntaxOnly: true` — 禁止 enum/namespace 等非 erasable 语法
- `verbatimModuleSyntax: true` — 强制 `import type` 明确类型导入

### 路由

使用 `HashRouter`（`react-router`），因为 `file://` 协议下 BrowserRouter 不可用。

## 数据模型

所有日期时间统一使用 ISO 字符串。详见 `app/src/types/index.ts`：

- **Note**：便签（id、title、contentMarkdown、notebookId、kind、tags、color、pinned、deletedAt 等）
- **Notebook**：笔记本（id、name、icon=lucide 图标名、count）
- **Report**：AI 报告（type=daily/weekly/monthly、contentMarkdown、dateRange、sources）
- **ChatMessage**：回忆书对话（role、content、thinkingSteps、sources）
- **AISettings**：AI 配置（provider、baseURL、apiKey、model、temperature、mockEnabled）
- **NoteKind** = `'daily' | 'weekly' | 'monthly' | 'memo'`
- localStorage key 前缀统一为 `sg-`（各 store：`sg-notes`、`sg-settings`、`sg-chat`、`sg-reports`、`sg-stats`）

## 脚本

- `scripts/sync-webapp.sh` — 构建 Web 应用并同步产物到鸿蒙壳 resfile
- `scripts/gen-icons.py` — 生成鸿蒙应用图标（#4A6FA5 背景 + 白色几何鱼），需 Pillow
