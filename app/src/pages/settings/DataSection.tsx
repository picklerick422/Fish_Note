import { useRef, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Download, FileDown, Trash2, Upload } from 'lucide-react'
import JSZip from 'jszip'
import { format } from 'date-fns'
import { downloadBlob } from '@/lib/download'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { Note } from '@/types'
import { useChatStore } from '@/store/useChatStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useReportsStore } from '@/store/useReportsStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useStatsStore } from '@/store/useStatsStore'
import { loadLocalPrefs, useLocalPrefs } from './localPrefs'
import { DangerButton, GhostButton, SecondaryButton, SettingCard, SettingRow, SgModal, SgSelect } from './controls'

const LS_KEYS = {
  notes: 'sg-notes',
  reports: 'sg-reports',
  chat: 'sg-chat',
  stats: 'sg-stats',
  settings: 'sg-settings',
} as const

const LIMIT_BYTES = 5 * 1024 * 1024 // localStorage 上限约 5 MB

/** localStorage 实测字节；persist 尚未落盘时按内存中的状态估算 */
function bytesOf(key: string, fallback?: unknown): number {
  const raw = localStorage.getItem(key)
  if (raw != null) return raw.length * 2 // UTF-16
  return fallback === undefined ? 0 : JSON.stringify(fallback).length * 2
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024).toFixed(1)} KB`
}

const KIND_DIR: Record<Note['kind'], string> = { daily: '日报', weekly: '周报', monthly: '月报', memo: '随手记' }

interface BackupPayload {
  app: 'fishnote'
  version: 1
  exportedAt: string
  data: {
    notes: Note[]
    notebooks: unknown[]
    reports: unknown[]
    messages: unknown[]
    stats: Record<string, unknown>
    settings: Record<string, unknown>
    localPrefs: unknown
  }
}

/** 组 4 · 数据管理（settings.md）：存储概况 / 备份迁移 / 回收站 / 危险区 */
export default function DataSection() {
  const notes = useNotesStore((s) => s.notes)
  const notebooks = useNotesStore((s) => s.notebooks)
  const destroyNote = useNotesStore((s) => s.destroyNote)
  const reports = useReportsStore((s) => s.reports)
  const messages = useChatStore((s) => s.messages)
  const [prefs, updatePrefs] = useLocalPrefs()

  const [importOpen, setImportOpen] = useState(false)
  const [importData, setImportData] = useState<BackupPayload | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [trashConfirm, setTrashConfirm] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const [resetting, setResetting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  /* ---------- 存储概况（每次渲染从 localStorage 实测，开销极小） ---------- */
  const storage = (() => {
    const parts = [
      { key: 'notes', label: '便签', bytes: bytesOf(LS_KEYS.notes, { notes, notebooks }), color: 'var(--brand-500)' },
      { key: 'reports', label: '报告', bytes: bytesOf(LS_KEYS.reports, { reports }), color: 'var(--blue)' },
      { key: 'chat', label: '对话', bytes: bytesOf(LS_KEYS.chat, { messages }), color: 'var(--ai-500)' },
      {
        key: 'settings',
        label: '设置与统计',
        bytes:
          bytesOf(LS_KEYS.settings, useSettingsStore.getState()) +
          bytesOf(LS_KEYS.stats, useStatsStore.getState()) +
          bytesOf('sg-local-prefs', loadLocalPrefs()),
        color: 'var(--ink-300)',
      },
    ]
    const total = parts.reduce((s, p) => s + p.bytes, 0)
    return { parts, total, pct: (total / LIMIT_BYTES) * 100 }
  })()

  const over80 = storage.pct > 80
  const deletedCount = notes.filter((n) => n.deletedAt).length

  /* ---------- 导出 ---------- */
  const exportJSON = () => {
    const stats = useStatsStore.getState()
    const settings = useSettingsStore.getState()
    const payload: BackupPayload = {
      app: 'fishnote',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        notes,
        notebooks,
        reports,
        messages,
        stats: {
          activity: stats.activity,
          inspiration: stats.inspiration,
          inspirationWeek: stats.inspirationWeek,
          inspirationSeries: stats.inspirationSeries,
          level: stats.level,
          xp: stats.xp,
          tokenUsage: stats.tokenUsage,
          achievements: stats.achievements,
          counters: stats.counters,
        },
        settings: { theme: settings.theme, userName: settings.userName, ai: settings.ai, welcomed: settings.welcomed },
        localPrefs: loadLocalPrefs(),
      },
    }
    void downloadBlob(
      `fishnote-backup-${format(new Date(), 'yyyyMMdd')}.json`,
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    )
    notify.success('已导出完整数据 JSON')
  }

  const exportMarkdown = async () => {
    const zip = new JSZip()
    const live = notes.filter((n) => !n.deletedAt)
    for (const n of live) {
      const safe = n.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || '未命名便签'
      const header = `# ${n.title}\n\n> 类型：${KIND_DIR[n.kind]} · 创建于 ${format(new Date(n.createdAt), 'yyyy-MM-dd HH:mm')}${n.tags.length ? ` · 标签：${n.tags.map((t) => '#' + t).join(' ')}` : ''}\n\n---\n\n`
      zip.file(`${KIND_DIR[n.kind]}/${safe}.md`, header + n.contentMarkdown)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    await downloadBlob(`fishnote-notes-${format(new Date(), 'yyyyMMdd')}.zip`, blob)
    notify.success(`已导出 ${live.length} 条便签（Markdown 打包）`)
  }

  /* ---------- 导入 ---------- */
  const parseImport = (text: string): BackupPayload => {
    const parsed = JSON.parse(text) as BackupPayload
    if (!parsed || typeof parsed !== 'object' || !parsed.data || !Array.isArray(parsed.data.notes)) {
      throw new Error('invalid')
    }
    return parsed
  }

  const handleFile = async (file: File) => {
    setImportError(null)
    try {
      const text = await file.text()
      const payload = parseImport(text)
      setImportData(payload)
      setImportOpen(true)
    } catch {
      setImportError('文件校验失败：不是有效的 FishNote 备份 JSON')
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const confirmImport = () => {
    if (!importData) return
    const d = importData.data
    localStorage.setItem(LS_KEYS.notes, JSON.stringify({ state: { notes: d.notes, notebooks: d.notebooks ?? [] }, version: 1 }))
    localStorage.setItem(LS_KEYS.reports, JSON.stringify({ state: { reports: d.reports ?? [] }, version: 1 }))
    localStorage.setItem(LS_KEYS.chat, JSON.stringify({ state: { messages: d.messages ?? [] }, version: 1 }))
    if (d.stats) localStorage.setItem(LS_KEYS.stats, JSON.stringify({ state: d.stats, version: 1 }))
    if (d.settings) localStorage.setItem(LS_KEYS.settings, JSON.stringify({ state: d.settings, version: 1 }))
    if (d.localPrefs) localStorage.setItem('sg-local-prefs', JSON.stringify(d.localPrefs))
    setImportOpen(false)
    notify.success(`已导入 ${d.notes.length} 条便签`)
    setTimeout(() => location.reload(), 800)
  }

  /* ---------- 回收站 ---------- */
  const emptyTrash = () => {
    notes.filter((n) => n.deletedAt).forEach((n) => destroyNote(n.id))
    setTrashConfirm(false)
    notify.success('回收站已清空')
  }

  /* ---------- 危险区 ---------- */
  const doReset = () => {
    if (resetText !== '确认清空') return
    setResetting(true)
    setTimeout(() => {
      // 清空业务数据（便签/报告/对话/统计），保留外观与 AI 设置
      for (const key of [LS_KEYS.notes, LS_KEYS.reports, LS_KEYS.chat, LS_KEYS.stats]) {
        localStorage.removeItem(key)
      }
      notify.success('数据已清空')
      // hash 路由复位到首页后整页重载；resource:// 与浏览器下均正确
      setTimeout(() => {
        location.hash = '#/'
        location.reload()
      }, 400)
    }, 600)
  }

  const inputCls =
    'h-[38px] w-full rounded-r-sm border border-line-strong bg-surface px-3 text-[13px] text-ink-700 outline-none transition-colors focus:border-red focus:ring-[3px] focus:ring-red-soft'

  return (
    <div className="flex flex-col gap-5">
      {/* 卡片 A · 存储概况 */}
      <SettingCard
        title="存储概况"
        caption={
          <>
            共占用 {formatBytes(storage.total)} · localStorage 上限约 5 MB
            {over80 && <span className="ml-2 font-medium text-amber">空间不足，建议导出备份后清理</span>}
          </>
        }
      >
        <div className="flex h-3 w-full overflow-hidden rounded-r-pill bg-subtle">
          {storage.parts.map((p) => (
            <motion.span
              key={p.key}
              className="h-full"
              style={{ background: over80 ? 'var(--amber)' : p.color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((p.bytes / Math.max(storage.total, 1)) * 100, 1.5)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              title={`${p.label} ${formatBytes(p.bytes)}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {storage.parts.map((p) => (
            <span key={p.key} className="flex items-center gap-1.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-500">
              <span className="h-2 w-2 rounded-full" style={{ background: over80 ? 'var(--amber)' : p.color }} />
              {p.label} <span className="tnum text-ink-400">{formatBytes(p.bytes)}</span>
            </span>
          ))}
          <span className="tnum ml-auto text-[12px] text-ink-400">{storage.pct.toFixed(1)}%</span>
        </div>
      </SettingCard>

      {/* 卡片 B · 备份与迁移 */}
      <SettingCard title="备份与迁移" caption="数据完全属于你自己：导出、迁移、恢复都在本地完成">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-r-md border border-line p-4">
            <SecondaryButton onClick={exportJSON} className="w-full">
              <Download size={15} /> 导出 JSON
            </SecondaryButton>
            <p className="mt-2 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">完整数据（便签 / 报告 / 对话 / 统计 / 设置）</p>
          </div>
          <div className="rounded-r-md border border-line p-4">
            <SecondaryButton onClick={() => void exportMarkdown()} className="w-full">
              <FileDown size={15} /> 导出 Markdown
            </SecondaryButton>
            <p className="mt-2 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">全部便签打包 .zip，按分类分文件夹</p>
          </div>
          <div
            className={cn(
              'rounded-r-md border border-dashed p-4 transition-colors',
              dragOver ? 'border-brand-500 bg-brand-50' : 'border-line-strong',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <SecondaryButton onClick={() => fileRef.current?.click()} className="w-full">
              <Upload size={15} /> 导入数据
            </SecondaryButton>
            <p className="mt-2 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">拖拽备份 JSON 到此处，或点击选择文件</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
        <AnimatePresence>
          {importError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="mt-3 flex items-center gap-2 rounded-r-sm bg-red-soft px-3.5 py-2.5 text-[13px] font-medium text-red"
            >
              <AlertTriangle size={15} /> {importError}
            </motion.div>
          )}
        </AnimatePresence>
      </SettingCard>

      {/* 卡片 C · 回收站 */}
      <SettingCard title="回收站" caption={`当前回收站内有 ${deletedCount} 条已删除便签`}>
        <div className="divide-y divide-line">
          <SettingRow label="自动清理" hint="超过期限的已删除便签将被自动清除">
            <SgSelect
              aria-label="自动清理"
              value={prefs.trashAutoClean}
              options={[
                { value: '7d', label: '7 天' },
                { value: '30d', label: '30 天' },
                { value: 'never', label: '从不' },
              ]}
              onChange={(v) => updatePrefs((p) => ({ ...p, trashAutoClean: v }))}
            />
          </SettingRow>
          <SettingRow label="立即清空回收站" hint="彻底删除，无法恢复">
            <GhostButton onClick={() => setTrashConfirm(true)} disabled={deletedCount === 0} className="text-red hover:bg-red-soft hover:text-red">
              <Trash2 size={14} /> 清空回收站
            </GhostButton>
          </SettingRow>
        </div>
      </SettingCard>

      {/* 卡片 D · 危险区 */}
      <SettingCard danger title="危险区" caption="此操作不可撤销，建议先导出备份">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[14px] font-medium text-ink-900">
            清空全部数据
            <p className="mt-0.5 text-[12px] font-normal leading-[18px] tracking-[0.02em] text-ink-400">
              删除所有便签、报告、对话与统计数据（保留外观与 AI 设置）
            </p>
          </div>
          <DangerButton onClick={() => { setResetText(''); setResetOpen(true) }} className="shrink-0 border border-red/30">
            清空全部数据
          </DangerButton>
        </div>
      </SettingCard>

      {/* 导入二次确认 */}
      <SgModal open={importOpen} onClose={() => setImportOpen(false)}>
        <h3 className="text-[16px] font-semibold text-ink-900">导入备份</h3>
        <p className="mt-2 text-[13px] leading-5 text-ink-500">
          将覆盖当前全部本地数据，确认导入吗？
        </p>
        {importData && (
          <div className="mt-3 rounded-r-md bg-subtle px-4 py-3 text-[13px] text-ink-700">
            便签 <span className="tnum font-semibold">{importData.data.notes.length}</span> · 报告{' '}
            <span className="tnum font-semibold">{importData.data.reports?.length ?? 0}</span> · 对话{' '}
            <span className="tnum font-semibold">{importData.data.messages?.length ?? 0}</span>
            <span className="mt-1 block text-[12px] text-ink-400">
              导出于 {format(new Date(importData.exportedAt), 'yyyy-MM-dd HH:mm')}
            </span>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setImportOpen(false)}>取消</GhostButton>
          <SecondaryButton onClick={confirmImport} className="border-brand-500 text-brand-600 hover:bg-brand-50">
            确认导入
          </SecondaryButton>
        </div>
      </SgModal>

      {/* 清空回收站二次确认 */}
      <SgModal open={trashConfirm} onClose={() => setTrashConfirm(false)} width={400}>
        <h3 className="text-[16px] font-semibold text-ink-900">清空回收站</h3>
        <p className="mt-2 text-[13px] leading-5 text-ink-500">
          将彻底删除回收站内的 {deletedCount} 条便签，无法恢复。
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setTrashConfirm(false)}>取消</GhostButton>
          <DangerButton onClick={emptyTrash} className="bg-red text-white hover:bg-red/90">
            确认清空
          </DangerButton>
        </div>
      </SgModal>

      {/* 危险区确认 Modal */}
      <SgModal open={resetOpen} onClose={() => !resetting && setResetOpen(false)}>
        <h3 className="flex items-center gap-2 text-[16px] font-semibold text-red">
          <AlertTriangle size={17} /> 清空全部数据
        </h3>
        <p className="mt-2 text-[13px] leading-5 text-ink-500">
          所有便签、报告、对话与统计数据将被删除，此操作不可撤销。请输入
          <span className="mx-1 rounded-sm bg-red-soft px-1.5 py-0.5 font-mono text-[12px] font-semibold text-red">确认清空</span>
          以解锁操作。
        </p>
        <input
          value={resetText}
          onChange={(e) => setResetText(e.target.value)}
          placeholder="确认清空"
          disabled={resetting}
          className={cn(inputCls, 'mt-4')}
        />
        {resetting && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-r-pill bg-subtle">
            <motion.div
              className="h-full rounded-r-pill bg-red"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setResetOpen(false)} disabled={resetting}>
            取消
          </GhostButton>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={resetText !== '确认清空' || resetting}
            onClick={doReset}
            className={cn(
              'inline-flex h-9 items-center rounded-r-sm px-4 text-[14px] font-medium transition-colors duration-150',
              resetText === '确认清空' ? 'bg-red text-white hover:bg-red/90' : 'cursor-not-allowed bg-subtle text-ink-300',
            )}
          >
            {resetting ? '正在清空…' : '永久删除全部数据'}
          </motion.button>
        </div>
      </SgModal>
    </div>
  )
}
