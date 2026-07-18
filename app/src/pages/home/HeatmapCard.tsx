import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import Heatmap, { HEAT_LEVELS } from '@/components/shared/Heatmap'
import { format, subDays } from 'date-fns'
import { computeStreak, useStatsStore } from '@/store/useStatsStore'

/** R5 左 · 活跃热力图卡：年份切换 + 图例 + 底部统计行 */
export default function HeatmapCard() {
  const navigate = useNavigate()
  const activity = useStatsStore((s) => s.activity)
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)

  const { totalYear, bestDay, bestCount } = useMemo(() => {
    let total = 0
    let best = { key: '', count: 0 }
    for (let i = 0; i < 365; i++) {
      const key = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const c = activity[key] ?? 0
      total += c
      if (c > best.count) best = { key, count: c }
    }
    return { totalYear: total, bestDay: best.key, bestCount: best.count }
  }, [activity])

  const streak = computeStreak(activity).current
  const yearEmpty = useMemo(
    () => !Object.keys(activity).some((k) => k.startsWith(String(year)) && (activity[k] ?? 0) > 0),
    [activity, year],
  )

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.56, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-line bg-surface p-6 shadow-card xl:col-span-8"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">活跃热力图</h3>
        <div className="flex items-center gap-4">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="选择年份"
            className="h-7 cursor-pointer rounded-r-sm border border-line-strong bg-surface px-2 text-[12px] text-ink-700 outline-none focus:border-brand-500"
          >
            {[thisYear, thisYear - 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] tracking-[0.02em] text-ink-400">少</span>
            {HEAT_LEVELS.map((c, i) => (
              <span key={i} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: c }} />
            ))}
            <span className="text-[12px] tracking-[0.02em] text-ink-400">多</span>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <Heatmap
          key={year}
          data={activity}
          year={year}
          empty={yearEmpty}
          onCellClick={(date) => navigate(`/notes?date=${date}`)}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.3 }}
        className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12px] tracking-[0.02em] text-ink-400"
      >
        <span>
          过去一年共 <span className="tnum font-medium text-ink-700">{totalYear}</span> 条记录
        </span>
        {bestDay && (
          <span>
            最活跃：{format(new Date(bestDay + 'T00:00:00'), 'M月d日')}（{bestCount} 条）
          </span>
        )}
        <span className="flex items-center gap-1">
          当前连续 {streak} 天 <Flame size={12} className="text-amber" fill="var(--amber)" fillOpacity={0.3} />
        </span>
      </motion.div>
    </motion.section>
  )
}
