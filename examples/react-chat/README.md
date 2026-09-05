# OpenRouter + AI SDK React chat

Minimal Next.js example app showcasing the AI SDK's `useChat` backed by OpenRouter.

```sh
cp .env.example .env.local
# Add OPENROUTER_API_KEY (optional: OPENROUTER_MODEL, defaults to openrouter/auto),
# then from the repository root:
bun install
bun --filter react-chat dev
```