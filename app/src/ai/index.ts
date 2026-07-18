/**
 * AI 入口：根据设置返回当前 Provider。
 * 页面层用法：
 *   import { getAIProvider } from '@/ai'
 *   const ai = getAIProvider()
 *   const md = await ai.structure(text, { onToken: (_, full) => setPreview(full) })
 */
import type { AIProvider } from './provider'
import { mockEngine } from './mockEngine'
import { openaiProvider } from './openaiProvider'
import { selectAIReady, useSettingsStore } from '@/store/useSettingsStore'

export function getAIProvider(): AIProvider {
  const { ai } = useSettingsStore.getState()
  if (ai.provider === 'openai' && ai.apiKey.trim()) return openaiProvider
  return mockEngine
}

/** AI 功能当前是否可用（用于按钮降级） */
export function isAIReady(): boolean {
  return selectAIReady(useSettingsStore.getState())
}

export type { AIProvider } from './provider'
export type {
  AIChatMessage,
  StreamOptions,
  StructureOptions,
  GenerateReportInput,
  AskOptions,
  AskResult,
} from './provider'
export { isAbortError } from './provider'
export { retrieveNotes } from './mockEngine'
