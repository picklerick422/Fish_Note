/**
 * 统计页时间范围（stats.md：全部 / 近 30 天 / 上月 / 上季度 / 自定义…）
 * 作用于大数字卡与全部图表（年度热力图除外）。
 */
import {
  endOfMonth,
  endOfQuarter,
  format,
  startOfMonth,
  startOfQuarter,
  subDays,
  subMonths,
  subQuarters,
} from 'date-fns'

export type RangeKey = 'all' | '30d' | 'lastMonth' | 'lastQuarter' | 'custom'

export interface DateRange {
  /** yyyy-MM-dd；null 表示不限（全部） */
  start: string | null
  end: string | null
}

export const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: 'all', label: '全部' },
  { value: '30d', label: '近 30 天' },
  { value: 'lastMonth', label: '上月' },
  { value: 'lastQuarter', label: '上季度' },
  { value: 'custom', label: '自定义…' },
]

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

export function resolveRange(key: RangeKey, custom?: DateRange | null): DateRange {
  const today = new Date()
  switch (key) {
    case 'all':
      return { start: null, end: null }
    case '30d':
      return { start: fmt(subDays(today, 29)), end: fmt(today) }
    case 'lastMonth': {
      const m = subMonths(today, 1)
      return { start: fmt(startOfMonth(m)), end: fmt(endOfMonth(m)) }
    }
    case 'lastQuarter': {
      const q = subQuarters(today, 1)
      return { start: fmt(startOfQuarter(q)), end: fmt(endOfQuarter(q)) }
    }
    case 'custom':
      return custom && custom.start && custom.end ? custom : { start: fmt(subDays(today, 6)), end: fmt(today) }
  }
}

/** 与当前范围等长的上一周期（用于 ▲/▼ 对比） */
export function previousRange(range: DateRange): DateRange | null {
  if (!range.start || !range.end) return null
  const start = new Date(range.start + 'T00:00:00')
  const end = new Date(range.end + 'T00:00:00')
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return { start: fmt(subDays(start, days)), end: fmt(subDays(end, days)) }
}

/** 范围内包含的天数；全部（不限）时返回 null */
export function rangeDays(range: DateRange): number | null {
  if (!range.start || !range.end) return null
  const start = new Date(range.start + 'T00:00:00')
  const end = new Date(range.end + 'T00:00:00')
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
}

/** 统计 activity 在范围内的总条数；start/end 为 null 表示不限 */
export function sumActivity(activity: Record<string, number>, range: DateRange): number {
  let sum = 0
  for (const [key, n] of Object.entries(activity)) {
    if (range.start && key < range.start) continue
    if (range.end && key > range.end) continue
    sum += n
  }
  return sum
}

/** 快捷自定义项：近 7 天 / 近 90 天 / 今年 */
export function quickCustom(kind: '7d' | '90d' | 'year'): DateRange {
  const today = new Date()
  if (kind === '7d') return { start: fmt(subDays(today, 6)), end: fmt(today) }
  if (kind === '90d') return { start: fmt(subDays(today, 89)), end: fmt(today) }
  return { start: fmt(new Date(today.getFullYear(), 0, 1)), end: fmt(today) }
}
