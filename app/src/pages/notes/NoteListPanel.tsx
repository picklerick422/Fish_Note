/**
 * 二、便签列表栏（notes.md §二）：搜索 + 分类分段筛选 + 排序 + 列表/墙视图切换 + 新建。
 * 宽度 260~560px 可拖拽右缘调整；回收站模式下变为恢复/彻底删除列表。
 */
import { useRef, type MouseEvent as RMouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownUp, Check, Info, LayoutGrid, List, Plus, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import EmptyState from '@/components/shared/EmptyState'
import SegmentedControl from '@/components/shared/SegmentedControl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Note, NoteKind } from '@/types'
import NoteListCard from './NoteListCard'
import StickyWall from './StickyWall'
import TrashList from './TrashList'
import { KIND_LABEL, type SortBy } from './constants'

export type ListView = 'list' | 'wall'

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'new', label: '最新优先' },
  { value: 'old', label: '最早优先' },
  { value: 'words', label: '字数最多' },
]

interface NoteListPanelProps {
  width: number
  onResize: (w: number) => void
  kind: NoteKind | 'all'
  onKindChange: (k: NoteKind | 'all') => void
  query: string
  onQueryChange: (q: string) => void
  sortBy: SortBy
  onSortByChange: (s: SortBy) => void
  view: ListView
  onViewChange: (v: ListView) => void
  notes: Note[]
  isTrash: boolean
  trashNotes: Note[]
  selectedId?: string
  onSelect: (id: string) => void
  onNew: () => void
  flashId?: string
  isDark: boolean
  dateFilter: string | null
  onClearDateFilter: () => void
}

export default function NoteListPanel({
  width,
  onResize,
  kind,
  onKindChange,
  query,
  onQueryChange,
  sortBy,
  onSortByChange,
  view,
  onViewChange,
  notes,
  isTrash,
  trashNotes,
  selectedId,
  onSelect,
  onNew,
  flashId,
  isDark,
  dateFilter,
  onClearDateFilter,
}: NoteListPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  /* 右缘拖拽调宽（260~560） */
  const onHandleDown = (e: RMouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const move = (ev: MouseEvent) => {
      onResize(Math.min(560, Math.max(260, startW + ev.clientX - startX)))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <motion.section
      ref={panelRef}
      animate={{ width }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex h-full shrink-0 flex-col border-r border-line bg-surface"
      style={{ width }}
    >
      {/* 顶部工具区 */}
      <div className="shrink-0 border-b border-line p-3">
        {/* 搜索框 */}
        <div className="flex h-[34px] items-center gap-2 rounded-r-sm border border-line bg-base px-2.5 transition-colors focus-within:border-brand-500">
          <Search size={14} className="shrink-0 text-ink-400" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={isTrash ? '搜索回收站…' : '搜索当前分类…'}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink-900 outline-none placeholder:text-ink-400"
          />
          {query && (
            <button
              type="button"
              aria-label="清空搜索"
              onClick={() => onQueryChange('')}
              className="text-ink-300 transition-colors hover:text-ink-500"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* 行 2：排序 + 视图切换 + 新建 */}
        <div className="mt-2 flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 items-center gap-1 rounded-r-sm px-2 text-[12px] text-ink-500 transition-colors hover:bg-subtle hover:text-ink-700"
              >
                <ArrowDownUp size={13} />
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32 rounded-r-md">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  onClick={() => onSortByChange(o.value)}
                  className="flex items-center justify-between text-[13px]"
                >
                  {o.label}
                  {sortBy === o.value && <Check size={13} className="text-brand-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="flex-1" />

          {/* 视图切换：列表 / 墙（图标分段） */}
          {!isTrash && (
            <div className="flex items-center rounded-r-pill bg-subtle p-[3px]">
              {(
                [
                  { v: 'list' as ListView, icon: List, label: '列表视图' },
                  { v: 'wall' as ListView, icon: LayoutGrid, label: '便签墙视图' },
                ] as const
              ).map((opt) => {
                const active = view === opt.v
                return (
                  <button
                    key={opt.v}
                    type="button"
                    aria-label={opt.label}
                    title={opt.label}
                    onClick={() => onViewChange(opt.v)}
                    className={cn(
                      'relative flex h-6 w-7 items-center justify-center rounded-r-pill transition-colors',
                      active ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="notes-view-seg"
                        className="absolute inset-0 rounded-r-pill bg-surface shadow-card"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <opt.icon size={14} className="relative z-10" />
                  </button>
                )
              })}
            </div>
          )}

          <button
            type="button"
            aria-label="新建便签"
            title="新建便签（⌘N）"
            onClick={onNew}
            className="flex h-7 w-7 items-center justify-center rounded-r-sm bg-brand-500 text-white shadow-card transition-colors hover:bg-brand-600"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* 分类分段筛选 */}
        {!isTrash && (
          <div className="mt-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SegmentedControl
              size="sm"
              options={[
                { value: 'all', label: '全部' },
                { value: 'daily', label: '日报' },
                { value: 'weekly', label: '周报' },
                { value: 'monthly', label: '月报' },
                { value: 'memo', label: '随手记' },
              ]}
              value={kind}
              onChange={(v) => onKindChange(v as NoteKind | 'all')}
            />
          </div>
        )}
      </div>

      {/* 日期筛选提示条 */}
      {dateFilter && !isTrash && (
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-brand-50 px-3 py-1.5 text-[12px] text-brand-700">
          <span className="flex-1">
            {format(new Date(dateFilter + 'T00:00:00'), 'M月d日')}创建的便签
          </span>
          <button
            type="button"
            aria-label="清除日期筛选"
            onClick={onClearDateFilter}
            className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-100"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* 回收站提示条 */}
      {isTrash && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-line bg-amber-soft px-3 py-1.5 text-[12px] text-amber">
          <Info size={13} />
          回收站内容保留 30 天
        </div>
      )}

      {/* 内容区 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isTrash ? (
          <TrashList notes={trashNotes} />
        ) : notes.length === 0 ? (
          query ? (
            <EmptyState
              image="/empty-search.svg"
              imageWidth={170}
              title="没有找到相关便签"
              description={`没有匹配「${query}」的便签，换个关键词试试`}
              className="py-14"
            />
          ) : (
            <EmptyState
              image="/empty-notes.svg"
              imageWidth={170}
              title={kind === 'all' ? '这里还没有便签' : `还没有${KIND_LABEL[kind as NoteKind]}`}
              description="写下第一条，小芽帮你记住"
              className="py-14"
              action={
                <button
                  type="button"
                  onClick={onNew}
                  className="flex h-8 items-center gap-1 rounded-r-sm bg-brand-500 px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-600"
                >
                  <Plus size={14} />
                  新建便签
                </button>
              }
            />
          )
        ) : view === 'list' ? (
          <div className="flex flex-col gap-2 p-3">
            <AnimatePresence initial={false}>
              {notes.map((n) => (
                <NoteListCard
                  key={n.id}
                  note={n}
                  active={n.id === selectedId}
                  flash={n.id === flashId}
                  isDark={isDark}
                  onClick={() => onSelect(n.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <StickyWall notes={notes} selectedId={selectedId} isDark={isDark} onSelect={onSelect} />
        )}
      </div>

      {/* 拖拽调宽手柄 */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onHandleDown}
        className="absolute -right-[3px] bottom-0 top-0 z-20 w-[6px] cursor-col-resize"
      />
    </motion.section>
  )
}
