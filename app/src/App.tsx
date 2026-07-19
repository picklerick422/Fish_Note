import { Suspense, lazy, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import Layout from '@/components/Layout'

const Home = lazy(() => import('@/pages/Home'))
const Notes = lazy(() => import('@/pages/Notes'))
const Memory = lazy(() => import('@/pages/Memory'))
const Reports = lazy(() => import('@/pages/Reports'))
const Stats = lazy(() => import('@/pages/Stats'))
const Settings = lazy(() => import('@/pages/Settings'))
import { useSettingsStore } from '@/store/useSettingsStore'

export default function App() {
  const theme = useSettingsStore((s) => s.theme)

  // 深浅主题切换（.dark class 方案，200ms 颜色过渡）
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-anim')
    root.classList.toggle('dark', theme === 'dark')
    const timer = setTimeout(() => root.classList.remove('theme-anim'), 320)
    return () => clearTimeout(timer)
  }, [theme])

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
