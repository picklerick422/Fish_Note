import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { usePageHeader } from '@/components/Layout'
import AISparkleButton from '@/components/shared/AISparkleButton'
import EmptyState from '@/components/shared/EmptyState'
import type { Report, ReportType } from '@/types'
import { useReportsStore } from '@/store/useReportsStore'
import { notify } from '@/lib/toast'
import GenerateModal from './reports/GenerateModal'
import ReportList from './reports/ReportList'
import ReportReader from './reports/ReportReader'
import ConfirmDialog from './reports/ConfirmDialog'

const VALID_TYPES: ReportType[] = ['daily', 'weekly', 'monthly']

/** 报告中心（reports.md）：A 报告列表 / B 阅读视图 + 生成 Modal，URL 协议 ?generate= 与 ?id= */
export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const reports = useReportsStore((s) => s.reports)
  const deleteReport = useReportsStore((s) => s.deleteReport)

  const generateParam = searchParams.get('generate')
  const generateType = VALID_TYPES.includes(generateParam as ReportType) ? (generateParam as ReportType) : null
  const readerId = searchParams.get('id')

  const [confirmDelete, setConfirmDelete] = useState<Report | null>(null)
  const [confirmRegen, setConfirmRegen] = useState<Report | null>(null)
  const [regenTarget, setRegenTarget] = useState<Report | null>(null)
  const [pendingDeletes, setPendingDeletes] = useState<ReadonlySet<string>>(new Set())
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  /* ---------- URL 协议 ---------- */

  const setParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        mutate(next)
        return next
      })
    },
    [setSearchParams],
  )

  const openGenerate = useCallback(
    (type: ReportType = 'daily') => setParams((next) => next.set('generate', type)),
    [setParams],
  )

  const closeGenerate = useCallback(() => {
    setRegenTarget(null)
    setParams((next) => next.delete('generate'))
  }, [setParams])

  const openReport = useCallback((report: Report) => setParams((next) => next.set('id', report.id)), [setParams])
  const backToList = useCallback(() => setParams((next) => next.delete('id')), [setParams])

  usePageHeader({
    title: '报告中心',
    subtitle: '日报成周，周成月，时间自有答案',
    actions: <AISparkleButton size="sm" onClick={() => openGenerate()}>生成报告</AISparkleButton>,
  })

  /* 进入/离开阅读视图时回到顶部 */
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [readerId])

  /* 新报告高亮 5s 后自动清除 */
  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => setHighlightId(null), 5000)
    return () => clearTimeout(timer)
  }, [highlightId])

  /* 卸载时落实所有待删除（用户已确认，仅处于撤销窗口期） */
  useEffect(() => {
    const timers = deleteTimers.current
    return () => {
      for (const [id, timer] of timers) {
        clearTimeout(timer)
        useReportsStore.getState().deleteReport(id)
      }
      timers.clear()
    }
  }, [])

  /* ---------- 删除（二次确认 + 5s 可撤销） ---------- */

  const undoDelete = useCallback((id: string) => {
    const timer = deleteTimers.current.get(id)
    if (timer) clearTimeout(timer)
    deleteTimers.current.delete(id)
    setPendingDeletes((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    notify.success('已撤销删除')
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    const report = confirmDelete
    if (!report) return
    setConfirmDelete(null)
    if (readerId === report.id) backToList()
    setPendingDeletes((prev) => new Set(prev).add(report.id))
    const timer = setTimeout(() => {
      deleteTimers.current.delete(report.id)
      setPendingDeletes((prev) => {
        const next = new Set(prev)
        next.delete(report.id)
        return next
      })
      deleteReport(report.id)
    }, 5000)
    deleteTimers.current.set(report.id, timer)
    toast(`已删除「${report.title}」`, {
      duration: 5000,
      action: {
        label: '撤销',
        onClick: () => undoDelete(report.id),
      },
      actionButtonStyle: { background: 'var(--brand-500)', color: '#fff', borderRadius: '999px' },
    })
  }, [confirmDelete, readerId, backToList, deleteReport, undoDelete])

  /* ---------- 重新生成（二次确认 → 覆盖更新） ---------- */

  const handleRegenConfirm = useCallback(() => {
    const report = confirmRegen
    if (!report) return
    setConfirmRegen(null)
    setRegenTarget(report)
    setParams((next) => next.set('generate', report.type))
  }, [confirmRegen, setParams])

  /* ---------- 生成完成 ---------- */

  const handleSaved = useCallback(
    (reportId: string, navigate: boolean) => {
      setRegenTarget(null)
      setHighlightId(reportId)
      setParams((next) => {
        next.delete('generate')
        if (navigate) next.set('id', reportId)
      })
    },
    [setParams],
  )

  /* ---------- 视图派生 ---------- */

  const visibleReports = useMemo(() => reports.filter((r) => !pendingDeletes.has(r.id)), [reports, pendingDeletes])
  const readerReport = readerId ? reports.find((r) => r.id === readerId && !pendingDeletes.has(r.id)) : undefined
  const showReader = Boolean(readerId)

  return (
    <>
      {showReader ? (
        readerReport ? (
          <ReportReader
            report={readerReport}
            onBack={backToList}
            onRegenerate={() => setConfirmRegen(readerReport)}
            onDelete={() => setConfirmDelete(readerReport)}
          />
        ) : (
          <EmptyState
            image="./empty-search.svg"
            imageWidth={220}
            title="报告不存在或已被删除"
            description="它可能刚被移除，回报告中心看看吧"
            action={
              <button
                type="button"
                onClick={backToList}
                className="h-9 rounded-r-sm bg-brand-500 px-4 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-brand-600"
              >
                返回报告中心
              </button>
            }
            className="py-20"
          />
        )
      ) : (
        <ReportList
          reports={visibleReports}
          highlightId={highlightId}
          onOpen={openReport}
          onRegenerate={setConfirmRegen}
          onDelete={setConfirmDelete}
          onGenerate={() => openGenerate()}
        />
      )}

      {/* 生成报告 Modal（?generate=daily|weekly|monthly 打开） */}
      <GenerateModal
        open={generateType !== null}
        presetType={generateType ?? 'weekly'}
        regenerateTarget={regenTarget}
        onClose={closeGenerate}
        onSaved={handleSaved}
      />

      {/* 删除二次确认 */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={`删除「${confirmDelete?.title ?? ''}」？`}
        description="删除后可在 5 秒内撤销，超时将不可恢复。"
        confirmLabel="删除"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* 重新生成二次确认 */}
      <ConfirmDialog
        open={confirmRegen !== null}
        title={`重新生成「${confirmRegen?.title ?? ''}」？`}
        description="将按当前数据源重新汇总，覆盖当前报告内容。"
        confirmLabel="重新生成"
        onConfirm={handleRegenConfirm}
        onCancel={() => setConfirmRegen(null)}
      />
    </>
  )
}
