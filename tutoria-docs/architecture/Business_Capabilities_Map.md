# TutorIA Business Capability Map
**Revision 2**

Este documento traza las capacidades empresariales que cada Bounded Context proporciona a la plataforma.

## Bounded Context: Assignment

**Propósito Principal:**
Gestionar el ciclo de vida jurídico y funcional de los nombramientos (asignaciones) de responsabilidades de negocio sobre recursos de la plataforma (como Grupos, Centros, Instituciones) dirigidas a una identidad abstracta (`AssigneeId`).

Es un Capability Context independiente. **NO pertenece a Organization ni a Identity**.
El contexto desconoce por completo conceptos como `Teacher`, `Employee` o `User`. Para el dominio de Assignment, sólo existen `AssigneeId`s que reciben responsabilidades.

### 1. Capacidades que Ofrece (Capabilities)
*   **Responsibility Lifecycle Management:** Orquestar propuestas (`DRAFT`), firmas a futuro (`PENDING`), ejercicio de la responsabilidad (`ACTIVE`), pausas temporales (`SUSPENDED`), y expiraciones/cierres históricos (`EXPIRED`/`ARCHIVED`).
*   **Temporal Boundaries (AssignmentPeriod):** Proveer lógica de fechas (`overlaps`, `contains`) para saber si una responsabilidad es válida, pasada o futura sin delegarlo a una base de datos.
*   **Role-Agnostic Delegation:** Permitir la asignación flexible (`PRIMARY`, `ASSISTANT`, `OBSERVER`, `MENTOR`) sin vincular el permiso al rol de usuario del sistema.
*   **Open Resource Model:** Inicia delegando la responsabilidad sobre un `GroupId`, pero conceptualmente expone capacidades para asignar responsabilidades sobre otros recursos (ej. un `DIRECTOR` asignado a un `CenterId`).

### 2. Procesos que Habilita
*   **Pre-Onboarding Responsibilities:** Permitir nombrar hoy a un director o asistente cuyo cargo entrará en vigor el próximo año escolar (`PENDING`), sin afectar el cierre del periodo actual.
*   **Historical Audit (Chain of Custody):** Mantener de por vida el historial exacto de quién ejerció la autoridad sobre un recurso en una fecha del pasado (mediante la inmutabilidad de VOs de asignaciones expiradas).
*   **Gestión de Sustituciones (Temporary Leave):** Facilitar los periodos de incapacidad o suspensión de un `AssigneeId` titular (pasándolo a `SUSPENDED`) y nombrando a un suplente.

### 3. Procesos que Bloquea (Protecciones del Dominio)
*   Bloquea la edición o reanudación de responsabilidades que ya han pasado a un estado histórico irreversible (`ARCHIVED`).
*   Bloquea violaciones de la flecha del tiempo (Una responsabilidad expira naturalmente cuando el reloj supera su atributo `end`, denegando reactivaciones ilógicas).

### 4. Procesos que Consumirán Contextos Futuros (ej. Planning)
El contexto de Planeación u otros contextos consumirán a `Assignment` como fuente de verdad:
*   *Query:* `getResponsibilityForResource(assigneeId, resourceId, date)` -> ¿Tiene esta identidad responsabilidad `PRIMARY` hoy sobre el recurso para firmar este plan?
*   *Query:* `listActiveAssignees(resourceId, 'REVIEWER', date)` -> ¿Quiénes son los auditores actuales a los que se les debe notificar?
