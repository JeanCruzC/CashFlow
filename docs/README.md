# Documentacion Tecnica de CashFlow

Este directorio centraliza la documentacion de arquitectura, decisiones tecnicas, operacion y colaboracion del proyecto.

## Estado de fases

- Fase 1-5 de estabilización y CI: **cerrada y finalizada** (21 de febrero de 2026).
- Integración cloud de Supabase completada: `SUPABASE_COMPLETADO.md`.

## Mapa de documentos

- `docs/architecture.md`: arquitectura de alto nivel, limites de capas y flujos clave.
- `docs/data-model.md`: modelo de datos y reglas de integridad multi-tenant.
- `docs/project-structure.md`: estructura de carpetas y convenciones de orden.
- `docs/runbooks/local.md`: runbook de entorno local y operaciones de desarrollo.
- `docs/runbooks/production.md`: runbook de despliegue y operacion en produccion.
- `docs/branch-protection.md`: reglas recomendadas de proteccion de rama en GitHub.
- `docs/adr/README.md`: indice de ADRs y formato.
- `docs/contributing.md`: guia para contribuir.
- `docs/pr-checklist.md`: checklist de PR.

## Alcance

La documentacion describe el estado real del repositorio en la fecha de actualizacion.
Si cambias arquitectura, esquema, flujo de despliegue o convenciones, debes actualizar estos archivos en la misma PR.

Workflows operativos relevantes:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/ux-audit.yml`
