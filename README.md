# CashFlow

Aplicación financiera para gestión personal y empresarial con Next.js + Supabase.

## Documentación técnica (Fase 4)

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

## Requisitos

- Node.js 18+
- npm
- Variables de entorno de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Desarrollo

```bash
npm install
npm run dev
```

## Calidad

```bash
npm run lint
npm run typecheck
npm run build
```

## Quality Gate (Fase 5)

```bash
npm run check:migrations
npm run test:coverage:critical
npm run ci:quality
```

CI en GitHub: `.github/workflows/ci.yml`

## Testing (Fase 3)

### Unit tests (Vitest + RTL)

```bash
npm run test
# o
npm run test:unit
```

### Suite completa de Vitest (unit + integration)

```bash
npm run test:all
```

### Coverage

```bash
npm run test:coverage
```

### Integration tests con DB de prueba (Supabase)

```bash
npm run test:integration
```

Variables esperadas para habilitar integración real:

- `TEST_SUPABASE_URL` (opcional, fallback a `NEXT_PUBLIC_SUPABASE_URL`)
- `TEST_SUPABASE_ANON_KEY` (opcional, fallback a `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `TEST_USER_EMAIL` (requerida)
- `TEST_USER_PASSWORD` (requerida)

Si faltan variables, los tests de integración se marcan como `skipped`.

### E2E con Playwright

```bash
npm run test:e2e:install
npm run test:e2e
```

Smoke test público:

```bash
npm run test:e2e -- tests/e2e/public-smoke.spec.ts
```

Flujo completo opcional (auth + onboarding + transacciones):

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

Si no están definidos, ese archivo e2e se omite automáticamente.
