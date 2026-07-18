import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage } from '@/types'
import { uid } from '@/lib/utils'
import { seedChatMessages } from './seed'

export interface NewChatMessageInput {
  role: ChatMessage['role']
  content: string
  thinkingSteps?: ChatMessage['thinkingSteps']
  sources?: ChatMessage['sources']
}

interface ChatState {
  /** 回忆书对话历史（时间正序） */
  messages: ChatMessage[]
  addMessage: (input: NewChatMessageInput) => ChatMessage
  /** 流式生成时增量更新 AI 消息内容 */
  updateMessage: (id: string, patch: Partial<Omit<ChatMessage, 'id' | 'timestamp'>>) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: seedChatMessages(),

      addMessage: (input) => {
        const message: ChatMessage = { id: uid('msg'), timestamp: Date.now(), ...input }
        set((s) => ({ messages: [...s.messages, message] }))
        return message
      },

      updateMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch, id: m.id, timestamp: m.timestamp } : m)),
        })),

      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'sg-chat', version: 1 },
  ),
)
