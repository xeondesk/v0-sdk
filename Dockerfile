# v0-sdk reproducible build image.
#
# Mirrors the Vercel v0 sandbox runtime: Amazon Linux 2023 + the exact
# toolchain versions used by the project, then runs the full build gate.
#
#   docker build -t v0-sdk:build .
#   docker run --rm v0-sdk:build bash -lc 'bun run test'

FROM amazonlinux:2023

ARG NODE_VERSION=24.14.1
ARG BUN_VERSION=1.3.8
ARG NODE_BASE=/vercel/runtimes/node24

ENV PATH="${NODE_BASE}/bin:/usr/local/bin:/usr/bin:/bin"

# Base OS packages
RUN dnf install -y \
        tar gzip unzip xz curl-minimal wget ca-certificates \
        make gcc gcc-c++ python3 git-core \
        procps-ng findutils && \
    dnf clean all

# Node.js 24 runtime (same layout as the sandbox: /vercel/runtimes/node24)
RUN mkdir -p "${NODE_BASE}" && \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
        -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz --strip-components=1 -C "${NODE_BASE}" && \
    rm /tmp/node.tar.xz && \
    ln -sf "${NODE_BASE}/bin/node" /usr/local/bin/node

# bun (pinned)
RUN curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip" \
        -o /tmp/bun.zip && \
    unzip /tmp/bun.zip -d /tmp/bun && \
    install -m 0755 /tmp/bun/bun-linux-x64/bun /usr/local/bin/bun && \
    rm -rf /tmp/bun /tmp/bun.zip

# pnpm (pinned) via corepack
RUN corepack enable && \
    corepack prepare pnpm@10.34.3 --activate

WORKDIR /repo

# Copy manifests first for layer caching, then the sources
COPY package.json bun.lock ./
COPY .oxlintrc.json .oxfmtrc.json .ignore .gitignore ./
COPY packages ./packages
COPY examples ./examples
COPY scripts ./scripts
COPY nix ./nix

# Reproducible build gate (install -> generate -> lint -> fmt -> build -> typecheck -> test)
RUN bash scripts/reproduce.sh

CMD ["bash", "-lc", "bun run test"]
