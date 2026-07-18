import { useState } from 'react'
import { motion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts'
import { useNoteCounts } from '@/store/useStatsStore'
import { cn } from '@/lib/utils'
import { ChartTooltip, CompactCountUp } from './format'

interface Slice {
  name: string
  value: number
  color: string
}

/** 扇区 hover 时放大 4%（recharts activeShape） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActive = (props: any) => (
  <Sector {...props} outerRadius={props.outerRadius * 1.04} cornerRadius={4} />
)

interface CategoryDonutCardProps {
  baseDelay?: number
}

/** R3 右 · 分类分布环形图（日报/周报/月报/随手记，stats.md R3） */
export default function CategoryDonutCard({ baseDelay = 0.26 }: CategoryDonutCardProps) {
  const counts = useNoteCounts()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const slices: Slice[] = [
    { name: '日报', value: counts.daily, color: 'var(--brand-500)' },
    { name: '随手记', value: counts.memo, color: '#94A3B8' },
    { name: '周报', value: counts.weekly, color: 'var(--blue)' },
    { name: '月报', value: counts.monthly, color: 'var(--ai-500)' },
  ].filter((s) => s.value > 0)

  const total = counts.total

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: baseDelay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-line bg-surface p-6 shadow-card xl:col-span-4"
    >
      <h3 className="text-[16px] font-semibold leading-6 text-ink-900">分类分布</h3>

      <div className="mt-2 flex items-center">
        <div className="relative h-[190px] w-[55%] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  const p = payload?.[0]
                  if (!p) return null
                  return (
                    <ChartTooltip
                      active={active}
                      lines={[{ name: String(p.name ?? ''), value: `${p.value} 条`, color: (p.payload as Slice).color }]}
                    />
                  )
                }}
              />
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                cornerRadius={4}
                startAngle={90}
                endAngle={-270}
                isAnimationActive
                animationDuration={700}
                activeIndex={activeIdx ?? undefined}
                activeShape={renderActive}
                onMouseEnter={(_, i) => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                stroke="var(--surface)"
                strokeWidth={2}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* 中心大数字 */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <CompactCountUp
              value={total}
              duration={1000}
              delay={baseDelay + 0.3}
              className="text-[26px] font-bold leading-8 text-ink-900"
            />
            <span className="mt-0.5 text-[12px] tracking-[0.02em] text-ink-400">总便签</span>
          </div>
        </div>

        {/* 图例列 */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {slices.map((s, i) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
            return (
              <button
                key={s.name}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                className={cn(
                  'flex items-center gap-2 rounded-r-sm px-2 py-1.5 text-left transition-colors duration-150',
                  activeIdx === i ? 'bg-subtle' : 'hover:bg-subtle',
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="text-[13px] leading-5 text-ink-700">{s.name}</span>
                <span className="tnum ml-auto text-[13px] font-medium leading-5 text-ink-900">{s.value}</span>
                <span className="tnum w-9 text-right text-[12px] leading-5 text-ink-400">{pct}%</span>
              </button>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
