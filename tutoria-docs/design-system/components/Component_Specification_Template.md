# Component Specification Template

Plantilla oficial para la especificación técnica y de diseño de componentes. Todo componente en TutorIA debe documentarse con este formato antes de ser programado.

## 1. Identidad
- **Component ID:** [Ej. C-PRI-001]
- **Component Name:** [Ej. Button]
- **Category:** [Ej. Primitives]

## 2. Propósito
Define la razón de ser del componente de forma clara y directa.

## 3. Cuándo utilizar
Casos de uso apropiados y recomendados.

## 4. Cuándo no utilizar
Antipatrones o componentes alternativos sugeridos.

## 5. Anatomía
Bloques constructivos, tags de HTML o slots.
- [Ej. Contenedor, Icono Izquierdo, Label, Icono Derecho].

## 6. Variantes
Tipos visuales lógicos (no basados en estado temporal).
- [Ej. Primary, Secondary, Outline].

## 7. Tamaños
Dimensiones fijas disponibles (ej. `sm`, `md`, `lg`).

## 8. Estados
Requeridos vs Opcionales (ej. `default`, `hover`, `focus-visible`, `disabled`, `loading`).

## 9. Interacción
Cómo reacciona el componente ante acciones del puntero, mouse o pantalla táctil.

## 10. Teclado
Interacciones de teclado requeridas para accesibilidad (ej. Space/Enter para accionar, ArrowKeys para navegación).

## 11. Accesibilidad
Reglas WCAG aplicables, ARIA roles y labels obligatorios.

## 12. Responsive
Comportamiento de apilamiento, anchos fluidos o truncamiento ante cambios de viewport.

## 13. Content guidelines
Reglas de diseño de contenido (ej. "Los botones siempre deben comenzar con verbo de acción").

## 14. Token dependencies
Qué tokens fundamentales rigen su aspecto visual (`Colors`, `Spacing`, etc.).

## 15. Composition rules
Con qué otros componentes se le permite componerse, o a cuáles no puede contener.

## 16. Domain boundaries
¿Es un componente genérico, o asume conocimiento de un contexto de negocio? (En genéricos debe ser 100% aislado).

## 17. Testing contract
Requerimientos de test unitarios e interacción que el desarrollador debe cumplir.

## 18. Acceptance criteria
Criterios de éxito específicos, como "Hit target mínimo de 44x44px verificado".

## 19. Open issues
Dudas o problemas técnicos no resueltos aún de cara al desarrollo.

## 20. Decision history
Histórico en tabla con enlaces a los CDS (Component Decision Log) relacionados.
