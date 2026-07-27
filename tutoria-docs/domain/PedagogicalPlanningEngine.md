# Domain Model: Pedagogical Planning Engine

**Status:** PENDING DOMAIN REVIEW
**Wave:** WAVE 7

Este documento modela el núcleo de valor de TutorIA: el Motor de Planeación Pedagógica. No define la interfaz gráfica (UI) ni la base de datos, sino las reglas de negocio inflexibles que gobiernan cómo se crean, validan y autorizan las planeaciones.

---

### 1. ¿Qué es una Planeación desde la perspectiva del dominio?
Una Planeación (`PedagogicalPlan`) es un **contrato pedagógico formal** entre el equipo educativo (ej. Tutor), el Centro y la Autoridad Normativa (ej. Protección Civil, SEP, IMSS). 

No es simplemente un "documento de texto colaborativo". Es un **agregado** que consolida intenciones didácticas, tiempos, recursos y responsabilidades en un periodo específico (típicamente una semana) para un grupo poblacional específico. Es auditable, rastreable y su ejecución es obligatoria una vez autorizada.

### 2. ¿Cuáles son sus invariantes?
*(Condiciones que siempre deben ser ciertas para que el objeto exista en estado válido).*
- Toda planeación debe pertenecer estrictamente a **un (1) Ciclo Escolar/Operativo** y **una (1) Sala/Grupo** específicos.
- Los periodos de tiempo (`startDate` y `endDate`) deben ser secuenciales (Start < End) y no pueden superponerse con otra planeación autorizada para la misma Sala/Grupo.
- La identidad del **Autor Original** (el creador) no puede ser mutada jamás.
- No se puede transicionar una planeación al estado `APPROVED` sin poseer la firma (identidad autorizante) y la fecha de autorización.

### 3. ¿Cuál es su ciclo de vida completo?
El estado de una Planeación es gestionado por una Máquina de Estados finita:
1. `DRAFT`: El documento es editable por su autor o colaboradores asignados. No es visible para auditoría.
2. `UNDER_REVIEW`: El autor somete la planeación a revisión institucional. Se bloquea la edición estructural por parte del autor.
3. `REJECTED`: El revisor (ej. Directora) devuelve la planeación con comentarios o requerimientos. Vuelve a ser editable temporalmente para solventar los hallazgos.
4. `APPROVED`: La planeación es firmada digitalmente y se vuelve **inmutable**. Autorizada para su ejecución.
5. `ARCHIVED` / `CANCELLED`: Fin de su ciclo útil (histórico) o descartada antes de su ejecución.

### 4. ¿Qué eventos de dominio produce?
*(Hechos ocurridos en el pasado que interesan a otros módulos, como Notificaciones o el Workspace).*
- `PlanCreated` (Ocurrió una creación).
- `PlanSubmittedForReview` (Detona un `WorkItem` de urgencia para el Director en su Workspace).
- `PlanRejected` (Detona un `WorkItem` urgente para el Tutor).
- `PlanApproved` (Sella la planeación y genera eventos de auditoría).
- `PlanAmended` (Si por norma requiere un cambio excepcional post-aprobación, se versiona).

### 5. ¿Qué reglas jamás pueden romperse?
- **Inmutabilidad Post-Aprobación:** Una vez en estado `APPROVED`, los atributos pedagógicos (actividades, fechas, objetivos) NO pueden ser modificados. Cualquier corrección requiere invalidar (`CANCELLED`) o generar una `Amendment` (enmienda) que pase por un nuevo ciclo de firmas.
- **Separación de Obligaciones (SoD):** El Autor de la planeación **NUNCA** puede ser la misma Identidad Operativa que la Autoriza.
- **Trazabilidad:** Toda transición de estado debe quedar registrada con el `MembershipID` responsable, el `Timestamp` y el `ContextID`.

### 6. Fronteras: ¿Qué pertenece a la Planeación y qué al contexto institucional?
- **Pertenece a la Planeación:** Las actividades, los objetivos, el rango de fechas, los materiales requeridos, las firmas de autoría y revisión, y el historial de cambios (versiones).
- **Pertenece al Contexto Institucional:** La normativa vigente, el catálogo de aprendizajes esperados (SEP/IMSS), los días festivos que afectan las fechas, y el nombre del grupo/centro. La planeación guarda una **referencia** (ID o Snapshot) a estos datos, pero no es dueña del catálogo.

### 7. Enriquecimiento por IA vs. Determinismo
**Determinístico (Intocable por IA):**
- El flujo de aprobación (firmas, transiciones de estado, permisos).
- Las fechas, la sala asignada y los autores.
- Las normativas (La IA no puede inventar una regla de Protección Civil).

**Enriquecido por IA (Asistido):**
- La **generación de actividades didácticas** (basadas en edad y aprendizajes esperados).
- La **redacción y corrección de estilo** de los objetivos.
- La **validación previa (AI Linter)** (ej. "La IA detecta que has puesto tijeras en Sala de Lactantes, ¿estás seguro?").
- Las recomendaciones de adaptabilidad para necesidades especiales (Inclusión).
