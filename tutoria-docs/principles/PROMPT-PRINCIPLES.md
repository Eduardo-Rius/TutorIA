# Principios de Diseño de Prompts (Prompt Principles)

**Status:** ACTIVE
**Scope:** Generative Intelligence Layer

En TutorIA, los prompts no son scripts mágicos ni contienen lógica de negocio; son meras interfaces de comunicación con los Modelos Generativos (LLMs). Para evitar que los prompts se conviertan en cajas negras inauditables o fuentes de alucinaciones institucionales, todo prompt debe diseñarse bajo las siguientes reglas estructurales:

## 1. Contexto Primero
El prompt siempre debe iniciar anclando al modelo en el contexto institucional. Antes de indicar qué debe hacer, se le debe proporcionar la realidad (ej. nivel educativo, capacidades del entorno, historial del documento). El modelo no debe "asumir" ningún contexto.

## 2. Fuentes Explícitas
Toda validación o sugerencia debe estar respaldada por fuentes inyectadas en el prompt. No se confía en el conocimiento pre-entrenado del modelo sobre leyes o normativas. El prompt debe proveer los fragmentos normativos recuperados (RAG) y ordenar explícitamente: *"Basado ÚNICAMENTE en el siguiente documento..."*.

## 3. Instrucciones Separadas
Las instrucciones operativas deben estar claramente delimitadas del contenido inyectado por el usuario. Se deben utilizar delimitadores estandarizados (ej. `"""`, `<context>`, `<instruction>`) para prevenir inyecciones de prompt (Prompt Injection) accidentales o maliciosas.

## 4. Temperatura por Capacidad
La configuración heurística del modelo debe ajustarse a la capacidad solicitada:
- **0.0 - 0.2**: Para extracción de datos, clasificación, y validación estructurada.
- **0.3 - 0.5**: Para resúmenes, síntesis y redacción profesional conservadora.
- **0.6 - 0.8**: Para ideación (ej. sugerencias de actividades nuevas), siempre limitadas por el contexto.

## 5. Salida Estructurada Obligatoria
Los modelos jamás deben responder en texto libre no estructurado cuando interactúan con el backend. Toda respuesta debe forzarse a un esquema estricto (JSON/XML) para que pueda ser parseado de forma determinística y tipada (DTO) antes de llegar al dominio.

## 6. Explicación Obligatoria
Cada vez que el prompt solicite una evaluación, clasificación o sugerencia, debe obligar al modelo a incluir un campo `rationale` o `explanation`. El sistema no aceptará un dictamen generativo sin su justificación.

## 7. Prohibido Generar Normativa
El prompt debe contener instrucciones explícitas prohibiendo al modelo inventar o deducir normativas, fechas, o reglas institucionales. Si la normativa inyectada no cubre el caso, el modelo debe configurarse para responder explícitamente que *"carece de contexto normativo para evaluar este punto"*.
