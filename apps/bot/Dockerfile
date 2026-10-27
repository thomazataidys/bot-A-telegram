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
# Stage 2: build — gera Prisma Client, compila TS e faz deploy enxuto
# ==============================================================================
FROM deps AS build

WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/db ./packages/db
COPY packages/core ./packages/core
COPY apps/bot ./apps/bot

# 1. Compila @animebot/db (roda prisma generate + tsc), @animebot/core e @animebot/bot
RUN pnpm --filter @animebot/db build \
 && pnpm --filter @animebot/core build \
 && pnpm --filter @animebot/bot build

# 2. Gera bundle de produção enxuto do bot em /prod/bot e copia os artefatos gerados do Prisma (.prisma/client)
RUN pnpm --filter @animebot/bot --prod deploy --legacy /prod/bot \
 && cp -rL node_modules/.pnpm/@prisma+client*/node_modules/.prisma \
      /prod/bot/node_modules/.pnpm/@prisma+client*/node_modules/

# 3. Gera bundle de @animebot/db (incluindo CLI prisma e tsx) em /prod/db para o serviço "migrate"
RUN pnpm --filter @animebot/db deploy --legacy /prod/db \
 && cp -rL node_modules/.pnpm/@prisma+client*/node_modules/.prisma \
      /prod/db/node_modules/.pnpm/@prisma+client*/node_modules/

# ==============================================================================
# Stage 3: runtime — imagem final enxuta rodando como usuário não-root (node)
# ==============================================================================
FROM node:22-alpine AS runtime

RUN apk add --no-cache libc6-compat openssl tzdata

ENV NODE_ENV=production \
    TZ=America/Fortaleza \
    PATH="/app/node_modules/.bin:/app/packages/db/node_modules/.bin:${PATH}"

WORKDIR /app

COPY --from=build --chown=node:node /prod/bot ./
COPY --from=build --chown=node:node /prod/db ./packages/db

USER node

CMD ["node", "dist/index.js"]
