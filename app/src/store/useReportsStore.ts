import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Report } from '@/types'
import { uid } from '@/lib/utils'
import { createThrottledStorage } from '@/lib/persistStorage'
import { seedReports } from './seed'

export interface NewReportInput {
  type: Report['type']
  title: string
  contentMarkdown: string
  dateRange: Report['dateRange']
  sources?: string[]
}

interface ReportsState {
  reports: Report[]
  addReport: (input: NewReportInput) => Report
  updateReport: (id: string, patch: Partial<Omit<Report, 'id' | 'createdAt'>>) => void
  deleteReport: (id: string) => void
  getById: (id: string) => Report | undefined
  byType: (type: Report['type']) => Report[]
}

export const useReportsStore = create<ReportsState>()(
  persist(
    (set, get) => ({
      reports: seedReports(),

      addReport: (input) => {
        const report: Report = {
          id: uid('report'),
          createdAt: new Date().toISOString(),
          sources: [],
          ...input,
        }
        set((s) => ({ reports: [report, ...s.reports] }))
        return report
      },

      updateReport: (id, patch) =>
        set((s) => ({
          reports: s.reports.map((r) => (r.id === id ? { ...r, ...patch, id: r.id, createdAt: r.createdAt } : r)),
        })),

      deleteReport: (id) => set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),

      getById: (id) => get().reports.find((r) => r.id === id),

      byType: (type) =>
        get()
          .reports.filter((r) => r.type === type)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }),
    { name: 'sg-reports', version: 1, storage: createThrottledStorage() },
  ),
)
