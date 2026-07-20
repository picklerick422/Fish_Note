import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { usePageHeader } from '@/components/Layout'
import AISparkleButton from '@/components/shared/AISparkleButton'
import Kbd from '@/components/shared/Kbd'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/useUIStore'
import GreetingBanner from './home/GreetingBanner'
import StatusCards from './home/StatusCards'
import QuickCapture from './home/QuickCapture'
import RecentNotes from './home/RecentNotes'
import TodaySummary from './home/TodaySummary'
import HeatmapCard from './home/HeatmapCard'
import AssistantCard from './home/AssistantCard'
import WelcomeBubble from './home/WelcomeBubble'

/** 骨架屏 shimmer 块 */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-r-sm bg-subtle', className)}>
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(100deg, transparent 30%, var(--border) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-[1.5vw]">
      <div className="col-span-12 space-y-2.5">
        <Shimmer className="h-9 w-72" />
        <Shimmer className="h-4 w-52" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <Shimmer key={i} className="col-span-12 h-32 rounded-r-lg sm:col-span-6 xl:col-span-3" />
      ))}
      <Shimmer className="col-span-12 h-[300px] rounded-r-xl xl:col-span-8" />
      <Shimmer className="col-span-12 h-[300px] rounded-r-lg xl:col-span-4" />
    </div>
  )
}

/** +20 灵感收益飞行数字：从按钮弧线飞到收益卡 */
function FlyingGain({ x, y, amount, onDone }: { x: number; y: number; amount: number; onDone: () => void }) {
  const target = document.getElementById('inspiration-card')
  const rect = target?.getBoundingClientRect()
  const tx = rect ? rect.left + rect.width / 2 : x
  const ty = rect ? rect.top + rect.height / 2 : y - 120
  const dx = tx - x
  const dy = ty - y
  return (
    <motion.span
      className="pointer-events-none fixed z-[80] font-display text-[18px] font-bold text-brand-500"
      style={{ left: x, top: y }}
      initial={{ opacity: 0 }}
      animate={{
        x: [0, dx * 0.35, dx],
        y: [0, -96, dy],
        opacity: [0, 1, 1],
        scale: [0.6, 1.15, 0.9],
      }}
      transition={{ duration: 0.6, ease: 'easeOut', times: [0, 0.45, 1] }}
      onAnimationComplete={onDone}
    >
      +{amount}
    </motion.span>
  )
}

interface Flight {
  id: number
  x: number
  y: number
  amount: number
}

/** 工作台首页（home.md：R1 问候 → R5 热力图/助手） */
export default function Home() {
  const navigate = useNavigate()
  const togglePalette = useUIStore((s) => s.togglePalette)
  const [loading, setLoading] = useState(true)
  const [flights, setFlights] = useState<Flight[]>([])

  usePageHeader({
    title: '工作台',
    subtitle: '让每一段碎碎念，都沉淀成知识',
    actions: (
      <>
        <button
          type="button"
          onClick={togglePalette}
          className="flex h-7 w-[280px] items-center gap-2 rounded-r-sm border border-line bg-surface px-3 text-[12px] text-ink-400 shadow-card transition-colors hover:border-line-strong"
        >
          <Search size={14} />
          <span className="flex-1 text-left">搜索便签、页面、AI 操作…</span>
          <Kbd className="h-5 text-[11px]">⌘K</Kbd>
        </button>
        <AISparkleButton size="sm" onClick={() => navigate('/notes?new=1')}>新建便签</AISparkleButton>
      </>
    ),
  })

  // 首屏骨架 400ms
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  // +20 飞行收益事件
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y, amount } = (e as CustomEvent<{ x: number; y: number; amount: number }>).detail
      const id = Date.now() + Math.random()
      setFlights((f) => [...f, { id, x, y, amount }])
    }
    window.addEventListener('sg:gain', handler)
    return () => window.removeEventListener('sg:gain', handler)
  }, [])

  return (
    <>
      {loading ? (
        <HomeSkeleton />
      ) : (
        <div className="grid grid-cols-12 gap-[1.5vw]">
          <GreetingBanner />
          <StatusCards />
          <QuickCapture />
          <RecentNotes />
          <TodaySummary />
          <HeatmapCard />
          <AssistantCard />
        </div>
      )}

      {/* 首次欢迎气泡 */}
      <WelcomeBubble />

      {/* 飞行收益层 */}
      {flights.map((f) => (
        <FlyingGain
          key={f.id}
          x={f.x}
          y={f.y}
          amount={f.amount}
          onDone={() => setFlights((list) => list.filter((x) => x.id !== f.id))}
        />
      ))}
    </>
  )
}
