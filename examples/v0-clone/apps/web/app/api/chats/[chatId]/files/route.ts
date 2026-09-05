import { authorizeProxyRequest } from '@/lib/proxy'
import { getChat, getFiles, patchFiles } from '@/lib/chat-store'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  if (!getChat(chatId)) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  return Response.json({ files: getFiles(chatId) })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  if (!getChat(chatId)) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as {
    files?: Array<{ path: string; content: string }>
  }
  patchFiles(chatId, body.files ?? [])

  return Response.json({ files: getFiles(chatId), messages: [] })
}