/**
 * 从日报 Markdown 中解析「完成事项 / 问题记录 / 明日计划」三栏摘要。
 * 依赖统一的章节标题约定（mockEngine 与种子数据均遵循该格式）。
 */
import { format } from 'date-fns'
import type { DailyDigest, Note } from '@/types'

const SECTION_PATTERNS: Array<{ key: keyof DailyDigest; re: RegExp }> = [
  { key: 'done', re: /完成事项|今日完成|已完成|本周完成|本月完成/ },
  { key: 'issues', re: /问题记录|问题与风险|阻塞|遇到的坑/ },
  { key: 'plans', re: /明日计划|下周计划|待办|计划/ },
]

export function parseDailyDigest(markdown: string): DailyDigest {
  const digest: DailyDigest = { done: [], issues: [], plans: [] }
  let current: keyof DailyDigest | null = null
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim()
    const heading = line.match(/^#{1,4}\s*(.+)$/)
    if (heading) {
      current = null
      for (const s of SECTION_PATTERNS) {
        if (s.re.test(heading[1])) {
          current = s.key
          break
        }
      }
      continue
    }
    const item = line.match(/^[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/)
    if (item && current) {
      const text = item[1].trim()
      if (text && !/^(暂无|无)/.test(text)) digest[current].push(text)
    }
  }
  return digest
}

/** 今日日报便签（kind=daily 且今天创建、未删除） */
export function isTodayDaily(note: Note): boolean {
  return (
    note.kind === 'daily' &&
    !note.deletedAt &&
    format(new Date(note.createdAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  )
}

/** 合并多篇日报的摘要（去重） */
export function mergeDigests(notes: Note[]): DailyDigest {
  const merged: DailyDigest = { done: [], issues: [], plans: [] }
  for (const note of notes) {
    const d = parseDailyDigest(note.contentMarkdown)
    for (const key of ['done', 'issues', 'plans'] as const) {
      for (const item of d[key]) {
        if (!merged[key].includes(item)) merged[key].push(item)
      }
    }
  }
  return merged
}
