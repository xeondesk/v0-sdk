import { authorizeProxyRequest } from '@/lib/proxy'
import { addUserMessage, getChat } from '@/lib/chat-store'
import { readModelId, runV0Stream } from '@/lib/v0-stream'

// Streams an assistant reply for a resolved task. Plain OpenRouter responses
// never emit pending tasks, so this only runs when a resolved task is
// re-submitted.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  if (!getChat(chatId)) return Response.json({ message: 'Chat not found.' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as {
    task?: {
      type?: string
      [key: string]: unknown
    }
    modelConfiguration?: { modelId?: string }
  }

  const prompt = taskToPrompt(body.task)
  if (!prompt) return Response.json({ message: 'A task is required.' }, { status: 400 })

  addUserMessage(chatId, prompt)
  return runV0Stream({ chatId, modelId: readModelId(body) })
}

function taskToPrompt(task: { type?: string; [key: string]: unknown } | undefined) {
  if (!task?.type) return ''

  switch (task.type) {
    case 'answered-questions': {
      const answers = Array.isArray(task.answers)
        ? (task.answers as Array<Record<string, unknown>>)
        : []
      return answers
        .map((answer) => {
          const labels = Array.isArray(answer.selectedLabels)
            ? (answer.selectedLabels as string[]).join('\n- ')
            : ''
          const text = typeof answer.customText === 'string' ? `\n- ${answer.customText}` : ''
          return `${answer.questionText ?? answer.questionId}:\n- ${labels}${text}`
        })
        .join('\n\n')
    }
    case 'plan-exit-response': {
      const status = typeof task.status === 'string' ? task.status : 'approved'
      const content = typeof task.content === 'string' ? task.content : ''
      return status === 'approved' ? `Approved the plan. ${content}` : `Plan ${status}: ${content}`
    }
    case 'confirmed-steps':
      return [
        'I connected these services:',
        ...(Array.isArray(task.connectedIntegrationNames)
          ? (task.connectedIntegrationNames as string[]).map((name) => `- ${name}`)
          : []),
        ...(Array.isArray(task.connectedMcpPresetNames)
          ? (task.connectedMcpPresetNames as string[]).map((name) => `- ${name}`)
          : []),
      ].join('\n')
    case 'confirmed-permissions':
      return 'I allowed the requested tool permissions. Continue.'
    default:
      return JSON.stringify(task)
  }
}