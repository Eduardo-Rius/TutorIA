# ADR 015: Hypothesis Review Workflow

**Status:** PROPOSED
**Date:** 2026-07-28

## Contexto
El principio de "IA Asistencial" dicta que la Inteligencia no decide, sino que propone. Por ende, toda `GenerativeHypothesis` necesita eventualmente someterse a evaluación humana.

## Decisión
Se registra el concepto arquitectónico de un Workflow de Revisión donde una hipótesis pasará por los estados `Accepted`, `Rejected`, o `Edited`. Este modelo permitirá retroalimentar el sistema para auditoría y aprendizaje.

## Consecuencias
- Preparación para capacidades de "Human in the loop" explícitas.
- Se requerirá un mecanismo de almacenamiento a largo plazo de las hipótesis y su resolución (Operational Intelligence).
