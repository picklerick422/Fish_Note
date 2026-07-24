import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import Heatmap, { HEAT_LEVELS } from '@/components/shared/Heatmap'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computeStreak, useStatsStore } from '@/store/useStatsStore'

const CELL = 14
const GAP = 3

interface YearHeatmapCardProps {
  baseDelay?: number
}

/** R2 · 年度活跃热力图（通栏，14px 大格子 + 年份切换 + 图例，stats.md R2） */
export default function YearHeatmapCard({ baseDelay = 0.1 }: YearHeatmapCardProps) {
  const navigate = useNavigate()
  const activity = useStatsStore((s) => s.activity)
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [slideDir, setSlideDir] = useState(1)

  const { yearTotal, yearDays, yearEmpty } = useMemo(() => {
    let total = 0
    let days = 0
    for (const [key, n] of Object.entries(activity)) {
      if (!key.startsWith(String(year)) || n <= 0) continue
      total += n
      days += 1
    }
    return { yearTotal: total, yearDays: days, yearEmpty: days === 0 }
  }, [activity, year])

  const streak = computeStreak(activity).current

  return (
    <motion.section
      id="heatmap"
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: baseDelay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 scroll-mt-24 rounded-r-xl border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[16px] font-semibold leading-6 text-ink-900">活跃热力图</h3>
          <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
            {year} 年共 <span className="tnum font-medium text-ink-700">{yearTotal}</span> 条记录 · 覆盖{' '}
            <span className="tnum font-medium text-ink-700">{yearDays}</span> 天
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={String(year)}
            onValueChange={(v) => {
              const next = Number(v)
              setSlideDir(next > year ? 1 : -1)
              setYear(next)
            }}
          >
            <SelectTrigger
              aria-label="选择年份"
              className="h-7 w-[90px] gap-1 rounded-r-sm border-line-strong bg-surface text-[12px] text-ink-700 focus:border-brand-500"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 min-w-[90px] rounded-r-md border-line bg-surface text-[13px] shadow-pop">
              {[thisYear, thisYear - 1].map((y) => (
                <SelectItem key={y} value={String(y)} className="cursor-pointer">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] tracking-[0.02em] text-ink-400">少</span>
            {HEAT_LEVELS.map((c, i) => (
              <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
            ))}
            <span className="text-[12px] tracking-[0.02em] text-ink-400">多</span>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex w-fit">
          {/* 星期标签（一/三/五），与 Heatmap 月份标签高度对齐 */}
          <div className="relative mr-1.5 mt-[22px] w-5 shrink-0">
            {[0, 2, 4].map((row) => (
              <span
                key={row}
                className="absolute left-0 text-[11px] leading-[14px] text-ink-400"
                style={{ top: row * (CELL + GAP), height: CELL }}
              >
                {['一', '三', '五'][row / 2]}
              </span>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={year}
              initial={{ x: 24 * slideDir, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24 * slideDir, opacity: 0, transition: { duration: 0.16 } }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <Heatmap
                data={activity}
                year={year}
                cell={CELL}
                gap={GAP}
                empty={yearEmpty}
                onCellClick={(date) => navigate(`/notes?date=${date}`)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: baseDelay + 0.7, duration: 0.3 }}
        className="mt-3 flex items-center gap-1 text-[12px] tracking-[0.02em] text-ink-400"
      >
        当前连续 <span className="tnum font-medium text-ink-700">{streak}</span> 天
        <Flame size={12} className="text-amber" fill="var(--amber)" fillOpacity={0.3} />
        · 点击格子可跳转便签页查看当日记录
      </motion.div>
    </motion.section>
  )
}
