import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Note, Notebook, NoteKind } from '@/types'
import { uid } from '@/lib/utils'
import { seedNotebooks, seedNotes } from './seed'

export interface NoteFilter {
  /** 标题/正文/标签模糊搜索 */
  query?: string
  notebookId?: string | 'all'
  kind?: NoteKind | 'all'
  tag?: string
  /** true 时只返回回收站内容 */
  onlyDeleted?: boolean
  /** true 时同时包含已删除 */
  includeDeleted?: boolean
}

export interface NewNoteInput {
  title: string
  contentMarkdown: string
  notebookId?: string
  kind?: NoteKind
  tags?: string[]
  color?: string
  pinned?: boolean
  aiGenerated?: boolean
}

interface NotesState {
  notes: Note[]
  notebooks: Notebook[]
  /** 新建便签，返回创建后的完整对象 */
  addNote: (input: NewNoteInput) => Note
  updateNote: (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) => void
  /** 软删除（进回收站） */
  deleteNote: (id: string) => void
  /** 从回收站恢复 */
  restoreNote: (id: string) => void
  /** 彻底删除 */
  destroyNote: (id: string) => void
  togglePin: (id: string) => void
  addTag: (id: string, tag: string) => void
  removeTag: (id: string, tag: string) => void
  addNotebook: (name: string, icon?: string) => Notebook
  updateNotebook: (id: string, patch: Partial<Omit<Notebook, 'id'>>) => void
  /** 删除笔记本；其中便签移到第一个剩余笔记本 */
  deleteNotebook: (id: string) => void
  getById: (id: string) => Note | undefined
  /** 筛选 + 搜索；结果按 置顶优先 → updatedAt 倒序 */
  searchNotes: (filter?: NoteFilter) => Note[]
  /** 全部标签（去重，按出现频率降序） */
  allTags: () => string[]
}

function withCounts(notebooks: Notebook[], notes: Note[]): Notebook[] {
  return notebooks.map((nb) => ({
    ...nb,
    count: notes.filter((n) => n.notebookId === nb.id && !n.deletedAt).length,
  }))
}

function applyFilter(notes: Note[], filter?: NoteFilter): Note[] {
  const f = filter ?? {}
  const q = f.query?.trim().toLowerCase()
  const list = notes.filter((n) => {
    if (f.onlyDeleted ? !n.deletedAt : n.deletedAt && !f.includeDeleted) return false
    if (f.notebookId && f.notebookId !== 'all' && n.notebookId !== f.notebookId) return false
    if (f.kind && f.kind !== 'all' && n.kind !== f.kind) return false
    if (f.tag && !n.tags.includes(f.tag)) return false
    if (q) {
      const hay = `${n.title}\n${n.contentMarkdown}\n${n.tags.join(' ')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: seedNotes(),
      notebooks: seedNotebooks(),

      addNote: (input) => {
        const now = new Date().toISOString()
        const note: Note = {
          id: uid('note'),
          title: input.title.trim() || '未命名便签',
          contentMarkdown: input.contentMarkdown,
          notebookId: input.notebookId ?? get().notebooks[0]?.id ?? 'nb-daily',
          kind: input.kind ?? 'memo',
          tags: input.tags ?? [],
          color: input.color,
          pinned: input.pinned ?? false,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          aiGenerated: input.aiGenerated ?? false,
        }
        set((s) => ({
          notes: [note, ...s.notes],
          notebooks: withCounts(s.notebooks, [note, ...s.notes]),
        }))
        return note
      },

      updateNote: (id, patch) =>
        set((s) => {
          const notes = s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, id: n.id, createdAt: n.createdAt, updatedAt: new Date().toISOString() } : n,
          )
          return { notes, notebooks: withCounts(s.notebooks, notes) }
        }),

      deleteNote: (id) =>
        set((s) => {
          const notes = s.notes.map((n) =>
            n.id === id ? { ...n, deletedAt: new Date().toISOString(), pinned: false } : n,
          )
          return { notes, notebooks: withCounts(s.notebooks, notes) }
        }),

      restoreNote: (id) =>
        set((s) => {
          const notes = s.notes.map((n) => (n.id === id ? { ...n, deletedAt: null } : n))
          return { notes, notebooks: withCounts(s.notebooks, notes) }
        }),

      destroyNote: (id) =>
        set((s) => {
          const notes = s.notes.filter((n) => n.id !== id)
          return { notes, notebooks: withCounts(s.notebooks, notes) }
        }),

      togglePin: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
        })),

      addTag: (id, tag) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id && !n.tags.includes(tag) ? { ...n, tags: [...n.tags, tag] } : n,
          ),
        })),

      removeTag: (id, tag) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, tags: n.tags.filter((t) => t !== tag) } : n,
          ),
        })),

      addNotebook: (name, icon = 'Folder') => {
        const notebook: Notebook = { id: uid('nb'), name: name.trim() || '未命名笔记本', icon, count: 0 }
        set((s) => ({ notebooks: [...s.notebooks, notebook] }))
        return notebook
      },

      updateNotebook: (id, patch) =>
        set((s) => ({
          notebooks: s.notebooks.map((nb) => (nb.id === id ? { ...nb, ...patch, id: nb.id } : nb)),
        })),

      deleteNotebook: (id) =>
        set((s) => {
          const rest = s.notebooks.filter((nb) => nb.id !== id)
          if (rest.length === 0 || rest.length === s.notebooks.length) return s
          const fallback = rest[0].id
          const notes = s.notes.map((n) => (n.notebookId === id ? { ...n, notebookId: fallback } : n))
          return { notes, notebooks: withCounts(rest, notes) }
        }),

      getById: (id) => get().notes.find((n) => n.id === id),

      searchNotes: (filter) => applyFilter(get().notes, filter),

      allTags: () => {
        const freq = new Map<string, number>()
        for (const n of get().notes) {
          if (n.deletedAt) continue
          for (const t of n.tags) freq.set(t, (freq.get(t) ?? 0) + 1)
        }
        return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
      },
    }),
    { name: 'sg-notes', version: 1 },
  ),
)

/** 便捷 hook：按 id 订阅单条便签 */
export const useNoteById = (id: string | undefined) =>
  useNotesStore((s) => (id ? s.notes.find((n) => n.id === id) : undefined))
