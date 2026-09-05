# v0 SDK

TypeScript SDK for the v0 API.

This repository contains the v2 SDK package and compatible examples:

- [`v0`](./packages/v0-sdk) - TypeScript SDK generated from the v0 API OpenAPI schema, with helpers for streaming responses and Vercel OIDC auth.
- [`@v0-sdk/react`](./packages/react) - AI SDK transport and generated `/swr` hooks for browser clients that call an application-owned v0 proxy.
- [`examples/basic`](./examples/basic) - Small TypeScript scripts for synchronous and streaming chat creation.
- [`examples/react-chat`](./examples/react-chat) - Minimal Next.js chat using AI SDK `useChat` with `V0Transport`.

## Install

```bash
npm install v0@canary
# or
pnpm add v0@canary
# or
yarn add v0@canary
# or
bun add v0@canary
```

## Usage

Set `V0_API_KEY`, or deploy server-side code on Vercel with OIDC enabled, then use the default client.

You can get an API key from [v0.app/settings](https://v0.app/settings)

```ts
import { v0 } from 'v0'

const response = await v0.chats.create({
  message: 'Build me a personal website',
})

if (response.error) {
  throw new Error(response.error.message)
}

const preview = await v0.chats.getPreview({
  chatId: response.data.chat.id,
})

if (preview.error) {
  throw new Error(preview.error.message)
}

console.log(preview.data?.url)
```

Use `createV0Client` when you need to customize auth, `baseUrl`, or fetch options.

```ts
import { createV0Client } from 'v0'

const v0 = createV0Client({
  auth: process.env.CUSTOM_V0_API_KEY!,
})
```

## Streaming

```ts
import { readV0Stream, v0 } from 'v0'

const serverResult = await v0.chats.createStream({
  message: 'Build a hello world button',
})

const result = readV0Stream(serverResult.toResponse())

for await (const update of result.stream) {
  console.log(update)
}

console.log(await result.final)
```

## Development

This repo uses Bun workspaces.

```bash
bun install
bun run generate
bun run build
bun run typecheck
bun run lint
bun run fmt:check
```

The generated SDK is built from [`packages/v0-sdk/openapi.json`](./packages/v0-sdk/openapi.json) with [`@hey-api/openapi-ts`](https://heyapi.dev/openapi-ts/get-started).

## Reproducible build

The full build gate can be reproduced on Amazon Linux 2023 (matching the Vercel v0 sandbox
runtime) in one command:

```bash
./scripts/reproduce.sh
```

This runs `install -> lockstep versions -> generate -> lint -> fmt:check -> build -> typecheck -> test`
and mirrors the repository CI (`.github/workflows/ci.yaml`). Prerequisites: `bun` and `node` on
`PATH` (the lockstep version check reads the package manifests with `node`).

Alternatively, build the provided container image, which installs the pinned toolchain
(Node 24.14.1, bun 1.3.8, pnpm 10.34.3) and runs the same gate as a build step:

```bash
docker build -t v0-sdk:build .
docker run --rm -it v0-sdk:build          # runs the test suite
docker run --rm -it v0-sdk:build bash -lc './scripts/reproduce.sh'   # re-runs the full gate
```

On hosts whose kernel lacks netfilter modules (e.g. restricted sandboxes), build with host
networking so the image can reach package mirrors:

```bash
podman build --network=host -t v0-sdk:build .
```

The Node.js and bun downloads in the Dockerfile are checksum-verified (pinned SHA-256 from the
official release lists) before extraction.

Validated 2026-08-05: the image builds clean and the in-image gate passes end to end
(`build gate passed`; 40 tests green). The image's `git` is dnf's `git-core` (not the
sandbox's vendored 2.49.0); the gate itself never invokes git.

## Deployment

`vercel.json` deploys the [`examples/react-chat`](./examples/react-chat) Next.js app: it builds the
`v0` and `@v0-sdk/react` workspace packages with `bun --filter` first, then runs `next build`
(output `.next`). The `bun` filter syntax runs natively on Vercel's build image (validated
2026-08-05; preview deployment Ready).

## License

Apache 2.0
