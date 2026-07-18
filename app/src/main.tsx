import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import 'highlight.js/styles/github.css'
import './index.css'
import App from './App.tsx'

// 首屏渲染前恢复主题，避免闪烁
try {
  const raw = localStorage.getItem('sg-settings')
  if (raw && JSON.parse(raw)?.state?.theme === 'dark') {
    document.documentElement.classList.add('dark')
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>,
)
