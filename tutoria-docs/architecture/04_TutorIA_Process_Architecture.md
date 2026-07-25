# TutorIA — Process Architecture

Este documento detalla el inventario preliminar de los macro-procesos orquestados por TutorIA.

## Inventario de Procesos

1. Planeación pedagógica.
2. Revisión y aprobación.
3. Ejecución y evaluación.
4. Seguimiento del desarrollo.
5. Estimulación específica.
6. Seguimiento a cambios de conducta.
7. Recepción y entrega.
8. Asistencia.
9. Inscripción.
10. Alimentación.
11. Fomento de la Salud.
12. Administración de personal.
13. Supervisión.
14. Seguridad.
15. Consejo de Padres.
16. Gestión documental.

---

### 1. Planeación Pedagógica
- **Nombre:** Planeación Pedagógica Asistida
- **Propósito:** Generar la estrategia de trabajo educativo (diario/semanal/quincenal) basada en las observaciones y necesidades del grupo.
- **Evento de inicio:** Registro formal de una observación detonante.
- **Actores:** Educador(a) / Asistente, Motor Pedagógico IA.
- **Entradas:** Observaciones capturadas, planificaciones previas, normativa institucional.
- **Etapas:** Análisis de observación → Propuesta de necesidades → Sugerencia de experiencias → Revisión humana → Generación de borrador.
- **Decisiones:** Ajuste de actividades, selección de campos formativos (Preescolar), aceptación o rechazo de propuesta IA.
- **Excepciones:** Incongruencia detectada por IA, falta de observaciones (alerta de generación sin sustento).
- **Evidencias:** Borrador de Planeación.
- **Salidas:** Planeación en estado `Pendiente de Validación`.
- **Estado final:** Enviada a revisión.
- **Alertas:** Planeación generada en fecha límite, discrepancia normativa.
- **Reglas:** No se genera planeación sin observación previa documentada.
- **Trazabilidad:** Registro de prompts a la IA, sugerencias emitidas vs. aceptadas por el usuario.
- **Documentos fuente pendientes de validación:** Procedimiento de Pedagogía para Guarderías Madres IMSS y Ordinarias.

### 2. Revisión y aprobación
- **Nombre:** Aprobación de Planeación
- **Propósito:** Validar que la planeación cumple con la normativa y los lineamientos del centro.
- **Evento de inicio:** Planeación entra a estado `Pendiente de Validación`.
- **Actores:** Educadora Titular, Directora, Pedagoga (según esquema).
- **Entradas:** Borrador de Planeación.
- **Etapas:** Revisión de rúbrica → Autorización o Rechazo con comentarios.
- **Decisiones:** Aprobar, Solicitar ajustes, Rechazar.
- **Excepciones:** Aprobación fuera de tiempo.
- **Evidencias:** Visto bueno electrónico (Approval).
- **Salidas:** Planeación en estado `Vigente y autorizada` o `Requiere Ajustes`.
- **Estado final:** Autorizada.
- **Alertas:** Planeaciones atrasadas por más de 48h.
- **Reglas:** Solo actores con rol de autoridad asignado al grupo pueden aprobar.
- **Trazabilidad:** Firma electrónica (ID de sesión, fecha, comentarios).
- **Documentos fuente pendientes de validación:** Pendiente de extracción y validación documental.

### 3. Ejecución y Evaluación
- **Nombre:** Evaluación Pedagógica Cualitativa
- **Propósito:** Documentar los resultados y ajustar la práctica educativa.
- **Evento de inicio:** Conclusión de la vigencia temporal de la planeación.
- **Actores:** Educador(a).
- **Entradas:** Planeación ejecutada.
- **Etapas:** Registro narrativo descriptivo → Sugerencias de IA para análisis profundo → Finalización.
- **Decisiones:** Elementos a conservar o desechar.
- **Excepciones:** Suspensión de actividades.
- **Evidencias:** Documento de evaluación.
- **Salidas:** Evaluación cualitativa guardada; cierre del ciclo de la planeación.
- **Estado final:** Evaluada.
- **Alertas:** Omisión de registro cualitativo.
- **Reglas:** La evaluación alimenta el contexto para la siguiente planeación.
- **Trazabilidad:** Inmutabilidad del registro de evaluación.
- **Documentos fuente pendientes de validación:** Pendiente de extracción y validación documental.

### Procesos 4 a 16 (Ejemplo representativo)

*Nota: Los siguientes procesos comparten un esqueleto estándar que será desarrollado iterativamente a medida que se inyecte el conocimiento de dominio validado.*

- **Nombre:** [Ej. Seguimiento del desarrollo / Inscripción / Alimentación / etc.]
- **Propósito:** Pendiente de extracción y validación documental.
- **Evento de inicio:** Pendiente de extracción y validación documental.
- **Actores:** Pendiente de extracción y validación documental.
- **Entradas:** Pendiente de extracción y validación documental.
- **Etapas:** Pendiente de extracción y validación documental.
- **Decisiones:** Pendiente de extracción y validación documental.
- **Excepciones:** Pendiente de extracción y validación documental.
- **Evidencias:** Pendiente de extracción y validación documental.
- **Salidas:** Pendiente de extracción y validación documental.
- **Estado final:** Pendiente de extracción y validación documental.
- **Alertas:** Pendiente de extracción y validación documental.
- **Reglas:** Pendiente de extracción y validación documental.
- **Trazabilidad:** Pendiente de extracción y validación documental.
- **Documentos fuente pendientes de validación:** Pendiente de extracción y validación documental.
