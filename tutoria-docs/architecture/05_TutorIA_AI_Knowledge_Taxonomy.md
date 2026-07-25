# TutorIA — AI Knowledge Taxonomy

## Categorías Documentales

Los documentos y fuentes que alimentan la base de conocimiento se clasifican estrictamente en la siguiente taxonomía:
- `authoritative_norm` (Leyes, Normas Oficiales)
- `official_procedure` (Procedimientos formales aprobados)
- `official_format` (Formatos institucionales inmutables)
- `institutional_criterion` (Criterios oficiales interpretativos)
- `institutional_circular` (Avisos de cumplimiento obligatorio temporal o permanente)
- `curricular_program` (Programa Educativo, Sintético SEP)
- `technical_manual` (Manuales de operación técnica)
- `operational_flow` (Diagramas de flujo y mapas de procesos)
- `training_material` (Presentaciones, guías de curso)
- `validated_example` (Planeaciones o actas previamente aprobadas y consideradas de excelencia)
- `unvalidated_example` (Documentos operativos estándar para revisión)
- `historical_document` (Documentos que perdieron vigencia legal)
- `superseded_document` (Documentos reemplazados por una nueva versión)
- `restricted_document` (Auditorías de seguridad, claves de acceso SIAG)
- `personal_data_document` (Expedientes clínicos, listados de asistencia)
- `excluded_from_rag` (Información fuera del alcance cognitivo permitido)

## Criterios de Ingestión y Elegibilidad

Al momento de indexarse, cada fuente adquiere un criterio de disponibilidad para los motores de IA (RAG):

1. **Elegible:** La IA tiene permiso de consultar e inyectar esta fuente de manera directa y transparente en sus respuestas (Ej. `authoritative_norm`, `curricular_program`).
2. **Elegible con filtros:** La IA puede consumirlo solo si el contexto de la consulta (Institución, Esquema, Zona) coincide exactamente con los metadatos de la fuente (Ej. `institutional_circular` de una delegación específica).
3. **Solo referencia:** La IA sabe de la existencia del documento pero remite al usuario a consultarlo manualmente sin interpretar su contenido.
4. **Requiere validación:** Documento en proceso de curaduría. La IA emite un aviso de que la fuente no es definitiva.
5. **Excluido:** Documentos que el vectorizador o el sistema de búsqueda descarta por completo.
6. **Restringido:** Documentos bloqueados por control de acceso basado en roles (RBAC); el RAG asume el rol del usuario que consulta para determinar visibilidad.

## Matriz Conceptual de Decisión (Alimentación RAG)

| Tipo de Documento | Es fuente Primaria? | Vigente? | Contiene Datos Personales? | ¿Alimenta el RAG? | Comportamiento del Asistente |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `authoritative_norm` | Sí | Sí | No | **SÍ** (Elegible) | Cita exacta y fundamentación. |
| `historical_document` | Sí | No | No | **SÍ** (Elegible con filtros) | Menciona que es normatividad pasada. |
| `validated_example` | No | Sí | No | **SÍ** (Elegible) | Lo usa como inspiración pedagógica. |
| `unvalidated_example` | No | Sí | No | **NO** (Requiere Validación) | Ignorado en respuestas definitivas. |
| `personal_data_document`| - | - | Sí | **NO** (Restringido/Excluido) | Viola la política Zero Trust / Privacidad. |
| `restricted_document` | Sí | Sí | No | **SÍ** (Restringido) | Responde SOLO si el usuario tiene Rol adecuado.|
