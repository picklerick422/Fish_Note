/** 统计页共享小部件 */
import CountUp from '@/components/shared/CountUp'
import { cn } from '@/lib/utils'
import { compact } from './num'

interface CompactCountUpProps {
  value: number
  duration?: number
  delay?: number
  className?: string
}

/** Sora 大数字（自动 K 压缩 + CountUp 千分位滚动） */
export function CompactCountUp({ value, duration = 1000, delay = 0, className }: CompactCountUpProps) {
  const c = compact(value)
  return (
    <span className={cn('tnum font-display', className)}>
      <CountUp value={c.value} duration={duration} delay={delay} decimals={c.decimals} />
      {c.suffix}
    </span>
  )
}

/** recharts 统一白底 tooltip 卡（stats.md：白底 r-md shadow-pop） */
export function ChartTooltip({
  active,
  label,
  lines,
}: {
  active?: boolean
  label?: string
  lines: Array<{ name: string; value: string | number; color?: string }>
}) {
  if (!active) return null
  return (
    <div className="rounded-r-md border border-line bg-surface px-3 py-2 shadow-pop">
      {label && <div className="mb-1 text-[12px] font-medium text-ink-900">{label}</div>}
      {lines.map((l) => (
        <div key={l.name} className="flex items-center gap-1.5 text-[12px] leading-[18px] text-ink-500">
          {l.color && <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />}
          <span>{l.name}</span>
          <span className="tnum ml-auto pl-3 font-medium text-ink-900">{l.value}</span>
        </div>
      ))}
    </div>
  )
}
