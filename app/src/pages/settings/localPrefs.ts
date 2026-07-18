/**
 * 设置页本地偏好（不改动全局 store，持久化到 localStorage `sg-local-prefs`）。
 * 统计页通过 getTokenPrice() 读取 Token 单价做成本估算。
 */
import { useCallback, useState } from 'react'

const KEY = 'sg-local-prefs'

export interface LocalPrefs {
  /** 主题模式：system 时跟随 prefers-color-scheme */
  themeMode: 'light' | 'dark' | 'system'
  editor: {
    autoSave: boolean
    autoSaveInterval: '1s' | '3s' | '5s'
    lineNumbers: boolean
    defaultView: 'split' | 'edit' | 'preview'
    aiAutocomplete: boolean
    defaultNoteKind: 'memo' | 'daily'
  }
  general: {
    startPage: 'home' | 'last' | 'new-note'
    weekStart: 'monday' | 'sunday'
  }
  ai: {
    maxTokens: number
    /** ¥ / 1K tokens（统计页成本估算） */
    tokenPrice: number
  }
  trashAutoClean: '7d' | '30d' | 'never'
}

export const DEFAULT_LOCAL_PREFS: LocalPrefs = {
  themeMode: 'light',
  editor: {
    autoSave: true,
    autoSaveInterval: '3s',
    lineNumbers: true,
    defaultView: 'split',
    aiAutocomplete: true,
    defaultNoteKind: 'memo',
  },
  general: { startPage: 'home', weekStart: 'monday' },
  ai: { maxTokens: 2048, tokenPrice: 0.002 },
  trashAutoClean: '30d',
}

export function loadLocalPrefs(): LocalPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_LOCAL_PREFS
    const parsed = JSON.parse(raw) as Partial<LocalPrefs>
    return {
      ...DEFAULT_LOCAL_PREFS,
      ...parsed,
      editor: { ...DEFAULT_LOCAL_PREFS.editor, ...parsed.editor },
      general: { ...DEFAULT_LOCAL_PREFS.general, ...parsed.general },
      ai: { ...DEFAULT_LOCAL_PREFS.ai, ...parsed.ai },
    }
  } catch {
    return DEFAULT_LOCAL_PREFS
  }
}

export function saveLocalPrefs(prefs: LocalPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

/** 设置页使用的响应式偏好；跨页面读取用 loadLocalPrefs() / getTokenPrice() */
export function useLocalPrefs(): [LocalPrefs, (patch: (prev: LocalPrefs) => LocalPrefs) => void] {
  const [prefs, setPrefs] = useState<LocalPrefs>(loadLocalPrefs)
  const update = useCallback((patch: (prev: LocalPrefs) => LocalPrefs) => {
    setPrefs((prev) => {
      const next = patch(prev)
      saveLocalPrefs(next)
      return next
    })
  }, [])
  return [prefs, update]
}

export function getTokenPrice(): number {
  return loadLocalPrefs().ai.tokenPrice
}

/** 标签页之间同步（统计页读取单价等场景） */
export function onLocalPrefsChange(cb: (prefs: LocalPrefs) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === KEY) cb(loadLocalPrefs())
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

/** 首次挂载时确保 KEY 存在 */
export function ensureLocalPrefs() {
  if (!localStorage.getItem(KEY)) saveLocalPrefs(loadLocalPrefs())
}
