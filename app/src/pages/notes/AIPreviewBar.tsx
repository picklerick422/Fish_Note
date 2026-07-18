/**
 * AI 生成预览条（notes.md §3.2）：编辑器上方滑入，ai-50 底 + ✦ AI 建议 +
 * 流式内容 + 接受 / 重试 / 放弃（Esc）。
 */
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Sparkles, X } from 'lucide-react'
import StreamingText from '@/components/shared/StreamingText'
import { Button } from '@/components/ui/button'
import Kbd from '@/components/shared/Kbd'

interface AIPreviewBarProps {
  /** 操作名，如「润色」 */
  label: string
  /** 流式累积文本 */
  text: string
  /** 是否仍在生成 */
  streaming: boolean
  onAccept?: () => void
  onRetry?: () => void
  onDiscard: () => void
  acceptLabel?: string
  /** 附加内容（自由提问输入框、引用来源等） */
  children?: ReactNode
}

export default function AIPreviewBar({
  label,
  text,
  streaming,
  onAccept,
  onRetry,
  onDiscard,
  acceptLabel = '接受',
  children,
}: AIPreviewBarProps) {
  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -12, opacity: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="mx-6 mt-3 shrink-0 rounded-r-md border border-ai-100 bg-ai-50 p-3"
    >
      <div className="flex items-center gap-2">
        <motion.span
          animate={streaming ? { rotate: 360 } : { rotate: 0 }}
          transition={streaming ? { duration: 1.2, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}
          className="text-ai-500"
        >
          <Sparkles size={14} />
        </motion.span>
        <span className="text-[13px] font-semibold text-ai-600">AI 建议 · {label}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {!streaming && onAccept && (
            <Button size="sm" className="h-7 rounded-r-sm px-2.5 text-[12px]" onClick={onAccept}>
              {acceptLabel}
            </Button>
          )}
          {!streaming && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex h-7 items-center gap-1 rounded-r-sm px-2 text-[12px] text-ink-500 transition-colors hover:bg-surface hover:text-ink-700"
            >
              <RotateCcw size={12} />
              重试
            </button>
          )}
          <button
            type="button"
            onClick={onDiscard}
            className="flex h-7 items-center gap-1 rounded-r-sm px-2 text-[12px] text-ink-400 transition-colors hover:bg-surface hover:text-ink-700"
          >
            <X size={12} />
            放弃
            <Kbd className="h-4 text-[10px]">Esc</Kbd>
          </button>
        </div>
      </div>

      {children}

      {text && (
        <div className="mt-2 max-h-[240px] overflow-auto rounded-r-sm bg-surface/70 p-2.5 text-[13px] leading-6 text-ink-700">
          <StreamingText text={text} markdown speed={40} showCursor={streaming} />
        </div>
      )}
    </motion.div>
  )
}
