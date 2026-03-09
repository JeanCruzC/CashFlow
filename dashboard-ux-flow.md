# Dashboard UX Flow

## Goal
Hacer que el dashboard personal sea mas claro, operativo y automatico para validar depositos y pagos esperados.

## Tasks
- [ ] Revisar dashboard, transacciones y reglas actuales del ciclo -> Verify: identificar donde se calculan agenda, saldos y fechas esperadas.
- [ ] Diseñar un flujo operativo para detectar eventos confirmados, vencidos y reprogramados -> Verify: tener reglas claras para ingresos, tarjetas y suscripciones.
- [ ] Implementar nueva lectura automatica del estado de cada evento esperado -> Verify: cada evento del dashboard muestra estado, evidencia y siguiente accion.
- [ ] Rediseñar la vista principal para separar dinero disponible, alertas, agenda y plan del mes -> Verify: el dashboard tiene jerarquia visual y acciones claras.
- [ ] Ajustar tema visual para que modulos y llamadas a la accion se distingan mejor -> Verify: sidebar, hero y tarjetas usan mejor contraste y color.
- [ ] Validar con pruebas y recorrido manual del dashboard -> Verify: `npm run test -- --runInBand` o pruebas focalizadas pasan y la UI carga en local.

## Done When
- [ ] El dashboard diferencia claramente que ya paso, que falta confirmar y que se reprogramo.
- [ ] El flujo diario comunica mejor donde registrar movimientos y que impacto tienen.
