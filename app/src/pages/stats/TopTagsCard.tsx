import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { useNotesStore } from '@/store/useNotesStore'
import type { DateRange } from './range'

interface TopTagsCardProps {
  range: DateRange
  baseDelay?: number
}

/** R4 右 · 高频标签 Top 8（渐变横条，点击跳便签页过滤，stats.md R4） */
export default function TopTagsCard({ range, baseDelay = 0.36 }: TopTagsCardProps) {
  const navigate = useNavigate()
  const notes = useNotesStore((s) => s.notes)

  const tags = useMemo(() => {
    const freq = new Map<string, number>()
    for (const note of notes) {
      if (note.deletedAt) continue
      const day = note.createdAt.slice(0, 10)
      if (range.start && day < range.start) continue
      if (range.end && day > range.end) continue
      for (const t of note.tags) freq.set(t, (freq.get(t) ?? 0) + 1)
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [notes, range])

  const max = tags.length ? tags[0][1] : 1

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: baseDelay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-line bg-surface p-6 shadow-card xl:col-span-6"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">高频标签</h3>
        <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">Top {tags.length}</span>
      </div>

      {tags.length === 0 ? (
        <div className="mt-4 flex h-[200px] items-center justify-center rounded-r-md border border-dashed border-line-strong">
          <span className="text-[13px] text-ink-400">给便签加上 #标签，这里就会热闹起来</span>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-[13px]">
          {tags.map(([tag, count], i) => (
            <motion.li key={tag} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
              <button
                type="button"
                onClick={() => navigate(`/notes?tag=${encodeURIComponent(tag)}`)}
                className="group flex w-full items-center gap-3"
              >
                <span className="w-[72px] shrink-0 truncate text-left text-[13px] font-medium leading-5 text-ink-700 transition-colors group-hover:text-brand-700">
                  #{tag}
                </span>
                <span className="h-[10px] min-w-0 flex-1 overflow-hidden rounded-r-pill bg-subtle">
                  <motion.span
                    className="block h-full rounded-r-pill"
                    style={{ backgroundImage: 'linear-gradient(90deg, var(--brand-200), var(--brand-500))' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max((count / max) * 100, 6)}%` }}
                    transition={{ delay: baseDelay + 0.15 + i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
                <span className="tnum w-9 shrink-0 text-right font-display text-[13px] font-semibold leading-5 text-ink-900">
                  {count}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.section>
  )
}
