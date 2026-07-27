# Component Implementation Roadmap

Planificación de oleadas para la inminente programación del código de los componentes en React + Tailwind.

## WAVE 0 — TOKENS
Instanciación de la capa de variables puras.
- Colors, Typography, Spacing, Radius, Shadows, Motion, Breakpoints, Focus.
- *Justificación:* Ningún componente puede crearse sin el archivo de configuración de Tailwind completo y validado.

## WAVE 1 — FOUNDATIONAL PRIMITIVES
Bloques base.
- Text, Heading, Button, IconButton, Link, Badge, Divider, Spinner.
- *Justificación:* Componentes atómicos de altísima reutilización que no dependen de ningún otro componente.

## WAVE 2 — FORMS
Sistema de entrada de datos.
- FormField, Input, Textarea, Select, Checkbox, Radio, Switch, FieldMessage.
- *Justificación:* Críticos para crear flujos básicos y todos dependen de la estructura semántica de `FormField`.

## WAVE 3 — LAYOUT AND FEEDBACK
Estructuras, grillas y feedback al usuario.
- Container, Stack, Inline, Grid, Card, Alert, Skeleton, EmptyState, Dialog, Tooltip.
- *Justificación:* Los formularios del WAVE 2 deben introducirse en Cards y Modales, requiriendo un sistema de grillas unificado.

## WAVE 4 — NAVIGATION AND DATA
Esqueletos de páginas e información densa.
- Topbar, Sidebar, Tabs, Breadcrumb, Pagination, Table, DataTable, KPI, Timeline.
- *Justificación:* Permite construir los layouts "Page-level" antes de llenarlos con componentes de dominio.

## WAVE 5 — AI EXPERIENCE
Interactividad inteligente.
- AssistantAvatar, AssistantMessage, SuggestionCard, AIComposer, AIStatus, ExplainabilityPanel.
- *Justificación:* Requieren todos los Waves previos (Avatar, Forms, Animation, Cards) combinados bajo lógicas de estados asíncronos complejos.

## WAVE 6 — PEDAGOGICAL
Los bloques del negocio real.
- PlanningCard, ObservationCard, ApprovalStatus, NormativeReference, LearningResourceCard.
- *Justificación:* Últimos en implementarse. Ensamblan la experiencia del usuario y no pueden existir si falla cualquier componente subyacente de UI.
