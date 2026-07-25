# ADR-0001: Adoptar una estrategia Knowledge First antes del desarrollo funcional

## Contexto
TutorIA requiere no solo generar texto, sino operar bajo una capa normativa estricta dictada por autoridades institucionales (IMSS, SEP). El desarrollo apresurado de interfaces (UI) y componentes funcionales (MVP GuarderíasIMSS) produjo deuda técnica, acoplamiento y falta de certeza normativa en las salidas generadas.

## Decisión
Adoptar una estrategia *Knowledge First* (Conocimiento Primero) antes del desarrollo funcional. Esto implica detener la producción de código (React, Firebase, etc.) hasta no tener sólidamente definida, documentada y clasificada la arquitectura estratégica, documental y normativa del proyecto.

## Alternativas consideradas
- *Desarrollo Ágil Iterativo (Code First):* Seguir programando pantallas mientras se averigua la normativa. Rechazado por el alto riesgo de construir flujos ilegales o pedagógicamente incorrectos que después requieren reescrituras completas.

## Ventajas
- Mayor seguridad legal e institucional.
- Se previene la generación de "alucinaciones" de IA al acotar el contexto.
- Permite construir bases de datos (Firestore) alineadas a la realidad en el primer intento.
- Desacopla la lógica de negocio de la interfaz de usuario.

## Riesgos
- Sensación de avance lento por no tener "pantallas visibles" en las primeras semanas.
- Sobredocumentación si no se aterriza a requerimientos técnicos concretos.

## Consecuencias
- El Sprint 0 se dedica exclusivamente a modelado y documentación.
- Todo desarrollo funcional del Sprint 1 en adelante requerirá apuntar a un documento fuente del Sprint 0 como justificación.

## Criterios para reconsiderar
- Si los stakeholders exigen un prototipo funcional sin validación normativa, se deberá levantar un acta de riesgo extremo.
