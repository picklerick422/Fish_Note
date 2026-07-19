import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage } from '@/types'
import { uid } from '@/lib/utils'
import { createThrottledStorage } from '@/lib/persistStorage'
import { seedChatMessages } from './seed'

export interface NewChatMessageInput {
  role: ChatMessage['role']
  content: string
  thinkingSteps?: ChatMessage['thinkingSteps']
  sources?: ChatMessage['sources']
}

type UpdateMessageFn = (id: string, patch: Partial<Omit<ChatMessage, 'id' | 'timestamp'>>) => void

/** 流式更新节流：120ms 内多次调用只执行最后一次，避免每 token 全量 set+persist */
function throttleArgs<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: A | null = null
  const wrapped = (...args: A) => {
    lastArgs = args
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      if (lastArgs) fn(...lastArgs)
      lastArgs = null
    }, wait)
  }
  /** 丢弃未执行的尾随调用（最终落库前调用，防止过期内容覆盖最终文本） */
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    lastArgs = null
  }
  return wrapped
}

/** 节流派发的流式更新入口：转发给 store 内原始 updateMessageNow（带 cancel 供最终落库前丢弃尾随调用） */
const throttledUpdateMessage = throttleArgs<Parameters<UpdateMessageFn>>((id, patch) => {
  useChatStore.getState().updateMessageNow(id, patch)
}, 120)

interface ChatState {
  /** 回忆书对话历史（时间正序） */
  messages: ChatMessage[]
  addMessage: (input: NewChatMessageInput) => ChatMessage
  /** 流式生成时增量更新 AI 消息内容（120ms 节流，仅用于流式期间的逐 token 更新） */
  updateMessage: UpdateMessageFn
  /** 原始立即更新：流式结束/中断等最终落库必须用它，保证内容完整 */
  updateMessageNow: UpdateMessageFn
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

      updateMessage: (id, patch) => throttledUpdateMessage(id, patch),

      updateMessageNow: (id, patch) => {
        // 先取消未执行的节流尾随调用，防止过期流式内容覆盖最终文本
        throttledUpdateMessage.cancel()
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch, id: m.id, timestamp: m.timestamp } : m)),
        }))
      },

      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'sg-chat', version: 1, storage: createThrottledStorage() },
  ),
)
