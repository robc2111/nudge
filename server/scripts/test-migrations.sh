#!/usr/bin/env bash
# server/scripts/test-migrations.sh
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is not set. Export it or add it to your .env."
  exit 1
fi

# Random sandbox schema name to avoid collisions
STAMP=$(date +%s)
RAND=$RANDOM
SCHEMA="_migrate_sandbox_${STAMP}_${RAND}"
MIGR_TBL="_pgm_${STAMP}_${RAND}"

echo "🧪 Using sandbox schema: ${SCHEMA}"
export PGM_SCHEMA="${SCHEMA}"
export PGM_MIGRATIONS_TBL="${MIGR_TBL}"

# 1) Create the schema (node-pg-migrate can create it with --create-schema,
#    but we'll pre-create it explicitly for clarity)
echo "🏗️  Creating schema ${SCHEMA}..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA IF NOT EXISTS ${SCHEMA};"

# 2) Apply all migrations UP into sandbox
echo "⬆️  Running migrations UP into ${SCHEMA}..."
npx node-pg-migrate up --create-schema

# 3) Show status (should list them as applied… in this schema)
echo "📋 Migration STATUS in ${SCHEMA}:"
npx node-pg-migrate status

# 4) Roll DOWN everything we just applied
echo "⬇️  Rolling migrations DOWN in ${SCHEMA}..."
npx node-pg-migrate down

# 5) Drop the sandbox schema
echo "🧹 Dropping schema ${SCHEMA}..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;"

echo "✅ Test complete (up → status → down → drop). Your real schema was untouched."