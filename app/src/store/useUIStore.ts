import { create } from 'zustand'

/** 非持久化的全局 UI 状态 */
interface UIState {
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  togglePalette: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
}))
