'use client'

import { useSyncExternalStore } from 'react'

export const MODEL_LABELS = {
  'openrouter/auto': 'OpenRouter Auto (Recommended)',
  'anthropic/claude-sonnet-4': 'Claude Sonnet 4',
  'openai/gpt-5': 'GPT-5',
  'google/gemini-2.5-pro-preview': 'Gemini 2.5 Pro',
} as const

export type ModelType = keyof typeof MODEL_LABELS

export interface Settings {
  model: ModelType
}

export const AVAILABLE_MODELS = Object.keys(MODEL_LABELS) as ModelType[]

const DEFAULT_SETTINGS: Settings = {
  model: 'openrouter/auto',
}

const SETTINGS_STORAGE_KEY = 'v0-clone-settings'
const SETTINGS_UPDATE_EVENT = 'v0-clone-settings-updated'

// Cached snapshot so `getSnapshot` returns a stable reference between reads
// (required by useSyncExternalStore — re-parsing would loop forever).
let cachedRaw: string | null = null
let cachedSettings: Settings = DEFAULT_SETTINGS

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(SETTINGS_UPDATE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(SETTINGS_UPDATE_EVENT, callback)
  }
}

function getSnapshot(): Settings {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (raw === cachedRaw) return cachedSettings
  cachedRaw = raw
  cachedSettings = parseSettings(raw)
  return cachedSettings
}

function getServerSnapshot(): Settings {
  return DEFAULT_SETTINGS
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event(SETTINGS_UPDATE_EVENT))
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error)
    }
  }

  return { settings, updateSettings }
}

function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(raw)
    return {
      model: isModelType(parsed.model) ? parsed.model : DEFAULT_SETTINGS.model,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function isModelType(value: unknown): value is ModelType {
  return AVAILABLE_MODELS.includes(value as ModelType)
}
