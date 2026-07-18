/**
 * 回收站列表（notes.md §各状态设计）：软删除便签，显示删除时间与原分类 chip，
 * 支持恢复 / 彻底删除（二次确认 Modal）。
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Trash2 } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
import Tag from '@/components/shared/Tag'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { relTime } from '@/lib/date'
import { notify } from '@/lib/toast'
import { useNotesStore } from '@/store/useNotesStore'
import type { Note } from '@/types'
import { plainExcerpt } from './constants'

interface TrashListProps {
  notes: Note[]
}

export default function TrashList({ notes }: TrashListProps) {
  const restoreNote = useNotesStore((s) => s.restoreNote)
  const destroyNote = useNotesStore((s) => s.destroyNote)
  const [pendingDestroy, setPendingDestroy] = useState<Note | null>(null)

  if (notes.length === 0) {
    return (
      <EmptyState
        image="/empty-notes.svg"
        imageWidth={160}
        title="回收站是空的"
        description="删除的便签会在这里保留 30 天"
        className="py-16"
      />
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {notes.map((note, i) => (
        <motion.div
          key={note.id}
          layout="position"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
          transition={{ delay: i * 0.04, duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-r-md border border-line bg-surface p-3"
        >
          <div className="flex items-center gap-1.5">
            <Tag type={note.kind} className="h-5 px-2 text-[11px]" />
            <span className="text-[11px] text-ink-300">删除于 {note.deletedAt ? relTime(note.deletedAt) : '—'}</span>
          </div>
          <div className="mt-1.5 truncate text-[14px] font-semibold leading-5 text-ink-500 line-through decoration-ink-300/60">
            {note.title}
          </div>
          <div className="mt-1 line-clamp-1 text-[12px] leading-[18px] text-ink-400">
            {plainExcerpt(note.contentMarkdown, 60)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                restoreNote(note.id)
                notify.success(`已恢复「${note.title}」`)
              }}
              className="flex h-7 items-center gap-1 rounded-r-sm px-2 text-[12px] font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              <RotateCcw size={12} />
              恢复
            </button>
            <button
              type="button"
              onClick={() => setPendingDestroy(note)}
              className="flex h-7 items-center gap-1 rounded-r-sm px-2 text-[12px] text-red transition-colors hover:bg-red-soft"
            >
              <Trash2 size={12} />
              彻底删除
            </button>
          </div>
        </motion.div>
      ))}

      {/* 彻底删除二次确认 */}
      <AlertDialog open={pendingDestroy !== null} onOpenChange={(open) => !open && setPendingDestroy(null)}>
        <AlertDialogContent className="rounded-r-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>彻底删除这条便签？</AlertDialogTitle>
            <AlertDialogDescription>
              「{pendingDestroy?.title}」将被永久删除，彻底删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-r-sm">取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-r-sm bg-red text-white hover:bg-red/90"
              onClick={() => {
                if (pendingDestroy) {
                  destroyNote(pendingDestroy.id)
                  notify.success('已彻底删除')
                }
                setPendingDestroy(null)
              }}
            >
              彻底删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
