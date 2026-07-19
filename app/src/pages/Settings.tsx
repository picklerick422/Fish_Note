import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Database, Info, Keyboard, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react'
import { usePageHeader } from '@/components/Layout'
import { cn } from '@/lib/utils'
import PreferencesSection from './settings/PreferencesSection'
import AISection from './settings/AISection'
import ShortcutsSection from './settings/ShortcutsSection'
import DataSection from './settings/DataSection'
import AboutSection from './settings/AboutSection'

type SectionId = 'prefs' | 'ai' | 'shortcuts' | 'data' | 'about'

const NAV: Array<{ id: SectionId; label: string; icon: LucideIcon; aiBadge?: boolean }> = [
  { id: 'prefs', label: '偏好', icon: SlidersHorizontal },
  { id: 'ai', label: 'AI 供应商', icon: Sparkles, aiBadge: true },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'data', label: '数据管理', icon: Database },
  { id: 'about', label: '关于', icon: Info },
]

/**
 * 设置页（settings.md）：左侧子导航（sticky）+ 右侧设置卡片区。
 * 锚点 URL：/settings#ai 等，打开时滚动定位对应分组。
 */
export default function Settings() {
  const location = useLocation()
  const navigate = useNavigate()
  const [active, setActive] = useState<SectionId>('prefs')
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    prefs: null,
    ai: null,
    shortcuts: null,
    data: null,
    about: null,
  })

  usePageHeader({ title: '设置', subtitle: '让 FishNote 按你的方式工作' })

  // 打开 /settings#section → 滚动定位
  useEffect(() => {
    const hash = location.hash.replace('#', '') as SectionId
    if (!hash || !(hash in sectionRefs.current)) return
    const t = setTimeout(() => {
      setActive(hash)
      sectionRefs.current[hash]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => clearTimeout(t)
  }, [location.hash])

  // 滚动 spy：高亮当前可视分组
  useEffect(() => {
    const onScroll = () => {
      const probe = window.scrollY + 140
      let current: SectionId = 'prefs'
      for (const nav of NAV) {
        const el = sectionRefs.current[nav.id]
        if (el && el.offsetTop <= probe) current = nav.id
      }
      setActive(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jump = (id: SectionId) => {
    setActive(id)
    navigate(`#${id}`, { replace: true })
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex items-start gap-[2vw]">
      {/* 左侧子导航（响应式宽度 sticky） */}
      <nav className="sticky top-24 shrink-0" style={{ width: 'clamp(160px, 15vw, 220px)' }}>
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const selected = active === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => jump(item.id)}
                  className={cn(
                    'relative flex h-[38px] w-full items-center gap-2.5 rounded-r-sm px-3 text-[14px] transition-colors duration-150',
                    selected ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-500 hover:bg-subtle hover:text-ink-900',
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="settings-nav-pill"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-pill bg-brand-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon size={16} strokeWidth={selected ? 2.2 : 1.8} className={selected && item.aiBadge ? 'text-ai-500' : undefined} />
                  {item.label}
                  {item.aiBadge && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ai-500" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 右侧设置卡片区 */}
      <div className="min-w-0 w-full flex-1 pb-[4vh]" style={{ maxWidth: '65vw' }}>
        {NAV.map((item, groupIdx) => (
          <section
            key={item.id}
            id={item.id}
            ref={(el) => {
              sectionRefs.current[item.id] = el
            }}
            className="scroll-mt-24"
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.06, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={groupIdx > 0 ? 'mt-8' : ''}
            >
              <h2 className="mb-3 px-1 text-[13px] font-semibold tracking-[0.02em] text-ink-400">{item.label}</h2>
              {item.id === 'prefs' && <PreferencesSection />}
              {item.id === 'ai' && <AISection />}
              {item.id === 'shortcuts' && <ShortcutsSection />}
              {item.id === 'data' && <DataSection />}
              {item.id === 'about' && <AboutSection />}
            </motion.div>
          </section>
        ))}
      </div>
    </div>
  )
}
