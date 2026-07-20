/**
 * 便签页 /notes —— 三栏沉浸式编辑器：
 * 左 笔记本导航（240px）｜中 便签列表（260~560px 可拖，列表/便签墙双视图）｜右 Markdown 编辑器。
 * URL 协议：?new=1 新建 · ?open=<id> 打开 · ?date=yyyy-MM-dd 按日期筛选。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { format, isToday, parseISO } from 'date-fns'
import { Plus, Search, Sparkles } from 'lucide-react'
import { usePageHeader } from '@/components/Layout'
import Kbd from '@/components/shared/Kbd'
import { Button } from '@/components/ui/button'
import { wordCount } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useNoteById, useNotesStore } from '@/store/useNotesStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useUIStore } from '@/store/useUIStore'
import type { NoteKind } from '@/types'
import EditorPane from './notes/EditorPane'
import NotebookNav, { type NavCounts } from './notes/NotebookNav'
import NoteListPanel, { type ListView } from './notes/NoteListPanel'
import type { NavSel, SortBy } from './notes/constants'

const colIn = (i: number) => ({
  initial: { x: -16, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { delay: i * 0.09, duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
})

export default function Notes() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const togglePalette = useUIStore((s) => s.togglePalette)
  const theme = useSettingsStore((s) => s.theme)
  const isDark = theme === 'dark'

  const notes = useNotesStore((s) => s.notes)
  const notebooks = useNotesStore((s) => s.notebooks)
  const addNote = useNotesStore((s) => s.addNote)

  /* ---------------- 页面状态 ---------------- */
  const [sel, setSel] = useState<NavSel>({ t: 'quick', k: 'all' })
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('new')
  const [view, setView] = useState<ListView>('list')
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [focusMode, setFocusMode] = useState(false)
  const [listWidth, setListWidth] = useState(300)
  const [flashId, setFlashId] = useState<string | undefined>()
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  const selectedNote = useNoteById(selectedId)

  /* ---------------- 新建便签 ---------------- */
  const createNote = useCallback(() => {
    const kind = sel.t === 'kind' ? sel.k : 'memo'
    const notebookId = sel.t === 'notebook' ? sel.id : undefined
    const note = addNote({ title: '', contentMarkdown: '', kind, notebookId })
    if (sel.t === 'trash') setSel({ t: 'quick', k: 'all' })
    setSelectedId(note.id)
    setFlashId(note.id)
    setTimeout(() => setFlashId(undefined), 900)
    return note
  }, [sel, addNote])

  /* ---------------- URL 协议：?new=1 / ?open=<id> / ?date=yyyy-MM-dd ---------------- */
  useEffect(() => {
    const isNew = searchParams.get('new')
    const openId = searchParams.get('open')
    const date = searchParams.get('date')
    if (!isNew && !openId && !date) return
    if (isNew) {
      createNote()
    } else if (openId) {
      const n = useNotesStore.getState().getById(openId)
      if (n) {
        if (n.deletedAt) setSel({ t: 'trash' })
        else setSelectedId(n.id)
      }
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setDateFilter(date)
      setSel({ t: 'quick', k: 'all' })
    }
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  /* 选中的便签被删除/不存在时，关闭编辑器 */
  useEffect(() => {
    if (!selectedId) return
    const n = useNotesStore.getState().getById(selectedId)
    if (!n || (n.deletedAt && sel.t !== 'trash')) setSelectedId(undefined)
  }, [notes, selectedId, sel.t])

  /* ---------------- 全局快捷键：⌘N 新建 ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        createNote()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createNote])

  /* ---------------- 页头 ---------------- */
  usePageHeader(
    {
      title: '便签',
      subtitle: '随手记录，AI 整理',
      actions: (
        <>
          <button
            type="button"
            onClick={togglePalette}
            className="flex h-7 w-[200px] items-center gap-2 rounded-r-sm border border-line bg-surface px-3 text-[12px] text-ink-400 shadow-card transition-colors hover:border-line-strong"
          >
            <Search size={14} />
            <span className="flex-1 text-left">搜索便签…</span>
            <Kbd className="h-5 text-[11px]">⌘K</Kbd>
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings#ai')}
            className="flex h-7 items-center gap-1.5 rounded-r-sm px-3 text-[12px] font-medium text-ai-500 transition-colors hover:bg-ai-50"
          >
            <Sparkles size={14} />
            AI 设置
          </button>
          <Button onClick={() => createNote()} size="sm" className="h-7 rounded-r-sm">
            <Plus size={15} />
            新建便签
          </Button>
        </>
      ),
    },
    // createNote 依赖当前筛选，需同步进 actions 闭包
    [sel, togglePalette, navigate, createNote],
  )

  /* ---------------- 派生数据 ---------------- */
  const counts = useMemo<NavCounts>(() => {
    const live = notes.filter((n) => !n.deletedAt)
    const kinds: Record<NoteKind, number> = { daily: 0, weekly: 0, monthly: 0, memo: 0 }
    const tagFreq = new Map<string, number>()
    for (const n of live) {
      kinds[n.kind] += 1
      for (const t of n.tags) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1)
    }
    return {
      all: live.length,
      today: live.filter((n) => isToday(parseISO(n.createdAt))).length,
      pinned: live.filter((n) => n.pinned).length,
      kinds,
      tags: [...tagFreq.entries()].sort((a, b) => b[1] - a[1]),
      trash: notes.length - live.length,
    }
  }, [notes])

  const filtered = useMemo(() => {
    let list = useNotesStore.getState().searchNotes({
      query: query || undefined,
      notebookId: sel.t === 'notebook' ? sel.id : undefined,
      kind: sel.t === 'kind' ? sel.k : undefined,
      tag: sel.t === 'tag' ? sel.tag : undefined,
    })
    if (sel.t === 'quick' && sel.k === 'today') list = list.filter((n) => isToday(parseISO(n.createdAt)))
    if (sel.t === 'quick' && sel.k === 'pinned') list = list.filter((n) => n.pinned)
    if (dateFilter) list = list.filter((n) => format(parseISO(n.createdAt), 'yyyy-MM-dd') === dateFilter)
    const arr = [...list]
    if (sortBy === 'old') {
      arr.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.updatedAt.localeCompare(b.updatedAt)))
    } else if (sortBy === 'words') {
      arr.sort(
        (a, b) =>
          (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : 0) ||
          wordCount(b.contentMarkdown) - wordCount(a.contentMarkdown),
      )
    }
    return arr
  }, [notes, sel, query, sortBy, dateFilter])

  const trashNotes = useMemo(() => {
    let list = notes.filter((n) => n.deletedAt)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((n) => `${n.title}\n${n.contentMarkdown}`.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
  }, [notes, query])

  /* ---------------- 视图/筛选联动 ---------------- */
  const onViewChange = (v: ListView) => {
    setView(v)
    setListWidth(v === 'wall' ? 560 : 300) // 便签墙时面板扩展（notes.md §二）
  }

  const kindValue: NoteKind | 'all' = sel.t === 'kind' ? sel.k : 'all'
  const onKindChange = (k: NoteKind | 'all') =>
    setSel(k === 'all' ? { t: 'quick', k: 'all' } : { t: 'kind', k })

  /* ---------------- 渲染 ---------------- */
  return (
    <div className="-mx-8 -my-8 flex h-[calc(100dvh-72px)] w-[calc(100%+64px)] bg-surface">
      {/* 一、笔记本导航 */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div {...colIn(0)} exit={{ x: -16, opacity: 0, transition: { duration: 0.2 } }} className="h-full shrink-0">
            <NotebookNav sel={sel} onSelect={setSel} notebooks={notebooks} counts={counts} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 二、便签列表 */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div {...colIn(1)} exit={{ x: -16, opacity: 0, transition: { duration: 0.2 } }} className="h-full shrink-0">
            <NoteListPanel
              width={listWidth}
              onResize={setListWidth}
              kind={kindValue}
              onKindChange={onKindChange}
              query={query}
              onQueryChange={setQuery}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              view={view}
              onViewChange={onViewChange}
              notes={filtered}
              isTrash={sel.t === 'trash'}
              trashNotes={trashNotes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onNew={createNote}
              flashId={flashId}
              isDark={isDark}
              dateFilter={dateFilter}
              onClearDateFilter={() => setDateFilter(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 三、编辑器区 */}
      <motion.div {...colIn(2)} className="h-full min-w-0 flex-1">
        <div className={cn('h-full w-full', focusMode && 'mx-auto max-w-[860px] border-x border-line')}>
          <EditorPane
            note={selectedNote && !selectedNote.deletedAt ? selectedNote : undefined}
            onRequestNew={createNote}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((f) => !f)}
          />
        </div>
      </motion.div>
    </div>
  )
}
