import { authorizeProxyRequest } from '@/lib/proxy'
import { getChat, messages } from '@/lib/chat-store'

const encoder = new TextEncoder()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  const chat = getChat(chatId)

  // In-memory generations always complete (or abort) before being persisted, so
  // there is never a resumable assistant message. Signal that nothing is left
  // to resume, which `V0Transport` treats as "no stream".
  if (!chat) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  const resumable = [...messages(chatId)]
    .reverse()
    .find((message) => message.role === 'assistant' && message.finishReason === null)

  if (!resumable) return new Response(null, { status: 204 })

  const final = { ...resumable, finishReason: 'stop' as const }

  const stream = new ReadableStream<Uint8Array>({
    start(queue) {
      queue.enqueue(
        encoder.encode(
          `event: done\ndata: ${JSON.stringify({
            status: 'done',
            event: { object: 'message', ...final },
            message: final,
            parts: final.parts,
            usage: final.usage,
          })}\n\n`,
        ),
      )
      queue.close()
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