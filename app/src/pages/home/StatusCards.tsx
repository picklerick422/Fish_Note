import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import CountUp from '@/components/shared/CountUp'
import ProgressBar from '@/components/shared/ProgressBar'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { computeStreak, useNoteCounts, useStatsStore, xpForNext } from '@/store/useStatsStore'

function StatCard({
  index,
  onClick,
  id,
  children,
}: {
  index: number
  onClick: () => void
  id?: string
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      id={id}
      onClick={onClick}
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.08, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-hover)' }}
      className="col-span-12 flex h-32 flex-col justify-between rounded-r-lg border border-line bg-surface p-5 text-left sm:col-span-6 xl:col-span-3"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </motion.button>
  )
}

const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{children}</span>
)

/** 近 14 天收益 sparkline（描边动画 + 面积淡入） */
function Sparkline({ series }: { series: number[] }) {
  const W = 64
  const H = 28
  const { line, area } = useMemo(() => {
    const max = Math.max(...series, 1)
    const min = Math.min(...series, 0)
    const range = max - min || 1
    const pad = 2
    const stepX = (W - pad * 2) / (series.length - 1)
    const pts = series.map(
      (v, i) => [pad + i * stepX, H - pad - ((v - min) / range) * (H - pad * 2)] as const,
    )
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    const area = `${line} L${(W - pad).toFixed(1)},${H} L${pad},${H} Z`
    return { line, area }
  }, [series])
  return (
    <svg width={W} height={H} className="shrink-0 self-end">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-100)" />
          <stop offset="100%" stopColor="var(--brand-100)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill="url(#spark-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.3 }} />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--brand-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

/** 小鱼头像：每 5s 眨眼（下压 200ms） */
function BlinkingSprout() {
  const [blink, setBlink] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setBlink((b) => b + 1), 5000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-50">
      <motion.img
        key={blink}
        src="./mascot-sprout.svg"
        alt="小鱼"
        className="h-8 w-8"
        animate={{ scaleY: [1, 0.88, 1] }}
        transition={{ duration: 0.2 }}
      />
    </span>
  )
}

/** R2 · 状态卡 ×4：等级 / 灵感收益 / 累计便签 / 连续记录 */
export default function StatusCards() {
  const navigate = useNavigate()
  const level = useStatsStore((s) => s.level)
  const xp = useStatsStore((s) => s.xp)
  const inspiration = useStatsStore((s) => s.inspiration)
  const inspirationWeek = useStatsStore((s) => s.inspirationWeek)
  const series = useStatsStore((s) => s.inspirationSeries)
  const activity = useStatsStore((s) => s.activity)
  const counts = useNoteCounts()
  const streak = computeStreak(activity)
  const nextXp = xpForNext(level)
  const daysToLevelUp = Math.max(1, Math.ceil((nextXp - xp) / 60))
  const last7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => (activity[format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')] ?? 0) > 0),
    [activity],
  )

  return (
    <>
      {/* 卡 1 · 当前等级 */}
      <StatCard index={0} onClick={() => navigate('/stats')}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Caption>当前等级</Caption>
            <span className="tnum font-display text-[36px] font-bold leading-10 text-ink-900">
              Lv.<CountUp value={level} duration={900} separator={false} />
            </span>
          </div>
          <BlinkingSprout />
        </div>
        <div>
          <ProgressBar value={xp} max={nextXp} variant="xp" delay={0.2} />
          <p className="mt-1.5 text-[12px] text-ink-400">
            <span className="tnum">{xp.toLocaleString()} / {nextXp.toLocaleString()}</span> · 再记 {daysToLevelUp} 天升级
          </p>
        </div>
      </StatCard>

      {/* 卡 2 · 灵感收益（+20 飞入目标 id=inspiration-card） */}
      <StatCard index={1} onClick={() => navigate('/stats')} id="inspiration-card">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Caption>灵感收益</Caption>
            <span className="tnum font-display text-[32px] font-bold leading-9 text-ink-900">
              <CountUp value={inspiration} duration={1200} />
            </span>
          </div>
          <Sparkline series={series} />
        </div>
        <span className="text-[12px] font-medium text-brand-600">▲ +{inspirationWeek} 本周</span>
      </StatCard>

      {/* 卡 3 · 累计便签 */}
      <StatCard index={2} onClick={() => navigate('/notes')}>
        <div className="flex flex-col gap-1">
          <Caption>累计便签</Caption>
          <span className="tnum font-display text-[32px] font-bold leading-9 text-ink-900">
            <CountUp value={counts.total} duration={1000} />
          </span>
        </div>
        <div className="flex gap-1.5">
          {([
            ['日报', counts.daily, 'bg-brand-50 text-brand-700'],
            ['周报', counts.weekly, 'bg-blue-soft text-blue'],
            ['月报', counts.monthly, 'bg-ai-50 text-ai-600'],
          ] as const).map(([label, n, cls], i) => (
            <motion.span
              key={label}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.24 }}
              className={cn('rounded-r-pill px-2 py-0.5 text-[11px] font-medium', cls)}
            >
              {label} <span className="tnum">{n}</span>
            </motion.span>
          ))}
        </div>
      </StatCard>

      {/* 卡 4 · 连续记录 */}
      <StatCard index={3} onClick={() => navigate('/stats')}>
        <div className="flex flex-col gap-1">
          <Caption>连续记录</Caption>
          <div className="flex items-baseline gap-1">
            <span className="tnum font-display text-[32px] font-bold leading-9 text-ink-900">
              <CountUp value={streak.current} duration={1000} separator={false} />
            </span>
            <span className="text-[13px] text-ink-400">天</span>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <Caption>最长纪录 {streak.longest} 天</Caption>
          <div className="flex gap-1.5">
            {last7.map((active, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 500, damping: 20 }}
                className={cn(
                  'h-2 w-2 rounded-full',
                  active ? 'bg-brand-500' : 'border border-line-strong bg-transparent',
                )}
                style={
                  i === 6 && active
                    ? { animation: 'pulse-ring 1.6s ease-in-out infinite' }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </StatCard>
    </>
  )
}
