# Institution

## Propósito
Representa la entidad legal u organizacional suprema dentro de un Tenant (ej. IMSS, SEP).

## Responsabilidades
Definir las políticas, esquemas de servicio y agrupar centros de trabajo.

## No es responsable de
Operar pedagógicamente con menores (eso es responsabilidad de los Centers y Groups).

## Owner
Tenant Administrator.

## Identificador
`institutionId` (UUID)

## Atributos principales
- tenantId
- name
- legalEntity
- status

## Relaciones
Pertenece a: Tenant.
Contiene: Centers, OrganizationalUnits, KnowledgeSources.

## Reglas de negocio
- Solo puede pertenecer a un Tenant.
- Define el KnowledgeRegistry primario.

## Restricciones
Eliminar una Institution requiere Soft Delete para preservar historia.

## Invariantes
Toda Institución tiene un Owner registrado.

## Eventos publicados
InstitutionCreated, InstitutionArchived.

## Eventos consumidos
Ninguno de alto impacto.

## Consideraciones MultiTenant
Está aislada dentro del Tenant.

## Consideraciones de Seguridad
La asignación de administradores institucionales es crítica y restringida.

## Consideraciones de Auditoría
Cambios estructurales a la institución generan evento de auditoría severo.

## Futuras extensiones
Integración de sub-instituciones complejas.
