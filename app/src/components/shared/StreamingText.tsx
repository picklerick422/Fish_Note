import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import MarkdownRenderer from './MarkdownRenderer'

interface StreamingTextProps {
  /** 目标全文（可持续增长，组件按 speed 追赶揭示） */
  text: string
  /** 字/秒，默认 28（design.md §7） */
  speed?: number
  startDelay?: number
  /** 以 Markdown 渲染（默认纯文本） */
  markdown?: boolean
  showCursor?: boolean
  onDone?: () => void
  className?: string
}

/** AI 流式文本：逐字出现 + 紫色闪烁光标；尊重 prefers-reduced-motion */
export default function StreamingText({
  text,
  speed = 28,
  startDelay = 0,
  markdown = false,
  showCursor = true,
  onDone,
  className,
}: StreamingTextProps) {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (reduced) return
    let interval: ReturnType<typeof setInterval> | undefined
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => {
          if (c >= text.length) return c
          return Math.min(c + Math.max(1, Math.round(speed / 20)), text.length)
        })
      }, 50)
    }, startDelay)
    return () => {
      clearTimeout(timer)
      if (interval) clearInterval(interval)
    }
  }, [reduced, speed, startDelay, text.length])

  const done = reduced || count >= text.length
  useEffect(() => {
    if (done && !doneRef.current) {
      doneRef.current = true
      onDone?.()
    }
    if (!done) doneRef.current = false
  }, [done, onDone])

  const shown = reduced ? text : text.slice(0, count)

  return (
    <span className={cn('relative inline', className)}>
      {markdown ? (
        <MarkdownRenderer>{shown}</MarkdownRenderer>
      ) : (
        <span className="whitespace-pre-wrap">{shown}</span>
      )}
      <AnimatePresence>
        {showCursor && !done && (
          <motion.span
            key="cursor"
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-caret-blink bg-ai-500 align-baseline"
          />
        )}
      </AnimatePresence>
    </span>
  )
}
