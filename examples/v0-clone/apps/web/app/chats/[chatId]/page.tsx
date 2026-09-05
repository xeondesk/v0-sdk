import { notFound } from 'next/navigation'
import type { ChatFilesResult } from '@/components/chat/code-editor'
import { ChatWorkspace } from '@/components/chat/chat-workspace'
import { getChat, getFiles, messages } from '@/lib/chat-store'

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params
  const chat = getChat(chatId)

  if (!chat) notFound()

  const filesPromise: Promise<ChatFilesResult> = Promise.resolve({ files: getFiles(chatId) })
  const chatMessages = [...messages(chatId)].reverse()

  return (
    <ChatWorkspace
      chat={chat}
      filesPromise={filesPromise}
      key={chat.id}
      messages={chatMessages}
    />
  )
}