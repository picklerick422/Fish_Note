/**
 * 编辑器工具栏（notes.md §3.2）：Markdown 分组按钮 + AI 补全开关 + AI 操作下拉 +
 * 视图模式切换 + 专注模式。
 */
import type { LucideIcon } from 'lucide-react'
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Languages,
  Link,
  List,
  ListChecks,
  ListTodo,
  Maximize2,
  MessageCircleQuestion,
  Minimize2,
  Minus,
  PenLine,
  Quote,
  Sparkles,
  SquareCode,
  Strikethrough,
  Table,
  Tags,
  Wand2,
} from 'lucide-react'
import SegmentedControl from '@/components/shared/SegmentedControl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ToolbarOp } from './markdownOps'

export type ViewMode = 'edit' | 'split' | 'preview'

export type AIAction =
  | 'structure'
  | 'continue'
  | 'polish'
  | 'summarize'
  | 'todos'
  | 'titletags'
  | 'translate'
  | 'ask'

export const AI_ACTIONS: Array<{ action: AIAction; label: string; desc: string; icon: LucideIcon }> = [
  { action: 'structure', label: '整理为结构化便签', desc: '碎碎念 → 完成事项/问题/计划三段式', icon: Wand2 },
  { action: 'continue', label: '续写', desc: '从光标处接着写', icon: PenLine },
  { action: 'polish', label: '润色', desc: '语句更通顺，保留原意', icon: Sparkles },
  { action: 'summarize', label: '总结要点', desc: '生成要点插在文末', icon: ListChecks },
  { action: 'todos', label: '提取待办', desc: '生成任务清单', icon: CheckSquare },
  { action: 'titletags', label: '生成标题与标签', desc: '填入标题区与标签行', icon: Tags },
  { action: 'translate', label: '翻译为英文', desc: '全文翻译', icon: Languages },
]

const GROUP1: Array<{ op: ToolbarOp; icon: LucideIcon; label: string; kbd?: string }> = [
  { op: 'bold', icon: Bold, label: '加粗', kbd: '⌘B' },
  { op: 'italic', icon: Italic, label: '斜体', kbd: '⌘I' },
  { op: 'strike', icon: Strikethrough, label: '删除线' },
  { op: 'h1', icon: Heading1, label: '标题 1' },
  { op: 'h2', icon: Heading2, label: '标题 2' },
  { op: 'h3', icon: Heading3, label: '标题 3' },
]

const GROUP2: Array<{ op: ToolbarOp; icon: LucideIcon; label: string }> = [
  { op: 'list', icon: List, label: '无序列表' },
  { op: 'todo', icon: ListTodo, label: '待办列表' },
  { op: 'quote', icon: Quote, label: '引用' },
  { op: 'code', icon: Code, label: '行内代码' },
  { op: 'codeblock', icon: SquareCode, label: '代码块' },
  { op: 'link', icon: Link, label: '链接' },
  { op: 'table', icon: Table, label: '表格' },
  { op: 'hr', icon: Minus, label: '分割线' },
]

interface ToolbarProps {
  onOp: (op: ToolbarOp) => void
  aiEnabled: boolean
  onAiEnabledChange: (v: boolean) => void
  aiReady: boolean
  aiBusy: boolean
  onAIAction: (a: AIAction) => void
  viewMode: ViewMode
  onViewModeChange: (m: ViewMode) => void
  focusMode: boolean
  onToggleFocus: () => void
}

export default function Toolbar({
  onOp,
  aiEnabled,
  onAiEnabledChange,
  aiReady,
  aiBusy,
  onAIAction,
  viewMode,
  onViewModeChange,
  focusMode,
  onToggleFocus,
}: ToolbarProps) {
  const renderBtn = (icon: LucideIcon, label: string, onClick: () => void, kbd?: string, active?: boolean) => {
    const Icon = icon
    return (
      <Tooltip key={label}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-r-sm text-ink-500 transition-colors duration-150 hover:bg-subtle hover:text-ink-900',
              active && 'bg-subtle text-ink-900',
            )}
          >
            <Icon size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-1.5 text-[12px]">
          {label}
          {kbd && <span className="font-mono text-[10px] opacity-70">{kbd}</span>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-11 shrink-0 items-center border-b border-line">
        {/* 左：可横向滚动的按钮组 */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GROUP1.map((g) => renderBtn(g.icon, g.label, () => onOp(g.op), g.kbd))}
          <span className="mx-1.5 h-5 w-px shrink-0 bg-line" />
          {GROUP2.map((g) => renderBtn(g.icon, g.label, () => onOp(g.op)))}

          {/* AI 区 */}
          <span className="mx-3 h-5 w-px shrink-0 bg-line" />
        <Tooltip>
          <TooltipTrigger asChild>
            <label
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-r-sm px-2 text-[13px]',
                aiReady ? 'text-ai-500' : 'cursor-not-allowed text-ink-300',
              )}
            >
              <Sparkles size={14} />
              <span className="hidden whitespace-nowrap 2xl:inline">AI 补全</span>
              <Switch
                checked={aiEnabled && aiReady}
                disabled={!aiReady}
                onCheckedChange={onAiEnabledChange}
                className="scale-[0.8] data-[state=checked]:bg-ai-500"
              />
            </label>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[12px]">
            {aiReady ? '输入停顿时由 AI 接着补全（Tab 接受）' : '未配置 AI：前往 设置 → AI 供应商'}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild disabled={!aiReady || aiBusy}>
                <button
                  type="button"
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-r-sm px-2 text-[13px] font-medium transition-colors',
                    aiReady ? 'text-ai-500 hover:bg-ai-50' : 'cursor-not-allowed text-ink-300',
                  )}
                >
                  <Sparkles size={14} />
                  AI 操作
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[12px]">
              {aiReady ? '对选中文字生效，无选中则对全文' : '未配置 AI：前往 设置 → AI 供应商'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-[280px] rounded-r-md border-ai-100 shadow-ai">
            {AI_ACTIONS.map((a) => (
              <DropdownMenuItem
                key={a.action}
                onClick={() => onAIAction(a.action)}
                className="flex items-start gap-2.5 rounded-r-sm px-2.5 py-2 focus:bg-ai-50"
              >
                <a.icon size={15} className="mt-0.5 shrink-0 text-ai-500" />
                <span>
                  <span className="block text-[13px] font-medium text-ink-900">{a.label}</span>
                  <span className="block text-[12px] text-ink-400">{a.desc}</span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAIAction('ask')}
              className="flex items-start gap-2.5 rounded-r-sm px-2.5 py-2 focus:bg-ai-50"
            >
              <MessageCircleQuestion size={15} className="mt-0.5 shrink-0 text-ai-500" />
              <span>
                <span className="block text-[13px] font-medium text-ink-900">自由提问</span>
                <span className="block text-[12px] text-ink-400">以当前便签为上下文向 AI 提问</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {/* 右端：视图模式 + 专注（固定不滚动，保证常显） */}
        <div className="flex shrink-0 items-center gap-2 border-l border-line px-3">
          <SegmentedControl
            size="sm"
            className="shrink-0 [&_button]:whitespace-nowrap"
            options={[
              { value: 'edit', label: '编辑' },
              { value: 'split', label: '分栏' },
              { value: 'preview', label: '预览' },
            ]}
            value={viewMode}
            onChange={(v) => onViewModeChange(v as ViewMode)}
          />
          {renderBtn(
            focusMode ? Minimize2 : Maximize2,
            focusMode ? '退出专注模式' : '专注模式',
            onToggleFocus,
            '⌘⇧P',
            focusMode,
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
