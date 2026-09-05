import 'server-only'

import { streamText } from 'ai'
import { nanoid } from 'nanoid'
import type { Chat, Message } from 'v0'

import { getModel, resolveModelId } from '@/lib/ai'
import {
  addMessage,
  chatHistoryForModel,
  getChat,
  registerStream,
} from '@/lib/chat-store'

const DEFAULT_SYSTEM =
  'You are a helpful AI assistant embedded in a v0-style app builder. ' +
  'Respond in GitHub-flavored Markdown. Be concise and practical.'

export function titleFromMessage(text: string) {
  const firstLine = text.split('\n').find((line) => line.trim())
  return (firstLine ?? text).trim().slice(0, 60)
}

export function readModelId(body: { modelConfiguration?: { modelId?: string } } | null | undefined) {
  return body?.modelConfiguration?.modelId
}

export function runV0Stream({
  chatId,
  modelId,
  title,
  system = DEFAULT_SYSTEM,
}: {
  chatId: string
  modelId?: string
  title?: string
  system?: string
}): Response {
  const chat = getChat(chatId)
  if (!chat) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  const assistantId = `msg_${nanoid()}`
  const startedAt = new Date()
  const controller = registerStream(assistantId, chatId)
  const resolvedModelId = resolveModelId(modelId)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(queue) {
      let text = ''
      let finishedAt: Date | undefined
      let finishReason: 'stop' | 'length' | 'error' = 'stop'
      let part: Message['parts'][number] | undefined

      const message = (): Message => ({
        id: assistantId,
        chatId,
        role: 'assistant',
        createdAt: startedAt,
        updatedAt: finishedAt ?? new Date(),
        content: '',
        parts: part ? [part] : [],
        finishReason,
        restorable: false,
        authorId: null,
        usage: {
          model: resolvedModelId,
          tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          creditsCost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      })

      const emitUpdate = (event: unknown, extra: Partial<Record<'chat' | 'title' | 'message', unknown>>) => {
        const update: Record<string, unknown> = {
          status: 'streaming',
          event,
          parts: [],
        }
        if (extra.chat) update.chat = extra.chat
        if (extra.title !== undefined) update.title = extra.title
        if (extra.message) {
          const current = extra.message as Message
          update.message = current
          update.parts = current.parts
          update.usage = current.usage
        }
        return queue.enqueue(encoder.encode(formatSse('update', update)))
      }

      const emitText = () => {
        part = { type: 'text', text, startedAt, ...(finishedAt ? { finishedAt } : {}) }
        emitUpdate(messageEvent(message()), { message: message() })
      }

      try {
        if (title) {
          queue.enqueue(
            encoder.encode(
              formatSse('update', {
                status: 'streaming',
                event: { object: 'chat.title', id: chat.id, delta: title },
                parts: [],
                chat: { ...chat, title },
                title,
              }),
            ),
          )
        } else {
          queue.enqueue(
            encoder.encode(
              formatSse('update', {
                status: 'streaming',
                event: chatEvent(chat),
                parts: [],
                chat,
              }),
            ),
          )
        }

        const result = streamText({
          model: getModel(modelId),
          system,
          messages: chatHistoryForModel(chatId),
          abortSignal: controller.signal,
        })

        for await (const delta of result.textStream) {
          text += delta
          emitText()
        }

        const modelFinishReason = await Promise.resolve(result.finishReason).catch(() => null)
        const usage = await Promise.resolve(result.usage).catch(() => undefined)
        if (modelFinishReason === 'length' || modelFinishReason === 'error') {
          finishReason = modelFinishReason
        }

        finishedAt = new Date()
        const finalMessage = message()
        if (usage) {
          finalMessage.usage = {
            model: resolvedModelId,
            tokens: {
              input: usage.inputTokens ?? 0,
              output: usage.outputTokens ?? 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: usage.totalTokens ?? 0,
            },
            creditsCost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          }
        }
        addMessage(finalMessage)

        queue.enqueue(
          encoder.encode(
            formatSse('done', {
              status: 'done',
              event: messageEvent(finalMessage),
              message: finalMessage,
              parts: finalMessage.parts,
              usage: finalMessage.usage,
            }),
          ),
        )
      } catch (error) {
        finishReason = 'error'
        finishedAt = new Date()

        if (text) {
          const partialMessage = message()
          try {
            addMessage(partialMessage)
          } catch {
            // Best effort only; the error event below is authoritative.
          }
          emitText()
        }

        queue.enqueue(
          encoder.encode(
            formatSse('error', {
              id: assistantId,
              message: error instanceof Error ? error.message : 'The stream failed.',
            }),
          ),
        )
      } finally {
        queue.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function chatEvent(chat: Chat) {
  return { object: 'chat', ...chat }
}

function messageEvent(message: Message) {
  return { object: 'message', ...message }
}

function formatSse(name: string, data: unknown) {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}