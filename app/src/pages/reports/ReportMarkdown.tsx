import { useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { motion } from 'framer-motion'
import { tocId } from './reportUtils'

/**
 * 阅读视图专用 Markdown 渲染（reports.md B 中栏）：
 * - h2/h3 注入锚点 id（与 extractToc 的行号规则一致，供 TOC 跳转与 scroll-spy）
 * - 按空行切分区块，入场时区块 stagger 90ms y 16→0
 */
interface MdBlock {
  /** 块内 markdown 源码 */
  text: string
  /** 块首行在全文中的 0 基行号（锚点 id 偏移） */
  lineOffset: number
}

function splitBlocks(markdown: string): MdBlock[] {
  const lines = markdown.split('\n')
  const blocks: MdBlock[] = []
  let buf: string[] = []
  let start = 0
  let inFence = false
  const flush = (endIndex: number) => {
    const text = buf.join('\n').trim()
    if (text) blocks.push({ text, lineOffset: start })
    buf = []
    start = endIndex + 1
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*```/.test(line)) inFence = !inFence
    if (!inFence && line.trim() === '') {
      flush(i)
      start = i + 1
      continue
    }
    if (buf.length === 0) start = i
    buf.push(line)
  }
  flush(lines.length)
  return blocks
}

/** 每块的自定义渲染器：标题带 id + scroll-margin（避开吸顶栏） */
function makeComponents(lineOffset: number): Components {
  return {
    h2: ({ node, children, ...props }) => (
      <h2 id={tocId(lineOffset + (node?.position?.start.line ?? 0))} style={{ scrollMarginTop: 152 }} {...props}>
        {children}
      </h2>
    ),
    h3: ({ node, children, ...props }) => (
      <h3 id={tocId(lineOffset + (node?.position?.start.line ?? 0))} style={{ scrollMarginTop: 152 }} {...props}>
        {children}
      </h3>
    ),
  }
}

export default function ReportMarkdown({ markdown, stagger = true }: { markdown: string; stagger?: boolean }) {
  const blocks = useMemo(() => splitBlocks(markdown), [markdown])
  return (
    <div>
      {blocks.map((block, i) => (
        <motion.div
          key={`${block.lineOffset}-${block.text.length}`}
          initial={stagger ? { y: 16, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: Math.min(i, 6) * 0.09, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className={i > 0 ? 'markdown-body mt-4' : 'markdown-body'}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={makeComponents(block.lineOffset)}>
            {block.text}
          </ReactMarkdown>
        </motion.div>
      ))}
    </div>
  )
}
