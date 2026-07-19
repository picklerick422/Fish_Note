import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChartPie,
  FileBarChart2,
  FilePlus2,
  LayoutDashboard,
  MessagesSquare,
  NotebookPen,
  Search,
  Settings2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotesStore } from '@/store/useNotesStore'
import { useUIStore } from '@/store/useUIStore'

interface PaletteItem {
  id: string
  group: string
  label: string
  hint?: string
  icon: LucideIcon
  ai?: boolean
  run: () => void
}

/** ⌘K / Ctrl+K 全局命令面板（design.md §6.3） */
export default function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen)

  // 全局快捷键：⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useUIStore.getState().togglePalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <AnimatePresence>
      {open && <PalettePanel key="panel" />}
    </AnimatePresence>
  )
}

/** 面板主体：关闭时卸载，重新打开即为全新状态 */
function PalettePanel() {
  const setOpen = useUIStore((s) => s.setPaletteOpen)
  const navigate = useNavigate()
  const notes = useNotesStore((s) => s.notes)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo<PaletteItem[]>(() => {
    const go = (to: string) => () => {
      setOpen(false)
      navigate(to)
    }
    const all: PaletteItem[] = [
      { id: 'p-home', group: '跳转页面', label: '工作台', hint: 'G H', icon: LayoutDashboard, run: go('/') },
      { id: 'p-notes', group: '跳转页面', label: '便签', hint: 'G N', icon: NotebookPen, run: go('/notes') },
      { id: 'p-memory', group: '跳转页面', label: '回忆书', hint: 'G M', icon: MessagesSquare, run: go('/memory') },
      { id: 'p-reports', group: '跳转页面', label: '报告', hint: 'G R', icon: FileBarChart2, run: go('/reports') },
      { id: 'p-stats', group: '跳转页面', label: '统计', hint: 'G S', icon: ChartPie, run: go('/stats') },
      { id: 'p-settings', group: '跳转页面', label: '设置', icon: Settings2, run: go('/settings') },
      { id: 'n-new', group: '新建', label: '新建便签', hint: 'N', icon: FilePlus2, run: go('/notes?new=1') },
      { id: 'ai-daily', group: 'AI 操作', label: '✦ 整理今日日报', icon: Sparkles, ai: true, run: go('/reports?generate=daily') },
      { id: 'ai-weekly', group: 'AI 操作', label: '✦ 生成本周周报', icon: Sparkles, ai: true, run: go('/reports?generate=weekly') },
      { id: 'ai-monthly', group: 'AI 操作', label: '✦ 生成本月月报', icon: Sparkles, ai: true, run: go('/reports?generate=monthly') },
      { id: 'ai-ask', group: 'AI 操作', label: '✦ 向小鱼提问', icon: Sparkles, ai: true, run: go('/memory') },
      ...notes
        .filter((n) => !n.deletedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5)
        .map((n): PaletteItem => ({ id: `open-${n.id}`, group: '最近打开', label: n.title, icon: NotebookPen, run: go(`/notes?open=${n.id}`) })),
    ]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((i) => i.label.toLowerCase().includes(q))
  }, [query, notes, navigate, setOpen])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[index]?.run()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // 选中项滚动到可视区
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  let lastGroup = ''
  const groups: Array<{ item: PaletteItem; flatIndex: number; showGroup: boolean }> = items.map((item, i) => {
    const showGroup = item.group !== lastGroup
    lastGroup = item.group
    return { item, flatIndex: i, showGroup }
  })

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[18vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      style={{ background: 'rgba(23,26,23,.32)' }}
      onClick={() => setOpen(false)}
    >
      <motion.div
        role="dialog"
        aria-label="命令面板"
        className="w-[560px] max-w-[92vw] overflow-hidden rounded-r-lg border border-line bg-surface shadow-pop"
        initial={{ scale: 0.96, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.97, y: 6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-ink-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="搜索页面、便签、AI 操作…"
            className="h-12 w-full bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
          />
          <kbd className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-ink-400">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
          {groups.length === 0 && (
            <div className="flex flex-col items-center py-8">
              <img src="./empty-search.svg" alt="" width={120} />
              <p className="mt-2 text-[13px] text-ink-400">没有找到「{query}」相关的内容</p>
            </div>
          )}
          {groups.map(({ item, flatIndex, showGroup }) => (
            <div key={item.id}>
              {showGroup && (
                <div className="px-2.5 pb-1 pt-2.5 text-[12px] tracking-[0.02em] text-ink-400">{item.group}</div>
              )}
              <button
                type="button"
                data-index={flatIndex}
                onClick={item.run}
                onMouseEnter={() => setIndex(flatIndex)}
                className={cn(
                  'relative flex w-full items-center gap-2.5 rounded-r-sm px-2.5 py-2 text-left text-[14px]',
                  flatIndex === index ? 'bg-subtle text-ink-900' : 'text-ink-700',
                )}
              >
                {flatIndex === index && (
                  <motion.span
                    layoutId="palette-active"
                    className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-pill bg-brand-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <item.icon size={16} className={item.ai ? 'text-ai-500' : 'text-ink-400'} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.hint && (
                  <span className="font-mono text-[11px] text-ink-300">{item.hint}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
