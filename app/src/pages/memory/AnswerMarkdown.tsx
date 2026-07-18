import { useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { format } from 'date-fns'
import { NotebookPen } from 'lucide-react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { NoteSource } from '@/types'
import { useNoteById } from '@/store/useNotesStore'
import { wordCount } from '@/lib/date'

/**
 * 回忆书回答正文渲染：
 * 与共享 MarkdownRenderer 同一套 .markdown-body 排版，但会把正文中出现的
 * 来源便签标题（如 **3月5日日报**）替换为可交互的内联引用 chip ——
 * hover 浮现便签预览卡，点击打开溯源 Drawer。
 */

/** 把来源标题出现的位置改写成 #cite-<noteId> 锚点链接，供自定义 a 渲染器识别 */
function linkifyCitations(text: string, sources: NoteSource[]): string {
  let out = text
  const sorted = [...sources].sort((a, b) => b.title.length - a.title.length)
  const linked = new Set<string>()
  const toLink = (s: NoteSource) => {
    const safe = s.title.replace(/[[\]()]/g, '').trim().slice(0, 40) || '便签'
    return `[${safe}](#cite-${s.noteId})`
  }
  // 第一遍：替换加粗标题（mock 回答的引用格式为 **标题**）
  for (const s of sorted) {
    const bold = `**${s.title}**`
    if (s.title && out.includes(bold)) {
      out = out.split(bold).join(toLink(s))
      linked.add(s.noteId)
    }
  }
  // 第二遍：替换首次出现的裸标题
  for (const s of sorted) {
    if (linked.has(s.noteId) || !s.title) continue
    const idx = out.indexOf(s.title)
    if (idx >= 0) {
      out = out.slice(0, idx) + toLink(s) + out.slice(idx + s.title.length)
    }
  }
  return out
}

interface CitationChipProps {
  noteId: string
  children: ReactNode
  onOpenSource: (noteId: string) => void
}

/** 内联引用 chip：绿点 + 标题胶囊；hover 260px 预览浮卡；点击打开来源 Drawer */
function CitationChip({ noteId, children, onOpenSource }: CitationChipProps) {
  const note = useNoteById(noteId)
  return (
    <HoverCard openDelay={200} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => onOpenSource(noteId)}
          className="mx-0.5 inline-flex translate-y-[-1px] cursor-pointer items-center gap-1 rounded-r-pill bg-brand-50 px-2 py-px align-baseline text-[12px] font-medium leading-[18px] text-brand-700 transition-colors duration-150 hover:bg-brand-100"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          {children}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-[260px] rounded-r-lg border-line bg-surface p-3 shadow-pop"
      >
        {note ? (
          <div>
            <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-[18px] text-ink-900">
              <NotebookPen size={13} className="shrink-0 text-ink-400" />
              <span className="line-clamp-1">{note.title}</span>
            </div>
            <div className="mt-1 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
              {format(new Date(note.createdAt), 'M月d日')} · {wordCount(note.contentMarkdown)} 字
            </div>
            <p className="mt-1.5 line-clamp-3 text-[12px] leading-[18px] text-ink-500">
              {note.contentMarkdown
                .replace(/[#>*`\-|[\]()~]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 90)}
            </p>
            <div className="mt-2 text-[12px] font-medium text-brand-600">点击查看完整便签 →</div>
          </div>
        ) : (
          <p className="text-[12px] leading-[18px] text-ink-400">该便签已被删除或移动</p>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

interface AnswerMarkdownProps {
  text: string
  sources?: NoteSource[]
  onOpenSource: (noteId: string) => void
  className?: string
}

export default function AnswerMarkdown({ text, sources, onOpenSource, className }: AnswerMarkdownProps) {
  const content = useMemo(
    () => (sources && sources.length > 0 ? linkifyCitations(text, sources) : text),
    [text, sources],
  )
  return (
    <div className={className ? `markdown-body ${className}` : 'markdown-body'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('#cite-')) {
              return (
                <CitationChip noteId={href.slice('#cite-'.length)} onOpenSource={onOpenSource}>
                  {children}
                </CitationChip>
              )
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
