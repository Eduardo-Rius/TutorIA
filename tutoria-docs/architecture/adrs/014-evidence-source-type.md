# ADR 014: Evidence Source Type

**Status:** PROPOSED
**Date:** 2026-07-28

## Contexto
Durante WAVE 8C, surgió la necesidad de trazar exactamente de dónde extrae la inteligencia generativa sus conclusiones. Utilizar cadenas libres (`string`) para la fuente abre la puerta a inconsistencias (ej. "Policy", "policy", "institucional").

## Decisión
Se introduce un Enum/Value Object `EvidenceSourceType` en el dominio de Generative Intelligence, forzando a que las fuentes se categoricen bajo taxonomías institucionales conocidas (ej. `InstitutionalPolicy`, `PreviousPlanning`, `StudentHistory`).

## Consecuencias
- Mayor rigurosidad en trazabilidad.
- Obliga a los proveedores de infraestructura a mapear sus fuentes reales hacia estos tipos al momento de ensamblar la evidencia de la hipótesis.
