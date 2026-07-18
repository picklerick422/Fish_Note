/**
 * 源码编辑器：等宽字体 + 行号 + 当前行高亮 + 轻量语法高亮覆盖层 + AI 幽灵补全。
 * 技术方案：透明文字的 textarea 叠在同字距的 <pre> 高亮层上（业界经典方案），
 * 幽灵补全以灰色斜体内联在高亮层光标处，气泡「Tab 接受 · Esc 忽略」按光标坐标定位。
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as RKeyboardEvent,
  type RefObject,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getAIProvider } from '@/ai'
import { cn } from '@/lib/utils'
import { highlightLine } from './highlight'
import type { ToolbarOp } from './markdownOps'

interface Ghost {
  text: string
  pos: number
}

interface MarkdownEditorProps {
  value: string
  onChange: (v: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  aiEnabled: boolean
  aiReady: boolean
  onCursorChange?: (ln: number, col: number) => void
  /** 滚动比例（0~1），用于预览同步 */
  onScrollRatio?: (ratio: number) => void
  /** Ctrl/Cmd+B/I 等编辑快捷键，返回 true 表示已处理 */
  onShortcutOp?: (op: ToolbarOp) => boolean
  placeholder?: string
}

export default function MarkdownEditor({
  value,
  onChange,
  textareaRef,
  aiEnabled,
  aiReady,
  onCursorChange,
  onScrollRatio,
  onShortcutOp,
  placeholder,
}: MarkdownEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const caretMarkRef = useRef<HTMLSpanElement>(null)
  const ghostBoxRef = useRef<HTMLDivElement>(null)

  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [cursor, setCursor] = useState(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const composingRef = useRef(false)
  const lastSyncRef = useRef(0)

  const lines = value.split('\n')
  const cursorLine = value.slice(0, cursor).split('\n').length - 1

  /* ---------- 幽灵补全 ---------- */

  const cancelGhost = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setGhost(null)
  }, [])

  const scheduleCompletion = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      const ta = textareaRef.current
      if (!ta || !aiEnabled || !aiReady || composingRef.current) return
      const pos = ta.selectionStart
      const ctx = ta.value.slice(0, pos)
      if (ctx.trim().length < 8) return
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      getAIProvider()
        .complete(ctx, {
          signal: ctrl.signal,
          onToken: (_, full) => setGhost({ text: full, pos }),
        })
        .catch(() => undefined)
        .finally(() => {
          if (abortRef.current === ctrl) abortRef.current = null
        })
    }, 800) // 停笔 800ms 后请求（notes.md §3.3）
  }, [aiEnabled, aiReady, textareaRef])

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (typingRef.current) clearInterval(typingRef.current)
      abortRef.current?.abort()
    }
  }, [])

  /** Tab 接受：幽灵字以打字机效果落墨（notes.md §3.3） */
  const acceptGhost = useCallback(() => {
    if (!ghost) return
    const full = ghost.text
    const at = ghost.pos
    setGhost(null)
    const ta = textareaRef.current
    let i = 0
    if (typingRef.current) clearInterval(typingRef.current)
    typingRef.current = setInterval(() => {
      i += 1
      const inserted = full.slice(0, i)
      const next = value.slice(0, at) + inserted + value.slice(at)
      onChange(next)
      const caret = at + i
      requestAnimationFrame(() => {
        if (ta) {
          ta.selectionStart = caret
          ta.selectionEnd = caret
          setCursor(caret)
        }
      })
      if (i >= full.length && typingRef.current) {
        clearInterval(typingRef.current)
        typingRef.current = null
      }
    }, 36) // ≈60ms/字 的打字机节奏（每拍 1~2 字）
  }, [ghost, value, onChange, textareaRef])

  /* ---------- 事件 ---------- */

  const reportCursor = useCallback(
    (pos: number) => {
      setCursor(pos)
      const before = value.slice(0, pos)
      const ln = before.split('\n').length
      const col = pos - before.lastIndexOf('\n')
      onCursorChange?.(ln, col)
    },
    [value, onCursorChange],
  )

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    cancelGhost()
    if (typingRef.current) {
      clearInterval(typingRef.current)
      typingRef.current = null
    }
    onChange(e.target.value)
    setCursor(e.target.selectionStart)
    scheduleCompletion()
  }

  const handleKeyDown = (e: RKeyboardEvent<HTMLTextAreaElement>) => {
    if (composingRef.current) return
    if (ghost && e.key === 'Tab') {
      e.preventDefault()
      acceptGhost()
      return
    }
    if (e.key === 'Escape' && ghost) {
      e.preventDefault()
      cancelGhost()
      return
    }
    if (e.key === 'Tab') {
      // 无补全时 Tab 插入两格缩进
      e.preventDefault()
      const ta = e.currentTarget
      const { selectionStart: s, selectionEnd: t } = ta
      onChange(value.slice(0, s) + '  ' + value.slice(t))
      requestAnimationFrame(() => {
        ta.selectionStart = s + 2
        ta.selectionEnd = s + 2
      })
      return
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && onShortcutOp) {
      const k = e.key.toLowerCase()
      const op: ToolbarOp | null = k === 'b' ? 'bold' : k === 'i' ? 'italic' : null
      if (op && onShortcutOp(op)) e.preventDefault()
    }
  }

  /** 把「Tab 接受」气泡定位到光标处（相对 wrapper 坐标） */
  const positionGhostBox = useCallback(() => {
    const box = ghostBoxRef.current
    const mark = caretMarkRef.current
    const wrap = wrapRef.current
    if (!box || !mark || !wrap) return
    const m = mark.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()
    const left = Math.min(Math.max(8, m.left - w.left), w.width - 160)
    box.style.left = `${left}px`
    box.style.top = `${m.top - w.top}px`
  }, [])

  const handleScroll = () => {
    const ta = textareaRef.current
    if (!ta) return
    if (preRef.current) preRef.current.scrollTop = ta.scrollTop
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop
    positionGhostBox()
    const now = performance.now()
    if (now - lastSyncRef.current > 100) {
      lastSyncRef.current = now
      const max = ta.scrollHeight - ta.clientHeight
      onScrollRatio?.(max > 0 ? ta.scrollTop / max : 0)
    }
  }

  useLayoutEffect(() => {
    positionGhostBox()
  }, [ghost, value, positionGhostBox])

  /* ---------- 渲染 ---------- */

  const ghostLineIdx = ghost ? value.slice(0, ghost.pos).split('\n').length - 1 : -1
  const ghostCol = ghost ? ghost.pos - (value.lastIndexOf('\n', ghost.pos - 1) + 1) : 0

  return (
    <div ref={wrapRef} className="relative h-full min-h-0 flex-1 overflow-hidden">
      {/* 高亮层（与 textarea 同字距/同 padding，位于其下） */}
      <pre
        ref={preRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden py-5 pl-14 pr-6 font-mono text-[13px] leading-[22px]"
        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', tabSize: 4 }}
      >
        {lines.map((line, i) => {
          const isCurrent = i === cursorLine
          let content = highlightLine(line, i)
          if (ghost && i === ghostLineIdx) {
            const before = line.slice(0, ghostCol)
            const after = line.slice(ghostCol)
            content = (
              <>
                {highlightLine(before, i)}
                <span ref={caretMarkRef} />
                <span className="italic text-ink-400">{ghost.text}</span>
                {after ? highlightLine(after, i + 100000) : '​'}
              </>
            )
          }
          return (
            <div
              key={i}
              className={cn(isCurrent && 'bg-subtle')}
              style={
                isCurrent
                  ? { marginLeft: -56, marginRight: -24, paddingLeft: 56, paddingRight: 24 }
                  : undefined
              }
            >
              {line === '' && !(ghost && i === ghostLineIdx) ? '​' : content}
            </div>
          )
        })}
        {/* 末尾多一行，保证与 textarea 末行滚动高度一致 */}
        <div>​</div>
      </pre>

      {/* 行号列（40px，caption 灰，当前行加深） */}
      <div
        ref={gutterRef}
        aria-hidden
        className="absolute bottom-0 left-0 top-0 z-20 w-10 overflow-hidden border-r border-line bg-surface py-5 pr-2 text-right font-mono text-[12px] leading-[22px] text-ink-300"
      >
        {lines.map((_, i) => (
          <div key={i} className={cn(i === cursorLine && 'font-medium text-ink-500')}>
            {i + 1}
          </div>
        ))}
        <div>&nbsp;</div>
      </div>

      {/* 透明文字输入层 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onSelect={(e) => reportCursor(e.currentTarget.selectionStart)}
        onCompositionStart={() => (composingRef.current = true)}
        onCompositionEnd={() => (composingRef.current = false)}
        spellCheck={false}
        placeholder={placeholder}
        className="absolute inset-0 z-10 h-full w-full resize-none overflow-auto bg-transparent py-5 pl-14 pr-6 font-mono text-[13px] leading-[22px] text-transparent caret-ink-900 outline-none placeholder:text-ink-400"
        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', tabSize: 4 }}
      />

      {/* 幽灵补全气泡：Tab 接受 · Esc 忽略 */}
      <AnimatePresence>
        {ghost && (
          <motion.div
            key="ghost-tip"
            ref={ghostBoxRef}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-30"
            style={{ left: 64, top: 40 }}
          >
            <span className="absolute top-[24px] flex items-center gap-1 whitespace-nowrap rounded-r-sm bg-ai-50 px-1.5 py-0.5 text-[12px] text-ai-500 shadow-card">
              <kbd className="rounded border border-ai-400/40 bg-surface px-1 font-mono text-[10px]">Tab</kbd>
              接受 ·
              <kbd className="rounded border border-ai-400/40 bg-surface px-1 font-mono text-[10px]">Esc</kbd>
              忽略
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
