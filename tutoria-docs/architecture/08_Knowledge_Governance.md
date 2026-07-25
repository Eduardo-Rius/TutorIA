# TutorIA — Knowledge Governance

Este documento define las políticas y reglas sobre cómo vive, fluye y se controla el conocimiento institucional dentro de TutorIA.

## Ciclo de vida documental

El ciclo de vida del conocimiento institucional debe respetar estrictamente el siguiente flujo inmutable:

1. **Documento recibido:** Ingreso físico o digital a la plataforma.
2. **Inventario:** Asignación de ID, clave y registro de metadatos básicos.
3. **Clasificación:** Etiquetado según dominio, nivel educativo, esquema y nivel de autoridad (Taxonomía).
4. **Validación jurídica:** Confirmación de vigencia legal, aplicabilidad institucional y alcance.
5. **Validación pedagógica:** Confirmación de alineación con el modelo educativo (Ej. Inicial vs Preescolar).
6. **Aprobación institucional:** Autorización por la figura responsable (Ej. Nivel Central, Delegación).
7. **Versionado:** Asignación de la versión (Mayor, menor, patch).
8. **Vectorización:** Procesamiento automatizado en chunks y almacenamiento en la base de datos vectorial (Indexación).
9. **Producción:** Liberación del documento para ser utilizado por los motores RAG y de IA.
10. **Monitoreo:** Evaluación continua del rendimiento del documento en las respuestas de la IA (revisión de citas).
11. **Revisión periódica:** Auditoría calendarizada para verificar si sigue siendo aplicable o si existen nuevas circulares.
12. **Histórico:** Transición a un estado archivado cuando el documento es derogado o reemplazado.
13. **Retiro:** Destrucción o exclusión profunda (aplicable solo para documentos con caducidad legal crítica).

## Reglas y Responsabilidades

- **Definición de responsables:** Cada documento, política o chunk tiene un `KnowledgeOwner` y un `KnowledgeReviewer` claramente identificados mediante RBAC.
- **Auditoría:** Todo cambio de estado en el ciclo de vida genera un evento de auditoría criptográfico.
- **Trazabilidad:** Cada cita generada por la IA debe trazar matemáticamente hacia la versión exacta del documento que estaba en Producción en el milisegundo de la consulta.
- **SLA:** La actualización normativa crítica (Ej. Cambio de Programa SEP) tendrá SLAs estrictos para transitar desde "Recibido" hasta "Producción".
- **Control de versiones:** Ningún documento sobrescribe a otro. Se generan nuevas versiones (`DocumentVersion`).
- **Revisión obligatoria:** Todo documento tendrá una fecha de expiración o de revisión periódica obligatoria.
- **Responsables de aprobación:** Solo los administradores institucionales (Nivel Institución o Delegación) tienen la autoridad para pasar un documento de "Validación" a "Aprobación".
