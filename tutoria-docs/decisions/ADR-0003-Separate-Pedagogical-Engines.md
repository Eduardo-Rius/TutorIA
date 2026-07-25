# ADR-0003: Separar el razonamiento pedagógico de Educación Inicial y Preescolar

## Contexto
Educación Inicial (0 a 3 años) y Educación Preescolar (3 a 6 años) responden a marcos curriculares y finalidades operativas muy diferentes según la SEP y el IMSS. Mezclar ambos en un solo prompt genérico de IA o un solo flujo de validación provoca que a Inicial se le exija escolarización prematura (campos formativos estrictos) o que a Preescolar le falte estructura académica (evaluaciones sin secuencia didáctica formal).

## Decisión
Separar estructuralmente el razonamiento pedagógico, los motores de validación y la arquitectura de IA entre Educación Inicial y Preescolar. 

## Alternativas consideradas
- *Un solo motor "Talla Única":* Rechazado. Genera fricción operativa y viola el principio pedagógico de no escolarización prematura de Educación Inicial.
- *Motores condicionados por simples if-else en frontend:* Rechazado. La separación debe ocurrir a nivel arquitectura, base de datos y diseño de prompts.

## Ventajas
- Garantiza respeto irrestricto al Programa Sintético SEP Fase 1 y a las normas de Cuidado Cariñoso y Sensible.
- Permite la creación de interfaces optimizadas para cada nivel (ej. narrativo para Inicial vs proyectos estructurados para Preescolar).
- Facilita el mantenimiento y mejora focalizada de los agentes de IA.

## Riesgos
- Duplicidad parcial de código en servicios backend si no se diseñan interfaces de software (abstracciones) adecuadas.
- Incremento en los costos de testing al tener que probar dos flujos distintos.

## Consecuencias
- Se construirán flujos, pantallas de captura, colecciones de base de datos y prompts de IA separados para ambos niveles educativos.
- El sistema debe conocer obligatoriamente el `EducationalLevel` del Grupo al que está asignada la educadora antes de invocar cualquier asistencia pedagógica.

## Criterios para reconsiderar
- Si la SEP unifica en el futuro ambos niveles educativos en una sola fase metodológica y operativa.
