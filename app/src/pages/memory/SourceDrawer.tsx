import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { ExternalLink, X } from 'lucide-react'
import MarkdownRenderer from '@/components/shared/MarkdownRenderer'
import Tag from '@/components/shared/Tag'
import { Button } from '@/components/ui/button'
import { useNoteById } from '@/store/useNotesStore'
import { wordCount } from '@/lib/date'

interface SourceDrawerProps {
  /** 打开中的便签 id；null = 关闭 */
  noteId: string | null
  onClose: () => void
}

/** 引用溯源 Drawer：右侧滑出 420px，展示便签完整渲染内容（design.md §7 弹层） */
export default function SourceDrawer({ noteId, onClose }: SourceDrawerProps) {
  const navigate = useNavigate()
  const note = useNoteById(noteId ?? undefined)

  // Esc 关闭
  useEffect(() => {
    if (!noteId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [noteId, onClose])

  return createPortal(
    <AnimatePresence>
      {noteId && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-[rgba(23,26,23,.32)]"
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-[80] flex w-[420px] max-w-[92vw] flex-col border-l border-line bg-surface shadow-pop"
            role="dialog"
            aria-label="便签溯源"
          >
            {note ? (
              <>
                {/* 头部 */}
                <div className="border-b border-line px-5 pb-4 pt-5">
                  <div className="flex items-center gap-2">
                    <Tag type={note.kind} />
                    <span className="text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
                      {format(new Date(note.createdAt), 'yyyy年M月d日')} · {wordCount(note.contentMarkdown)} 字
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="关闭"
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-r-sm text-ink-400 transition-colors duration-150 hover:bg-subtle hover:text-ink-900"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <h2 className="mt-2.5 text-[18px] font-bold leading-[26px] text-ink-900">{note.title}</h2>
                  <Button
                    className="mt-3 h-9 rounded-r-sm"
                    onClick={() => {
                      onClose()
                      navigate(`/notes?open=${note.id}`)
                    }}
                  >
                    <ExternalLink size={15} />
                    在编辑器中打开
                  </Button>
                </div>
                {/* 完整内容 */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <MarkdownRenderer>{note.contentMarkdown}</MarkdownRenderer>
                  {note.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex h-6 items-center rounded-r-pill bg-subtle px-2.5 text-[12px] font-medium text-ink-500"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="text-[14px] font-medium text-ink-500">该便签已被删除或移动</p>
                <Button variant="outline" className="rounded-r-sm" onClick={onClose}>
                  关闭
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
