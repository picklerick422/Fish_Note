import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { CalendarCheck, CalendarDays, CalendarRange, Check, Sparkles, X } from 'lucide-react'
import AISparkleButton from '@/components/shared/AISparkleButton'
import MarkdownRenderer from '@/components/shared/MarkdownRenderer'
import Tag from '@/components/shared/Tag'
import { getAIProvider, isAbortError } from '@/ai'
import type { Note, Report, ReportType } from '@/types'
import { useNotesStore } from '@/store/useNotesStore'
import { useReportsStore } from '@/store/useReportsStore'
import { useStatsStore } from '@/store/useStatsStore'
import { wordCount } from '@/lib/date'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { RANGE_PRESETS, TYPE_META, collectSources, fmtNum, formatRange, reportTitle, type DateRange } from './reportUtils'

type Stage = 'config' | 'generating' | 'done'

const TYPE_ICONS: Record<ReportType, typeof CalendarCheck> = {
  daily: CalendarCheck,
  weekly: CalendarRange,
  monthly: CalendarDays,
}

/** 生成仪式 4 步（task：收集素材 → 梳理脉络 → 撰写初稿 → 润色定稿） */
const RING_R = 28
const RING_C = 2 * Math.PI * RING_R

interface GenerateModalProps {
  open: boolean
  presetType: ReportType
  /** 重新生成模式：锁定类型与日期范围，保存时覆盖原报告 */
  regenerateTarget?: Report | null
  onClose: () => void
  /** 保存到报告中心后回调；navigate=true 时父级进入阅读视图 */
  onSaved: (reportId: string, navigate: boolean) => void
}

export default function GenerateModal({ open, presetType, regenerateTarget, onClose, onSaved }: GenerateModalProps) {
  const notes = useNotesStore((s) => s.notes)
  const addReport = useReportsStore((s) => s.addReport)
  const updateReport = useReportsStore((s) => s.updateReport)
  const addNote = useNotesStore((s) => s.addNote)
  const recordActivity = useStatsStore((s) => s.recordActivity)
  const addXP = useStatsStore((s) => s.addXP)

  const [stage, setStage] = useState<Stage>('config')
  const [type, setType] = useState<ReportType>(presetType)
  const [presetKey, setPresetKey] = useState<string>(RANGE_PRESETS[presetType][0].key)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [stepMs, setStepMs] = useState<number[]>([])
  const [streamed, setStreamed] = useState('')
  const [elapsed, setElapsed] = useState('')
  const [minimized, setMinimized] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const animRef = useRef<{ stop: () => void } | null>(null)
  const progressRef = useRef(0)
  const stepStartRef = useRef(0)
  const savedRef = useRef(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const gradientId = useRef(`ring-${Math.random().toString(36).slice(2, 8)}`).current

  const isRegen = Boolean(regenerateTarget)

  /* 打开时重置为配置阶段 */
  useEffect(() => {
    if (!open) return
    const t = regenerateTarget?.type ?? presetType
    setStage('config')
    setType(t)
    setPresetKey(RANGE_PRESETS[t][0].key)
    setExcluded(new Set())
    setActiveStep(0)
    setProgress(0)
    progressRef.current = 0
    setStepMs([])
    setStreamed('')
    setElapsed('')
    setMinimized(false)
    savedRef.current = false
  }, [open, presetType, regenerateTarget])

  /* 卸载时中断生成 */
  useEffect(
    () => () => {
      abortRef.current?.abort()
      animRef.current?.stop()
    },
    [],
  )

  const range: DateRange = useMemo(() => {
    if (regenerateTarget) return regenerateTarget.dateRange
    const preset = RANGE_PRESETS[type].find((p) => p.key === presetKey) ?? RANGE_PRESETS[type][0]
    return preset.getRange()
  }, [regenerateTarget, type, presetKey])

  const meta = TYPE_META[type]
  const sources = useMemo(() => collectSources(type, range, notes), [type, range, notes])
  const selected = useMemo(() => sources.filter((n) => !excluded.has(n.id)), [sources, excluded])
  const totalWords = useMemo(() => selected.reduce((sum, n) => sum + wordCount(n.contentMarkdown), 0), [selected])
  const enough = selected.length >= meta.minSources
  const title = reportTitle(type, range)

  const stepLabels = useMemo(
    () => [
      `收集范围内 ${selected.length} ${meta.sourceNoun}`,
      '梳理内容脉络，提炼主线',
      '撰写报告初稿',
      '润色定稿与排版',
    ],
    [selected.length, meta.sourceNoun],
  )

  /* 流式时预览滚动到底部 */
  useEffect(() => {
    const el = previewRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [streamed])

  /* 生成中 Esc 取消 */
  useEffect(() => {
    if (stage !== 'generating' || minimized) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') abortRef.current?.abort()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, minimized])

  const setProgressBoth = useCallback((v: number) => {
    progressRef.current = v
    setProgress(v)
  }, [])

  const tweenProgress = useCallback(
    (to: number, ms: number, signal: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        animRef.current = animate(progressRef.current, to, {
          duration: ms / 1000,
          ease: 'easeInOut',
          onUpdate: setProgressBoth,
        })
        const timer = setTimeout(resolve, ms)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            animRef.current?.stop()
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true },
        )
      }),
    [setProgressBoth],
  )

  const advanceStep = useCallback((idx: number) => {
    const now = Date.now()
    if (stepStartRef.current) {
      const elapsed = now - stepStartRef.current
      setStepMs((arr) => {
        const next = [...arr]
        next[idx] = elapsed
        return next
      })
    }
    stepStartRef.current = now
    setActiveStep(idx + 1)
  }, [])

  /** 保存到报告中心（新增或覆盖） */
  const saveToReports = useCallback(
    (markdown: string): string => {
      if (regenerateTarget) {
        updateReport(regenerateTarget.id, {
          title,
          contentMarkdown: markdown,
          dateRange: range,
          sources: selected.map((n) => n.id),
        })
        notify.ai(`「${title}」已重新生成 ✦`)
        return regenerateTarget.id
      }
      const report = addReport({
        type,
        title,
        contentMarkdown: markdown,
        dateRange: range,
        sources: selected.map((n) => n.id),
      })
      notify.ai(`${title} 已生成 ✦`)
      return report.id
    },
    [regenerateTarget, updateReport, addReport, title, range, selected, type],
  )

  const runGeneration = useCallback(async () => {
    if (!enough || stage === 'generating') return
    const controller = new AbortController()
    abortRef.current = controller
    setStage('generating')
    setStreamed('')
    setActiveStep(0)
    setStepMs([])
    setProgressBoth(0)
    stepStartRef.current = Date.now()
    const t0 = Date.now()
    try {
      // 第 1 步：收集素材
      await tweenProgress(16, 680, controller.signal)
      advanceStep(0)
      // 第 2 步：梳理脉络
      await tweenProgress(34, 560, controller.signal)
      advanceStep(1)
      // 第 3 步：AI 撰写初稿（真实流式）
      const md = await getAIProvider().generateReport(
        { type, notes: selected, dateRange: range },
        {
          signal: controller.signal,
          onToken: (_, full) => {
            setStreamed(full)
            setProgressBoth(34 + Math.min(full.length / 460, 1) * 52)
          },
        },
      )
      setStreamed(md)
      advanceStep(2)
      // 第 4 步：润色定稿
      await tweenProgress(100, 520, controller.signal)
      advanceStep(3)
      setElapsed(((Date.now() - t0) / 1000).toFixed(1))
      setStage('done')
    } catch (err) {
      if (isAbortError(err)) {
        setStage('config')
      } else {
        notify.error('AI 生成失败，请稍后重试')
        setStage('config')
      }
    } finally {
      abortRef.current = null
    }
  }, [enough, stage, tweenProgress, advanceStep, setProgressBoth, type, selected, range])

  /* 完成后若处于最小化：自动保存 + Toast（后台运行路径） */
  useEffect(() => {
    if (stage === 'done' && minimized && !savedRef.current) {
      savedRef.current = true
      const id = saveToReports(streamed)
      onSaved(id, false)
    }
  }, [stage, minimized, streamed, saveToReports, onSaved])

  const handleSaveToReports = useCallback(() => {
    if (savedRef.current) return
    savedRef.current = true
    const id = saveToReports(streamed)
    onSaved(id, true)
  }, [saveToReports, streamed, onSaved])

  const handleSaveAsNote = useCallback(() => {
    if (savedRef.current) return
    savedRef.current = true
    addNote({
      title,
      contentMarkdown: streamed,
      kind: type,
      notebookId: type === 'daily' ? 'nb-daily' : 'nb-work',
      tags: [meta.label],
      aiGenerated: true,
    })
    recordActivity()
    addXP(20)
    notify.success('已存为便签 · 灵感收益 +20')
    onClose()
  }, [addNote, title, streamed, type, meta.label, recordActivity, addXP, onClose])

  const toggleExclude = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (!open) return null

  /* 最小化：仅悬浮进度胶囊（生成继续在后台进行） */
  if (minimized) {
    return (
      <motion.button
        type="button"
        initial={{ y: 24, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-r-pill border border-ai-500/30 bg-surface px-4 py-2.5 shadow-ai"
      >
        <Sparkles size={15} className="animate-spin text-ai-500 [animation-duration:1.2s]" />
        <span className="text-[13px] font-medium text-ink-900">正在生成报告…</span>
        <span className="font-display text-[12px] font-semibold text-ai-500">{Math.round(progress)}%</span>
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: 'rgba(23,26,23,.32)' }}
      onClick={() => {
        if (stage === 'generating') setMinimized(true)
        else onClose()
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="生成报告"
        initial={{ scale: 0.96, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 8, opacity: 0, transition: { duration: 0.14 } }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-r-xl border border-line bg-surface shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-ai-500" />
            <h2 className="text-[18px] font-semibold leading-7 text-ink-900">
              {isRegen ? '重新生成报告' : '生成报告'}
            </h2>
            <Tag type="ai" className="h-5 px-2 text-[11px]">
              AI
            </Tag>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={() => (stage === 'generating' ? setMinimized(true) : onClose())}
            className="flex h-8 w-8 items-center justify-center rounded-r-sm text-ink-400 transition-colors duration-150 hover:bg-subtle hover:text-ink-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* 内容区（两阶段交叉淡入 200ms） */}
        <div className="overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {stage === 'config' ? (
              <motion.div
                key="stage-config"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isRegen && regenerateTarget ? (
                  /* 重新生成：锁定配置摘要 */
                  <div className="flex items-center gap-3 rounded-r-md border-[1.5px] border-ai-500/50 bg-ai-50 p-4">
                    <Tag type={meta.tag} />
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-ink-900">{regenerateTarget.title}</div>
                      <div className="mt-0.5 text-[12px] tracking-[0.02em] text-ink-500">
                        {formatRange(range)} · 将覆盖当前报告内容
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 类型选择卡 */}
                    <div className="flex flex-col gap-2.5">
                      {(Object.keys(TYPE_META) as ReportType[]).map((t) => {
                        const m = TYPE_META[t]
                        const Icon = TYPE_ICONS[t]
                        const active = t === type
                        const preset = RANGE_PRESETS[t].find((p) => p.key === (active ? presetKey : RANGE_PRESETS[t][0].key))
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setType(t)
                              setPresetKey(RANGE_PRESETS[t][0].key)
                              setExcluded(new Set())
                            }}
                            className={cn(
                              'relative flex items-start gap-3 rounded-r-md border-[1.5px] p-4 text-left transition-colors duration-150',
                              active ? 'border-ai-500 bg-ai-50' : 'border-line bg-surface hover:border-line-strong',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-r-sm',
                                active ? 'bg-ai-500/15 text-ai-600' : 'bg-subtle text-ink-400',
                              )}
                            >
                              <Icon size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">{m.label}</span>
                              <span className="mt-0.5 block text-[12px] leading-[18px] text-ink-500">{m.desc}</span>
                              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-r-pill bg-surface px-2 py-0.5 text-[11px] text-ink-500">
                                <CalendarDays size={11} />
                                {preset ? formatRange(preset.getRange()) : ''}
                              </span>
                            </span>
                            {active && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-ai-500"
                              >
                                <Check size={12} strokeWidth={3} className="text-white" />
                              </motion.span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* 日期范围预设 */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex gap-1.5">
                        {RANGE_PRESETS[type].map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setPresetKey(p.key)}
                            className={cn(
                              'h-7 rounded-r-pill px-3 text-[12px] font-medium transition-colors duration-150',
                              p.key === presetKey ? 'bg-ink-900 text-surface' : 'bg-subtle text-ink-500 hover:text-ink-700',
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <span className="text-[12px] tracking-[0.02em] text-ink-400">{formatRange(range)}</span>
                    </div>
                  </>
                )}

                {/* 数据源预览 checklist */}
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink-700">
                      数据源预览 <span className="text-ink-400">（{selected.length}/{sources.length}）</span>
                    </span>
                    <span className="text-[11px] text-ink-400">点击可剔除不参与生成的便签</span>
                  </div>
                  {sources.length === 0 ? (
                    <div className="rounded-r-sm border border-dashed border-line-strong px-3 py-4 text-center text-[12px] text-ink-400">
                      该范围内没有符合条件的{meta.sourceNoun.replace('篇', '')}，换个范围试试
                    </div>
                  ) : (
                    <div className="max-h-[168px] overflow-y-auto rounded-r-sm border border-line">
                      {sources.map((note: Note) => {
                        const included = !excluded.has(note.id)
                        return (
                          <button
                            key={note.id}
                            type="button"
                            onClick={() => toggleExclude(note.id)}
                            className={cn(
                              'flex w-full items-center gap-2.5 border-b border-line px-3 py-2 text-left transition-colors duration-150 last:border-b-0',
                              included ? 'bg-surface hover:bg-subtle' : 'bg-subtle/60 opacity-50',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors duration-150',
                                included ? 'border-brand-500 bg-brand-500' : 'border-line-strong bg-surface',
                              )}
                            >
                              {included && <Check size={12} strokeWidth={3} className="text-white" />}
                            </span>
                            <Tag type={note.kind} className="h-5 px-2 text-[11px]" />
                            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">{note.title}</span>
                            <span className="shrink-0 text-[11px] text-ink-400">
                              {new Date(note.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 数据源提示条 */}
                <div className="mt-3 rounded-r-sm bg-subtle px-3 py-2.5 text-[12px] leading-[18px] text-ink-500">
                  {selected.length > 0
                    ? `将分析该范围内 ${selected.length} ${meta.sourceNoun} · 共 ${fmtNum(totalWords)} 字`
                    : '请选择至少一篇便签参与生成'}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stage-generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* 渐变圆环进度 + 百分比 / 完成绿勾 */}
                <div className="flex flex-col items-center pt-1">
                  <div className="relative h-16 w-16">
                    <svg width="64" height="64" viewBox="0 0 64 64" className="h-16 w-16">
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#A78BFA" />
                          <stop offset="45%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#6366F1" />
                        </linearGradient>
                      </defs>
                      <circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="5" />
                      <motion.circle
                        cx="32"
                        cy="32"
                        r={RING_R}
                        fill="none"
                        stroke={stage === 'done' ? 'var(--brand-500)' : `url(#${gradientId})`}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={RING_C}
                        animate={{ strokeDashoffset: RING_C * (1 - progress / 100) }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        transform="rotate(-90 32 32)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {stage === 'done' ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500"
                        >
                          <Check size={16} strokeWidth={3} className="text-white" />
                        </motion.span>
                      ) : (
                        <span className="font-display text-[14px] font-bold text-ink-900">{Math.round(progress)}%</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] tracking-[0.02em] text-ink-400">
                    {stage === 'done' ? `「${title}」生成完毕${elapsed ? ` · 耗时 ${elapsed}s` : ''}` : `正在生成「${title}」`}
                  </p>
                </div>

                {/* 4 步进度清单 */}
                <div className="mt-4 flex flex-col gap-1">
                  {stepLabels.map((label, i) => {
                    const done = i < activeStep
                    const active = i === activeStep && stage === 'generating'
                    return (
                      <div
                        key={label}
                        className={cn('flex items-center gap-2.5 rounded-r-sm px-2.5 py-2', active && 'bg-ai-50')}
                      >
                        {done ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500"
                          >
                            <Check size={12} strokeWidth={3} className="text-white" />
                          </motion.span>
                        ) : active ? (
                          <Sparkles size={18} className="shrink-0 animate-spin text-ai-500 [animation-duration:1.2s]" />
                        ) : (
                          <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-line-strong" />
                        )}
                        <span
                          className={cn(
                            'text-[13px]',
                            done ? 'text-ink-500' : active ? 'font-medium text-ink-900' : 'text-ink-400',
                          )}
                        >
                          {label}
                        </span>
                        {done && stepMs[i] !== undefined && (
                          <span className="ml-auto rounded-r-pill bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-ink-400">
                            {(stepMs[i] / 1000).toFixed(1)}s
                          </span>
                        )}
                        {active && i === 2 && streamed && (
                          <span className="ml-auto max-w-[160px] truncate font-mono text-[11px] text-ink-400">
                            {streamed.slice(-24).replace(/\n+/g, ' ⏎ ')}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 报告正文流式预览 */}
                {streamed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <motion.div
                      animate={
                        stage === 'done'
                          ? { boxShadow: ['0 0 0 0 rgba(139,92,246,.45)', '0 0 0 6px rgba(139,92,246,0)'] }
                          : {}
                      }
                      transition={{ duration: 0.8 }}
                      className="mt-4 rounded-r-md border border-line bg-surface"
                    >
                      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2 text-[11px] tracking-[0.02em] text-ai-500">
                        <Sparkles size={11} />
                        AI 撰写预览
                      </div>
                      <div ref={previewRef} className="max-h-[220px] overflow-y-auto px-4 py-3">
                        <MarkdownRenderer>{streamed}</MarkdownRenderer>
                        {stage === 'generating' && (
                          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-caret-blink bg-ai-500 align-middle" />
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 底部操作区 */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          {stage === 'config' && (
            <>
              <span className="text-[12px] leading-[18px] text-amber">
                {!enough && `该范围只有 ${selected.length} ${meta.sourceNoun}，至少需要 ${meta.minSources} 篇`}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 rounded-r-sm px-4 text-[14px] font-medium text-ink-500 transition-colors duration-150 hover:bg-subtle"
                >
                  取消
                </button>
                <span title={!enough ? `满 ${meta.minSources} 篇即可生成` : undefined}>
                  <AISparkleButton disabled={!enough} onClick={() => void runGeneration()}>
                    开始生成
                  </AISparkleButton>
                </span>
              </div>
            </>
          )}
          {stage === 'generating' && (
            <>
              <span className="text-[12px] leading-[18px] text-ink-400">通常需要 5–10 秒，可随时最小化</span>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="h-9 rounded-r-sm px-4 text-[14px] font-medium text-ink-500 transition-colors duration-150 hover:bg-subtle"
              >
                后台运行
              </button>
            </>
          )}
          {stage === 'done' && (
            <>
              <span className="text-[12px] leading-[18px] text-ink-400">基于 {selected.length} {meta.sourceNoun} · 已按你的勾选生成</span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveAsNote}
                  className="h-9 rounded-r-sm px-4 text-[14px] font-medium text-ink-500 transition-colors duration-150 hover:bg-subtle"
                >
                  存为便签
                </button>
                <AISparkleButton onClick={handleSaveToReports}>保存到报告中心</AISparkleButton>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
