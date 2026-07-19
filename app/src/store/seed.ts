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
