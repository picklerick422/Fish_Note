/**
 * 工具栏 Markdown 操作：基于 textarea 选区的文本变换。
 * 每个操作返回新的 { value, selStart, selEnd }，由调用方写回并恢复选区。
 */

export interface EditResult {
  value: string
  selStart: number
  selEnd: number
}

interface Slice {
  value: string
  start: number
  end: number
}

/** 行内包裹：**bold**、*italic*、~~del~~、`code`；已包裹则切换去除 */
function wrap(sel: Slice, mark: string): EditResult {
  const { value, start, end } = sel
  const selected = value.slice(start, end)
  const before = value.slice(Math.max(0, start - mark.length), start)
  const after = value.slice(end, end + mark.length)
  // 已被同一标记包裹 → 取消
  if (before === mark && after === mark) {
    const v = value.slice(0, start - mark.length) + selected + value.slice(end + mark.length)
    return { value: v, selStart: start - mark.length, selEnd: end - mark.length }
  }
  const v = value.slice(0, start) + mark + selected + mark + value.slice(end)
  return { value: v, selStart: start + mark.length, selEnd: end + mark.length }
}

/** 行首前缀：# 、- 、> 等，作用于选区覆盖的所有行；全部已有则去除 */
function linePrefix(sel: Slice, prefix: string): EditResult {
  const { value, start, end } = sel
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEndIdx = value.indexOf('\n', end)
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const allHave = lines.every((l) => l.startsWith(prefix) || l.trim() === '')
  const next = lines
    .map((l) => {
      if (l.trim() === '') return l
      return allHave ? l.slice(prefix.length) : prefix + l
    })
    .join('\n')
  const v = value.slice(0, lineStart) + next + value.slice(lineEnd)
  const delta = next.length - block.length
  return { value: v, selStart: lineStart, selEnd: lineEnd + delta }
}

/** 在光标处插入片段；placeholder 会被选中便于替换 */
function insertSnippet(sel: Slice, snippet: string, placeholder?: string): EditResult {
  const { value, start, end } = sel
  const v = value.slice(0, start) + snippet + value.slice(end)
  if (placeholder) {
    const at = v.indexOf(placeholder, start)
    if (at !== -1) return { value: v, selStart: at, selEnd: at + placeholder.length }
  }
  const caret = start + snippet.length
  return { value: v, selStart: caret, selEnd: caret }
}

export type ToolbarOp =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'list'
  | 'todo'
  | 'quote'
  | 'code'
  | 'codeblock'
  | 'link'
  | 'table'
  | 'hr'

export function applyOp(sel: Slice, op: ToolbarOp): EditResult {
  switch (op) {
    case 'bold':
      return wrap(sel, '**')
    case 'italic':
      return wrap(sel, '*')
    case 'strike':
      return wrap(sel, '~~')
    case 'code':
      return wrap(sel, '`')
    case 'h1':
      return linePrefix(sel, '# ')
    case 'h2':
      return linePrefix(sel, '## ')
    case 'h3':
      return linePrefix(sel, '### ')
    case 'list':
      return linePrefix(sel, '- ')
    case 'todo':
      return linePrefix(sel, '- [ ] ')
    case 'quote':
      return linePrefix(sel, '> ')
    case 'codeblock': {
      const selected = sel.value.slice(sel.start, sel.end) || '代码'
      return insertSnippet(sel, `\n\`\`\`js\n${selected}\n\`\`\`\n`)
    }
    case 'link': {
      const selected = sel.value.slice(sel.start, sel.end) || '链接文字'
      const v = sel.value.slice(0, sel.start) + `[${selected}](https://)` + sel.value.slice(sel.end)
      const urlAt = sel.start + selected.length + 3
      return { value: v, selStart: urlAt, selEnd: urlAt + 8 }
    }
    case 'table':
      return insertSnippet(
        sel,
        '\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n',
      )
    case 'hr':
      return insertSnippet(sel, '\n\n---\n\n')
  }
}
