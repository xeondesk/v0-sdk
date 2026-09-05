import { authorizeProxyRequest } from '@/lib/proxy'
import { readModelId, runV0Stream } from '@/lib/v0-stream'
import { addUserMessage, getChat, messages } from '@/lib/chat-store'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params
  if (!getChat(chatId)) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  const url = new URL(request.url)
  const limit = parseLimit(url.searchParams.get('limit'))
  const page = messages(chatId).slice()
  const selected = typeof limit === 'number' ? page.slice(-limit) : page

  return Response.json({ messages: [...selected].reverse(), cursor: null })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  if (!getChat(chatId)) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as {
    message?: string
    modelConfiguration?: { modelId?: string }
  }
  const text = String(body?.message ?? '').trim()
  if (!text) return Response.json({ message: 'A message is required.' }, { status: 400 })

  addUserMessage(chatId, text)
  return runV0Stream({ chatId, modelId: readModelId(body) })
}

function parseLimit(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.min(parsed, 100)
}