# Domain Event Catalog

Este catálogo define los eventos de dominio principales del sistema, actuando como la base para la Arquitectura Orientada a Eventos (EDA).

## TenantCreated
- **Propósito:** Notificar la inicialización de una nueva instancia institucional (Tenant).
- **Productor:** SuperAdmin / Tenant Provisioning Service.
- **Consumidores:** Auth Service (para preparar base de Claims), Knowledge Service (para preparar partición de base de conocimiento).
- **Payload conceptual:** `tenantId`, `name`, `timestamp`.
- **Criticidad:** Crítica.
- **Persistencia:** Permanente (Event Store).
- **Idempotencia:** Absoluta (solo se puede crear un TenantID una vez).

## InstitutionCreated
- **Propósito:** Registrar el alta de una institución matriz.
- **Productor:** Tenant Admin.
- **Consumidores:** Center Service.
- **Payload conceptual:** `tenantId`, `institutionId`, `name`.
- **Criticidad:** Alta.

## CenterActivated
- **Propósito:** Activar una escuela para operación.
- **Productor:** Institution Admin.
- **Consumidores:** RBAC Service (habilita la resolución de Assignments para este Center).
- **Payload conceptual:** `tenantId`, `centerId`.
- **Criticidad:** Alta.

## RoomAssigned
- **Propósito:** Registrar que un espacio físico fue ocupado por un grupo.
- **Productor:** Center Director.
- **Consumidores:** Ninguno actualmente (Informativo).
- **Payload conceptual:** `centerId`, `roomId`, `groupId`.
- **Criticidad:** Baja.

## ChildEnrolled
- **Propósito:** Formalizar el ingreso de un menor a un centro.
- **Productor:** Center Director / Control Escolar.
- **Consumidores:** Billing (futuro), Notification Service (padres).
- **Payload conceptual:** `childId`, `centerId`, `groupId`.
- **Criticidad:** Alta (detona responsabilidad legal e inicio del expediente).

## ObservationRegistered
- **Propósito:** Registrar un hito sobre un infante o grupo.
- **Productor:** Docente.
- **Consumidores:** AI Engine (Trigger para buscar conocimiento y sugerir planeaciones o riesgos).
- **Payload conceptual:** `observationId`, `groupId`, `childId`, `category`.
- **Criticidad:** Media-Alta (Alimenta el RAG).

## PlanningGenerated
- **Propósito:** Notificar la existencia de una planeación (borrador o aprobada).
- **Productor:** Docente / AI Engine.
- **Consumidores:** Approval Workflow Service.
- **Payload conceptual:** `planningId`, `groupId`, `status`.
- **Criticidad:** Alta.

## RecommendationIssued
- **Propósito:** Registrar una inferencia del motor de inteligencia artificial.
- **Productor:** AI Engine.
- **Consumidores:** UI Client (notifica al docente), Audit Service.
- **Payload conceptual:** `recommendationId`, `targetId`, `type`.
- **Criticidad:** Alta (Para métricas de KOS y telemetría de IA).

## ApprovalGranted
- **Propósito:** Consolidar formalmente una planeación o acción.
- **Productor:** Director / Supervisor.
- **Consumidores:** Planning Service (cambia status a approved).
- **Payload conceptual:** `approvalId`, `targetEntityId`, `reviewerId`.
- **Criticidad:** Crítica (Gatillo final operativo).

## AuditRecorded
- **Propósito:** Evento inmutable de rastro de acceso/mutación.
- **Productor:** Todos los servicios.
- **Consumidores:** Data Lake (Exportación asíncrona), SecOps Monitor.
- **Payload conceptual:** `auditId`, `action`, `actorId`, `entityId`.
- **Criticidad:** Máxima.
