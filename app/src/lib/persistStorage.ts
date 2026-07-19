import { createJSONStorage } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * localStorage 写盘节流：同一 key 在 delay 窗口内的多次 set 只落盘最后一次。
 * 避免流式输出/连续击键时每个 set 都同步 JSON.stringify + 写盘。
 */
export function createThrottledStorage(delay = 1000): PersistStorage<unknown> {
  const base = createJSONStorage(() => localStorage)!
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const pending = new Map<string, StorageValue<unknown>>()

  const flush = (name: string) => {
    const value = pending.get(name)
    // stringify 延迟到真正落盘时由 base.setItem 执行，窗口内的中间值不付出序列化成本
    if (value !== undefined) base.setItem(name, value)
    pending.delete(name)
    const t = timers.get(name)
    if (t) clearTimeout(t)
    timers.delete(name)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const name of [...pending.keys()]) flush(name)
    })
  }

  return {
    getItem: base.getItem,
    removeItem: (name: string) => {
      flush(name)
      base.removeItem(name)
    },
    setItem: (name: string, value: StorageValue<unknown>) => {
      pending.set(name, value)
      const t = timers.get(name)
      if (t) clearTimeout(t)
      timers.set(name, setTimeout(() => flush(name), delay))
    },
  }
}
