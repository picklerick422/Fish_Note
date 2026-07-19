# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 环境偏好

- 本环境是虚拟机（目录与真机共享，网络走真机代理）。给用户任何"在浏览器里看"的预览地址时，不要用 `localhost`/`127.0.0.1`，要绑定 `0.0.0.0` 并给出虚拟机局域网 IP（`hostname -I` 获取），让用户在真机浏览器打开。

## 项目概述

「SpringNote AI — 智能便签」：参考 [Radiant303/SpringNote](https://github.com/Radiant303/SpringNote)（懒人实习记录工具）实现的纯前端 Web 应用，功能为便签记录 + AI 整理/日报周报生成 + 对话式记忆检索。无服务器依赖，全部数据存 localStorage，后续计划用 Electron 封装（因此 vite `base: './'` 使用相对路径）。

- 应用代码全部在 `app/` 目录；根目录的 `info.md`（参考项目调研）和 `plan.md`(开发计划) 是背景文档。
- 代码注释与 UI 文案均为中文，新代码保持一致。部分注释引用的 `design.md` 不在仓库中，不要试图读取它。
- 未配置测试框架，也不是 git 仓库。

## 常用命令

均在 `app/` 目录下执行：

```bash
npm install        # 首次需要（node_modules 未提交）
npm run dev        # Vite 开发服务器，端口 3000
npm run build      # tsc -b && vite build（类型检查 + 打包，改动后用它验证）
npm run lint       # ESLint
npm run preview    # 预览构建产物
```

## 架构

技术栈：React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui + zustand。路径别名 `@` → `app/src`。

### AI 层（src/ai/）— 可插拔 Provider

页面层只从 `@/ai` 导入 `getAIProvider()`，不直接依赖具体实现：

- `provider.ts`：`AIProvider` 接口（chat / structure / complete / summarize / extractTodos / generateReport / ask 七个能力），所有方法返回完整文本 Promise，流式通过 `opts.onToken(chunk, fullText)` 回调，取消用 `AbortSignal`（配套 `isAbortError()` 判断）。
- `mockEngine.ts`：内置规则式模拟引擎（离线可完整演示，打字机流式输出）。RAG 检索函数 `retrieveNotes` 也在这里，供两个 Provider 共用。
- `openaiProvider.ts`：OpenAI 兼容 API（fetch + SSE 流式），配置读自 `useSettingsStore`。
- 选择逻辑（`index.ts`）：设置为 `openai` 且填了 apiKey → openaiProvider，否则 mockEngine。
- 两个 Provider 都会把估算 token 用量写入 `useStatsStore.addTokenUsage`。

新增 AI 能力时：先在 `provider.ts` 加接口方法，两个实现都要补齐。

### 状态层（src/store/）— zustand + persist

每个领域一个 store，localStorage key 前缀 `sg-`。另有非 store 的版本标记 key `sg-data-version`（`src/migrate.ts`）：与内置 `DATA_VERSION` 不一致时清空全部 `sg-` 数据，用于大版本数据迁移。

| store | key | 说明 |
|---|---|---|
| useNotesStore | `sg-notes` | 便签 + 笔记本；软删除（`deletedAt`）实现回收站；笔记本 count 由 `withCounts` 派生 |
| useReportsStore | `sg-reports` | 日报/周报/月报 |
| useChatStore | `sg-chat` | 回忆书对话 |
| useStatsStore | `sg-stats` | 活跃热力图、等级/XP、token 用量、成就 |
| useSettingsStore | `sg-settings` | 主题、昵称、AI 供应商配置 |
| useUIStore | （不持久化） | 命令面板开关等临时 UI 状态 |

注意：
- `useSettingsStore.resetAllData()` 按 `sg-` 前缀清空全部 key，新增持久化 store 只要保持前缀即自动覆盖。
- `store/seed.ts` 在首次运行时注入新手指引（1 便签 + 1 报告），其余空白。
- 所有日期时间统一 ISO 字符串（`new Date().toISOString()`），类型定义集中在 `src/types/index.ts`。

### 页面层（src/pages/）

react-router 路由在 `App.tsx`：`/`（首页工作台）、`/notes`（Markdown 便签编辑）、`/memory`（回忆书 AI 对话）、`/reports`、`/stats`、`/settings`。

- 每个页面 = `src/pages/X.tsx` 入口 + `src/pages/x/` 子目录放该页专属组件。
- `components/Layout.tsx` 是 App Shell（左侧 SidebarRail + 顶部 PageHeader）：页面通过 `usePageHeader(config, deps)` hook 设置自己的标题/操作按钮；全局键盘导航 `g` + `h/n/m/r/s`，命令面板由 `useUIStore` 控制。
- 主题切换：`App.tsx` 在 `<html>` 上 toggle `.dark` class。

### UI 组件

- `src/components/ui/`：shadcn/ui 生成的组件（50+），当作三方库使用，一般不改。
- `src/components/shared/`：项目自定义通用组件（Heatmap、StreamingText、MarkdownRenderer、ThinkingAccordion 等），优先复用。
