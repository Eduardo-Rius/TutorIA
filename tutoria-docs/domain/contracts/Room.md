# Room

## Propósito
Representar el espacio físico o lógico donde opera un Grupo dentro de un Center.

## Responsabilidades
Definir capacidades físicas y características de ambiente.

## No es responsable de
Llevar el récord pedagógico (eso es del Group).

## Owner
Center Director.

## Identificador
`roomId` (UUID)

## Atributos principales
- tenantId
- centerId
- name
- capacity
- type (ej. Lactantes, Preescolar)

## Relaciones
Pertenece a: Center.
Aloja a: Group (1 a N temporal).

## Reglas de negocio
- Su capacidad máxima no debe ser excedida por los niños inscritos en el Grupo que lo ocupa.

## Restricciones
Un Room no puede ser eliminado si tiene Grupos activos.

## Invariantes
Debe pertenecer a un Center.

## Eventos publicados
RoomCapacityChanged, RoomAssigned.

## Eventos consumidos
Ninguno directamente.

## Consideraciones MultiTenant
Aislado mediante tenantId y centerId.

## Consideraciones de Seguridad
Bajo nivel de sensibilidad.

## Consideraciones de Auditoría
Trazabilidad de cambios de capacidad.

## Futuras extensiones
Mapas físicos del centro y gestión de recursos (inventario material).
