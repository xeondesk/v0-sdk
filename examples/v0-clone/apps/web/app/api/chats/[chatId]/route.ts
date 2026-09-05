import { authorizeProxyRequest } from '@/lib/proxy'
import { deleteChat, getChat, updateChat } from '@/lib/chat-store'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params
  const chat = getChat(chatId)
  if (!chat) return Response.json({ message: 'Chat not found.' }, { status: 404 })
  return Response.json(chat)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    title?: string | null
    metadata?: Record<string, string | null>
  }

  const chat = updateChat(chatId, { title: body.title, metadata: body.metadata })
  if (!chat) return Response.json({ message: 'Chat not found.' }, { status: 404 })
  return Response.json(chat)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  if (!getChat(chatId)) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  deleteChat(chatId)
  return Response.json({ id: chatId })
}