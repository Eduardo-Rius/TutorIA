# ADR 016: Capability Registry

**Status:** PROPOSED
**Date:** 2026-07-28

## Contexto
Conforme aparezcan nuevas capacidades generativas (`GenerateActivities`, `ReviewPlanning`), definirlas in-line dispersará el conocimiento del negocio.

## Decisión
Se establece la intención de crear un `CapabilityRegistry` que concentre las configuraciones de todas las `GenerativeCapability` (restricciones, perfil de inferencia, formato esperado y contexto requerido).

## Consecuencias
- Centralización del gobierno pedagógico de la IA en un solo módulo.
- Facilita la configuración y modificación de capacidades por expertos en pedagogía en lugar de ingenieros de software.
