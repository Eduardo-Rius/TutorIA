# TutorIA — Feedback Learning

## Propósito
Explicar cómo TutorIA evoluciona y mejora su asertividad y calidad sin necesidad de reentrenar automáticamente (Fine-Tuning dinámico) modelos fundacionales, mitigando el riesgo de "Data Poisoning" y fuga de datos privados.

## Fuentes de Aprendizaje (Señales)
El sistema capta telemetría de las siguientes acciones de usuario como "señales de ajuste":
- **Aceptación de recomendaciones:** Uso de la propuesta de IA sin cambios.
- **Modificaciones (Deltas):** Diferencias entre el borrador de IA y la versión final humana.
- **Rechazos:** Cancelación completa de una propuesta generada.
- **Motivos de rechazo:** Feedback estructurado del humano ("No aplica a lactantes", "Inseguro").
- **Evaluaciones humanas:** Calificaciones explícitas (Pulgar arriba/abajo, estrellas).
- **Documentos más citados:** Ranking de fuentes que resuelven más problemas operativos.
- **Consultas sin respuesta:** Preguntas donde la IA tuvo que abstenerse por falta de conocimiento.
- **Conflictos detectados:** Reglas documentales que generaron colisión lógica.
- **Escalaciones:** Solicitudes enviadas a un humano porque la IA no tenía autoridad o certeza.
- **Resultados posteriores:** Impacto a largo plazo de una recomendación implementada.
- **Patrones de corrección:** Correcciones estilísticas o semánticas recurrentes hechas por docentes.

## Clasificación del Aprendizaje (Capas)
- **Aprendizaje del usuario:** Preferencias de redacción del individuo (estilo).
- **Aprendizaje del grupo:** Historias recurrentes y contexto del aula específica.
- **Aprendizaje institucional:** Patrones de corrección que aplican a toda la organización.
- **Mejora del conocimiento:** Identificación de manuales faltantes (Knowledge Gaps).
- **Mejora de prompts:** Ajustes en los `PromptTemplates` base para evadir alucinaciones comunes.
- **Mejora de reglas:** Refinamiento del Decision Engine.
- **Mejora de recuperación (Retrieval Tuning):** Optimización del modelo de Embeddings/Reranker para subir la confianza de documentos útiles.
- **Entrenamiento futuro controlado:** Consolidación offline de millones de interacciones sanitizadas para Fine-Tuning periódico y deliberado, jamás en tiempo real.

## Controles Estrictos de Aprendizaje
- **Anonimización:** Eliminación implacable de PII (Personally Identifiable Information) antes de guardar los pares de "Prompt-Completion" para análisis.
- **Consentimiento:** Transparencia sobre el uso de metadatos.
- **Separación por tenant:** Lo que aprende el Tenant A (ej. Guarderías IMSS) jamás contamina ni influye en las sugerencias del Tenant B (ej. Guarderías SEP).
- **Revisión humana:** Las reglas inferidas por el sistema requieren validación del *Quality Reviewer*.
- **Versionado:** Si un prompt se mejora, se lanza como nueva versión auditable.
- **Posibilidad de reversión:** Capacidad de hacer "Rollback" si una mejora de prompt degrada el rendimiento.
- **Evaluación antes de publicación:** A/B testing estructurado de los agentes de IA.
- **Prohibición de aprendizaje automático silencioso:** El sistema no inyecta los rechazos directamente al LLM on-the-fly; todo aprendizaje se rutea mediante la mejora de Contexto y RAG (Knowledge Operating System) o refinamiento de meta-prompts supervisados.
