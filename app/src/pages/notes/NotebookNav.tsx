/**
 * 一、笔记本导航栏（240px，notes.md §一）：
 * 快速入口 / 笔记本（新建·重命名·删除）/ 分类 / 标签云 / 回收站。
 * 选中行左侧 3px 绿条 layoutId 弹簧滑动 + brand-50 底。
 */
import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useNotesStore } from '@/store/useNotesStore'
import type { Notebook, NoteKind } from '@/types'
import { KIND_DOT, KIND_LABEL, notebookIcon, sameSel, type NavSel } from './constants'

/* ---------------- 计数徽标（数字变化时弹跳 300ms） ---------------- */

function CountBadge({ n, className }: { n: number; className?: string }) {
  return (
    <motion.span
      key={n}
      initial={{ scale: 1.3 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className={cn(
        'ml-auto shrink-0 rounded-r-pill bg-subtle px-1.5 py-0.5 text-[11px] leading-none text-ink-400',
        className,
      )}
    >
      {n}
    </motion.span>
  )
}

/* ---------------- 通用导航行 ---------------- */

interface NavRowProps {
  icon?: LucideIcon
  dot?: string
  label: string
  count?: number
  active: boolean
  onClick: () => void
  iconClassName?: string
  actions?: ReactNode
}

function NavRow({ icon: Icon, dot, label, count, active, onClick, iconClassName, actions }: NavRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'group relative flex h-9 cursor-pointer items-center gap-2 rounded-r-sm px-2.5 text-[14px] transition-colors duration-150',
        active ? 'bg-brand-50 font-medium text-ink-900' : 'text-ink-700 hover:bg-subtle',
      )}
    >
      {active && (
        <motion.span
          layoutId="notes-nav-pill"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-500"
        />
      )}
      {dot ? (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
      ) : Icon ? (
        <Icon size={16} className={cn('shrink-0', iconClassName ?? 'text-ink-400')} />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {actions}
      {count !== undefined && <CountBadge n={count} />}
    </div>
  )
}

function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-4 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
      {children}
    </div>
  )
}

/* ---------------- 主组件 ---------------- */

export interface NavCounts {
  all: number
  today: number
  pinned: number
  kinds: Record<NoteKind, number>
  tags: Array<[string, number]>
  trash: number
}

interface NotebookNavProps {
  sel: NavSel
  onSelect: (sel: NavSel) => void
  notebooks: Notebook[]
  counts: NavCounts
}

export default function NotebookNav({ sel, onSelect, notebooks, counts }: NotebookNavProps) {
  const addNotebook = useNotesStore((s) => s.addNotebook)
  const updateNotebook = useNotesStore((s) => s.updateNotebook)
  const deleteNotebook = useNotesStore((s) => s.deleteNotebook)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const is = (other: NavSel) => sameSel(sel, other)

  const commitCreate = () => {
    if (newName.trim()) {
      const nb = addNotebook(newName.trim())
      onSelect({ t: 'notebook', id: nb.id })
      notify.success(`已创建笔记本「${nb.name}」`)
    }
    setCreating(false)
    setNewName('')
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      updateNotebook(renamingId, { name: renameValue.trim() })
    }
    setRenamingId(null)
  }

  return (
    <nav className="flex h-full w-[240px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface px-3 py-4">
      {/* 分组 1 · 快速入口 */}
      <div className="flex flex-col gap-0.5">
        <NavRow
          icon={NotebookPen}
          label="全部便签"
          count={counts.all}
          active={is({ t: 'quick', k: 'all' })}
          onClick={() => onSelect({ t: 'quick', k: 'all' })}
        />
        <NavRow
          icon={Sun}
          label="今天"
          count={counts.today}
          active={is({ t: 'quick', k: 'today' })}
          onClick={() => onSelect({ t: 'quick', k: 'today' })}
        />
        <NavRow
          icon={Pin}
          iconClassName="text-amber"
          label="置顶"
          count={counts.pinned}
          active={is({ t: 'quick', k: 'pinned' })}
          onClick={() => onSelect({ t: 'quick', k: 'pinned' })}
        />
      </div>

      {/* 分组 2 · 笔记本 */}
      <GroupTitle>
        <span className="flex items-center justify-between">
          笔记本
          <button
            type="button"
            aria-label="新建笔记本"
            onClick={() => setCreating(true)}
            className="flex h-5 w-5 items-center justify-center rounded-r-sm text-ink-400 transition-colors hover:bg-subtle hover:text-brand-600"
          >
            <Plus size={14} />
          </button>
        </span>
      </GroupTitle>
      <div className="flex flex-col gap-0.5">
        {notebooks.map((nb) => {
          const active = is({ t: 'notebook', id: nb.id })
          if (renamingId === nb.id) {
            return (
              <div key={nb.id} className="flex h-9 items-center gap-2 rounded-r-sm bg-brand-50 px-2.5">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="h-6 min-w-0 flex-1 rounded-r-sm border border-line-strong bg-surface px-1.5 text-[13px] outline-none focus:border-brand-500"
                />
                <button type="button" aria-label="确认" onClick={commitRename} className="text-brand-600">
                  <Check size={14} />
                </button>
                <button type="button" aria-label="取消" onClick={() => setRenamingId(null)} className="text-ink-400">
                  <X size={14} />
                </button>
              </div>
            )
          }
          return (
            <ContextMenu key={nb.id}>
              <ContextMenuTrigger asChild>
                <NavRow
                  icon={notebookIcon(nb.icon)}
                  label={nb.name}
                  count={nb.count}
                  active={active}
                  onClick={() => onSelect({ t: 'notebook', id: nb.id })}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="笔记本操作"
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-5 w-5 items-center justify-center rounded-r-sm text-ink-300 opacity-0 transition-opacity hover:bg-line hover:text-ink-700 group-hover:opacity-100"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-36 rounded-r-md" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingId(nb.id)
                            setRenameValue(nb.name)
                          }}
                          className="gap-2 text-[13px]"
                        >
                          <Pencil size={13} />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={notebooks.length <= 1}
                          onClick={() => {
                            deleteNotebook(nb.id)
                            if (active) onSelect({ t: 'quick', k: 'all' })
                            notify.success(`已删除笔记本「${nb.name}」，便签已移至「${notebooks.find((x) => x.id !== nb.id)?.name ?? ''}」`)
                          }}
                          className="gap-2 text-[13px] text-red focus:text-red"
                        >
                          <Trash2 size={13} />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />
              </ContextMenuTrigger>
              <ContextMenuContent className="w-36 rounded-r-md" onClick={(e) => e.stopPropagation()}>
                <ContextMenuItem
                  onClick={() => {
                    setRenamingId(nb.id)
                    setRenameValue(nb.name)
                  }}
                  className="gap-2 text-[13px]"
                >
                  <Pencil size={13} />
                  重命名
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={notebooks.length <= 1}
                  variant="destructive"
                  onClick={() => {
                    deleteNotebook(nb.id)
                    if (active) onSelect({ t: 'quick', k: 'all' })
                    notify.success(`已删除笔记本「${nb.name}」，便签已移至「${notebooks.find((x) => x.id !== nb.id)?.name ?? ''}」`)
                  }}
                  className="gap-2 text-[13px]"
                >
                  <Trash2 size={13} />
                  删除
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}
        {creating && (
          <div className="flex h-9 items-center gap-2 rounded-r-sm bg-subtle px-2.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewName('')
                }
              }}
              onBlur={commitCreate}
              placeholder="笔记本名称"
              className="h-6 min-w-0 flex-1 rounded-r-sm border border-line-strong bg-surface px-1.5 text-[13px] outline-none focus:border-brand-500"
            />
          </div>
        )}
      </div>

      {/* 分组 3 · 分类 */}
      <GroupTitle>分类</GroupTitle>
      <div className="flex flex-col gap-0.5">
        {(Object.keys(KIND_LABEL) as NoteKind[]).map((k) => (
          <NavRow
            key={k}
            dot={KIND_DOT[k]}
            label={KIND_LABEL[k]}
            count={counts.kinds[k]}
            active={is({ t: 'kind', k })}
            onClick={() => onSelect({ t: 'kind', k })}
          />
        ))}
      </div>

      {/* 分组 4 · 标签云 */}
      <GroupTitle>标签</GroupTitle>
      <div className="flex flex-wrap gap-1.5 px-2.5">
        {counts.tags.slice(0, 12).map(([tag, n]) => {
          const active = is({ t: 'tag', tag })
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onSelect(active ? { t: 'quick', k: 'all' } : { t: 'tag', tag })}
              className={cn(
                'flex h-6 items-center gap-1 rounded-r-pill px-2 text-[12px] transition-colors duration-150',
                active ? 'bg-brand-500 text-white' : 'bg-subtle text-ink-500 hover:bg-brand-50 hover:text-brand-700',
              )}
            >
              #{tag}
              <span className={cn('text-[10px]', active ? 'text-white/80' : 'text-ink-300')}>{n}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => notify.info('标签即写即建：在编辑器标签行直接添加即可')}
          className="flex h-6 items-center rounded-r-pill border border-dashed border-line-strong px-2 text-[12px] text-ink-400 transition-colors hover:border-brand-500 hover:text-brand-600"
        >
          + 管理标签
        </button>
      </div>

      {/* 底部 · 回收站 */}
      <div className="mt-auto pt-4">
        <div className="border-t border-line pt-2">
          <NavRow
            icon={Trash2}
            label="回收站"
            count={counts.trash}
            active={sel.t === 'trash'}
            onClick={() => onSelect({ t: 'trash' })}
          />
        </div>
      </div>
    </nav>
  )
}
