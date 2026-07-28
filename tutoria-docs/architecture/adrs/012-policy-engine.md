# ADR 012: Policy Engine as a Pure Domain Component

**Status:** ACCEPTED
**Date:** 2026-07-27

## Contexto
TutorIA requiere abstraer cientos de validaciones y normativas (WAVE 8A: Policy Intelligence). Incluirlas dentro de los agregados (ej. `PedagogicalPlan`) inflaría las clases y rompería el principio de responsabilidad única (SRP), además de impedir generar reportes estandarizados de validación.

## Decisión
Hemos decidido construir un **Policy Intelligence Engine** completamente puro y genérico:
1. Basado en el contrato `PolicyEngine<TContext>`.
2. Los errores se comunican estrictamente mediante `PolicyCode` (Value Object) y `messageKey` (internacionalización delegada a UI).
3. Existen severidades explícitas (INFO, WARNING, ERROR, BLOCKING).

## Consecuencias
**Positivas:**
- Alta reutilización del motor en otros módulos (Enrollment, Attendance).
- Las traducciones y formateo viven en la presentación, no en el dominio.
- Pruebas exhaustivas por cada regla aislada (Unit) y del motor completo (Integration).

**Negativas:**
- Mayor verbosidad inicial al requerir crear clases e interfaces (Contextos, Reportes, Códigos) en lugar de un simple `if (!valid) throw new Error()`.\n