import { convertToModelMessages, streamText, type UIMessage } from 'ai'

import { model } from '@/lib/ai'
import { authorizeProxyRequest } from '@/lib/proxy'

export async function POST(request: Request) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { messages, system } = (await request.json()) as {
    messages: UIMessage[]
    system?: string
  }

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}