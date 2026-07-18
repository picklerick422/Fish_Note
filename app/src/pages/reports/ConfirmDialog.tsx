import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 危险操作（删除）：红色确认按钮 */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 二次确认弹窗（reports.md 状态与边界）：居中 r-xl shadow-pop spring 入场 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          style={{ background: 'rgba(23,26,23,.32)' }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ scale: 0.96, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-[400px] rounded-r-xl border border-line bg-surface p-5 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  danger ? 'bg-red-soft text-red' : 'bg-amber-soft text-amber'
                }`}
              >
                <AlertTriangle size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold leading-6 text-ink-900">{title}</h3>
                {description && <p className="mt-1 text-[13px] leading-5 text-ink-500">{description}</p>}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="h-9 rounded-r-sm px-4 text-[14px] font-medium text-ink-500 transition-colors duration-150 hover:bg-subtle"
              >
                {cancelLabel}
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                className={`h-9 rounded-r-sm px-4 text-[14px] font-medium text-white transition-colors duration-150 ${
                  danger ? 'bg-red hover:bg-red/90' : 'bg-brand-500 hover:bg-brand-600'
                }`}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
