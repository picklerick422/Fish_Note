/**
 * AI Provider 统一接口。
 * 页面层只依赖本文件 + `getAIProvider()`，不关心底层是模拟引擎还是 OpenAI 兼容 API。
 * 所有方法返回完整文本的 Promise；流式输出通过 opts.onToken 回调逐段推送。
 */
import type { Note, NoteSource, ReportType, ThinkingStep } from '@/types'

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamOptions {
  /** 取消信号（Esc 取消生成等场景） */
  signal?: AbortSignal
  /** 流式回调：chunk 为新增片段，fullText 为累计全文 */
  onToken?: (chunk: string, fullText: string) => void
}

export interface StructureOptions extends StreamOptions {
  /** 整理目标：daily = 结构化日报；memo = 条理清晰的随手记 */
  target?: 'daily' | 'memo'
}

export interface GenerateReportInput {
  type: ReportType
  /** 参与聚合的便签（通常已按日期范围过滤） */
  notes: Note[]
  dateRange: { start: string; end: string }
}

export interface AskOptions extends StreamOptions {
  /** 深度思考步骤回调（回忆书）：步骤逐步追加时触发 */
  onThinking?: (steps: ThinkingStep[]) => void
}

export interface AskResult {
  answer: string
  sources: NoteSource[]
  thinkingSteps: ThinkingStep[]
}

export interface AIProvider {
  readonly name: 'mock' | 'openai'

  /** 自由对话（消息历史完整传入） */
  chat(messages: AIChatMessage[], opts?: StreamOptions): Promise<string>

  /** 碎碎念 → 结构化 Markdown（首页快速记录核心能力） */
  structure(raw: string, opts?: StructureOptions): Promise<string>

  /** 编辑器内 AI 续写补全（根据上文生成后续内容） */
  complete(context: string, opts?: StreamOptions): Promise<string>

  /** 长文摘要 */
  summarize(markdown: string, opts?: StreamOptions): Promise<string>

  /** 从 Markdown 中提取待办事项 */
  extractTodos(markdown: string): Promise<string[]>

  /** 聚合便签生成日报/周报/月报 */
  generateReport(input: GenerateReportInput, opts?: StreamOptions): Promise<string>

  /** 回忆书问答：检索本地便签，生成带引用溯源的回答 */
  ask(question: string, opts?: AskOptions): Promise<AskResult>
}

/** 判断错误是否为用户主动取消 */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
