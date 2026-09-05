'use client'

import { useChat } from '@ai-sdk/react'
import { useState, type FormEvent } from 'react'

const SYSTEM_PROMPT =
  'You are an expert engineer. Build and improve web applications with clean, ' +
  'production-ready code. Ask clarifying questions when a request is ambiguous.'

export function ChatPage() {
  const [input, setInput] = useState('')
  const { error, messages, sendMessage, status, stop } = useChat()
  const generating = status === 'submitted' || status === 'streaming'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || generating) return
    setInput('')
    void sendMessage(
      { text },
      {
        body: { system: SYSTEM_PROMPT },
      },
    )
  }

  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">OpenRouter + AI SDK</p>
          <h1>AI chat</h1>
        </div>
      </header>

      <section className="messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="empty">Ask an AI model to build or change an application.</p>
        ) : (
          messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <strong>{message.role}</strong>
              {message.parts.map((part, index) => {
                if (part.type === 'text') return <div className="text" key={index}>{part.text}</div>
                if (part.type === 'reasoning') {
                  return (
                    <details key={index}>
                      <summary>Reasoning</summary>
                      <div className="text">{part.text}</div>
                    </details>
                  )
                }
                if (part.type === 'tool-invocation') return null
                return null
              })}
            </article>
          ))
        )}
      </section>

      {error ? <p className="error">{error.message}</p> : null}

      <form onSubmit={handleSubmit}>
        <textarea
          aria-label="Message"
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder="Build a project dashboard…"
          rows={3}
          value={input}
        />
        <div className="actions">
          <button disabled={!input.trim() || generating} type="submit">
            Send
          </button>
          <button disabled={!generating} onClick={stop} type="button">
            Stop
          </button>
          <span>{status}</span>
        </div>
      </form>
    </main>
  )
}