import { motion } from 'framer-motion'
import Kbd from '@/components/shared/Kbd'
import { cn } from '@/lib/utils'
import { SettingCard } from './controls'

const SHORTCUTS: Array<{ name: string; keys: string[][] }> = [
  { name: '命令面板 / 全局搜索', keys: [['⌘', 'K']] },
  { name: '新建便签', keys: [['⌘', 'N']] },
  { name: '保存便签', keys: [['⌘', 'S']] },
  { name: '接受 AI 补全', keys: [['Tab']] },
  { name: '快速整理（工作台）', keys: [['⌘', 'Enter']] },
  { name: '粗体 / 斜体', keys: [['⌘', 'B'], ['⌘', 'I']] },
  { name: '专注模式', keys: [['⌘', '⇧', 'P']] },
  { name: '编辑 / 分栏 / 预览', keys: [['⌘', '1'], ['⌘', '2'], ['⌘', '3']] },
  { name: '跳转到工作台', keys: [['G'], ['H']] },
  { name: '跳转到便签', keys: [['G'], ['N']] },
]

/** 组 3 · 快捷键（settings.md）：只读表格卡，行高 44 斑马纹，行 stagger 淡入 */
export default function ShortcutsSection() {
  return (
    <SettingCard title="快捷键" caption="macOS 显示 ⌘，Windows / Linux 自动映射为 Ctrl">
      <div className="overflow-hidden rounded-r-md border border-line">
        {SHORTCUTS.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04, duration: 0.24 }}
            className={cn(
              'flex h-11 items-center justify-between px-4 transition-colors duration-150 hover:bg-brand-50',
              i % 2 === 1 && 'bg-subtle',
            )}
          >
            <span className="text-[14px] font-medium text-ink-900">{s.name}</span>
            <span className="flex items-center gap-1.5">
              {s.keys.map((combo, ci) => (
                <span key={ci} className="flex items-center gap-1">
                  {ci > 0 && <span className="mx-0.5 text-[11px] text-ink-300">{s.keys.length === 2 && s.name.startsWith('跳转') ? '然后' : '/'}</span>}
                  {combo.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              ))}
            </span>
          </motion.div>
        ))}
        {/* 自定义改键：即将支持（置灰） */}
        <div className="flex h-11 items-center justify-between border-t border-line bg-subtle px-4 opacity-50">
          <span className="text-[14px] font-medium text-ink-500">自定义改键</span>
          <span className="text-[12px] text-ink-400">即将支持</span>
        </div>
      </div>
    </SettingCard>
  )
}
