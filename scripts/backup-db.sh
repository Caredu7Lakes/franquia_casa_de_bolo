#!/usr/bin/env bash
#
# Backup do Postgres (casadobolo_db): dump local comprimido + upload para S3.
# Uso na VM (raiz do projeto):  bash scripts/backup-db.sh
# Variaveis opcionais: BACKUP_DIR (./backups), KEEP (14), S3_BUCKET, S3_PREFIX.
#
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-14}"
DB_USER="${POSTGRES_USER:-casadobolo_user}"
DB_NAME="${DB_NAME:-casadobolo_db}"
S3_BUCKET="${S3_BUCKET:-casadobolo-db-backups}"
S3_PREFIX="${S3_PREFIX:-casadobolo_db}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

# pg_dump roda dentro do container postgres; saida comprimida no host.
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
echo "Backup criado: $FILE ($(du -h "$FILE" | cut -f1))"

# Upload para o S3 (off-box). Falha o script se o upload nao der certo.
aws s3 cp "$FILE" "s3://${S3_BUCKET}/${S3_PREFIX}/${DB_NAME}-${STAMP}.sql.gz"
echo "Enviado para s3://${S3_BUCKET}/${S3_PREFIX}/${DB_NAME}-${STAMP}.sql.gz"

# Rotacao LOCAL: mantem apenas os $KEEP mais recentes no disco da VM.
ls -1t "$BACKUP_DIR/${DB_NAME}-"*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
echo "Rotacao local ok ? mantidos os ultimos $KEEP backups em $BACKUP_DIR."
