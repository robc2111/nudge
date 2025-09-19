#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE="backup-$DATE.sql.gz"

echo "🔄 Dumping database..."
PGSSLMODE=require pg_dump "$DATABASE_URL" | gzip > "/tmp/$FILE"

echo "⬆️ Uploading to S3..."
aws s3 cp "/tmp/$FILE" "s3://goalcrumbs-backups-prod/db/$FILE" --only-show-errors

echo "✅ Backup complete: $FILE"
