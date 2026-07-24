/**
 * 列表视图便签卡（notes.md §二 列表视图）：
 * 类型 chip + 置顶钉 + 颜色点 / 标题 / 两行摘要 / 相对时间 + hover 操作菜单。
 */
import { motion } from 'framer-motion'
import {
  Check,
  Download,
  FolderInput,
  MoreHorizontal,
  Palette,
  Pin,
  PinOff,
  Sparkles,
  Trash2,
} from 'lucide-react'
import Tag from '@/components/shared/Tag'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { relTime, wordCount } from '@/lib/date'
import { downloadBlob } from '@/lib/download'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useNotesStore } from '@/store/useNotesStore'
import type { Note } from '@/types'
import { NOTE_COLORS, colorBg, plainExcerpt } from './constants'

/** 导出 .md 文件（统一走 lib/download：鸿蒙壳内自动切原生桥） */
export function exportNoteMd(note: Note) {
  const blob = new Blob([note.contentMarkdown], { type: 'text/markdown;charset=utf-8' })
  void downloadBlob(`${note.title.replace(/[\\/:*?"<>|]/g, '_') || '便签'}.md`, blob)
  notify.success(`已导出「${note.title}」`)
}

interface NoteListCardProps {
  note: Note
  active: boolean
  /** 新建高亮闪烁 600ms */
  flash?: boolean
  isDark: boolean
  onClick: () => void
}

export default function NoteListCard({ note, active, flash, isDark, onClick }: NoteListCardProps) {
  const notebooks = useNotesStore((s) => s.notebooks)
  const togglePin = useNotesStore((s) => s.togglePin)
  const updateNote = useNotesStore((s) => s.updateNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)

  const bg = colorBg(note.color, isDark)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          layout="position"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ height: 0, opacity: 0, marginBottom: 0, overflow: 'hidden', transition: { duration: 0.24 } }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClick}
          className={cn(
            'group relative cursor-pointer rounded-r-md border p-3 transition-shadow duration-150 hover:shadow-card',
            active ? 'border-brand-500 bg-brand-50' : 'border-line',
          )}
          style={{ background: active ? undefined : (bg ?? 'var(--surface)') }}
        >
          {/* 选中左缘 3px 绿条 */}
          {active && (
            <motion.span
              layoutId="note-card-active-pill"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="absolute -left-px top-2 bottom-2 w-[3px] rounded-full bg-brand-500"
            />
          )}

          {/* 新增闪烁 */}
          {flash && (
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute inset-0 rounded-r-md bg-brand-100"
            />
          )}

          {/* 行 1：chip + pin + 色点 */}
          <div className="flex items-center gap-1.5">
            <Tag type={note.kind} className="h-5 px-2 text-[11px]" />
            {note.aiGenerated && (
              <span title="AI 生成" className="flex h-5 items-center rounded-r-pill bg-ai-50 px-1.5 text-[10px] text-ai-500">
                <Sparkles size={10} className="mr-0.5" />
                AI
              </span>
            )}
            {note.pinned && <Pin size={13} className="text-amber" fill="currentColor" />}
            <span className="flex-1" />
            {note.color && (
              <span
                className="h-1.5 w-1.5 rounded-full border border-black/5"
                style={{ background: note.color === '#FFFFFF' ? 'var(--ink-300)' : note.color }}
                title="便签颜色"
              />
            )}
            {/* hover 操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="更多操作"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-6 w-6 items-center justify-center rounded-r-sm text-ink-400 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-r-md" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => togglePin(note.id)} className="gap-2 text-[13px]">
                  {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {note.pinned ? '取消置顶' : '置顶'}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 text-[13px]">
                    <Palette size={14} />
                    改色
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40 rounded-r-md">
                    {NOTE_COLORS.map((c) => (
                      <DropdownMenuItem
                        key={c.key}
                        onClick={() => updateNote(note.id, { color: c.key === 'white' ? undefined : c.light })}
                        className="flex items-center gap-2 text-[13px]"
                      >
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c.light }} />
                        {c.label}
                        {(note.color ?? undefined) === (c.key === 'white' ? undefined : c.light) && (
                          <Check size={13} className="ml-auto text-brand-600" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 text-[13px]">
                    <FolderInput size={14} />
                    移动到
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40 rounded-r-md">
                    {notebooks.map((nb) => (
                      <DropdownMenuItem
                        key={nb.id}
                        onClick={() => {
                          updateNote(note.id, { notebookId: nb.id })
                          notify.success(`已移动到「${nb.name}」`)
                        }}
                        className="flex items-center justify-between text-[13px]"
                      >
                        {nb.name}
                        {note.notebookId === nb.id && <Check size={13} className="text-brand-600" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => exportNoteMd(note)} className="gap-2 text-[13px]">
                  <Download size={14} />
                  导出 .md
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    deleteNote(note.id)
                    notify.success('已移入回收站')
                  }}
                  className="gap-2 text-[13px] text-red focus:text-red"
                >
                  <Trash2 size={14} />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 行 2：标题 */}
          <div className="mt-1.5 truncate text-[14px] font-semibold leading-5 text-ink-900">{note.title}</div>

          {/* 行 3：摘要 */}
          <div className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-500">
            {plainExcerpt(note.contentMarkdown) || '（空白便签）'}
          </div>

          {/* 行 4：时间 · 字数 */}
          <div className="mt-1.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
            {relTime(note.updatedAt)} · {wordCount(note.contentMarkdown)} 字
          </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44 rounded-r-md" onClick={(e) => e.stopPropagation()}>
        <ContextMenuItem onClick={() => togglePin(note.id)} className="gap-2 text-[13px]">
          {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          {note.pinned ? '取消置顶' : '置顶'}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 text-[13px]">
            <Palette size={14} />
            改色
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40 rounded-r-md">
            {NOTE_COLORS.map((c) => (
              <ContextMenuItem
                key={c.key}
                onClick={() => updateNote(note.id, { color: c.key === 'white' ? undefined : c.light })}
                className="flex items-center gap-2 text-[13px]"
              >
                <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c.light }} />
                {c.label}
                {(note.color ?? undefined) === (c.key === 'white' ? undefined : c.light) && (
                  <Check size={13} className="ml-auto text-brand-600" />
                )}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 text-[13px]">
            <FolderInput size={14} />
            移动到
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40 rounded-r-md">
            {notebooks.map((nb) => (
              <ContextMenuItem
                key={nb.id}
                onClick={() => {
                  updateNote(note.id, { notebookId: nb.id })
                  notify.success(`已移动到「${nb.name}」`)
                }}
                className="flex items-center justify-between text-[13px]"
              >
                {nb.name}
                {note.notebookId === nb.id && <Check size={13} className="text-brand-600" />}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={() => exportNoteMd(note)} className="gap-2 text-[13px]">
          <Download size={14} />
          导出 .md
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={() => {
            deleteNote(note.id)
            notify.success('已移入回收站')
          }}
          className="gap-2 text-[13px]"
        >
          <Trash2 size={14} />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
