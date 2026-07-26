# Child

## Propósito
Representar el expediente demográfico e histórico de desarrollo de un menor en el sistema.

## Responsabilidades
Mantener la trazabilidad de su evolución y relaciones de contacto autorizadas.

## No es responsable de
La planeación curricular pedagógica (eso es del Group).

## Owner
Institution (Tutor Legal delegado).

## Identificador
`childId` (UUID)

## Atributos principales
- tenantId
- firstName
- lastName
- curp
- birthDate
- status (enrolled/graduated/dropped)

## Relaciones
Asignado a: Group (mediante Enrollment).
Asociado a: Observations, Evaluations, Recommendations, HealthRecords.

## Reglas de negocio
- No puede estar activo en más de un Center al mismo tiempo (a nivel Tenant).
- Los expedientes de salud y comportamiento requieren roles específicos.

## Restricciones
No se borra la entidad (Hard Delete prohíbido por regulaciones gubernamentales).

## Invariantes
La CURP (u homologado) es única a nivel Tenant.

## Eventos publicados
ChildEnrolled, ChildGraduated, ChildDropped.

## Eventos consumidos
Ninguno directamente.

## Consideraciones MultiTenant
Los datos existen dentro de un Tenant. No hay portabilidad inter-Tenant automatizada.

## Consideraciones de Seguridad
Contiene Información de Identificación Personal (PII). Sujeto a reglas estrictas de Firestore. 

## Consideraciones de Auditoría
Toda consulta al expediente detallado queda registrada.

## Futuras extensiones
Portal para padres/tutores.
