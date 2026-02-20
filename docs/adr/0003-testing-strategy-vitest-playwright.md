# ADR 0003: Estrategia de Testing en 3 Niveles

- Estado: Accepted
- Fecha: 2026-02-20

## Contexto

El proyecto no tenia una suite de pruebas formal.
Solo compilar/lint no cubria regresiones de logica, seguridad ni flujo de usuario.

## Decision

Adoptar una estrategia de testing por capas:

1. Unit + component tests:
   - Framework: Vitest + RTL
   - Cobertura de acciones server y componentes criticos
2. Integration tests:
   - Vitest + Supabase real (condicional por variables de entorno)
   - Validacion de onboarding atomico y FK multi-tenant
3. E2E tests:
   - Playwright
   - Smoke publico + flujo autenticado opcional

Scripts estandarizados en `package.json`:

- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:all`
- `npm run test:coverage`
- `npm run test:e2e`

## Consecuencias

- Positivas:
  - Mejor deteccion temprana de regresiones.
  - Base para Fase 5 (CI y branch protection).
- Costos:
  - Mayor tiempo de mantenimiento de tests.
  - Dependencia de datos de prueba para integracion/e2e full.

## Alternativas consideradas

- Solo tests e2e.
  - Rechazada: feedback lento y poca precison para aislar fallos.
- Solo unit tests.
  - Rechazada: no valida restricciones reales de DB ni flujos completos.
