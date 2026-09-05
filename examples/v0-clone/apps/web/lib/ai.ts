import 'server-only'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export function getModel(modelId?: string) {
  return openrouter(resolveModelId(modelId))
}

export function resolveModelId(modelId?: string) {
  const configured = modelId?.trim()
  if (configured) return configured
  return process.env.OPENROUTER_MODEL ?? 'openrouter/auto'
}