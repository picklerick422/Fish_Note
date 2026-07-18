import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import SegmentedControl from '@/components/shared/SegmentedControl'
import { cn } from '@/lib/utils'
import { quickCustom, RANGE_OPTIONS, type DateRange, type RangeKey } from './range'

interface TimeRangeControlProps {
  rangeKey: RangeKey
  custom: DateRange | null
  onChange: (key: RangeKey, custom?: DateRange) => void
}

const QUICK: Array<{ kind: '7d' | '90d' | 'year'; label: string }> = [
  { kind: '7d', label: '近 7 天' },
  { kind: '90d', label: '近 90 天' },
  { kind: 'year', label: '今年' },
]

/** 页头时间范围选择器：SegmentedControl + 自定义日期范围 Popover（stats.md PageHeader） */
export default function TimeRangeControl({ rangeKey, custom, onChange }: TimeRangeControlProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>({ start: custom?.start ?? '', end: custom?.end ?? '' })
  const wrapRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const apply = (range: DateRange) => {
    if (!range.start || !range.end) return
    const normalized = range.start <= range.end ? range : { start: range.end, end: range.start }
    onChange('custom', normalized)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <SegmentedControl
        options={RANGE_OPTIONS}
        value={rangeKey}
        onChange={(key) => {
          if (key === 'custom') {
            setDraft({ start: custom?.start ?? '', end: custom?.end ?? '' })
            setOpen(true)
            onChange('custom', custom ?? quickCustom('7d'))
          } else {
            setOpen(false)
            onChange(key)
          }
        }}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-r-md border border-line bg-surface p-4 shadow-pop"
          >
            <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-ink-900">
              <CalendarDays size={14} className="text-ink-400" />
              自定义时间范围
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draft.start ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                className="h-[34px] w-full rounded-r-sm border border-line-strong bg-surface px-2 text-[12px] text-ink-700 outline-none transition-colors focus:border-brand-500"
              />
              <span className="shrink-0 text-[12px] text-ink-400">至</span>
              <input
                type="date"
                value={draft.end ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                className="h-[34px] w-full rounded-r-sm border border-line-strong bg-surface px-2 text-[12px] text-ink-700 outline-none transition-colors focus:border-brand-500"
              />
            </div>
            <div className="mt-3 flex gap-2">
              {QUICK.map((q) => (
                <button
                  key={q.kind}
                  type="button"
                  onClick={() => apply(quickCustom(q.kind))}
                  className={cn(
                    'h-7 rounded-r-pill border border-line px-3 text-[12px] text-ink-500',
                    'transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!draft.start || !draft.end}
              onClick={() => apply(draft)}
              className="mt-3 h-8 w-full rounded-r-sm bg-brand-500 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              应用
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
