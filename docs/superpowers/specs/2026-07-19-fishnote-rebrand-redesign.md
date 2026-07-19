# FishNote 品牌重塑与全面改进设计

## 概述

将 SpringNote AI（拾光便签）全面改造为 **FishNote**——一个通用的个人便签 + AI 助手 HarmonyOS 应用。改进涵盖品牌重命名、Logo/图标、布局百分比化、用户信息定制、种子数据通用化、主题系统增强等。

**关键决策**：
- AI 助手名：**小鱼**
- 默认配色：**海洋蓝**，绿色系完整保留可在设置中切换回退
- Logo：蓝色鱼形图标

---

## 一、品牌变更清单

### HarmonyOS 壳层
- `harmony/AppScope/resources/base/element/string.json`: `app_name` → "FishNote"
- `harmony/entry/src/main/resources/base/element/string.json`:
  - `module_desc` → "FishNote 主模块"
  - `EntryAbility_desc` → "FishNote — AI 智能便签"
  - `EntryAbility_label` → "FishNote"

### Web 应用层
- `app/index.html`: `<title>` → "FishNote", `lang` → "zh-CN"
- `app/package.json`: `name` → "fish-note"
- `app/src/components/Layout.tsx`: 移动端提示文案更新
- `app/src/components/SidebarRail.tsx`: aria-label → "FishNote"
- `app/src/pages/settings/AboutSection.tsx`: 标题/描述/版本 → FishNote + HarmonyOS
- `app/src/pages/settings/DataSection.tsx`:
  - `app: 'shiguang-note'` → `app: 'fishnote'`
  - 备份文件名 `shiguang-backup-*` → `fishnote-backup-*`
  - Markdown zip `shiguang-notes-*.zip` → `fishnote-notes-*.zip`
- `app/src/store/useSettingsStore.ts`: 默认 userName "阿澈" → ""
- `app/src/pages/home/GreetingBanner.tsx`: 去掉 "实习第N周"，仅显示日期
- `app/src/pages/home/WelcomeBubble.tsx`: "小芽" → "小鱼"

### AI 助手重命名（全局）
- "小芽" → "小鱼"（所有出现的文件）
- 涉及文件：`WelcomeBubble.tsx`, `seed.ts`（报告生成备注）, mockEngine 等

---

## 二、Logo 与图标

### Web Logo (`app/public/logo.svg`)
- 蓝色鱼形 SVG 图标，圆角矩形底色 `#0EA5E9`
- 简洁的鱼轮廓 + 水波纹点缀

### HarmonyOS 启动图标
- `harmony/AppScope/resources/base/media/background.png` — 纯色背景层（蓝色）
- `harmony/AppScope/resources/base/media/foreground.png` — 鱼图标前景层
- `harmony/entry/src/main/resources/base/media/startIcon.png` — 启动页图标
- 注意：以上为 PNG 二进制图片，SVG 只提供 Web 端；原生图标需导出 PNG

### 吉祥物 (`app/public/mascot-sprout.svg`)
- 从嫩芽改为小鱼卡通形象

---

## 三、主题系统增强（默认蓝色 + 绿色可切换）

### 实现方式
- `useSettingsStore` 新增 `colorScheme: 'ocean' | 'green'`，默认 `'ocean'`
- `<html>` 上挂载 `data-color-scheme="ocean"` 或 `"green"`
- CSS 中 `:root` 定义蓝色（默认），`[data-color-scheme="green"]` 覆盖为绿色

### 海洋蓝（默认）CSS tokens
```
--brand-50: #ECFEFF
--brand-100: #CFFAFE
--brand-200: #A5F3FC
--brand-300: #67E8F9
--brand-400: #22D3EE
--brand-500: #0EA5E9   (sky-500)
--brand-600: #0284C7
--brand-700: #0369A1
--heat-0 ~ heat-4: 蓝色阶
--ai-gradient: 蓝紫渐变
```

### 绿色系（可选切换）= 完整保留当前 tokens
当前 `index.css` 中所有 token 值完整迁移到 `[data-color-scheme="green"]` 块

### 设置页入口
- 「外观」卡片中增加颜色方案选择器（海洋蓝 / 森林绿），带预览

---

## 四、布局百分比化

| 组件 | 当前 | 改为 |
|------|------|------|
| 侧边栏宽度 | `w-16 lg:w-[76px]` | `w-[5vw] min-w-[56px] max-w-[80px]` |
| 内容区偏移 | `pl-16 lg:pl-[76px]` | 使用 calc(var(--sidebar-w)) |
| Header 高度 | `h-[72px]` | `h-[5vh] min-h-[56px] max-h-[72px]` |
| 内容区 max-width | `max-w-[1240px]` | `max-w-[92vw]` |
| 设置页子导航 | `w-[200px]` | `w-[15%] min-w-[160px] max-w-[220px]` |
| 设置页内容区 | `max-w-[720px]` | `max-w-[65%]` |

---

## 五、种子数据通用化

### 保留（已是通用场景）
- 读书笔记（Rust、TypeScript）
- 健身计划、咖啡店清单、书单
- 代码踩坑（useSyncExternalStore、Vite 插件）
- 代码评审 Checklist

### 修改
- `seedNotebooks`: "实习日报" → "日记"，"工作随记" → "工作与项目"
- 5 条日报种子数据：标题 "实习日报 #87~83" → "今日小结 / 昨日小结 / ..."
- 周报/月报模板去实习化措辞
- 报告备注 "由小芽整理" → "由小鱼整理"

### 移除
- `GreetingBanner.tsx` 中 "实习第 N 周" 行
- 种子数据中的 "工作/后端/联调" 等特定行业标签 → 通用标签

---

## 六、用户信息定制
- 默认 userName: `""`（空字符串）
- 头像显示用户名首字（`userName.slice(0,1)` 而非 `slice(-1)`）
- `WelcomeBubble` 内容：小鱼引导用户设置名字
- 无用户名时 GreetingBanner 显示 "你好" 而非 "早上好，"

---

## 七、其他修复
- `<html lang="en">` → `zh-CN`
- `AboutSection`:
  - 版本描述：`v1.0.0 · HarmonyOS 版`
  - 描述文字更新为 "HarmonyOS 原生壳 + Web 技术"
- 启动页背景色 `start_window_background` 与蓝色主题匹配

---

## 实施顺序

1. **Logo / 图标资源**（SVG + 说明 PNG 导出方式）
2. **主题系统**（CSS tokens 重构：蓝色默认 + 绿色切换）
3. **品牌重命名**（全局字符串替换，~20 个文件）
4. **布局百分比化**（Layout / SidebarRail / Settings / Home）
5. **种子数据通用化**（seed.ts）
6. **用户信息定制**（store + GreetingBanner + WelcomeBubble）
7. **其他细节**（lang、About、Data 备份标识等）
