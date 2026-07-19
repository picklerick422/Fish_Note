import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import StreamingText from '@/components/shared/StreamingText'
import { useSettingsStore } from '@/store/useSettingsStore'

const WELCOME_TEXT =
  '你好呀，我是小鱼 🐟 在上方写下今天的碎碎念，我会帮你整理成整齐的日报。记录得越多，我能帮你回忆的就越多。'

/** 首次进入欢迎层：小鱼气泡（打字机 18 字/秒，8s 自动缩回） */
export default function WelcomeBubble() {
  const welcomed = useSettingsStore((s) => s.welcomed)
  const setWelcomed = useSettingsStore((s) => s.setWelcomed)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (welcomed) return
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [welcomed])

  const close = () => {
    setVisible(false)
    setWelcomed(true)
  }

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(close, 8000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (welcomed) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          className="fixed bottom-6 right-6 z-50 flex items-end gap-3"
          style={{ transformOrigin: 'bottom right' }}
        >
          <img src="./mascot-fish.svg" alt="小鱼" className="h-16 w-16 shrink-0 animate-float-breathe" />
          <div className="relative max-w-[300px] rounded-r-lg border border-line bg-surface p-4 shadow-pop">
            <button
              type="button"
              aria-label="关闭欢迎提示"
              onClick={close}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-subtle hover:text-ink-700"
            >
              <X size={12} />
            </button>
            <p className="pr-4 text-[13px] leading-[21px] text-ink-700">
              <StreamingText text={WELCOME_TEXT} speed={18} />
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
