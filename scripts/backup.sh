#!/usr/bin/env bash
# Exemplo de crontab:
# 0 3 * * * /caminho/para/repo/scripts/backup.sh >> /caminho/para/repo/backups/backup.log 2>&1

set -euo pipefail

# Ir para o diretório raiz do repositório (pasta pai do script)
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Criar pasta backups/ se não existir
mkdir -p backups

# Carregar POSTGRES_USER e POSTGRES_DB do .env (padrão animebot)
POSTGRES_USER="animebot"
POSTGRES_DB="animebot"

if [ -f .env ]; then
  while IFS="=" read -r key val || [ -n "$key" ]; do
    key=$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^export[[:space:]]*//')
    case "$key" in
      POSTGRES_USER)
        val=$(echo "$val" | sed -e 's/[[:space:]]*#.*//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        [ -n "$val" ] && POSTGRES_USER="$val"
        ;;
      POSTGRES_DB)
        val=$(echo "$val" | sed -e 's/[[:space:]]*#.*//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        [ -n "$val" ] && POSTGRES_DB="$val"
        ;;
    esac
  done < <(grep -E '^[[:space:]]*(export[[:space:]]+)?POSTGRES_(USER|DB)=' .env || true)
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup do banco '${POSTGRES_DB}' com usuário '${POSTGRES_USER}'..."

docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backups/animebot-$(date +%F).sql.gz

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup gerado com sucesso em backups/animebot-$(date +%F).sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removendo backups antigos mantendo apenas os 14 mais recentes..."
ls -1t backups/animebot-*.sql.gz | tail -n +15 | xargs -r rm --

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotina de backup concluída com sucesso."
