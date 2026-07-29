# TutorIA — Cognitive Architecture

*(Nota: Este documento describe la visión a largo plazo del modelo de razonamiento y no compromete ninguna tecnología o proveedor de IA en la fase actual de desarrollo).*

## Propósito
Modelar conceptualmente cómo razona TutorIA, estableciendo una separación clara entre los datos empíricos y las inferencias generadas por la plataforma.

## El Ciclo Cognitivo

El razonamiento de TutorIA sigue este flujo:
1. **Percepción:** Ingestión de datos empíricos u observaciones provistas por el usuario.
2. **Comprensión:** Análisis inicial del input (identificación de entidades, tonos, y elementos clave).
3. **Contextualización:** Cruce de la comprensión con la estructura jerárquica del grupo y usuario.
4. **Consulta de memoria:** Revisión del historial del grupo (Child Development Timeline, Group Memory).
5. **Consulta de conocimiento institucional:** Recuperación (RAG) de lineamientos y normas aplicables al contexto.
6. **Generación de hipótesis:** Elaboración sintética de escenarios posibles. *(Nota: Una hipótesis de IA nunca debe almacenarse como un hecho confirmado en el sistema).*
7. **Validación normativa:** Contraste de las hipótesis contra las reglas de seguridad y políticas institucionales (Decision Engine).
8. **Generación de alternativas:** Creación de múltiples rutas de acción fundamentadas.
9. **Evaluación de alternativas:** Ponderación de las opciones según pertinencia e impacto.
10. **Selección o abstención:** Elección de la mejor alternativa, o detonación de una alerta de abstención si no hay certeza o soporte documental.
11. **Explicación:** Construcción del "por qué" de la recomendación de forma transparente.
12. **Validación humana:** Intervención obligatoria del profesional (Human-in-the-Loop) para aprobar o rechazar la acción.
13. **Retroalimentación:** Captura de la decisión del usuario como dato de ajuste.
14. **Aprendizaje institucional:** Ingesta de la experiencia validada a la memoria organizacional.

## Taxonomía de la Información

Para garantizar la integridad, TutorIA distingue estrictamente entre:
- **Dato observado:** Hecho registrado cualitativamente sin juicio de valor.
- **Interpretación:** Lectura profesional de un dato observado.
- **Hipótesis:** Propuesta probabilística generada por la IA.
- **Recomendación:** Propuesta final seleccionada por el motor.
- **Decisión humana:** La acción ejecutiva final tomada por un profesional.
- **Hecho confirmado:** Información validada mediante evidencia o autoridad.
- **Regla normativa:** Lineamiento inmutable proveniente del Knowledge Registry.
- **Memoria histórica:** El rastro acumulado de todos los elementos anteriores.

## Capas Cognitivas de Contexto

El modelo procesa la información apilando las siguientes capas de contexto:
1. Contexto institucional.
2. Contexto del tenant.
3. Contexto del centro.
4. Contexto del grupo.
5. Contexto temporal.
6. Contexto pedagógico.
7. Contexto normativo.
8. Memoria histórica.
9. Seguridad y autorización.
10. Propósito de la consulta.

## Transparencia y Explicabilidad (XAI)

*(Nota: Nunca se debe revelar ni diseñar la "chain of thought" privada del LLM base).*

La explicación presentada al usuario consistirá en:
- Fuentes normativas utilizadas.
- Hechos observados y considerados.
- Reglas institucionales aplicadas.
- Alternativas evaluadas a alto nivel.
- Razones pedagógicas de la recomendación final.
- Declaración de incertidumbres y lagunas de información.
- Necesidad explícita de validación humana.
