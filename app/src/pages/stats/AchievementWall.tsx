import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Coins,
  Feather,
  FileText,
  Fish,
  Flame,
  Library,
  Medal,
  MessagesSquare,
  Moon,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useNoteCounts, useStatsData, useStatsStore } from '@/store/useStatsStore'
import { cn } from '@/lib/utils'

interface BadgeDef {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  /** 奖章渐变底（已解锁） */
  gradient: string
  /** 进度环主色 */
  ring: string
  target: number
  current: number
  /** 对应 useStatsStore.achievements 的 id（有则同步解锁状态） */
  storeId?: string
}

const SEEN_KEY = 'sg-stats-badge-seen'

function loadSeen(): string[] | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? (JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

/** 徽章进度环（未解锁接近时显示迷你进度环，已解锁为满环微光） */
function ProgressRing({ pct, color, unlocked }: { pct: number; color: string; unlocked: boolean }) {
  const R = 35
  const C = 2 * Math.PI * R
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden>
      {unlocked ? (
        <circle cx="40" cy="40" r={R} fill="none" stroke={color} strokeWidth={2.5} strokeOpacity={0.55} />
      ) : (
        <>
          <circle cx="40" cy="40" r={R} fill="none" stroke="var(--border)" strokeWidth={2.5} />
          {pct > 0 && (
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - pct) }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </>
      )}
    </svg>
  )
}

interface Toast {
  id: number
  title: string
  gradient: string
  icon: LucideIcon
}

interface AchievementWallProps {
  baseDelay?: number
}

/** R5 · 成就墙：12 枚徽章网格 + 新解锁右下角祝贺 Toast（stats.md R5） */
export default function AchievementWall({ baseDelay = 0.4 }: AchievementWallProps) {
  const counts = useNoteCounts()
  const stats = useStatsData()
  const notes = useNotesStore((s) => s.notes)
  const messages = useChatStore((s) => s.messages)
  const storeAchievements = useStatsStore((s) => s.achievements)
  const unlockAchievement = useStatsStore((s) => s.unlockAchievement)
  const [toasts, setToasts] = useState<Toast[]>([])

  const badges = useMemo<BadgeDef[]>(() => {
    const live = notes.filter((n) => !n.deletedAt)
    const maxDay = Object.values(stats.activity).reduce((m, n) => Math.max(m, n), 0)
    const lateNight = live.filter((n) => new Date(n.createdAt).getHours() >= 23).length
    return [
      { id: 'first-note', storeId: 'first-note', title: '初次下水', desc: '写下第 1 条便签', icon: Fish, gradient: 'linear-gradient(135deg,#8FB0D8,#4A6FA5)', ring: 'var(--brand-500)', target: 1, current: counts.total },
      { id: 'streak-7', storeId: 'streak-7', title: '七日之约', desc: '连续记录 7 天', icon: Flame, gradient: 'linear-gradient(135deg,#FBBF24,#F59E0B)', ring: '#F59E0B', target: 7, current: stats.streakDays },
      { id: 'streak-30', storeId: 'streak-30', title: '月度坚守', desc: '连续记录 30 天', icon: Flame, gradient: 'linear-gradient(135deg,#FDE68A,#D97706)', ring: '#D97706', target: 30, current: stats.streakDays },
      { id: 'first-weekly', title: '首篇周报', desc: '生成第 1 份周报', icon: FileText, gradient: 'linear-gradient(135deg,#60A5FA,#3B82F6)', ring: 'var(--blue)', target: 1, current: counts.weekly },
      { id: 'notes-100', storeId: 'notes-100', title: '百条纪念', desc: '便签达 100 条', icon: Library, gradient: 'linear-gradient(135deg,#4A6FA5,#2F4A73)', ring: 'var(--brand-600)', target: 100, current: counts.total },
      { id: 'first-chat', title: '初次回忆', desc: '使用回忆书对话', icon: MessagesSquare, gradient: 'var(--ai-gradient)', ring: 'var(--ai-500)', target: 1, current: messages.length },
      { id: 'peak-day', title: '高产之日', desc: '单日 10 条记录', icon: Zap, gradient: 'linear-gradient(135deg,#FB923C,#F59E0B)', ring: '#FB923C', target: 10, current: maxDay },
      { id: 'night-owl', title: '深夜笔耕', desc: '23 点后记录 10 次', icon: Moon, gradient: 'linear-gradient(135deg,#6366F1,#8B5CF6)', ring: '#6366F1', target: 10, current: lateNight },
      { id: 'level-5', title: '小有所成', desc: '等级达到 Lv.5', icon: Medal, gradient: 'linear-gradient(135deg,#7DA2D4,#3D5D8C)', ring: '#7DA2D4', target: 5, current: stats.level },
      { id: 'words-10k', title: '千字成章', desc: '累计书写 10,000 字', icon: Feather, gradient: 'linear-gradient(135deg,#A5B4FC,#6366F1)', ring: '#6366F1', target: 10000, current: stats.totalWords },
      { id: 'inspiration-5k', title: '灵感富翁', desc: '灵感收益达 5,000', icon: Coins, gradient: 'linear-gradient(135deg,#FBBF24,#D97706)', ring: '#D97706', target: 5000, current: stats.inspiration },
      { id: 'ai-100', storeId: 'ai-100', title: 'AI 拍档', desc: '完成 100 次 AI 整理', icon: Sparkles, gradient: 'var(--ai-gradient)', ring: 'var(--ai-500)', target: 100, current: live.filter((n) => n.aiGenerated).length + Math.round(stats.tokenUsage.total / 30000) },
    ]
  }, [counts, stats, notes, messages])

  // store 解锁状态并入（store 中已解锁的按已解锁渲染）
  const unlockedMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const b of badges) {
      const storeHit = b.storeId ? storeAchievements.find((a) => a.id === b.storeId) : undefined
      map.set(b.id, b.current >= b.target || Boolean(storeHit?.unlockedAt))
    }
    return map
  }, [badges, storeAchievements])

  const unlockedCount = badges.filter((b) => unlockedMap.get(b.id)).length

  // 新解锁检测：首次访问静默落档；之后 diff 弹祝贺 Toast + 同步 store
  const seenRef = useRef<string[] | null | undefined>(undefined)
  useEffect(() => {
    if (seenRef.current === undefined) seenRef.current = loadSeen()
    const seen = seenRef.current
    const unlockedIds = badges.filter((b) => unlockedMap.get(b.id)).map((b) => b.id)
    if (seen === null) {
      localStorage.setItem(SEEN_KEY, JSON.stringify(unlockedIds))
      seenRef.current = unlockedIds
      return
    }
    const fresh = badges.filter((b) => unlockedMap.get(b.id) && !seen.includes(b.id))
    if (fresh.length === 0) return
    const nextSeen = [...seen, ...fresh.map((b) => b.id)]
    localStorage.setItem(SEEN_KEY, JSON.stringify(nextSeen))
    seenRef.current = nextSeen
    fresh.forEach((b, i) => {
      if (b.storeId) unlockAchievement(b.storeId)
      const id = Date.now() + i
      setTimeout(() => setToasts((t) => [...t, { id, title: b.title, gradient: b.gradient, icon: b.icon }]), i * 600)
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), i * 600 + 3600)
    })
  }, [badges, unlockedMap, unlockAchievement])

  // 全局监听：其他页面可派发 window 'sg:achievement' CustomEvent({title}) 触发祝贺
  useEffect(() => {
    const handler = (e: Event) => {
      const title = (e as CustomEvent<{ title?: string }>).detail?.title
      const badge = badges.find((b) => b.title === title) ?? badges[0]
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, title: badge.title, gradient: badge.gradient, icon: badge.icon }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
    }
    window.addEventListener('sg:achievement', handler)
    return () => window.removeEventListener('sg:achievement', handler)
  }, [badges])

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: baseDelay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex items-baseline gap-3">
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">成就</h3>
        <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
          已解锁 <span className="tnum font-medium text-brand-600">{unlockedCount}</span> / {badges.length}
        </span>
      </div>

      <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {badges.map((b, i) => {
          const unlocked = unlockedMap.get(b.id) ?? false
          const pct = Math.min(b.current / b.target, 1)
          const Icon = b.icon
          return (
            <motion.div
              key={b.id}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: baseDelay + 0.1 + i * 0.06, type: 'spring', stiffness: 400, damping: 24 }}
              className="flex flex-col items-center gap-2 rounded-r-md px-2 py-3 text-center"
            >
              <motion.div
                className="relative flex h-20 w-20 items-center justify-center"
                whileHover={unlocked ? { rotate: [0, -8, 8, -4, 0], transition: { duration: 0.5 } } : undefined}
              >
                <ProgressRing pct={pct} color={b.ring} unlocked={unlocked} />
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full transition-shadow duration-200',
                    unlocked ? 'shadow-hover' : 'bg-subtle',
                  )}
                  style={unlocked ? { backgroundImage: b.gradient, boxShadow: `0 0 16px -2px ${b.ring}` } : undefined}
                >
                  <Icon size={26} strokeWidth={2} className={unlocked ? 'text-white' : 'text-ink-300 opacity-40'} />
                </div>
              </motion.div>
              <div>
                <div className={cn('text-[13px] font-semibold leading-5', unlocked ? 'text-ink-900' : 'text-ink-400')}>
                  {b.title}
                </div>
                <div className="mt-0.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{b.desc}</div>
                {!unlocked && (
                  <div className="tnum mt-0.5 text-[11px] leading-4 text-ink-400">
                    {b.current.toLocaleString()}/{b.target.toLocaleString()}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 新解锁祝贺 Toast（右下角 spring 弹入） */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = t.icon
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ x: 80, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 40, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className="pointer-events-auto flex items-center gap-3 rounded-r-lg border border-line bg-surface py-2.5 pl-3 pr-4 shadow-pop"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundImage: t.gradient }}>
                  <Icon size={18} className="text-white" />
                </span>
                <span className="text-[13px] font-medium text-ink-900">
                  解锁成就「{t.title}」！
                  <span className="block text-[12px] font-normal text-ink-400">继续保持，下枚徽章在路上了</span>
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
