import { authorizeProxyRequest } from '@/lib/proxy'
import { stopStream } from '@/lib/chat-store'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { messageId } = await params
  stopStream(messageId)
  return Response.json({ id: messageId })
}