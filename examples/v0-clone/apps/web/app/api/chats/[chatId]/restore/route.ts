import { authorizeProxyRequest } from '@/lib/proxy'
import { getChat, resetFiles, truncateMessagesTo } from '@/lib/chat-store'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  if (!getChat(chatId)) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { messageId?: string }
  if (!body.messageId) {
    return Response.json({ message: 'A messageId is required.' }, { status: 400 })
  }

  const remaining = truncateMessagesTo(chatId, body.messageId)
  resetFiles(chatId)
  return Response.json({ messages: [...remaining].reverse(), cursor: null })
}