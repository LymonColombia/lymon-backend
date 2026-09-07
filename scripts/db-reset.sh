#!/usr/bin/env bash
# Rebuilds the local Postgres from postgres-schema.sql, re-introspects it into
# prisma/schema.prisma, refreshes the 0_init baseline and regenerates the client.
# Run after editing the SQL schema. Requires Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
SQL_DIR=src/infrastructure/migrations/sql

docker compose -f "$SQL_DIR/docker-compose.yml" down -v >/dev/null
docker compose -f "$SQL_DIR/docker-compose.yml" up -d --wait >/dev/null

docker exec -i lymon-pg psql -U lymon -d lymon -v ON_ERROR_STOP=1 \
  < "$SQL_DIR/schema-smoke.sql" | grep -q 'SMOKE OK'
echo "smoke: OK"

pnpm exec prisma db pull >/dev/null
{
  echo "-- Baseline for LYMON-1128. Copied verbatim from"
  echo "-- $SQL_DIR/postgres-schema.sql (minus its BEGIN/COMMIT, which Prisma supplies)."
  echo "-- Keeps CHECK constraints in migration history, where schema.prisma cannot"
  echo "-- express them, so the shadow database matches the real one."
  echo
  grep -v '^BEGIN;$\|^COMMIT;$' "$SQL_DIR/postgres-schema.sql"
} > prisma/migrations/0_init/migration.sql
pnpm exec prisma migrate resolve --applied 0_init >/dev/null 2>&1 || true
pnpm exec prisma generate >/dev/null
echo "schema.prisma + client: regenerated"
