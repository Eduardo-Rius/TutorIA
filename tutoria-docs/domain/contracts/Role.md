# Role

## Propósito
Definir un catálogo de permisos de acceso (Políticas RBAC).

## Responsabilidades
Dictar qué operaciones puede hacer un Actor.

## No es responsable de
Asignar un usuario a una escuela (esa es Assignment).

## Owner
Tenant Administrator.

## Identificador
`roleId` (String / Enum, ej. "docente", "director", "supervisor")

## Atributos principales
- tenantId
- name
- permissions (array of strings, ej. ["planning:create", "planning:read"])
- level (jerarquía)

## Relaciones
Asignado en: Assignment.

## Reglas de negocio
- Los Roles estándar (Docente, Director) son inmutables de fábrica.
- Los permisos determinan visibilidad en UI y seguridad en Firestore.

## Restricciones
Roles customizados requieren validación estricta de seguridad.

## Invariantes
Un Tenant siempre nace con los roles base aprovisionados.

## Eventos publicados
RoleUpdated.

## Eventos consumidos
Ninguno.

## Consideraciones MultiTenant
Los roles pueden variar semánticamente por Tenant (ej. "Directora" vs "Head of School").

## Consideraciones de Seguridad
Cambios en un Rol invalidan el caché JWT de todos los usuarios afectados.

## Consideraciones de Auditoría
Modificar un Role dispara una auditoría de máxima alerta (SecOps).

## Futuras extensiones
ABAC (Attribute-Based Access Control).
