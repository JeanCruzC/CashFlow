# CashFlow

Aplicación financiera para gestión personal y empresarial con Next.js + Supabase.

## Estado del plan técnico

- Fase 1-5 de estabilización, escalabilidad, testing, documentación y CI: **FINALIZADA**.
- Cierre operativo de Supabase remoto registrado el **21 de febrero de 2026**.
- Evidencia y detalle técnico: `SUPABASE_COMPLETADO.md`.

## Estado actual del producto

Módulos disponibles:

- Dashboard con KPIs sobre datos reales.
- Transacciones: listado, búsqueda, filtros, creación, edición, eliminación, import/export CSV.
- Cuentas: alta y listado.
- Categorías: alta y listado.
- Presupuesto mensual: overview + set budget.
- Forecast: supuestos mensuales.
- Settings: configuración de organización.

## Requisitos

- Node.js 18+
- npm
- Variables de entorno de Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (recomendado) o `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy)
  - `SUPABASE_SERVICE_ROLE_KEY` (opcional, recomendado para validaciones remotas completas)

## Desarrollo

```bash
npm install
npm run dev
```

## Calidad

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Quality gate completo:

```bash
npm run ci:quality
```

## Testing

Unit:

```bash
npm run test:unit
```

Integración (Supabase real):

```bash
npm run test:integration
```

E2E:

```bash
npm run test:e2e:smoke
npm run test:e2e:a11y
npm run test:e2e:auth
```

Variables opcionales para suite e2e completa:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

## Operación

Smoke checks:

```bash
SMOKE_BASE_URL=https://tu-dominio.com npm run smoke:check
```

Validación de Supabase remoto (tablas/RPC/auth):

```bash
npm run supabase:check:remote
```

Aplicar migraciones remotas + validar esquema:

```bash
SUPABASE_PROJECT_REF=udzhirqwiyihnxpxtscr \
SUPABASE_DB_PASSWORD=... \
SUPABASE_ACCESS_TOKEN=... \
npm run supabase:migrate:remote
```

Sincronizar Auth config (Site URL + redirect URLs) vía Management API:

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=udzhirqwiyihnxpxtscr \
APP_SITE_URL=http://127.0.0.1:3001 \
APP_REDIRECT_URLS="http://127.0.0.1:3001/**,http://localhost:3001/**" \
npm run supabase:auth:sync
```

Seed de fixtures de prueba:

```bash
npm run seed:test
```

Backup/restore:

```bash
npm run ops:backup
npm run ops:restore -- backups/archivo.sql
```

## CI/CD y seguridad

- CI principal: `.github/workflows/ci.yml`
  - `quality-gate`
  - `test-integration`
  - `test-e2e`
  - `dependency-review`
  - `secret-scan`
- Deploy: `.github/workflows/deploy.yml` (staging + production + rollback por smoke).
- Auditoría UX: `.github/workflows/ux-audit.yml` (Lighthouse + Playwright a11y).

## Documentación técnica

- `docs/README.md`
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/project-structure.md`
- `docs/runbooks/local.md`
- `docs/runbooks/production.md`
- `docs/branch-protection.md`
- `docs/adr/README.md`
- `docs/contributing.md`
- `docs/pr-checklist.md`
