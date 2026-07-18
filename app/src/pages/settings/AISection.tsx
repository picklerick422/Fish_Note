import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { mockEngine } from '@/ai/mockEngine'
import { DEFAULT_AI_SETTINGS, useSettingsStore } from '@/store/useSettingsStore'
import type { AISettings } from '@/types'
import { useLocalPrefs } from './localPrefs'
import { GhostButton, PrimaryButton, SecondaryButton, SettingCard } from './controls'

interface Draft {
  provider: AISettings['provider']
  baseURL: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  tokenPrice: number
}

type TestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; latency: number; model: string }
  | { status: 'fail'; message: string }

const inputCls =
  'h-[38px] w-full rounded-r-sm border border-line-strong bg-surface px-3 text-[13px] text-ink-700 outline-none transition-colors placeholder:text-ink-300 focus:border-ai-500 focus:ring-[3px] focus:ring-ai-100'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{hint}</span>}
    </label>
  )
}

/** 测试连接：mock 走本地引擎 ping；openai 直连 chat/completions */
async function testConnection(draft: Draft, signal: AbortSignal): Promise<{ latency: number; model: string }> {
  const start = performance.now()
  if (draft.provider === 'mock') {
    await mockEngine.chat([{ role: 'user', content: 'ping' }], { signal })
    return { latency: Math.round(performance.now() - start), model: '内置演示引擎' }
  }
  if (!draft.apiKey.trim()) throw new Error('请先填写 API Key')
  const res = await fetch(`${draft.baseURL.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${draft.apiKey.trim()}` },
    body: JSON.stringify({
      model: draft.model.trim() || DEFAULT_AI_SETTINGS.model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      stream: false,
    }),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let hint = res.statusText
    if (res.status === 401) hint = '401 Unauthorized，请检查 API Key'
    else if (res.status === 404) hint = '404 接口不存在，请检查 Base URL'
    throw new Error(`${res.status} ${hint}${text ? `：${text.slice(0, 80)}` : ''}`)
  }
  return { latency: Math.round(performance.now() - start), model: draft.model.trim() || DEFAULT_AI_SETTINGS.model }
}

/** 组 2 · AI 供应商（settings.md 核心）：引擎选择 + API 配置 + 测试连接 + 用量说明 */
export default function AISection() {
  const ai = useSettingsStore((s) => s.ai)
  const updateAI = useSettingsStore((s) => s.updateAI)
  const [prefs, updatePrefs] = useLocalPrefs()

  const [draft, setDraft] = useState<Draft>(() => ({
    provider: ai.provider,
    baseURL: ai.baseURL,
    apiKey: ai.apiKey,
    model: ai.model,
    temperature: ai.temperature,
    maxTokens: prefs.ai.maxTokens,
    tokenPrice: prefs.ai.tokenPrice,
  }))
  const [test, setTest] = useState<TestState>({ status: 'idle' })
  const [showKey, setShowKey] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [models, setModels] = useState<string[] | null>(null)
  const [modelsLoading, setModelsLoading] = useState(false)

  const dirty = useMemo(
    () =>
      draft.provider !== ai.provider ||
      draft.baseURL !== ai.baseURL ||
      draft.apiKey !== ai.apiKey ||
      draft.model !== ai.model ||
      draft.temperature !== ai.temperature ||
      draft.maxTokens !== prefs.ai.maxTokens ||
      draft.tokenPrice !== prefs.ai.tokenPrice,
    [draft, ai, prefs],
  )

  // 草稿改动后旧的测试结果失效
  useEffect(() => setTest({ status: 'idle' }), [draft])

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))

  const runTest = async () => {
    setTest({ status: 'loading' })
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const { latency, model } = await testConnection(draft, ctrl.signal)
      setTest({ status: 'ok', latency, model })
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'AbortError'
          ? '连接超时（15s），请检查 Base URL 与网络'
          : err instanceof TypeError
            ? '无法连接到服务，请检查 Base URL 与网络'
            : err instanceof Error
              ? err.message
              : '未知错误'
      setTest({ status: 'fail', message })
    } finally {
      clearTimeout(timer)
    }
  }

  const fetchModels = async () => {
    if (!draft.apiKey.trim()) {
      notify.error('请先填写 API Key')
      return
    }
    setModelsLoading(true)
    try {
      const res = await fetch(`${draft.baseURL.replace(/\/+$/, '')}/models`, {
        headers: { Authorization: `Bearer ${draft.apiKey.trim()}` },
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as { data?: Array<{ id: string }> }
      const list = (json.data ?? []).map((m) => m.id).filter(Boolean).sort()
      if (list.length === 0) throw new Error('empty')
      setModels(list)
      if (!list.includes(draft.model)) patch({ model: list[0] })
      notify.success(`已获取 ${list.length} 个可用模型`)
    } catch {
      notify.error('获取模型列表失败，请检查 Base URL 与 API Key')
    } finally {
      setModelsLoading(false)
    }
  }

  const save = () => {
    updateAI({
      provider: draft.provider,
      baseURL: draft.baseURL.trim() || DEFAULT_AI_SETTINGS.baseURL,
      apiKey: draft.apiKey.trim(),
      model: draft.model.trim() || DEFAULT_AI_SETTINGS.model,
      temperature: draft.temperature,
      mockEnabled: true,
    })
    updatePrefs((p) => ({ ...p, ai: { maxTokens: draft.maxTokens, tokenPrice: draft.tokenPrice } }))
    notify.ai('AI 供应商已更新 ✦')
  }

  const resetDefaults = () => {
    setDraft({
      provider: 'mock',
      baseURL: DEFAULT_AI_SETTINGS.baseURL,
      apiKey: '',
      model: DEFAULT_AI_SETTINGS.model,
      temperature: DEFAULT_AI_SETTINGS.temperature,
      maxTokens: 2048,
      tokenPrice: 0.002,
    })
    setModels(null)
  }

  const engines = [
    {
      key: 'mock' as const,
      title: '内置演示引擎',
      desc: '无需联网与密钥，本地模拟全部 AI 能力，供体验与开发调试',
    },
    {
      key: 'openai' as const,
      title: 'OpenAI 兼容 API',
      desc: '接入真实大模型（OpenAI / DeepSeek / Moonshot / Ollama 等任意兼容服务）',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* 卡片 A · 引擎选择 */}
      <SettingCard
        title={
          <span className="flex items-center gap-2">
            引擎选择
            {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber" title="有未保存的修改" />}
          </span>
        }
        caption="AI 能力可插拔：演示引擎离线可用，兼容 API 接入真实大模型"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {engines.map((e) => {
            const selected = draft.provider === e.key
            const enabled = ai.provider === e.key
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => patch({ provider: e.key })}
                className={cn(
                  'relative rounded-r-md border-2 p-4 text-left transition-all duration-200',
                  selected ? 'border-ai-500 bg-ai-50 shadow-ai' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
                    <Sparkles size={15} className={selected ? 'text-ai-500' : 'text-ink-300'} />
                    {e.title}
                  </span>
                  {selected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ai-500 text-white"
                    >
                      <Check size={10} strokeWidth={3} />
                    </motion.span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{e.desc}</p>
                {enabled && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    已启用
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 卡片 B · API 配置（openai 选中时展开） */}
        <AnimatePresence initial={false}>
          {draft.provider === 'openai' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-col gap-4 border-t border-line pt-5">
                <Field label="Base URL">
                  <input
                    value={draft.baseURL}
                    onChange={(e) => patch({ baseURL: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    spellCheck={false}
                    className={cn(inputCls, 'font-mono')}
                  />
                </Field>

                <Field label="API Key" hint="仅存储在本机 localStorage，不会上传任何服务器">
                  <span className="relative block">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={draft.apiKey}
                      onChange={(e) => patch({ apiKey: e.target.value })}
                      placeholder="sk-..."
                      spellCheck={false}
                      autoComplete="off"
                      className={cn(inputCls, 'pr-10 font-mono')}
                    />
                    <button
                      type="button"
                      aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-r-sm p-1.5 text-ink-400 transition-colors hover:bg-subtle hover:text-ink-700"
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </span>
                </Field>

                <Field label="模型">
                  <span className="flex items-center gap-2">
                    {models ? (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative flex-1"
                      >
                        <select
                          value={draft.model}
                          onChange={(e) => patch({ model: e.target.value })}
                          className={cn(inputCls, 'appearance-none pr-8 font-mono')}
                        >
                          {models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                      </motion.span>
                    ) : (
                      <input
                        value={draft.model}
                        onChange={(e) => patch({ model: e.target.value })}
                        placeholder="gpt-4o-mini"
                        spellCheck={false}
                        className={cn(inputCls, 'flex-1 font-mono')}
                      />
                    )}
                    <GhostButton onClick={fetchModels} disabled={modelsLoading} className="shrink-0 text-ai-600 hover:bg-ai-50">
                      {modelsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      获取模型列表
                    </GhostButton>
                  </span>
                </Field>

                {/* 高级（折叠面板） */}
                <div className="rounded-r-md border border-line">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-subtle"
                  >
                    高级参数
                    <motion.span animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={15} className="text-ink-400" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {advancedOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-5 border-t border-line px-4 py-5">
                          <div>
                            <div className="mb-2 flex items-center justify-between text-[13px]">
                              <span className="font-medium text-ink-700">温度</span>
                              <span className="tnum font-mono text-ink-900">{draft.temperature.toFixed(1)}</span>
                            </div>
                            <Slider
                              value={[draft.temperature]}
                              min={0}
                              max={1}
                              step={0.1}
                              onValueChange={([v]) => patch({ temperature: v })}
                              className="[&_[data-slot=slider-range]]:bg-ai-500 [&_[data-slot=slider-thumb]]:border-ai-500"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="最大 Token">
                              <input
                                type="number"
                                min={1}
                                max={128000}
                                value={draft.maxTokens}
                                onChange={(e) => patch({ maxTokens: Math.max(1, Number(e.target.value) || 2048) })}
                                className={cn(inputCls, 'font-mono')}
                              />
                            </Field>
                            <Field label="Token 单价（¥/1K）" hint="用于统计页成本估算">
                              <input
                                type="number"
                                min={0}
                                step={0.001}
                                value={draft.tokenPrice}
                                onChange={(e) => patch({ tokenPrice: Math.max(0, Number(e.target.value) || 0) })}
                                className={cn(inputCls, 'font-mono')}
                              />
                            </Field>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 测试结果条 */}
        <AnimatePresence>
          {(test.status === 'ok' || test.status === 'fail') && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              className={cn(
                'mt-4 flex items-center gap-2 rounded-r-sm px-3.5 py-2.5 text-[13px] font-medium',
                test.status === 'ok' ? 'bg-brand-50 text-brand-700' : 'bg-red-soft text-red',
              )}
            >
              {test.status === 'ok' ? <Check size={15} /> : <X size={15} />}
              {test.status === 'ok'
                ? `连接成功 · 模型 ${test.model} 可用，延迟 ${test.latency}ms`
                : `连接失败：${test.message}`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部操作行 */}
        <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
          <GhostButton onClick={resetDefaults}>恢复默认</GhostButton>
          <span className="flex-1" />
          {dirty && <span className="mr-1 flex items-center gap-1.5 text-[12px] text-amber">● 未保存</span>}
          <SecondaryButton onClick={runTest} disabled={test.status === 'loading'}>
            {test.status === 'loading' && <Loader2 size={14} className="animate-spin" />}
            测试连接
          </SecondaryButton>
          <PrimaryButton onClick={save} disabled={!dirty}>
            保存
          </PrimaryButton>
        </div>
      </SettingCard>

      {/* 卡片 C · 用量说明 */}
      <SettingCard>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
            Token 用量与成本估算显示在「统计」页面，切换时间范围可查看分时段用量。
          </p>
          <Link
            to="/stats"
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-ai-600 transition-colors hover:text-ai-500"
          >
            去查看 <ArrowRight size={13} />
          </Link>
        </div>
      </SettingCard>
    </div>
  )
}
