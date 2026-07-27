# ADR-002: Shared Kernel

**Estado:** Aprobado  
**Contexto:** Necesidad de elementos base reutilizables (Ids, Resultados, ValueObjects, Clock) entre múltiples bounded contexts.  
**Decisión:** Consolidar estos elementos en un módulo central y puro llamado `Shared Kernel`.  
**Consecuencias:** Se previene la duplicidad de abstracciones genéricas.
