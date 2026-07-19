import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Keyboard, Scale } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { GhostButton, SettingCard, SgModal } from './controls'

const STACK = ['React 19', 'Vite', 'Tailwind', 'Framer Motion', 'localStorage']

/** 组 5 · 关于（settings.md）：logo + 版本 + 致谢 + 技术栈，居中窄卡 */
export default function AboutSection() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen)
  const [licenseOpen, setLicenseOpen] = useState(false)

  return (
    <SettingCard className="mx-auto max-w-[480px] text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-r-lg bg-brand-500 shadow-card"
      >
        <motion.img
          src="/logo.svg"
          alt="FishNote"
          className="h-11 w-11"
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ delay: 0.4, duration: 0.6 }}
        />
      </motion.div>

      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="mt-4 text-[20px] font-bold leading-7 text-ink-900">FishNote</h2>
        <p className="mt-1 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">v1.0.0 · HarmonyOS 版</p>
        <p className="mt-3 text-[14px] leading-[22px] text-ink-700">随手记录，AI 整理，让碎碎念沉淀成你的知识资产。</p>
        <p className="mt-1 text-[12px] leading-[18px] tracking-[0.02em] text-ink-400">
          HarmonyOS 原生壳 + Web 技术构建，数据完全属于你。
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4"
      >
        <a
          href="https://github.com/Radiant303/SpringNote"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] tracking-[0.02em] text-ink-400 transition-colors hover:text-brand-600"
        >
          灵感来自开源项目 SpringNote <ExternalLink size={11} />
        </a>
      </motion.div>

      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.26, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 flex flex-wrap justify-center gap-2"
      >
        {STACK.map((s) => (
          <span key={s} className="rounded-r-pill bg-subtle px-2.5 py-1 font-mono text-[11px] text-ink-500">
            {s}
          </span>
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.34, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 flex justify-center gap-1"
      >
        <GhostButton onClick={() => setLicenseOpen(true)}>
          <Scale size={14} /> 查看开源协议
        </GhostButton>
        <GhostButton onClick={() => setPaletteOpen(true)}>
          <Keyboard size={14} /> 快捷键速查
        </GhostButton>
      </motion.div>

      <SgModal open={licenseOpen} onClose={() => setLicenseOpen(false)}>
        <h3 className="text-[16px] font-semibold text-ink-900">开源协议</h3>
        <div className="mt-3 max-h-[300px] overflow-y-auto text-[13px] leading-6 text-ink-500">
          <p>FishNote 基于以下开源项目构建，感谢开源社区：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>React / React DOM（MIT）</li>
            <li>Vite（MIT）</li>
            <li>Tailwind CSS（MIT）</li>
            <li>Framer Motion（MIT）</li>
            <li>Recharts（MIT）</li>
            <li>Lucide Icons（ISC）</li>
            <li>Zustand（MIT）</li>
            <li>date-fns（MIT）</li>
            <li>JSZip（MIT / GPL-3.0 双协议）</li>
          </ul>
          <p className="mt-3">功能灵感参考自开源项目 SpringNote，在此致谢。</p>
        </div>
        <div className="mt-5 flex justify-end">
          <GhostButton onClick={() => setLicenseOpen(false)}>关闭</GhostButton>
        </div>
      </SgModal>
    </SettingCard>
  )
}
