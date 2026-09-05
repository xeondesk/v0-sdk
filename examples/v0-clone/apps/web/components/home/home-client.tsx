'use client'

import { useChat } from '@ai-sdk/react'
import { V0Transport, type V0UIMessage } from '@v0-sdk/react'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { PromptBox } from '@/components/prompt-box'
import { ConversationView } from '@/components/chat/conversation-view'
import { SidebarToggleButton } from '@/components/layout/app-shell'
import { useSettings } from '@/lib/hooks/useSettings'

export function HomeClient() {
  const router = useRouter()
  const { settings, updateSettings } = useSettings()
  const [actionError, setActionError] = useState<string | null>(null)
  const createdChatId = useRef<string | null>(null)
  const transport = useMemo(
    () =>
      new V0Transport({
        urls: {
          create: '/api/chats',
          send: (id) => `/api/chats/${encodeURIComponent(id)}/messages`,
          resume: (id) => `/api/chats/${encodeURIComponent(id)}/resume`,
        },
        onChatCreated: (chatId) => {
          createdChatId.current = chatId
        },
      }),
    [],
  )
  const {
    clearError,
    error: chatError,
    messages,
    sendMessage,
    status,
  } = useChat<V0UIMessage>({
    transport,
    onFinish: () => {
      const chatId = createdChatId.current
      if (!chatId) return
      // Navigate once the reply is persisted, so the chat page renders the
      // complete conversation.
      router.push(`/chats/${chatId}`)
      router.refresh()
    },
  })
  const chatIsCreating = status === 'submitted' || status === 'streaming'
  const error = actionError ?? chatError?.message

  const createFromPrompt = async (message: string) => {
    setActionError(null)
    clearError()

    await sendMessage(
      { text: message },
      {
        body: {
          modelConfiguration: {
            modelId: settings.model,
          },
        },
      },
    )
  }

  const prompt = (
    <>
      <PromptBox
        autoFocus
        isSubmitting={chatIsCreating}
        model={settings.model}
        onModelChange={(model) => updateSettings({ model })}
        onSubmit={createFromPrompt}
        placeholder="Describe what you want to build..."
      />
      {error ? <p className="mt-2 px-1 text-sm text-destructive">{error}</p> : null}
    </>
  )

  return (
    <div className="flex h-full flex-col px-4">
      <SidebarToggleButton className="mt-2 self-start" />
      {messages.length > 0 ? (
        <>
          <ConversationView isStreaming={chatIsCreating} messages={messages} />
          <div className="mx-auto w-full max-w-2xl shrink-0 pb-4">{prompt}</div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-2xl -translate-y-[8%]">
            <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight text-foreground">
              What do you want to create?
            </h1>
            {prompt}
          </div>
        </div>
      )}
    </div>
  )
}