import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Notes from '@/pages/Notes'
import Memory from '@/pages/Memory'
import Reports from '@/pages/Reports'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'
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
      <Toaster
        position="top-center"
        gap={8}
        offset={16}
        toastOptions={{
          style: {
            background: 'rgba(23,26,23,.92)',
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
