# TutorIA — Knowledge Quality

*(Nota: Este modelo conceptual propone las bases métricas para auditar la salud del conocimiento institucional, sin definir todavía fórmulas matemáticas definitivas para producción).*

## Propósito
Asegurar que la base documental ("El Oráculo") sobre la que infiere la IA y operan los humanos esté sana, vigente, libre de contradicciones y sea altamente confiable. Sin conocimiento de calidad, el motor cognitivo falla.

## Dimensiones Conceptuales de Calidad

El sistema medirá permanentemente las siguientes dimensiones para cada pieza de conocimiento:
- **Autoridad:** Jerarquía del documento (Constitución > Ley > Norma > Circular).
- **Vigencia:** Estado temporal frente a fechas de caducidad explícitas.
- **Integridad:** Ausencia de fragmentos corruptos o ilegibles.
- **Completitud:** ¿Cubre la norma todos los escenarios que dicta el índice?
- **Consistencia:** Ausencia de contradicciones internas o con documentos de mayor autoridad.
- **Confianza jurídica:** Grado de validación legal obtenida.
- **Confianza pedagógica:** Aval explícito por el comité técnico-educativo.
- **Aplicabilidad:** Claridad sobre a quién, cuándo y dónde aplica (Metadatos correctos).
- **Trazabilidad:** Capacidad de rastrear la fuente original y autor.
- **Legibilidad:** Estructura semántica apta tanto para humanos como para ingesta vectorial.
- **Capacidad de citación:** Qué tan fácil es aislar un artículo, regla o chunk.
- **Conflictos:** Número de colisiones detectadas por el Knowledge Graph contra otras reglas.
- **Frecuencia de uso:** Tasa de consulta humana o citación RAG.
- **Tasa de abstención:** Frecuencia con la que un documento forzó a la IA a abstenerse por ambigüedad.
- **Retroalimentación humana:** Calificación de los usuarios finales a la utilidad de la norma.
- **Fecha de última revisión:** Antigüedad de la última auditoría humana.
- **Próxima revisión:** Tiempo restante para la re-certificación obligatoria.
- **Responsable:** Presencia de un `KnowledgeOwner` activo y asignado.

## Knowledge Quality Score (KQS)

Se propone la creación de un sistema de puntaje (Score) holístico, que deberá distinguirse en múltiples niveles:
- **Score de chunk:** Calidad y cohesión semántica de un párrafo fragmentado.
- **Score de versión:** Calidad de un documento específico en un momento del tiempo.
- **Score documental:** Promedio histórico de todas las versiones de una norma.
- **Score de colección:** Salud general del repositorio de un Tenant (ej. "Las políticas del Centro A tienen un KQS de 45/100, están caducas").
- **Score de respuesta RAG:** Confianza de que la recuperación semántica específica fue precisa y de alta calidad.

## Consecuencias de un Score Bajo

Si una pieza de conocimiento cae por debajo del umbral de calidad aceptable, el sistema podrá actuar:
- Impedir la publicación o entrada a producción de un documento.
- Restringir el documento del motor RAG (la IA dejará de usarlo).
- Generar flujos de revisión forzada (Alertas al comité).
- Mostrar advertencias visuales en la interfaz al usuario ("Este manual no ha sido revisado en 3 años").
- Escalar tickets automáticos al `KnowledgeOwner` responsable.
