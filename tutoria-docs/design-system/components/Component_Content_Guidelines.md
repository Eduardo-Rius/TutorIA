# Component Content Guidelines

Este documento establece las reglas fundamentales de diseño de contenido (Content Design) para todos los componentes de la interfaz de TutorIA.

## 1. Principios Generales
- **Español Claro:** Utilizar un lenguaje directo, sin ambigüedades.
- **Acción Explícita:** El usuario siempre debe saber qué va a suceder al presionar un botón.
- **Evitar Tecnicismos:** Hablar el lenguaje de la educadora, no el del ingeniero (ej. no decir "Error de API" o "Null Pointer").
- **Tono Institucional sin Burocracia:** Mantener la formalidad que requiere una plataforma relacionada con la SEP/IMSS, pero sin utilizar lenguaje arcaico o punitivo.
- **Evitar Culpa:** Si ocurre un error, la culpa nunca es del usuario ("Has introducido un dato mal" ❌ -> "El CURP requiere 18 caracteres" ✅).
- **IA Acompaña, No Ordena:** La Inteligencia Artificial propone, sugiere y ayuda, nunca da órdenes definitivas ni evalúa el desempeño humano.

## 2. Textos de Botones
- Deben comenzar siempre con un verbo de acción en infinitivo (Guardar, Cancelar, Aprobar, Generar).
- Máximo 3 palabras.
- Si la acción es destructiva, ser explícito (Eliminar, Descartar).

## 3. Labels y Placeholders
- **Labels:** Cortos y precisos. Evitar preguntas largas.
- **Placeholders:** No usar el placeholder como un reemplazo del label (por accesibilidad). Usarlo para dar un ejemplo de formato ("ej. juan@escuela.edu.mx").

## 4. Mensajes de Ayuda y Errores
- **Ayuda:** Explicar el "Por qué" se pide un dato si no es obvio.
- **Errores:** Deben ser recuperables. Indicar exactamente qué falló y cómo solucionarlo.

## 5. Estados Vacíos y de Carga
- **Empty States:** Explicar por qué está vacío y cuál es el "Call to Action" para llenarlo. (Ej. "Aún no tienes planeaciones. Crea la primera").
- **Loading:** Preferir esqueletos (Skeletons) mudos. Si se usa texto, indicar qué se está cargando de forma optimista ("Generando sugerencias...").

## 6. Lenguaje Normativo
Cuando se cite una norma del IMSS o la SEP, citar explícitamente el documento y artículo, manteniendo el texto original inalterable.

## 7. Lenguaje de Aprobación y Rechazo
- **Aprobación:** Positivo y claro ("Planeación aprobada exitosamente").
- **Rechazo:** Debe venir siempre acompañado de una justificación constructiva ("Planeación devuelta: Se requiere ampliar la sección de evaluación").
