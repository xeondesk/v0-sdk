import { authorizeProxyRequest } from '@/lib/proxy'
import { readModelId, runV0Stream, titleFromMessage } from '@/lib/v0-stream'
import {
  addUserMessage,
  createChat,
  listChats,
  setChatTitle,
} from '@/lib/chat-store'

async function readBody(request: Request) {
  try {
    return (await request.json()) as {
      message?: string
      modelConfiguration?: { modelId?: string }
    }
  } catch {
    return {}
  }
}

export async function GET(request: Request) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const url = new URL(request.url)
  const limit = parseLimit(url.searchParams.get('limit'))
  const metadata = parseMetadata(url.searchParams)

  return Response.json(listChats({ limit, metadata }))
}

export async function POST(request: Request) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const body = await readBody(request)
  const message = String(body?.message ?? '').trim()
  if (!message) return Response.json({ message: 'A message is required.' }, { status: 400 })

  const chat = createChat()
  const title = titleFromMessage(message)
  setChatTitle(chat.id, title)
  addUserMessage(chat.id, message)

  return runV0Stream({ chatId: chat.id, modelId: readModelId(body), title })
}

function parseLimit(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.min(parsed, 100)
}

// The v0 API filters with `metadata[key]=value` query params (deepObject style).
function parseMetadata(searchParams: URLSearchParams) {
  const metadata: Record<string, string> = {}

  for (const [key, value] of searchParams) {
    const match = /^metadata\[(.+)\]$/.exec(key)
    if (match && value) metadata[match[1]] = value
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}