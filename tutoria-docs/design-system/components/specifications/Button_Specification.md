# Button Specification

## 1. Identidad
- **Component ID:** C-PRI-001
- **Component Name:** Button
- **Category:** Primitives

## 2. Propósito
Gatillar acciones principales o secundarias por parte del usuario, someter formularios o abrir modales.

## 3. Cuándo utilizar
Cuando el usuario deba ejecutar una acción concreta (ej. Guardar, Cancelar, Aprobar, Enviar).

## 4. Cuándo no utilizar
No utilizar para navegación entre páginas estáticas que deba ser indexada (usar `Link`). No usar para acciones que consten de puro ícono (usar `IconButton`).

## 5. Anatomía
- Contenedor principal.
- Left Icon (Opcional).
- Label (Texto de la acción).
- Right Icon (Opcional).
- Indicador de carga (Spinner).

## 6. Variantes
- `primary`: Acción principal de la pantalla (Usa Navy candidato).
- `secondary`: Acción alternativa (Usa Teal accesible u oscurecido).
- `outline`: Acción terciaria, borde transparente.
- `ghost`: Fondo transparente, baja prioridad.
- `danger`: Acciones destructivas.
- `link`: Botón con apariencia visual de texto/hipervínculo.

## 7. Tamaños
- `sm`: 32px altura.
- `md`: 40px altura (default).
- `lg`: 48px altura.

## 8. Estados
- `default`: Reposo.
- `hover`: Cursor encima (solo mouse).
- `focus-visible`: Foco mediante teclado.
- `pressed`: Al hacer clic o presionar espacio/enter.
- `disabled`: Inactivo, no interactuable.
- `loading`: Cargando acción asíncrona. Conserva sus dimensiones exactas para evitar reflows.

## 9. Interacción
El texto de acción siempre debe iniciar con un verbo ("Guardar", "Confirmar").

## 10. Teclado
Se acciona presionando `Space` o `Enter`.

## 11. Accesibilidad
Debe poseer contraste mínimo AA.
**Regla explícita:** No usar Orange como botón con texto blanco.
Hit target mínimo: 44x44px cuando sea aplicable.
Si solo contiene icono, usar `aria-label` (Aunque eso pertenece a `IconButton`).

## 12. Responsive
En mobile puede expandirse al 100% del ancho del padre.

## 13. Content guidelines
- El texto debe ser corto, máximo 3 palabras.
- Iniciar siempre con un verbo imperativo.

## 14. Token dependencies
- `Colors`: brandPrimary, brandSecondary, actionPrimary, actionDisabled.
- `Typography`: Inter medium/semibold.
- `Radius`: medium.
- `Shadow`: sm (para primary).

## 15. Composition rules
Puede componerse con `Spinner` y elementos de `Iconography`. No puede contener otros componentes primitivos complejos.

## 16. Domain boundaries
Totalmente agnóstico del negocio.

## 17. Testing contract
- Verificar que el evento `onClick` no dispare si está `disabled` o `loading`.
- Verificar que dimensiones no cambian al pasar a estado `loading`.

## 18. Acceptance criteria
- Hit target cumple WCAG.
- Regla de Orange respetada.
- Dimensiones fijas en loading.

## 19. Open issues
Ninguno.

## 20. Decision history
- CDS-001
- CDS-002
- CDS-005
