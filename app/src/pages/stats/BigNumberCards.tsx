import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { useNoteCounts, useStatsStore } from '@/store/useStatsStore'
import { useNotesStore } from '@/store/useNotesStore'
import { getTokenPrice } from '@/pages/settings/localPrefs'
import { CompactCountUp } from './format'
import { previousRange, sumActivity, type DateRange, type RangeKey } from './range'

/** 每次 AI 调用的平均 Token 估算（用于「AI 整理 / 总结」次数估算） */
const TOKENS_PER_CALL = 2112

function Sparkline({ series, color, id }: { series: number[]; color: string; id: string }) {
  const W = 72
  const H = 30
  const { line, area } = useMemo(() => {
    const max = Math.max(...series, 1)
    const min = Math.min(...series, 0)
    const span = max - min || 1
    const pad = 2
    const stepX = (W - pad * 2) / Math.max(series.length - 1, 1)
    const pts = series.map((v, i) => [pad + i * stepX, H - pad - ((v - min) / span) * (H - pad * 2)] as const)
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    return { line, area: `${line} L${(W - pad).toFixed(1)},${H} L${pad},${H} Z` }
  }, [series])
  return (
    <svg width={W} height={H} className="shrink-0 self-end" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.3 }} />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

/** Token 卡右侧迷你环形：输入（紫）/ 输出（绿）占比 */
function TokenRing({ prompt, completion }: { prompt: number; completion: number }) {
  const total = Math.max(prompt + completion, 1)
  const R = 17
  const C = 2 * Math.PI * R
  const frac = prompt / total
  const fmtK = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString())
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      className="shrink-0 self-end"
      role="img"
      aria-label={`输入 ${fmtK(prompt)} · 输出 ${fmtK(completion)}`}
    >
      <title>{`输入 ${fmtK(prompt)} · 输出 ${fmtK(completion)}`}</title>
      <circle cx="22" cy="22" r={R} fill="none" stroke="var(--brand-400)" strokeWidth="6" />
      <motion.circle
        cx="22"
        cy="22"
        r={R}
        fill="none"
        stroke="var(--ai-500)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={C}
        transform="rotate(-90 22 22)"
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - frac) }}
        transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) return null
  const up = pct >= 0
  return (
    <span className={cn('text-[12px] font-medium', up ? 'text-brand-600' : 'text-red')}>
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {Math.abs(pct) < 0.05 ? '0' : pct.toFixed(0)}%<span className="ml-1 font-normal text-ink-400">较上周期</span>
    </span>
  )
}

interface BigNumberCardsProps {
  rangeKey: RangeKey
  range: DateRange
  /** 行入场延迟基数（行级 stagger 100ms） */
  baseDelay?: number
}

/** R1 · 大数字卡 ×4（stats.md：累计记录 / AI 整理 / 生成报告 / Token 消耗） */
export default function BigNumberCards({ rangeKey, range, baseDelay = 0 }: BigNumberCardsProps) {
  const activity = useStatsStore((s) => s.activity)
  const inspirationSeries = useStatsStore((s) => s.inspirationSeries)
  const tokenUsage = useStatsStore((s) => s.tokenUsage)
  const counts = useNoteCounts()
  const notes = useNotesStore((s) => s.notes)

  const isAll = rangeKey === 'all'

  // 活动总量（当前 / 上周期），用于对比行与比例缩放
  const { curTotal, prevTotal } = useMemo(() => {
    const cur = sumActivity(activity, range)
    const prev = previousRange(range)
    return { curTotal: cur, prevTotal: prev ? sumActivity(activity, prev) : null }
  }, [activity, range])

  const allTotal = useMemo(() => sumActivity(activity, { start: null, end: null }), [activity])
  const ratio = isAll ? 1 : allTotal > 0 ? curTotal / allTotal : 0
  const deltaPct = !isAll && prevTotal && prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null

  // 卡 1 累计记录：全部 = 便签总量；范围内 = 活动条数
  const notesValue = isAll ? counts.total : curTotal

  // 卡 2 AI 整理/总结：按 Token 估算调用次数，范围内按比例缩放
  const aiCalls = Math.max(1, Math.round((tokenUsage.total / TOKENS_PER_CALL) * ratio))

  // 卡 3 生成报告：周报 + 月报（范围内按实际便签创建时间过滤）
  const reportsValue = useMemo(() => {
    if (isAll) return { total: counts.weekly + counts.monthly, weekly: counts.weekly, monthly: counts.monthly }
    let weekly = 0
    let monthly = 0
    for (const n of notes) {
      if (n.deletedAt || (n.kind !== 'weekly' && n.kind !== 'monthly')) continue
      const day = n.createdAt.slice(0, 10)
      if (range.start && day < range.start) continue
      if (range.end && day > range.end) continue
      if (n.kind === 'weekly') weekly += 1
      else monthly += 1
    }
    return { total: weekly + monthly, weekly, monthly }
  }, [isAll, counts, notes, range])

  // 卡 4 Token：范围内按比例缩放；成本按设置页 Token 单价估算
  const tokenValue = Math.round(tokenUsage.total * ratio)
  const cost = (tokenValue / 1000) * getTokenPrice()

  // 近 14 天活动 sparkline
  const noteSeries = useMemo(
    () => Array.from({ length: 14 }, (_, i) => activity[format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')] ?? 0),
    [activity],
  )

  const cards = [
    {
      key: 'notes',
      label: '累计记录',
      unit: '条',
      value: notesValue,
      aside: <Sparkline series={noteSeries} color="var(--brand-500)" id="spark-notes" />,
      foot: isAll ? (
        <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
          日报 <span className="tnum text-ink-500">{counts.daily}</span> · 周报{' '}
          <span className="tnum text-ink-500">{counts.weekly}</span> · 月报{' '}
          <span className="tnum text-ink-500">{counts.monthly}</span>
        </span>
      ) : (
        <Delta pct={deltaPct} />
      ),
    },
    {
      key: 'ai',
      label: 'AI 整理 / 总结',
      unit: '次',
      value: aiCalls,
      aside: <Sparkline series={inspirationSeries} color="var(--ai-500)" id="spark-ai" />,
      foot: isAll ? (
        <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">按 Token 用量估算</span>
      ) : (
        <Delta pct={deltaPct} />
      ),
    },
    {
      key: 'reports',
      label: '生成报告',
      unit: '份',
      value: reportsValue.total,
      aside: null,
      foot: (
        <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
          周报 <span className="tnum text-ink-500">{reportsValue.weekly}</span> · 月报{' '}
          <span className="tnum text-ink-500">{reportsValue.monthly}</span>
        </span>
      ),
    },
    {
      key: 'token',
      label: 'Token 消耗',
      unit: '',
      value: tokenValue,
      aside: <TokenRing prompt={Math.round(tokenUsage.prompt * ratio)} completion={Math.round(tokenUsage.completion * ratio)} />,
      foot: (
        <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
          约 <span className="tnum text-ink-500">¥{cost.toFixed(2)}</span>（按设置中的模型单价估算）
        </span>
      ),
    },
  ]

  return (
    <>
      {cards.map((card, i) => (
        <motion.section
          key={card.key}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: baseDelay + i * 0.06, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-12 flex h-[120px] flex-col justify-between rounded-r-lg border border-line bg-surface p-5 shadow-card sm:col-span-6 xl:col-span-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{card.label}</span>
              <span className="text-[32px] font-bold leading-9 text-ink-900">
                <CompactCountUp value={card.value} duration={1000} delay={baseDelay + i * 0.12} />
                {card.unit && <span className="ml-1 font-sans text-[13px] font-normal text-ink-400">{card.unit}</span>}
              </span>
            </div>
            {card.aside}
          </div>
          <div className="flex h-[18px] items-end">{card.foot}</div>
        </motion.section>
      ))}
    </>
  )
}
