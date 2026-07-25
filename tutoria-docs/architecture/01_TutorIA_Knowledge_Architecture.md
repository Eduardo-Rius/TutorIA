# TutorIA — Knowledge Architecture

## 1. Objetivo

Definir cómo la plataforma TutorIA recibe, clasifica, versiona, protege, recupera y cita el conocimiento institucional para asegurar respuestas precisas, sustentadas y actualizadas mediante Inteligencia Artificial y flujos de trabajo convencionales.

## 2. Jerarquía de autoridad documental

*(Nota: Esta jerarquía es preliminar y deberá validarse de forma jurídica e institucional)*

- **Nivel 1** — Leyes y reglamentos.
- **Nivel 2** — Norma de Operación IMSS vigente.
- **Nivel 3** — Procedimientos IMSS vigentes.
- **Nivel 4** — Programa Sintético SEP vigente.
- **Nivel 5** — Lineamientos, criterios y circulares institucionales.
- **Nivel 6** — Formatos oficiales y anexos.
- **Nivel 7** — Manuales, guías y materiales técnicos.
- **Nivel 8** — Capacitación y presentaciones.
- **Nivel 9** — Ejemplos operativos y planeaciones.
- **Nivel 10** — Documentos históricos o sustituidos.

## 3. Dominios de conocimiento

El repositorio de conocimiento abarcará los siguientes dominios:
- Gobierno y legislación.
- Norma de operación.
- Pedagogía.
- Educación Inicial.
- Educación Preescolar.
- Planeación.
- Evaluación.
- Desarrollo infantil.
- Fomento de la Salud.
- Alimentación.
- Administración.
- Recursos humanos.
- Inscripción.
- Asistencia.
- Seguridad y protección civil.
- Supervisión.
- SIAG.
- Consejo de Padres.
- Formatos y evidencias.
- Capacitación.
- Histórico.

## 4. Ciclo de vida documental

El flujo de vida de un documento en la plataforma sigue estas etapas:
`Recibido → Inventariado → Clasificado → Validación pendiente → Vigente y autorizado → Elegible para RAG → Indexado → Sustituido → Histórico → Retirado`

## 5. Política de conflictos

Cuando dos fuentes se contradigan o presenten discrepancias, el sistema de recuperación y respuesta deberá:
1. Priorizar la fuente con mayor autoridad según la jerarquía establecida.
2. Validar la vigencia (descartando fuentes caducas o derogadas).
3. Validar el esquema de prestación aplicable (Directa, Indirecta, Vecinal, etc.).
4. Validar la población o nivel educativo a la que se dirige.
5. Abstenerse de generar una respuesta o acción si el conflicto no puede resolverse algorítmicamente.
6. Escalar el conflicto a validación humana o revisión por parte de la autoridad competente.

## 6. Metadatos obligatorios

Cada documento ingresado a la base de conocimiento debe cumplir con el siguiente esquema de metadatos:
- `documentId`
- `title`
- `documentKey`
- `documentType`
- `authorityLevel`
- `issuingAuthority`
- `version`
- `effectiveDate`
- `expirationDate`
- `status`
- `serviceScheme`
- `institution`
- `area`
- `domain`
- `process`
- `role`
- `educationalLevel`
- `ageGroup`
- `applicableCenterType`
- `contentType`
- `sourcePage`
- `sourceSection`
- `language`
- `sensitivity`
- `ragEligibility`
- `validationStatus`
- `supersedes`
- `supersededBy`
- `checksum`
- `ingestionDate`
- `reviewDate`

## 7. Estrategia RAG (Retrieval-Augmented Generation)

La recuperación de contexto para el asistente de IA se fundamentará conceptualmente en:
- **Recuperación híbrida**: Combinación de búsqueda basada en palabras clave (keyword) y representación vectorial.
- **Filtros por metadatos**: Acotar drásticamente el espacio de búsqueda dependiendo del contexto del usuario (rol, nivel educativo, esquema de prestación, vigencia).
- **Búsqueda semántica**: Para emparejar el sentido de la consulta con el sentido del documento.
- **Búsqueda por clave exacta**: Localización determinista cuando se solicita un procedimiento o norma específica.
- **Recuperación por apartado y página**: Retornar y referenciar el fragmento exacto (chunk) y su ubicación dentro del documento original.
- **Reranking**: Reordenamiento de los resultados recuperados utilizando un modelo secundario para maximizar la precisión antes de inyectar el contexto.
- **Citas obligatorias**: La IA siempre debe construir la respuesta anexando la referencia exacta de los fragmentos recuperados.
- **Umbral de confianza**: Si las métricas de recuperación caen por debajo de un umbral establecido, la respuesta debe ser rechazada preventivamente.
- **Respuesta de abstención**: Obligación de responder que no se cuenta con información si la base de conocimiento validada no contiene los datos.
- **Registro de consultas**: Trazabilidad completa (auditoría) de las preguntas formuladas, fragmentos recuperados y respuestas generadas para monitoreo de calidad.
