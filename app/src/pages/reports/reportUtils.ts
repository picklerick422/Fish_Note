/**
 * 报告中心工具函数：日期范围预设、数据源收集、标题/摘要/TOC 提取、导出。
 * 对应 reports.md：日报=当天随手记/日报便签；周报=范围内日报便签；月报=本月周报便签。
 */
import {
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import type { Note, NoteKind, ReportType } from '@/types'
import type { TagType } from '@/components/shared/Tag'

export interface DateRange {
  start: string
  end: string
}

export interface TypeMeta {
  label: string
  /** Tag 组件类型（日报绿 / 周报蓝 / 月报紫） */
  tag: TagType
  /** 数据源便签 kind */
  sourceKinds: NoteKind[]
  /** 数据计量名词，如「基于 5 篇日报」 */
  sourceNoun: string
  /** 生成所需最少数据源篇数 */
  minSources: number
  /** 配置阶段类型卡描述 */
  desc: string
}

export const TYPE_META: Record<ReportType, TypeMeta> = {
  daily: {
    label: '日报',
    tag: 'daily',
    sourceKinds: ['memo', 'daily'],
    sourceNoun: '篇便签',
    minSources: 1,
    desc: '汇总当天随手记与日报，整理为结构化日报',
  },
  weekly: {
    label: '周报',
    tag: 'weekly',
    sourceKinds: ['daily'],
    sourceNoun: '篇日报',
    minSources: 3,
    desc: '基于所选周的日报便签，织出一周脉络',
  },
  monthly: {
    label: '月报',
    tag: 'monthly',
    sourceKinds: ['weekly'],
    sourceNoun: '篇周报',
    minSources: 1,
    desc: '基于本月的周报便签，沉淀月度复盘',
  },
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

/* ---------------- 日期范围预设 ---------------- */

export interface RangePreset {
  key: string
  label: string
  getRange: () => DateRange
}

const WEEK_OPTS = { weekStartsOn: 1 as const }

function weekRange(offset: number): DateRange {
  const ref = subWeeks(new Date(), offset)
  return { start: dayKey(startOfWeek(ref, WEEK_OPTS)), end: dayKey(endOfWeek(ref, WEEK_OPTS)) }
}

function monthRange(offset: number): DateRange {
  const ref = subMonths(new Date(), offset)
  return { start: dayKey(startOfMonth(ref)), end: dayKey(endOfMonth(ref)) }
}

export const RANGE_PRESETS: Record<ReportType, RangePreset[]> = {
  daily: [
    { key: 'today', label: '今天', getRange: () => ({ start: dayKey(new Date()), end: dayKey(new Date()) }) },
    {
      key: 'yesterday',
      label: '昨天',
      getRange: () => ({ start: dayKey(subDays(new Date(), 1)), end: dayKey(subDays(new Date(), 1)) }),
    },
  ],
  weekly: [
    { key: 'this-week', label: '本周', getRange: () => weekRange(0) },
    { key: 'last-week', label: '上周', getRange: () => weekRange(1) },
  ],
  monthly: [
    { key: 'this-month', label: '本月', getRange: () => monthRange(0) },
    { key: 'last-month', label: '上月', getRange: () => monthRange(1) },
  ],
}

/* ---------------- 数据源收集 ---------------- */

/** 按类型与日期范围收集参与生成的便签（按创建时间升序） */
export function collectSources(type: ReportType, range: DateRange, notes: Note[]): Note[] {
  const kinds = TYPE_META[type].sourceKinds
  return notes
    .filter((n) => {
      if (n.deletedAt || !kinds.includes(n.kind)) return false
      const day = format(new Date(n.createdAt), 'yyyy-MM-dd')
      return day >= range.start && day <= range.end
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/* ---------------- 标题 / 范围文案 ---------------- */

/** 生成报告标题：5月19日 · 日报 / 第 21 周周报 / 5 月月报 */
export function reportTitle(type: ReportType, range: DateRange): string {
  if (type === 'daily') return `${format(new Date(range.end + 'T00:00:00'), 'M月d日')} · 日报`
  // 周报：用范围末日期取 ISO 周（周一~周日范围内 end 必属同一周，且兼容种子数据的周日起点）
  if (type === 'weekly') return `第 ${getISOWeek(new Date(range.end + 'T00:00:00'))} 周周报`
  return `${format(new Date(range.start + 'T00:00:00'), 'M')} 月月报`
}

/** 日期范围展示：日报单日；周报/月报「5月12日 – 5月18日」 */
export function formatRange(range: DateRange): string {
  const s = new Date(range.start + 'T00:00:00')
  const e = new Date(range.end + 'T00:00:00')
  if (range.start === range.end) return format(s, 'M月d日')
  return `${format(s, 'M月d日')} – ${format(e, 'M月d日')}`
}

/* ---------------- 摘要 / TOC / 字数 ---------------- */

/** 卡片用 AI 摘要：优先取前两条列表项，其次首段正文 */
export function extractSummary(markdown: string, maxLen = 90): string {
  const items: string[] = []
  let firstPara = ''
  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('>')) continue
    const li = line.match(/^[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/)
    if (li) {
      if (items.length < 2 && !/^(暂无|无)/.test(li[1])) items.push(li[1].trim())
    } else if (!firstPara) {
      firstPara = line
    }
    if (items.length >= 2) break
  }
  const text = items.length > 0 ? items.join('；') : firstPara
  const clean = text.replace(/[#>*`|[\]()]/g, '').replace(/\s+/g, ' ').trim()
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean
}

export interface TocItem {
  id: string
  depth: 2 | 3
  text: string
}

/** TOC 锚点 id：与 ReportMarkdown 中按行号生成的 id 一致 */
export const tocId = (line: number) => `mdh-${line}`

/** 从 Markdown 提取 h2/h3 目录（行号即锚点依据） */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = []
  const lines = markdown.split('\n')
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/)
    if (m) {
      const text = m[2]
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .trim()
      items.push({ id: tocId(i + 1), depth: m[1].length as 2 | 3, text })
    }
  }
  return items
}

/** 千分位数字 */
export const fmtNum = (n: number) => n.toLocaleString('en-US')

/* ---------------- 导出 ---------------- */

/** 浏览器下载 .md 文件 */
export function downloadMarkdown(title: string, markdown: string) {
  const safe = title.replace(/[\\/:*?"<>|\s]+/g, '')
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe || '报告'}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
