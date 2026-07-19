import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import 'highlight.js/styles/github.css'
import './index.css'
import App from './App.tsx'

// 数据版本迁移：版本不符时清空全部 sg-* 数据（含旧示例内容），由新 seed 重新注入
const DATA_VERSION = '2'
try {
  if (localStorage.getItem('sg-data-version') !== DATA_VERSION) {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sg-')) localStorage.removeItem(key)
    }
    localStorage.setItem('sg-data-version', DATA_VERSION)
  }
} catch {
  /* ignore */
}

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
