import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { format, getISOWeek } from 'date-fns'
import { greetingByHour, WEEKDAYS_CN } from '@/lib/date'
import { useSettingsStore } from '@/store/useSettingsStore'
import { computeStreak, useStatsStore } from '@/store/useStatsStore'

/** R1 · 问候横幅：问候语逐字入场 + 日期行 + 迷你日历 + 连续天数火焰徽章 */
export default function GreetingBanner() {
  const navigate = useNavigate()
  const userName = useSettingsStore((s) => s.userName)
  const activity = useStatsStore((s) => s.activity)
  const streak = computeStreak(activity).current

  const now = new Date()
  const greeting = `${greetingByHour(now.getHours())}，${userName}`
  const internWeek = Math.max(1, getISOWeek(now) - 6)

  return (
    <div className="col-span-12 flex items-end justify-between">
      <div>
        {/* 问候语：按字 stagger 70ms，y 16→0 */}
        <h2 className="text-[32px] font-bold leading-10 tracking-[-0.02em] text-ink-900">
          {greeting.split('').map((ch, i) => (
            <motion.span
              key={`${i}-${ch}`}
              className="inline-block"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="mt-1.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400"
        >
          今天是 {format(now, 'M月d日')} {WEEKDAYS_CN[now.getDay()]} · 实习第 {internWeek} 周
        </motion.p>
      </div>

      <div className="flex items-center gap-3">
        {/* 迷你日历 chip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="flex items-center gap-2.5 rounded-r-md border border-line bg-surface px-3.5 py-2 shadow-card"
        >
          <span className="text-[12px] font-medium text-ink-500">{format(now, 'M月')}</span>
          <span className="tnum font-display text-[22px] font-bold leading-none text-ink-900">{format(now, 'd')}</span>
        </motion.div>

        {/* 连续天数火焰徽章 */}
        <motion.button
          type="button"
          onClick={() => navigate('/stats#heatmap')}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 500, damping: 22 }}
          className="flex items-center gap-1.5 rounded-r-pill bg-amber-soft px-3.5 py-2"
        >
          <motion.span
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            className="flex"
          >
            <Flame size={16} className="text-amber" fill="var(--amber)" fillOpacity={0.25} />
          </motion.span>
          <span className="text-[13px] text-amber">
            连续记录 <span className="tnum font-display text-[15px] font-semibold">{streak}</span> 天
          </span>
        </motion.button>
      </div>
    </div>
  )
}
