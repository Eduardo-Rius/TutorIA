# Approval

## Propósito
Desacoplar el flujo de autorización de la entidad de negocio subyacente. Permite a directores aprobar Planeaciones o Bajas.

## Responsabilidades
Mantener la trazabilidad del quién, cuándo y por qué se autorizó o rechazó un documento.

## No es responsable de
Contener el detalle de lo que se aprueba (solo guarda el ID de la entidad y su hash).

## Owner
Actor con Rol de aprobación (Director, Supervisor).

## Identificador
`approvalId` (UUID)

## Atributos principales
- tenantId
- targetEntityType (ej. "planning")
- targetEntityId
- reviewerId
- resolution (approved / rejected)
- comments
- date
- hash (snapshot de lo que se aprobó)

## Relaciones
Aplica a: Planning, Document, Workflow.

## Reglas de negocio
- El creador del documento no puede ser su propio aprobador (Separation of Duties).
- Una vez generada la resolución, el Approval es inmutable.

## Restricciones
Solo usuarios con permisos jerárquicos válidos sobre el Center/Group pueden emitir Approvals.

## Invariantes
El snapshot/hash debe coincidir con el estado del documento al momento de revisión.

## Eventos publicados
ApprovalGranted, ApprovalRejected.

## Eventos consumidos
PlanningSubmitted.

## Consideraciones MultiTenant
Aislado al Tenant de origen.

## Consideraciones de Seguridad
Vital para la operación legal y normativa del centro.

## Consideraciones de Auditoría
Toda aprobación es por sí misma un evento de auditoría perpetuo.

## Futuras extensiones
Flujos de aprobación paralelos o multi-nivel.
