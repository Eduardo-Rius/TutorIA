# Center

## Propósito
Es la unidad operativa física y funcional básica (la Guardería, la Escuela). Límite natural para el aislamiento de datos transaccionales de menores.

## Responsabilidades
Agrupar Rooms, Groups y manejar la matrícula (Enrollments) y personal (Assignments).

## No es responsable de
Decidir políticas normativas globales (eso es de Institution).

## Owner
Center Director.

## Identificador
`centerId` (UUID)

## Atributos principales
- tenantId
- institutionId
- name
- externalCode (ej. Clave de Centro de Trabajo)
- address
- status (active/inactive)

## Relaciones
Pertenece a: Institution.
Contiene: Rooms, Groups.
Refiere: Users a través de Assignments.

## Reglas de negocio
- Los usuarios del Center no pueden ver datos de otros Centers.
- Si un Center se inactiva, ningún grupo dentro puede operar.

## Restricciones
Debe tener un identificador externo único (externalCode) dentro de la institución.

## Invariantes
Un Center debe apuntar a una Institution válida.

## Eventos publicados
CenterActivated, CenterDeactivated.

## Eventos consumidos
InstitutionArchived (propagación).

## Consideraciones MultiTenant
Contiene explícitamente el `tenantId`.

## Consideraciones de Seguridad
El ID del Center se usa en Firestore Rules para el aislamiento operativo.

## Consideraciones de Auditoría
Cambios en el status del Center registran auditoría y notifican a Institution Owner.

## Futuras extensiones
Manejo de múltiples turnos (Matutino/Vespertino).
