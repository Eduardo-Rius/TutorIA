# Audit

## Propósito
El registro centralizado (append-only) de todas las acciones que modifican el estado de las entidades críticas o accesos a datos sensibles (PII).

## Responsabilidades
Almacenar la huella indeleble de quién hizo qué, cuándo, desde dónde y a qué dato.

## No es responsable de
Lógica de negocio. Es un consumidor pasivo.

## Owner
System (SecOps).

## Identificador
`auditId` (UUID)

## Atributos principales
- tenantId
- actorId (UserId o System)
- action (CREATE, UPDATE, DELETE, READ_SENSITIVE)
- entityType
- entityId
- timestamp
- previousState (opcional)
- newState (opcional)
- ipAddress / userAgent

## Relaciones
Referencia a: Cualquier entidad del sistema.

## Reglas de negocio
- Append-Only absoluto. Nunca se actualiza, nunca se borra.
- Cualquier modificación a Auth, Roles o Enrollments debe generar un Audit.

## Restricciones
Firestore Rules prohíben estrictamente la actualización o borrado en la colección Audit.

## Invariantes
Todo Audit debe tener un actor, una acción y un timestamp.

## Eventos publicados
AuditRecorded.

## Eventos consumidos
Cualquier evento de dominio (es el último eslabón de la EDA).

## Consideraciones MultiTenant
Se particiona por Tenant para exportaciones legales separadas.

## Consideraciones de Seguridad
Es la base del Compliance.

## Consideraciones de Auditoría
Es la auditoría en sí misma.

## Futuras extensiones
Exportación automatizada a Data Lakes para custodia a largo plazo.
