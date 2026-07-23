import { useCallback, useEffect, useRef } from 'react'

// ── 配置 ────────────────────────────────────────────
const REVEAL_DURATION = 1200 // 圆形裁切展开总时长 ms
const RING_COUNT = 6 // 涟漪环层数
const RING_GAP = 28 // 环间距 px
const RIPPLE_COLOR = 'var(--brand-400)' // 涟漪环颜色

/** 环的样式：索引 0 是最外圈（最明显），索引越大越靠内 */
const RING_STYLES = [
  { border: 3, opacity: 0.55 },
  { border: 2.2, opacity: 0.38 },
  { border: 1.8, opacity: 0.28 },
  { border: 1.5, opacity: 0.2 },
  { border: 1.2, opacity: 0.13 },
  { border: 1, opacity: 0.07 },
]

/** 需要内联的 computed style 属性（与 .theme-anim 过渡属性对齐） */
const CAPTURE_PROPS = [
  'background-color',
  'color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'box-shadow',
  'fill',
  'stroke',
  'outline-color',
]

/** 计算从 (x,y) 覆盖全视口所需最大半径 */
function maxDist(x: number, y: number): number {
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(window.innerWidth - x, y),
    Math.hypot(x, window.innerHeight - y),
    Math.hypot(window.innerWidth - x, window.innerHeight - y),
  )
}

/**
 * 深克隆 body 并内联所有元素的 computed color 属性。
 * 这是正确性的关键：CSS 变量冻结只能覆盖 var(--xxx) 引用，
 * 但 Tailwind dark:bg-white/15 这类硬编码颜色必须通过 computed style 捕获。
 */
function cloneWithComputedStyles(): HTMLElement {
  const clone = document.body.cloneNode(true) as HTMLElement

  const srcWalker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
  )
  const dstWalker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT)

  // 根元素（body）
  inlineComputed(document.body, clone)

  // 遍历所有后代
  while (true) {
    const src = srcWalker.nextNode() as HTMLElement | null
    const dst = dstWalker.nextNode() as HTMLElement | null
    if (!src || !dst) break
    inlineComputed(src, dst)
  }

  return clone
}

function inlineComputed(src: HTMLElement, dst: HTMLElement) {
  const cs = window.getComputedStyle(src)
  for (const prop of CAPTURE_PROPS) {
    const val = cs.getPropertyValue(prop)
    // 跳过 transparent / rgba(0,0,0,0) / initial 等空值以减少内联体积
    if (!val || val === 'transparent' || val === 'rgba(0, 0, 0, 0)') continue
    dst.style.setProperty(prop, val)
  }
}

// ── 模块级 API ──────────────────────────────────────
let globalTrigger: ((x: number, y: number, target: 'light' | 'dark') => void) | null = null

export let isRippling = false

export function triggerThemeRipple(x: number, y: number, target: 'light' | 'dark') {
  globalTrigger?.(x, y, target)
}

// ── 组件 ─────────────────────────────────────────────

interface ThemeRippleProps {
  onImmediateSwitch: (target: 'light' | 'dark') => void
}

export default function ThemeRipple({ onImmediateSwitch }: ThemeRippleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cbRef = useRef(onImmediateSwitch)
  cbRef.current = onImmediateSwitch

  const trigger = useCallback((x: number, y: number, target: 'light' | 'dark') => {
    const root = containerRef.current
    if (!root) return

    const curDark = document.documentElement.classList.contains('dark')
    const tgtDark = target === 'dark'
    const sameTheme = curDark === tgtDark

    isRippling = true

    if (sameTheme) {
      animateRingsOnly(root, x, y, () => { isRippling = false })
      return
    }

    // ── 主题改变：克隆（含 computed 内联）+ 切换 + mask 展开 ──
    const sX = window.scrollX
    const sY = window.scrollY
    const vh = window.innerHeight
    const maxR = maxDist(x, y) + 80

    // 1. 深克隆 + 内联 computed 颜色属性（代价 ~50-200ms，仅主题切换时发生一次）
    const clone = cloneWithComputedStyles()

    // 2. 全屏 overlay
    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;'
    overlay.style.maskImage =
      `radial-gradient(circle 0px at ${x}px ${y}px, transparent 0px, transparent 0px, black 2px)`
    overlay.style.webkitMaskImage = overlay.style.maskImage

    clone.style.cssText = [
      `position:absolute;top:${-sY}px;left:${-sX}px;`,
      `width:${document.documentElement.scrollWidth}px;`,
      `min-height:${Math.max(document.documentElement.scrollHeight, vh)}px;`,
    ].join('')
    overlay.appendChild(clone)
    root.appendChild(overlay)

    // 3. 立即切换主题（被 overlay 遮住，用户看不到）
    cbRef.current(target)

    // 4. 涟漪环
    const rings: HTMLDivElement[] = []
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = document.createElement('div')
      const s = RING_STYLES[i]
      Object.assign(ring.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: '0px',
        height: '0px',
        borderRadius: '50%',
        border: `${s.border}px solid ${RIPPLE_COLOR}`,
        opacity: String(s.opacity),
        transform: 'translate(-50%, -50%)',
        zIndex: '2147483647',
        pointerEvents: 'none',
      })
      root.appendChild(ring)
      rings.push(ring)
    }

    // 5. rAF 循环：mask + 涟漪环同步
    const t0 = performance.now()
    function frame(now: number) {
      const elapsed = now - t0
      const p = Math.min(elapsed / REVEAL_DURATION, 1)
      const eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)
      const r = eased * maxR

      // mask 圆形孔洞（硬边界：1px 过渡带）
      overlay.style.maskImage =
        `radial-gradient(circle ${r}px at ${x}px ${y}px, transparent 0px, transparent ${r}px, black ${r + 1}px)`
      overlay.style.webkitMaskImage = overlay.style.maskImage

      // 涟漪环：环0 在 mask 边缘
      for (let i = 0; i < RING_COUNT; i++) {
        const ringR = Math.max(0, r - i * RING_GAP)
        const size = ringR * 2
        rings[i].style.width = `${size}px`
        rings[i].style.height = `${size}px`
      }

      if (p < 1) {
        requestAnimationFrame(frame)
      } else {
        overlay.remove()
        rings.forEach((r) => r.remove())
        isRippling = false
      }
    }
    requestAnimationFrame(frame)
  }, [])

  useEffect(() => {
    globalTrigger = trigger
    return () => { globalTrigger = null }
  }, [trigger])

  return <div ref={containerRef} aria-hidden="true" />
}

// ── 纯涟漪模式（同色切换）───────────────────────────
function animateRingsOnly(
  root: HTMLElement,
  x: number,
  y: number,
  done: () => void,
) {
  const maxR = maxDist(x, y) + 80
  const rings: HTMLDivElement[] = []

  for (let i = 0; i < RING_COUNT; i++) {
    const ring = document.createElement('div')
    const s = RING_STYLES[i]
    Object.assign(ring.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: '0px',
      height: '0px',
      borderRadius: '50%',
      border: `${s.border}px solid ${RIPPLE_COLOR}`,
      opacity: String(s.opacity),
      transform: 'translate(-50%, -50%)',
      zIndex: '2147483647',
      pointerEvents: 'none',
    })
    root.appendChild(ring)
    rings.push(ring)
  }

  const t0 = performance.now()
  function frame(now: number) {
    const elapsed = now - t0
    const p = Math.min(elapsed / REVEAL_DURATION, 1)
    const eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)
    const r = eased * maxR

    for (let i = 0; i < RING_COUNT; i++) {
      const ringR = Math.max(0, r - i * RING_GAP)
      const size = ringR * 2
      rings[i].style.width = `${size}px`
      rings[i].style.height = `${size}px`
    }

    if (p < 1) {
      requestAnimationFrame(frame)
    } else {
      rings.forEach((r) => r.remove())
      done()
    }
  }
  requestAnimationFrame(frame)
}
