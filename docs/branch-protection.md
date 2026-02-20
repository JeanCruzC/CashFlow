# Branch Protection (GitHub)

Este proyecto no puede auto-configurar branch protection desde codigo puro.
Se debe aplicar en GitHub repository settings.

## Rama objetivo

- `main`

## Reglas recomendadas

- Require a pull request before merging.
- Require approvals: minimo 1.
- Dismiss stale pull request approvals when new commits are pushed.
- Require status checks to pass before merging.
- Require conversation resolution before merging.
- Require branches to be up to date before merging.
- Restrict force pushes.
- Restrict branch deletion.

## Status checks requeridos

Workflow: `CI`

Job requerido:

- `quality-gate`

El job `quality-gate` ejecuta:

1. `npm run check:migrations`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run test:coverage:critical`
6. `npm run build`

## Cobertura minima (modulos criticos)

La cobertura critica se valida con `vitest.critical.config.ts`.
Modulos protegidos:

- `app/actions/onboarding.ts`
- `app/actions/transactions.ts`
- `lib/server/onboarding.ts`

Umbrales minimos por archivo:

- Lines: 90
- Functions: 90
- Statements: 90
- Branches: 80
