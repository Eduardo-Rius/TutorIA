# Component Inventory — Seed Baseline

*(Status Provisional)*

- El Charter contiene el catálogo completo conceptual.
- El Inventory actual es un SEED INVENTORY.
- La expansión completa pertenece al Sprint B.4.
- Ningún componente omitido se considera descartado.

| componentId | name | category | purpose | variants | sizes | states | accessibilityRequirements | responsiveBehavior | dependencies | tokenDependencies | domainIndependence | implementationStatus | priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C-PRI-001 | Button | Primitives | Disparar acciones primarias y secundarias. | Solid, Outline, Ghost | sm, md, lg | default, hover, focus, disabled, loading | ARIA-role, focus-visible | 100% width on mobile | Ninguna | Colors, Typography, Radius, Shadow | Sí | NOT_STARTED | High |
| C-FOR-001 | Input | Forms | Captura de texto del usuario. | Default, Invalid | sm, md, lg | default, focus, error, disabled | aria-invalid, aria-describedby | 100% width | FieldMessage | Colors, Typography, Radius, Borders | Sí | NOT_STARTED | High |
| C-LAY-001 | Card | Layout | Contenedor principal de bloques funcionales. | Elevated, Outlined | N/A | default, hover (if clickable) | Semantic region if needed | Stack on mobile | Ninguna | Radius, Shadow, SurfaceColors | Sí | NOT_STARTED | High |
| C-AI-001 | AIComposer | AI Experience | Bloque interactivo de autocompletado y sugerencia. | Generative, Suggestion | N/A | loading, default, empty | aria-live for generative state | Stack | Textarea, AssistantAvatar | Colors, Interaction | Parcial | NOT_STARTED | Medium |
| C-PED-001 | PlanningCard | Pedagogical | Mostrar el estado y contenido base de una planeación. | Draft, Pending, Approved | N/A | default, hover, focus | aria-label, focus order | Card fluid width | Card, Badge, Avatar, StatusIndicator | Todos los tokens | No (Domain bound) | NOT_STARTED | Low |

*(Nota: Este inventario es un fragmento base. El resto de los 55+ componentes de la Carta se detallarán individualmente antes de la implementación real. Todos inician en NOT_STARTED).*
