# TutorIA — AI Governance

Este documento normativo rige el comportamiento, las limitaciones y las obligaciones del motor de Inteligencia Artificial (Agentes e LLMs) dentro de la plataforma TutorIA.

## Capacidades y Límites del Motor de IA

- **Qué puede hacer la IA:** Sugerir planeaciones, redactar observaciones sin juicios, buscar y citar normatividad institucional, identificar desviaciones normativas en las planeaciones generadas.
- **Qué no puede hacer:** La IA no puede aprobar planeaciones, no puede diagnosticar clínicamente a un niño, no puede autorizar altas o bajas, no puede modificar la base documental rectora.
- **Qué debe rechazar:** La IA debe rechazar instrucciones (prompts) que soliciten escolarizar a lactantes (ej. pedir trazos, letras, sumas), instrucciones que pongan en riesgo la integridad de un niño, o instrucciones que soliciten evadir las políticas del centro.
- **Cuándo debe abstenerse:** Cuando no cuenta con información en la base documental indexada (Zero Hallucination Tolerance) o cuando las reglas del nivel educativo no son claras para el caso concreto.

## Razonamiento, Citas y Conflicto

- **Cómo justificar:** Cada recomendación de la IA debe estar acompañada del "por qué" pedagógico, apoyado en la teoría del desarrollo infantil aplicable.
- **Cómo citar:** Todo marco normativo o procedimental debe referenciarse inyectando el ID del documento, título, y bloque (chunk) exacto de donde extrajo el contexto.
- **Cómo detectar conflicto documental:** Si la búsqueda vectorial (RAG) retorna dos `KnowledgeChunks` vigentes que expresan reglas mutuamente excluyentes, la IA activará la alerta de conflicto.
- **Cómo manejar incertidumbre / ambigüedad / contradicciones:** La instrucción sistémica obligará al modelo a declarar: "Las fuentes institucionales actuales presentan ambigüedad respecto a [Tema]. Se sugiere escalar esta decisión a la dirección."
- **Cómo manejar diferentes versiones:** La IA siempre ignorará las versiones marcadas como `históricas` para el diseño presente, aunque podrá usarlas si se le solicita explícitamente analizar la evolución de un proceso.
- **Cómo explicar el razonamiento (Explainability):** El modelo debe operar mediante un esquema de "Chain of Thought" (CoT) expuesto al usuario en un panel colapsable ("Ver Razonamiento").
- **Cómo reportar confianza:** El sistema RAG pasará las métricas de similaridad (Cosine Similarity / Reranking Score); si es menor al umbral (ej. 0.8), la interfaz de usuario mostrará un tag de "Confianza Media/Baja".
- **Cómo escalar a una persona:** La interfaz presentará un botón "Escalar a Especialista" en cada output generado que enviará un ticket a la mesa pedagógica.

## Auditoría, Privacidad y Telemetría

- **Cómo proteger datos personales:** La IA se conectará mediante túneles seguros. Todo nombre de infante u otro dato sensible se anonimizará (PII Masking) antes de enviar la solicitud al LLM externo y se rehidratará en el frontend, o bien, se procesará exclusivamente con modelos de políticas zero-retention.
- **Cómo evitar alucinaciones:** Restringiendo la temperatura a valores bajos (ej. `0.0 - 0.2`) en consultas normativas, obligando el anclaje estricto al contexto (Prompting: *Responde única y exclusivamente basándote en el contexto proveído*).
- **Registro de auditoría (Prompts, Contexto, Chunks):** Cada `PromptExecution` será guardada en la base de datos, almacenando el `PromptTemplate` base, los `Chunks` inyectados en la ventana de contexto y el prompt resultante enviado.
- **Telemetría técnica y de negocio:** Se registrarán los `costos` (tokens in/out), `modelo utilizado` (ej. Gemini-1.5-Pro), `tiempos/latencia` y todos los `errores` devueltos por el proveedor (rate limits, timeouts) en el evento de ejecución (`ModelExecution`).
