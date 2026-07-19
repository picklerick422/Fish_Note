import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  /** brand=纯色雾蓝；xp=琥珀→雾蓝渐变；ai=紫藤渐变 */
  variant?: 'brand' | 'xp' | 'ai'
  delay?: number
  className?: string
}

const FILLS: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  brand: 'var(--brand-500)',
  xp: 'linear-gradient(90deg,#FBBF24,#4A6FA5)',
  ai: 'var(--ai-gradient)',
}

/** 进度条（经验值/Token）：入场宽 0→目标 900ms ease-out-emphasized */
export default function ProgressBar({ value, max = 100, variant = 'brand', delay = 0, className }: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-r-pill bg-subtle dark:bg-line', className)}>
      <motion.div
        className="h-full rounded-r-pill"
        style={{ background: FILLS[variant] }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}
