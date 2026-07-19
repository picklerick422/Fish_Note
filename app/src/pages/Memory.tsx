import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { usePageHeader } from '@/components/Layout'
import SegmentedControl from '@/components/shared/SegmentedControl'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import AssistantMessage from './memory/AssistantMessage'
import ChatInput from './memory/ChatInput'
import EmptyWelcome from './memory/EmptyWelcome'
import SourceDrawer from './memory/SourceDrawer'
import { filterSourcesByScope, noteInScope, SCOPE_OPTIONS, type MemoryScope } from './memory/scope'
import { getAIProvider, isAbortError } from '@/ai'
import { notify } from '@/lib/toast'
import { useChatStore } from '@/store/useChatStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useNoteCounts } from '@/store/useStatsStore'
import { useAIReady } from '@/store/useSettingsStore'
import type { ChatMessage } from '@/types'

/** 用户消息气泡（memory.md §2.2）：右侧绿底白字，右下 4px 小角 */
function UserBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-end"
    >
      <div className="max-w-[70%] whitespace-pre-wrap rounded-r-md rounded-br-[4px] bg-brand-500 px-4 py-3 text-[14px] leading-[22px] text-white shadow-card">
        {content}
      </div>
    </motion.div>
  )
}

/** 找 AI 消息对应的上一条用户问题 */
function findPrevUser(messages: ChatMessage[], idx: number): string {
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content
  }
  return ''
}

/** 回忆书（/memory）：对话式记忆检索 RAG 页面 */
export default function Memory() {
  const messages = useChatStore((s) => s.messages)
  const addMessage = useChatStore((s) => s.addMessage)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const notes = useNotesStore((s) => s.notes)
  const counts = useNoteCounts()
  const aiReady = useAIReady()

  const [scope, setScope] = useState<MemoryScope>('all')
  const [input, setInput] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deepThink, setDeepThink] = useState(true)
  const [drawerNoteId, setDrawerNoteId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({})

  const abortRef = useRef<AbortController | null>(null)
  const pendingRef = useRef<string | null>(null)
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  const setPending = useCallback((id: string | null) => {
    pendingRef.current = id
    setPendingId(id)
  }, [])

  const cancelTypeIn = useCallback(() => {
    if (typeTimer.current) {
      clearInterval(typeTimer.current)
      typeTimer.current = null
    }
  }, [])

  /* ---------------- 页头 ---------------- */
  usePageHeader(
    {
      title: '回忆书',
      subtitle: '问它任何关于你记录过的事',
      actions: (
        <>
          <SegmentedControl options={SCOPE_OPTIONS} value={scope} onChange={setScope} size="sm" />
          {messages.length > 0 && (
            <Button variant="outline" size="sm" className="rounded-r-sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={14} />
              清空
            </Button>
          )}
        </>
      ),
    },
    [scope, messages.length],
  )

  /* ---------------- 派生数据 ---------------- */
  const liveNotes = useMemo(() => notes.filter((n) => !n.deletedAt).length, [notes])
  const scopedCount = useMemo(() => {
    if (scope === 'all') return counts.total
    if (scope === 'daily') return counts.daily
    return notes.filter((n) => noteInScope(n, 'recent30')).length
  }, [scope, counts.total, counts.daily, notes])

  /* ---------------- 滚动钉底 ---------------- */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])
  useEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  /* ---------------- 生成流程 ---------------- */
  const runAsk = useCallback(
    async (question: string, targetId?: string) => {
      const chat = useChatStore.getState()
      let aiId = targetId
      if (aiId) {
        chat.updateMessage(aiId, { content: '', sources: [], thinkingSteps: [] })
      } else {
        aiId = chat.addMessage({ role: 'assistant', content: '', thinkingSteps: [], sources: [] }).id
      }
      setPending(aiId)
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await getAIProvider().ask(question, {
          signal: controller.signal,
          onToken: (_, full) => useChatStore.getState().updateMessage(aiId, { content: full }),
          onThinking: (steps) => useChatStore.getState().updateMessage(aiId, { thinkingSteps: steps }),
        })
        // 记忆范围：本地过滤引用来源
        const sources = filterSourcesByScope(res.sources, scope, (id) => useNotesStore.getState().getById(id))
        useChatStore.getState().updateMessage(aiId, {
          content: res.answer,
          sources,
          thinkingSteps: res.thinkingSteps,
        })
      } catch (err) {
        const partial = useChatStore.getState().messages.find((m) => m.id === aiId)?.content ?? ''
        if (isAbortError(err)) {
          useChatStore.getState().updateMessage(aiId, {
            content: partial ? `${partial}\n\n*（已停止生成）*` : '*（已停止生成）*',
          })
        } else {
          useChatStore.getState().updateMessage(aiId, {
            content: partial || '抱歉，回答生成失败了，请稍后重试。',
          })
          notify.error('AI 回答失败，请稍后重试')
        }
      } finally {
        setPending(null)
        abortRef.current = null
      }
    },
    [scope, setPending],
  )

  const send = useCallback(
    (raw: string) => {
      const q = raw.trim()
      if (!q || pendingRef.current) return
      cancelTypeIn()
      setInput('')
      addMessage({ role: 'user', content: q })
      void runAsk(q)
    },
    [addMessage, cancelTypeIn, runAsk],
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  // 生成中 Esc 中断
  useEffect(() => {
    if (!pendingId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') abortRef.current?.abort()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingId])

  // 卸载时中断打字与生成
  useEffect(
    () => () => {
      cancelTypeIn()
      abortRef.current?.abort()
    },
    [cancelTypeIn],
  )

  const regenerate = useCallback(
    (msg: ChatMessage) => {
      if (pendingRef.current) return
      const all = useChatStore.getState().messages
      const idx = all.findIndex((m) => m.id === msg.id)
      const q = findPrevUser(all, idx)
      if (!q) {
        notify.error('找不到对应的问题，无法重新生成')
        return
      }
      void runAsk(q, msg.id)
    },
    [runAsk],
  )

  /** 建议问题卡：40ms/字 打入输入框 → 自动发送 */
  const typeAndSend = useCallback(
    (question: string) => {
      if (pendingRef.current) return
      cancelTypeIn()
      setInput('')
      let i = 0
      typeTimer.current = setInterval(() => {
        i += 1
        setInput(question.slice(0, i))
        if (i >= question.length) {
          cancelTypeIn()
          setTimeout(() => send(question), 120)
        }
      }, 40)
    },
    [cancelTypeIn, send],
  )

  const handleInputChange = useCallback(
    (v: string) => {
      cancelTypeIn()
      setInput(v)
    },
    [cancelTypeIn],
  )

  const handleFeedback = useCallback(
    (id: string, value: 'up' | 'down') => {
      const current = feedback[id]
      setFeedback((f) => {
        const next = { ...f }
        if (current === value) delete next[id]
        else next[id] = value
        return next
      })
      if (current !== value) {
        notify.info(value === 'up' ? '感谢点赞，小鱼会继续努力 ✦' : '已记录反馈，会努力改进')
      }
    },
    [feedback],
  )

  const handleClear = useCallback(() => {
    abortRef.current?.abort()
    clearMessages()
    setFeedback({})
    setConfirmOpen(false)
    notify.success('已清空对话')
  }, [clearMessages])

  const generating = pendingId !== null

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex h-[calc(100dvh-136px)] min-h-[420px] w-full max-w-[780px] flex-col"
    >
      {/* 消息流 / 初始空态 */}
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          <EmptyWelcome totalNotes={counts.total} liveNotes={liveNotes} onPick={typeAndSend} />
        </div>
      ) : (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain py-2 pr-1">
          <div className="flex flex-col gap-6 pb-2">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserBubble key={m.id} content={m.content} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  message={m}
                  isPending={pendingId === m.id}
                  showThinking={deepThink}
                  promptText={findPrevUser(messages, i)}
                  feedback={feedback[m.id]}
                  onOpenSource={setDrawerNoteId}
                  onRegenerate={regenerate}
                  onFeedback={handleFeedback}
                />
              ),
            )}
          </div>
        </div>
      )}

      {/* 底部输入条 */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSend={() => send(input)}
        onStop={stop}
        generating={generating}
        scope={scope}
        onScopeChange={setScope}
        scopedCount={scopedCount}
        deepThink={deepThink}
        onDeepThinkChange={setDeepThink}
        aiReady={aiReady}
      />

      {/* 溯源 Drawer */}
      <SourceDrawer noteId={drawerNoteId} onClose={() => setDrawerNoteId(null)} />

      {/* 清空对话二次确认 */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-r-xl border-line bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink-900">清空当前对话？</AlertDialogTitle>
            <AlertDialogDescription>将删除本次对话的全部消息，该操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-r-sm">取消</AlertDialogCancel>
            <AlertDialogAction className="rounded-r-sm bg-red text-white hover:bg-red/90" onClick={handleClear}>
              清空对话
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
