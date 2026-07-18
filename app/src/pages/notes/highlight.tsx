/**
 * Markdown 源码轻量语法高亮（notes.md §3.3 左：源码编辑器）
 * 仅用于编辑器覆盖层渲染，逐行产出 ReactNode，保证与 textarea 布局逐字对齐。
 */
import type { ReactNode } from 'react'

/** 行内 token：`code` **bold** *italic* ~~del~~ #tag [text](url) */
const INLINE_RE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(~~[^~\n]+~~)|(#[\p{L}\p{N}_/-]+)|(\[[^\]\n]*\]\([^)\n]*\))/gu

function inlineNodes(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0
    if (idx > last) nodes.push(text.slice(last, idx))
    const [raw, code, bold, italic, del, tag, link] = m
    const key = `${keyPrefix}-i${i++}`
    if (code) {
      nodes.push(
        <span key={key} className="rounded bg-brand-50 px-0.5 text-brand-700">
          {raw}
        </span>,
      )
    } else if (bold) {
      nodes.push(
        <span key={key} className="font-bold text-ink-900">
          {raw}
        </span>,
      )
    } else if (italic) {
      nodes.push(
        <span key={key} className="italic text-ink-700">
          {raw}
        </span>,
      )
    } else if (del) {
      nodes.push(
        <span key={key} className="text-ink-400 line-through">
          {raw}
        </span>,
      )
    } else if (tag) {
      nodes.push(
        <span key={key} className="text-ai-500">
          {raw}
        </span>,
      )
    } else if (link) {
      nodes.push(
        <span key={key} className="text-blue underline decoration-blue/40">
          {raw}
        </span>,
      )
    }
    last = idx + raw.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** 渲染单行：返回带语法色的 ReactNode（不含换行符） */
export function highlightLine(line: string, lineIdx: number): ReactNode {
  const k = `L${lineIdx}`

  // 标题：# 墨绿加粗
  const heading = line.match(/^(#{1,6})(\s+.*)?$/)
  if (heading) {
    return (
      <span key={k} className="font-bold text-brand-700">
        <span className="text-brand-400">{heading[1]}</span>
        {heading[2] ?? ''}
      </span>
    )
  }

  // 围栏代码块行：整行绿字
  if (/^\s*```/.test(line)) {
    return (
      <span key={k} className="text-brand-600">
        {line}
      </span>
    )
  }

  // 分割线
  if (/^\s*(-{3,}|\*{3,})$/.test(line)) {
    return (
      <span key={k} className="text-ink-300">
        {line}
      </span>
    )
  }

  // 引用：灰绿
  const quote = line.match(/^(\s*>\s?)(.*)$/)
  if (quote) {
    return (
      <span key={k}>
        <span className="font-bold text-brand-400">{quote[1]}</span>
        <span className="text-ink-500">{inlineNodes(quote[2], k)}</span>
      </span>
    )
  }

  // 待办：- [ ] 方括号琥珀色
  const todo = line.match(/^(\s*[-*+]\s+)(\[(?: |x|X)\])(\s*)(.*)$/)
  if (todo) {
    return (
      <span key={k}>
        <span className="text-ink-400">{todo[1]}</span>
        <span className="font-bold text-amber">{todo[2]}</span>
        {todo[3]}
        {inlineNodes(todo[4], k)}
      </span>
    )
  }

  // 有序/无序列表 marker 灰
  const list = line.match(/^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/)
  if (list) {
    return (
      <span key={k}>
        <span className="text-ink-400">{list[1]}</span>
        {inlineNodes(list[2], k)}
      </span>
    )
  }

  return <span key={k}>{inlineNodes(line, k)}</span>
}
