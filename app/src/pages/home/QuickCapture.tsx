import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, RefreshCw, Sparkles } from 'lucide-react'
import AISparkleButton from '@/components/shared/AISparkleButton'
import Kbd from '@/components/shared/Kbd'
import MarkdownRenderer from '@/components/shared/MarkdownRenderer'
import SegmentedControl from '@/components/shared/SegmentedControl'
import { Button } from '@/components/ui/button'
import { getAIProvider, isAbortError } from '@/ai'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/toast'
import { useAIReady, useSettingsStore } from '@/store/useSettingsStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useStatsStore } from '@/store/useStatsStore'

const PLACEHOLDERS = [
  '随便写点什么…比如：今天把订单模块联调完了，分页 bug 修了俩，明天要和前端对优惠券接口，别忘了问张老师要测试账号',
  '试试：新学了 React 的 useSyncExternalStore，踩了个服务端渲染的坑，笔记如下…',
  '记录一句此刻的想法也可以：今天站会发言终于不紧张了',
]

/** R3 左 · 快速记录卡：碎碎念 → AI 流式整理为结构化日报 → 保存 */
export default function QuickCapture() {
  const navigate = useNavigate()
  const aiReady = useAIReady()
  const addNote = useNotesStore((s) => s.addNote)
  const notebooks = useNotesStore((s) => s.notebooks)
  const addXP = useStatsStore((s) => s.addXP)
  const addInspiration = useStatsStore((s) => s.addInspiration)
  const recordActivity = useStatsStore((s) => s.recordActivity)
  const userName = useSettingsStore((s) => s.userName)

  const [text, setText] = useState('')
  const [target, setTarget] = useState<'daily' | 'memo'>('daily')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState('')
  const [focused, setFocused] = useState(false)
  const [phIndex, setPhIndex] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveBtnRef = useRef<HTMLButtonElement>(null)

  // Placeholder 轮播：8s 切换
  useEffect(() => {
    const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 8000)
    return () => clearInterval(t)
  }, [])

  // 生成中 Esc 取消
  useEffect(() => {
    if (!generating) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') abortRef.current?.abort()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [generating])

  // textarea 自动增高（4~10 行）
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const line = 26
    el.style.height = `${Math.min(Math.max(el.scrollHeight, line * 4), line * 10)}px`
  }, [])
  useEffect(autoResize, [text, autoResize])

  const handleGenerate = useCallback(async () => {
    const raw = text.trim()
    if (raw.length < 2 || generating) return
    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)
    setDone(false)
    setPreview(null)
    const t0 = Date.now()
    try {
      const md = await getAIProvider().structure(raw, {
        target,
        signal: controller.signal,
        onToken: (_, full) => setPreview(full),
      })
      setPreview(md)
      setElapsed(((Date.now() - t0) / 1000).toFixed(1))
      setDone(true)
    } catch (err) {
      if (!isAbortError(err)) notify.error('AI 整理失败，请稍后重试')
      setPreview(null)
    } finally {
      setGenerating(false)
      abortRef.current = null
    }
  }, [text, generating, target])

  const saveDirect = useCallback(() => {
    const raw = text.trim()
    if (raw.length < 2) return
    const title = raw.split('\n')[0].slice(0, 30) || '随手记'
    addNote({ title, contentMarkdown: raw, kind: 'memo', notebookId: 'nb-life', aiGenerated: false })
    recordActivity()
    notify.success('已保存为随手记')
    setText('')
  }, [text, addNote, recordActivity])

  const handleSave = useCallback(() => {
    if (!preview || !done) return
    const title = preview.match(/^#{1,3}\s*(.+)$/m)?.[1]?.slice(0, 40) ?? '未命名便签'
    const tags = [...preview.matchAll(/#([^\s#]+)/g)].map((m) => m[1]).slice(0, 6)
    const notebookId = target === 'daily' ? 'nb-daily' : 'nb-life'
    addNote({ title, contentMarkdown: preview, kind: target, notebookId, tags, aiGenerated: true })
    addXP(20)
    recordActivity()
    // +20 飞行收益：延迟到账，与飞行动效同步
    const btn = saveBtnRef.current
    if (btn) {
      const r = btn.getBoundingClientRect()
      window.dispatchEvent(
        new CustomEvent('sg:gain', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2, amount: 20 } }),
      )
    }
    setTimeout(() => addInspiration(20), 550)
    const nbName = notebooks.find((n) => n.id === notebookId)?.name ?? '便签'
    notify.success(`已保存到「${nbName}」· 灵感收益 +20`)
    setPreview(null)
    setDone(false)
    setText('')
  }, [preview, done, target, addNote, addXP, addInspiration, recordActivity, notebooks])

  const charCount = text.replace(/\s/g, '').length
  const canSubmit = charCount >= 2 && !generating

  return (
    <motion.section
      id="quick-capture"
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.32, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'col-span-12 rounded-r-xl border bg-surface p-6 transition-shadow duration-200 xl:col-span-8',
        focused ? 'border-ai-500/60 shadow-ai' : 'border-line shadow-card',
      )}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">快速记录</h3>
        <span className="flex items-center gap-1 text-[12px] tracking-[0.02em] text-ai-500">
          <Sparkles size={12} />
          AI 会自动帮你整理成结构化内容 ✦
        </span>
      </div>

      {/* 输入区 */}
      <div className="relative mt-3">
        <textarea
          ref={textareaRef}
          id="quick-capture-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={generating}
          rows={4}
          aria-label="快速记录输入框"
          className="w-full resize-none bg-transparent text-[15px] leading-[26px] text-ink-900 outline-none placeholder:text-transparent disabled:opacity-50"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              if (aiReady) void handleGenerate()
              else saveDirect()
            }
          }}
        />
        {/* 轮播 placeholder */}
        {text.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={phIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-[15px] leading-[26px] text-ink-400"
              >
                {PLACEHOLDERS[phIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 底栏 */}
      <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
        <div className="flex items-center gap-3">
          <SegmentedControl
            options={[
              { value: 'memo', label: '随手记' },
              { value: 'daily', label: '日报' },
            ]}
            value={target}
            onChange={setTarget}
            size="sm"
          />
          <span className="text-[12px] tracking-[0.02em] text-ink-400">
            {charCount > 0 ? `${charCount} 字` : `${userName}，写点什么吧`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 lg:flex">
            <Kbd>⌘</Kbd>
            <Kbd>Enter</Kbd>
          </span>
          {aiReady ? (
            <AISparkleButton
              size="lg"
              loading={generating}
              disabled={!canSubmit}
              onClick={() => void handleGenerate()}
            >
              {generating ? '整理中…' : '整理成便签'}
            </AISparkleButton>
          ) : (
            <>
              <span title="请先在设置中配置 AI 供应商">
                <AISparkleButton size="lg" disabled>
                  整理成便签
                </AISparkleButton>
              </span>
              <Button variant="outline" className="h-[38px] rounded-r-sm" disabled={charCount < 2} onClick={saveDirect}>
                直接保存
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 生成预览区 */}
      <AnimatePresence>
        {preview !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              key={`done-${done}-${retryCount}`}
              animate={done ? { boxShadow: ['0 0 0 0 rgba(139,92,246,.45)', '0 0 0 6px rgba(139,92,246,0)'] } : {}}
              transition={{ duration: 0.8 }}
              className="mt-4 rounded-r-md bg-ai-50 p-4"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-ai-500" />
                <span className="text-[13px] font-medium text-ai-600">AI 整理结果</span>
                {done && elapsed && (
                  <span className="rounded-r-pill bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-400">
                    {elapsed}s
                  </span>
                )}
              </div>
              <div className="mt-2 max-h-[320px] overflow-y-auto">
                <MarkdownRenderer>{preview}</MarkdownRenderer>
                {!done && (
                  <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-caret-blink bg-ai-500 align-middle" />
                )}
              </div>
              {done && (
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.24 }}
                  className="mt-3 flex items-center gap-2 border-t border-ai-500/10 pt-3"
                >
                  <Button ref={saveBtnRef} className="h-9 rounded-r-sm" onClick={handleSave}>
                    {target === 'daily' ? '保存为日报' : '保存为随手记'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 rounded-r-sm text-ink-500"
                    onClick={() => {
                      setRetryCount((c) => c + 1)
                      void handleGenerate()
                    }}
                  >
                    <motion.span
                      key={retryCount}
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                      className="mr-1 flex"
                    >
                      <RefreshCw size={14} />
                    </motion.span>
                    重新整理
                  </Button>
                  <Button variant="ghost" className="h-9 rounded-r-sm text-ink-500" onClick={() => navigate('/notes')}>
                    <ExternalLink size={14} className="mr-1" />
                    在编辑器中打开
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
