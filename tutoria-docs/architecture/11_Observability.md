# TutorIA — Observability

TutorIA adopta un enfoque "Observability First". Un sistema centrado en conocimiento e Inteligencia Artificial no puede operar a ciegas; requiere telemetría profunda, métricas precisas y logs estructurados para cada interacción.

## Alcance de la Observabilidad

Toda interacción (evento, ejecución de IA, error de usuario) generará telemetría rica que deberá viajar hacia un colector central (Ej. Google Cloud Logging/Monitoring, Datadog).

## Registro Estructurado (Payload de Telemetría)

Cada evento (`TelemetryEvent`, `AuditStream`, `ModelExecution`) deberá registrar contextualmente:

- **Contexto Organizacional:**
  - `Institución` (ID del Tenant).
  - `Guardería` (ID del Centro).
  - `Grupo` (ID del Grupo / Sala).
- **Contexto del Actor:**
  - `Usuario` (ID del usuario ejecutante).
- **Contexto Operativo:**
  - `Evento` (Nombre del evento o comando).
  - `Documentos utilizados` (IDs de los DocumentVersion que formaron parte de la acción).
- **Contexto de Inteligencia Artificial:**
  - `Modelo IA` (Ej. gemini-1.5-pro, claude-3-haiku).
  - `Versión` (Versión específica del modelo).
  - `Prompt` (Template y prompt crudo inyectado).
  - `Chunks` (Los fragmentos recuperados en el RAG).
  - `Respuesta` (El output devuelto por el LLM).
  - `Nivel de confianza` (Score del retriever/reranker).
- **Métricas de Rendimiento y Costo:**
  - `Latencia` (Tiempo en milisegundos desde el request hasta el completion).
  - `Tokens` (Input tokens, output tokens).
  - `Costo` (Cálculo financiero por inferencia).
- **Salud del Sistema:**
  - `Errores` (Códigos de error HTTP, gRPC).
  - `Excepciones` (Stack traces sanitizados).
  - `Alertas` (Triggers configurados que excedieron los umbrales de seguridad o costo).
