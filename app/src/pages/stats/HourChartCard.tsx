import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNotesStore } from '@/store/useNotesStore'
import { useStatsStore } from '@/store/useStatsStore'
import { ChartTooltip } from './format'
import type { DateRange } from './range'

interface HourChartCardProps {
  range: DateRange
  baseDelay?: number
}

/** R4 左 · 记录时段分布（0–23 时琥珀柱，峰值实心，stats.md R4） */
export default function HourChartCard({ range, baseDelay = 0.3 }: HourChartCardProps) {
  const notes = useNotesStore((s) => s.notes)
  const activity = useStatsStore((s) => s.activity)

  const { hours, peakHour, total } = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ h, n: 0 }))
    let sum = 0
    for (const note of notes) {
      if (note.deletedAt) continue
      const day = note.createdAt.slice(0, 10)
      if (range.start && day < range.start) continue
      if (range.end && day > range.end) continue
      const h = new Date(note.createdAt).getHours()
      buckets[h].n += 1
      sum += 1
    }
    let peak = 0
    buckets.forEach((b) => {
      if (b.n > buckets[peak].n) peak = b.h
    })
    return { hours: buckets, peakHour: peak, total: sum }
  }, [notes, range])

  // 数据极少：虚线占位
  const tooSparse = useMemo(() => Object.values(activity).filter((n) => n > 0).length < 7, [activity])

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: baseDelay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-line bg-surface p-6 shadow-card xl:col-span-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">记录时段</h3>
        {total > 0 && !tooSparse && (
          <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
            你最爱在 <span className="tnum font-medium text-amber">{peakHour}:00–{(peakHour + 1) % 24}:00</span> 记录
          </span>
        )}
      </div>

      <div className="mt-4 h-[200px]">
        {tooSparse || total === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-r-md border border-dashed border-line-strong">
            <span className="text-[13px] text-ink-400">数据还太少，再记几天就能看到趋势啦</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours} margin={{ top: 8, right: 4, bottom: 0, left: -26 }} barCategoryGap="28%">
              <XAxis
                dataKey="h"
                tickLine={false}
                axisLine={false}
                interval={3}
                tick={{ fontSize: 10, fill: 'var(--ink-400)' }}
                tickFormatter={(h: number) => `${h}`}
                dy={6}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-400)' }} />
              <Tooltip
                cursor={{ fill: 'var(--bg-subtle)' }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as { h: number; n: number } | undefined
                  if (!p) return null
                  return <ChartTooltip active={active} lines={[{ name: `${p.h} 时`, value: `共 ${p.n} 条`, color: 'var(--amber)' }]} />
                }}
              />
              <Bar dataKey="n" barSize={10} radius={[3, 3, 3, 3]} isAnimationActive animationDuration={500} animationBegin={0}>
                {hours.map((b) => (
                  <Cell
                    key={b.h}
                    fill="var(--amber)"
                    fillOpacity={b.h === peakHour && b.n > 0 ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.section>
  )
}
