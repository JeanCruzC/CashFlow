# Runbook Migracion a Vercel

## Objetivo

Migrar CashFlow a Vercel con despliegue continuo, variables seguras y smoke checks automáticos.

## 1) Requisitos previos

- Node.js 20+.
- Proyecto en GitHub conectado a Vercel.
- Proyecto Supabase remoto operativo.
- Dominio final (o subdominio) definido para produccion.

## 2) Preflight local

```bash
npm run vercel:preflight
```

Este chequeo valida:

- version de Node
- presencia de `vercel.json`
- variables base de Supabase
- recomendaciones de Auth URL y Sentry

## 3) Configurar proyecto en Vercel

1. Crear/importar proyecto en Vercel desde `JeanCruzC/CashFlow`.
2. Framework: `Next.js` (auto-detectado).
3. Build command: `npm run build`.
4. Install command: `npm ci`.
5. Node version: `20.x`.

## 4) Variables de entorno en Vercel

Definir al menos:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferido) o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Recomendadas:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `APP_SITE_URL`
- `APP_REDIRECT_URLS`

Si usas `APP_SITE_URL` y `APP_REDIRECT_URLS`, sincroniza Supabase Auth:

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=... \
APP_SITE_URL=https://tu-dominio.com \
APP_REDIRECT_URLS="https://tu-dominio.com/**,https://preview-tu-app.vercel.app/**" \
npm run supabase:auth:sync
```

## 5) Variables de CI para deploy Vercel (GitHub)

Configurar en GitHub Actions secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Workflow preparado:

- `.github/workflows/deploy-vercel.yml`

Comportamiento:

- Pull Request a `main`: deploy `preview` + smoke check.
- Push a `main`: deploy `production` + smoke check.
- `workflow_dispatch`: deploy manual `preview` o `production`.

## 6) Deploy manual desde terminal (opcional)

Primera vez:

```bash
npx vercel link
```

Deploy preview:

```bash
npm run vercel:deploy:preview
```

Deploy production:

```bash
npm run vercel:deploy:prod
```

## 7) Validacion post deploy

Smoke check:

```bash
SMOKE_BASE_URL=https://tu-url.vercel.app npm run smoke:check
```

Prueba funcional minima:

- `/`
- `/login`
- `/register`
- flujo onboarding -> `/dashboard`

## 8) Rollback operativo

Opciones:

1. Promover un deployment previo desde el dashboard de Vercel.
2. Re-disparar deploy desde un commit estable.

Despues del rollback:

```bash
SMOKE_BASE_URL=https://tu-dominio.com npm run smoke:check
```

## 9) Checklist de cierre

- CI verde (`quality-gate`, `UX Audit` y `Deploy Vercel`).
- Auth redirection validado en Supabase.
- Dashboard y modulos internos navegables sin errores.
- Sentry (si aplica) recibiendo eventos.
