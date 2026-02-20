#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${1:-$BACKUP_DIR/cashflow-${TIMESTAMP}.sql}"

mkdir -p "$(dirname "$OUTPUT_FILE")"

if ! command -v supabase >/dev/null 2>&1; then
  echo "No se encontró la CLI de Supabase. Instálala antes de ejecutar backup."
  exit 1
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  supabase db dump --db-url "$SUPABASE_DB_URL" -f "$OUTPUT_FILE"
elif [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  supabase db dump --project-ref "$SUPABASE_PROJECT_REF" -f "$OUTPUT_FILE"
else
  echo "Define SUPABASE_DB_URL o SUPABASE_PROJECT_REF para ejecutar backup."
  exit 1
fi

echo "Backup generado: $OUTPUT_FILE"
