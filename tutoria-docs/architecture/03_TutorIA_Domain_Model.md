# TutorIA — Domain Model

Este modelo de dominio describe de manera conceptual las entidades del sistema, sin definir ni acoplar aún las colecciones técnicas (ej. colecciones de Firestore).

## Modelo de Identidad

El esquema de acceso e identidad de TutorIA se define expresamente como:
`Usuario individual + Asignación a institución + Asignación a centro + Asignación a grupo + Rol + Periodo de vigencia`

- **Importante:** La memoria del grupo debe mantenerse intacta de forma permanente, aunque cambien las personas asignadas o los docentes roten. Queda estrictamente prohibido proponer y utilizar usuarios genéricos (ej. "SalaC@guarderia.com") compartidos por un grupo.

## Entidades de Organización

### Institution
- **Propósito:** Representa a la institución marco (ej. IMSS, SEP).
- **Atributos conceptuales:** Nombre, régimen legal, configuración base.
- **Relaciones:** Contiene OrganizationalUnits, Centers, ServiceSchemes.
- **Propietario institucional:** Administrador global del sistema.
- **Sensibilidad:** Pública / General.
- **Retención:** Permanente.
- **Reglas principales:** Define las políticas globales sobre sus centros subordinados.

### OrganizationalUnit
- **Propósito:** Agrupador estructural superior al centro (ej. OOAD, Dirección regional).
- **Atributos conceptuales:** Nombre, tipo, identificador institucional.
- **Relaciones:** Pertenece a Institution, contiene Delegations/Zones.
- **Propietario institucional:** Institution.
- **Sensibilidad:** General.
- **Retención:** Permanente.
- **Reglas principales:** Hereda políticas de la Institution.

### Delegation / Zone
- **Propósito:** Representación geográfica o administrativa (Delegación Estatal, Zona Escolar).
- **Atributos conceptuales:** Nombre, clave.
- **Relaciones:** Contiene Centers.
- **Propietario institucional:** OrganizationalUnit.
- **Sensibilidad:** General.
- **Retención:** Permanente.
- **Reglas principales:** Agrupa operativamente la supervisión.

### Center
- **Propósito:** La unidad operativa base (la guardería o escuela).
- **Atributos conceptuales:** Nombre, clave, domicilio, estado (activo/inactivo).
- **Relaciones:** Tiene Rooms, Groups, ServiceScheme, Enrollments.
- **Propietario institucional:** Director del centro.
- **Sensibilidad:** Moderada.
- **Retención:** Permanente.
- **Reglas principales:** El centro es el límite natural para los datos de los niños; los usuarios del centro no ven datos de otro.

### ServiceScheme
- **Propósito:** Define el esquema normativo (Ordinario, Vecinal Comunitario, Directo).
- **Atributos conceptuales:** Nombre, capacidades permitidas, restricciones.
- **Relaciones:** Aplica a Center, NormativeRule.
- **Propietario institucional:** Institution.
- **Sensibilidad:** General.
- **Retención:** Permanente.
- **Reglas principales:** Dictamina qué procedimientos normativos aplican al centro.

### Room / Group / AgeRange / EducationalLevel
- **Room:** Espacio físico dentro del centro.
- **Group:** Conjunto de infantes agrupados (ej. Lactantes A). Retiene la memoria histórica del grupo (observaciones, planeaciones pasadas) independientemente de los usuarios asignados.
- **AgeRange:** Define los límites de edad permitidos para un grupo.
- **EducationalLevel:** Inicial o Preescolar. Define qué motor pedagógico se utiliza.

## Entidades de Identidad y Control de Acceso

### User / Person
- **Propósito:** Representar al individuo real que accede al sistema y sus datos personales.
- **Atributos conceptuales:** Nombre real, email (identity), CURP o equivalente.
- **Relaciones:** Tiene múltiples Assignments.
- **Propietario institucional:** El propio individuo.
- **Sensibilidad:** Alta (Datos personales).
- **Retención:** Hasta la baja o solicitud legal, conservando IDs de auditoría.
- **Reglas principales:** Las credenciales son personales e intransferibles.

### Role / Permission / Assignment / UserSession
- **Role & Permission:** Define qué puede hacer un actor.
- **Assignment:** Relaciona a un User con un Center, Group, y Role por un periodo de tiempo (`vigencia`).
- **UserSession:** Sesión activa que incluye contexto transaccional auditable.

## Entidades de Población (Infantes)

### Child / Family / AuthorizedContact / Enrollment / Attendance
- **Propósito:** Gestión de expedientes de los menores, sus responsables y su registro de asistencia.
- **Atributos conceptuales:** Datos demográficos del Child, historial de Enrollment, estatus (activo/baja).
- **Sensibilidad:** Crítica (Datos sensibles de menores).
- **Retención:** Por normativa legal (ej. 5 años posteriores al egreso).
- **Reglas principales:** El acceso está ultra-restringido a los asignados (docentes, director del centro aplicable).

## Entidades de Pedagogía

### Observation / PedagogicalPlanning / PlanningVersion / PlanningActivity / LearningEnvironment / Material
- **Propósito:** Documentar el núcleo pedagógico diario y cíclico.
- **Relaciones:** Observation genera PedagogicalPlanning (que tiene PlanningVersions para auditoría).
- **Propietario institucional:** Center / Group (la memoria pertenece al grupo).
- **Sensibilidad:** Moderada-Alta.
- **Retención:** Histórica permanente para el grupo.
- **Reglas principales:** Ninguna planeación sobrescribe a otra, se versionan (PlanningVersion). Toda observación se amarra a la planeación generada.

### CurricularField / DevelopmentProcess / PrioritizedPractice / ComplementaryProgram
- **Propósito:** Entidades normativas de los marcos (ej. Nueva Escuela Mexicana, Programa Institucional).
- **Reglas principales:** Restringen las selecciones en la creación de la planeación según el EducationalLevel.

### Evaluation / Evidence
- **Propósito:** Valoración cualitativa y evidencia documental del desarrollo.
- **Sensibilidad:** Alta.

## Entidades de Operación Especializada

### Incident / BehaviorFollowUp / DevelopmentEvaluation / SpecificStimulationProgram / HealthRecord / NutritionRecord
- **Propósito:** Módulos de seguimiento para situaciones particulares, reportes médicos y alimentación.
- **Sensibilidad:** Crítica (Contienen datos de salud y comportamiento de menores).
- **Propietario institucional:** Médicos, directoras, pedagogos.
- **Reglas principales:** Acceso restringido por rol y necesidad de conocer. Requieren notificaciones en cadena hacia superiores.

## Entidades de Conocimiento (Knowledge Architecture)

### Document / DocumentVersion / NormativeRule / KnowledgeChunk / Citation
- **Propósito:** Repositorio base de conocimiento y su ingestión para RAG.
- **Relaciones:** Document tiene DocumentVersions, los cuales se dividen en KnowledgeChunks citados mediante Citations. NormativeRule traduce políticas a reglas de negocio.
- **Propietario institucional:** Institution.
- **Sensibilidad:** General a Restringida (según DocumentType).
- **Retención:** Permanente (marcado como Histórico si es derogado).
- **Reglas principales:** Todo Chunk debe apuntar a un DocumentVersion para la trazabilidad exacta de la fuente generada por la IA.

## Entidades de Workflow y Trazabilidad

### Workflow / WorkflowInstance / Approval / AuditEvent / Notification
- **Propósito:** Gobernar aprobaciones (ej. Planificaciones) y asegurar una traza Zero Trust.
- **Atributos conceptuales:** Eventos, transiciones, autorizadores, huella criptográfica/hash.
- **Sensibilidad:** Alta.
- **Reglas principales:** Toda acción de escritura, validación y consulta (incluyendo a la IA) genera un AuditEvent inmutable. Un Approval requiere al actor exacto definido en el Assignment.

## Entidades de la Arquitectura de Conocimiento (Knowledge Operating System)
- **Tenant**: Aislamiento de instancia institucional (MultiTenant).
- **KnowledgeRegistry**: Inventario central de las fuentes de conocimiento.
- **KnowledgeLifecycle**: Estado temporal y log de ciclo de vida del conocimiento.
- **KnowledgeApproval**: Registro de las autorizaciones dadas a una pieza de conocimiento.
- **KnowledgeVersion**: Versión estática e inmutable de un documento.
- **KnowledgeOwner**: Responsable institucional asignado al mantenimiento del documento.
- **KnowledgeReviewer**: Actor encargado de validar y aprobar los cambios al conocimiento.
- **KnowledgeDistribution**: Políticas de cómo y a quién se disemina la información.
- **KnowledgeAnalytics / KnowledgeMetric**: Tableros y métricas de uso y éxito del conocimiento.
- **KnowledgeAudit**: Traza criptográfica o estricta de cambios en el KOS.
- **KnowledgeConflict / KnowledgeResolution / KnowledgeReview**: Mecanismos para la detección y corrección de contradicciones en el acervo.
- **VectorIndex / EmbeddingJob / Chunk / ChunkVersion / ChunkReview**: Entidades técnicas para la vectorización (RAG) y validación manual de la información fraccionada.
- **CitationSource**: Enlace vinculante entre una respuesta generada y un Chunk exacto.

## Entidades de Inteligencia Artificial (AI Governance)
- **AIConversation / AIConversationMessage**: Historial de diálogo estructurado con los asistentes.
- **AIRecommendation / AIRecommendationVersion**: Sugerencias y revisiones de la IA (Ej. Planeación sugerida).
- **PromptTemplate / PromptVersion**: Plantillas de inyección de contexto administradas centralmente.
- **PromptExecution / PromptEvaluation**: Registro inmutable de lo que se envió a OpenAI/Gemini y cómo fue calificado.
- **ModelExecution**: Registro base del evento de inferencia para telemetría y facturación.
- **AIFeedback / HumanValidation**: Retroalimentación y aprobación humana a las salidas sintéticas.

## Entidades de Pedagogía Avanzada
- **ChildDevelopmentTimeline**: Línea de tiempo ininterrumpida de observaciones y logros por infante.
- **PedagogicalRecommendation**: Intervenciones sugeridas curadas.

## Entidades de Configuración y Observabilidad
- **FeatureFlag / FeatureModule / FeatureConfiguration**: Alternadores de módulos para despliegues progresivos y licenciamiento MultiTenant.
- **SystemEvent / DomainEvent / NotificationEvent / AuditStream / TelemetryEvent**: Tipos de eventos inmutables para el Event Bus y la Observabilidad.
