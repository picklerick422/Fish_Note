import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import SegmentedControl from '@/components/shared/SegmentedControl'
import { useStatsData, useStatsStore } from '@/store/useStatsStore'
import { ChartTooltip } from './format'
import { previousRange, rangeDays, sumActivity, type DateRange } from './range'

interface TrendPoint {
  label: string
  fullLabel: string
  count: number
  words: number
}

interface TrendChartCardProps {
  range: DateRange
  baseDelay?: number
}

/** R3 左 · 记录趋势面积图（便签数/字数切换，>180 天按周聚合，stats.md R3） */
export default function TrendChartCard({ range, baseDelay = 0.2 }: TrendChartCardProps) {
  const activity = useStatsStore((s) => s.activity)
  const { totalNotes, totalWords } = useStatsData()
  const [metric, setMetric] = useState<'count' | 'words'>('count')

  const wordsPerNote = Math.max(1, Math.round(totalWords / Math.max(totalNotes, 1)))

  // 范围起止（全部 = activity 最早一天 ~ 今天）
  const { startDate, endDate, days } = useMemo(() => {
    const end = range.end ? new Date(range.end + 'T00:00:00') : new Date()
    let start: Date
    if (range.start) {
      start = new Date(range.start + 'T00:00:00')
    } else {
      const keys = Object.keys(activity).sort()
      start = keys.length ? new Date(keys[0] + 'T00:00:00') : addDays(end, -29)
    }
    return { startDate: start, endDate: end, days: differenceInCalendarDays(end, start) + 1 }
  }, [activity, range])

  const weekly = days > 180

  const series = useMemo<TrendPoint[]>(() => {
    const points: TrendPoint[] = []
    if (weekly) {
      // 按周聚合（X 轴标签「第 n 周」）
      let cursor = startDate
      let week = 1
      while (cursor <= endDate) {
        let count = 0
        const weekStart = new Date(cursor)
        for (let i = 0; i < 7 && cursor <= endDate; i++) {
          count += activity[format(cursor, 'yyyy-MM-dd')] ?? 0
          cursor = addDays(cursor, 1)
        }
        points.push({
          label: `第 ${week} 周`,
          fullLabel: `${format(weekStart, 'M月d日')} 起`,
          count,
          words: count * wordsPerNote,
        })
        week += 1
      }
    } else {
      let cursor = startDate
      while (cursor <= endDate) {
        const count = activity[format(cursor, 'yyyy-MM-dd')] ?? 0
        points.push({
          label: format(cursor, 'M/d'),
          fullLabel: format(cursor, 'M月d日'),
          count,
          words: count * wordsPerNote,
        })
        cursor = addDays(cursor, 1)
      }
    }
    return points
  }, [activity, startDate, endDate, weekly, wordsPerNote])

  // 数据极少（<7 天有记录）：虚线占位
  const tooSparse = useMemo(() => Object.values(activity).filter((n) => n > 0).length < 7, [activity])

  // 洞察：平均每周记录天数 + 与上期对比
  const insight = useMemo(() => {
    const total = sumActivity(activity, range)
    const span = rangeDays(range) ?? days
    const weeks = Math.max(span / 7, 1)
    const activeDays = series.filter((p) => p.count > 0).length
    const perWeek = weekly ? total / weeks : activeDays / weeks
    const prev = previousRange(range)
    let tail = '保持这份节奏'
    if (prev) {
      const prevTotal = sumActivity(activity, prev)
      if (total > prevTotal * 1.05) tail = '比上期更活跃'
      else if (total < prevTotal * 0.95) tail = '比上期有所回落'
      else tail = '比上期更稳定'
    }
    return `当前范围平均每周记录 ${perWeek.toFixed(1)} ${weekly ? '条' : '天'}，${tail}`
  }, [activity, range, days, series, weekly])

  const dataKey = metric === 'count' ? 'count' : 'words'
  const metricLabel = metric === 'count' ? '便签' : '字数'

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: baseDelay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-line bg-surface p-6 shadow-card xl:col-span-8"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">记录趋势</h3>
        <SegmentedControl
          size="sm"
          options={[
            { value: 'count', label: '便签数' },
            { value: 'words', label: '字数' },
          ]}
          value={metric}
          onChange={setMetric}
        />
      </div>

      <div className="mt-4 h-[240px]">
        {tooSparse ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-r-md border border-dashed border-line-strong">
            <span className="text-[13px] text-ink-400">数据还太少，再记几天就能看到趋势啦</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-500)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
                tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
              />
              <Tooltip
                cursor={{ stroke: 'var(--ink-300)', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as TrendPoint | undefined
                  if (!p) return null
                  return (
                    <ChartTooltip
                      active={active}
                      label={p.fullLabel}
                      lines={[
                        {
                          name: metricLabel,
                          value: metric === 'count' ? `${p.count} 条` : `${p.words.toLocaleString()} 字`,
                          color: 'var(--brand-500)',
                        },
                      ]}
                    />
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="var(--brand-500)"
                strokeWidth={2.5}
                fill="url(#trend-fill)"
                isAnimationActive
                animationDuration={600}
                dot={false}
                activeDot={{ r: 3.5, fill: 'var(--brand-500)', stroke: 'var(--surface)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!tooSparse && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.4, duration: 0.3 }}
          className="mt-3 flex items-center gap-1.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          {insight}
        </motion.p>
      )}
    </motion.section>
  )
}
