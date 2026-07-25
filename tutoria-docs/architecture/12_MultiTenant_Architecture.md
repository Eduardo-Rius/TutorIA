# TutorIA — MultiTenant Architecture

TutorIA es una plataforma MultiTenant desde el primer día. Está diseñada para operar en un ecosistema B2B (Business-to-Business) y B2G (Business-to-Government), alojando múltiples instituciones independientes bajo una única infraestructura centralizada.

## Modelo Jerárquico de Inquilinos

El modelo de datos debe respetar el aislamiento a través de toda la cadena jerárquica:

`Tenant (Instancia Tecnológica)`
  `↓`
`Institution (El cliente corporativo/gobierno, Ej. IMSS, SEP)`
  `↓`
`Organizational Unit (Ej. Dirección Regional)`
  `↓`
`Delegation (Ej. Delegación Estatal Sur)`
  `↓`
`Zone (Ej. Zona Escolar 10)`
  `↓`
`Center (La Guardería / Escuela específica)`
  `↓`
`Room (Sala física)`
  `↓`
`Group (Conjunto poblacional, Ej. Lactantes A)`
  `↓`
`User (Docentes, Directivos, Familias)`

## Aislamiento e Independencia de Datos (Data Isolation)

- Las bases de datos operarán con un diseño `Pool` o `Silo` dependiendo del requerimiento regulatorio. Por defecto, todas las tablas / colecciones en la base de datos (Firestore/SQL) requerirán el `TenantID` o `InstitutionID` como clave primaria de partición obligatoria.
- Ningún usuario (salvo Super Admins del sistema TutorIA) podrá consultar, bajo ninguna circunstancia, datos que pertenezcan a una Institución diferente a la suya.
- Los documentos de conocimiento normativo pueden ser "Públicos" (aplicables a todos los Tenants, Ej. Ley General de Educación) o "Privados" (Reglamentos internos de la guardería privada "Mis Pequeños").

## Seguridad y RBAC Multitenant

- La Autenticación (Firebase Auth) valida quién es la persona; pero el Sistema de Autorización (RBAC) pregunta "¿En qué Tenant y en qué Centro tiene este usuario su asignación vigente?".
- Si un usuario deja de laborar para una Institución y es contratado por otra (Ej. Pasa del IMSS a la SEP), su identidad digital puede persistir, pero sus asignaciones de datos cambian drásticamente; jamás cruzará información entre ambas estancias.

## Escalabilidad

- La arquitectura MultiTenant permite mantener un único código fuente (Single Codebase). Una actualización a las reglas pedagógicas del sistema beneficiará automáticamente a todos los inquilinos.
- La infraestructura en la nube escalará horizontalmente.
