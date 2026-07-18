import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import AISparkleButton from '@/components/shared/AISparkleButton'
import EmptyState from '@/components/shared/EmptyState'
import SegmentedControl from '@/components/shared/SegmentedControl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Report, ReportType } from '@/types'
import { wordCount } from '@/lib/date'
import ReportCard from './ReportCard'

type TypeFilter = ReportType | 'all'
type SortKey = 'newest' | 'oldest' | 'words'
type ViewMode = 'grid' | 'list'

const SORT_LABELS: Record<SortKey, string> = {
  newest: '最新优先',
  oldest: '最早优先',
  words: '字数最多',
}

/** 筛选下拉（年份 / 排序通用）：白底 r-sm + shadow-pop，选中项绿 ✓ */
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-r-sm border border-line bg-surface px-3 text-[13px] text-ink-700 shadow-card transition-colors duration-150 hover:border-line-strong"
        >
          {label}
          <ChevronDown size={14} className="text-ink-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px] rounded-r-md border-line bg-surface shadow-pop">
        {options.map((opt) => (
          <DropdownMenuItem key={opt.value} className="justify-between gap-2 text-[13px]" onClick={() => onChange(opt.value)}>
            {opt.label}
            {opt.value === value && <Check size={14} className="text-brand-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ReportListProps {
  reports: Report[]
  highlightId?: string | null
  onOpen: (report: Report) => void
  onRegenerate: (report: Report) => void
  onDelete: (report: Report) => void
  onGenerate: () => void
}

/** A. 报告列表：筛选行 + 卡片网格/列表 + 空态（reports.md §A） */
export default function ReportList({ reports, highlightId, onOpen, onRegenerate, onDelete, onGenerate }: ReportListProps) {
  const [type, setType] = useState<TypeFilter>('all')
  const [year, setYear] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [view, setView] = useState<ViewMode>('grid')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const c = { all: reports.length, daily: 0, weekly: 0, monthly: 0 }
    for (const r of reports) c[r.type] += 1
    return c
  }, [reports])

  const years = useMemo(() => {
    const set = new Set<string>()
    for (const r of reports) set.add(String(new Date(r.createdAt).getFullYear()))
    return [...set].sort((a, b) => Number(b) - Number(a))
  }, [reports])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = reports.filter((r) => {
      if (type !== 'all' && r.type !== type) return false
      if (year !== 'all' && String(new Date(r.createdAt).getFullYear()) !== year) return false
      if (q && !`${r.title}\n${r.contentMarkdown}`.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (sort === 'words') return wordCount(b.contentMarkdown) - wordCount(a.contentMarkdown)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [reports, type, year, query, sort])

  if (reports.length === 0) {
    return (
      <EmptyState
        image="/empty-reports.svg"
        imageWidth={280}
        title="还没有报告"
        description="记录满 3 篇日报，就能生成第一篇周报"
        action={<AISparkleButton onClick={onGenerate}>立即生成</AISparkleButton>}
        className="py-20"
      />
    )
  }

  return (
    <div>
      {/* A.1 筛选行 */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl<TypeFilter>
            options={[
              { value: 'all', label: `全部 ${counts.all}` },
              { value: 'daily', label: `日报 ${counts.daily}` },
              { value: 'weekly', label: `周报 ${counts.weekly}` },
              { value: 'monthly', label: `月报 ${counts.monthly}` },
            ]}
            value={type}
            onChange={setType}
          />
          {years.length > 0 && (
            <FilterDropdown
              label={year === 'all' ? '全部年份' : `${year} 年`}
              options={[{ value: 'all', label: '全部年份' }, ...years.map((y) => ({ value: y, label: `${y} 年` }))]}
              value={year}
              onChange={setYear}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索报告…"
              aria-label="搜索报告"
              className="h-9 w-[180px] rounded-r-sm border border-line bg-surface pl-8 pr-3 text-[13px] text-ink-900 shadow-card outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-400 focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--brand-100)]"
            />
          </div>
          <FilterDropdown
            label={SORT_LABELS[sort]}
            options={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ value: k, label: SORT_LABELS[k] }))}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
          />
          <SegmentedControl<ViewMode>
            options={[
              { value: 'grid', label: '网格' },
              { value: 'list', label: '列表' },
            ]}
            value={view}
            onChange={setView}
            size="sm"
          />
        </div>
      </motion.div>

      {/* A.2 卡片网格 / 列表 */}
      {filtered.length === 0 ? (
        <EmptyState
          image="/empty-search.svg"
          imageWidth={220}
          title="没有找到匹配的报告"
          description="试试调整类型、年份或搜索关键词"
          className="py-16"
        />
      ) : (
        <div
          className={
            view === 'grid'
              ? 'mt-6 grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5'
              : 'mt-6 flex flex-col gap-3'
          }
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((report, i) => (
              <ReportCard
                key={report.id}
                report={report}
                variant={view}
                index={i}
                highlight={report.id === highlightId}
                onOpen={() => onOpen(report)}
                onRegenerate={() => onRegenerate(report)}
                onDelete={() => onDelete(report)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
