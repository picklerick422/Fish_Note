import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { MonitorX } from 'lucide-react'
import SidebarRail from './SidebarRail'
import CommandPalette from './CommandPalette'

export interface PageHeaderConfig {
  title: string
  subtitle?: string
  actions?: ReactNode
}

type SetHeader = (cfg: PageHeaderConfig | null) => void

const PageHeaderContext = createContext<SetHeader>(() => {})

/**
 * 页面设置共享 PageHeader 内容。
 * 注意：config.actions 在 title/subtitle 或 deps 变化时重新捕获；
 * 若 actions 依赖页面内变化的状态，请把相关值放进 deps。
 */
export function usePageHeader(config: PageHeaderConfig | null, deps: unknown[] = []) {
  const setHeader = useContext(PageHeaderContext)
  useEffect(() => {
    setHeader(config)
    return () => setHeader(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.title, config?.subtitle, setHeader, ...deps])
}

const G_SHORTCUTS: Record<string, string> = { h: '/', n: '/notes', m: '/memory', r: '/reports', s: '/stats' }

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

/** App Shell：左侧 SidebarRail + PageHeader + 内容区（design.md §6） */
export default function Layout() {
  const [header, setHeader] = useState<PageHeaderConfig | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const setHeaderCb = useCallback<SetHeader>((cfg) => setHeader(cfg), [])

  // header 吸顶阴影
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // G then X 页面跳转快捷键
  useEffect(() => {
    let armed = false
    let timer: ReturnType<typeof setTimeout>
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      if (!armed && e.key.toLowerCase() === 'g') {
        armed = true
        timer = setTimeout(() => (armed = false), 800)
        return
      }
      if (armed) {
        armed = false
        clearTimeout(timer)
        const to = G_SHORTCUTS[e.key.toLowerCase()]
        if (to) {
          e.preventDefault()
          navigate(to)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [navigate])

  return (
    <PageHeaderContext.Provider value={setHeaderCb}>
      <div className="min-h-[100dvh] bg-base">
        <SidebarRail />

        <div className="pl-[5vw] lg:pl-[5vw]" style={{ minWidth: 0 }}>
          {/* PageHeader：sticky 吸顶，滚动时出现 shadow-card */}
          <header
            className={`sticky top-0 z-30 flex items-center justify-between gap-[1vw] border-b border-line bg-base/90 px-[2vw] backdrop-blur transition-shadow duration-200 ${
              scrolled ? 'shadow-card' : ''
            }`}
            style={{ height: 'clamp(56px, 5vh, 72px)' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname + (header?.title ?? '')}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="min-w-0"
              >
                <h1 className="text-[24px] font-bold leading-8 text-ink-900">{header?.title ?? ''}</h1>
                {header?.subtitle && (
                  <p className="mt-0.5 truncate text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
                    {header.subtitle}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
            <motion.div
              key={`actions-${location.pathname}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06, duration: 0.24 }}
              className="flex shrink-0 items-center gap-3"
            >
              {header?.actions}
            </motion.div>
          </header>

          {/* 内容区 max-width 92vw 居中 */}
          <main className="mx-auto w-full px-[2vw] py-[2vh]" style={{ maxWidth: '92vw' }}>
            <Outlet />
          </main>
        </div>

        <CommandPalette />

        {/* <768px 兜底提示 */}
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-base px-8 text-center md:hidden">
          <MonitorX size={40} className="text-ink-300" />
          <div>
            <p className="text-[16px] font-semibold text-ink-900">请使用桌面端访问</p>
            <p className="mt-1 text-[13px] text-ink-500">FishNote 为平板/桌面体验设计，请在宽度 ≥ 768px 的窗口中使用</p>
          </div>
        </div>
      </div>
    </PageHeaderContext.Provider>
  )
}
