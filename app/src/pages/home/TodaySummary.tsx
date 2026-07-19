import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flag, TriangleAlert, type LucideIcon } from 'lucide-react'
import CountUp from '@/components/shared/CountUp'
import { format } from 'date-fns'
import { isTodayDaily, mergeDigests } from '@/lib/dailyDigest'
import { useNotesStore } from '@/store/useNotesStore'
import type { DailyDigest } from '@/types'

const COLS: Array<{
  key: keyof DailyDigest
  title: string
  icon: LucideIcon
  color: string
  bg: string
}> = [
  { key: 'done', title: '完成事项', icon: Check, color: 'var(--brand-500)', bg: 'var(--brand-50)' },
  { key: 'issues', title: '问题记录', icon: TriangleAlert, color: 'var(--amber)', bg: 'var(--amber-soft)' },
  { key: 'plans', title: '明日计划', icon: Flag, color: 'var(--ai-500)', bg: 'var(--ai-50)' },
]

function DigestColumn({
  col,
  items,
  index,
  flash,
  empty,
}: {
  col: (typeof COLS)[number]
  items: string[]
  index: number
  flash: boolean
  empty: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, 3)
  const extra = items.length - 3

  return (
    <div className="flex-1 px-5 first:pl-0 last:pr-0">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: col.bg }}>
          <col.icon size={13} style={{ color: col.color }} strokeWidth={2.5} />
        </span>
        <span className="text-[13px] font-medium text-ink-700">{col.title}</span>
      </div>

      {empty ? (
        <div className="mt-4 flex flex-col items-start gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-line-strong" />
          <span className="text-[12px] text-ink-400">待记录</span>
        </div>
      ) : (
        <>
          <motion.span
            animate={flash ? { backgroundColor: ['rgba(225,234,244,.95)', 'rgba(225,234,244,0)'] } : {}}
            transition={{ duration: 0.6 }}
            className="mt-3 inline-block rounded-r-sm px-1"
          >
            <span className="tnum font-display text-[28px] font-bold leading-8 text-ink-900">
              <CountUp value={items.length} duration={800} delay={index * 0.15} separator={false} />
            </span>
          </motion.span>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {shown.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.24 }}
                  className="flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: col.color }} />
                  <span className="truncate text-[12px] leading-[18px] text-ink-500">{item}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {extra > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="self-start text-[12px] font-medium text-brand-600 hover:underline"
              >
                {expanded ? '收起' : `+${extra} 更多`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** R4 · 今日摘要：完成 / 问题 / 计划 三栏（从今日日报解析） */
export default function TodaySummary() {
  const navigate = useNavigate()
  const notes = useNotesStore((s) => s.notes)
  const digest = useMemo(() => mergeDigests(notes.filter(isTodayDaily)), [notes])
  const isEmpty = digest.done.length === 0 && digest.issues.length === 0 && digest.plans.length === 0

  // 保存成功 → 对应列数字 +1 绿色闪烁（订阅 store 外部事件驱动）
  const [flashCol, setFlashCol] = useState<keyof DailyDigest | null>(null)
  useEffect(() => {
    const countsOf = () => {
      const d = mergeDigests(useNotesStore.getState().notes.filter(isTodayDaily))
      return [d.done.length, d.issues.length, d.plans.length]
    }
    let prev = countsOf()
    const unsub = useNotesStore.subscribe(() => {
      const curr = countsOf()
      const keys: Array<keyof DailyDigest> = ['done', 'issues', 'plans']
      for (let i = 0; i < 3; i++) {
        if (curr[i] > prev[i]) {
          setFlashCol(keys[i])
          break
        }
      }
      prev = curr
    })
    return unsub
  }, [])
  useEffect(() => {
    if (!flashCol) return
    const t = setTimeout(() => setFlashCol(null), 700)
    return () => clearTimeout(t)
  }, [flashCol])

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.48, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[16px] font-semibold leading-6 text-ink-900">今日摘要</h3>
          <span className="text-[12px] tracking-[0.02em] text-ink-400">{format(new Date(), 'M月d日')}</span>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="rounded-r-sm px-2 py-1 text-[13px] text-ink-400 transition-colors hover:bg-subtle hover:text-ink-900"
          >
            查看今日日报
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-6 flex divide-x divide-line">
          {COLS.map((col, i) =>
            i === 1 ? (
              <div key={col.key} className="flex flex-1 items-center justify-center px-4 py-4">
                <p className="text-center text-[13px] leading-5 text-ai-500">
                  在上方快速记录，AI 帮你生成今日摘要 ✦
                </p>
              </div>
            ) : (
              <div key={col.key} className="flex flex-1 flex-col items-center gap-2.5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-line-strong">
                  <col.icon size={16} className="text-ink-300" />
                </span>
                <span className="text-[12px] text-ink-400">{col.title} · 待记录</span>
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="mt-5 flex divide-x divide-line">
          {COLS.map((col, i) => (
            <DigestColumn
              key={col.key}
              col={col}
              items={digest[col.key]}
              index={i}
              flash={flashCol === col.key}
              empty={digest[col.key].length === 0}
            />
          ))}
        </div>
      )}
    </motion.section>
  )
}
