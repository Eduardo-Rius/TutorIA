# Planning

## Propósito
Representar el diseño instruccional (planeación pedagógica) semanal, quincenal o mensual para un Grupo.

## Responsabilidades
Estructurar actividades, objetivos, tiempos y recursos alineados a un KnowledgeSource.

## No es responsable de
Aprobarse a sí misma (eso es de Approval).

## Owner
Docente (Creación) / Grupo (Propietario final).

## Identificador
`planningId` (UUID)

## Atributos principales
- tenantId
- centerId
- groupId
- authorId
- title
- startDate
- endDate
- content/activities (array u objeto)
- status (draft, pending_approval, approved, rejected, archived)

## Relaciones
Basado en: Observation(s).
Requiere: Approval.
Generada con asistencia de: AIRecommendation.

## Reglas de negocio
- Una planeación en estado `approved` es inmutable. Para modificarla se debe generar una enmienda o versión nueva.
- Debe cubrir un rango de fechas.

## Restricciones
No pueden solaparse planeaciones del mismo tipo (ej. semanal) para el mismo grupo en las mismas fechas.

## Invariantes
Debe apuntar a un Group y a un Author.

## Eventos publicados
PlanningCreated, PlanningSubmitted, PlanningApproved, PlanningRejected.

## Eventos consumidos
ApprovalGranted, ApprovalRejected (para transicionar estados).

## Consideraciones MultiTenant
Datos aislados. Formatos varían por Tenant.

## Consideraciones de Seguridad
Lectura autorizada por Center.

## Consideraciones de Auditoría
Cambios de estado son el núcleo operativo del sistema.

## Futuras extensiones
Exportación a PDF en formatos oficiales gubernamentales.
