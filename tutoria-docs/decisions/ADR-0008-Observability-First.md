# ADR-0008: Observability First

## Contexto
En arquitecturas distribuidas basadas en Eventos e IA, es imposible "debuguear" un error preguntando "qué falló". Cuando una sugerencia pedagógica resulta equivocada o extraña, se requiere saber exactamente con qué prompt, contexto, chunks documentales y parámetros se hizo la inferencia milisegundos atrás.

## Decisión
Diseñar el sistema asumiendo que cada transacción, token gastado y decisión de la IA debe emitir telemetría estructurada. 

## Alternativas consideradas
- *Logging tradicional:* Escribir simple texto al archivo de logs ("Error en AI"). Rechazado por inútil para la minería de datos KOS.

## Ventajas
- Visibilidad cristalina del gasto económico (FinOps) de cada Tenant en APIs de IA.
- Trazabilidad perfecta para auditorías institucionales y peritajes legales.

## Riesgos
- Elevado volumen de almacenamiento para los logs. Costos de retención de telemetría.

## Consecuencias
- El SDK o módulos de integración de IA siempre inyectarán IDs de trazabilidad cruzados (TraceIDs) y registrarán el `PromptExecution` para el análisis a posteriori.
