# AI Experience Contract

Este documento rige el comportamiento, representación y límites éticos de todos los componentes de Inteligencia Artificial dentro de TutorIA.

## 1. Componentes Cubiertos
- `AssistantAvatar`
- `AssistantMessage`
- `SuggestionCard`
- `AIComposer`
- `AIStatus`
- `ExplainabilityPanel`

## 2. Estados de IA Obligatorios
La interfaz debe saber reaccionar y representar los siguientes estados asíncronos del motor LLM:
- `idle`: Esperando instrucción.
- `preparing`: Procesando el contexto antes de generar.
- `generating`: Straming o pensando la respuesta activa.
- `complete`: Respuesta exitosa finalizada.
- `partial`: Respuesta interrumpida pero utilizable.
- `failed`: Error en la generación.
- `unavailable`: Servicio de IA caído o sin conexión.
- `cancelled`: Detenido por el usuario.
- `needsReview`: La IA advierte baja confianza en su propia salida.

## 3. Reglas Críticas (Ethics & UX)

1. **Identificabilidad:** Siempre identificar visualmente el contenido generado por IA (mediante el ícono de IA, color Teal secundario o marca de agua).
2. **Naturaleza de Sugerencia:** Nunca presentar sugerencias de IA como hechos irrefutables o ya aprobados. Son borradores, ideas o recomendaciones.
3. **Edición Humana (Human-in-the-loop):** Todo contenido generado que vaya a impactar la base de datos oficial debe permitir edición humana previa.
4. **Regeneración:** Ofrecer siempre un botón para regenerar o descartar.
5. **Transparencia de Fallos:** Mostrar errores comprensibles humanos ("No pude analizar este archivo", en lugar de "HTTP 500").
6. **Estado de Disponibilidad:** Diferenciar visualmente un `loading` o `generating` de un `unavailable`.
7. **Accesibilidad (Screen Readers):** Usar `aria-live` con moderación para los updates de IA. No saturar el lector de pantalla por cada token que llegue, notificar solo el inicio y fin.
8. **Personalidad del Robot:** No simular conciencia humana o autoridad disciplinaria.
9. **Cero Vigilancia:** No utilizar al robot como elemento de vigilancia, reporte punitivo o evaluación sobre el docente.
10. **Explicabilidad:** Siempre que sea posible, utilizar el `ExplainabilityPanel` para explicar las fuentes de donde la IA tomó la decisión o sugerencia.
