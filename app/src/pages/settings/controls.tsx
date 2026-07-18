/**
 * 设置页共享控件（settings.md 通用规范）：
 * SettingCard 白底 r-lg 卡 / SettingRow 表单行 / SgSwitch 40×22 开关 / SgSelect 下拉 / SgModal 弹窗
 */
import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- SettingCard：白底 r-lg 1px border padding 24，标题 h3 + 副 caption ---------- */
export function SettingCard({
  title,
  caption,
  children,
  className,
  danger,
  id,
}: {
  title?: ReactNode
  caption?: ReactNode
  children: ReactNode
  className?: string
  danger?: boolean
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-r-lg border bg-surface p-6 shadow-card',
        danger ? 'border-red bg-red-soft/50' : 'border-line',
        className,
      )}
    >
      {(title || caption) && (
        <header className="mb-4">
          {title && <h3 className="text-[16px] font-semibold leading-6 text-ink-900">{title}</h3>}
          {caption && <p className="mt-1 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{caption}</p>}
        </header>
      )}
      {children}
    </section>
  )
}

/* ---------- SettingRow：标签 + 说明 + 右侧控件 ---------- */
export function SettingRow({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-6 py-3', className)}>
      <div className="min-w-0">
        <div className="text-[14px] font-medium leading-[22px] text-ink-900">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

/* ---------- SgSwitch：宽 40 高 22 r-pill，16px 白球 spring；variant 控制开启色 ---------- */
export function SgSwitch({
  checked,
  onChange,
  variant = 'brand',
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  variant?: 'brand' | 'ai'
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-10 shrink-0 rounded-r-pill transition-colors duration-200',
        checked ? (variant === 'ai' ? 'bg-ai-500' : 'bg-brand-500') : 'bg-line-strong',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cn(
          'absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-card',
          checked ? 'right-[3px]' : 'left-[3px]',
        )}
      />
    </button>
  )
}

/* ---------- SgSelect：r-sm 白底下拉 ---------- */
export function SgSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          'h-[38px] appearance-none rounded-r-sm border border-line-strong bg-surface pl-3 pr-8 text-[13px] text-ink-700 outline-none transition-colors',
          'hover:border-ink-300 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-ink-400" />
    </span>
  )
}

/* ---------- SavedFlash：偏好即改即存后的绿 ✓ 闪现（每次 tick 变化重播） ---------- */
export function SavedFlash({ tick }: { tick: number }) {
  if (tick === 0) return null
  return (
    <motion.span
      key={tick}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 1] }}
      transition={{ duration: 1, times: [0, 0.2, 0.75, 1], ease: 'easeOut' }}
      className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600"
    >
      ✓ 已保存
    </motion.span>
  )
}

/* ---------- SgModal：居中弹窗（遮罩淡入 160ms，面板 spring） ---------- */
export function SgModal({
  open,
  onClose,
  children,
  width = 440,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0"
            style={{ background: 'rgba(23,26,23,.32)' }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.96, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 4, opacity: 0, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full rounded-r-xl border border-line bg-surface p-6 shadow-pop"
            style={{ maxWidth: width }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ---------- 按钮族（与 design.md §7 对齐） ---------- */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-r-sm bg-brand-500 px-4 text-[14px] font-medium text-white',
        'transition-colors duration-150 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-r-sm border border-line-strong bg-surface px-4 text-[14px] font-medium text-ink-700',
        'transition-colors duration-150 hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}

export function GhostButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-r-sm px-3 text-[14px] font-medium text-ink-500',
        'transition-colors duration-150 hover:bg-subtle hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}

export function DangerButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-r-sm px-4 text-[14px] font-medium text-red',
        'transition-colors duration-150 hover:bg-red-soft disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}
