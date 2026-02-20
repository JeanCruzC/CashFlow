# Runbook Produccion

## Objetivo

Estandarizar despliegues y operacion de CashFlow con foco en continuidad, seguridad multi-tenant y rollback controlado.

## 1) Prerrequisitos

- Proyecto Supabase productivo con acceso administrativo.
- Plataforma de despliegue para Next.js (Vercel, contenedor u otro).
- GitHub Actions configurado con secretos operativos.

Variables minimas de app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SENTRY_DSN` (opcional, recomendado)

Secretos recomendados para pipeline de deploy (`.github/workflows/deploy.yml`):

- `DEPLOY_WEBHOOK_STAGING`
- `STAGING_BASE_URL`
- `DEPLOY_WEBHOOK_PRODUCTION`
- `PRODUCTION_BASE_URL`
- `ROLLBACK_WEBHOOK_PRODUCTION`

## 2) Pipeline de despliegue

Workflow: `.github/workflows/deploy.yml`

- Push a `main`: ejecuta quality gate + deploy staging + smoke staging.
- `workflow_dispatch`: permite deploy a `staging`, `production` o `both`.
- Si falla smoke en producción, dispara rollback automático vía webhook.

## 3) Pre-deploy checklist

```bash
npm ci
npm run ci:quality
npm run test:integration
npm run test:e2e:smoke
```

## 4) Migraciones de base de datos

```bash
supabase db push
```

Regla: nunca editar migraciones aplicadas. Siempre crear una migracion incremental.

## 5) Smoke checks post-deploy

Script oficial:

```bash
SMOKE_BASE_URL=https://tu-dominio.com npm run smoke:check
```

Rutas por defecto:

- `/`
- `/login`
- `/register`

## 6) Observabilidad y alertas

- Logging estructurado server-side: `lib/server/logger.ts`.
- Error tracking opcional: Sentry (`sentry.*.config.ts`, `instrumentation.ts`).
- Alertas recomendadas:
  - tasa de errores 5xx
  - fallos de onboarding/transacciones
  - fallos en `quality-gate` y `test-e2e`

## 7) Seguridad operativa

- Security headers activos en `next.config.mjs` (CSP/HSTS/XFO/etc).
- Rate limiting en acciones sensibles (`lib/server/rate-limit.ts`).
- CI con `dependency-review` + `gitleaks`.

## 8) Backup y restore

Backup:

```bash
npm run ops:backup
```

Restore (requiere `SUPABASE_DB_URL`):

```bash
npm run ops:restore -- backups/cashflow-YYYYMMDD-HHMMSS.sql
```

Politica recomendada:

- backup diario automático
- retencion mínima 14 días
- prueba mensual de restore en entorno staging

## 9) Manejo de incidentes

1. Confirmar alcance y reproducibilidad.
2. Verificar logs estructurados + Sentry.
3. Si falla app: rollback de artefacto.
4. Si falla esquema: migracion compensatoria versionada.
5. Documentar causa raiz, tiempo de deteccion y acciones preventivas.
