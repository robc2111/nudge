#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL missing}"

DATE=$(date -u +%Y-%m-%d_%H-%M-%S)
FILE="/tmp/backup-${DATE}.sql.gz"

echo "🔎 Using $(pg_dump --version)"
echo "🔄 Dumping database (UTC ${DATE})…"
PGSSLMODE=require pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$FILE"

S3_URI="${S3_BACKUP_BUCKET:?S3_BACKUP_BUCKET missing}/db/backup-${DATE}.sql.gz"
echo "⬆️  Uploading to S3: $S3_URI"
aws s3 cp "$FILE" "$S3_URI" --only-show-errors

rm -f "$FILE" || true
echo "✅ Backup complete"