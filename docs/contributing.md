# Guia de Contribucion

## Flujo recomendado

1. Crear rama desde `main`.
2. Implementar cambio en bloques pequenos y coherentes.
3. Agregar/ajustar pruebas segun impacto.
4. Ejecutar checks locales.
5. Abrir PR usando el checklist.

## Reglas de codigo

- No romper aislamiento multi-tenant:
  - toda query de dominio debe filtrar por `org_id`.
- Evitar logica de negocio en UI.
- Reusar `lib/server/context.ts` para resolver usuario y organizacion.
- Cambios de esquema solo con nuevas migraciones en `supabase/migrations`.
- No commitear artefactos de runtime o secretos.

## Pruebas requeridas por tipo de cambio

- Cambio UI sin negocio:
  - unit/component tests si aplica
- Cambio de acciones server:
  - unit tests en `tests/unit/app/actions/*`
- Cambio de logica SQL/seguridad:
  - integration tests en `tests/integration/*`
- Flujo usuario critico:
  - e2e en `tests/e2e/*` o actualizacion de smoke checks

## Comandos minimos antes de PR

```bash
npm run check:migrations
npm run lint
npm run typecheck
npm run test
npm run test:coverage:critical
npm run build
```

Si tocaste DB o flujo auth/onboarding:

```bash
npm run test:integration
npm run test:e2e
```

## Documentacion obligatoria

Debes actualizar docs cuando cambies:

- Arquitectura o limites de capas -> `docs/architecture.md`
- Esquema o invariantes -> `docs/data-model.md`
- Decisiones tecnicas clave -> nuevo archivo en `docs/adr/*`
- Operacion local/prod -> `docs/runbooks/*`
