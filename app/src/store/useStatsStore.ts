import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format, subDays } from 'date-fns'
import type { Achievement, StatsData, TokenUsage } from '@/types'
import { useNotesStore } from './useNotesStore'
import { seedAchievements, seedActivity, seedInspirationSeries } from './seed'

/** 升到下一级所需 XP：Lv.7 → 3000 */
export const xpForNext = (level: number): number => 400 * level + 200

interface StatsState {
  /** yyyy-MM-dd -> 记录条数（热力图数据源） */
  activity: Record<string, number>
  /** 灵感收益（累计） */
  inspiration: number
  /** 本周收益 */
  inspirationWeek: number
  /** 近 14 天每日收益（sparkline） */
  inspirationSeries: number[]
  level: number
  xp: number
  tokenUsage: TokenUsage
  achievements: Achievement[]
  /** 大数字计数器基线（零起步，随使用累积） */
  counters: { notes: number; daily: number; weekly: number; monthly: number; words: number }

  recordActivity: (date?: string, n?: number) => void
  addInspiration: (n: number) => void
  addXP: (n: number) => void
  addTokenUsage: (prompt: number, completion: number) => void
  unlockAchievement: (id: string) => void
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      activity: seedActivity(),
      inspiration: 0,
      inspirationWeek: 0,
      inspirationSeries: seedInspirationSeries(),
      level: 1,
      xp: 0,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      achievements: seedAchievements(),
      counters: { notes: 0, daily: 0, weekly: 0, monthly: 0, words: 0 },

      recordActivity: (date, n = 1) =>
        set((s) => {
          const key = date ?? format(new Date(), 'yyyy-MM-dd')
          return { activity: { ...s.activity, [key]: (s.activity[key] ?? 0) + n } }
        }),

      addInspiration: (n) =>
        set((s) => {
          const series = [...s.inspirationSeries]
          series[series.length - 1] = (series[series.length - 1] ?? 0) + n
          return { inspiration: s.inspiration + n, inspirationWeek: s.inspirationWeek + n, inspirationSeries: series }
        }),

      addXP: (n) =>
        set((s) => {
          let { xp, level } = s
          xp += n
          while (xp >= xpForNext(level)) {
            xp -= xpForNext(level)
            level += 1
          }
          return { xp, level }
        }),

      addTokenUsage: (prompt, completion) =>
        set((s) => ({
          tokenUsage: {
            prompt: s.tokenUsage.prompt + prompt,
            completion: s.tokenUsage.completion + completion,
            total: s.tokenUsage.total + prompt + completion,
          },
        })),

      unlockAchievement: (id) =>
        set((s) => ({
          achievements: s.achievements.map((a) =>
            a.id === id && !a.unlockedAt ? { ...a, unlockedAt: new Date().toISOString() } : a,
          ),
        })),
    }),
    { name: 'sg-stats', version: 1 },
  ),
)

/** 连续天数：从今天（允许今天尚未记录的宽限）向前连续有记录的天数 */
export function computeStreak(activity: Record<string, number>): { current: number; longest: number } {
  const today = new Date()
  const keyAt = (i: number) => format(subDays(today, i), 'yyyy-MM-dd')
  let current = 0
  let i = (activity[keyAt(0)] ?? 0) > 0 ? 0 : 1
  while (i < 500 && (activity[keyAt(i)] ?? 0) > 0) {
    current += 1
    i += 1
  }
  let longest = 0
  let run = 0
  for (let d = 499; d >= 0; d--) {
    if ((activity[keyAt(d)] ?? 0) > 0) {
      run += 1
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }
  return { current, longest: Math.max(longest, current) }
}

export interface NoteCounts {
  total: number
  daily: number
  weekly: number
  monthly: number
  memo: number
}

/** 便签计数：基线 + 实际存活便签数 */
export function useNoteCounts(): NoteCounts {
  const notes = useNotesStore((s) => s.notes)
  const counters = useStatsStore((s) => s.counters)
  const live = { daily: 0, weekly: 0, monthly: 0, memo: 0 }
  for (const n of notes) {
    if (!n.deletedAt) live[n.kind] += 1
  }
  const liveTotal = live.daily + live.weekly + live.monthly + live.memo
  return {
    total: counters.notes + liveTotal,
    daily: counters.daily + live.daily,
    weekly: counters.weekly + live.weekly,
    monthly: counters.monthly + live.monthly,
    memo: live.memo,
  }
}

function countWords(markdown: string): number {
  return markdown.replace(/[#>*`\-|[\]()]/g, '').replace(/\s/g, '').length
}

/** 统计页/首页总览派生数据 */
export function useStatsData(): StatsData {
  const activity = useStatsStore((s) => s.activity)
  const inspiration = useStatsStore((s) => s.inspiration)
  const inspirationWeek = useStatsStore((s) => s.inspirationWeek)
  const level = useStatsStore((s) => s.level)
  const xp = useStatsStore((s) => s.xp)
  const tokenUsage = useStatsStore((s) => s.tokenUsage)
  const counters = useStatsStore((s) => s.counters)
  const notes = useNotesStore((s) => s.notes)
  const counts = useNoteCounts()
  const streak = computeStreak(activity)
  const liveWords = notes.reduce((sum, n) => sum + (n.deletedAt ? 0 : countWords(n.contentMarkdown)), 0)
  return {
    totalNotes: counts.total,
    totalWords: counters.words + liveWords,
    inspiration,
    inspirationWeek,
    streakDays: streak.current,
    longestStreak: streak.longest,
    level,
    xp,
    xpForNext: xpForNext(level),
    activity,
    tokenUsage,
  }
}
