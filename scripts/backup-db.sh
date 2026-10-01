#!/usr/bin/env bash
#
# Backup do Postgres (casadobolo_db) para ./backups/, comprimido, com rotação.
# Uso na VM (raiz do projeto):  bash scripts/backup-db.sh
# Variáveis opcionais: BACKUP_DIR (default ./backups), KEEP (default 14).
#
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-14}"
DB_USER="${POSTGRES_USER:-casadobolo_user}"
DB_NAME="${DB_NAME:-casadobolo_db}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

# pg_dump roda dentro do container postgres; saída comprimida no host.
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
echo "Backup criado: $FILE ($(du -h "$FILE" | cut -f1))"

# Rotação: mantém apenas os $KEEP mais recentes.
ls -1t "$BACKUP_DIR/${DB_NAME}-"*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
echo "Rotação ok — mantidos os últimos $KEEP backups em $BACKUP_DIR."
