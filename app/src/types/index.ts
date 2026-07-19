/**
 * FishNote — 全局类型定义
 * 所有日期时间统一使用 ISO 字符串（new Date().toISOString()），便于 localStorage 持久化。
 */

/** 便签类型：日报 / 周报 / 月报 / 随手记 */
export type NoteKind = 'daily' | 'weekly' | 'monthly' | 'memo'

export interface Note {
  id: string
  title: string
  /** Markdown 源文 */
  contentMarkdown: string
  notebookId: string
  kind: NoteKind
  tags: string[]
  /** 卡片强调色（可选，hex 或 token，如 '#F59E0B'） */
  color?: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  /** 软删除时间；null 表示未删除（回收站） */
  deletedAt: string | null
  /** 是否由 AI 生成/整理 */
  aiGenerated: boolean
}

export interface Notebook {
  id: string
  name: string
  /** lucide 图标名（如 'BookOpen'），由渲染层映射 */
  icon: string
  count: number
}

export type ReportType = 'daily' | 'weekly' | 'monthly'

export interface Report {
  id: string
  type: ReportType
  title: string
  contentMarkdown: string
  /** 报告覆盖的日期范围（ISO 日期，yyyy-MM-dd） */
  dateRange: { start: string; end: string }
  createdAt: string
  /** 来源便签 id 列表（引用溯源） */
  sources: string[]
}

/** AI 深度思考的单个步骤（回忆书 ThinkingAccordion） */
export interface ThinkingStep {
  id: string
  /** 步骤标题，如「检索相关便签」 */
  label: string
  /** 步骤描述/结果摘要 */
  detail?: string
  durationMs: number
}

/** AI 回答引用的来源（回忆书溯源） */
export interface NoteSource {
  noteId: string
  title: string
  excerpt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinkingSteps?: ThinkingStep[]
  sources?: NoteSource[]
  timestamp: number
}

export interface AISettings {
  /** 'mock' = 内置模拟引擎（离线可演示）；'openai' = OpenAI 兼容 API */
  provider: 'mock' | 'openai'
  baseURL: string
  apiKey: string
  model: string
  temperature: number
  /** 模拟引擎开关（关闭且未配置 API 时，AI 功能降级） */
  mockEnabled: boolean
}

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  /** lucide 图标名 */
  icon: string
  unlockedAt: string | null
}

/** 统计页总览数据（由 store 派生） */
export interface StatsData {
  totalNotes: number
  totalWords: number
  inspiration: number
  inspirationWeek: number
  streakDays: number
  longestStreak: number
  level: number
  xp: number
  xpForNext: number
  /** 日期(yyyy-MM-dd) -> 记录条数（热力图） */
  activity: Record<string, number>
  tokenUsage: TokenUsage
}

/** 首页今日摘要（从当日日报便签解析） */
export interface DailyDigest {
  done: string[]
  issues: string[]
  plans: string[]
}

export type Theme = 'light' | 'dark'
