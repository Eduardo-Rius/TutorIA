# User

## Propósito
Representar al actor humano (individuo) que interactúa con la plataforma.

## Responsabilidades
Poseer la identidad (email/credenciales) y gestionar perfil básico (nombre, teléfono).

## No es responsable de
Saber a qué escuela pertenece o qué puede hacer (eso es de Assignment y Role).

## Owner
El propio usuario.

## Identificador
`userId` (UUID mapeado al Auth Provider, ej. Firebase Auth UID).

## Atributos principales
- tenantId
- email (único)
- firstName
- lastName
- status (active/blocked)
- lastLogin

## Relaciones
Tiene: Assignments (múltiples posibles, ej. Docente en la mañana, Supervisor en la tarde).

## Reglas de negocio
- Un usuario es global al Tenant pero inútil sin Assignments activos.
- El bloqueo de User revoca instantáneamente el JWT y todos los accesos.

## Restricciones
El correo electrónico no puede ser alterado libremente; requiere flujo de validación.

## Invariantes
El `email` debe ser único por Tenant.

## Eventos publicados
UserRegistered, UserBlocked, UserProfileUpdated.

## Eventos consumidos
Ninguno crítico.

## Consideraciones MultiTenant
El usuario se suscribe a un Tenant. Usuarios que pertenecen a varios Tenants requerirán un TenantId claim compuesto.

## Consideraciones de Seguridad
Autenticación robusta. Los Claims del JWT se derivan de los Assignments.

## Consideraciones de Auditoría
Los login y fallos de autenticación se auditan.

## Futuras extensiones
SSO (Single Sign-On) corporativo.
