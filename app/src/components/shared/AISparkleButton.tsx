import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AISparkleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  /** 左侧 ✦ 图标，默认显示 */
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * AI 渐变主按钮（design.md §7）：紫藤渐变 + ✦ + hover 渐变流动 + shadow-ai；
 * loading 时渐变高光从左到右循环 1.2s。
 */
const AISparkleButton = forwardRef<HTMLButtonElement, AISparkleButtonProps>(function AISparkleButton(
  { loading = false, showIcon = true, size = 'md', className, children, disabled, onMouseEnter, onMouseLeave, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-r-sm font-medium text-white',
        'transition-shadow duration-200 hover:shadow-ai',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai-500',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : size === 'md' ? 'h-9 px-4 text-[14px]' : 'h-[38px] px-5 text-[14px]',
        className,
      )}
      style={{
        backgroundImage: 'var(--ai-gradient)',
        backgroundSize: '180% 180%',
        backgroundPosition: '0% 0%',
        transition: 'background-position .3s ease',
      }}
      onMouseEnter={(e) => {
        if (!loading) (e.currentTarget as HTMLElement).style.backgroundPosition = '100% 100%'
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (!loading) (e.currentTarget as HTMLElement).style.backgroundPosition = '0% 0%'
        onMouseLeave?.(e)
      }}
      {...(props as object)}
    >
      {loading && (
        <span
          className="pointer-events-none absolute inset-0 animate-ai-shine"
          style={{
            backgroundImage:
              'linear-gradient(100deg, transparent 30%, rgba(255,255,255,.45) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
      {showIcon && <Sparkles size={16} className={loading ? 'animate-pulse' : undefined} />}
      <span className="relative">{children}</span>
    </motion.button>
  )
})

export default AISparkleButton
