# TutorIA — Functional Modules

Este documento define de forma modular y agrupada las capacidades estratégicas y funcionales del sistema.

## Núcleo Institucional (Core MVP/Piloto)

- **Identidad y acceso:** Autenticación segura, Single Sign-On (SSO), y gestión de perfiles individuales.
- **Organización institucional:** Modelado de esquemas de prestación (Ordinario, Vecinal, etc.) y normativas globales.
- **Centros, salas y grupos:** Gestión estructural de la operación en sitio y control de los agrupamientos de infantes.
- **Usuarios, roles y asignaciones:** Administración de permisos basados en roles (RBAC) y vigencia de contratos.
- **Auditoría:** Trazabilidad inmutable y logs de transacciones críticas (Event Sourcing / Event Log).
- **Gestión documental:** Repositorio base de conocimiento de la plataforma (Políticas, PDFs).
- **Configuración:** Parámetros globales y adaptadores para la interfaz e integraciones de sistema.

## Pedagogía (Core MVP/Piloto)

- **Observaciones:** Módulo de captura cualitativa de situaciones y conductas.
- **Planeaciones:** Interfaz de generación, edición y revisión narrativa de la planeación educativa.
- **Versionado:** Control de cambios en la planeación (Diferencia de versiones).
- **Revisión y aprobación:** Flujos de revisión (Workflows) con firma y autorización (Visto Bueno).
- **Evaluaciones:** Registro formativo del cierre de ciclos de planeación.
- **Historial del grupo:** Expediente persistente de intervenciones, observaciones y evaluaciones a nivel grupo.

### Fases Posteriores en Pedagogía
- **Desarrollo infantil (Fase 2):** Rúbricas e hitos de maduración.
- **Estimulación específica (Fase 2):** Diseño de programas focales.
- **Seguimiento de conducta (Fase 2):** Intervenciones psicológicas y apoyos adicionales.
- **Evidencias (Fase 2):** Captura multimedia y almacenamiento seguro de material.

## Inteligencia Artificial (Core MVP/Piloto)

- **Asistente pedagógico:** IA de interacción natural (Chat) con contexto restringido de grupo.
- **Generación asistida:** Autocompletado, sugerencias y bosquejos de planeaciones fundados en observación.
- **Validación normativa:** Revisión estática de las planeaciones para detectar violaciones a las reglas (edad, cuidado, etc.).
- **Explicación de recomendaciones:** La IA explica el razonamiento de sus sugerencias paso a paso.
- **Detección de inconsistencias:** Alerta cuando la observación y la planeación no tienen una trazabilidad lógica.

### Fases Posteriores en IA
- **Consulta documental (Fase 2 - RAG):** Diálogo dinámico contra un gran volumen de acervos normativos indexados.
- **Citación de fuentes (Fase 2 - RAG):** Referencia explícita al párrafo y manual normativo que sustenta el output.
- **Abstención y escalamiento humano (Fase 2):** Mecanismos estrictos de fallback cuando el asistente carece de certidumbre legal.

## Operación Integral

*(Fase 3 y Futuro)*
- **Fomento de la Salud:** Seguimientos somatométricos, filtros sanitarios y alertas epidemiológicas.
- **Alimentación:** Lactarios, dietas especiales, control de biberones.
- **Asistencia:** Pase de lista electrónico seguro y alertas de inasistencias prolongadas.
- **Inscripción:** Digitalización de expedientes y admisión.
- **Seguridad:** Control de accesos físicos, entrega segura (personas autorizadas), simulacros.
- **Supervisión:** Listas de chequeo para auditores zonales y directores.
- **Administración de personal:** Capacitaciones, asistencias docentes.
- **Consejo de Padres:** Comunicación institucional y retroalimentación estructurada familiar.
- **Comunicación institucional:** Avisos generales oficiales.
- **Analítica:** Reportes de calidad operativa e indicadores clave.

## Plantilla Descriptiva por Módulo

Para documentar futuros desarrollos, los módulos deberán cumplir con el siguiente diseño:
- **Propósito:** El objetivo del módulo.
- **Capacidades:** Funciones que provee (Ej: "Crear Planeación", "Clonar Planeación").
- **Usuarios:** Roles que interactúan.
- **Información consumida:** Dependencias de lectura (Ej: Observaciones previas).
- **Información generada:** Outputs del módulo.
- **Dependencias:** Otros módulos requeridos.
- **Riesgos:** Amenazas asociadas (Seguridad, disponibilidad).
- **Prioridad propuesta:** Su fase correspondiente de entrega.

## Módulos del Knowledge Operating System (Iteración 1)

### Knowledge Governance & AI
- **Knowledge Center:** Repositorio principal de conocimiento.
- **Knowledge Governance:** Control de políticas y ciclo de vida de los documentos.
- **Knowledge Quality & Analytics:** Monitoreo y métricas de calidad documental.
- **Knowledge Administration:** Gestión de indexación y flujos de revisión.
- **Document Validation & Versioning:** Flujos de aprobación y versionado inmutable.
- **Knowledge Distribution & Metrics:** Estadísticas y canalización del conocimiento.
- **Knowledge Dashboard / Search / Explorer:** Interfaces para buscar y visualizar la red documental.
- **AI Governance:** Definición de barandillas (guardrails) de la IA.
- **Prompt Management & Studio:** Editor visual y control de versiones de prompts.
- **AI Monitoring:** Observabilidad en tiempo real de las respuestas LLM.

### Foundation & Observability
- **Feature Management:** Módulo de feature flags y lanzamientos progresivos.
- **Configuration Center:** Ajustes globales y parametrización de Tenant.
- **Institution & Tenant Administration:** Alta de clientes, instituciones y aislamiento de bases de datos.
- **Audit Center:** Visor inmutable de la traza Zero Trust.
- **System Health & Observability:** Telemetría central, costos y latencias (Logs, Metrics, Traces).
