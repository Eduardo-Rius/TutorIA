# TutorIA — Capability Map

## Propósito
Definir las capacidades atómicas del sistema. TutorIA se construye sobre capacidades abstractas y reusables, no sobre pantallas rígidas. Una capacidad es una habilidad fundamental de la plataforma.

## Mapa de Capacidades Estratégicas

### Institutional Capabilities
- **Aprobar:** Autorizar formalmente un flujo o documento.
- **Auditar:** Rastrear inmutablemente quién, cuándo y por qué actuó el sistema.
- **Escalar:** Delegar una decisión o alerta a una jerarquía superior.
- **Proteger:** Asegurar que los datos PII y de menores permanezcan aislados.

### Knowledge Capabilities
- **Clasificar:** Etiquetar y organizar piezas de información en taxonomías.
- **Versionar:** Mantener snapshots inmutables del conocimiento en el tiempo.
- **Validar:** Certificar que un documento es correcto, legal y vigente.
- **Buscar:** Localizar conocimiento de manera híbrida (keywords).
- **Distribuir conocimiento:** Empujar el conocimiento normativo correcto en el momento operativo exacto.

### Cognitive Capabilities
- **Observar:** Ingestar datos empíricos de la realidad.
- **Comprender:** Analizar e interpretar el input del usuario.
- **Contextualizar:** Cruzar la comprensión contra el entorno, el grupo y la institución.
- **Recordar:** Acceder a la memoria a corto y largo plazo del grupo o infante.
- **Relacionar:** Descubrir conexiones ontológicas en el Knowledge Graph.

### AI Capabilities
- **Recuperar (Retrieve):** Encontrar semánticamente los chunks normativos más probables (RAG).
- **Planear:** Sintetizar rutinas estructuradas.
- **Recomendar:** Formular sugerencias accionables basadas en teoría.
- **Comparar:** Evaluar el estado actual contra el deber ser normativo.
- **Explicar:** Transparentar el razonamiento (Explainable AI).
- **Justificar:** Defender una recomendación usando la memoria y la norma.
- **Citar:** Proveer referencias exactas de las fuentes documentales.
- **Aprender:** Refinar procesos cognitivos sin alterar la base (Feedback Learning).
- **Anticipar:** Proponer acciones antes de que el usuario las solicite (Basado en línea de tiempo).

### Pedagogical Capabilities
- **Evaluar:** Emitir juicios de valor profesional sobre el desarrollo infantil (Exclusivo para humanos, asistido por IA).

### Operational Capabilities
- **Colaborar:** Permitir la edición y revisión conjunta entre profesionales.

### Analytics Capabilities
- **Medir:** Cuantificar el rendimiento, la calidad del conocimiento y los costos (Observability).

## Estructura de Definición por Capacidad (Plantilla Futura)
Para implementar una capacidad, deberá documentarse así:
- **Propósito:** (Para qué sirve).
- **Actores beneficiados:** (Quiénes la utilizan).
- **Información requerida:** (Inputs, Ej. Observaciones, Chunks).
- **Información producida:** (Outputs, Ej. Borrador de planeación).
- **Dependencia arquitectónica:** (Qué motores técnicos requiere, Ej. RAG, Event Bus).
- **Nivel de madurez esperado:** (Estado de desarrollo o fase planeada).
