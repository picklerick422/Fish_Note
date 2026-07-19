import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AISettings, ColorScheme, Theme } from '@/types'

interface SettingsState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void

  /** 颜色方案：ocean（海洋蓝，默认）/ green（森林绿） */
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void

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

      colorScheme: 'ocean',
      setColorScheme: (colorScheme) => set({ colorScheme }),

      userName: '',
      setUserName: (userName) => set({ userName }),

      ai: DEFAULT_AI_SETTINGS,
      updateAI: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),

      welcomed: false,
      setWelcomed: (welcomed) => set({ welcomed }),

      resetAllData: () => {
        for (const key of ['sg-notes', 'sg-reports', 'sg-chat', 'sg-stats']) {
          localStorage.removeItem(key)
        }
        location.reload()
      },
    }),
    { name: 'sg-settings', version: 1 },
  ),
)

/** AI 是否可用：openai 需填 apiKey；mock 需开启模拟引擎 */
export const selectAIReady = (s: Pick<SettingsState, 'ai'>): boolean =>
  s.ai.provider === 'openai' ? Boolean(s.ai.apiKey.trim()) : s.ai.mockEnabled

export const useAIReady = (): boolean => useSettingsStore(selectAIReady)
