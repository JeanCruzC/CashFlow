# ADR 0001: Composite Foreign Keys por Tenant

- Estado: Accepted
- Fecha: 2026-02-20

## Contexto

El esquema inicial permitia relaciones usando solo `id` en varias FK de `transactions` y `budgets`.
En un entorno multi-tenant, esto abria la posibilidad de referencias cruzadas entre organizaciones si se conocia un UUID valido.

## Decision

Aplicar integridad tenant-safe con llaves compuestas:

1. Crear indices unicos `(org_id, id)` en tablas maestras referenciadas.
2. Reemplazar FK existentes por FK compuestas `(org_id, entity_id)`.

Migracion aplicada: `supabase/migrations/007_multitenant_integrity_and_onboarding.sql`.

## Consecuencias

- Positivas:
  - Integridad de datos reforzada a nivel DB.
  - Reduccion de riesgo de fuga o mezcla de datos entre tenants.
- Costos:
  - Migracion mas compleja.
  - Mayor cuidado en inserts y upserts para incluir `org_id`.

## Alternativas consideradas

- Confiar solo en RLS y filtros en aplicacion.
  - Rechazada: no protege contra inconsistencias estructurales en DB.
