# Component System Charter

## PROPÓSITO
Traducir el Visual Language aprobado como candidato a un lenguaje consistente de componentes que pueda implementarse en el frontend mediante Tailwind CSS. Este sistema será el puente entre las reglas teóricas de diseño y los artefactos de UI de React funcionales.

## PRINCIPIOS
- **Accesibilidad por defecto:** Navegación por teclado, screen readers y contraste.
- **Composición antes que duplicación:** Construir bloques complejos a partir de atómicos.
- **Consistencia semántica:** Evitar variaciones mágicas.
- **Estados completos:** Definir no solo el estado default, sino todos los de interacción (hover, focus, disabled).
- **Responsive:** Adaptabilidad fluida desde móvil hasta monitores institucionales.
- **Soporte de teclado:** Toda acción clickeable debe ser triggerable por Enter/Space y focusable.
- **Rendimiento:** Componentes ligeros sin dependencias pesadas innecesarias.
- **Baja dependencia visual:** La lógica de negocio no debe entrelazarse con el renderizado visual; los componentes deben ser agnósticos del contexto de dominio.
- **Tokens antes que valores mágicos:** Nunca hardcodear un HEX en un componente.

## COMPONENTES A MODELAR

### FOUNDATIONS
- color; typography; spacing; radius; shadow; motion; breakpoints; focus; iconography.

### PRIMITIVES
- Button; IconButton; Link; Text; Heading; Badge; Avatar; Divider; Spinner; Tooltip.

### FORMS
- Input; Textarea; Select; Checkbox; Radio; Switch; DatePicker; FormField; FieldMessage.

### LAYOUT
- Container; Stack; Inline; Grid; Card; Section; PageHeader.

### NAVIGATION
- Topbar; Sidebar; Breadcrumb; Tabs; Pagination; Stepper.

### FEEDBACK
- Alert; Toast; Progress; Skeleton; EmptyState; ErrorState.

### OVERLAYS
- Dialog; Drawer; Popover; DropdownMenu.

### DATA DISPLAY
- Table; DataTable; KPI; StatCard; Timeline; StatusIndicatoricator.

### AI EXPERIENCE
- AssistantAvatar; AssistantMessage; SuggestionCard; AIComposer; AIStatus; ExplainabilityPanel.

### PEDAGOGICAL
- PlanningCard; ObservationCard; ApprovalStatus; NormativeReference; LearningResourceCard.
