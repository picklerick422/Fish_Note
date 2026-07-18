import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CountUpProps {
  value: number
  /** 动画时长 ms，默认 900（design.md §8） */
  duration?: number
  delay?: number
  /** 千分位分隔，默认 true */
  separator?: boolean
  decimals?: number
  className?: string
}

/** 大数字滚动计数：value 变化时从当前显示值平滑滚动到新值 */
export default function CountUp({
  value,
  duration = 900,
  delay = 0,
  separator = true,
  decimals = 0,
  className,
}: CountUpProps) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = fromRef.current
    if (reduced) {
      fromRef.current = value
      return
    }
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      const current = from + (value - from) * eased
      fromRef.current = current
      setDisplay(current)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, delay, reduced])

  const text = (reduced ? value : display).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: separator,
  })
  return <span className={cn('tnum', className)}>{text}</span>
}
