import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteKind } from '@/types'

export type TagType = NoteKind | 'ai'

const TYPE_STYLES: Record<TagType, string> = {
  daily: 'bg-brand-50 text-brand-700',
  weekly: 'bg-blue-soft text-blue',
  monthly: 'bg-ai-50 text-ai-600',
  memo: 'bg-subtle text-ink-500',
  ai: 'text-white',
}

export const TAG_LABELS: Record<TagType, string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
  memo: '随手记',
  ai: 'AI 生成',
}

interface TagProps {
  type?: TagType
  children?: ReactNode
  className?: string
}

/** 胶囊标签（design.md §7 Tag/Chip）：日报绿 / 周报蓝 / 月报紫 / 随手记灰 / AI 渐变 */
export default function Tag({ type = 'memo', children, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-r-pill px-2.5 text-[12px] font-medium leading-none',
        TYPE_STYLES[type],
        className,
      )}
      style={type === 'ai' ? { backgroundImage: 'var(--ai-gradient)' } : undefined}
    >
      {type === 'ai' && <Sparkles size={11} strokeWidth={2.2} />}
      {children ?? TAG_LABELS[type]}
    </span>
  )
}
