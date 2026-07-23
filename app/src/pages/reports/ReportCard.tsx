import { memo } from 'react'
import { motion } from 'framer-motion'
import { Copy, Download, MoreHorizontal, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import Tag from '@/components/shared/Tag'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { Report } from '@/types'
import { relTime, wordCount } from '@/lib/date'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { TYPE_META, downloadMarkdown, extractSummary, fmtNum, formatRange } from './reportUtils'

export async function copyReportMarkdown(report: Report) {
  try {
    await navigator.clipboard.writeText(report.contentMarkdown)
    notify.success('已复制，可直接粘贴到飞书/语雀')
  } catch {
    notify.error('复制失败，请重试')
  }
}

export function exportReportMarkdown(report: Report) {
  downloadMarkdown(report.title, report.contentMarkdown)
  notify.success(`已导出「${report.title}.md」`)
}

interface ReportCardProps {
  report: Report
  variant?: 'grid' | 'list'
  /** 入场 stagger 序号 */
  index?: number
  /** 新生成：scale .8→1 spring 落入 + ai-50 底闪烁 800ms */
  highlight?: boolean
  onOpen: () => void
  onRegenerate: () => void
  onDelete: () => void
}

/** 报告卡片（reports.md A.2）：白底 r-lg 1px border，hover 上浮 -2px + shadow-hover */
function ReportCard({
  report,
  variant = 'grid',
  index = 0,
  highlight = false,
  onOpen,
  onRegenerate,
  onDelete,
}: ReportCardProps) {
  const meta = TYPE_META[report.type]
  const words = wordCount(report.contentMarkdown)
  const summary = extractSummary(report.contentMarkdown)

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="更多操作"
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 items-center justify-center rounded-r-sm text-ink-400 transition-colors duration-150 hover:bg-subtle hover:text-ink-700"
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-r-md border-line bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem className="gap-2 text-[13px]" onClick={onOpen}>
          <Sparkles size={14} className="text-ai-500" />
          阅读报告
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-[13px]" onClick={onRegenerate}>
          <RefreshCw size={14} />
          重新生成
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-[13px]" onClick={() => void copyReportMarkdown(report)}>
          <Copy size={14} />
          复制 Markdown
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-[13px]" onClick={() => exportReportMarkdown(report)}>
          <Download size={14} />
          导出 .md
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuItem variant="destructive" className="gap-2 text-[13px]" onClick={onDelete}>
          <Trash2 size={14} />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const contextMenuContent = (
    <ContextMenuContent className="w-44 rounded-r-md border-line bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
      <ContextMenuItem className="gap-2 text-[13px]" onClick={onOpen}>
        <Sparkles size={14} className="text-ai-500" />
        阅读报告
      </ContextMenuItem>
      <ContextMenuItem className="gap-2 text-[13px]" onClick={onRegenerate}>
        <RefreshCw size={14} />
        重新生成
      </ContextMenuItem>
      <ContextMenuItem className="gap-2 text-[13px]" onClick={() => void copyReportMarkdown(report)}>
        <Copy size={14} />
        复制 Markdown
      </ContextMenuItem>
      <ContextMenuItem className="gap-2 text-[13px]" onClick={() => exportReportMarkdown(report)}>
        <Download size={14} />
        导出 .md
      </ContextMenuItem>
      <ContextMenuSeparator className="bg-line" />
      <ContextMenuItem variant="destructive" className="gap-2 text-[13px]" onClick={onDelete}>
        <Trash2 size={14} />
        删除
      </ContextMenuItem>
    </ContextMenuContent>
  )

  const flash = highlight && (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-r-lg bg-ai-50"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 0.35 }}
    />
  )

  if (variant === 'list') {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: -12, transition: { duration: 0.24 } }}
            transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => e.key === 'Enter' && onOpen()}
            className="group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-r-lg border border-line bg-surface px-4 py-3 shadow-card transition-[box-shadow,transform] duration-[180ms] hover:-translate-y-0.5 hover:shadow-hover"
          >
            {flash}
            <Tag type={meta.tag} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold leading-5 text-ink-900 transition-colors duration-150 group-hover:text-brand-700">
                {report.title}
              </div>
              <div className="mt-0.5 text-[12px] tracking-[0.02em] text-ink-400">{formatRange(report.dateRange)}</div>
            </div>
            <span className="hidden w-24 shrink-0 text-right text-[12px] tracking-[0.02em] text-ink-400 md:block">
              基于 {report.sources.length} {meta.sourceNoun}
            </span>
            <span className="hidden w-20 shrink-0 text-right font-display text-[12px] text-ink-400 sm:block">
              {fmtNum(words)} 字
            </span>
            <span className="w-20 shrink-0 text-right text-[12px] tracking-[0.02em] text-ink-400">
              {relTime(report.createdAt)}生成
            </span>
            <Sparkles size={13} className="shrink-0 text-ai-400" />
            <span onClick={(e) => e.stopPropagation()}>{menu}</span>
          </motion.div>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          layout
          initial={highlight ? { opacity: 0, scale: 0.8 } : { opacity: 0, y: 14 }}
          animate={highlight ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
          transition={
            highlight
              ? { type: 'spring', stiffness: 320, damping: 24 }
              : { delay: Math.min(index, 8) * 0.07, duration: 0.32, ease: [0.16, 1, 0.3, 1] }
          }
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => e.key === 'Enter' && onOpen()}
          className={cn(
            'group relative flex h-[176px] cursor-pointer flex-col overflow-hidden rounded-r-lg border border-line bg-surface p-5 shadow-card',
            'transition-[box-shadow,transform] duration-[180ms] hover:-translate-y-0.5 hover:shadow-hover',
          )}
        >
          {flash}
          {/* 行 1：类型徽章 + 更多 */}
          <div className="flex items-center justify-between">
            <Tag type={meta.tag} />
            <span onClick={(e) => e.stopPropagation()}>{menu}</span>
          </div>
          {/* 行 2：标题 + 日期范围 */}
          <h3 className="mt-2.5 truncate text-[17px] font-semibold leading-6 text-ink-900 transition-colors duration-150 group-hover:text-brand-700">
            {report.title}
          </h3>
          <p className="mt-0.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{formatRange(report.dateRange)}</p>
          {/* 行 3：AI 摘要（两行省略） */}
          <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-5 text-ink-500">{summary || '（暂无摘要）'}</p>
          {/* 行 4：底部元信息 */}
          <div className="mt-auto flex items-center gap-3 pt-2 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
            <span>
              基于 {report.sources.length} {meta.sourceNoun}
            </span>
            <span className="font-display">{fmtNum(words)} 字</span>
            <span>{relTime(report.createdAt)}生成</span>
            <Sparkles size={13} className="ml-auto shrink-0 text-ai-400" />
          </div>
        </motion.div>
      </ContextMenuTrigger>
      {contextMenuContent}
    </ContextMenu>
  )
}

export default memo(ReportCard)
