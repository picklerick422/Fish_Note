import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useLocalPrefs, type LocalPrefs } from './localPrefs'
import { SavedFlash, SettingCard, SettingRow, SgSelect, SgSwitch } from './controls'

type ThemeMode = LocalPrefs['themeMode']

/** 96×64 微缩界面预览（CSS 绘制的迷你 UI：侧边条 + 卡片示意） */
function ThemePreview({ mode }: { mode: ThemeMode }) {
  const light = { bg: '#F4F6F3', rail: '#FFFFFF', card: '#FFFFFF', line: '#E7EAE4', ink: '#D9DED5' }
  const dark = { bg: '#121514', rail: '#1C211D', card: '#1C211D', line: '#2B312C', ink: '#3A413B' }
  const renderHalf = (c: typeof light, clip?: string) => (
    <div className="absolute inset-0 flex" style={{ background: c.bg, clipPath: clip }}>
      <div className="h-full w-[18px] border-r" style={{ background: c.rail, borderColor: c.line }}>
        <div className="mx-auto mt-1.5 h-2 w-2 rounded-[3px] bg-brand-500" />
        <div className="mx-auto mt-2 h-1.5 w-1.5 rounded-full" style={{ background: c.ink }} />
        <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full" style={{ background: c.ink }} />
      </div>
      <div className="flex-1 p-1.5">
        <div className="h-1.5 w-8 rounded-full" style={{ background: c.ink }} />
        <div className="mt-1.5 flex gap-1">
          <div className="h-4 flex-1 rounded-[3px] border" style={{ background: c.card, borderColor: c.line }} />
          <div className="h-4 flex-1 rounded-[3px] border" style={{ background: c.card, borderColor: c.line }} />
        </div>
        <div className="mt-1 h-5 rounded-[3px] border" style={{ background: c.card, borderColor: c.line }}>
          <div className="ml-1 mt-1 h-1 w-10 rounded-full bg-brand-400" />
          <div className="ml-1 mt-1 h-1 w-6 rounded-full" style={{ background: c.ink }} />
        </div>
      </div>
    </div>
  )
  return (
    <div className="relative h-16 w-24 overflow-hidden rounded-r-sm border border-line-strong">
      {mode === 'system' ? (
        <>
          {renderHalf(light, 'inset(0 50% 0 0)')}
          {renderHalf(dark, 'inset(0 0 0 50%)')}
        </>
      ) : (
        renderHalf(mode === 'dark' ? dark : light)
      )}
    </div>
  )
}

/** 组 1 · 偏好（settings.md）：外观 / 编辑器 / 通用 */
export default function PreferencesSection() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const userName = useSettingsStore((s) => s.userName)
  const setUserName = useSettingsStore((s) => s.setUserName)
  const [prefs, updatePrefs] = useLocalPrefs()
  const [savedTick, setSavedTick] = useState(0)
  const [nameDraft, setNameDraft] = useState(userName)
  const [prevName, setPrevName] = useState(userName)
  if (prevName !== userName) {
    // 外部（如清空数据）改动用户名时同步草稿（render 期派生状态）
    setPrevName(userName)
    setNameDraft(userName)
  }

  // 跟随系统：监听系统深浅色并同步到全局主题
  useEffect(() => {
    if (prefs.themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setTheme(mq.matches ? 'dark' : 'light')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [prefs.themeMode, setTheme])

  const pickTheme = (mode: ThemeMode) => {
    updatePrefs((p) => ({ ...p, themeMode: mode }))
    if (mode !== 'system') setTheme(mode)
    setSavedTick((t) => t + 1)
  }

  const selectedTheme: ThemeMode = prefs.themeMode === 'system' ? 'system' : theme
  const saveName = () => {
    const next = nameDraft.trim()
    if (next && next !== userName) {
      setUserName(next)
      setSavedTick((t) => t + 1)
    } else {
      setNameDraft(userName)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 卡片 A · 外观 */}
      <SettingCard
        title="外观"
        caption="绿色代表记录，紫色代表 AI"
        className="scroll-mt-24"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            {(
              [
                { mode: 'light', label: '浅色' },
                { mode: 'dark', label: '深色' },
                { mode: 'system', label: '跟随系统' },
              ] as const
            ).map((item) => {
              const active = selectedTheme === item.mode
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => pickTheme(item.mode)}
                  className="group flex flex-col items-center gap-2"
                >
                  <span
                    className={cn(
                      'relative rounded-r-sm p-[2px] transition-shadow duration-200',
                      active ? 'shadow-[0_0_0_2px_var(--brand-500)]' : 'group-hover:shadow-[0_0_0_2px_var(--border-strong)]',
                    )}
                  >
                    <ThemePreview mode={item.mode} />
                    {active && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white"
                      >
                        <Check size={10} strokeWidth={3} />
                      </motion.span>
                    )}
                  </span>
                  <span className={cn('text-[13px]', active ? 'font-medium text-ink-900' : 'text-ink-500')}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
          <SavedFlash tick={savedTick} />
        </div>
      </SettingCard>

      {/* 卡片 B · 编辑器 */}
      <SettingCard title="编辑器" caption="即改即存，作用于便签编辑体验">
        <div className="divide-y divide-line">
          <SettingRow label="自动保存" hint="编辑停笔后自动保存草稿">
            <SgSwitch
              aria-label="自动保存"
              checked={prefs.editor.autoSave}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, editor: { ...p.editor, autoSave: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
            <SgSelect
              aria-label="自动保存间隔"
              value={prefs.editor.autoSaveInterval}
              disabled={!prefs.editor.autoSave}
              options={[
                { value: '1s', label: '1s' },
                { value: '3s', label: '3s' },
                { value: '5s', label: '5s' },
              ]}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, editor: { ...p.editor, autoSaveInterval: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
          </SettingRow>
          <SettingRow label="显示行号">
            <SgSwitch
              aria-label="显示行号"
              checked={prefs.editor.lineNumbers}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, editor: { ...p.editor, lineNumbers: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
          </SettingRow>
          <SettingRow label="默认视图">
            <SgSelect
              aria-label="默认视图"
              value={prefs.editor.defaultView}
              options={[
                { value: 'split', label: '分栏' },
                { value: 'edit', label: '编辑' },
                { value: 'preview', label: '预览' },
              ]}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, editor: { ...p.editor, defaultView: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
          </SettingRow>
          <SettingRow label="AI 自动补全" hint="停笔 0.8s 后给出续写建议，Tab 接受">
            <SgSwitch
              aria-label="AI 自动补全"
              variant="ai"
              checked={prefs.editor.aiAutocomplete}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, editor: { ...p.editor, aiAutocomplete: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
          </SettingRow>
          <SettingRow label="新便签默认类型">
            <SgSelect
              aria-label="新便签默认类型"
              value={prefs.editor.defaultNoteKind}
              options={[
                { value: 'memo', label: '随手记' },
                { value: 'daily', label: '日报' },
              ]}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, editor: { ...p.editor, defaultNoteKind: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
          </SettingRow>
        </div>
      </SettingCard>

      {/* 卡片 C · 通用 */}
      <SettingCard title="通用">
        <div className="divide-y divide-line">
          <SettingRow label="用户名" hint="显示在问候语与头像上">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              maxLength={12}
              className="h-[38px] w-40 rounded-r-sm border border-line-strong bg-surface px-3 text-[13px] text-ink-700 outline-none transition-colors focus:border-brand-500 focus:ring-[3px] focus:ring-brand-100"
            />
          </SettingRow>
          <SettingRow label="启动时打开">
            <SgSelect
              aria-label="启动时打开"
              value={prefs.general.startPage}
              options={[
                { value: 'home', label: '工作台' },
                { value: 'last', label: '上次的页面' },
                { value: 'new-note', label: '新建便签' },
              ]}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, general: { ...p.general, startPage: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
          </SettingRow>
          <SettingRow label="每周起始日" hint="影响热力图与周报范围">
            <SgSelect
              aria-label="每周起始日"
              value={prefs.general.weekStart}
              options={[
                { value: 'monday', label: '周一' },
                { value: 'sunday', label: '周日' },
              ]}
              onChange={(v) => {
                updatePrefs((p) => ({ ...p, general: { ...p.general, weekStart: v } }))
                setSavedTick((t) => t + 1)
              }}
            />
          </SettingRow>
        </div>
      </SettingCard>
    </div>
  )
}
