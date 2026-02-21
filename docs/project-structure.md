# Estructura y Orden del Repositorio

## Arbol principal

```text
app/                    # Rutas Next.js + Server Actions
components/             # UI y componentes de dominio
lib/                    # utilidades, tipos, validaciones, servicios server
supabase/migrations/    # esquema SQL versionado
tests/                  # unit, integration, e2e
menu.sh                 # menu operativo para servicios en local
docs/                   # documentacion tecnica y operativa
vercel.json             # configuracion de plataforma Vercel
```

## Convenciones de ubicacion

- `app/actions/*`: acciones server por dominio (transactions, onboarding, etc).
- `lib/server/*`: logica de servidor reutilizable y contexto de seguridad.
- `lib/supabase/*`: clientes y middleware de Supabase.
- `components/ui/*`: componentes base reutilizables.
- `components/<dominio>/*`: componentes del dominio funcional.
- `tests/unit/*`: pruebas unitarias y de componentes.
- `tests/integration/*`: pruebas con DB real o servicios externos.
- `tests/e2e/*`: pruebas de flujos de usuario.
- `docs/adr/*`: decisiones arquitectonicas.
- `docs/runbooks/*`: procedimientos de operacion.
- `.github/workflows/deploy-vercel.yml`: deploy preview/production en Vercel.
- `scripts/vercel-preflight.mjs`: validaciones previas de migracion.

## Reglas de orden

- No mezclar logica de negocio compleja dentro de componentes UI.
- Toda mutacion de datos debe pasar por Server Actions o servicios server.
- Toda consulta/mutacion por tenant debe filtrar por `org_id`.
- Cambios de esquema solo via `supabase/migrations/*`.
- Archivos generados de runtime deben permanecer fuera de git (`.run/`, `coverage/`, `playwright-report/`, `test-results/`).

## Naming recomendado

- Archivos TS/TSX: `kebab-case` por feature (`transaction-form.tsx`) o mantener convencion existente por modulo.
- Tipos e interfaces: `PascalCase`.
- Funciones: verbos claros (`createTransaction`, `getBudgetOverview`).
- Variables de entorno:
  - App runtime: `NEXT_PUBLIC_*`
  - Test integration/e2e: `TEST_*`, `E2E_*`

## Acoplamientos permitidos

- `app/*` puede depender de `components/*`, `lib/*`, `app/actions/*`.
- `components/*` no debe depender de `supabase/migrations/*`.
- `lib/server/*` no debe depender de componentes React.
- `tests/*` puede mockear cualquier capa, pero no debe redefinir logica de negocio en duplicado.
