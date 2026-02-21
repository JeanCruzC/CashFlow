#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env.local"
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if [[ -z "$PROJECT_REF" ]]; then
  echo "Falta SUPABASE_PROJECT_REF."
  echo "Ejemplo: SUPABASE_PROJECT_REF=udzhirqwiyihnxpxtscr SUPABASE_DB_PASSWORD=... npm run supabase:migrate:remote"
  exit 1
fi

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Falta SUPABASE_DB_PASSWORD (password de Postgres remoto)."
  echo "Configuralo en entorno o .env.local para ejecutar migraciones."
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Advertencia: SUPABASE_ACCESS_TOKEN no definido."
  echo "Si 'supabase link' pide login, define SUPABASE_ACCESS_TOKEN para modo no interactivo."
fi

echo "Linking proyecto Supabase remoto: $PROJECT_REF"
npx --yes supabase@latest link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"

echo "Aplicando migraciones remotas..."
npx --yes supabase@latest db push --include-all --yes --password "$DB_PASSWORD"

echo "Validando esquema remoto..."
npm run supabase:check:remote

echo "Migraciones remotas aplicadas y validadas."
