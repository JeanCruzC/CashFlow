# Runbook Produccion

## Objetivo

Estandarizar despliegues y operacion de CashFlow en produccion con foco en seguridad multi-tenant y estabilidad.

## 1) Prerrequisitos

- Proyecto Supabase productivo con acceso administrativo.
- Plataforma de despliegue para Next.js (ejemplo: Vercel, contenedor o similar).
- Variables de entorno productivas cargadas.

Variables minimas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Variables adicionales segun operacion:

- `SUPABASE_SERVICE_ROLE_KEY` (solo procesos server-side que lo requieran)

## 2) Pre-deploy checklist

Ejecutar en rama candidata:

```bash
npm ci
npm run lint
npm run test
npm run build
```

Opcional recomendado:

```bash
npm run test:integration
npm run test:e2e
```

## 3) Orden de despliegue recomendado

1. Aplicar migraciones en Supabase.
2. Desplegar aplicacion Next.js.
3. Ejecutar smoke checks de rutas publicas y auth.
4. Verificar dashboard y modulo de transacciones.

## 4) Aplicacion de migraciones

Con pipeline o operador autorizado:

```bash
supabase db push
```

Regla: nunca editar migraciones ya aplicadas. Usa una nueva migracion incremental.

## 5) Smoke checks post-deploy

- Home publica (`/`)
- Login (`/login`)
- Register (`/register`)
- Flujo auth -> `/dashboard`
- Alta de transaccion y listado

## 6) Monitoreo minimo

- Logs de aplicacion Next.js (errores 5xx, timeouts)
- Logs de Auth en Supabase
- Errores SQL/RLS en operaciones criticas:
  - onboarding
  - transacciones
  - presupuesto

## 7) Manejo de incidentes

## Error funcional post-deploy

1. Confirmar alcance y reproducibilidad.
2. Revisar cambios de app y migraciones del release.
3. Si el fallo es de app, rollback a artefacto previo.
4. Si el fallo es de esquema, crear migracion correctiva (no editar historial).

## Degradacion por DB/politicas RLS

1. Revisar politicas y constraints afectadas.
2. Validar query exacta que falla y tenant involucrado.
3. Aplicar parche con migracion versionada y validar en staging.

## 8) Politica de rollback

- App: redeploy de version anterior estable.
- DB: migracion compensatoria versionada.
- Siempre documentar:
  - causa raiz
  - tiempo de deteccion
  - tiempo de resolucion
  - acciones preventivas
