# Component Accessibility Contract

Todos los componentes creados para TutorIA se considerarán nulos o rechazados si no cumplen estrictamente este contrato de accesibilidad.

## Contrato Obligatorio (WCAG 2.1 AA)

1. **Navegación por teclado:** Todo elemento interactivo debe ser alcanzable y operable exclusivamente con el teclado.
2. **Focus visible:** Debe haber un anillo de foco (`focus-visible:ring`) evidente en todos los elementos tabulables. Prohibido el `outline: none` sin un estilo alternativo sólido.
3. **Labels accesibles:** Los inputs deben estar atados programáticamente a un label visual o un `aria-label`.
4. **Roles ARIA correctos:** Usar HTML semántico de preferencia. Si no, emplear ARIA roles precisos (`button`, `dialog`, `alert`).
5. **Hit targets adecuados:** Todo botón iconográfico (IconButton) debe tener un hit target mínimo de 44x44px.
6. **Mensajes de error vinculados:** Si un form falla, el texto de error debe estar enlazado al input vía `aria-describedby` u `aria-errormessage`.
7. **No depender solo del color:** Los estados (error, success) no deben ser comunicados *únicamente* por el color, se requiere un ícono o cambio de texto.
8. **Reduced motion:** Todas las transiciones de CSS deben anularse o transformarse en fades si el sistema indica `@media (prefers-reduced-motion: reduce)`.
9. **Zoom al 200%:** Los componentes y contenedores flexibles no deben romper su disposición fundamental si la pantalla o el texto se escala al 200%.
10. **Contraste AA:** Respetar los requerimientos de ratio para tipografía.
11. **Lector de pantalla:** Ocultar elementos puramente visuales (`aria-hidden="true"`) y proveer texto alternativo a gráficos.
12. **Orden lógico de tabulación:** El orden del DOM debe coincidir con el flujo visual para la tecla TAB. Evitar `tabindex` mayores a 0.
