# KnowledgeSource

## Propósito
Representar un documento normativo, política o programa (ej. PEP, Nueva Escuela Mexicana, Manual de Guarderías) ingestable por el Knowledge Operating System (KOS).

## Responsabilidades
Proveer la verdad absoluta sobre la cual el AI Engine construye sugerencias (RAG).

## No es responsable de
Ejecutar la inferencia o crear planeaciones per se.

## Owner
Knowledge Governance Team / Institution Admin.

## Identificador
`sourceId` (UUID)

## Atributos principales
- tenantId
- title
- documentType (manual, program, rule)
- version
- status (active/deprecated)
- effectiveDate

## Relaciones
Pertenece a: Tenant / Institution.
Se descompone en: KnowledgeChunks (para RAG).

## Reglas de negocio
- Solo el Knowledge Governance Team puede aprobar un KnowledgeSource.
- Si un Source se deroga, no se elimina, cambia a `deprecated`.

## Restricciones
Requiere una validación estricta antes de ser "active" para evitar alucinaciones.

## Invariantes
Un KnowledgeSource activo siempre debe tener una fecha de efectividad.

## Eventos publicados
KnowledgeSourceIngested, KnowledgeSourceDeprecated.

## Eventos consumidos
Ninguno.

## Consideraciones MultiTenant
El conocimiento está particionado. Un Tenant privado puede tener normativas diferentes al Tenant público.

## Consideraciones de Seguridad
Solo lectura para usuarios normales. Alta restricción de escritura.

## Consideraciones de Auditoría
Versiones rastreadas rigurosamente para justificar recomendaciones pasadas de la IA.

## Futuras extensiones
Conexión a boletines oficiales del gobierno automatizada.
