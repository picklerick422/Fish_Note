import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChartPie,
  FileBarChart2,
  LayoutDashboard,
  MessagesSquare,
  Moon,
  NotebookPen,
  Settings2,
  Sun,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/useSettingsStore'
import { computeStreak, useStatsStore, xpForNext } from '@/store/useStatsStore'

const NAV_ITEMS = [
  { to: '/', label: '工作台', icon: LayoutDashboard, shortcut: 'G then H', end: true },
  { to: '/notes', label: '便签', icon: NotebookPen, shortcut: 'G then N' },
  { to: '/memory', label: '回忆书', icon: MessagesSquare, shortcut: 'G then M', aiBadge: true },
  { to: '/reports', label: '报告', icon: FileBarChart2, shortcut: 'G then R' },
  { to: '/stats', label: '统计', icon: ChartPie, shortcut: 'G then S' },
]

/** 左侧图标导轨（design.md §6.1）：76px，md 断点缩为 64px */
export default function SidebarRail() {
  const navigate = useNavigate()
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const userName = useSettingsStore((s) => s.userName)
  const level = useStatsStore((s) => s.level)
  const xp = useStatsStore((s) => s.xp)
  const activity = useStatsStore((s) => s.activity)
  const [avatarOpen, setAvatarOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="fixed inset-y-0 left-0 z-40 flex flex-col items-center border-r border-line bg-surface py-[2vh]" style={{ width: 'clamp(56px, 5vw, 80px)' }}>
        {/* Logo：hover 小鱼摇摆 400ms */}
        <motion.button
          type="button"
          aria-label="FishNote"
          onClick={() => navigate('/')}
          whileHover="hover"
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-r-md bg-brand-500 shadow-card"
        >
          <motion.img
            src="./logo.svg"
            alt="FishNote"
            className="h-7 w-7"
            variants={{ hover: { rotate: [0, -10, 10, -5, 0], transition: { duration: 0.4 } } }}
          />
        </motion.button>

        {/* 导航组 */}
        <nav className="mt-10 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <NavLink to={item.to} end={item.end} className="relative block">
                  {({ isActive }) => (
                    <span
                      className={cn(
                        'group relative flex h-11 w-11 items-center justify-center rounded-r-md transition-colors duration-150',
                        isActive
                          ? 'border border-line bg-surface shadow-card'
                          : 'border border-transparent hover:bg-subtle',
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute -left-[13px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-pill bg-brand-500 lg:-left-[17px]"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <item.icon
                        size={20}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={cn('transition-colors duration-150', isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-900')}
                      />
                      {item.aiBadge && (
                        <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-ai-500" />
                      )}
                    </span>
                  )}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>{item.label}</span>
                <span className="text-[11px] text-white/60">{item.shortcut}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* 底部组 */}
        <div className="mt-auto flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="切换主题"
                onClick={toggleTheme}
                className="flex h-11 w-11 items-center justify-center rounded-r-md text-ink-400 transition-colors duration-150 hover:bg-subtle hover:text-ink-900"
              >
                <motion.span
                  key={theme}
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex"
                >
                  {theme === 'light' ? <Moon size={20} strokeWidth={1.8} /> : <Sun size={20} strokeWidth={1.8} />}
                </motion.span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{theme === 'light' ? '切换到深色' : '切换到浅色'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/settings">
                {({ isActive }) => (
                  <span
                    className={cn(
                      'relative flex h-11 w-11 items-center justify-center rounded-r-md transition-colors duration-150',
                      isActive ? 'border border-line bg-surface shadow-card' : 'hover:bg-subtle',
                    )}
                  >
                    <Settings2 size={20} strokeWidth={1.8} className={isActive ? 'text-brand-600' : 'text-ink-400'} />
                  </span>
                )}
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">设置</TooltipContent>
          </Tooltip>

          {/* 头像 + hover 用户卡 */}
          <div className="relative" onMouseEnter={() => setAvatarOpen(true)} onMouseLeave={() => setAvatarOpen(false)}>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[13px] font-semibold text-white"
            >
              {userName ? userName.slice(0, 1) : '?'}
            </button>
            <AnimatePresence>
              {avatarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -4, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -4, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute bottom-0 left-11 z-50 w-44 rounded-r-lg border border-line bg-surface p-3 shadow-pop"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-[14px] font-semibold text-white">
                      {userName ? userName.slice(0, 1) : '?'}
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-ink-900">{userName || '未设置昵称'}</div>
                      <div className="font-display text-[12px] font-semibold text-brand-600">Lv.{level}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1 text-[12px] text-ink-500">
                    <div className="flex justify-between">
                      <span>经验值</span>
                      <span className="tnum font-medium text-ink-700">
                        {xp.toLocaleString()} / {xpForNext(level).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>连续记录</span>
                      <span className="tnum font-medium text-ink-700">{computeStreak(activity).current} 天</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
