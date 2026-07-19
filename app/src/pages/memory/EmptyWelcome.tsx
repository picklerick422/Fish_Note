import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { Bug, CalendarDays, GraduationCap, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TITLE = '翻开你的回忆书'

const SUGGESTIONS = [
  { icon: TrendingUp, iconClass: 'bg-ai-50 text-ai-500', text: '最近两周我主要在忙什么？' },
  { icon: Bug, iconClass: 'bg-brand-50 text-brand-600', text: '我上次处理分页 bug 是怎么修的？' },
  { icon: CalendarDays, iconClass: 'bg-blue-soft text-blue', text: '我三月份都解决了哪些棘手的问题？' },
  { icon: GraduationCap, iconClass: 'bg-amber-soft text-amber', text: '这个月我学到了哪些新东西？' },
]

interface EmptyWelcomeProps {
  /** 便签总量（示例量级：基线 + 实际） */
  totalNotes: number
  /** 实际存活便签数；为 0 时展示「先去记录」引导 */
  liveNotes: number
  /** 点击建议问题卡：打字入输入框并自动发送 */
  onPick: (question: string) => void
}

/** 回忆书初始空态（memory.md §2.1）：插画 + 词级 stagger 标题 + 2×2 建议问题卡 */
export default function EmptyWelcome({ totalNotes, liveNotes, onPick }: EmptyWelcomeProps) {
  const navigate = useNavigate()

  // 无便签数据态（memory.md 状态与边界）
  if (liveNotes === 0) {
    return (
      <div className="flex flex-col items-center pt-[10vh] text-center">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src="./empty-notes.svg" alt="" width={240} className="animate-float-breathe" />
        </motion.div>
        <motion.h1
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-[24px] font-bold leading-8 text-ink-900"
        >
          回忆书需要先吃点「料」
        </motion.h1>
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 text-[14px] leading-[22px] text-ink-500"
        >
          先去工作台记录几条便签吧，之后我就能帮你回忆了
        </motion.p>
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.26, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5"
        >
          <Button className="h-9 rounded-r-sm px-4" onClick={() => navigate('/')}>
            去记录
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center pt-[10vh]">
      {/* 插画：y 12→0 入场 + 4s 呼吸浮动 */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src="./empty-memory.svg" alt="" width={240} height={180} className="animate-float-breathe" />
      </motion.div>

      {/* 标题：词级（逐字）stagger 60ms */}
      <h1 className="mt-6 flex text-[24px] font-bold leading-8 text-ink-900" aria-label={TITLE}>
        {TITLE.split('').map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {ch}
          </motion.span>
        ))}
      </h1>
      <motion.p
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-2 text-[14px] leading-[22px] text-ink-500"
      >
        我已经读完了你的 {totalNotes.toLocaleString()} 条便签。问点什么，比如——
      </motion.p>

      {/* 建议问题卡 2×2：stagger 80ms spring；hover 上浮 + shadow-ai */}
      <div className="mt-7 grid w-full max-w-[560px] grid-cols-2 gap-3">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.text}
            type="button"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.56 + i * 0.08, type: 'spring', stiffness: 320, damping: 24 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(s.text)}
            className="flex items-center gap-3 rounded-r-lg border border-line bg-surface p-4 text-left shadow-card transition-shadow duration-200 hover:shadow-ai"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${s.iconClass}`}>
              <s.icon size={18} strokeWidth={2} />
            </span>
            <span className="text-[14px] font-medium leading-[22px] text-ink-700">{s.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
