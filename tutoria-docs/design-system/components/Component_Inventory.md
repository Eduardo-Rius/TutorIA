# Component Inventory

Este documento cataloga todos los componentes definidos en el Component System Charter de TutorIA.

*(Status: PROPOSED / NOT_STARTED)*

| componentId | name | category | purpose | states | dependencies | implementationStatus | releaseStatus | wave |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FOUNDATIONS** | | | | | | |

| C-FND-001 | Colors | Foundations | Paleta y tokens. | N/A | Ninguna | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-002 | Typography | Foundations | Escalas y familias tipográficas. | N/A | Ninguna | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-003 | Spacing | Foundations | Espaciado Base-4. | N/A | Ninguna | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-004 | Radius | Foundations | Esquinas redondeadas. | N/A | Ninguna | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-005 | Shadow | Foundations | Elevación. | N/A | Ninguna | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-006 | Motion | Foundations | Transiciones. | N/A | Ninguna | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-007 | Breakpoints | Foundations | Diseño adaptativo. | N/A | Ninguna | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-008 | Focus | Foundations | Anillos de foco WCAG. | N/A | Colors | NOT_STARTED | PROPOSED | Wave 0 |
| C-FND-009 | Iconography | Foundations | Outline 2px funcionales. | N/A | Colors | NOT_STARTED | PROPOSED | Wave 0 |
| **PRIMITIVES** | | | | | | |

| C-PRI-001 | Button | Primitives | Acciones primarias y secundarias. | default, hover, focus, disabled, loading | Colors, Typography, Radius, Shadow | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-002 | IconButton | Primitives | Botón icono-only. | default, hover, focus, disabled, loading | Button, Iconography | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-003 | Link | Primitives | Navegación inline. | default, hover, focus, disabled | Colors, Typography | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-004 | Text | Primitives | Texto regular. | N/A | Typography, Colors | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-005 | Heading | Primitives | Encabezados jerárquicos. | N/A | Typography, Colors | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-006 | Badge | Primitives | Etiquetas de metadatos. | default | Colors, Typography, Radius | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-007 | Avatar | Primitives | Representación visual usuario/IA. | default | Radius, Image, Initials | NOT_STARTED | PROPOSED | Wave TBD |
| C-PRI-008 | Divider | Primitives | Separador visual. | N/A | Colors | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-009 | Spinner | Primitives | Feedback asíncrono. | N/A | Colors, Motion | NOT_STARTED | PROPOSED | Wave 1 |
| C-PRI-010 | Tooltip | Primitives | Información on-hover. | default, hover, focus | Text, Colors, Radius, Shadow | NOT_STARTED | PROPOSED | Wave 3 |
| **FORMS** | | | | | | |

| C-FOR-001 | FormField | Forms | Wrapper de control. | error, disabled, success | Label, FieldMessage | NOT_STARTED | PROPOSED | Wave 2 |
| C-FOR-002 | Input | Forms | Captura de texto. | focus, error, disabled, read-only | FormField, Colors, Radius | NOT_STARTED | PROPOSED | Wave 2 |
| C-FOR-003 | Textarea | Forms | Captura texto multilínea. | focus, error, disabled, read-only | FormField, Colors, Radius | NOT_STARTED | PROPOSED | Wave 2 |
| C-FOR-004 | Select | Forms | Lista de selección. | focus, error, disabled | FormField, DropdownMenu | NOT_STARTED | PROPOSED | Wave 2 |
| C-FOR-005 | Checkbox | Forms | Múltiple elección booleana. | focus, checked, disabled, error | FormField, Colors | NOT_STARTED | PROPOSED | Wave 2 |
| C-FOR-006 | Radio | Forms | Única elección excluyente. | focus, selected, disabled, error | FormField, Colors | NOT_STARTED | PROPOSED | Wave 2 |
| C-FOR-007 | Switch | Forms | Toggle inmediato. | focus, checked, disabled | Colors, Motion | NOT_STARTED | PROPOSED | Wave 2 |
| C-FOR-008 | DatePicker | Forms | Selección de fechas. | focus, error, disabled | Input, Calendar, Popover | NOT_STARTED | PROPOSED | Wave TBD |
| C-FOR-009 | FieldMessage | Forms | Feedback de campo. | error, warning, default | Text, Colors | NOT_STARTED | PROPOSED | Wave 2 |
| **LAYOUT** | | | | | | |

| C-LAY-001 | Container | Layout | Restricción ancho máximo. | N/A | Breakpoints | NOT_STARTED | PROPOSED | Wave 3 |
| C-LAY-002 | Stack | Layout | Apilamiento 1D (Vertical/Horizontal). | N/A | Spacing | NOT_STARTED | PROPOSED | Wave 3 |
| C-LAY-003 | Inline | Layout | Flujo horizontal de línea. | N/A | Spacing | NOT_STARTED | PROPOSED | Wave 3 |
| C-LAY-004 | Grid | Layout | Grilla 2D responsive. | N/A | Spacing, Breakpoints | NOT_STARTED | PROPOSED | Wave 3 |
| C-LAY-005 | Card | Layout | Contenedor principal. | default, hover | Radius, Shadow, SurfaceColors | NOT_STARTED | PROPOSED | Wave 3 |
| C-LAY-006 | Section | Layout | Separador semántico. | N/A | Spacing | NOT_STARTED | PROPOSED | Wave TBD |
| C-LAY-007 | PageHeader | Layout | Título y acciones globales. | N/A | Heading, Button, Stack | NOT_STARTED | PROPOSED | Wave TBD |
| **NAVIGATION** | | | | | | |

| C-NAV-001 | Topbar | Navigation | Navegación superior global. | N/A | Colors, Shadow, Avatar | NOT_STARTED | PROPOSED | Wave 4 |
| C-NAV-002 | Sidebar | Navigation | Navegación vertical izquierda. | expanded, collapsed | Colors, Iconography | NOT_STARTED | PROPOSED | Wave 4 |
| C-NAV-003 | Breadcrumb | Navigation | Jerarquía de navegación actual. | N/A | Link, Text, Iconography | NOT_STARTED | PROPOSED | Wave 4 |
| C-NAV-004 | Tabs | Navigation | Vistas múltiples mismo contexto. | selected, focus | Text, Colors | NOT_STARTED | PROPOSED | Wave 4 |
| C-NAV-005 | Pagination | Navigation | Navegación entre conjuntos. | disabled | Button, Text | NOT_STARTED | PROPOSED | Wave 4 |
| C-NAV-006 | Stepper | Navigation | Flujo secuencial múltiple paso. | pending, current, completed | Colors, Text, Iconography | NOT_STARTED | PROPOSED | Wave TBD |
| **FEEDBACK** | | | | | | |

| C-FBC-001 | Alert | Feedback | Banner de mensaje estático. | success, warning, error, info | Colors, Text, Iconography | NOT_STARTED | PROPOSED | Wave 3 |
| C-FBC-002 | Toast | Feedback | Mensaje efímero push. | N/A | Alert, Motion, Z-index | NOT_STARTED | PROPOSED | Wave TBD |
| C-FBC-003 | Progress | Feedback | Barra de estado progreso. | loading, complete | Colors, Radius | NOT_STARTED | PROPOSED | Wave TBD |
| C-FBC-004 | Skeleton | Feedback | Estado de carga preliminar. | loading | Colors, Radius, Motion | NOT_STARTED | PROPOSED | Wave 3 |
| C-FBC-005 | EmptyState | Feedback | Contenedor sin datos. | N/A | Illustration, Text, Button | NOT_STARTED | PROPOSED | Wave 3 |
| C-FBC-006 | ErrorState | Feedback | Contenedor post-falla lógica. | N/A | EmptyState variant | NOT_STARTED | PROPOSED | Wave TBD |
| **OVERLAYS** | | | | | | |

| C-OVL-001 | Dialog | Overlays | Modal centro pantalla. | N/A | Card, Z-index, Focus-trap | NOT_STARTED | PROPOSED | Wave 3 |
| C-OVL-002 | Drawer | Overlays | Panel lateral deslizable. | N/A | Card, Z-index, Motion | NOT_STARTED | PROPOSED | Wave TBD |
| C-OVL-003 | Popover | Overlays | Floating panel anclado. | N/A | Card, Z-index, Shadow | NOT_STARTED | PROPOSED | Wave TBD |
| C-OVL-004 | Dropdown | Overlays | Menú flotante. | open, closed | Popover, Link, Button | NOT_STARTED | PROPOSED | Wave TBD |
| **DATA DISPLAY** | | | | | | |

| C-DAT-001 | Table | DataDisplay | Grid HTML básico. | hover | Text, Colors | NOT_STARTED | PROPOSED | Wave 4 |
| C-DAT-002 | DataTable | DataDisplay | Tabla con paginación/filtros. | loading, empty | Table, Pagination, Input | NOT_STARTED | PROPOSED | Wave 4 |
| C-DAT-003 | KPI | DataDisplay | Indicador número grande. | N/A | Heading, Text, Badge | NOT_STARTED | PROPOSED | Wave 4 |
| C-DAT-004 | StatCard | DataDisplay | Tarjeta de estadística con delta. | N/A | Card, KPI, Iconography | NOT_STARTED | PROPOSED | Wave TBD |
| C-DAT-005 | Timeline | DataDisplay | Secuencia temporal de eventos. | N/A | Stack, Text, Iconography | NOT_STARTED | PROPOSED | Wave 4 |
| C-DAT-006 | StatusIndicatoricator | DataDisplay | Dot o badge visual. | success, warning, error | Colors, Radius | NOT_STARTED | PROPOSED | Wave TBD |
| **AI EXPERIENCE** | | | | | | |

| C-AI-001 | AssistantAvatar | AI Experience | Representación del Robot. | idle, generating | Avatar, Motion | NOT_STARTED | PROPOSED | Wave 5 |
| C-AI-002 | AssistantMessage | AI Experience | Burbuja de respuesta AI. | N/A | Text, Colors, Markdown | NOT_STARTED | PROPOSED | Wave 5 |
| C-AI-003 | SuggestionCard | AI Experience | Recomendación pedagógica IA. | default, hover | Card, Button, Badge | NOT_STARTED | PROPOSED | Wave 5 |
| C-AI-004 | AIComposer | AI Experience | Wrapper para Input asistido. | generating, empty | Textarea, AssistantAvatar, Button | NOT_STARTED | PROPOSED | Wave 5 |
| C-AI-005 | AIStatus | AI Experience | Explicación del estado IA. | generating, failed, idle | Text, Spinner | NOT_STARTED | PROPOSED | Wave 5 |
| C-AI-006 | ExplainabilityPanel | AI Experience | Panel de "Por qué se sugiere esto". | N/A | Drawer o Popover, Text | NOT_STARTED | PROPOSED | Wave 5 |
| **PEDAGOGICAL** | | | | | | |

| C-PED-001 | PlanningCard | Pedagogical | Vista resumida de Planeación. | default, hover | Card, Badge, Avatar, StatusIndicator | NOT_STARTED | PROPOSED | Wave 6 |
| C-PED-002 | ObservationCard | Pedagogical | Vista resumida de Observación. | default, hover | Card, Text, Avatar | NOT_STARTED | PROPOSED | Wave 6 |
| C-PED-003 | ApprovalStatus | Pedagogical | Historial o estado de firma. | approved, pending, rejected | StatusIndicator, Text | NOT_STARTED | PROPOSED | Wave 6 |
| C-PED-004 | NormativeReference | Pedagogical | Cita oficial SEP/IMSS. | default | Card, Text, Iconography | NOT_STARTED | PROPOSED | Wave 6 |
| C-PED-005 | LearningResourceCard | Pedagogical | Card de recurso educativo. | default, hover | Card, Image, Text | NOT_STARTED | PROPOSED | Wave 6 |
