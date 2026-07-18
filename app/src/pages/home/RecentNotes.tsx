import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, MoreHorizontal, Pin } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
import Tag from '@/components/shared/Tag'
import { Button } from '@/components/ui/button'
import { relTime, wordCount } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useNotesStore } from '@/store/useNotesStore'

/** R3 右 · 最近便签卡：5 行列表 + 置顶 + 空态 */
export default function RecentNotes() {
  const navigate = useNavigate()
  const notes = useNotesStore((s) => s.notes)
  const togglePin = useNotesStore((s) => s.togglePin)

  const recent = useMemo(
    () =>
      notes
        .filter((n) => !n.deletedAt)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return b.updatedAt.localeCompare(a.updatedAt)
        })
        .slice(0, 5),
    [notes],
  )

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-lg border border-line bg-surface p-5 shadow-card xl:col-span-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">最近便签</h3>
        <button
          type="button"
          onClick={() => navigate('/notes')}
          className="flex items-center gap-1 text-[13px] text-ink-400 transition-colors hover:text-brand-600"
        >
          查看全部
          <ArrowRight size={14} />
        </button>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          image="/empty-notes.svg"
          imageWidth={150}
          title="还没有便签"
          description="写下第一条，小芽帮你记住"
          action={
            <Button
              className="h-9 rounded-r-sm"
              onClick={() => {
                document.getElementById('quick-capture')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => document.getElementById('quick-capture-input')?.focus(), 450)
              }}
            >
              写下第一条 →
            </Button>
          }
        />
      ) : (
        <div className="mt-3 flex flex-col gap-1">
          {recent.map((note, i) => (
            <motion.div
              key={note.id}
              layout="position"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.07, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(`/notes?open=${note.id}`)}
              className="group relative flex h-14 cursor-pointer items-center gap-3 rounded-r-md px-2 transition-colors duration-150 hover:bg-subtle"
            >
              {note.pinned && (
                <span className="absolute inset-x-2 top-0 h-[2px] rounded-full bg-amber" title="已置顶" />
              )}
              <Tag type={note.kind} />
              <div className="min-w-0 flex-1 transition-transform duration-150 group-hover:translate-x-0.5">
                <div className="truncate text-[14px] font-medium leading-5 text-ink-900">{note.title}</div>
                <div className="mt-0.5 text-[12px] leading-4 text-ink-400">
                  {relTime(note.updatedAt)} · {wordCount(note.contentMarkdown)} 字
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="置顶"
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePin(note.id)
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-r-sm transition-colors hover:bg-line',
                    note.pinned ? 'text-amber' : 'text-ink-400',
                  )}
                >
                  <Pin size={14} fill={note.pinned ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  aria-label="更多"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/notes?open=${note.id}`)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-r-sm text-ink-400 transition-colors hover:bg-line"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  )
}
