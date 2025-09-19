#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL missing}"
: "${S3_BACKUP_BUCKET:?S3_BACKUP_BUCKET missing}"   # bucket **name only**, e.g., goalcrumbs-backups-prod

DATE=$(date -u +%Y-%m-%d_%H-%M-%S)
LOCAL="/tmp/backup-${DATE}.sql.gz"
KEY="db/backup-${DATE}.sql.gz"
DEST="s3://${S3_BACKUP_BUCKET}/${KEY}"

echo "🔎 Using $(pg_dump --version)"
echo "🔄 Dumping database (UTC ${DATE})…"
PGSSLMODE=require pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$LOCAL"

echo "⬆️  Uploading to S3: $DEST"
aws s3 cp "$LOCAL" "$DEST" --only-show-errors

rm -f "$LOCAL" || true
echo "✅ Backup complete: $DEST"