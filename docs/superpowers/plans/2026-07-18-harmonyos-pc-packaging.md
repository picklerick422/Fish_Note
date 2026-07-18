# 拾光便签 · 鸿蒙 PC 封装实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `app/` React 便签应用封装为鸿蒙 PC（2in1）原生应用：ArkTS + ArkWeb 壳加载 rawfile 内置 Web 产物。

**Architecture:** 单仓库双工程。`app/` 做 2 处适配（HashRouter、downloadBlob 桥接）；新增 `harmony/` DevEco 工程，`Index.ets` 用 Web 组件加载 `resource://rawfile/webapp/index.html`，通过 `javaScriptProxy` 提供文件保存桥、`onShowFileSelector` 接管文件选择；`scripts/sync-webapp.sh` 单向同步构建产物。

**Tech Stack:** React 19 + Vite 7（现有）；ArkTS / ArkWeb / @ohos.file.picker / @ohos.file.fs / @ohos.util（API 9-10 即可，任意近期 DevEco SDK 均满足）。

**Spec:** `docs/superpowers/specs/2026-07-18-harmonyos-pc-packaging-design.md`

**环境约束（重要）:**
- 本仓库位于 virtiofs 挂载，**禁止 chmod**——脚本一律用 `bash scripts/xxx.sh` 执行，不要 `chmod +x`。
- 本环境无 DevEco/hvigor/鸿蒙设备。Task 3 与 Task 7 是**用户人工步骤**；ArkTS 代码（Task 4/5）交付后由 Task 7 在 DevEco 中统一构建验证。
- 项目无 JS 测试框架。Web 侧验证 = `npm run build`（含 tsc 类型检查）+ 浏览器手动回归；不为本次改动引入测试框架（YAGNI）。

---

### Task 1: Web 路由改为 HashRouter

`resource://` 协议无 history 服务，`BrowserRouter` 刷新/直达路径会 404。`HashRouter` 在浏览器与 ArkWeb 下均正常。

**Files:**
- Modify: `app/src/App.tsx:2,26,52`

- [ ] **Step 1: 修改 import 与 JSX 标签**

`app/src/App.tsx` 第 2 行：

```tsx
// 旧
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
// 新
import { HashRouter, Navigate, Route, Routes } from 'react-router'
```

第 26 行 `<BrowserRouter>` → `<HashRouter>`；第 52 行 `</BrowserRouter>` → `</HashRouter>`。共 3 处，无其他文件引用 BrowserRouter（可用 `grep -rn "BrowserRouter" app/src/` 确认为 0 结果）。

- [ ] **Step 2: 构建验证**

Run: `cd app && npm install && npm run build`
Expected: `tsc -b` 无报错，vite build 输出 `dist/` 且以 `✓ built in ...` 结束。

- [ ] **Step 3: 浏览器冒烟（可选但推荐）**

Run: `cd app && npm run preview`，浏览器打开 `http://localhost:4173/`。
Expected: URL 自动带 `#/`；点击侧栏「便签」后 URL 为 `#/notes`；刷新页面仍停留在便签页。

- [ ] **Step 4: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat(web): BrowserRouter 改为 HashRouter，适配 resource:// 协议加载"
```

---

### Task 2: downloadBlob 桥接 + 清空数据跳转修复

两处同文件改动：① 导出文件时若存在鸿蒙壳注入的 `window.fishNoteShell` 则走原生桥；② `doReset` 中 `location.assign('/')` 在 `resource://.../index.html` 下会跳出应用（离开 index.html），改为 hash 复位 + reload。

**Files:**
- Modify: `app/src/pages/settings/DataSection.tsx:39-46`（downloadBlob）、`:214`（doReset 跳转）、`:135`（exportJSON 调用点）、`:151`（exportMarkdown 调用点）

- [ ] **Step 1: 替换 downloadBlob 并新增桥类型声明与 blobToBase64**

将 `DataSection.tsx` 第 39-46 行的 `downloadBlob` 整体替换为：

```tsx
/** 鸿蒙壳注入的原生桥（见 harmony/entry/src/main/ets/pages/Index.ets） */
interface FishNoteShell {
  saveFile: (filename: string, base64: string) => void
}

declare global {
  interface Window {
    fishNoteShell?: FishNoteShell
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1)) // 去掉 data:*;base64, 前缀
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function downloadBlob(filename: string, blob: Blob) {
  // 鸿蒙 ArkWeb 壳内 <a download> 不可用，走原生桥保存
  if (window.fishNoteShell?.saveFile) {
    window.fishNoteShell.saveFile(filename, await blobToBase64(blob))
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

- [ ] **Step 2: 更新两个调用点**

`exportJSON`（原第 135 行附近）：`downloadBlob(` → `void downloadBlob(`（同步函数内 fire-and-forget，显式 void）。
`exportMarkdown`（原第 151 行附近，函数本身已 async）：`downloadBlob(` → `await downloadBlob(`。

- [ ] **Step 3: 修复 doReset 跳转**

原第 214 行：

```tsx
// 旧
setTimeout(() => location.assign('/'), 400)
// 新（hash 路由复位到首页后整页重载；resource:// 与浏览器下均正确）
setTimeout(() => {
  location.hash = '#/'
  location.reload()
}, 400)
```

- [ ] **Step 4: 构建 + lint 验证**

Run: `cd app && npm run build && npm run lint`
Expected: 均无报错。

- [ ] **Step 5: 浏览器回归导出/导入**

Run: `cd app && npm run preview`
Expected: 设置 → 数据管理：「导出完整数据」下载 .json；「导出 Markdown」下载 .zip；导入刚导出的 .json 弹出确认框（浏览器无 fishNoteShell，走原路径，行为不变）；「清空数据」后回到首页 `#/`。

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/settings/DataSection.tsx
git commit -m "feat(web): 导出文件支持鸿蒙壳原生桥；修复清空数据后 hash 路由跳转"
```

---

### Task 3: 在 DevEco Studio 新建壳工程（用户人工步骤）

手写 hvigor/SDK 版本配置易与本机 DevEco 不匹配，由 DevEco 生成骨架最可靠。

**Files:**
- Create: `harmony/`（DevEco 生成整套骨架）

- [ ] **Step 1（用户执行）: 新建工程**

DevEco Studio → File → New → Create Project → **Empty Ability**，参数：

| 项 | 值 |
|---|---|
| Project name | `harmony` |
| Bundle name | `com.fishnote.springnote` |
| Save location | `<仓库根>/Fish_note/harmony` |
| Module name | `entry`（默认） |
| Device type | 勾选 **2in1** 与 **tablet** |
| Model | Stage（默认） |

其余保持默认（Compile SDK 用 DevEco 默认值即可，本方案 API 均为 9-10 级别）。

- [ ] **Step 2: 验证骨架结构**

Run: `ls harmony/entry/src/main/ets/pages/ harmony/entry/src/main/module.json5 harmony/AppScope/app.json5`
Expected: 存在 `Index.ets`、`module.json5`、`app.json5`。

- [ ] **Step 3: Commit 骨架**

```bash
git add harmony/
git commit -m "chore(harmony): DevEco 生成 Empty Ability 工程骨架（2in1/tablet）"
```

---

### Task 4: 壳工程配置（应用名 / deviceTypes / 权限）

**Files:**
- Modify: `harmony/entry/src/main/module.json5`
- Modify: `harmony/AppScope/resources/base/element/string.json`
- Modify: `harmony/entry/src/main/resources/base/element/string.json`（及 `zh_CN`/`en_US` 同名文件，如 DevEco 生成了）

- [ ] **Step 1: module.json5 设置 deviceTypes 与网络权限**

在 `module` 对象内确认/修改（保留生成文件其余字段不动）：

```json5
"deviceTypes": [
  "2in1",
  "tablet"
],
"requestPermissions": [
  {
    "name": "ohos.permission.INTERNET"
  }
],
```

说明：`INTERNET` 为 system_grant 权限，无需弹窗；供设置页 OpenAI 兼容 API 使用，mock 引擎不联网。

- [ ] **Step 2: 应用与窗口显示名改为「拾光便签」**

`harmony/AppScope/resources/base/element/string.json` 中 `app_name` 的 value → `拾光便签`；
`harmony/entry/src/main/resources/base/element/string.json` 中 `EntryAbility_label` 的 value → `拾光便签`；
若存在 `resources/zh_CN/element/string.json`、`resources/en_US/element/string.json`，同名条目一并改（en_US 可写 `FishNote`）。

- [ ] **Step 3: Commit**

```bash
git add harmony/entry/src/main/module.json5 harmony/AppScope/resources harmony/entry/src/main/resources
git commit -m "chore(harmony): 应用名拾光便签、deviceTypes 2in1/tablet、INTERNET 权限"
```

---

### Task 5: Index.ets — ArkWeb 壳页面

**Files:**
- Modify: `harmony/entry/src/main/ets/pages/Index.ets`（整体替换 DevEco 生成的 Hello World）

- [ ] **Step 1: 整体替换 Index.ets**

```ts
/**
 * 拾光便签 ArkWeb 壳：
 * - 加载 rawfile 内置 Web 产物（resource://rawfile/webapp/）
 * - javaScriptProxy 注入 window.fishNoteShell.saveFile（导出备份）
 * - onShowFileSelector 接管 <input type="file">（导入备份，过滤 .json）
 */
import { webview } from '@kit.ArkWeb'
import { fileIo as fs, picker } from '@kit.CoreFileKit'
import { util } from '@kit.ArkTS'
import { BusinessError } from '@kit.BasicServicesKit'
import { hilog } from '@kit.PerformanceAnalysisKit'
import { common } from '@kit.AbilityKit'

const TAG = 'FishNoteShell'

/** 保存 base64 内容到用户选择的位置（DocumentSaverPicker） */
async function saveToUserFile(context: common.Context, filename: string, base64: string): Promise<void> {
  try {
    const saverPicker = new picker.DocumentSaverPicker(context)
    const opt = new picker.DocumentSaveOptions()
    opt.newFileNames = [filename]
    const uris = await saverPicker.save(opt)
    if (!uris || uris.length === 0) {
      return // 用户取消
    }
    const data = new util.Base64Helper().decodeSync(base64)
    const file = fs.openSync(uris[0], fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
    fs.writeSync(file.fd, data.buffer)
    fs.closeSync(file)
    hilog.info(0x0000, TAG, `saved ${filename}, ${data.length} bytes`)
  } catch (e) {
    const err = e as BusinessError
    hilog.error(0x0000, TAG, `saveFile failed: ${err.code} ${err.message}`)
  }
}

/** 注入到网页 window.fishNoteShell 的原生桥（只声明方法，不声明属性） */
class FishNoteShell {
  private context: common.Context

  constructor(context: common.Context) {
    this.context = context
  }

  saveFile(filename: string, base64: string): void {
    // 同步方法内发起异步保存，避免阻塞 Web 渲染
    saveToUserFile(this.context, filename, base64)
  }
}

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController()
  private shell: FishNoteShell = new FishNoteShell(getContext(this))

  /** 接管网页文件选择：拉起系统文档选择器，过滤 .json 备份 */
  private async pickFile(event: OnShowFileSelectorEvent): Promise<void> {
    try {
      const viewPicker = new picker.DocumentViewPicker(getContext(this))
      const opt = new picker.DocumentSelectOptions()
      opt.maxSelectNumber = 1
      opt.fileSuffixFilters = ['备份 JSON|.json']
      const uris = await viewPicker.select(opt)
      event.result.handleFileList(uris ?? [])
    } catch (e) {
      const err = e as BusinessError
      hilog.error(0x0000, TAG, `pickFile failed: ${err.code} ${err.message}`)
      event.result.handleFileList([])
    }
  }

  build() {
    Column() {
      Web({ src: 'resource://rawfile/webapp/index.html', controller: this.controller })
        .domStorageAccess(true) // localStorage 持久化（默认 false，必须开启）
        .javaScriptAccess(true)
        .zoomAccess(false) // 桌面应用禁用手势缩放
        .javaScriptProxy({
          object: this.shell,
          name: 'fishNoteShell',
          methodList: ['saveFile'],
          controller: this.controller,
        })
        .onShowFileSelector((event) => {
          if (event) {
            this.pickFile(event)
          }
          return true // 返回 true 表示应用接管文件选择
        })
        .onErrorReceive((event) => {
          if (event) {
            hilog.error(0x0000, TAG,
              `load error: ${event.error.getErrorCode()} ${event.error.getErrorInfo()}`)
          }
        })
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
```

实现要点（评审时对照）：
- `javaScriptProxy` 只能注册一个对象、只能声明方法（文档约束），`methodList` 同步列表非空即合法。
- 壳为单常驻页面，不调用 `deleteJavaScriptRegister`（无反复注册场景，无泄漏路径）。
- `OnShowFileSelectorEvent`、`FileSelectorResult` 为 ArkUI 全局声明，无需 import。
- Web 数据（localStorage）随应用卸载删除；备份手段 = 导出 JSON。

- [ ] **Step 2: DevEco 静态检查（用户执行，可与 Task 7 合并）**

DevEco 打开 `harmony/`，等待 Sync 完成。
Expected: `Index.ets` 无红色报错（编译验证统一在 Task 7）。

- [ ] **Step 3: Commit**

```bash
git add harmony/entry/src/main/ets/pages/Index.ets
git commit -m "feat(harmony): ArkWeb 壳页面——加载 rawfile、文件保存桥、文件选择接管"
```

---

### Task 6: 产物同步脚本 + gitignore

**Files:**
- Create: `scripts/sync-webapp.sh`
- Create: `.gitignore`（仓库根，若不存在）

- [ ] **Step 1: 写 scripts/sync-webapp.sh**

```bash
#!/usr/bin/env bash
# 构建 Web 应用并同步产物到鸿蒙壳 rawfile（用 bash 执行，本目录禁止 chmod）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/app"
DEST="$ROOT/harmony/entry/src/main/resources/rawfile/webapp"

cd "$APP_DIR"
npm run build

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$APP_DIR/dist/." "$DEST/"

echo "已同步 $(find "$DEST" -type f | wc -l) 个文件 -> $DEST"
```

- [ ] **Step 2: 根 .gitignore 排除同步产物**

创建仓库根 `.gitignore`（内容如下；`app/.gitignore` 已各自覆盖 app 侧）：

```gitignore
# Web 产物同步目标（由 scripts/sync-webapp.sh 生成）
harmony/entry/src/main/resources/rawfile/webapp/
```

- [ ] **Step 3: 运行脚本验证**

Run: `bash scripts/sync-webapp.sh`
Expected: 输出「已同步 N 个文件」（N ≥ 5：index.html + assets/*）；`ls harmony/entry/src/main/resources/rawfile/webapp/index.html` 存在；`git status` 不显示 webapp/ 下文件（gitignore 生效）。

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-webapp.sh .gitignore
git commit -m "chore: Web 产物同步脚本与 rawfile 产物 gitignore"
```

---

### Task 7: 真机构建与冒烟验证（用户人工步骤）

**Files:** 无代码改动；发现问题则回到对应 Task 修复。

- [ ] **Step 1: 同步最新产物**

Run: `bash scripts/sync-webapp.sh`

- [ ] **Step 2（用户执行）: DevEco 构建安装**

DevEco 打开 `harmony/` → 鸿蒙 PC 开启开发者模式并 USB/无线连接 → File > Project Structure > Signing Configs 勾选 Automatically generate signature → Run ▶。
Expected: 应用「拾光便签」在鸿蒙 PC 启动并显示首页工作台。

- [ ] **Step 3（用户执行）: 冒烟清单（对照 spec §7）**

1. 六页面导航正常（侧栏点击 + `g h/n/m/r/s` 快捷键）
2. 新建/编辑/删除便签正常
3. **完全退出应用重开，数据仍在**（domStorageAccess 持久化关键验证）
4. 首页快速记录 → mock AI 流式结构化输出正常
5. 设置 → 导出完整数据：弹出系统保存框，保存的 .json 可用文本编辑器打开且为合法 JSON
6. 设置 → 导入：弹出系统文件选择器（仅 .json 可选），导入刚导出的备份成功并刷新
7. 深色主题切换正常
8. （可选，有 API Key 时）设置 AI 供应商为 OpenAI 兼容，回忆书提问收到流式回答
9. 导出 Markdown zip：保存成功且 zip 可解压

- [ ] **Step 4: 记录结果**

任何一项失败：记录现象 + `hilog` 输出（DevEco Log 面板过滤 `FishNoteShell`），回到对应 Task 修复后重跑本清单。全部通过后：

```bash
git commit --allow-empty -m "chore: 鸿蒙 PC 真机冒烟验证通过"
```
