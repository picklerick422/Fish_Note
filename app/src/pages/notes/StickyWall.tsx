/**
 * 便签墙视图（notes.md §二 便签墙）：2 列瀑布流彩色便签纸，
 * pastel 底 + 顶部胶带条 + ±1° 微倾；hover 揭起（回正 + 上浮 + shadow-hover）；
 * 置顶角标 + AI 生成紫标；Framer Motion layout 平滑重排。
 */
import { motion } from 'framer-motion'
import { Pin, Sparkles } from 'lucide-react'
import Tag from '@/components/shared/Tag'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Note } from '@/types'
import { colorBg, plainExcerpt, wallColor, wallTilt } from './constants'

interface StickyCardProps {
  note: Note
  index: number
  active: boolean
  isDark: boolean
  onClick: () => void
}

function StickyCard({ note, index, active, isDark, onClick }: StickyCardProps) {
  const tilt = wallTilt(note.id)
  const bg = colorBg(note.color ?? wallColor(note.id), isDark)
  return (
    <motion.div
      layout="position"
      initial={{ scale: 0.9, rotate: 0, opacity: 0 }}
      animate={{ scale: 1, rotate: tilt, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: Math.min(index * 0.06, 0.6) }}
      whileHover={{ rotate: 0, y: -4, boxShadow: 'var(--shadow-hover)', transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative mb-4 cursor-pointer break-inside-avoid rounded-r-md p-4 pt-5 shadow-card',
        active && 'ring-2 ring-brand-500',
      )}
      style={{ background: bg ?? 'var(--surface)' }}
    >
      {/* 胶带条 */}
      <span
        aria-hidden
        className="absolute -top-2 left-1/2 h-[18px] w-[72px] -translate-x-1/2 rotate-[-3deg] rounded-sm bg-white/55 shadow-sm backdrop-blur-[1px] dark:bg-white/15"
      />

      {/* 角标：置顶 / AI */}
      <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
        {note.pinned && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-soft text-amber" title="已置顶">
            <Pin size={11} fill="currentColor" />
          </span>
        )}
        {note.aiGenerated && (
          <span
            className="flex h-5 items-center gap-0.5 rounded-r-pill px-1.5 text-[10px] font-medium text-white"
            style={{ backgroundImage: 'var(--ai-gradient)' }}
            title="AI 生成"
          >
            <Sparkles size={10} />
            AI
          </span>
        )}
      </div>

      {note.kind === 'daily' && (
        <div className="mb-1.5">
          <Tag type="daily" className="h-5 px-2 text-[11px]" />
        </div>
      )}

      <div className="text-[15px] font-semibold leading-6 text-ink-900">{note.title}</div>
      <div className="mt-1.5 line-clamp-6 whitespace-pre-line text-[13px] leading-[22px] text-ink-700/80">
        {plainExcerpt(note.contentMarkdown, 160) || '（空白便签）'}
      </div>
      <div className="mt-2.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
        {format(new Date(note.createdAt), 'M月d日')}
        {note.tags.length > 0 && <span className="ml-2 text-ai-400">#{note.tags[0]}</span>}
      </div>
    </motion.div>
  )
}

interface StickyWallProps {
  notes: Note[]
  selectedId?: string
  isDark: boolean
  onSelect: (id: string) => void
}

export default function StickyWall({ notes, selectedId, isDark, onSelect }: StickyWallProps) {
  // 2 列瀑布流：按奇偶分列
  const cols: Note[][] = [[], []]
  notes.forEach((n, i) => cols[i % 2].push(n))
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {cols.map((col, ci) => (
        <div key={ci} className="min-w-0">
          {col.map((n, i) => (
            <StickyCard
              key={n.id}
              note={n}
              index={ci + i * 2}
              active={n.id === selectedId}
              isDark={isDark}
              onClick={() => onSelect(n.id)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
