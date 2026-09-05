'use client'

import { WebPreviewNavigationButton } from '@/components/ai-elements/web-preview'
import { SidebarToggleButton } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  EyeIcon,
  ExternalIcon,
  RefreshIcon,
} from '@/lib/icons'
import { cn } from '@/lib/utils'

export type ChatView = 'preview' | 'code'

export function ChatHeader({
  title,
  view,
  onViewChange,
}: {
  title: string
  view: ChatView
  onViewChange: (view: ChatView) => void
}) {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border">
      <div className="flex w-full shrink-0 items-center gap-2 px-3 md:w-80 md:max-w-[42%]">
        <SidebarToggleButton />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
      </div>

      <div className="hidden h-full min-w-0 flex-1 items-center justify-between gap-3 px-3 md:flex">
        <div className="flex shrink-0 items-center rounded-md bg-muted p-0.5">
          <Button
            aria-label="Preview"
            aria-pressed={view === 'preview'}
            className={cn('size-6 rounded-sm p-0', view === 'preview' && 'bg-background shadow-xs')}
            onClick={() => onViewChange('preview')}
            size="icon-xs"
            variant="ghost"
          >
            <EyeIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Code"
            aria-pressed={view === 'code'}
            className={cn('size-6 rounded-sm p-0', view === 'code' && 'bg-background shadow-xs')}
            onClick={() => onViewChange('code')}
            size="icon-xs"
            variant="ghost"
          >
            <CodeIcon className="size-3.5" />
          </Button>
        </div>

        <div className="hidden h-7 min-w-[150px] max-w-[420px] flex-1 items-center rounded-md border border-border px-0.5 lg:flex">
          <Button
            aria-label="Back"
            className="size-6 text-muted-foreground"
            disabled
            size="icon-xs"
            variant="ghost"
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Forward"
            className="size-6 text-muted-foreground"
            disabled
            size="icon-xs"
            variant="ghost"
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
          <span className="min-w-0 flex-1 truncate px-2 text-xs text-muted-foreground">/</span>
          <WebPreviewNavigationButton className="size-6 p-0" disabled tooltip="Refresh preview">
            <RefreshIcon className="size-3.5" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton
            className="size-6 p-0"
            disabled
            tooltip="Open preview in new tab"
          >
            <ExternalIcon className="size-3.5" />
          </WebPreviewNavigationButton>
        </div>
      </div>
    </header>
  )
}