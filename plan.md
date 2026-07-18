# AI 便签软件（StickyNote AI）开发计划

## 需求分析
- 参考 GitHub 项目 SpringNote (Radiant303/SpringNote) 的功能：桌面便签 + AI 辅助
- 先做成 Web 应用（React + Vite + Tailwind + shadcn/ui），后续用户自行用 Electron 封装
- 界面要求：简洁、美观
- 开发"所有需要的功能"

## 核心功能设计
1. **便签 CRUD**：创建、编辑、删除便签，富文本/Markdown 支持
2. **便签管理**：颜色标记、置顶、搜索、标签分类、归档
3. **多视图**：网格卡片视图（便签墙）、列表视图
4. **AI 功能**（预留可插拔 AI 接口，支持本地 mock + 可接入真实 API）：
   - AI 续写/润色便签内容
   - AI 总结便签
   - AI 生成标签/标题建议
   - AI 待办提取（从文字中提取任务）
   - AI 智能问答（基于便签内容）
5. **待办清单**：便签内嵌 checklist
6. **数据持久化**：localStorage（Electron 封装后可平滑迁移到本地文件）
7. **体验细节**：深色模式、拖拽排序、快捷键、导入导出、回收站

## 技术栈
- React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Framer Motion 动画、Lucide 图标
- 状态管理：zustand
- AI 层：抽象 AI Provider 接口（默认内置本地模拟引擎，可一键切换 OpenAI 兼容 API）

## 执行阶段
### Stage 1 — 加载 vibecoding-webapp-swarm 技能
读取技能文件，按其规范初始化项目与工作流。

### Stage 2 — 设计与实现（swarm 协作）
按技能规范派发设计/编码子代理：
- 设计：简洁美观的便签墙 UI 风格定调
- 编码：核心便签系统 + AI 功能 + 持久化

### Stage 3 — 构建验证
构建项目、修复错误，确保可运行。

### Stage 4 — 交付
通过 website_version_manager 保存版本，给出预览地址与 Electron 封装建议。
