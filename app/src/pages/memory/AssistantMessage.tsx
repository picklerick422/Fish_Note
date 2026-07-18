import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Check, Copy, RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import AnswerMarkdown from './AnswerMarkdown'
import ThinkingAccordion from '@/components/shared/ThinkingAccordion'
import Tag from '@/components/shared/Tag'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChatMessage, NoteSource } from '@/types'
import { useNoteById } from '@/store/useNotesStore'
import { wordCount } from '@/lib/date'
import { notify } from '@/lib/toast'

/* ---------------- 参考来源卡 ---------------- */

interface SourceCardProps {
  source: NoteSource
  onOpenSource: (noteId: string) => void
}

function SourceCard({ source, onOpenSource }: SourceCardProps) {
  const navigate = useNavigate()
  const note = useNoteById(source.noteId)
  return (
    <div className="group relative h-[88px] w-[200px] shrink-0">
      <button
        type="button"
        onClick={() => onOpenSource(source.noteId)}
        className="flex h-full w-full flex-col rounded-r-md border border-line bg-surface p-3 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-hover"
      >
        <div>{note && <Tag type={note.kind} className="h-5 px-2 text-[11px]" />}</div>
        <div className="mt-1 line-clamp-1 text-[13px] font-semibold leading-[18px] text-ink-900">{source.title}</div>
        <div className="mt-auto text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
          {note ? `${format(new Date(note.createdAt), 'M月d日')} · ${wordCount(note.contentMarkdown)} 字` : '便签已删除'}
        </div>
      </button>
      {note && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/notes?open=${note.id}`)
          }}
          className="absolute bottom-2 right-2 hidden items-center rounded bg-surface px-1 text-[12px] font-medium text-brand-600 hover:text-brand-700 group-hover:flex"
        >
          在编辑器中打开 →
        </button>
      )}
    </div>
  )
}

/* ---------------- AI 消息 ---------------- */

export interface AssistantMessageProps {
  message: ChatMessage
  /** 该消息是否正在生成中 */
  isPending: boolean
  /** 深度思考面板开关（输入条 ✦ 深度思考 Switch） */
  showThinking: boolean
  /** 前一条用户问题（Token 估算 / 重新生成） */
  promptText: string
  feedback?: 'up' | 'down'
  onOpenSource: (noteId: string) => void
  onRegenerate: (message: ChatMessage) => void
  onFeedback: (id: string, value: 'up' | 'down') => void
}

export default function AssistantMessage({
  message,
  isPending,
  showThinking,
  promptText,
  feedback,
  onOpenSource,
  onRegenerate,
  onFeedback,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  // 生成完成后的 1px 紫环呼吸一次（800ms，design.md §8 AI 生成）
  const [ring, setRing] = useState(false)
  const wasPending = useRef(isPending)
  useEffect(() => {
    if (wasPending.current && !isPending) setRing(true)
    wasPending.current = isPending
  }, [isPending])

  const hasThinking = showThinking && (message.thinkingSteps?.length ?? 0) > 0
  const hasSources = !isPending && (message.sources?.length ?? 0) > 0
  const showActions = !isPending && message.content.length > 0
  const tokens = Math.ceil(promptText.length / 2) + Math.ceil(message.content.length / 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      notify.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 1600)
    } catch {
      notify.error('复制失败，请手动选择文本复制')
    }
  }

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-2.5"
    >
      {/* AI 头像：28px 圆形紫藤渐变 + 白 ✦ */}
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-card"
        style={{ backgroundImage: 'var(--ai-gradient)' }}
      >
        <Sparkles size={13} strokeWidth={2.2} />
      </span>

      <motion.div
        animate={
          ring
            ? { boxShadow: ['0 0 0 0 rgba(139,92,246,.45)', '0 0 0 6px rgba(139,92,246,0)'] }
            : { boxShadow: '0 0 0 0 rgba(139,92,246,0)' }
        }
        transition={{ duration: 0.8 }}
        onAnimationComplete={() => setRing(false)}
        className="min-w-0 max-w-[90%] flex-1 rounded-r-lg"
      >
        {/* 深度思考面板：生成时自动展开（key 重挂载），完成后自动折叠 */}
        {hasThinking && (
          <ThinkingAccordion
            key={`${message.id}-${isPending ? 'live' : 'done'}`}
            steps={message.thinkingSteps ?? []}
            done={!isPending}
            defaultOpen={isPending}
            className="mb-2.5 max-w-[520px]"
          />
        )}

        {/* 回答正文：流式 + Markdown + 内联引用 chip */}
        <div>
          <AnswerMarkdown text={message.content} sources={message.sources} onOpenSource={onOpenSource} />
          {isPending && message.content.length > 0 && (
            <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-caret-blink bg-ai-500 align-baseline" />
          )}
        </div>

        {/* 参考来源卡：正文结束后 300ms，stagger 90ms 弹入 */}
        {hasSources && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.3 } } }}
            className="mt-3 flex gap-3 overflow-x-auto pb-1"
          >
            {(message.sources ?? []).map((s) => (
              <motion.div
                key={s.noteId}
                variants={{
                  hidden: { scale: 0.94, opacity: 0 },
                  show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 26 } },
                }}
              >
                <SourceCard source={s} onOpenSource={onOpenSource} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* 操作行 */}
        {showActions && (
          <div className="mt-2.5 flex items-center gap-4 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-1 transition-colors duration-150 hover:text-ink-700"
            >
              {copied ? <Check size={13} className="text-brand-500" /> : <Copy size={13} />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRetryCount((c) => c + 1)
                onRegenerate(message)
              }}
              className="flex items-center gap-1 transition-colors duration-150 hover:text-ink-700"
            >
              <motion.span
                key={retryCount}
                initial={{ rotate: 0 }}
                animate={{ rotate: retryCount > 0 ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="flex"
              >
                <RefreshCw size={13} />
              </motion.span>
              重新生成
            </button>
            <button
              type="button"
              aria-label="点赞"
              onClick={() => onFeedback(message.id, 'up')}
              className={`flex items-center transition-colors duration-150 hover:text-ink-700 ${
                feedback === 'up' ? 'text-ai-500' : ''
              }`}
            >
              <ThumbsUp size={13} fill={feedback === 'up' ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              aria-label="点踩"
              onClick={() => onFeedback(message.id, 'down')}
              className={`flex items-center transition-colors duration-150 hover:text-ink-700 ${
                feedback === 'down' ? 'text-ai-500' : ''
              }`}
            >
              <ThumbsDown size={13} fill={feedback === 'down' ? 'currentColor' : 'none'} />
            </button>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex cursor-default items-center gap-1 text-ai-500">
                    <Sparkles size={11} />
                    本次消耗 {tokens.toLocaleString()} Token
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">按输入输出字数估算，已计入统计页的 Token 用量</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
