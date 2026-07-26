# Tenant

## Propósito
Representar el límite de aislamiento físico y lógico más alto en la plataforma (MultiTenant). Todo dato pertenece a un único Tenant.

## Responsabilidades
Asegurar el particionamiento de datos; proveer el contexto global (TenantID) a todas las operaciones.

## No es responsable de
Modelar la estructura organizacional interna (para eso existe Institution y Center).

## Owner
Global System Administrator.

## Identificador
`tenantId` (UUID)

## Atributos principales
- name
- domain (opcional)
- status (active/suspended)
- createdAt
- updatedAt

## Relaciones
Contiene: Institutions, Users, Roles (globales).

## Reglas de negocio
- El `tenantId` es inmutable.
- Si un Tenant se suspende, se bloquea el acceso de todos sus usuarios.

## Restricciones
Ningún query puede omitir el filtro `tenantId`.

## Invariantes
Un Tenant siempre debe tener al menos un Institution.

## Eventos publicados
TenantCreated, TenantSuspended, TenantReactivated.

## Eventos consumidos
Ninguno.

## Consideraciones MultiTenant
Es la raíz del diseño MultiTenant (ADR-0006).

## Consideraciones de Seguridad
El ID debe inyectarse en los Claims de Autenticación del JWT.

## Consideraciones de Auditoría
Toda auditoría global se amarra al Tenant.

## Futuras extensiones
Licenciamiento y facturación por Tenant.
