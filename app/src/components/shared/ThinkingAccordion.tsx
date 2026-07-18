import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, FileSearch, GitCompareArrows, Lightbulb, PenLine, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThinkingStep } from '@/types'

const STEP_ICONS = [Lightbulb, FileSearch, GitCompareArrows, PenLine]

interface ThinkingAccordionProps {
  steps: ThinkingStep[]
  /** true = 生成完成（✦ 停转并变绿勾） */
  done?: boolean
  /** 如 '3.2s' */
  elapsed?: string
  defaultOpen?: boolean
  className?: string
}

/** 回忆书深度思考折叠面板（design.md §7）：紫藤浅底 + 旋转 ✦ + 步骤时间线 */
export default function ThinkingAccordion({ steps, done = false, elapsed, defaultOpen = false, className }: ThinkingAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const totalMs = steps.reduce((s, x) => s + x.durationMs, 0)
  const elapsedText = elapsed ?? (totalMs > 0 ? `${(totalMs / 1000).toFixed(1)}s` : '')

  return (
    <div className={cn('rounded-r-md border border-ai-500/15 bg-ai-50', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {done ? (
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand-500">
            <Check size={12} strokeWidth={3} className="text-white" />
          </span>
        ) : (
          <Sparkles size={16} className="animate-spin text-ai-500 [animation-duration:1.2s]" />
        )}
        <span className="text-[13px] font-medium text-ai-600">
          深度思考{elapsedText && done ? `（耗时 ${elapsedText}）` : done ? '' : '中…'}
        </span>
        <ChevronDown
          size={14}
          className={cn('ml-auto text-ai-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-3 pb-3 pt-1">
              {steps.map((step, i) => {
                const Icon = STEP_ICONS[i % STEP_ICONS.length]
                return (
                  <motion.div
                    key={step.id}
                    initial={{ x: -8, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.12, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-2.5 py-1"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ai-100">
                      <Icon size={12} className="text-ai-500" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-ink-700">{step.label}</div>
                      {step.detail && <div className="mt-0.5 text-[12px] leading-[18px] text-ink-500">{step.detail}</div>}
                    </div>
                    <span className="shrink-0 rounded-r-pill bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-400">
                      {(step.durationMs / 1000).toFixed(1)}s
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
