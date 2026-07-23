/**
 * OpenAI 兼容 Chat Completions Provider（fetch + SSE 流式）。
 * 读取 useSettingsStore 中的 baseURL / apiKey / model / temperature。
 */
import { format } from 'date-fns'
import type { NoteSource, ThinkingStep } from '@/types'
import type {
  AIChatMessage,
  AIProvider,
  AskOptions,
  AskResult,
  GenerateReportInput,
  StreamOptions,
  StructureOptions,
} from './provider'
import { retrieveNotes } from './mockEngine'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useStatsStore } from '@/store/useStatsStore'

function cfg() {
  return useSettingsStore.getState().ai
}

function recordTokens(input: string, output: string) {
  useStatsStore.getState().addTokenUsage(Math.ceil(input.length / 2), Math.ceil(output.length / 2))
}

/** 调用 chat/completions，stream=true，逐 token 回调，返回完整文本 */
async function callChat(messages: AIChatMessage[], opts?: StreamOptions): Promise<string> {
  const { baseURL, apiKey, model, temperature } = cfg()
  if (!apiKey.trim()) throw new Error('请先在「设置 → AI 供应商」中填写 API Key')

  const res = await fetch(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, temperature, messages, stream: true }),
    signal: opts?.signal,
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI 请求失败（${res.status}）：${text.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta: string = json.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          opts?.onToken?.(delta, full)
        }
      } catch {
        // 忽略不完整的 SSE 片段
      }
    }
  }
  recordTokens(messages.map((m) => m.content).join('\n'), full)
  return full
}

class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const

  chat(messages: AIChatMessage[], opts?: StreamOptions): Promise<string> {
    return callChat(messages, opts)
  }

  structure(raw: string, opts?: StructureOptions): Promise<string> {
    const today = format(new Date(), 'yyyy年M月d日')
    const isMemo = opts?.target === 'memo'
    const systemPrompt = isMemo
        ? `你是「FishNote」的整理助手。今天是${today}。把用户的碎碎念整理成一篇自然的随手记。\n` +
          '随手记风格要求：\n' +
          '- 像随手写在便签上的个人笔记，语气轻松自然，保留用户的口语化表达和情绪\n' +
          '- 用 # 标题概括核心内容（10字以内）\n' +
          '- 正文用一两段流畅的短文字把要点串起来，不要用无序列表\n' +
          '- 如果用户提到时间/地点/人物，保留这些细节\n' +
          '- 末尾附 1-3 个 #标签\n' +
          '只输出 Markdown，不要解释。'
        : `你是「FishNote」的整理助手。今天是${today}。把用户的碎碎念整理成结构化 Markdown 日报。\n` +
          '日报格式要求：\n' +
          `- 标题：## ${format(new Date(), 'M月d日')} · 日报（不要编造序号）\n` +
          '- ### ✅ 完成事项（润色为成果导向表述，每条一行无序列表）\n' +
          '- ### ⚠️ 问题记录（阻塞、风险、待确认事项，没有则写"暂无"）\n' +
          '- ### 📌 明日计划（未完成或待推进的事项，没有则写"暂无"）\n' +
          '- 末尾附 2-4 个 #标签\n' +
          '只输出 Markdown，不要解释。'
    return callChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: raw },
      ],
      opts,
    )
  }

  complete(context: string, opts?: StreamOptions): Promise<string> {
    return callChat(
      [
        {
          role: 'system',
          content: '你是写作助手，根据用户笔记的上文自然续写 1-3 句话，保持原文语言与风格，只输出续写内容。',
        },
        { role: 'user', content: context.slice(-2000) },
      ],
      opts,
    )
  }

  summarize(markdown: string, opts?: StreamOptions): Promise<string> {
    return callChat(
      [
        { role: 'system', content: '用一两句话总结这篇笔记的核心内容，中文输出，不要前缀。' },
        { role: 'user', content: markdown.slice(0, 4000) },
      ],
      opts,
    )
  }

  async extractTodos(markdown: string): Promise<string[]> {
    const out = await callChat([
      {
        role: 'system',
        content: '从笔记中提取所有待办事项，每行一条，只输出待办列表，不要编号不要解释。',
      },
      { role: 'user', content: markdown.slice(0, 4000) },
    ])
    return out
      .split('\n')
      .map((l) => l.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean)
  }

  generateReport(input: GenerateReportInput, opts?: StreamOptions): Promise<string> {
    const typeLabel = input.type === 'daily' ? '日报' : input.type === 'weekly' ? '周报' : '月报'
    const material = input.notes
      .map((n) => `【${n.title}】\n${n.contentMarkdown}`)
      .join('\n\n---\n\n')
      .slice(0, 8000)
    return callChat(
      [
        {
          role: 'system',
          content:
            `你是「FishNote」的报告助手。根据用户提供的便签素材，聚合生成一篇结构清晰的${typeLabel}（Markdown）。` +
            '包含：概览数据、完成事项、问题与风险、后续计划。只输出 Markdown。',
        },
        { role: 'user', content: `日期范围：${input.dateRange.start} ~ ${input.dateRange.end}\n\n${material}` },
      ],
      opts,
    )
  }

  async ask(question: string, opts?: AskOptions): Promise<AskResult> {
    const hits = retrieveNotes(question, 4)
    const steps: ThinkingStep[] = []
    const push = (label: string, detail: string, durationMs: number) => {
      steps.push({ id: `step-${steps.length}`, label, detail, durationMs })
      opts?.onThinking?.([...steps])
    }
    push('解析问题意图', '提取问题关键词', 0)
    push('检索相关便签', `本地检索匹配到 ${hits.length} 篇相关内容`, 0)
    const context = hits.map((h) => `【${h.note.title}】\n${h.note.contentMarkdown.slice(0, 600)}`).join('\n\n')
    push('组织回答', '结合检索内容调用 AI 生成回答', 0)

    const answer = await callChat(
      [
        {
          role: 'system',
          content:
            '你是「FishNote」的回忆书助手。基于提供的用户便签内容回答问题，' +
            '回答中用【便签标题】标注引用来源；若便签内容与问题无关，如实说明没有找到。中文回答。',
        },
        { role: 'user', content: `问题：${question}\n\n相关便签：\n${context || '（无匹配便签）'}` },
      ],
      opts,
    )
    const sources: NoteSource[] = hits.map((h) => ({ noteId: h.note.id, title: h.note.title, excerpt: h.excerpt }))
    return { answer, sources, thinkingSteps: steps }
  }
}

export const openaiProvider = new OpenAIProvider()
