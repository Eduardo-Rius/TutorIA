# Group

## Propósito
Representa el conjunto de infantes y su historial. Posee la memoria histórica del grupo (observaciones, planeaciones) que persiste independientemente de la rotación del personal docente.

## Responsabilidades
Consolidar planeaciones, evaluaciones y vincular a los menores (Enrollments).

## No es responsable de
Gestión de credenciales de usuario (eso recae en User y Assignment).

## Owner
Center Director / Docente asignado temporalmente.

## Identificador
`groupId` (UUID)

## Atributos principales
- tenantId
- centerId
- roomId
- name
- ageRange (rango de edad)
- educationalLevel (Inicial/Preescolar)
- status (active/archived)

## Relaciones
Pertenece a: Center, Room.
Dueño de: Plannings, Observations, Evaluations.
Referido por: Enrollments (Child), Assignments (User).

## Reglas de negocio
- La memoria histórica pertenece al Group, no al docente.
- No puede exceder la capacidad física del Room asignado.

## Restricciones
Inactivar un grupo requiere migrar o dar de baja a todos los infantes asociados.

## Invariantes
Debe pertenecer a un Center.

## Eventos publicados
GroupCreated, GroupArchived.

## Eventos consumidos
RoomCapacityChanged (valida viabilidad).

## Consideraciones MultiTenant
Totalmente asilado mediante `centerId` y `tenantId`.

## Consideraciones de Seguridad
El nivel de acceso es moderado, sus datos agregados alimentan analíticas.

## Consideraciones de Auditoría
Cambios de asignación de educadoras generan traza de auditoría.

## Futuras extensiones
Promoción automática de ciclo escolar (migración masiva de Enrollments).
