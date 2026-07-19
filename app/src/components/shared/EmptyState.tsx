import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** /public 下的插画相对路径，如 './empty-notes.svg'（相对路径以兼容壳内 file:// 加载） */
  image?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** 插画宽度，默认 200 */
  imageWidth?: number
}

/** 空状态：插画呼吸浮动 + 文字 stagger 入场（design.md §7） */
export default function EmptyState({ image, title, description, action, className, imageWidth = 200 }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10 text-center', className)}>
      {image && (
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={image} alt="" width={imageWidth} className="animate-float-breathe" />
        </motion.div>
      )}
      <motion.h3
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 text-[16px] font-semibold text-ink-500"
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.16, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1.5 max-w-[320px] text-[12px] leading-[18px] tracking-[0.02em] text-ink-400"
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.24, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4"
        >
          {action}
        </motion.div>
      )}
    </div>
  )
}
