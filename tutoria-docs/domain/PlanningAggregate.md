# Tactical Domain Design: Planning Aggregate

**Status:** PENDING TACTICAL REVIEW
**Wave:** WAVE 7

Este documento define la estructura técnica interna del Motor de Planeación Pedagógica (Pedagogical Planning Engine). No define interfaces gráficas ni bases de datos, sino los modelos tácticos de software (Domain-Driven Design) que gobernarán el módulo.

---

## 1. Aggregate Root
**`PedagogicalPlan`**
Es la raíz del agregado. Toda manipulación de intenciones, actividades, versiones o estados ocurre obligatoriamente a través de esta entidad. El ID de la planeación es único y permanente, sin importar cuántas versiones existan.

## 2. Entities (Entidades Internas)
- **`PlanningVersion`**: Una iteración específica dentro del ciclo de vida de la planeación (ej. v1, v2). Las planeaciones no se sobreescriben al ser aprobadas o modificadas, se genera una nueva versión.
- **`PlanningIntent`**: El objetivo o meta pedagógica. Se separa deliberadamente de las actividades. Una intención (ej. "Desarrollar motricidad fina") puede materializarse en múltiples actividades.
- **`Activity`**: La implementación de una intención. Contiene secuencia, recursos necesarios y tiempos estimados.

## 3. Value Objects (Objetos de Valor Inmutables)
- **`PlanStatus`**: Estado en la máquina: `DRAFT` | `READY_FOR_REVIEW` | `UNDER_REVIEW` | `REJECTED` | `APPROVED` | `ARCHIVED`.
- **`PlanningSnapshot`**: Captura congelada (frozen) del contexto institucional al momento de la aprobación. Contiene: Normativa utilizada, catálogo de aprendizajes vigentes y versión de las plantillas. Evita que un cambio en la normativa global altere retroactivamente el significado de una planeación histórica.
- **`ReviewOutcome`**: El resultado estructurado de una revisión pedagógica. Contiene `score`, `findings`, `recommendations`, `blockingIssues`, `warnings`, `generatedAt`, `reviewProvider`.
- **`RejectionReason`**: Nota estructurada indicando por qué una versión volvió a `REJECTED` o `RETURNED_FOR_CORRECTION`.
- **`AuthorSignature`** y **`ApprovalSignature`**: Sellos criptográficos/operacionales separados semánticamente para el Autor y el Aprobador.

## 4. Domain Events (Eventos de Dominio)
Emitidos por el Agregado cuando ocurren transiciones importantes:
- `PlanCreated`: (Detona inicio de ciclo).
- `PlanReadyForReview`: (El autor ha marcado que terminó su trabajo; puede encolarse para revisión).
- `PlanSubmittedForReview`: (Efectivamente asignado al `WorkQueue` de un Director).
- `PlanningValidationFailed`: (Evento de dominio por rechazo automático de reglas, ej. fechas solapadas, carencia de contexto).
- `PlanReturnedForCorrection`: (El aprobador devolvió el documento por falta de información, sin implicar un rechazo cualitativo).
- `PlanRejected`: (El aprobador devolvió el documento por calidad o errores críticos).
- `PlanApproved`: (Sella la versión actual y congela el `PlanningSnapshot`).
- `PlanAmended`: (Se generó una versión mayor posterior a una aprobación por motivos excepcionales).

## 5. Invariants (Reglas de Negocio Irrompibles)
1. **Separation of Duties (SoD):** El `AuthorIdentityID` NUNCA puede ser igual al `ApproverIdentityID` en la misma versión.
2. **Inmutabilidad Post-Aprobación:** Si el estado es `APPROVED` o `ARCHIVED`, la lista de `PlanningIntent` y `Activity` está sellada (congelada). Intentar mutarlos arrojará una excepción de dominio. Todo cambio exige una nueva `PlanningVersion`.
3. **Continuidad Temporal:** El `ValidFrom` y `ValidUntil` de un plan no pueden solaparse con otra versión activa del mismo Centro y Grupo.

## 6. Commands (Intenciones del Negocio)
El lenguaje del dominio se expresa a través de comandos, no métodos CRUD genéricos:
- `CreatePlan`
- `ReadyForReview`
- `SubmitForReview`
- `ApprovePlan`
- `RejectPlan`
- `ReturnForCorrection`
- `AmendPlan`
- `ArchivePlan`

## 7. Factories
- **`PedagogicalPlanFactory`**: Se encarga de instanciar una nueva planeación virgen. Inyecta el ciclo operativo correcto y la asocia al `ActiveContext` del creador.
- **`PlanningVersionFactory`**: Genera una copia (Draft) a partir de una versión previa si se requiere una enmienda (`Amendment`).

## 8. Repositories (Puertos)
- **`PlanningRepository`**: Contrato para persistir y reconstruir el `PedagogicalPlan`. Debe recuperar el Agregado completo (con sus intenciones, actividades y la versión activa).

## 9. Policies & Domain Services
- **`PedagogicalReviewProvider`** (Puerto): Interfaz agnóstica que evalúa el Agregado. No se llama "AI Linter", sino que expone capacidades puras de dominio:
  - `reviewConsistency()`
  - `reviewSafety()`
  - `reviewNormativeCompliance()`
  - `reviewInclusion()`
  - `reviewLanguage()`
  - `generateSuggestions()`
  
 *(La implementación de este puerto puede ser en IA o mediante reglas determinísticas del sistema).*
