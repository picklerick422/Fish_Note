import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AISettings, Theme } from '@/types'
import { createThrottledStorage } from '@/lib/persistStorage'
import { useChatStore } from './useChatStore'
import { useNotesStore } from './useNotesStore'
import { useReportsStore } from './useReportsStore'
import { useStatsStore } from './useStatsStore'

interface SettingsState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void

  /** 当前用户昵称（问候语、头像） */
  userName: string
  setUserName: (name: string) => void

  ai: AISettings
  updateAI: (patch: Partial<AISettings>) => void

  /** 首页欢迎层是否已展示 */
  welcomed: boolean
  setWelcomed: (v: boolean) => void

  /** 一键清空全部业务数据（设置页「数据管理」用） */
  resetAllData: () => void
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'mock',
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  mockEnabled: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),

      userName: '',
      setUserName: (userName) => set({ userName }),

      ai: DEFAULT_AI_SETTINGS,
      updateAI: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),

      welcomed: false,
      setWelcomed: (welcomed) => set({ welcomed }),

      resetAllData: () => {
        // 先经各 store 的 persist API 清存储：节流 storage 的 removeItem 会
        // flush 并清掉 pending/timer，避免 reload 时 beforeunload 把旧状态写回
        for (const store of [useNotesStore, useReportsStore, useChatStore, useStatsStore, useSettingsStore]) {
          store.persist.clearStorage()
        }
        // 再清理非 store 的杂项 key（sg-local-prefs / sg-ai-completion / sg-stats-badge-seen / sg-data-version 等）
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('sg-')) localStorage.removeItem(key)
        }
        location.reload()
      },
    }),
    { name: 'sg-settings', version: 1, storage: createThrottledStorage() },
  ),
)

/** AI 是否可用：openai 需填 apiKey；mock 需开启模拟引擎 */
export const selectAIReady = (s: Pick<SettingsState, 'ai'>): boolean =>
  s.ai.provider === 'openai' ? Boolean(s.ai.apiKey.trim()) : s.ai.mockEnabled

export const useAIReady = (): boolean => useSettingsStore(selectAIReady)
