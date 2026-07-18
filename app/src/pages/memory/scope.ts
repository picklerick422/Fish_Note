import type { Note, NoteSource } from '@/types'

/** 回忆书检索范围（页头 SegmentedControl / 输入条 chip 共用） */
export type MemoryScope = 'all' | 'daily' | 'recent30'

export const SCOPE_OPTIONS: Array<{ value: MemoryScope; label: string }> = [
  { value: 'all', label: '全部便签' },
  { value: 'daily', label: '仅日报' },
  { value: 'recent30', label: '近 30 天' },
]

export const scopeLabel = (scope: MemoryScope): string =>
  SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? '全部便签'

const THIRTY_DAYS = 30 * 24 * 3600 * 1000

/** 便签是否落在当前记忆范围内（回收站内容永远排除） */
export function noteInScope(note: Note, scope: MemoryScope): boolean {
  if (note.deletedAt) return false
  if (scope === 'daily') return note.kind === 'daily'
  if (scope === 'recent30') return Date.now() - new Date(note.createdAt).getTime() <= THIRTY_DAYS
  return true
}

/** 本地过滤 AI 引用来源，使其与当前记忆范围一致 */
export function filterSourcesByScope(
  sources: NoteSource[],
  scope: MemoryScope,
  getById: (id: string) => Note | undefined,
): NoteSource[] {
  if (scope === 'all') return sources
  return sources.filter((s) => {
    const note = getById(s.noteId)
    return note ? noteInScope(note, scope) : false
  })
}
