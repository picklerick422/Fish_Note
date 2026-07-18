import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Copy,
  Download,
  FileCode2,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import MarkdownRenderer from '@/components/shared/MarkdownRenderer'
import Tag from '@/components/shared/Tag'
import type { Note, Report } from '@/types'
import { useNotesStore } from '@/store/useNotesStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { relTime, wordCount } from '@/lib/date'
import { cn } from '@/lib/utils'
import { copyReportMarkdown, exportReportMarkdown } from './ReportCard'
import ReportMarkdown from './ReportMarkdown'
import { TYPE_META, extractToc, fmtNum, formatRange } from './reportUtils'
import { format } from 'date-fns'

/* ---------------- 便签预览 Drawer（420，右侧滑入） ---------------- */

function NotePreviewDrawer({ note, onClose }: { note: Note | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {note && (
        <motion.div
          key="note-drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[70]"
          style={{ background: 'rgba(23,26,23,.32)' }}
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 flex h-full w-[420px] max-w-[92vw] flex-col border-l border-line bg-surface shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Tag type={note.kind} />
                  {note.aiGenerated && (
                    <span className="flex items-center gap-1 text-[11px] text-ai-500">
                      <Sparkles size={11} />
                      AI 整理
                    </span>
                  )}
                </div>
                <h3 className="mt-2 truncate text-[16px] font-semibold leading-6 text-ink-900">{note.title}</h3>
                <p className="mt-0.5 text-[12px] tracking-[0.02em] text-ink-400">
                  {format(new Date(note.createdAt), 'yyyy年M月d日 HH:mm')}
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭预览"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-r-sm text-ink-400 transition-colors duration-150 hover:bg-subtle hover:text-ink-700"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <MarkdownRenderer>{note.contentMarkdown}</MarkdownRenderer>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- 阅读视图（reports.md §B） ---------------- */

interface ReportReaderProps {
  report: Report
  onBack: () => void
  onRegenerate: () => void
  onDelete: () => void
}

export default function ReportReader({ report, onBack, onRegenerate, onDelete }: ReportReaderProps) {
  const meta = TYPE_META[report.type]
  const notes = useNotesStore((s) => s.notes)
  const aiSettings = useSettingsStore((s) => s.ai)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [raw, setRaw] = useState(false)
  const [previewNote, setPreviewNote] = useState<Note | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const toc = useMemo(() => extractToc(report.contentMarkdown), [report.contentMarkdown])
  const words = useMemo(() => wordCount(report.contentMarkdown), [report.contentMarkdown])
  const sourceNotes = useMemo(
    () =>
      report.sources.map((id) => notes.find((n) => n.id === id)).filter((n): n is Note => Boolean(n && !n.deletedAt)),
    [report.sources, notes],
  )
  const tokenCost = useMemo(() => {
    const srcWords = sourceNotes.reduce((s, n) => s + wordCount(n.contentMarkdown), 0)
    return Math.max(1, Math.round((srcWords + words) / 2))
  }, [sourceNotes, words])
  const modelLabel = aiSettings.provider === 'mock' ? '内置演示引擎' : aiSettings.model

  /* scroll-spy：当前阅读章节高亮 */
  useEffect(() => {
    setActiveId(null)
    const els = toc.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => Boolean(el))
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-150px 0px -62% 0px', threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [toc])

  const jumpTo = (id: string) => {
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const sourcesCard = (
    <div className="rounded-r-lg border border-line bg-surface p-4 shadow-card">
      <h4 className="text-[13px] font-semibold text-ink-900">本报告基于</h4>
      <div className="mt-2.5 flex flex-col gap-1">
        {sourceNotes.length === 0 && <p className="text-[12px] text-ink-400">来源便签已被删除</p>}
        {sourceNotes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => setPreviewNote(note)}
            className="flex items-center gap-2 rounded-r-sm px-2 py-1.5 text-left transition-colors duration-150 hover:bg-subtle"
          >
            <Tag type={note.kind} className="h-5 shrink-0 px-2 text-[11px]" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">{note.title}</span>
            <span className="shrink-0 text-[11px] text-ink-400">{format(new Date(note.createdAt), 'M.d')}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const infoCard = (
    <div className="rounded-r-lg border border-line bg-surface p-4 shadow-card">
      <h4 className="text-[13px] font-semibold text-ink-900">报告信息</h4>
      <dl className="mt-2.5 flex flex-col gap-2 text-[12px] leading-[18px]">
        <div className="flex items-center justify-between">
          <dt className="text-ink-400">生成时间</dt>
          <dd className="text-ink-700">{format(new Date(report.createdAt), 'M月d日 HH:mm')}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-400">消耗 Token</dt>
          <dd className="font-display font-semibold text-ai-600">{fmtNum(tokenCost)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-400">模型</dt>
          <dd className="text-ink-700">{modelLabel}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => setRaw((v) => !v)}
        className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-ink-500 transition-colors duration-150 hover:text-brand-700"
      >
        {raw ? <BookOpen size={13} /> : <FileCode2 size={13} />}
        {raw ? '查看渲染排版' : '查看原始 Markdown'}
      </button>
    </div>
  )

  return (
    <div className="-mx-8 -my-8">
      {/* 顶栏（sticky） */}
      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-[72px] z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface/95 px-8 backdrop-blur"
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 shrink-0 items-center gap-1 rounded-r-sm px-2.5 text-[13px] font-medium text-ink-500 transition-colors duration-150 hover:bg-subtle hover:text-ink-900"
          >
            <ArrowLeft size={15} />
            返回
          </button>
          <Tag type={meta.tag} className="shrink-0" />
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold leading-6 text-ink-900">{report.title}</h2>
            <p className="truncate text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
              {formatRange(report.dateRange)} · 基于 {report.sources.length} {meta.sourceNoun} · {fmtNum(words)} 字
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            title="重新生成"
            className="flex h-9 items-center gap-1.5 rounded-r-sm px-3 text-[13px] font-medium text-ink-500 transition-colors duration-150 hover:bg-subtle hover:text-ink-900"
          >
            <RefreshCw size={14} />
            <span className="hidden xl:inline">重新生成</span>
          </button>
          <button
            type="button"
            onClick={() => void copyReportMarkdown(report)}
            title="复制 Markdown"
            className="flex h-9 items-center gap-1.5 rounded-r-sm border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-700 transition-colors duration-150 hover:bg-subtle"
          >
            <Copy size={14} />
            <span className="hidden xl:inline">复制 Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => exportReportMarkdown(report)}
            title="导出 .md"
            className="flex h-9 items-center gap-1.5 rounded-r-sm border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-700 transition-colors duration-150 hover:bg-subtle"
          >
            <Download size={14} />
            <span className="hidden xl:inline">导出 .md</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="删除"
            className="flex h-9 items-center gap-1.5 rounded-r-sm px-3 text-[13px] font-medium text-red transition-colors duration-150 hover:bg-red-soft"
          >
            <Trash2 size={14} />
            <span className="hidden xl:inline">删除</span>
          </button>
        </div>
      </motion.div>

      {/* 三栏正文 */}
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[200px_minmax(0,1fr)_260px]">
        {/* 左 · TOC */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="hidden xl:block"
          aria-label="报告目录"
        >
          <div className="sticky top-[160px]">
            <h4 className="px-2.5 text-[12px] font-semibold tracking-[0.06em] text-ink-400">目录</h4>
            <div className="mt-2 flex flex-col">
              {toc.length === 0 && <p className="px-2.5 text-[12px] text-ink-400">本报告暂无章节</p>}
              {toc.map((item) => {
                const active = item.id === activeId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpTo(item.id)}
                    className={cn(
                      'relative rounded-r-sm py-1.5 pr-2.5 text-left text-[13px] leading-5 transition-colors duration-150',
                      item.depth === 3 ? 'pl-7' : 'pl-3.5',
                      active ? 'font-medium text-ai-600' : 'text-ink-500 hover:bg-subtle hover:text-ink-700',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="toc-active-bar"
                        className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[2px] rounded-full bg-ai-500"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    {item.text}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.nav>

        {/* 中 · 报告正文 */}
        <div ref={contentRef} className="min-w-0">
          <div className="mx-auto max-w-[720px]">
            {raw ? (
              <pre className="whitespace-pre-wrap rounded-r-md border border-line bg-subtle p-5 font-mono text-[13px] leading-[22px] text-ink-700">
                {report.contentMarkdown}
              </pre>
            ) : (
              <ReportMarkdown markdown={report.contentMarkdown} />
            )}
            <div className="mt-8 flex items-center gap-2 border-t border-line pt-4 text-[12px] tracking-[0.02em] text-ink-400">
              <Sparkles size={12} className="text-ai-400" />
              本报告由 AI 基于你的 {report.sources.length} {meta.sourceNoun}生成 · {relTime(report.createdAt)}
            </div>
          </div>
        </div>

        {/* 右 · 数据源侧栏 */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="hidden lg:block"
        >
          <div className="sticky top-[160px] flex flex-col gap-4">
            {sourcesCard}
            {infoCard}
          </div>
        </motion.aside>

        {/* 小屏：侧栏内容落到正文下方 */}
        <div className="flex flex-col gap-4 lg:hidden">
          {sourcesCard}
          {infoCard}
        </div>
      </div>

      {/* 便签预览 Drawer */}
      <NotePreviewDrawer note={previewNote} onClose={() => setPreviewNote(null)} />
    </div>
  )
}
