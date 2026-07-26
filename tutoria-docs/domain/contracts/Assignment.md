# Assignment

## Propósito
Otorgar permisos efectivos uniendo a un Usuario con un Centro/Grupo mediante un Rol específico. Es el corazón del RBAC distribuido.

## Responsabilidades
Determinar qué usuario puede ver qué datos de qué escuela.

## No es responsable de
Perfil del usuario o perfil de la escuela (solo sirve como puente/nexo).

## Owner
Center Director / Institution Administrator.

## Identificador
`assignmentId` (UUID)

## Atributos principales
- tenantId
- userId
- roleId
- centerId (opcional si es rol global)
- groupId (opcional si es rol específico de salón)
- validFrom
- validUntil (opcional, para suplencias)
- status (active/revoked)

## Relaciones
Nexo entre: User, Role, Center, Group.

## Reglas de negocio
- Si el `status` es revoked, el acceso se pierde inmediatamente.
- Un usuario puede tener múltiples asignaciones (ej. maestro en Centro A, director interino en Centro B).

## Restricciones
Debe referenciar IDs válidos.

## Invariantes
Un Assignment siempre debe tener un User y un Role.

## Eventos publicados
AssignmentGranted, AssignmentRevoked.

## Eventos consumidos
UserBlocked (suspende la asignación indirectamente).

## Consideraciones MultiTenant
Relevante para el Tenant. Los JWT se construyen leyendo estas asignaciones.

## Consideraciones de Seguridad
Piedra angular de la seguridad. Se usa para inyectar custom claims.

## Consideraciones de Auditoría
Otorgar y revocar permisos es auditable perpetuamente.

## Futuras extensiones
Delegación temporal (vacaciones).
