import './migrate'
import '@fontsource/sora/600.css'
import '@fontsource/sora/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import 'highlight.js/styles/github.css'
import './index.css'
import App from './App.tsx'

// 首屏渲染前恢复主题，避免闪烁
try {
  const raw = localStorage.getItem('sg-settings')
  if (raw) {
    const state = JSON.parse(raw)?.state
    if (state?.theme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>,
)
