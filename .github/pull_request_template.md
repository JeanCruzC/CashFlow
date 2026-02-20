## Resumen

Describe el objetivo de la PR y el problema que resuelve.

## Cambios principales

- 

## Evidencia

- [ ] `npm run check:migrations`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:coverage:critical`
- [ ] `npm run build`
- [ ] (Si aplica) `npm run test:integration`
- [ ] (Si aplica) `npm run test:e2e`

Incluye salidas relevantes o capturas cuando sea util.

## Checklist rapido

- [ ] Mantengo filtros y relaciones por `org_id` (multi-tenant safe)
- [ ] Si toque DB, agregue migracion nueva en `supabase/migrations`
- [ ] Si toque flujos criticos, actualice pruebas
- [ ] Si toque arquitectura/operacion, actualice `docs/`

## Riesgos y rollback

- Riesgo principal:
- Plan de rollback:
