# TutorIA — Decision Engine

*(Nota: Este documento describe la visión de la máquina de decisiones institucionales; no utiliza ni compromete reglas técnicas de Firestore ni código en su fase conceptual actual).*

## Propósito
Diseñar un motor conceptual de decisión separado del motor pedagógico. Este motor es el árbitro que dicta el nivel de autonomía y acción de TutorIA basándose en el riesgo, la autoridad y el contexto.

## Acciones del Motor de Decisión

El Decision Engine determina de manera determinista cuándo TutorIA:
- Responde.
- Genera una recomendación.
- Formula una pregunta aclaratoria.
- Solicita evidencia.
- Solicita datos faltantes.
- Se abstiene de actuar o inferir.
- Advierte de un riesgo normativo.
- Escala a un supervisor o humano.
- Bloquea una acción por violación de reglas.
- Requiere aprobación colegiada.
- Genera una notificación a terceros.
- Inicia un proceso de seguimiento.
- Registra una excepción.
- Espera un evento del sistema.
- Invalida una recomendación previa por cambio de contexto.

## Variables Conceptuales (Vectores de Decisión)

El motor evalúa las siguientes dimensiones para tomar una determinación:
- **Autoridad documental:** ¿La recomendación proviene de una Ley (Nivel 1) o de un ejemplo histórico (Nivel 9)?
- **Vigencia:** ¿Está caducada la fuente?
- **Confianza de recuperación (RAG Score):** ¿Qué tan probable es que el documento responda a la solicitud?
- **Conflicto entre fuentes:** ¿Existen directrices contradictorias en el acervo?
- **Sensibilidad de datos:** ¿Involucra PII, salud infantil o seguridad?
- **Rol del usuario:** ¿El solicitante tiene permiso institucional para esta acción?
- **Asignación vigente:** ¿El educador pertenece a esta sala en este instante temporal?
- **Riesgo para la niñez:** ¿La acción compromete el cuidado o el desarrollo del menor?
- **Impacto institucional:** ¿La acción altera indicadores financieros, normativos o legales?
- **Reversibilidad de la acción:** ¿Se puede deshacer? (Ej. Sugerir un texto vs Emitir una alerta epidemiológica).
- **Necesidad de aprobación:** Requerimiento formal de Visto Bueno (Directora/Pedagoga).
- **Suficiencia de evidencia:** ¿Existen observaciones suficientes para detonar una planeación?

## Matriz Conceptual de Decisiones (Ejemplo Ilustrativo)

| Riesgo | Autoridad de Fuente | Confianza | Sensibilidad | Decisión del Motor |
| :--- | :--- | :--- | :--- | :--- |
| Bajo | Alta (Norma Oficial) | Alta (>90%) | Baja | Generar recomendación. |
| Alto | Alta (Norma Oficial) | Alta (>90%) | Crítica | Preparar borrador y Requerir Aprobación. |
| Bajo | Baja (Documento Histórico)| Alta (>90%) | Baja | Formular pregunta aclaratoria / Advertir vigencia. |
| Cualquiera| - | Baja (<70%) | Cualquiera | Abstenerse y Escalar a humano. |
| Cualquiera| Hay Conflicto | Alta | Cualquiera | Bloquear, Explicar conflicto y Escalar. |
