import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ChevronDown, Database, SendHorizontal, Sparkles, Square, TriangleAlert } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { SCOPE_OPTIONS, scopeLabel, type MemoryScope } from './scope'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  /** 生成中点击停止（AbortController） */
  onStop: () => void
  generating: boolean
  scope: MemoryScope
  onScopeChange: (s: MemoryScope) => void
  /** 当前范围内的便签数（chip 回显） */
  scopedCount: number
  deepThink: boolean
  onDeepThinkChange: (v: boolean) => void
  aiReady: boolean
}

/** 底部输入条（memory.md §2.3）：自动增高 Textarea + 范围 chip + 深度思考 Switch + 发送/停止 */
export default function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  generating,
  scope,
  onScopeChange,
  scopedCount,
  deepThink,
  onDeepThinkChange,
  aiReady,
}: ChatInputProps) {
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动增高（1~6 行，行高 22px）
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 22), 132)}px`
  }, [value])

  const charCount = value.replace(/\s/g, '').length
  const canSend = charCount > 0 && !generating

  return (
    <div className="relative shrink-0 pt-3">
      {/* 顶部渐变遮罩：消息滚到输入框下方时柔和过渡 */}
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-base to-transparent" />

      {/* AI 未配置提示条（琥珀底） */}
      {!aiReady && (
        <div className="mb-2 flex items-center gap-2 rounded-r-md border border-amber/30 bg-amber-soft px-3 py-2 text-[12px] leading-[18px] text-ink-700">
          <TriangleAlert size={14} className="shrink-0 text-amber" />
          <span>
            AI 服务未配置，当前使用内置演示引擎 ·{' '}
            <Link to="/settings" className="font-medium text-amber hover:underline">
              去配置真实模型 →
            </Link>
          </span>
        </div>
      )}

      {/* 输入框容器：focus 紫环 + 微浮 */}
      <div
        className={cn(
          'rounded-r-xl border-[1.5px] bg-surface px-4 pb-2.5 pt-3 shadow-card transition-all duration-200',
          focused ? '-translate-y-0.5 border-ai-500 shadow-ai' : 'border-line-strong',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={1}
          aria-label="向回忆书提问"
          placeholder="问问你的回忆…（Enter 发送，Shift+Enter 换行）"
          className="block w-full resize-none bg-transparent text-[14px] leading-[22px] text-ink-900 outline-none placeholder:text-ink-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (canSend) onSend()
            }
          }}
        />

        {/* 工具行 */}
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
          <div className="flex items-center gap-3">
            {/* 记忆范围 chip 回显（点击展开选择） */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-6 items-center gap-1 rounded-r-pill bg-subtle px-2.5 text-[12px] font-medium text-ink-500 transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Database size={11} />
                  {scopeLabel(scope)} · {scopedCount} 条
                  <ChevronDown size={11} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 rounded-r-lg border-line bg-surface shadow-pop">
                <DropdownMenuRadioGroup value={scope} onValueChange={(v) => onScopeChange(v as MemoryScope)}>
                  {SCOPE_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem key={o.value} value={o.value} className="text-[13px]">
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 深度思考 Switch（紫） */}
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-ink-500">
              <Sparkles size={12} className="text-ai-500" />
              深度思考
              <Switch
                checked={deepThink}
                onCheckedChange={onDeepThinkChange}
                aria-label="深度思考"
                className="h-[18px] w-8 data-[state=checked]:bg-ai-500 [&>span]:h-3.5 [&>span]:w-3.5 [&>span]:data-[state=checked]:translate-x-[14px]"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            {charCount > 0 && (
              <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{charCount} 字</span>
            )}
            {generating ? (
              <motion.button
                type="button"
                aria-label="停止生成"
                onClick={onStop}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-red text-white shadow-card"
              >
                <Square size={13} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                aria-label="发送"
                onClick={onSend}
                disabled={!canSend}
                whileHover={canSend ? { scale: 1.06 } : undefined}
                whileTap={canSend ? { scale: 0.94 } : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-card transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundImage: canSend ? 'var(--ai-gradient)' : undefined, backgroundColor: canSend ? undefined : 'var(--ink-300)' }}
              >
                <SendHorizontal size={16} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
