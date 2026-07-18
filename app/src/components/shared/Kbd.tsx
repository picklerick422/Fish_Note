import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 键帽样式（design.md §7 Kbd）：JetBrains Mono + 下边 2px 厚度 */
export default function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[22px] items-center rounded-md border border-line-strong border-b-2 bg-subtle px-1.5',
        'font-mono text-[12px] leading-none text-ink-500',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
