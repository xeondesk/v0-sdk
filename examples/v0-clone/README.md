# v0 Clone

A deliberately small v0-style chat app built with the v0 SDK. It keeps the
v0 client-side experience and wire format but backs every generation with
OpenRouter via `@openrouter/ai-sdk-provider`, so it never touches the v0 API.

> **Security warning:** this example has no user accounts or authentication.
> Everyone who can reach a deployment can read, create, modify, and delete
> chats and run generations from any browser, at the deployer's expense
> (every request consumes OpenRouter credits). Every server route passes
> through `authorizeProxyRequest` (`apps/web/lib/proxy.ts`), a same-origin
> baseline check only: it does not stop direct non-browser requests. Replace
> or extend it with real session auth before exposing a deployment to
> untrusted users.

## Architecture

- `apps/web` is the host application. It owns the chat UI and all server
  routes.
- `apps/preview-proxy` is a leftover from the template's Vercel-preview
  architecture and is **not used** by this OpenRouter-backed example; it
  builds standalone and can be deleted.

Chats and files live in an in-memory store (`apps/web/lib/chat-store.ts`), so
everything is lost when the server restarts. Replies are generated with the AI
SDK `streamText` on OpenRouter models and pushed to the browser over the v0 SSE
handshake (`apps/web/lib/v0-stream.ts`), which the `V0Transport` client
understands.

## Run it

Copy the example environment file:

```bash
cp examples/v0-clone/.env.example examples/v0-clone/.env.local
```

```bash
OPENROUTER_API_KEY=
# OPENROUTER_MODEL=openrouter/auto
```

- `OPENROUTER_API_KEY` is required: it is the key used server-side for every
  generation.
- `OPENROUTER_MODEL` is optional and defaults to `openrouter/auto`. The model
  selector in the prompt box also lets you pick another served model
  (`anthropic/claude-sonnet-4`, `openai/gpt-5`,
  `google/gemini-2.5-pro-preview`), which is stored in a browser cookie.

Then run from the repository root:

```bash
bun install
bun --filter v0-clone dev
```

The web app runs at [http://localhost:3000](http://localhost:3000).

When this example is created with `create-v0-sdk`, run the same commands from
the generated project directory:

```bash
bun install
bun dev
```

## Deploy it

Deploy `apps/web` to your platform of choice and set `OPENROUTER_API_KEY` (and
optionally `OPENROUTER_MODEL`) as an environment variable. There is no
`apps/preview-proxy` deployment this time; nothing in the web app depends on it.

## Implementation notes

- The root layout fetches favorite and recent chats on the server and passes
  them into the sidebar.
- `/chats/[chatId]` fetches the selected chat, messages, and files from the
  in-memory store on the server.
- Client chat state uses AI SDK `useChat` with `V0Transport`, while
  `@v0-sdk/react/swr` hooks power chat, file, restore, favorite, and delete
  actions.
- App Router handlers (`apps/web/app/api/chats/**`) read and write the
  in-memory store. They match the v0 API's response shapes so the SDK's
  transformers and client logic keep working:
  - `GET /api/chats` → `{ chats, cursor }`, with `metadata[key]=value`
    filtering for favorites.
  - `POST /api/chats` and `POST /api/chats/:id/messages` → the v0 SSE stream
    (`event: update`, then `event: done`).
  - `PATCH /api/chats/:id` → `Chat`, `DELETE` → `{ id }`,
    `GET/PATCH /api/chats/:id/files` → `{ files, messages }`,
    `POST /api/chats/:id/restore` → `{ messages }`,
    `POST /api/chats/:id/messages/:id/stop` → `{ id }`.
- `lib/v0-stream.ts` streams a model reply: it emits a `chat` update to
  register the chat (for `POST /api/chats`), then growing `message` snapshot
  updates as the reply streams, then a final update with
  `finishReason: 'stop'`, and persists the complete assistant message to the
  store before the stream ends.
- Resumes (`POST /api/chats/:id/resume`) return `204`, and the resolve route
  answers v0 task-resolution requests by simply re-prompting the model.
- Generated replies are plain text only. There is no artifact code, so the
  preview panel is a placeholder, the file picker stays empty, and
  task-resolution controls never render.
- Every App Router handler calls `authorizeProxyRequest` first; that seam is
  where you add session auth.