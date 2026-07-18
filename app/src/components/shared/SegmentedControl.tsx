import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

/** 分段控件：灰底胶囊容器 + 白色滑块（layoutId 弹簧动画） */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const id = useId()
  return (
    <div className={cn('inline-flex items-center rounded-r-pill bg-subtle p-[3px]', className)} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative rounded-r-pill font-medium transition-colors duration-150',
              size === 'sm' ? 'h-6 px-2.5 text-[12px]' : 'h-7 px-3 text-[13px]',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-r-pill bg-surface shadow-card"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
