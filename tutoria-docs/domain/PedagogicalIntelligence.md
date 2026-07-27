# Tactical Domain Design: Pedagogical Intelligence

**Status:** APPROVED
**Wave:** WAVE 8

Este documento rige la conceptualización técnica y arquitectónica de la Plataforma de Inteligencia Pedagógica dentro del ecosistema TutorIA. Define las fronteras entre el comportamiento determinístico, la recuperación de conocimiento y la asistencia generativa, abstraídas siempre bajo el concepto de **Capabilities** (ej. `ReviewConsistencyCapability` → `Generative Provider`).

---

## Las 4 Capas de Inteligencia

### 1. Policy Intelligence
Inteligencia basada en reglas, políticas e invariantes institucionales. No utiliza modelos generativos.
- Validaciones determinísticas de fechas, calendarios escolares y completitud.
- Políticas de Separation of Duties (SoD).
- Requisitos obligatorios y de estado.

### 2. Context Intelligence
Recuperación de conocimiento y consciencia situacional.
- Recuperación de documentos normativos e institucionales (RAG).
- Historial del documento (Snapshots) y conocimiento organizacional.
- Contexto y observabilidad del alumno o grupo.

### 3. Generative Intelligence
Herramientas asistenciales, de ideación y redacción (mediante Generative Providers).
- Reformulación de textos para inclusión y lenguaje profesional.
- Expansión de una intención en actividades estructuradas.
- Análisis cualitativo para detectar sesgos, vacíos o sugerencias.

### 4. Operational Intelligence
Inteligencia aplicada al flujo de trabajo del usuario.
- Priorización, agrupación y ordenamiento de tareas en el Operational Workspace.
- Detección proactiva de riesgos.
- Explicabilidad, justificaciones y trade-offs.

---

## Definiciones Estratégicas (FAQ)

### 1. ¿Qué problemas resuelve la inteligencia pedagógica?
Resuelve el cuello de botella en la calidad y revisión de los procesos educativos. Reduce la carga cognitiva del docente al sugerir actividades apropiadas, estandariza el lenguaje inclusivo, y asiste al auditor contrastando rápidamente una planeación contra la normativa extensa.

### 2. ¿Qué problemas nunca debe intentar resolver?
Nunca debe automatizar aprobaciones, alterar una intención pedagógica sin consentimiento explícito, ni gobernar sobre las Invariantes del Dominio (asignar permisos, saltarse políticas). No evalúa el desempeño del docente, sino el artefacto documental.

### 3. ¿Qué capacidades serán determinísticas?
Todas las pertenecientes a **Policy Intelligence**: comprobación de invariantes, validaciones de fechas solapadas, completitud de campos, y verificación de identidad y roles (SoD).

### 4. ¿Qué capacidades utilizarán recuperación de conocimiento?
Las pertenecientes a **Context Intelligence**: RAG para recuperar normativas vigentes, búsqueda en bibliotecas institucionales, y consulta del Snapshot activo.

### 5. ¿Qué capacidades podrán usar modelos generativos?
Las de **Generative Intelligence**: ideación de actividades, redacción profesional, detección cualitativa de sesgos y estructuración de contenido pedagógico.

### 6. ¿Cómo se explicará una recomendación al usuario?
A través de la **Operational Intelligence**, toda sugerencia incluirá un bloque de justificación estructurada citando la fuente exacta (ej. norma o contexto) recuperada, explicando siempre el trade-off antes de la decisión final.

### 7. ¿Cómo auditar una recomendación de IA?
Mediante un Value Object (ej. `ReviewOutcome`) que almacena metadatos estrictos: el `Generative Provider` utilizado, el hash del prompt, y la marca de tiempo, garantizando trazabilidad absoluta de cada sugerencia.

### 8. ¿Cómo degradará el sistema si la IA no está disponible?
Mediante Degradación Elegante. Si la Capa 3 o 2 fallan, el sistema degrada a **Policy Intelligence** (Capa 1). El ciclo de vida continúa de forma manual sin bloquear la operatividad.

### 9. ¿Cómo garantizar que la IA nunca rompa una invariante del dominio?
La Inteligencia Artificial opera fuera del modelo de dominio core. Solo emite Value Objects o Data Transfer Objects. Las invariantes son protegidas exclusivamente por los Aggregate Roots y los Application Services invocados por acciones humanas.

### 10. ¿Cómo evolucionará el sistema cuando aparezcan modelos mejores que el LLM Provider actual?
Mediante el uso de abstracciones de **Capabilities**. El dominio demanda una `Capability` genérica, y el detalle de qué `Generative Provider` la resuelve queda confinado a la capa de Infraestructura, permitiendo cambiar de modelo sin refactorizar el negocio.
