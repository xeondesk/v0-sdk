'use client'

import { useEffect } from 'react'

// OpenRouter-backed chat replies generate text only, so there is no deployed
// preview to render. The empty state keeps the Preview/Code view toggle and
// the code editor's save gating (`isPreviewReady`) working.
export function PreviewPane({
  onReadyChange,
}: {
  onReadyChange?: (ready: boolean) => void
}) {
  useEffect(() => {
    onReadyChange?.(true)
  }, [onReadyChange])

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-sm text-center text-sm text-muted-foreground">
        No preview is available. This demo generates plain-text responses and stores them in
        memory, so there is nothing deployed to render here.
      </div>
    </div>
  )
}