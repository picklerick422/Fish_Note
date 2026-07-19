/**
 * 编辑器区（notes.md §三）：标题 + meta 行 + 工具栏 + AI 预览条 +
 * 源码/预览双栏（可拖分栏、滚动同步、可点待办）+ 底部状态栏。
 */
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as RMouseEvent,
  type RefObject,
} from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { getAIProvider, isAbortError } from '@/ai'
import EmptyState from '@/components/shared/EmptyState'
import Tag from '@/components/shared/Tag'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { wordCount } from '@/lib/date'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useNotesStore } from '@/store/useNotesStore'
import { useAIReady } from '@/store/useSettingsStore'
import type { Note, NoteKind } from '@/types'
import AIPreviewBar from './AIPreviewBar'
import MarkdownEditor from './MarkdownEditor'
import Toolbar, { AI_ACTIONS, type AIAction, type ViewMode } from './Toolbar'
import { KIND_LABEL, suggestTags, suggestTitle } from './constants'
import { applyOp, type ToolbarOp } from './markdownOps'

/* ---------------- AI 任务状态 ---------------- */

type ApplyMode = 'replace' | 'cursor' | 'append' | 'ask'

interface AITask {
  action: AIAction
  label: string
  text: string
  streaming: boolean
  applyMode: ApplyMode
  range: { start: number; end: number }
  question?: string
}

const AI_LABEL: Record<AIAction, string> = {
  ...Object.fromEntries(AI_ACTIONS.map((a) => [a.action, a.label])),
  ask: '自由提问',
} as Record<AIAction, string>

/* ---------------- 预览渲染（可点击待办） ---------------- */

/** 300ms 防抖：预览区不随每次击键全量重渲染 Markdown */
function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

// ReactMarkdown 插件数组固定为模块级常量，避免每次渲染换引用
const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeHighlight]

const PreviewPane = memo(function PreviewPane({
  content,
  onToggleTask,
  scrollRef,
  onScroll,
}: {
  content: string
  onToggleTask: (lineIdx: number | undefined, seq: number) => void
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
}) {
  // components 依赖 content：内容变化时重建以重置复选框序号
  const components = useMemo<Components>(() => {
    let checkboxSeq = 0
    return {
      input: ({ node, disabled, ...rest }) => {
        if (rest.type !== 'checkbox') return <input disabled={disabled} {...rest} />
        const seq = checkboxSeq++
        const line = node?.position?.start.line ? node.position.start.line - 1 : undefined
        return (
          <input {...rest} className="cursor-pointer" onChange={() => onToggleTask(line, seq)} />
        )
      },
    }
    // content 是有意依赖：内容变化时重建 components 以重置 checkboxSeq
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onToggleTask, content])
  return (
    <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-auto px-7 py-6">
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={components}>
          {content || '*暂无内容*'}
        </ReactMarkdown>
      </div>
    </div>
  )
})

/* ---------------- 主组件 ---------------- */

interface EditorPaneProps {
  note: Note | undefined
  onRequestNew: () => void
  focusMode: boolean
  onToggleFocus: () => void
}

export default function EditorPane({ note, onRequestNew, focusMode, onToggleFocus }: EditorPaneProps) {
  const navigate = useNavigate()
  const updateNote = useNotesStore((s) => s.updateNote)
  const addTag = useNotesStore((s) => s.addTag)
  const removeTag = useNotesStore((s) => s.removeTag)
  const aiReady = useAIReady()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [cursor, setCursor] = useState({ ln: 1, col: 1 })
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [aiEnabled, setAiEnabled] = useState(() => localStorage.getItem('sg-ai-completion') !== 'off')
  const [ghostTitle, setGhostTitle] = useState<string | null>(null)
  const [task, setTask] = useState<AITask | null>(null)
  const [askInput, setAskInput] = useState('')
  const [tagInput, setTagInput] = useState<string | null>(null)
  const [ratio, setRatio] = useState(0.5)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const panesRef = useRef<HTMLDivElement | null>(null)
  const aiAbort = useRef<AbortController | null>(null)
  const syncGuard = useRef(0)
  const noteId = note?.id

  /* latest 快照：切便签/卸载时兜底落盘 */
  const latest = useRef({ id: '', title: '', content: '', dirty: false })
  latest.current = { id: noteId ?? '', title, content, dirty }
  const flushLatest = useCallback(() => {
    const l = latest.current
    if (l.id && l.dirty) {
      useNotesStore.getState().updateNote(l.id, { title: l.title, contentMarkdown: l.content })
    }
  }, [])

  /* 切换便签：先落盘旧草稿，再中止 AI 任务 */
  useEffect(() => {
    flushLatest()
    setTask(null)
    setGhostTitle(null)
    aiAbort.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])
  useEffect(() => () => flushLatest(), [flushLatest])

  /* note id 变化 → 重置本地草稿 */
  useEffect(() => {
    setTitle(note && note.title !== '未命名便签' ? note.title : '')
    setContent(note?.contentMarkdown ?? '')
    setDirty(false)
    setSaveState('saved')
    setCursor({ ln: 1, col: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  /* 自动保存（1s 防抖，notes.md 快捷键表） */
  useEffect(() => {
    if (!dirty || !noteId) return
    setSaveState('saving')
    const t = setTimeout(() => {
      updateNote(noteId, { title, contentMarkdown: content })
      setSaveState('saved')
      setDirty(false)
    }, 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, dirty, noteId])

  /* AI 幽灵标题：正文 ≥20 字且标题为空时浮现（notes.md §3.1） */
  useEffect(() => {
    if (!noteId || title.trim() !== '' || wordCount(content) < 20) {
      setGhostTitle(null)
      return
    }
    const t = setTimeout(() => {
      const s = suggestTitle(content)
      setGhostTitle(s || null)
    }, 800)
    return () => clearTimeout(t)
  }, [content, title, noteId])

  const markDirty = () => setDirty(true)

  const handleContentChange = (v: string) => {
    setContent(v)
    markDirty()
  }

  const saveNow = useCallback(() => {
    const l = latest.current
    if (!l.id) return
    updateNote(l.id, { title: l.title, contentMarkdown: l.content })
    setDirty(false)
    setSaveState('saved')
    notify.success('已保存')
  }, [updateNote])

  /* 页内快捷键：⌘S 保存 · ⌘⇧P 专注 · ⌘1/2/3 视图 · Esc 关闭预览条 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveNow()
        return
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        onToggleFocus()
        return
      }
      if (mod && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        setViewMode(e.key === '1' ? 'edit' : e.key === '2' ? 'split' : 'preview')
        return
      }
      if (e.key === 'Escape') {
        setTask((t) => {
          if (t) {
            aiAbort.current?.abort()
            return null
          }
          return t
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveNow, onToggleFocus])

  /* 工具栏操作：作用于 textarea 选区 */
  const handleOp = useCallback(
    (op: ToolbarOp): boolean => {
      const ta = textareaRef.current
      if (!ta || !noteId) return false
      const r = applyOp({ value: ta.value, start: ta.selectionStart, end: ta.selectionEnd }, op)
      setContent(r.value)
      markDirty()
      requestAnimationFrame(() => {
        ta.focus()
        ta.selectionStart = r.selStart
        ta.selectionEnd = r.selEnd
      })
      return true
    },
    [noteId],
  )

  /* ---------------- AI 操作 ---------------- */
  const runAI = useCallback(
    async (action: AIAction, question?: string) => {
      if (!noteId) return
      if (action === 'titletags') {
        const untitled = title.trim() === ''
        const st = suggestTitle(content)
        const tags = suggestTags(content, note?.tags ?? [])
        if (untitled && st) {
          setTitle(st)
          markDirty()
        }
        tags.forEach((t) => addTag(noteId, t))
        if ((untitled && st) || tags.length > 0) notify.ai('已生成标题与标签建议')
        else notify.info('标题与标签已就绪')
        return
      }

      const ta = textareaRef.current
      const start = ta?.selectionStart ?? content.length
      const end = ta?.selectionEnd ?? content.length
      const hasSel = end > start
      const sel = hasSel ? content.slice(start, end) : content
      const ai = getAIProvider()
      aiAbort.current?.abort()
      const ctrl = new AbortController()
      aiAbort.current = ctrl
      const stream = {
        signal: ctrl.signal,
        onToken: (_c: string, full: string) => setTask((t) => (t ? { ...t, text: full } : t)),
      }
      const base = { action, range: { start, end }, question }

      try {
        switch (action) {
          case 'structure':
            setTask({ ...base, label: AI_LABEL.structure, text: '', streaming: true, applyMode: 'replace' })
            await ai.structure(sel, { target: note?.kind === 'daily' ? 'daily' : 'memo', ...stream })
            break
          case 'continue':
            setTask({ ...base, label: AI_LABEL.continue, text: '', streaming: true, applyMode: 'cursor' })
            await ai.complete(content.slice(0, start), stream)
            break
          case 'polish':
            setTask({ ...base, label: AI_LABEL.polish, text: '', streaming: true, applyMode: 'replace' })
            await ai.chat(
              [
                {
                  role: 'system',
                  content:
                    '你是中文文字润色助手。润色用户给出的文本，使语句更通顺、表达更清晰，保留原意与 Markdown 结构，只输出润色后的文本。',
                },
                { role: 'user', content: sel },
              ],
              stream,
            )
            break
          case 'summarize':
            setTask({ ...base, label: AI_LABEL.summarize, text: '', streaming: true, applyMode: 'append' })
            await ai.summarize(sel, stream)
            break
          case 'todos': {
            setTask({ ...base, label: AI_LABEL.todos, text: '', streaming: true, applyMode: 'append' })
            const todos = await ai.extractTodos(sel)
            const text =
              todos.length > 0
                ? `\n### ✅ 待办清单（AI 提取）\n${todos.map((t) => `- [ ] ${t}`).join('\n')}`
                : '（未从文中提取到待办事项）'
            setTask((t) => (t ? { ...t, text } : t))
            break
          }
          case 'translate':
            setTask({ ...base, label: AI_LABEL.translate, text: '', streaming: true, applyMode: 'replace' })
            await ai.chat(
              [
                {
                  role: 'system',
                  content:
                    "Translate the user's Markdown text into natural English. Keep the Markdown structure intact. Output only the translation.",
                },
                { role: 'user', content: sel },
              ],
              stream,
            )
            break
          case 'ask': {
            if (question === undefined) {
              setTask({ ...base, label: AI_LABEL.ask, text: '', streaming: false, applyMode: 'ask' })
              setAskInput('')
              return
            }
            setTask((t) => (t ? { ...t, text: '', streaming: true, question } : t))
            const res = await ai.ask(question, stream)
            if (res.sources.length > 0) {
              setTask((t) =>
                t
                  ? {
                      ...t,
                      text: `${t.text}\n\n---\n引用来源：${res.sources.map((s) => `《${s.title}》`).join('、')}`,
                    }
                  : t,
              )
            }
            break
          }
        }
        setTask((t) => (t ? { ...t, streaming: false } : t))
      } catch (err) {
        if (isAbortError(err)) return
        setTask(null)
        notify.error('AI 生成失败，请稍后重试')
      }
    },
    [noteId, title, content, note?.kind, note?.tags, addTag],
  )

  /** 接受 AI 建议：以 200ms 打字机效果落墨进编辑器（notes.md §3.2） */
  const acceptTask = useCallback(() => {
    const t = task
    if (!t || t.streaming || !t.text) return
    setTask(null)
    const ins = t.applyMode === 'append' || t.applyMode === 'ask' ? `\n\n${t.text}\n` : t.text
    const prefix =
      t.applyMode === 'replace'
        ? content.slice(0, t.range.start)
        : t.applyMode === 'cursor'
          ? content.slice(0, t.range.end)
          : content
    const suffix =
      t.applyMode === 'replace' || t.applyMode === 'cursor' ? content.slice(t.range.end) : ''
    const steps = Math.max(4, Math.min(10, Math.ceil(ins.length / 24)))
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setContent(prefix + ins.slice(0, Math.ceil((ins.length * i) / steps)) + suffix)
      if (i >= steps) {
        clearInterval(timer)
        markDirty()
      }
    }, 200 / steps)
    notify.ai('已应用 AI 建议')
  }, [task, content])

  const discardTask = useCallback(() => {
    aiAbort.current?.abort()
    setTask(null)
  }, [])

  /* 预览待办回写源码：优先按 hast position 行号定位，失败则按第 N 个复选框定位；
     经 latest 快照读取 content，保持回调引用稳定（配合 PreviewPane 的 React.memo） */
  const toggleTaskAtLine = useCallback((lineIdx: number | undefined, seq: number) => {
    const lines = latest.current.content.split('\n')
    const re = /^(\s*[-*+]\s+\[)( |x|X)(\])/
    let target = -1
    if (lineIdx !== undefined && lines[lineIdx] && re.test(lines[lineIdx])) {
      target = lineIdx
    } else {
      let seen = 0
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          if (seen === seq) {
            target = i
            break
          }
          seen += 1
        }
      }
    }
    if (target === -1) return
    lines[target] = lines[target].replace(re, (_m, p1: string, p2: string, p3: string) =>
      p1 + (p2 === ' ' ? 'x' : ' ') + p3,
    )
    setContent(lines.join('\n'))
    markDirty()
  }, [])

  /* 双栏滚动同步（按比例，100ms 节流；guard 防环） */
  const syncPreview = useCallback((r: number) => {
    if (Date.now() - syncGuard.current < 160) return
    const p = previewRef.current
    if (!p) return
    syncGuard.current = Date.now()
    p.scrollTop = r * (p.scrollHeight - p.clientHeight)
  }, [])

  const onPreviewScroll = useCallback(() => {
    if (Date.now() - syncGuard.current < 160) return
    const p = previewRef.current
    const ta = textareaRef.current
    if (!p || !ta) return
    const max = p.scrollHeight - p.clientHeight
    const r = max > 0 ? p.scrollTop / max : 0
    syncGuard.current = Date.now()
    ta.scrollTop = r * (ta.scrollHeight - ta.clientHeight)
  }, [])

  /* 分栏拖拽（1:2 ~ 2:1，notes.md §3.3） */
  const onDividerDown = (e: RMouseEvent) => {
    e.preventDefault()
    const box = panesRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    const move = (ev: MouseEvent) => {
      const r = Math.min(2 / 3, Math.max(1 / 3, (ev.clientX - rect.left) / rect.width))
      setRatio(r)
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const toggleAiEnabled = (v: boolean) => {
    setAiEnabled(v)
    localStorage.setItem('sg-ai-completion', v ? 'on' : 'off')
  }

  /* 预览内容 300ms 防抖：源码区实时，预览区不随击键全量重渲染 */
  const debouncedContent = useDebounced(content, 300)

  /* 底部状态栏字数/行数：仅 content 变化时重算 */
  const contentStats = useMemo(
    () => ({ words: wordCount(content), lines: content.split('\n').length }),
    [content],
  )

  /* ---------- 空态 ---------- */
  if (!note) {
    return (
      <div className="flex h-full items-center justify-center bg-surface">
        <EmptyState
          image="./empty-notes.svg"
          imageWidth={240}
          title="选择或新建一条便签"
          description="⌘N 新建 · ⌘K 搜索 · 停笔片刻 AI 帮你接着写"
          action={
            <Button onClick={onRequestNew} className="rounded-r-sm">
              <Plus size={16} />
              新建便签
            </Button>
          }
        />
      </div>
    )
  }

  const showEditor = viewMode !== 'preview'
  const showPreview = viewMode !== 'edit'
  const editorW = viewMode === 'edit' ? '100%' : viewMode === 'split' ? `${ratio * 100}%` : '0%'
  const previewW = viewMode === 'preview' ? '100%' : viewMode === 'split' ? `${(1 - ratio) * 100}%` : '0%'

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      {/* 3.1 标题区 */}
      <div className="relative shrink-0 px-6 pt-5">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            markDirty()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && ghostTitle) {
              e.preventDefault()
              setTitle(ghostTitle)
              setGhostTitle(null)
              markDirty()
            }
          }}
          placeholder="无标题便签"
          className="w-full bg-transparent text-[20px] font-bold leading-7 text-ink-900 outline-none placeholder:text-ink-300"
        />
        {ghostTitle && title.trim() === '' && (
          <div className="pointer-events-none absolute left-6 top-5 flex h-7 items-center gap-2">
            <span className="text-[20px] font-bold italic leading-7 text-ink-400">{ghostTitle}</span>
            <button
              type="button"
              aria-label="采纳标题"
              onClick={() => {
                setTitle(ghostTitle)
                setGhostTitle(null)
                markDirty()
              }}
              className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white shadow-card transition-transform hover:scale-110"
            >
              <Check size={12} />
            </button>
            <span className="text-[11px] text-ink-300">Tab 采纳 AI 标题</span>
          </div>
        )}
      </div>

      {/* meta 行 */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-6 pb-3 pt-2 text-[12px] text-ink-400">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-0.5 rounded-r-pill transition-transform hover:scale-[1.03]">
              <Tag type={note.kind} />
              <ChevronDown size={12} className="text-ink-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36 rounded-r-md">
            {(Object.keys(KIND_LABEL) as NoteKind[]).map((k) => (
              <DropdownMenuItem
                key={k}
                onClick={() => updateNote(note.id, { kind: k })}
                className="flex items-center justify-between text-[13px]"
              >
                {KIND_LABEL[k]}
                {note.kind === k && <Check size={13} className="text-brand-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span>{format(new Date(note.createdAt), 'yyyy年M月d日 HH:mm')} 创建</span>

        {saveState === 'saving' ? (
          <span className="flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            保存中…
          </span>
        ) : (
          <span className="flex items-center gap-1 text-brand-600">
            <Check size={12} />
            已保存 · 刚刚
          </span>
        )}

        <span className="h-3 w-px bg-line" />

        {/* 标签编辑 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {note.tags.map((t) => (
            <span
              key={t}
              className="flex h-5 items-center gap-0.5 rounded-r-pill bg-brand-50 pl-2 pr-1 text-[11px] font-medium text-brand-700"
            >
              #{t}
              <button
                type="button"
                aria-label={`移除标签 ${t}`}
                onClick={() => removeTag(note.id, t)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-brand-100"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {tagInput !== null ? (
            <input
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  addTag(note.id, tagInput.trim().replace(/^#/, ''))
                  setTagInput('')
                }
                if (e.key === 'Escape') setTagInput(null)
              }}
              onBlur={() => {
                if (tagInput.trim()) addTag(note.id, tagInput.trim().replace(/^#/, ''))
                setTagInput(null)
              }}
              placeholder="标签名"
              className="h-5 w-20 rounded-r-pill border border-line-strong bg-surface px-2 text-[11px] outline-none focus:border-brand-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => setTagInput('')}
              className="flex h-5 items-center gap-0.5 rounded-r-pill border border-dashed border-line-strong px-2 text-[11px] text-ink-400 transition-colors hover:border-brand-500 hover:text-brand-600"
            >
              <Plus size={10} />
              添加标签
            </button>
          )}
        </div>
      </div>

      {/* 3.2 工具栏 */}
      <Toolbar
        onOp={handleOp}
        aiEnabled={aiEnabled}
        onAiEnabledChange={toggleAiEnabled}
        aiReady={aiReady}
        aiBusy={Boolean(task?.streaming)}
        onAIAction={(a) => void runAI(a)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        focusMode={focusMode}
        onToggleFocus={onToggleFocus}
      />

      {/* AI 生成预览条 */}
      <AnimatePresence>
        {task && (
          <AIPreviewBar
            key="ai-bar"
            label={task.label}
            text={task.text}
            streaming={task.streaming}
            onAccept={task.applyMode === 'ask' && task.question === undefined ? undefined : acceptTask}
            onRetry={task.action !== 'ask' ? () => void runAI(task.action) : undefined}
            onDiscard={discardTask}
            acceptLabel={task.applyMode === 'ask' ? '插入到文末' : '接受'}
          >
            {task.action === 'ask' && (
              <form
                className="mt-2 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (askInput.trim()) void runAI('ask', askInput.trim())
                }}
              >
                <input
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="就这篇便签问点什么…"
                  className="h-8 flex-1 rounded-r-sm border border-ai-100 bg-surface px-2.5 text-[13px] outline-none focus:border-ai-500"
                />
                <Button type="submit" size="sm" disabled={task.streaming} className="h-8 rounded-r-sm">
                  提问
                </Button>
              </form>
            )}
          </AIPreviewBar>
        )}
      </AnimatePresence>

      {/* 3.3 编辑区（双栏可拖） */}
      <div ref={panesRef} className="flex min-h-0 flex-1">
        <motion.div
          animate={{ width: editorW, opacity: showEditor ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex min-w-0 overflow-hidden"
          style={{ pointerEvents: showEditor ? 'auto' : 'none' }}
        >
          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            textareaRef={textareaRef}
            aiEnabled={aiEnabled}
            aiReady={aiReady}
            onCursorChange={(ln, col) => setCursor({ ln, col })}
            onScrollRatio={syncPreview}
            onShortcutOp={handleOp}
            placeholder="开始书写，停笔片刻 AI 会接着补全；按 Tab 接受…"
          />
        </motion.div>

        {viewMode === 'split' && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={onDividerDown}
            className="group z-10 -mx-[2.5px] w-[5px] shrink-0 cursor-col-resize"
          >
            <div className="mx-auto h-full w-px bg-line transition-colors group-hover:bg-brand-400" />
          </div>
        )}

        <motion.div
          animate={{ width: previewW, opacity: showPreview ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn('min-w-0 overflow-hidden', viewMode === 'split' && 'border-l border-line')}
          style={{ pointerEvents: showPreview ? 'auto' : 'none' }}
        >
          <PreviewPane
            content={debouncedContent}
            onToggleTask={toggleTaskAtLine}
            scrollRef={previewRef}
            onScroll={onPreviewScroll}
          />
        </motion.div>
      </div>

      {/* 3.4 底部状态栏 */}
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-line px-4 text-[12px] text-ink-400">
        <span>
          {contentStats.words} 字 · {contentStats.lines} 行 · Markdown
        </span>
        <div className="flex items-center gap-3">
          {aiReady ? (
            aiEnabled ? (
              <span className="text-ai-500">✦ 补全已开启</span>
            ) : (
              <span>补全已关闭</span>
            )
          ) : (
            <button
              type="button"
              onClick={() => navigate('/settings#ai')}
              className="transition-colors hover:text-ai-500"
            >
              AI 未配置 →
            </button>
          )}
          <span className="font-mono">
            Ln {cursor.ln}, Col {cursor.col}
          </span>
        </div>
      </div>
    </div>
  )
}
