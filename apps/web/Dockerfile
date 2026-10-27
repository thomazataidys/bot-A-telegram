# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: deps — instala dependências do monorepo com cache de camada
# ==============================================================================
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY apps/bot/package.json ./apps/bot/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

# ==============================================================================
# Stage 2: build — gera Prisma Client, compila pacotes e gera Next.js standalone
# ==============================================================================
FROM deps AS build

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY tsconfig.base.json ./
COPY packages/db ./packages/db
COPY packages/core ./packages/core
COPY apps/web ./apps/web

# Garante que a pasta public exista mesmo que esteja vazia no repositório
RUN mkdir -p /app/apps/web/public

# Compila @animebot/db (prisma generate + tsc), @animebot/core e @animebot/web (next build standalone)
RUN pnpm --filter @animebot/db build \
 && pnpm --filter @animebot/core build \
 && pnpm --filter @animebot/web build

# Garante que os artefatos gerados em .prisma/client (incluindo WASM do Prisma 7) estejam no standalone
RUN if ls apps/web/.next/standalone/node_modules/.pnpm/@prisma+client*/node_modules/ >/dev/null 2>&1; then \
      cp -rL node_modules/.pnpm/@prisma+client*/node_modules/.prisma \
        apps/web/.next/standalone/node_modules/.pnpm/@prisma+client*/node_modules/; \
    fi

# ==============================================================================
# Stage 3: runtime — imagem final Next.js standalone como usuário não-root (node)
# ==============================================================================
FROM node:22-alpine AS runtime

RUN apk add --no-cache libc6-compat openssl tzdata

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    TZ=America/Fortaleza

WORKDIR /app

# Com outputFileTracingRoot na raiz do monorepo, o server.js fica em /app/apps/web/server.js
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
