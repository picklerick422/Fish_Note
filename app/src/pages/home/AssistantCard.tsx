import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import AISparkleButton from '@/components/shared/AISparkleButton'
import MarkdownRenderer from '@/components/shared/MarkdownRenderer'
import StreamingText from '@/components/shared/StreamingText'
import { format, getISOWeek, subDays, subWeeks } from 'date-fns'
import { parseDailyDigest } from '@/lib/dailyDigest'
import { useNotesStore } from '@/store/useNotesStore'
import { useStatsStore } from '@/store/useStatsStore'

const TYPED_KEY = 'sg-assistant-typed'

/** R5 右 · 小鱼 AI 助手卡：动态提醒 + 生成周报 + 跳转回忆书 */
export default function AssistantCard() {
  const navigate = useNavigate()
  const activity = useStatsStore((s) => s.activity)
  const notes = useNotesStore((s) => s.notes)

  const typed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TYPED_KEY) === '1'

  // 本周记录天数（周一至今有记录的天数）
  const weekDays = useMemo(() => {
    const now = new Date()
    const mondayOffset = (now.getDay() + 6) % 7
    let days = 0
    for (let i = 0; i <= mondayOffset; i++) {
      const key = format(subDays(now, mondayOffset - i), 'yyyy-MM-dd')
      if ((activity[key] ?? 0) > 0) days += 1
    }
    return days
  }, [activity])

  // 本周完成事项数（近 7 天日报解析）
  const weekDone = useMemo(() => {
    const weekAgo = subDays(new Date(), 7).getTime()
    let count = 0
    for (const n of notes) {
      if (n.kind !== 'daily' || n.deletedAt) continue
      if (new Date(n.createdAt).getTime() < weekAgo) continue
      count += parseDailyDigest(n.contentMarkdown).done.length
    }
    return count
  }, [notes])

  const lastWeek = getISOWeek(subWeeks(new Date(), 1))
  const body = `本周你已记录 **${weekDays} 天**，完成了 **${weekDone} 件事项**。${
    weekDays < 5 ? `距离上周的产量还差 ${Math.max(1, 7 - weekDays)} 天记录。` : '节奏保持得很好，已经超过上周同期了。'
  } 要点我帮你整理「第 ${lastWeek} 周周报」吗？`

  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.64, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 rounded-r-xl border border-ai-500/10 bg-ai-50 p-6 xl:col-span-4"
    >
      <div className="flex items-center gap-3">
        <img src="./mascot-fish.svg" alt="小鱼" className="h-16 w-16 animate-float-breathe" />
        <h3 className="text-[16px] font-semibold leading-6 text-ink-900">小鱼提醒</h3>
      </div>

      <div className="mt-3 min-h-[78px] text-[14px] leading-[22px] text-ink-700">
        {typed ? (
          <MarkdownRenderer>{body}</MarkdownRenderer>
        ) : (
          <StreamingText
            text={body}
            speed={18}
            markdown
            showCursor={false}
            onDone={() => sessionStorage.setItem(TYPED_KEY, '1')}
          />
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.74, duration: 0.3 }}
        className="mt-4 flex flex-col gap-2"
      >
        <AISparkleButton className="w-full" onClick={() => navigate('/reports?generate=weekly')}>
          生成周报
        </AISparkleButton>
        <button
          type="button"
          onClick={() => navigate('/memory')}
          className="h-9 rounded-r-sm text-[14px] font-medium text-ai-600 transition-colors hover:bg-ai-100"
        >
          和小鱼聊聊
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings#ai')}
          className="self-start text-[12px] tracking-[0.02em] text-ink-400 transition-colors hover:text-ai-600"
        >
          查看 AI 用量 →
        </button>
      </motion.div>
    </motion.section>
  )
}
