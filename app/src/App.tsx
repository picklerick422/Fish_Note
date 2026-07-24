import { Suspense, lazy, useCallback, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import Layout from '@/components/Layout'
import ThemeRipple, { isRippling } from '@/components/ThemeRipple'

const Home = lazy(() => import('@/pages/Home'))
const Notes = lazy(() => import('@/pages/Notes'))
const Memory = lazy(() => import('@/pages/Memory'))
const Reports = lazy(() => import('@/pages/Reports'))
const Stats = lazy(() => import('@/pages/Stats'))
const Settings = lazy(() => import('@/pages/Settings'))
import { useSettingsStore } from '@/store/useSettingsStore'
import { loadLocalPrefs } from '@/pages/settings/localPrefs'

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  // 深浅主题切换（涟漪动画期间跳过 CSS 过渡，因为克隆 DOM + mask 本身就是过渡）
  useEffect(() => {
    if (isRippling) return
    const root = document.documentElement
    root.classList.add('theme-anim')
    root.classList.toggle('dark', theme === 'dark')
    const timer = setTimeout(() => root.classList.remove('theme-anim'), 320)
    // 同步系统状态栏/导航栏图标颜色到 ArkWeb 壳
    const shell = (window as any).fishNoteShell
    if (shell?.setDarkMode) {
      shell.setDarkMode(theme === 'dark')
    }
    return () => clearTimeout(timer)
  }, [theme])

  // 涟漪动画立即切换回调：直接操作 DOM 切换主题（因为 useEffect 被 isRippling 跳过）
  const handleImmediateSwitch = useCallback(
    (target: 'light' | 'dark') => {
      // 直接切换 .dark（涟漪动画本身就是视觉过渡，不需要 CSS transition）
      document.documentElement.classList.toggle('dark', target === 'dark')
      // 同步壳暗色模式
      const shell = (window as any).fishNoteShell
      if (shell?.setDarkMode) {
        shell.setDarkMode(target === 'dark')
      }
      // 同时更新 zustand（其他订阅者仍能感知主题变化）
      setTheme(target)
    },
    [setTheme],
  )

  // 全局系统主题跟随（影响所有页面，不局限于设置页）
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const applyIfSystem = () => {
      const prefs = loadLocalPrefs()
      if (prefs.themeMode === 'system') {
        setTheme(mq.matches ? 'dark' : 'light')
      }
    }
    applyIfSystem()
    mq.addEventListener('change', applyIfSystem)
    return () => mq.removeEventListener('change', applyIfSystem)
  }, [setTheme])

  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="notes" element={<Notes />} />
            <Route path="memory" element={<Memory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="stats" element={<Stats />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ThemeRipple onImmediateSwitch={handleImmediateSwitch} />
      <Toaster
        position="top-center"
        gap={8}
        offset={16}
        toastOptions={{
          style: {
            background: 'rgba(16,20,24,.92)',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            fontSize: '14px',
          },
        }}
      />
    </HashRouter>
  )
}
