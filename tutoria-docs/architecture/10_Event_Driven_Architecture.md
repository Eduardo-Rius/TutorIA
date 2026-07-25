# TutorIA — Event Driven Architecture

TutorIA operará bajo el paradigma de Event-Driven Architecture (Arquitectura Orientada a Eventos). El sistema no dependerá exclusivamente de flujos sincrónicos y llamadas RPC/REST tradicionales, sino que reaccionará a los cambios de estado en todo el dominio a través de un bus de eventos (Event Bus).

## Conceptos Fundamentales

- **Comandos (Commands):** Solicitan que el sistema realice una acción que modificará el estado. Pueden ser rechazados (Ej. `CrearPlaneacionCommand`).
- **Eventos (Domain/System Events):** Hechos inmutables que *ya ocurrieron* en el sistema (Ej. `ObservacionRegistrada`, `PlaneacionAprobada`). No pueden ser borrados ni denegados, solo compensados.
- **Consultas (Queries):** Solicitudes de lectura del estado actual. No tienen efectos colaterales (Ej. `GetHistorialGrupoQuery`).
- **Notificaciones (Notification Events):** Eventos proyectados hacia los usuarios finales (Ej. Email, Push Notification) para alertar sobre cambios de estado.
- **Auditoría (Audit Stream):** Un ledger inmutable donde absolutamente cada Comando ejecutado y cada Evento emitido se registra cronológicamente, garantizando la trazabilidad perfecta de "Quién hizo Qué, Cuándo".

## Ejemplo de Flujo Orientado a Eventos

El poder de esta arquitectura se evidencia en la cadena de reacción (Choreography):

1. **Nueva observación** (El usuario registra y guarda una observación en la sala).
2. **↓ Nuevo evento** (`ObservacionPedagogicaRegistrada`).
3. **↓ IA recalcula recomendaciones** (Un microservicio suscrito al evento detecta que el contexto de la sala cambió y dispara un background job).
4. **↓ Se actualiza memoria** (El perfil vectorial o contexto semántico del Grupo se actualiza con la nueva observación).
5. **↓ Se genera notificación** (Se avisa a la titular: "Tienes nuevas sugerencias listas").
6. **↓ Se registra auditoría** (El evento se guarda permanentemente en el AuditStream).
7. **↓ Se invalidan recomendaciones anteriores** (Otras planeaciones borrador que aún no han sido aprobadas pierden validez).
8. **↓ Se recalculan indicadores** (El módulo analítico actualiza el Dashboard del centro).

## Eventos Core por Módulo

- **Identidad & Tenant:** `TenantCreado`, `UsuarioRegistrado`, `RolAsignado`, `SesionIniciada`.
- **Organización:** `CentroAperturado`, `EducadoraAsignadaAGrupo`, `InfanteInscrito`.
- **Pedagogía:** `PlaneacionGenerada`, `PlaneacionAprobada`, `PlaneacionRechazada`, `EvaluacionConcluida`.
- **Knowledge Base:** `DocumentoIngerido`, `ChunkInvalidado`, `NormaDerogada`.
- **Inteligencia Artificial:** `PromptEjecutado`, `UmbralConfianzaFallido`.
