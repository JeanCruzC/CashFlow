#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Uso: ./scripts/restore-supabase.sh <archivo-backup.sql>"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "No existe el archivo: $BACKUP_FILE"
  exit 1
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Define SUPABASE_DB_URL para restaurar el backup."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "No se encontró psql. Instálalo antes de restaurar."
  exit 1
fi

echo "Se restaurará el backup sobre la base indicada en SUPABASE_DB_URL."
echo "Archivo: $BACKUP_FILE"
read -r -p "Escribe RESTORE para continuar: " CONFIRM

if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "Operación cancelada."
  exit 1
fi

psql "$SUPABASE_DB_URL" -f "$BACKUP_FILE"
echo "Restore completado."
