# FishNote 雾蓝大修实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将「拾光便签」彻底改造为「鱼记 FishNote」：雾蓝极简主题贯穿、全套几何鱼图标、清空假数据仅留新手指引、性能优化、修复鸿蒙壳偏差。

**Architecture:** 纯前端 React 应用（`app/`）+ HarmonyOS ArkWeb 壳（`harmony/`）。主题走 CSS 变量单方案；图标为 SVG 源 + PIL 导出 PNG；数据层用版本号强制迁移重置；性能靠代码分割 + 渲染/写盘节流。

**Tech Stack:** React 19 + TS + Vite 7 + Tailwind 3 + zustand(persist)；鸿蒙侧 ArkTS；图标 PNG 用 Python venv + Pillow 生成。

**设计文档:** `docs/superpowers/specs/2026-07-19-fishnote-mist-blue-overhaul-design.md`（产品决策以此为准）

## Global Constraints

- 项目**无测试框架**（CLAUDE.md 明确），不新增测试脚手架。每个任务的验证 = `cd app && npm run build`（tsc + vite）+ `npm run lint` + 任务自带的 grep/检查命令。
- 所有 UI 文案与代码注释用中文。
- 应用名统一为「鱼记 FishNote」。
- 主题主色：浅 `--brand-500:#4A6FA5` / 深 `--brand-400:#7DA2D4`；中性色一律冷灰蓝，**禁止任何绿调 hex**（功能色 amber/red 除外）。
- localStorage key 前缀 `sg-`；数据版本 key 为 `sg-data-version`，本次版本号 `'2'`。
- 构建产物同步：`scripts/sync-webapp.sh`（内部先 `npm run build`）。
- 提交只 `git add` 本任务涉及的文件——仓库里有大量用户未提交的进行中改动，不得混入不相关文件。
- 执行环境是虚拟机；需要安装 Python 包时必须用 venv（`python3 -m venv .venv`）。

---

### Task 0: 基线提交用户进行中的改动

仓库当前有大量用户未提交的进行中改动（绿改蓝半成品、蓝鱼 SVG 等）。先提交为基线，后续任务 diff 才干净。

**Files:**
- Modify: （工作区全部已修改文件）

- [ ] **Step 1: 查看并提交基线**

```bash
cd /mnt/linux_share/DevEcoStudioProjects/Fish_note
git add -A ':!.superpowers'
git commit -m "chore: 用户进行中的蓝鱼改造基线（大修前快照）"
```

- [ ] **Step 2: 验证工作区干净**

Run: `git status --short`
Expected: 无输出（或只剩未跟踪的 `.superpowers/`，它已被 .gitignore 忽略则无输出）

---

### Task 1: 雾蓝主题变量（index.css 重写）

**Files:**
- Modify: `app/src/index.css:1-156`（`:root`、绿色方案、`.dark`、绿暗色覆盖四个块）与 `:349-352`（pulse-ring）

**Interfaces:**
- Produces: CSS 变量名不变（`--bg-base`、`--brand-*`、`--heat-*`、`--ink-*` 等），只是值变为雾蓝系；`[data-color-scheme]` 选择器整体删除（Task 2 删除 JS 侧机制）。

- [ ] **Step 1: 替换 `:root` 块（index.css:8-68）为雾蓝浅色变量**

用下面内容完整替换 `:root { ... }`（含注释）：

```css
  :root {
    /* ===== FishNote design tokens · light（雾蓝极简）===== */
    --bg-base: #F5F6F8;
    --bg-subtle: #FAFBFC;
    --surface: #FFFFFF;
    --border: #E4E7EC;
    --border-strong: #D0D5DD;
    --ink-900: #1D2939;
    --ink-700: #344054;
    --ink-500: #667085;
    --ink-400: #98A2B3;
    --ink-300: #D0D5DD;

    /* brand mist blue */
    --brand-50: #F0F4FA;
    --brand-100: #E1EAF4;
    --brand-200: #C3D3E8;
    --brand-300: #8FB0D8;
    --brand-400: #7DA2D4;
    --brand-500: #4A6FA5;
    --brand-600: #3D5D8C;
    --brand-700: #2F4A73;

    /* heatmap mist blue */
    --heat-0: #E4E7EC;
    --heat-1: #C3D3E8;
    --heat-2: #8FB0D8;
    --heat-3: #4A6FA5;
    --heat-4: #2F4A73;

    /* AI wisteria (purple — distinct from blue brand) */
    --ai-50: #F4F1FE;
    --ai-100: #E9E3FD;
    --ai-400: #A78BFA;
    --ai-500: #8B5CF6;
    --ai-600: #7C3AED;
    --ai-gradient: linear-gradient(135deg, #A78BFA 0%, #8B5CF6 45%, #6366F1 100%);

    /* semantic */
    --amber: #F59E0B;
    --amber-soft: #FEF3C7;
    --red: #EF4444;
    --red-soft: #FEF2F2;
    --blue: #4A6FA5;
    --blue-soft: #F0F4FA;

    /* shadows */
    --shadow-card: 0 1px 2px rgba(16, 24, 40, .05);
    --shadow-hover: 0 8px 24px -8px rgba(16, 24, 40, .12);
    --shadow-pop: 0 16px 48px -12px rgba(16, 24, 40, .18);
    --shadow-ai: 0 0 0 1px rgba(139, 92, 246, .22), 0 8px 32px -8px rgba(139, 92, 246, .30);

    /* shadcn radius base (r-md = 12) */
    --radius: 12px;

    /* markdown code surface */
    --code-bg: #F2F4F7;
    /* scrollbar */
    --scrollbar-thumb: #D0D5DD;
    --scrollbar-thumb-hover: #98A2B3;
  }
```

- [ ] **Step 2: 删除绿色方案块（index.css:70-86）**

完整删除 `[data-color-scheme="green"] { ... }` 整块及其上方注释行 `/* ===== 森林绿方案（设置页可选切换）===== */`。

- [ ] **Step 3: 替换 `.dark` 块（index.css:88-138）为雾蓝深色变量**

```css
  .dark {
    /* ===== dark theme（雾蓝暗色）===== */
    --bg-base: #101418;
    --bg-subtle: #161B21;
    --surface: #1B212A;
    --border: #232A34;
    --border-strong: #344054;
    --ink-900: #E4E7EC;
    --ink-700: #C0C7D1;
    --ink-500: #98A2B3;
    --ink-400: #667085;
    --ink-300: #475467;

    --brand-50: #1A2330;
    --brand-100: #223046;
    --brand-200: #2F4A73;
    --brand-300: #4A6FA5;
    --brand-400: #7DA2D4;
    --brand-500: #7DA2D4;
    --brand-600: #9FBBE0;
    --brand-700: #C3D3E8;

    --heat-0: #232A34;
    --heat-1: #2F4A73;
    --heat-2: #3D5D8C;
    --heat-3: #4A6FA5;
    --heat-4: #7DA2D4;

    --ai-50: #221D33;
    --ai-100: #2D2647;
    --ai-400: #A78BFA;
    --ai-500: #A78BFA;
    --ai-600: #BFA5FC;

    --amber: #FBBF24;
    --amber-soft: #3A2E12;
    --red: #F87171;
    --red-soft: #3B1D1D;
    --blue: #7DA2D4;
    --blue-soft: #1A2330;

    /* dark shadows: opacity ×1.6 */
    --shadow-card: 0 1px 2px rgba(0, 0, 0, .07);
    --shadow-hover: 0 8px 24px -8px rgba(0, 0, 0, .19);
    --shadow-pop: 0 16px 48px -12px rgba(0, 0, 0, .29);
    --shadow-ai: 0 0 0 1px rgba(167, 139, 250, .35), 0 8px 32px -8px rgba(139, 92, 246, .48);

    --code-bg: #161B21;
    --scrollbar-thumb: #344054;
    --scrollbar-thumb-hover: #475467;
  }
```

- [ ] **Step 4: 删除绿色暗色覆盖块（index.css:140-156）**

完整删除 `/* ===== 森林绿暗色覆盖 ===== */` 注释与 `.dark[data-color-scheme="green"] { ... }` 整块。

- [ ] **Step 5: pulse-ring 改用品牌色（index.css:349-352）**

把 `@keyframes pulse-ring` 里两处 `rgba(14, 165, 233, ...)` 改为 `rgba(74, 111, 165, .5)` 和 `rgba(74, 111, 165, 0)`。

- [ ] **Step 6: 更新 tailwind.config.js 陈旧注释**

`app/tailwind.config.js:42` 注释 `/* ---- 拾光便签 design tokens (design.md §3) ---- */` 改为 `/* ---- FishNote 雾蓝 design tokens ---- */`。

- [ ] **Step 7: 验证**

```bash
cd app && npm run build && npm run lint
grep -rn "data-color-scheme" src/index.css && echo "FAIL: 残留绿色方案" || echo "OK"
```

Expected: build/lint 通过；输出 `OK`。（此时 JS 侧仍引用 colorScheme，Task 2 处理；build 在此步应仍通过，因为只是 CSS 删除。）

- [ ] **Step 8: Commit**

```bash
git add app/src/index.css app/tailwind.config.js
git commit -m "feat(theme): 雾蓝极简设计变量，删除森林绿方案"
```

---

### Task 2: 移除 colorScheme 机制（JS/TS 侧）

**Files:**
- Modify: `app/src/types/index.ts:127-128`
- Modify: `app/src/store/useSettingsStore.ts:3,10-12,45-46`
- Modify: `app/src/App.tsx:15,26-29`
- Modify: `app/src/main.tsx:7-21`
- Modify: `app/src/pages/settings/PreferencesSection.tsx:10-29,68-69,140,162-210`

**Interfaces:**
- Consumes: Task 1 删除的 `[data-color-scheme]` CSS。
- Produces: `useSettingsStore` 不再有 `colorScheme`/`setColorScheme`；`ColorScheme` 类型删除。

- [ ] **Step 1: 删除类型**

`app/src/types/index.ts` 删除末尾两行：

```ts
/** 颜色方案：ocean（海洋蓝，默认）/ green（森林绿） */
export type ColorScheme = 'ocean' | 'green'
```

- [ ] **Step 2: 清理 useSettingsStore**

- import 行去掉 `ColorScheme`：`import type { AISettings, Theme } from '@/types'`
- 删除接口中 `colorScheme`/`setColorScheme` 声明（含上方注释 `/** 颜色方案：ocean（海洋蓝，默认）/ green（森林绿） */`）
- 删除实现中 `colorScheme: 'ocean'` 与 `setColorScheme: ...` 两行

- [ ] **Step 3: 清理 App.tsx**

删除 `const colorScheme = useSettingsStore((s) => s.colorScheme)` 和整个「颜色方案切换」useEffect（26-29 行）。同时把 Toaster `style.background` 的 `rgba(23,26,23,.92)` 改为 `rgba(16,20,24,.92)`。

- [ ] **Step 4: 清理 main.tsx**

删除首屏恢复逻辑中的 colorScheme 分支：

```ts
    if (state?.colorScheme) {
      document.documentElement.setAttribute('data-color-scheme', state.colorScheme)
    }
```

保留 theme 的 dark class 恢复。注释改为 `// 首屏渲染前恢复主题，避免闪烁`。

- [ ] **Step 5: 清理 PreferencesSection（品牌颜色区块）**

1. 删除 `type ColorScheme = 'ocean' | 'green'`（第 10 行）。
2. `ThemePreview` 去掉 `scheme` 参数：签名改为 `function ThemePreview({ mode }: { mode: ThemeMode })`，`light.brand` 固定 `'#4A6FA5'`，`dark.brand` 固定 `'#7DA2D4'`；同时把 `light`/`dark` 对象里的绿调灰更新为新值：
   - light: `bg:'#F5F6F8'`, `line:'#E4E7EC'`, `ink:'#D0D5DD'`（rail/card 保持 `'#FFFFFF'`）
   - dark: `bg:'#101418'`, `rail:'#1B212A'`, `card:'#1B212A'`, `line:'#232A34'`, `ink:'#344054'`
3. 删除 `const colorScheme = ...` 和 `const setColorScheme = ...` 两行（68-69）。
4. `<ThemePreview mode={item.mode} scheme={colorScheme} />` 改为 `<ThemePreview mode={item.mode} />`。
5. 删除整个「颜色方案选择」JSX 块（`{/* 颜色方案选择 */}` 注释起的 `<div className="mt-5 border-t border-line pt-5">...</div>`）。
6. SettingCard 的 `caption="选择界面深浅模式与品牌颜色"` 改为 `"选择界面深浅模式"`。

- [ ] **Step 6: 全局确认无残留**

```bash
cd app
grep -rn "colorScheme\|ColorScheme\|data-color-scheme" src/ && echo "FAIL" || echo "OK"
```

Expected: `OK`

- [ ] **Step 7: 验证 + Commit**

```bash
cd app && npm run build && npm run lint
git add app/src/types/index.ts app/src/store/useSettingsStore.ts app/src/App.tsx app/src/main.tsx app/src/pages/settings/PreferencesSection.tsx
git commit -m "refactor(theme): 移除 colorScheme 机制，主题简化为单一雾蓝"
```

---

### Task 3: 清理组件内硬编码绿

**Files:**
- Modify: `app/src/pages/home/TodaySummary.tsx:57`
- Modify: `app/src/components/shared/ProgressBar.tsx:15`
- Modify: `app/src/pages/stats/AchievementWall.tsx:106-114`
- Modify: `app/src/pages/Memory.tsx:30`（仅注释）

- [ ] **Step 1: TodaySummary flash 动画**

`app/src/pages/home/TodaySummary.tsx:57` 的 `rgba(215,245,225,.95)` 改为 `rgba(225,234,244,.95)`（brand-100 的 rgba 形式）。

- [ ] **Step 2: ProgressBar XP 渐变**

`app/src/components/shared/ProgressBar.tsx:15` 的 `linear-gradient(90deg,#FBBF24,#22B462)` 改为 `linear-gradient(90deg,#FBBF24,#4A6FA5)`（琥珀→雾蓝，保留等级感的暖色起点）。

- [ ] **Step 3: AchievementWall 成就渐变**

读取 `app/src/pages/stats/AchievementWall.tsx` 106-114 附近的渐变色数组，做如下替换：
- `#7DDBA2,#22B462` → `#8FB0D8,#4A6FA5`
- `#47C87B,#0F7A42` → `#4A6FA5,#2F4A73`
- `#2DD4BF,#22B462` → `#7DA2D4,#3D5D8C`

- [ ] **Step 4: Memory.tsx 陈旧注释**

`app/src/pages/Memory.tsx:30` 注释中的「绿底白字」改为「蓝底白字」。

- [ ] **Step 5: 全局绿调 hex 扫描**

```bash
cd app
grep -rniE "#(22B462|47C87B|0F7A42|7DDBA2|3BD07E|159550|2DD4BF|DCFCE7|D7F5E1|B0EAC5)" src/ \
  && echo "FAIL: 仍有硬编码绿" || echo "OK"
```

Expected: `OK`。注意 `app/src/pages/notes/constants.ts:32` 的便签功能色"薄荷" `#DCFCE7` 属功能色保留——若上面 grep 命中它，从 grep 模式中剔除 `#DCFCE7` 后重跑确认只剩它。

- [ ] **Step 6: 验证 + Commit**

```bash
cd app && npm run build && npm run lint
git add app/src/pages/home/TodaySummary.tsx app/src/components/shared/ProgressBar.tsx app/src/pages/stats/AchievementWall.tsx app/src/pages/Memory.tsx
git commit -m "fix(theme): 清理组件内硬编码绿色"
```

---

### Task 4: 图片路径修复 + favicon

**Files:**
- Modify: `app/src/components/SidebarRail.tsx:50`（logo.svg）
- Modify: `app/src/pages/settings/AboutSection.tsx:23`（logo.svg）
- Modify: `app/src/pages/home/WelcomeBubble.tsx:47`、`app/src/pages/home/StatusCards.tsx:93`、`app/src/pages/home/AssistantCard.tsx:59`（mascot）
- Modify: `app/src/components/CommandPalette.tsx:156`、`app/src/pages/Reports.tsx:172`、`app/src/pages/reports/ReportList.tsx:109,181`、`app/src/pages/notes/NoteListPanel.tsx:252,260`、`app/src/pages/notes/EditorPane.tsx:481`、`app/src/pages/home/RecentNotes.tsx:51`、`app/src/pages/notes/TrashList.tsx:38`、`app/src/pages/memory/EmptyWelcome.tsx:37,77`（empty-*.svg）
- Modify: `app/index.html`

**Interfaces:**
- Produces: 所有 public 资源以 `./xxx.svg` 相对路径引用；file:// 加载时解析到同目录，鸿蒙壳内可显示。

- [ ] **Step 1: 批量替换绝对路径为相对路径**

```bash
cd app
grep -rln 'src="/' src/ | xargs sed -i 's|src="/|src="./|g'
grep -rn 'src="/' src/ && echo "FAIL" || echo "OK"
```

Expected: `OK`。注意：mascot 引用此时是 `./mascot-sprout.svg`，Task 5 会改名。

- [ ] **Step 2: index.html 加 favicon 与标题**

`app/index.html` 的 `<title>` 内容改为 `鱼记 FishNote`，并在 `<head>` 内加：

```html
    <link rel="icon" type="image/svg+xml" href="./logo.svg" />
```

- [ ] **Step 3: 构建并验证产物无绝对路径**

```bash
cd app && npm run build && npm run lint
grep -o '"/[a-z-]*\.svg"' dist/assets/*.js | sort -u && echo "FAIL: 产物仍有绝对路径" || echo "OK"
```

Expected: `OK`（grep 无命中时退出码非 0，走 `||` 分支）。

- [ ] **Step 4: Commit**

```bash
git add app/src app/index.html
git commit -m "fix(assets): 图片引用改相对路径修复壳内 404，补 favicon 与新标题"
```

---

### Task 5: 新吉祥物与 logo（几何背鳍鱼）

**Files:**
- Create: `app/public/mascot-fish.svg`
- Modify: `app/public/logo.svg`（整体替换）
- Delete: `app/public/mascot-sprout.svg`
- Modify: `app/src/pages/home/WelcomeBubble.tsx`、`app/src/pages/home/StatusCards.tsx`、`app/src/pages/home/AssistantCard.tsx`（引用改名）
- Modify: `app/public/empty-*.svg`（仅当含绿调 hex 时重新着色）

**Interfaces:**
- Produces: `mascot-fish.svg`（吉祥物）、`logo.svg`（应用标 + favicon）。鱼形四元素：背鳍+尾鳍（#4A6FA5 深）+鱼身（#7DA2D4 浅）+眼睛（#1D2939）。

- [ ] **Step 1: 创建 `app/public/mascot-fish.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <!-- 吉祥物小鱼：几何扁平风（背鳍版），雾蓝双色调 -->
  <path d="M58,40 Q62,26 74,31 Q66,36 64,43 Z" fill="#4A6FA5"/>
  <path d="M84,60 L106,42 Q109,60 106,78 Z" fill="#4A6FA5"/>
  <path d="M18,60 C28,41 50,33 68,41 C78,45.5 84,52 84,60 C84,68 78,74.5 68,79 C50,87 28,79 18,60 Z" fill="#7DA2D4"/>
  <circle cx="41" cy="54" r="4.5" fill="#1D2939"/>
  <ellipse cx="60" cy="104" rx="34" ry="5" fill="#4A6FA5" opacity=".12"/>
</svg>
```

- [ ] **Step 2: 替换 `app/public/logo.svg` 为蓝底白鱼标**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#4A6FA5"/>
  <g transform="translate(3.8 3.8) scale(0.473)">
    <path d="M58,40 Q62,26 74,31 Q66,36 64,43 Z" fill="#2F4A73"/>
    <path d="M84,60 L106,42 Q109,60 106,78 Z" fill="#2F4A73"/>
    <path d="M18,60 C28,41 50,33 68,41 C78,45.5 84,52 84,60 C84,68 78,74.5 68,79 C50,87 28,79 18,60 Z" fill="#FFFFFF"/>
    <circle cx="41" cy="54" r="5" fill="#2F4A73"/>
  </g>
</svg>
```

- [ ] **Step 3: 更新引用并删除旧文件**

```bash
cd app
grep -rl 'mascot-sprout' src/ | xargs sed -i 's|mascot-sprout\.svg|mascot-fish.svg|g'
rm public/mascot-sprout.svg
grep -rn "sprout\|Sprout" src/ public/ && echo "注意: 成就图标 Sprout 在 Task 7 处理" || echo "OK"
```

Expected: 只剩 `seed.ts`/成就相关的 `Sprout`（Task 7 处理）；若 grep 无命中输出 OK。

- [ ] **Step 4: empty-*.svg 绿调检查**

```bash
cd app
grep -lEi "#(22B462|47C87B|0F7A42|7DDBA2|3BD07E|DCFCE7|86EFAC|4ADE80|BBF7D0)" public/*.svg
```

对命中的文件，把绿色 hex 按色阶映射替换：`#22B462→#4A6FA5`、`#47C87B→#7DA2D4`、`#7DDBA2→#8FB0D8`、`#0F7A42→#2F4A73`、`#DCFCE7→#E1EAF4`、`#BBF7D0→#C3D3E8`、`#86EFAC→#A6C0DE`、`#4ADE80→#7DA2D4`（用 sed 逐个替换）。无命中则跳过。

- [ ] **Step 5: 验证 + Commit**

```bash
cd app && npm run build && npm run lint
grep -rn "sprout" dist/ && echo "FAIL" || echo "OK"
git add app/public app/src
git commit -m "feat(brand): 几何背鳍鱼吉祥物与 logo，移除旧嫩芽吉祥物"
```

---

### Task 6: 鸿蒙应用图标 + 应用更名

**Files:**
- Create: `scripts/gen-icons.py`
- Modify: `harmony/AppScope/resources/base/media/layered_image.json` 引用的 `background.png`、`foreground.png`（重新生成覆盖）
- Modify: `harmony/entry/src/main/resources/base/media/` 下同名 PNG 与 `startIcon.png`（重新生成覆盖）
- Modify: `harmony/AppScope/resources/base/element/string.json`（应用名）
- Modify: `harmony/entry/src/main/resources/base/element/string.json`（如含应用名）
- Modify: `app/src/pages/settings/AboutSection.tsx`（产品名文案）

**Interfaces:**
- Produces: PNG 图标（前景白鱼 + #4A6FA5 背景）与「鱼记」应用名。尺寸以各目录现有 PNG 实际尺寸为准（脚本自动读取）。

- [ ] **Step 1: 确认现有图标文件与尺寸**

```bash
cd /mnt/linux_share/DevEcoStudioProjects/Fish_note
find harmony/AppScope/resources harmony/entry/src/main/resources -name "*.png" -path "*media*"
python3 -c "
from PIL import Image
" 2>/dev/null || echo "PIL 未装，Step 2 建 venv"
```

- [ ] **Step 2: 创建 `scripts/gen-icons.py`**

```python
#!/usr/bin/env python3
"""生成鱼记鸿蒙图标：#4A6FA5 背景 + 白色几何鱼（背鳍版），覆盖现有 PNG（尺寸不变）。"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRAND = (74, 111, 165, 255)      # #4A6FA5
BRAND_DARK = (47, 74, 115, 255)  # #2F4A73
WHITE = (255, 255, 255, 255)

TARGETS = [
    "harmony/AppScope/resources/base/media/background.png",
    "harmony/AppScope/resources/base/media/foreground.png",
    "harmony/entry/src/main/resources/base/media/background.png",
    "harmony/entry/src/main/resources/base/media/foreground.png",
    "harmony/entry/src/main/resources/base/media/startIcon.png",
]


def draw_fish(draw: ImageDraw.ImageDraw, cx: float, cy: float, s: float, body, fin, eye=None):
    """cx,cy 为鱼身中心，s 为鱼身半宽。eye=None 时不画眼睛（前景图用）。"""
    # 尾鳍
    draw.polygon([(cx + s * 0.5, cy), (cx + s * 1.15, cy - s * 0.66), (cx + s * 1.15, cy + s * 0.66)], fill=fin)
    # 背鳍
    draw.polygon([(cx - s * 0.1, cy - s * 0.5), (cx + s * 0.08, cy - s * 1.05), (cx + s * 0.34, cy - s * 0.42)], fill=fin)
    # 鱼身
    draw.ellipse([cx - s, cy - s * 0.68, cx + s * 0.6, cy + s * 0.68], fill=body)
    if eye:
        r = s * 0.11
        ex, ey = cx - s * 0.52, cy - s * 0.14
        draw.ellipse([ex - r, ey - r, ex + r, ey + r], fill=eye)


def gen_background(path: Path):
    img = Image.open(path)
    bg = Image.new("RGBA", img.size, BRAND)
    bg.save(path)
    print(f"background {img.size} -> {path}")


def gen_foreground(path: Path):
    img = Image.open(path)
    w, h = img.size
    fg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)
    s = w * 0.22  # 鱼身半宽：整体约占图标 55%
    draw_fish(d, w * 0.46, h * 0.5, s, WHITE, WHITE)
    fg.save(path)
    print(f"foreground {img.size} -> {path}")


def gen_start_icon(path: Path):
    img = Image.open(path)
    w, h = img.size
    icon = Image.new("RGBA", (w, h), BRAND)
    d = ImageDraw.Draw(icon)
    s = w * 0.24
    draw_fish(d, w * 0.46, h * 0.52, s, WHITE, WHITE, eye=BRAND_DARK)
    icon.save(path)
    print(f"startIcon {img.size} -> {path}")


def main():
    for rel in TARGETS:
        path = ROOT / rel
        if not path.exists():
            print(f"SKIP (不存在): {rel}", file=sys.stderr)
            continue
        if "background" in path.name:
            gen_background(path)
        elif "foreground" in path.name:
            gen_foreground(path)
        else:
            gen_start_icon(path)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: venv 安装 Pillow 并生成**

```bash
cd /mnt/linux_share/DevEcoStudioProjects/Fish_note
python3 -m venv .venv && .venv/bin/pip install -q pillow
.venv/bin/python scripts/gen-icons.py
```

Expected: 每个存在的 PNG 打印一行尺寸与路径；不存在的一律 SKIP（若某个 TARGET 不存在，从脚本 TARGETS 里删掉对应行再跑，不要静默放过——先 `find` 确认真实文件名）。

- [ ] **Step 4: 目检生成的图标**

用 ReadMediaFile 查看 `harmony/AppScope/resources/base/media/foreground.png` 和 `harmony/entry/src/main/resources/base/media/startIcon.png`，确认鱼形完整、居中、无明显毛刺。不满意就调 `draw_fish` 的比例参数重跑（脚本幂等，但注意：background 被覆盖成纯色后重跑仍安全；foreground/startIcon 重跑前若已被覆盖，尺寸读取不受影响）。

- [ ] **Step 5: 应用更名「鱼记」**

```bash
grep -rn "拾光" harmony/AppScope harmony/entry/src/main/resources app/src --include="*.json" --include="*.json5" --include="*.tsx" --include="*.ts" -l
```

把命中的鸿蒙 string.json / app.json5 里的应用名（如「拾光便签」）改为「鱼记」；`app/src/pages/settings/AboutSection.tsx` 中产品名改为「鱼记 FishNote」。其他 UI 文案里的「拾光便签」同步改为「鱼记」。

- [ ] **Step 6: 验证 + Commit**

```bash
cd app && npm run build && npm run lint && cd ..
git add scripts/gen-icons.py harmony/AppScope harmony/entry/src/main/resources app/src/pages/settings/AboutSection.tsx
git commit -m "feat(brand): 鸿蒙图标换几何鱼，应用更名鱼记 FishNote"
```

---

### Task 7: seed.ts 重写 + 统计基线归零 + 成就去植物语义

**Files:**
- Modify: `app/src/store/seed.ts`（整体重写）
- Modify: `app/src/store/useStatsStore.ts:6,37-45`
- Modify: `app/src/pages/stats/AchievementWall.tsx`（成就标题/渐变引用对齐）

**Interfaces:**
- Produces（导出签名不变，供 store 初始值调用）：
  - `seedNotebooks(): Notebook[]` — 1 个笔记本
  - `seedNotes(): Note[]` — 1 篇指引便签
  - `seedActivity(): Record<string, number>` — 空对象
  - `seedReports(): Report[]` — 1 篇指引报告
  - `seedChatMessages(): ChatMessage[]` — 空
  - `seedAchievements(): Achievement[]` — 7 枚全部 `unlockedAt: null`
  - `seedInspirationSeries(): number[]` — 14 个 0
  - 删除 `SEED_COUNTER_BASE`（useStatsStore 同步移除引用）

- [ ] **Step 1: 整体重写 `app/src/store/seed.ts`**

```ts
/**
 * 种子数据 —— 仅在 localStorage 无数据时注入一次。
 * 原则：空白起步，只留新手指引（1 篇指引便签 + 1 篇指引报告），其余全部为零。
 */
import { format } from 'date-fns'
import type { Achievement, ChatMessage, Note, Notebook, Report } from '@/types'

const now = () => new Date()

export const seedNotebooks = (): Notebook[] => [
  { id: 'nb-guide', name: '新手指引', icon: 'Compass', count: 1 },
]

export const seedNotes = (): Note[] => {
  const ts = now().toISOString()
  return [
    {
      id: 'n-guide',
      title: '欢迎使用鱼记',
      notebookId: 'nb-guide',
      kind: 'memo',
      tags: ['新手指引'],
      aiGenerated: false,
      color: undefined,
      pinned: true,
      deletedAt: null,
      createdAt: ts,
      updatedAt: ts,
      contentMarkdown: `# 欢迎使用鱼记 🐟

这是一篇新手指引，读完随时可以删掉它。

## 三步上手

1. **随手记**：回到首页「工作台」，在快速输入框写下此刻的想法，点「AI 整理」，小鱼会把碎碎念整理成结构化便签。
2. **写便签**：左侧导航进入「便签」，新建一篇。编辑器支持 Markdown：\`# 标题\`、\`- 列表\`、\`**加粗**\`、\`\`\` 代码块。
3. **看报告**：积累几篇记录后，到「报告」页让 AI 自动生成日报 / 周报 / 月报。

## 更多玩法

- **回忆书**：用对话的方式问小鱼，比如「我这周做了什么」，它会检索你的便签来回答。
- **快捷键**：按 \`g\` 再按 \`h/n/m/r/s\` 在页面间跳转。
- **真实 AI**：设置页填入 OpenAI 兼容 API 的 Key，即可把内置演示引擎换成真实大模型。

## 数据在哪

所有内容只保存在本机，不上传任何服务器。设置页支持导出 / 导入 JSON 备份。`,
    },
  ]
}

/** 热力图活动数据：空白起步 */
export const seedActivity = (): Record<string, number> => ({})

export const seedReports = (): Report[] => {
  const today = format(now(), 'yyyy-MM-dd')
  return [
    {
      id: 'r-guide',
      type: 'daily',
      title: '如何生成你的第一篇报告',
      contentMarkdown: `> 这是一篇新手指引报告，告诉你报告功能怎么用。读完可以删除。

## 报告是什么

小鱼会根据你的便签自动汇总，生成**日报 / 周报 / 月报**，把零散的记录沉淀成可回顾的总结。

## 怎么生成

1. 先在「便签」或首页快速输入里积累几篇当天的记录。
2. 回到「报告」页，点击「生成报告」，选择类型（日报 / 周报 / 月报）与时间范围。
3. 小鱼会检索范围内的便签，整理出完成事项、问题记录与计划。

## 小提示

- 日报适合每天下班前花一分钟生成，周报会在周末自动聚合本周日报的素材。
- 报告生成后可以导出 Markdown，也可以作为「回忆书」对话的检索素材。`,
      dateRange: { start: today, end: today },
      createdAt: now().toISOString(),
      sources: ['n-guide'],
    },
  ]
}

export const seedChatMessages = (): ChatMessage[] => []

export const seedAchievements = (): Achievement[] => [
  { id: 'first-note', title: '初次下水', description: '写下第一条便签', icon: 'Fish', unlockedAt: null },
  { id: 'streak-7', title: '七日之约', description: '连续记录 7 天', icon: 'Flame', unlockedAt: null },
  { id: 'notes-100', title: '便签破百', description: '累计 100 条便签', icon: 'NotebookPen', unlockedAt: null },
  { id: 'first-report', title: '首份日报', description: '生成第一篇 AI 日报', icon: 'FileBarChart2', unlockedAt: null },
  { id: 'streak-30', title: '月度坚持', description: '连续记录 30 天', icon: 'Trophy', unlockedAt: null },
  { id: 'notes-500', title: '百川归海', description: '累计 500 条便签', icon: 'Waves', unlockedAt: null },
  { id: 'ai-100', title: 'AI 拍档', description: '完成 100 次 AI 整理', icon: 'Sparkles', unlockedAt: null },
]

/** 灵感收益 sparkline：近 14 天，全部为零 */
export const seedInspirationSeries = (): number[] => Array(14).fill(0)
```

- [ ] **Step 2: useStatsStore 基线归零**

`app/src/store/useStatsStore.ts`：
- import 改为 `import { seedAchievements, seedActivity, seedInspirationSeries } from './seed'`（去掉 `SEED_COUNTER_BASE`）
- 初始值改为：

```ts
      activity: seedActivity(),
      inspiration: 0,
      inspirationWeek: 0,
      inspirationSeries: seedInspirationSeries(),
      level: 1,
      xp: 0,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      achievements: seedAchievements(),
      counters: { notes: 0, daily: 0, weekly: 0, monthly: 0, words: 0 },
```

- 第 24 行注释 `/** 大数字计数器基线（示例量级 = 基线 + 实际便签数） */` 改为 `/** 大数字计数器基线（零起步，随使用累积） */`；`useNoteCounts` 上方注释 `/** 便签计数（示例量级）：基线 + 实际存活便签数 */` 改为 `/** 便签计数：基线 + 实际存活便签数 */`。

- [ ] **Step 3: AchievementWall 对齐新成就**

读取 `app/src/pages/stats/AchievementWall.tsx`，确认：
- 成就标题「初发芽」（约 106 行附近）改为「初次下水」；若该文件内还硬编码了成就列表（id/标题/渐变），与 seed.ts 的新标题（初次下水/百川归海）对齐。
- `sg-stats-badge-seen` 等逻辑不动。

- [ ] **Step 4: 验证 + Commit**

```bash
cd app && npm run build && npm run lint
grep -rn "SEED_COUNTER_BASE\|9471\|86200\|278760" src/ && echo "FAIL" || echo "OK"
grep -rn "Sprout\|初心萌芽\|半山回望" src/ && echo "FAIL" || echo "OK"
git add app/src/store/seed.ts app/src/store/useStatsStore.ts app/src/pages/stats/AchievementWall.tsx
git commit -m "feat(data): seed 改为空白起步+新手指引，统计基线归零，成就去植物语义"
```

Expected: build/lint 通过，两个 grep 均 `OK`。

---

### Task 8: 数据版本迁移与统一重置

**Files:**
- Modify: `app/src/main.tsx`（首屏前加迁移逻辑）
- Modify: `app/src/store/useSettingsStore.ts:57-62`
- Modify: `app/src/pages/settings/DataSection.tsx:197-212`（doReset 合并到 resetAllData）

**Interfaces:**
- Produces: `sg-data-version='2'` 迁移协议；`useSettingsStore.getState().resetAllData()` 清空全部 `sg-*` key 并 reload。老设备上所有旧假数据在升级后首次启动被清空，随后由 Task 7 的新 seed 注入指引内容。

- [ ] **Step 1: main.tsx 加版本迁移（放在主题恢复逻辑之前）**

```ts
// 数据版本迁移：版本不符时清空全部 sg-* 数据（含旧示例内容），由新 seed 重新注入
const DATA_VERSION = '2'
try {
  if (localStorage.getItem('sg-data-version') !== DATA_VERSION) {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sg-')) localStorage.removeItem(key)
    }
    localStorage.setItem('sg-data-version', DATA_VERSION)
  }
} catch {
  /* ignore */
}
```

- [ ] **Step 2: resetAllData 清空全部 sg-\* key**

`app/src/store/useSettingsStore.ts` 的 `resetAllData` 改为：

```ts
      resetAllData: () => {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('sg-')) localStorage.removeItem(key)
        }
        location.reload()
      },
```

同时更新 CLAUDE.md 中「`useSettingsStore.resetAllData()` 硬编码了要清空的 key 列表——新增持久化 store 时必须同步加进去」这条：改为「`useSettingsStore.resetAllData()` 按 `sg-` 前缀清空全部 key，新增持久化 store 只要保持前缀即自动覆盖」。

- [ ] **Step 3: DataSection.doReset 合并**

`app/src/pages/settings/DataSection.tsx` 的 doReset（197-212 行附近）删除本地重复的清空实现，改为调用 `useSettingsStore.getState().resetAllData()`（文件顶部 import `useSettingsStore`，若无）。保留其确认对话框交互；删除 reload 之外的多余逻辑（如 hash 复位）。

- [ ] **Step 4: 验证 + Commit**

```bash
cd app && npm run build && npm run lint
grep -n "sg-data-version" src/main.tsx && echo OK
git add app/src/main.tsx app/src/store/useSettingsStore.ts app/src/pages/settings/DataSection.tsx CLAUDE.md
git commit -m "feat(data): sg-data-version 强制迁移重置，resetAllData 统一按前缀清空"
```

---

### Task 9: 性能 A —— 依赖清理 + 代码分割

**Files:**
- Modify: `app/package.json`
- Modify: `app/vite.config.ts`
- Modify: `app/src/App.tsx`（路由 lazy）

- [ ] **Step 1: 确认零引用后卸载依赖**

```bash
cd app
for pkg in gsap @gsap/react next-themes cmdk embla-carousel-react vaul input-otp react-hook-form zod @hookform/resolvers lenis; do
  name=$(basename $pkg)
  hits=$(grep -rl "from '$pkg'\|from \"$pkg\"\|from '$pkg/" src/ | wc -l)
  echo "$pkg: $hits"
done
```

对输出为 0 的包执行卸载（lenis 在 Task 11 移除使用后再卸，此处若 >0 属正常）：

```bash
npm uninstall gsap @gsap/react next-themes cmdk embla-carousel-react vaul input-otp react-hook-form zod @hookform/resolvers
```

**注意**：`zod`/`react-hook-form` 若 grep 非 0（shadcn ui 组件可能引用），则保留并从卸载列表剔除；`components/ui/` 下若有引用同理会显示。只卸载确认为 0 的包。

- [ ] **Step 2: vite manualChunks**

`app/vite.config.ts` 的 `defineConfig` 内加：

```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-charts': ['recharts'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'rehype-highlight', 'highlight.js'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
```

- [ ] **Step 3: 路由级 React.lazy**

`app/src/App.tsx` 顶部改为：

```tsx
import { Suspense, lazy, useEffect } from 'react'
```

页面 import 改为：

```tsx
const Home = lazy(() => import('@/pages/Home'))
const Notes = lazy(() => import('@/pages/Notes'))
const Memory = lazy(() => import('@/pages/Memory'))
const Reports = lazy(() => import('@/pages/Reports'))
const Stats = lazy(() => import('@/pages/Stats'))
const Settings = lazy(() => import('@/pages/Settings'))
```

`<Routes>` 外层包 `<Suspense fallback={null}>`（放在 HashRouter 内、Routes 外）。`Layout`、`Toaster` 保持静态 import。

- [ ] **Step 4: 构建并对比产物**

```bash
cd app && npm run build && npm run lint
ls -la dist/assets/*.js | awk '{print $5, $9}' | sort -rn | head -8
```

Expected: 出现 vendor-*.js 分块；首屏 index-*.js 明显小于原 1.84MB 单文件。lint 注意 `react-refresh/only-export-components` 可能对新写法告警，按提示调整。

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/package-lock.json app/vite.config.ts app/src/App.tsx
git commit -m "perf: 卸载零引用依赖，路由 lazy + manualChunks 代码分割"
```

---

### Task 10: 性能 B —— persist 写盘节流 + 流式更新节流

**Files:**
- Create: `app/src/lib/persistStorage.ts`
- Modify: `app/src/store/useNotesStore.ts`、`useReportsStore.ts`、`useChatStore.ts`、`useStatsStore.ts`、`useSettingsStore.ts`（persist options 加 storage）
- Modify: `app/src/store/useChatStore.ts`（updateMessage 节流）

**Interfaces:**
- Produces: `createThrottledStorage(delayMs?: number)` — zustand persist 的 storage，同 key 在 delay 窗口内只写最后一次，`beforeunload` 时 flush。

- [ ] **Step 1: 创建 `app/src/lib/persistStorage.ts`**

```ts
import { createJSONStorage } from 'zustand/middleware'

/**
 * localStorage 写盘节流：同一 key 在 delay 窗口内的多次 set 只落盘最后一次。
 * 避免流式输出/连续击键时每个 set 都同步 JSON.stringify + 写盘。
 */
export function createThrottledStorage(delay = 1000) {
  const base = createJSONStorage(() => localStorage)
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const pending = new Map<string, string>()

  const flush = (name: string) => {
    const value = pending.get(name)
    if (value !== undefined) base.setItem(name, value)
    pending.delete(name)
    const t = timers.get(name)
    if (t) clearTimeout(t)
    timers.delete(name)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const name of [...pending.keys()]) flush(name)
    })
  }

  return {
    getItem: base.getItem,
    removeItem: (name: string) => {
      flush(name)
      base.removeItem(name)
    },
    setItem: (name: string, value: string) => {
      pending.set(name, value)
      const t = timers.get(name)
      if (t) clearTimeout(t)
      timers.set(name, setTimeout(() => flush(name), delay))
    },
  }
}
```

- [ ] **Step 2: 五个 store 接入**

每个 store 的 persist 第二参数加 `storage`：

```ts
import { createThrottledStorage } from '@/lib/persistStorage'
// ...
    { name: 'sg-notes', version: 1, storage: createThrottledStorage() },
```

（`sg-settings` 的 `version: 1` 依现状保留；各 store 只加 storage 字段，不动其他配置。）

- [ ] **Step 3: useChatStore.updateMessage 节流**

读取 `app/src/store/useChatStore.ts`，找到流式期间逐 token 调用的 `updateMessage`。在模块级加一个 120ms 节流包装：

```ts
/** 流式更新节流：120ms 内多次调用只执行最后一次，避免每 token 全量 set+persist */
function throttleArgs<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: A | null = null
  return (...args: A) => {
    lastArgs = args
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      if (lastArgs) fn(...lastArgs)
      lastArgs = null
    }, wait)
  }
}
```

store 内部保留原始 `updateMessage` 实现，导出时替换为节流版（例如 `updateMessage: (...args) => throttledUpdate(...args)`，注意流式结束时要有一次直接调用保证最终内容落库——在 Memory 页流式完成回调里再调一次原始更新或直接 `useChatStore.setState` 最终文本）。

- [ ] **Step 4: 验证 + Commit**

```bash
cd app && npm run build && npm run lint
git add app/src/lib/persistStorage.ts app/src/store
git commit -m "perf: persist 写盘节流 + 聊天流式更新节流"
```

---

### Task 11: 性能 C —— 渲染热点（热力图 / 编辑器 / Lenis / memo）

**Files:**
- Modify: `app/src/components/shared/Heatmap.tsx`
- Modify: `app/src/pages/notes/EditorPane.tsx`（预览 memo + 防抖）
- Modify: `app/src/components/Layout.tsx:3,52-65`（移除 Lenis）
- Modify: `app/src/store/useStatsStore.ts`（computeStreak memo）
- Modify: `app/package.json`（卸载 lenis、framer-motion 视情况保留）

- [ ] **Step 1: 热力图去 framer-motion**

读取 `app/src/components/shared/Heatmap.tsx`（约 99-134 行的格子渲染）。把每个格子的 `motion.div`（stagger 入场 + whileHover）替换为纯 `div`，入场动画改 CSS：`animation: heat-pop .3s ease backwards`，`animation-delay` 用 `style={{ animationDelay: `${index * 1.5}ms` }}`；hover 放大改 `className` 加 `transition-transform hover:scale-125`。在 `app/src/index.css` 的 utilities 层加：

```css
  @keyframes heat-pop {
    from { opacity: 0; transform: scale(.6); }
    to { opacity: 1; transform: scale(1); }
  }
```

组件导出包 `React.memo`。若 Heatmap 是 framer-motion 在首页的唯一用途且其他页面组件未 import，则 `npm uninstall framer-motion`；先用 `grep -rln "framer-motion" src/` 确认剩余使用点（Layout/PreferencesSection 等仍在用则保留依赖）。

- [ ] **Step 2: 编辑器预览防抖 + memo**

读取 `app/src/pages/notes/EditorPane.tsx`：
1. `components` 对象（约 75 行）用 `useMemo` 固定或移到组件外模块级常量。
2. 预览区 `PreviewPane` 包 `React.memo`，props 只传 `content`。
3. 传入预览的 content 做 300ms 防抖：

```tsx
function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
```

编辑器源码区仍用实时 content，预览区用 `useDebounced(content, 300)`。

- [ ] **Step 3: 移除 Lenis**

`app/src/components/Layout.tsx`：删除 `import Lenis from 'lenis'`（第 3 行）与整个「Lenis 平滑滚动」useEffect（52-65 行）。然后 `cd app && npm uninstall lenis`。

- [ ] **Step 4: computeStreak / useStatsData memo**

`app/src/store/useStatsStore.ts` 的 `useStatsData`：把 `const streak = computeStreak(activity)` 包进 `useMemo(() => computeStreak(activity), [activity])`（顶部从 react import useMemo）。`liveWords` 的 reduce 同样 `useMemo(..., [notes])`。

- [ ] **Step 5: 验证 + Commit**

```bash
cd app && npm run build && npm run lint
git add app/src app/package.json app/package-lock.json
git commit -m "perf: 热力图去 motion 改 CSS 动画，编辑器预览防抖，移除 Lenis，统计派生 memo"
```

---

### Task 12: 鸿蒙壳修复（深色跟随系统）

**Files:**
- Modify: `harmony/entry/src/main/ets/pages/Index.ets:111-114`

- [ ] **Step 1: Web 组件加 darkMode(Auto)**

在 `.domStorageAccess(true)` 一行之后加：

```ts
        .darkMode(webview.WebDarkMode.Auto) // prefers-color-scheme 跟随系统深浅色
```

若 ArkTS 编译报 `WebDarkMode` 不存在于 webview 命名空间，改为顶部 `import { webview, WebDarkMode } from '@kit.ArkWeb'` 并使用 `.darkMode(WebDarkMode.Auto)`。

- [ ] **Step 2: 验证**

本环境无法编译鸿蒙工程（无 DevEco 工具链）——用 hvigor 若可用则试 `cd harmony && hvigorw assembleHap --mode module -p module=entry@default`（失败可接受，记录输出）；至少 `grep -n "darkMode" harmony/entry/src/main/ets/pages/Index.ets` 确认改动就位。真机验证留给用户。

- [ ] **Step 3: Commit**

```bash
git add harmony/entry/src/main/ets/pages/Index.ets
git commit -m "fix(shell): ArkWeb darkMode 跟随系统，修复壳内深色模式失效"
```

---

### Task 13: 字体离线化（fontsource 拉丁字体 + 系统中文栈）

**Files:**
- Modify: `app/package.json`（+@fontsource/sora、+@fontsource/jetbrains-mono）
- Modify: `app/src/main.tsx`（字体 import）
- Modify: `app/src/index.css:1`（删除 Google Fonts @import）
- Modify: `app/tailwind.config.js:113-117`（fontFamily 注释同步）

**背景:** CJK 字体体积大（子集也有数 MB），鸿蒙/桌面系统必有中文字体，故中文走系统栈；只自托管拉丁展示字体 Sora 与等宽 JetBrains Mono。这比手动下载 woff2 到 public/ 更稳（fontsource 由 vite 打包进 dist，file:// 可用）。

- [ ] **Step 1: 安装并引入**

```bash
cd app && npm i @fontsource/sora @fontsource/jetbrains-mono
```

`app/src/main.tsx` 顶部（在 `import './index.css'` 之前）加：

```ts
import '@fontsource/sora/600.css'
import '@fontsource/sora/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
```

- [ ] **Step 2: 删除在线字体 @import**

删除 `app/src/index.css` 第 1 行：

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

- [ ] **Step 3: 验证产物无外链字体**

```bash
cd app && npm run build && npm run lint
grep -rn "fonts.googleapis\|fonts.gstatic" dist/ && echo "FAIL" || echo "OK"
ls dist/assets/ | grep -c "woff2"
```

Expected: `OK`，且 dist/assets 下有若干 woff2（Sora/JetBrains Mono 子集）。

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json app/src/main.tsx app/src/index.css app/tailwind.config.js
git commit -m "perf(fonts): 字体外链改 fontsource 本地打包，中文走系统字体栈"
```

---

### Task 14: 收尾 —— 全量构建、同步壳资源、冒烟验证

**Files:**
- Modify: `harmony/entry/src/main/resources/resfile/webapp/`（由脚本重新生成）

- [ ] **Step 1: 全量构建 + lint**

```bash
cd app && npm run build && npm run lint
```

Expected: 均通过。

- [ ] **Step 2: 同步到鸿蒙壳**

```bash
bash scripts/sync-webapp.sh
```

Expected: 输出「已同步 N 个文件」。

- [ ] **Step 3: 产物冒烟检查**

```bash
cd harmony/entry/src/main/resources/resfile/webapp
grep -o '"/[a-z-]*\.svg"' assets/*.js | sort -u && echo "FAIL: 绝对路径" || echo "OK: 无绝对路径"
grep -rn "fonts.googleapis" . && echo "FAIL: 外链字体" || echo "OK: 无外链"
grep -c "mascot-fish" assets/*.js
ls | head
```

Expected: 前两项 OK，mascot-fish 计数 ≥ 3。

- [ ] **Step 4: file:// 本地冒烟（可选但推荐）**

用 `python3 -m http.server` 不对——必须模拟 file://。直接 `xdg-open app/dist/index.html` 或在浏览器地址栏输入 `file:///mnt/linux_share/DevEcoStudioProjects/Fish_note/app/dist/index.html`，确认：logo/吉祥物/empty 插图显示；深色模式背景为干净的蓝黑（无墨绿）；首页无假数据（只有新手指引）。虚拟机无浏览器时，用 venv 安装 playwright 做截图验证，或跳过并把真机验证项写给用户。

- [ ] **Step 5: 更新 CLAUDE.md 与 Commit**

CLAUDE.md 同步三处：localStorage 前缀说明里的 `sg-` 加一条 `sg-data-version`；「store/seed.ts 注入示例数据」描述改为「seed.ts 在首次运行时注入新手指引（1 便签+1 报告），其余空白」；resetAllData 描述已在 Task 8 更新。

```bash
git add app/dist harmony/entry/src/main/resources/resfile CLAUDE.md
git commit -m "chore: 全量构建并同步壳资源，雾蓝大修收尾"
```

（注意：根 .gitignore 忽略了 resfile/webapp/，若 add 为空属正常，只提交 app/dist 与 CLAUDE.md；app/dist 若也被 app/.gitignore 忽略则同样跳过。）

---

## Self-Review 记录

- Spec 覆盖：主题(§1)→T1-T3；图标(§2)→T5-T6；图片路径(§3)→T4；种子/重置(§4)→T7-T8；性能(§5)→T9-T11；壳(§6)→T12-T13；验证(§7)→T14。范围外三项未安排任务，符合 spec。
- 类型一致性：`createThrottledStorage` 在 T10 定义并被五个 store 使用；seed 导出签名在 T7 定义，T8 迁移依赖其通过 store 初始值生效；T1 删除的 `data-color-scheme` 与 T2 删除的 JS 机制配对。
- 无测试框架为项目既定约束（CLAUDE.md），验证手段统一为 build+lint+grep，未引入测试脚手架。
