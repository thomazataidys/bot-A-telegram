# AnimeBot — Bot do Telegram + Painel Web

Bot de Telegram e painel administrativo para um grupo de amigos organizar suas listas de animes, acompanhar o progresso de cada membro e receber avisos automáticos no grupo quando sair episódio novo.

## Funcionalidades

- **Listas individuais e lista global**: cada usuário mantém sua lista (`Assistindo`, `Quero ver`, `Completo`) e o grupo conta com uma visão consolidada mostrando quem acompanha cada anime e em qual episódio está.
- **Notificações no grupo**: avisa no grupo **1h após** a exibição no Japão (atraso configurável, tempo médio para sair legendado), marcando apenas quem acompanha o anime e incluindo botão rápido `✅ Vi`.
- **Agenda semanal**: calendário de lançamentos desta semana e da próxima (segunda a domingo) no fuso configurado (`America/Fortaleza` por padrão), com horários já ajustados para o lançamento legendado.
- **Adição rápida por link ou atalho**: basta colar um link da AniList, MyAnimeList ou Crunchyroll no chat, ou enviar `+ nome do anime`.
- **Painel web administrativo**: interface responsiva (claro/escuro) para gerenciar usuários, listas, agenda semanal, configurações, disparo de mensagem de teste e sincronização manual.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (strict, ESM, Node.js 22+) |
| Monorepo | pnpm workspaces |
| Bot do Telegram | grammY + node-cron |
| Painel Web | Next.js 15 (App Router) + TailwindCSS + shadcn/ui |
| Banco de Dados | PostgreSQL 16 + Prisma ORM (`@prisma/adapter-pg`) |
| Datas e Fuso | date-fns + date-fns-tz |
| Fonte de Dados | AniList GraphQL API (`https://graphql.anilist.co`) |
| Testes | Vitest |
| Infraestrutura | Docker + Docker Compose |

---

## Estrutura do Monorepo

```text
.
├── apps/
│   ├── bot/            # Processo do bot (grammY) + jobs agendados (sync e notificações)
│   └── web/            # Painel administrativo em Next.js (App Router)
├── packages/
│   ├── db/             # Schema Prisma, migrations, seed e cliente compartilhado (@animebot/db)
│   └── core/           # Regras de negócio, cliente AniList, parser de links e serviços (@animebot/core)
├── scripts/
│   └── backup.sh       # Rotina de backup diário do PostgreSQL (mantém os últimos 14 dias)
├── docker-compose.yml
└── .env.example
```

---

## Comandos e Atalhos do Bot

### Comandos

| Comando | Descrição |
|---|---|
| `/start` | Começar a usar o bot e ver o resumo de funcionamento |
| `/ajuda` | Ver a lista completa de comandos e atalhos |
| `/buscar <nome>` | Buscar um anime na AniList (até 5 resultados) com botão `➕ Adicionar` |
| `/add <nome ou link>` | Buscar ou identificar link e adicionar um anime à sua lista |
| `/lista` | Ver a sua lista agrupada por status, com botões interativos por anime |
| `/lista @usuario` | Ver a lista de outro membro do grupo |
| `/global` | Ver a lista global de todos os usuários e o progresso de cada um |
| `/semana` | Episódios desta semana (seg–dom) da sua lista (`/semana todos` para a agenda global) |
| `/proxima` | Episódios da próxima semana (seg–dom) da sua lista (`/proxima todos` para a agenda global) |
| `/vi <nome> <ep>` | Registrar rapidamente o episódio assistido (ex.: `/vi solo leveling 5`) |
| `/remover <nome>` | Remover um anime da sua lista (pede confirmação por botão) |
| `/configurargrupo` | *(Somente admins no grupo)* Define o chat atual como destino das notificações |

### Atalhos no Chat (Grupo ou Privado)

- **`+ <nome do anime>`** (ex.: `+ solo leveling`): busca na AniList e exibe até 3 opções com botão para adicionar como `Assistindo`.
- **Colar link em qualquer mensagem**:
  - `https://anilist.co/anime/<id>` → adiciona direto à lista de quem enviou.
  - `https://myanimelist.net/anime/<id>` → consulta o ID equivalente na AniList e adiciona direto.
  - `https://www.crunchyroll.com/(pt-br/)?series/<id>/<slug>` → converte o slug em busca na AniList e exibe opções em botões para confirmar.

> **Importante (Privacy Mode no Grupo)**: para que o bot consiga ler links colados e mensagens iniciadas com `+` dentro do grupo, desative o *Privacy Mode* no `@BotFather` (`/setprivacy` → selecionar o bot → `Disable`) **ou** promova o bot a administrador do grupo.

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` na raiz do repositório e preencha os valores:

```dotenv
BOT_TOKEN=                                               # Token gerado no @BotFather
DATABASE_URL=postgresql://animebot:animebot@db:5432/animebot
POSTGRES_USER=animebot
POSTGRES_PASSWORD=animebot
POSTGRES_DB=animebot
ADMIN_PASSWORD=                                          # Senha única de login no painel web
SESSION_SECRET=                                          # String aleatória longa (ex.: openssl rand -hex 32)
ADMIN_TELEGRAM_IDS=                                      # IDs numéricos do Telegram separados por vírgula (para /configurargrupo)
TZ=America/Fortaleza
```

> Para desenvolvimento local fora do Docker (conectando ao Postgres em `localhost:5432`), ajuste o host em `DATABASE_URL` para `localhost`.

---

## Desenvolvimento Local

1. **Instalar dependências**:
   ```bash
   pnpm install
   ```

2. **Subir o PostgreSQL e preparar o banco**:
   ```bash
   # Subir um banco Postgres local (ou usar o serviço db do compose expondo a porta localmente)
   pnpm --filter @animebot/db db:migrate
   pnpm --filter @animebot/db db:seed
   ```

3. **Compilar os pacotes compartilhados**:
   ```bash
   pnpm --filter @animebot/db build
   pnpm --filter @animebot/core build
   ```

4. **Executar o bot e o painel web**:
   ```bash
   # Painel web em modo de desenvolvimento (http://localhost:3000)
   pnpm --filter @animebot/web dev

   # Compilar e iniciar o bot
   pnpm --filter @animebot/bot build
   pnpm --filter @animebot/bot start
   ```

5. **Qualidade de código (lint, testes, build e formatação)**:
   ```bash
   pnpm lint
   pnpm test
   pnpm build
   pnpm format
   ```

---

## Deploy no Servidor (`thomazlab`)

1. **Clonar o repositório no servidor**:
   ```bash
   git clone <URL_DO_REPOSITORIO> anime-bot
   cd anime-bot
   ```

2. **Configurar o arquivo `.env`**:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Subir todos os serviços com Docker Compose**:
   ```bash
   docker compose up -d --build
   ```
   *(O serviço `migrate` aplica automaticamente as migrations e o seed inicial antes de liberar o `bot` e o `web`).*

4. **Liberar o painel web apenas pela interface do Tailscale (`tailscale0`)**:
   ```bash
   sudo ufw allow in on tailscale0 to any port 3000 proto tcp
   ```

5. **Acessar o painel web**:
   Com o Tailscale conectado, acesse `http://thomazlab:3000`.

6. **Configurar o bot no grupo do Telegram**:
   - No `@BotFather`, envie `/setprivacy`, escolha o bot e selecione `Disable`.
   - Adicione o bot ao grupo dos amigos e envie `/configurargrupo` dentro do grupo (usando uma conta cujo ID esteja em `ADMIN_TELEGRAM_IDS`).

7. **Configurar backup diário do PostgreSQL**:
   O script `scripts/backup.sh` gera dumps compactados em `backups/animebot-YYYY-MM-DD.sql.gz` e mantém automaticamente os 14 arquivos mais recentes. Adicione ao `crontab -e`:
   ```cron
   0 3 * * * /caminho/para/anime-bot/scripts/backup.sh >> /caminho/para/anime-bot/backups/backup.log 2>&1
   ```

8. **Atualizar a aplicação em produção**:
   ```bash
   git pull && docker compose up -d --build
   ```
