import 'server-only'

import { nanoid } from 'nanoid'
import type { Chat, Files, Message } from 'v0'

// In-memory chat store for the OpenRouter-backed v0-clone. Chats do not
// survive a server restart; replace this module with a real database before
// using the example in production.

const chats = new Map<string, Chat>()
const messageLists = new Map<string, Message[]>()
const chatFiles = new Map<string, Files['files']>()
const activeStreams = new Map<string, { chatId: string; controller: AbortController }>()

export type ChatMetadataPatch = { title?: string | null; metadata?: Record<string, string | null> }

const zeroTokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }

function zeroUsage(): Message['usage'] {
  return {
    model: null,
    tokens: { ...zeroTokens },
    creditsCost: { ...zeroTokens },
  }
}

export function createChat(): Chat {
  const id = `chat_${nanoid()}`
  const now = new Date()

  const chat: Chat = {
    id,
    title: undefined,
    privacy: 'private',
    createdAt: now,
    updatedAt: now,
    authorId: 'local',
    metadata: {},
    writePermission: true,
  }

  chats.set(id, chat)
  messageLists.set(id, [])
  chatFiles.set(id, [])

  return chat
}

export function getChat(chatId: string): Chat | undefined {
  return chats.get(chatId)
}

export function listChats(options: { limit?: number; metadata?: Record<string, string> } = {}) {
  const { limit, metadata } = options
  let result = [...chats.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )

  if (metadata) {
    result = result.filter((chat) =>
      Object.entries(metadata).every(([key, value]) => chat.metadata[key] === value),
    )
  }

  if (typeof limit === 'number') {
    result = result.slice(0, limit)
  }

  return { chats: result, cursor: null }
}

export function updateChat(chatId: string, patch: ChatMetadataPatch): Chat | undefined {
  const chat = chats.get(chatId)
  if (!chat) return undefined

  if (patch.title !== undefined) {
    chat.title = patch.title?.trim() || undefined
  }

  if (patch.metadata) {
    for (const [key, value] of Object.entries(patch.metadata)) {
      if (value === null) {
        delete chat.metadata[key]
      } else {
        chat.metadata[key] = value
      }
    }
  }

  chat.updatedAt = new Date()
  return chat
}

export function setChatTitle(chatId: string, title: string): Chat | undefined {
  return updateChat(chatId, { title })
}

export function deleteChat(chatId: string): boolean {
  for (const [messageId, stream] of activeStreams) {
    if (stream.chatId === chatId) {
      stream.controller.abort()
      activeStreams.delete(messageId)
    }
  }

  chats.delete(chatId)
  messageLists.delete(chatId)
  chatFiles.delete(chatId)
  return true
}

export function messages(chatId: string): Message[] {
  return messageLists.get(chatId) ?? []
}

export function addMessage(message: Message) {
  messageLists.get(message.chatId)?.push(message)
}

export function addUserMessage(chatId: string, text: string): Message {
  const now = new Date()
  const message: Message = {
    id: `msg_${nanoid()}`,
    chatId,
    role: 'user',
    createdAt: now,
    updatedAt: now,
    content: text,
    parts: [{ type: 'text', text, startedAt: now, finishedAt: now }],
    finishReason: null,
    restorable: false,
    authorId: 'local',
    usage: zeroUsage(),
  }

  addMessage(message)
  return message
}

export function truncateMessagesTo(chatId: string, messageId: string): Message[] {
  const list = messageLists.get(chatId)
  if (!list) return []

  const index = list.findIndex((message) => message.id === messageId)
  if (index !== -1) {
    list.splice(index + 1)
  }

  return list
}

export function chatHistoryForModel(
  chatId: string,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages(chatId).map((message) => ({
    role: message.role,
    content: message.parts
      .filter((part): part is Extract<Message['parts'][number], { type: 'text' }> =>
        part.type === 'text',
      )
      .map((part) => part.text)
      .join('\n\n'),
  }))
}

export function getFiles(chatId: string): Files['files'] {
  return chatFiles.get(chatId) ?? []
}

export function patchFiles(chatId: string, files: Array<{ path: string; content: string }>) {
  const result = new Map((chatFiles.get(chatId) ?? []).map((file) => [file.path, file]))
  for (const file of files) {
    result.set(file.path, { path: file.path, content: file.content, encoding: 'utf8' })
  }
  const next = [...result.values()]
  chatFiles.set(chatId, next)
  return next
}

export function resetFiles(chatId: string) {
  chatFiles.set(chatId, [])
}

export function registerStream(messageId: string, chatId: string): AbortController {
  const controller = new AbortController()
  activeStreams.set(messageId, { chatId, controller })
  return controller
}

export function stopStream(messageId: string) {
  activeStreams.get(messageId)?.controller.abort()
}