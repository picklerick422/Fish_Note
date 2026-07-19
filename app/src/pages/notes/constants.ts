/**
 * 便签页共享常量与小工具
 */
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Briefcase,
  CalendarCheck,
  Coffee,
  Compass,
  FileText,
  Folder,
  Lightbulb,
  Star,
} from 'lucide-react'
import type { Note, NoteKind } from '@/types'
import { wordCount } from '@/lib/date'

/* ---------------- 便签颜色（pastel 六色，notes.md §二） ---------------- */

export interface NoteColor {
  key: string
  label: string
  /** 浅色主题底色 */
  light: string
  /** 深色主题底色（低透明度铺底，保证墨色可读） */
  dark: string
}

export const NOTE_COLORS: NoteColor[] = [
  { key: 'white', label: '白', light: '#FFFFFF', dark: 'rgba(255,255,255,0.04)' },
  { key: 'yellow', label: '鹅黄', light: '#FEF9C3', dark: 'rgba(254,249,195,0.10)' },
  { key: 'mint', label: '薄荷', light: '#DCFCE7', dark: 'rgba(220,252,231,0.10)' },
  { key: 'sky', label: '天蓝', light: '#DBEAFE', dark: 'rgba(219,234,254,0.10)' },
  { key: 'pink', label: '樱粉', light: '#FCE7F3', dark: 'rgba(252,231,243,0.10)' },
  { key: 'lavender', label: '薰紫', light: '#F3E8FF', dark: 'rgba(243,232,255,0.12)' },
]

/** 用户设置的颜色存 light hex；根据主题返回卡片底色 */
export function colorBg(hex: string | undefined, isDark: boolean): string | undefined {
  if (!hex) return undefined
  const c = NOTE_COLORS.find((x) => x.light.toLowerCase() === hex.toLowerCase())
  if (!c) return hex
  return isDark ? c.dark : c.light
}

/** 便签墙默认色：按 id 稳定散列取一枚 pastel（白色除外），让墙天然多彩 */
export function wallColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return NOTE_COLORS[1 + (h % (NOTE_COLORS.length - 1))].light
}

/** 便签墙默认微倾角：±1°，按 id 稳定 */
export function wallTilt(id: string): number {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 131 + id.charCodeAt(i)) >>> 0
  return (h % 21) / 10 - 1 // -1.0 ~ +1.0
}

/* ---------------- 分类 ---------------- */

export const KIND_DOT: Record<NoteKind, string> = {
  daily: 'var(--brand-500)',
  weekly: 'var(--blue)',
  monthly: 'var(--ai-500)',
  memo: 'var(--ink-400)',
}

export const KIND_LABEL: Record<NoteKind, string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
  memo: '随手记',
}

/* ---------------- 笔记本图标 ---------------- */

const NOTEBOOK_ICONS: Record<string, LucideIcon> = {
  CalendarCheck,
  Briefcase,
  BookOpen,
  Coffee,
  Compass,
  Folder,
  FileText,
  Lightbulb,
  Star,
}

export function notebookIcon(name: string): LucideIcon {
  return NOTEBOOK_ICONS[name] ?? Folder
}

/* ---------------- 文本工具 ---------------- */

/** 列表摘要：去掉 Markdown 标记后的纯文本 */
export function plainExcerpt(markdown: string, max = 80): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*`\-|[\]()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function noteWordCount(note: Note): number {
  return wordCount(note.contentMarkdown)
}

/** AI 幽灵标题建议：取首个标题行或首行正文 */
export function suggestTitle(content: string): string {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const heading = lines.find((l) => /^#{1,6}\s+/.test(l))
  const plain = lines.find((l) => !l.startsWith('```') && !/^[-*>#|]/.test(l))
  let t = (heading ? heading.replace(/^#+\s*/, '') : plain) ?? ''
  t = t.replace(/[*`~]/g, '').trim()
  return t.slice(0, 30)
}

/** AI 标签建议：轻量关键词规则（与模拟引擎风格一致） */
const TAG_HINTS: Array<[RegExp, string]> = [
  [/接口|联调/, '联调'],
  [/后端|服务端/, '后端'],
  [/前端|React|Vue|组件|页面/i, '前端'],
  [/测试|用例/, '测试'],
  [/文档/, '文档'],
  [/bug|报错|修复/i, '调试'],
  [/学习|读书|笔记|书/, '学习'],
  [/需求|评审|站会|周会|工作|实习/, '工作'],
  [/健身|跑步|运动/, '健身'],
  [/生活|咖啡|电影|吃/, '生活'],
]

export function suggestTags(content: string, existing: string[]): string[] {
  const out: string[] = []
  for (const [re, tag] of TAG_HINTS) {
    if (re.test(content) && !existing.includes(tag) && !out.includes(tag)) out.push(tag)
    if (out.length >= 3) break
  }
  return out
}

/* ---------------- 排序/筛选类型 ---------------- */

export type SortBy = 'new' | 'old' | 'words'

export type NavSel =
  | { t: 'quick'; k: 'all' | 'today' | 'pinned' }
  | { t: 'notebook'; id: string }
  | { t: 'kind'; k: NoteKind }
  | { t: 'tag'; tag: string }
  | { t: 'trash' }

export function sameSel(a: NavSel, b: NavSel): boolean {
  if (a.t !== b.t) return false
  if (a.t === 'quick' && b.t === 'quick') return a.k === b.k
  if (a.t === 'notebook' && b.t === 'notebook') return a.id === b.id
  if (a.t === 'kind' && b.t === 'kind') return a.k === b.k
  if (a.t === 'tag' && b.t === 'tag') return a.tag === b.tag
  return true
}
