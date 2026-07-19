import { memo, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const HEAT_LEVELS = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']

export function heatLevel(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

interface HeatmapProps {
  /** yyyy-MM-dd -> 条数 */
  data: Record<string, number>
  year?: number
  cell?: number
  gap?: number
  onCellClick?: (date: string) => void
  /** 空态：全部虚线格子 + 居中提示 */
  empty?: boolean
  animate?: boolean
  className?: string
}

interface CellInfo {
  date: string
  count: number
  inYear: boolean
}

/** 年度活跃热力图：列=周，行=周一~周日，按格子 stagger 入场（纯 CSS 动画） */
function Heatmap({
  data,
  year = new Date().getFullYear(),
  cell = 11,
  gap = 3,
  onCellClick,
  empty = false,
  animate = true,
  className,
}: HeatmapProps) {
  const [hover, setHover] = useState<{ info: CellInfo; x: number; y: number } | null>(null)

  const { weeks, monthLabels } = useMemo(() => {
    const first = new Date(year, 0, 1)
    // 以周一为一列起点：找到 1月1日 所在周的周一
    const start = new Date(first)
    const dow = (start.getDay() + 6) % 7 // 周一=0
    start.setDate(start.getDate() - dow)

    const weeks: CellInfo[][] = []
    const monthLabels: Array<{ col: number; label: string }> = []
    let lastMonth = -1
    const cursor = new Date(start)
    for (let w = 0; w < 53; w++) {
      const col: CellInfo[] = []
      for (let d = 0; d < 7; d++) {
        const key = format(cursor, 'yyyy-MM-dd')
        col.push({ date: key, count: data[key] ?? 0, inYear: cursor.getFullYear() === year })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(col)
      const m = col.find((c) => c.inYear)?.date
      if (m) {
        const month = Number(m.slice(5, 7))
        if (month !== lastMonth) {
          monthLabels.push({ col: w, label: `${month}月` })
          lastMonth = month
        }
      }
      if (cursor.getFullYear() > year && ((cursor.getDay() + 6) % 7) === 0) break
    }
    return { weeks, monthLabels }
  }, [data, year])

  const step = cell + gap

  return (
    <div className={cn('relative', className)} data-heatmap>
      {/* 月份标签 */}
      <div className="relative mb-1.5 h-4">
        {monthLabels.map((m) => (
          <span
            key={`${m.col}-${m.label}`}
            className="absolute top-0 text-[12px] leading-4 text-ink-400"
            style={{ left: m.col * step, letterSpacing: '0.02em' }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex" style={{ gap }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col" style={{ gap }}>
            {week.map((info, di) => {
              const level = heatLevel(info.count)
              return (
                <div
                  key={info.date}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    const rect = el.getBoundingClientRect()
                    const parent = el.closest('[data-heatmap]')!.getBoundingClientRect()
                    setHover({ info, x: rect.left - parent.left + cell / 2, y: rect.top - parent.top })
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => info.inYear && onCellClick?.(info.date)}
                  className={cn(
                    'rounded-[3px] transition-transform hover:scale-125',
                    animate && 'animate-heat-pop',
                    onCellClick && info.inYear && 'cursor-pointer',
                  )}
                  style={{
                    width: cell,
                    height: cell,
                    backgroundColor: info.inYear ? HEAT_LEVELS[level] : 'transparent',
                    border: empty && info.inYear ? '1px dashed var(--border-strong)' : undefined,
                    boxSizing: 'border-box',
                    // 逐格 stagger 入场延迟
                    animationDelay: animate ? `${(wi * 7 + di) * 1.5}ms` : undefined,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* hover tooltip */}
      {hover && hover.info.inYear && !empty && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-r-sm px-2 py-1 text-[12px] leading-4 text-white"
          style={{
            left: hover.x,
            top: hover.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(23,26,23,.92)',
          }}
        >
          {format(new Date(hover.info.date + 'T00:00:00'), 'M月d日')} · {hover.info.count} 条记录
        </div>
      )}

      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-r-pill bg-surface/85 px-4 py-1.5 text-[13px] text-ink-500 shadow-card">
            开始记录，点亮你的第一格
          </span>
        </div>
      )}
    </div>
  )
}

export default memo(Heatmap)
