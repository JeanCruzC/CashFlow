# ADR 0002: Onboarding Atomico con RPC SQL

- Estado: Accepted
- Fecha: 2026-02-20

## Contexto

El flujo de onboarding creaba datos en multiples pasos desde aplicacion (org, membership, seeds).
Si fallaba un paso intermedio, quedaban datos parciales y estado inconsistente.

## Decision

Centralizar el onboarding en una funcion SQL atomica:

- Funcion: `create_org_with_onboarding(...)`
- Ubicacion: `supabase/migrations/007_multitenant_integrity_and_onboarding.sql`
- Invocacion desde app:
  - `lib/server/onboarding.ts` -> `createOrganizationWithOnboarding`
  - `app/actions/onboarding.ts` -> `createProfileOrganization`

La funcion crea en una sola transaccion:

1. `orgs`
2. `org_members` con rol owner
3. `onboarding_state`
4. seed de categorias (y cost centers para business)

## Consecuencias

- Positivas:
  - Estado consistente post-onboarding.
  - Menor logica transaccional en frontend/server actions.
- Costos:
  - Mayor dependencia en SQL y versionado de migraciones.
  - Necesidad de pruebas de integracion DB.

## Alternativas consideradas

- Mantener onboarding en varios inserts desde app.
  - Rechazada por riesgo de parcialidad y manejo de errores mas complejo.
