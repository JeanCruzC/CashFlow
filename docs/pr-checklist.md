# PR Checklist

Marca cada punto antes de solicitar review.

- [ ] El cambio esta acotado a un objetivo claro.
- [ ] No rompo rutas existentes ni flujo de onboarding/dashboard.
- [ ] Mantengo aislamiento multi-tenant (`org_id`) en queries/mutaciones.
- [ ] Si toque DB, agregue migracion nueva en `supabase/migrations`.
- [ ] Si toque seguridad/RLS/FK, agregue o actualice tests de integracion.
- [ ] Agregue/actualice tests unitarios de logica afectada.
- [ ] Ejecute `npm run check:migrations`.
- [ ] Ejecute `npm run lint`.
- [ ] Ejecute `npm run typecheck`.
- [ ] Ejecute `npm run test`.
- [ ] Ejecute `npm run test:coverage:critical`.
- [ ] Ejecute `npm run build`.
- [ ] Actualice documentacion en `docs/` cuando correspondia.
- [ ] No subi secretos ni archivos de runtime.

## Contexto del cambio

- Tipo: `feature | fix | refactor | docs | chore`
- Modulos afectados:
- Riesgo de regresion:
- Plan de rollback:
