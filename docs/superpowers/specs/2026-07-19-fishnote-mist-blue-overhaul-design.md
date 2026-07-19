# FishNote（鱼记）雾蓝大修 — 设计文档

日期：2026-07-19
状态：已获用户批准（2026-07-19）

## 背景

应用原名「拾光便签」（SpringNote AI 复刻），纯前端 React 应用（`app/`）+ HarmonyOS ArkWeb 套壳（`harmony/`），无 Electron。产品定位：**通用笔记应用**（便签 + AI 整理 + 报告 + 对话检索），小鱼是品牌吉祥物。本次更名「鱼记 FishNote」。

用户反馈的问题，经代码探查确认根因：

| 问题 | 根因 |
|---|---|
| 墨绿色背景残留 | `app/src/index.css` 浅色/深色中性色全是绿调灰（G 通道恒 ≥ R/B），深色模式同理；另有完整保留的绿色 `data-color-scheme` 方案和组件内硬编码绿 |
| 图片不显示 | 所有 `<img src="/xxx.svg">` 为绝对路径；壳用 `file://` 加载时解析为文件系统根，必然 404。`vite base:'./'` 不改 JSX 手写路径 |
| 图标丑 | 鸿蒙图标（蓝底白鱼 PNG）、web logo、吉祥物风格不统一 |
| 假示例内容 | `seed.ts` 注入 18 条程序员人设便签、400 天假热力图、3 篇假报告、7 枚成就；`useStatsStore` 另有硬编码基线（228 便签/Lv.7/9471 灵感/27 万 token），清空便签后假数字仍在 |
| 卡顿 | 1.84MB 单 bundle 无分割；编辑器每击键全量 Markdown 重渲染；persist 每次 set 全量同步写 localStorage（流式输出每 token 一次）；热力图 371 个 framer-motion 组件；Lenis 常驻 rAF；多个零引用重依赖 |
| 壳偏差 | 未设 `.darkMode(WebDarkMode.Auto)`，壳内深色跟随系统失效；Google Fonts 在线加载，离线环境字体全回退 |

## 已确认的产品决策

- **主题方向**：雾蓝极简（低饱和灰蓝，Notion/Things 文具感），用户从三套方案中选定
- **图标方向**：A3 背鳍几何鱼（鱼身+尾鳍+背鳍+眼睛四元素，几何扁平无描边），用户从三轮方案中选定
- **旧数据**：升级后首次启动**强制重置**所有假数据
- **应用名**：鱼记 FishNote（鸿蒙应用名、网页标题、关于页统一）
- **交付方式**：一次完整大修

## 设计

### 1. 主题系统（雾蓝极简）

重写 `app/src/index.css` CSS 变量，中性色全部换成干净冷灰蓝（无绿偏）：

- 浅色：`--bg-base:#F5F6F8`，`--surface:#FFFFFF`，`--border:#E4E7EC`，`--ink-900:#1D2939`，`--brand-500:#4A6FA5`
- 深色：`--bg-base:#101418`，`--surface:#1B212A`，`--border:#232A34`，`--ink-100:#E4E7EC`，`--brand-400:#7DA2D4`
- 热力图色阶：`#E4E7EC → #C3D3E8 → #8FB0D8 → #4A6FA5 → #2F4A73`

配套修改：

- 删除绿色 `data-color-scheme` 方案（index.css 两块 + PreferencesSection 入口），主题简化为单一雾蓝；老用户 localStorage 中 `colorScheme:'green'` 由数据迁移清理
- 清理组件硬编码绿：`TodaySummary.tsx` flash 动画、`ProgressBar.tsx` XP 渐变改品牌蓝、`AchievementWall.tsx` 成就渐变改蓝/琥珀中性色、`PreferencesSection.tsx` 预览色板
- 阴影、滚动条、`--code-bg` 同步换冷灰蓝调；recharts 图表色统一到品牌蓝阶
- 更新陈旧注释（Memory.tsx"绿底白字"、tailwind.config.js"拾光便签 tokens"）

### 2. 图标与吉祥物（A3 背鳍几何鱼）

以选定的 A3 草图为基准精修：

- `app/public/mascot-fish.svg` — 吉祥物完整版（新建，删除 `mascot-sprout.svg`，全部引用改名）
- `app/public/logo.svg` — 小尺寸简化版（背鳍并入轮廓）
- `app/index.html` 加 favicon `<link rel="icon" href="./logo.svg">`
- 鸿蒙应用图标：由 SVG 导出 PNG，替换 `AppScope/resources/base/media/`（layered_image background/foreground）与 `entry/.../media/`（含 startIcon.png），前景白鱼 + 纯品牌蓝 `#4A6FA5` 背景
- 成就系统去植物语义：图标与名称改鱼/水主题（如"初心萌芽"→"初次下水"），统一 seed.ts 与 AchievementWall.tsx 两处成就标题
- 应用更名「鱼记 FishNote」：`app/index.html` title、关于页、`harmony/AppScope/app.json5`、entry 字符串资源

### 3. 图片路径修复

所有 `<img src="/xxx.svg">` 改相对路径 `./xxx.svg`（涉及 SidebarRail、AboutSection、WelcomeBubble、StatusCards、AssistantCard、CommandPalette、Reports、ReportList、NoteListPanel、EditorPane、RecentNotes、TrashList、EmptyWelcome 共 13 处文件）。构建后检查 dist 产物中的引用路径。

### 4. 种子数据与重置

- `seed.ts` 重写为空应用 + 新手指引：
  - 1 个默认笔记本 + 1 篇《欢迎使用鱼记》指引便签（介绍快速输入、Markdown 编辑、AI 整理用法）
  - 1 篇新手指引报告（说明日报/周报/月报如何生成）
  - 聊天空（EmptyWelcome 已有引导）；热力图空；成就全部未解锁
  - `SEED_COUNTER_BASE` 与 `useStatsStore` 硬编码基线（inspiration/level/xp/tokenUsage/words）全部归零
- 数据版本标记 `sg-data-version`：版本不符 → 清空所有 `sg-*` key（含 `sg-local-prefs`、`sg-ai-completion`、`sg-stats-badge-seen`）→ 重新注入新 seed → 写入新版本号
- `useSettingsStore.resetAllData()` 与 `DataSection.doReset` 合并为一处实现，清空全部 `sg-*` key

### 5. 性能优化

- 代码分割：路由级 `React.lazy` + vite `manualChunks`（recharts、react-markdown+highlight.js 等重依赖分离）
- 编辑器预览 memo + ~300ms 防抖，`components` 对象移出渲染函数
- persist 写盘节流：包装 storage，~1s 防抖；流式输出期间不逐 token 触发全量序列化
- 热力图 371 个 `motion.div` 改纯 div + CSS 动画，组件 memo
- 移除 Lenis 常驻 rAF
- 删除零引用依赖：gsap、@gsap/react、next-themes、cmdk、embla-carousel-react、vaul、input-otp、react-hook-form、zod、@hookform/resolvers（删前逐个 grep 确认）
- `searchNotes`/`computeStreak`/`useNoteCounts` 加 memo

### 6. 壳偏差修复

- `harmony/entry/src/main/ets/pages/Index.ets` 加 `.darkMode(WebDarkMode.Auto)`，壳内深色跟随系统
- Google Fonts 离线化：字体子集下载到 `app/public/fonts/`，本地 `@font-face`，删除在线 `@import`
- 删除 Electron 残留 CSS（`.app-region-drag`）
- 完成后跑 `scripts/sync-webapp.sh` 构建并同步产物到 resfile

### 7. 验证

- `npm run build`（tsc + vite）与 `npm run lint` 通过
- `file://` 直接打开 `app/dist/index.html` 验证图片加载与深色模式
- 检查 dist 产物无 `/xxx.svg` 绝对路径残留
- 鸿蒙壳侧无法在本环境真机验证，构建层面验证后请用户真机确认

## 范围外（本次不做）

- 备份导入的 version/字段校验（DataSection）
- `sg-local-prefs` 与 `sg-ai-completion` 两套偏好体系合并
- mock 模式下 token 统计虚高问题
