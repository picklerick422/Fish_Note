import { createElement } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

/**
 * 全局 Toast（design.md §7 弹层）：顶部居中黑底胶囊。
 * 在 App.tsx 挂载 <Toaster/> 后使用。
 */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  /** AI 完成类：带 ✦ 图标 */
  ai: (message: string) =>
    toast(message, {
      icon: createElement(Sparkles, { size: 16, color: '#A78BFA' }),
    }),
}
