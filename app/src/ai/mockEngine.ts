/**
 * 内置模拟 AI 引擎 —— 基于本地便签数据的规则式智能回复。
 * 所有 AI 功能在 mock 模式下即可完整演示：打字机延迟、结构化整理、回忆书检索问答。
 */
import { format, getISOWeek } from 'date-fns'
import type { Note, NoteSource, ReportType, ThinkingStep } from '@/types'
import type {
  AIChatMessage,
  AIProvider,
  AskOptions,
  AskResult,
  GenerateReportInput,
  StreamOptions,
  StructureOptions,
} from './provider'
import { useNotesStore } from '@/store/useNotesStore'
import { useStatsStore } from '@/store/useStatsStore'
import { parseDailyDigest } from '@/lib/dailyDigest'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

/** 打字机流式输出：默认 28 字/秒（design.md §7 StreamingText） */
async function streamText(full: string, opts: StreamOptions | undefined, cps = 28): Promise<string> {
  const onToken = opts?.onToken
  throwIfAborted(opts?.signal)
  if (!onToken) {
    await sleep(320)
    throwIfAborted(opts?.signal)
    return full
  }
  let acc = ''
  let i = 0
  const stepMs = 1000 / cps
  while (i < full.length) {
    throwIfAborted(opts?.signal)
    const size = 1 + Math.floor(Math.random() * 3)
    const chunk = full.slice(i, i + size)
    acc += chunk
    onToken(chunk, acc)
    i += size
    await sleep(stepMs * size)
  }
  return full
}

function recordTokens(input: string, output: string) {
  useStatsStore.getState().addTokenUsage(Math.ceil(input.length / 2), Math.ceil(output.length / 2))
}

/* ---------------- 碎碎念结构化 ---------------- */

const PLAN_RE = /(明天|明日|下周|周末|待办|计划|别忘了|别忘|记得|准备|要约|约了|需要|索要|跟进|提醒)/
const ISSUE_RE = /(bug|Bug|BUG|问题|坑|报错|错误|失败|阻塞|待确认|待排查|偶发|告警|崩溃|卡顿|超时)/
const FIXED_RE = /(修复|修了|修好|解决|搞定|改完|处理完|排查完|消除)/

const CN_NUM: Record<string, string> = { 一: '1', 二: '2', 两: '2', 俩: '2', 三: '3', 四: '4', 五: '5' }

function splitSentences(raw: string): string[] {
  return raw
    .split(/[\n，。；;！!？?、,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
}

/** 轻量规则润色句子，使其更像日报条目 */
function polish(sentence: string): string {
  let s = sentence.replace(/^(今天|昨日|昨天|刚刚|刚才|早上|下午|晚上|中午|上午)/, '')
  const bugFix = s.match(/(.+?)\s*[bB][uU][gG]\s*修了?(\d+|[一二两俩三四五])/)
  if (bugFix) return `修复 ${CN_NUM[bugFix[2]] ?? bugFix[2]} 个${bugFix[1]}相关 Bug`
  const doneByBa = s.match(/把(.+?)(?:完了|好了|掉了)$/)
  if (doneByBa) return `${doneByBa[1]}完成`
  const learned = s.match(/(?:新)?学了(.+)/)
  if (learned) return `学习${learned[1]}`
  s = s
    .replace(/^(?:明天|明日)?(?:要|需要|得)?和/, '与')
    .replace(/^(?:明天|明日)/, '')
    .replace(/^(?:别忘了|别忘记|记得要?|需要)/, '')
    .replace(/^要/, '')
  return s.replace(/[。！？!?.]+$/, '')
}

const TAG_RULES: Array<[RegExp, string]> = [
  [/接口|联调/, '联调'],
  [/后端|服务端|接口/, '后端'],
  [/前端|React|Vue|页面|组件/, '前端'],
  [/测试|单测|用例/, '测试'],
  [/文档/, '文档'],
  [/bug|Bug|修复|报错/, '调试'],
  [/学习|新学|笔记|读书|书/, '学习'],
  [/需求|产品|评审|站会|周会|工作|实习/, '工作'],
  [/健身|跑步|运动/, '健身'],
  [/生活|吃|咖啡|电影/, '生活'],
]

function extractTags(raw: string): string[] {
  const tags: string[] = []
  for (const [re, tag] of TAG_RULES) {
    if (re.test(raw) && !tags.includes(tag)) tags.push(tag)
    if (tags.length >= 4) break
  }
  return tags.length > 0 ? tags : ['随手记']
}

function nextDailySeq(): number {
  const counters = useStatsStore.getState().counters
  const liveDaily = useNotesStore.getState().notes.filter((n) => n.kind === 'daily' && !n.deletedAt).length
  return counters.daily + liveDaily + 1
}

function buildDailyMarkdown(raw: string): string {
  const sentences = splitSentences(raw)
  const done: string[] = []
  const issues: string[] = []
  const plans: string[] = []
  for (const s of sentences) {
    if (PLAN_RE.test(s)) {
      plans.push(polish(s))
    } else if (ISSUE_RE.test(s) && !FIXED_RE.test(s)) {
      issues.push(polish(s))
    } else {
      done.push(polish(s))
    }
  }
  const seq = nextDailySeq()
  const dateLabel = format(new Date(), 'M月d日')
  const tags = extractTags(raw)
  const list = (arr: string[], empty: string) => (arr.length > 0 ? arr.map((i) => `- ${i}`).join('\n') : `- ${empty}`)
  return `## ${dateLabel} · 日报 #${seq}

### ✅ 完成事项
${list(done, '暂无记录')}

### ⚠️ 问题记录
${list(issues, '暂无阻塞')}

### 📌 明日计划
${list(plans, '暂无计划')}

${tags.map((t) => `#${t}`).join(' ')}`
}

function buildMemoMarkdown(raw: string): string {
  const sentences = splitSentences(raw)
  const title = sentences[0] ? sentences[0].slice(0, 24) : '随手记'
  const tags = extractTags(raw)
  const time = format(new Date(), 'HH:mm')
  const bullets = sentences.map((s) => `- ${polish(s)}`).join('\n')
  return `# ${title}

> 小鱼整理于 ${time} ✦

${bullets}

${tags.map((t) => `#${t}`).join(' ')}`
}

/* ---------------- 回忆书检索 ---------------- */

const STOP_GRAM = /[我你他她它的了和与及或是在有没着呢吗吧啊啊]|什么|哪些|怎么|如何|为什么|有没有/

export interface RetrievedNote {
  note: Note
  score: number
  excerpt: string
}

/** 本地关键词检索：n-gram 重叠打分，供 mock 问答与 openai 构建上下文共用 */
export function retrieveNotes(query: string, limit = 3): RetrievedNote[] {
  const notes = useNotesStore.getState().notes.filter((n) => !n.deletedAt)
  const grams = new Set<string>()
  const clean = query.replace(/[\s,，。？?！!、.:：;；「」『』"'‘’“”()（）]/g, '')
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i + len <= clean.length; i++) {
      const gram = clean.slice(i, i + len)
      if (!STOP_GRAM.test(gram)) grams.add(gram)
    }
  }
  for (const w of query.match(/[a-zA-Z][a-zA-Z0-9+#.]*/g) ?? []) {
    grams.add(w.toLowerCase())
  }
  const scored: RetrievedNote[] = []
  for (const note of notes) {
    const hay = `${note.title}\n${note.contentMarkdown}\n${note.tags.join(' ')}`.toLowerCase()
    let score = 0
    let firstHitLine = ''
    for (const gram of grams) {
      const g = gram.toLowerCase()
      if (!hay.includes(g)) continue
      score += g.length * (note.title.toLowerCase().includes(g) ? 3 : 1)
      if (!firstHitLine) {
        firstHitLine =
          note.contentMarkdown
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.toLowerCase().includes(g) && !l.startsWith('#') && l.length > 4) ?? ''
      }
    }
    if (score > 0) {
      const excerpt =
        firstHitLine.replace(/^[-*>\s[\]x]+/, '').slice(0, 60) ||
        note.contentMarkdown.replace(/[#>*`\-\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
      scored.push({ note, score, excerpt })
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

/* ---------------- 报告聚合 ---------------- */

function aggregateDigests(notes: Note[]) {
  const done: string[] = []
  const issues: string[] = []
  const plans: string[] = []
  for (const note of notes) {
    const d = parseDailyDigest(note.contentMarkdown)
    for (const item of d.done) if (!done.includes(item)) done.push(item)
    for (const item of d.issues) if (!issues.includes(item)) issues.push(item)
    for (const item of d.plans) if (!plans.includes(item)) plans.push(item)
  }
  return { done, issues, plans }
}

function buildReportMarkdown(type: ReportType, notes: Note[], dateRange: { start: string; end: string }): string {
  const { done, issues, plans } = aggregateDigests(notes)
  const list = (arr: string[], empty: string, cap = 8) =>
    arr.length > 0 ? arr.slice(0, cap).map((i) => `- ${i}`).join('\n') : `- ${empty}`
  const noteWord = `${notes.length} 篇便签`

  if (type === 'daily') {
    const label = format(new Date(dateRange.end + 'T00:00:00'), 'M月d日')
    return `## ${label} · 日报

> 由小鱼根据今日 ${noteWord}自动整理生成 ✦

### ✅ 完成事项
${list(done, '暂无记录')}

### ⚠️ 问题记录
${list(issues, '暂无阻塞')}

### 📌 明日计划
${list(plans, '暂无计划')}`
  }

  if (type === 'weekly') {
    return `## 第 ${getISOWeek(new Date())} 周周报

> 覆盖本周 ${noteWord} · 由小鱼汇总生成 ✦

### 本周完成
${list(done, '暂无记录')}

### 关键数据
- 本周完成 ${done.length} 件事项 · 沉淀 ${noteWord}

### 问题与风险
${list(issues, '暂无风险', 4)}

### 下周计划
${list(plans, '暂无计划')}`
  }

  const monthLabel = format(new Date(), 'M月')
  return `## ${monthLabel}月报

> 覆盖本月 ${noteWord} · 由小鱼汇总生成 ✦

### 本月概览
- 沉淀 ${noteWord} · 完成 ${done.length} 件事项

### 本月完成
${list(done, '暂无记录')}

### 成长点
- 持续记录形成稳定复盘节奏，碎片想法逐步沉淀为结构化知识

### 待改进
${list(issues.slice(0, 3), '暂无，保持节奏即可')}`
}

/* ---------------- Mock Provider ---------------- */

class MockEngine implements AIProvider {
  readonly name = 'mock' as const

  async chat(messages: AIChatMessage[], opts?: StreamOptions): Promise<string> {
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    await sleep(500)
    let reply: string
    if (/你好|hi|hello|嗨/i.test(last)) {
      reply = '你好呀，我是小鱼 🌱 你可以把今天的碎碎念丢给我整理成日报，也可以问我「这个月我解决了哪些问题？」我会从你的便签里找答案。'
    } else {
      const hits = retrieveNotes(last, 2)
      if (hits.length > 0 && /便签|笔记|记录|找|查|回忆/.test(last)) {
        reply = `我在你的便签里找到了相关内容：\n\n${hits
          .map((h) => `- **${h.note.title}**：${h.excerpt}`)
          .join('\n')}\n\n想深入了解的话，可以去「回忆书」和我对话，我会展示完整的思考过程和引用。`
      } else {
        reply =
          '我可以帮你：\n\n- 把碎碎念整理成结构化日报（首页快速记录）\n- 汇总日报 / 周报 / 月报（报告中心）\n- 在编辑器里续写补全\n- 回答关于你历史便签的问题（回忆书）\n\n试试对我说：「帮我回忆一下这周做了什么」。'
      }
    }
    const out = await streamText(reply, opts, 32)
    recordTokens(last, out)
    return out
  }

  async structure(raw: string, opts?: StructureOptions): Promise<string> {
    await sleep(1200) // 模拟引擎思考延迟（home.md：1.2s）
    throwIfAborted(opts?.signal)
    const full = opts?.target === 'memo' ? buildMemoMarkdown(raw) : buildDailyMarkdown(raw)
    const out = await streamText(full, opts, 28)
    recordTokens(raw, out)
    return out
  }

  async complete(context: string, opts?: StreamOptions): Promise<string> {
    await sleep(420)
    const tail = context.slice(-300)
    let suggestion: string
    if (/React|useState|useEffect|组件|hook/i.test(tail)) {
      suggestion = '另外要注意，effect 的依赖数组必须保持稳定引用，配合 useMemo 可以避免不必要的重渲染；如果订阅了外部 store，优先使用 useSyncExternalStore。'
    } else if (/Rust|所有权|借用/.test(tail)) {
      suggestion = '可以进一步用生命周期标注把这段借用关系显式化，编译器的报错信息其实已经给出了修复方向。'
    } else if (/接口|联调|后端/.test(tail)) {
      suggestion = '建议把字段约定同步到接口文档，并约前端同学过一次边界 case：空列表、超时重试和幂等键的生成规则。'
    } else {
      suggestion = '回过头看，今天这件事的关键在于先理清了边界条件再动手，下次可以把这个思路固化为 checklist。'
    }
    const out = await streamText(suggestion, opts, 34)
    recordTokens(tail, out)
    return out
  }

  async summarize(markdown: string, opts?: StreamOptions): Promise<string> {
    await sleep(600)
    const plain = markdown.replace(/[#>*`\-|[\]()#]/g, ' ').replace(/\s+/g, ' ').trim()
    const sentences = plain.split(/(?<=[。！？!?.])/).filter((s) => s.trim().length > 4)
    const main = sentences.slice(0, 2).join('').slice(0, 120)
    const reply = `这篇便签主要记录了：${main || plain.slice(0, 80) || '（内容较短）'}`
    const out = await streamText(reply, opts, 30)
    recordTokens(markdown, out)
    return out
  }

  async extractTodos(markdown: string): Promise<string[]> {
    await sleep(300)
    const todos: string[] = []
    for (const line of markdown.split('\n')) {
      const m = line.match(/^\s*[-*]\s+\[ \]\s+(.+)$/)
      if (m) todos.push(m[1].trim())
    }
    for (const plan of parseDailyDigest(markdown).plans) {
      if (!todos.includes(plan)) todos.push(plan)
    }
    recordTokens(markdown, todos.join(''))
    return todos
  }

  async generateReport(input: GenerateReportInput, opts?: StreamOptions): Promise<string> {
    await sleep(900)
    throwIfAborted(opts?.signal)
    const full = buildReportMarkdown(input.type, input.notes, input.dateRange)
    const out = await streamText(full, opts, 28)
    recordTokens(input.notes.map((n) => n.contentMarkdown).join('\n'), out)
    return out
  }

  async ask(question: string, opts?: AskOptions): Promise<AskResult> {
    const signal = opts?.signal
    const started = Date.now()
    const total = useNotesStore.getState().notes.filter((n) => !n.deletedAt).length
    const hits = retrieveNotes(question, 3)
    const keywords = [...new Set(hits.flatMap((h) => h.note.tags))].slice(0, 4)

    const steps: ThinkingStep[] = []
    const pushStep = async (label: string, detail: string, durationMs: number) => {
      throwIfAborted(signal)
      await sleep(durationMs)
      steps.push({ id: `step-${steps.length}`, label, detail, durationMs })
      opts?.onThinking?.([...steps])
    }

    await pushStep('解析问题意图', keywords.length > 0 ? `提取关键词：${keywords.join('、')}` : '按语义提取问题关键词', 420)
    await pushStep('检索相关便签', `在 ${total} 篇便签中匹配到 ${hits.length} 篇相关内容`, 520)
    await pushStep('交叉验证信息', hits.length > 1 ? '按时间线比对多篇内容，确认一致性' : '核对引用内容与问题相关性', 380)
    await pushStep('组织回答', '生成带引用溯源的回答', 300)

    const elapsed = ((Date.now() - started) / 1000).toFixed(1)
    let answer: string
    if (hits.length > 0) {
      const lines = hits.map((h) => {
        const date = format(new Date(h.note.createdAt), 'M月d日')
        return `- 在 **${h.note.title}**（${date}）中记录：${h.excerpt}`
      })
      answer = `根据你的便签，我找到了 ${hits.length} 篇相关内容：\n\n${lines.join('\n')}\n\n（以上内容均由你的历史便签检索得出，耗时 ${elapsed}s）`
    } else {
      answer = `我在你的便签中没有找到与「${question.slice(0, 24)}」直接相关的内容。\n\n可以试试：\n- 换个更具体的关键词，比如技术名词或项目名\n- 先在首页快速记录一些相关内容，之后我就能帮你回忆了`
    }
    const out = await streamText(answer, opts, 28)
    recordTokens(question, out)

    const sources: NoteSource[] = hits.map((h) => ({
      noteId: h.note.id,
      title: h.note.title,
      excerpt: h.excerpt,
    }))
    return { answer: out, sources, thinkingSteps: steps }
  }
}

export const mockEngine = new MockEngine()
