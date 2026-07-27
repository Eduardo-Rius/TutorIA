# Component Decision Log

Bitácora de decisiones estratégicas relativas al Component System.

| ID | Fecha | Decisión | Contexto | Estado |
| :--- | :--- | :--- | :--- | :--- |
| CDS-001 | 2026-07-27 | Usar tokens semánticos, no valores HEX en componentes. | Para permitir theming oscuro o actualizaciones de marca sin refactorizar UI. | PROPOSED |
| CDS-002 | 2026-07-27 | Separar componentes visuales de lógica de dominio. | Componentes atómicos (ej. Button) no deben importar modelos de datos del backend. | PROPOSED |
| CDS-003 | 2026-07-27 | Los componentes pedagógicos deben componerse con primitives. | Un `PlanningCard` no reimplementa CSS, consume `Card`, `Badge` y `Text`. | PROPOSED |
| CDS-004 | 2026-07-27 | Los estados de IA deben ser explícitos y explicables. | La interfaz debe comunicar claramente cuándo la IA está generando contenido y qué sugiere. | PROPOSED |
| CDS-005 | 2026-07-27 | No crear un componente sin contrato de accesibilidad. | WCAG no es un "nice to have", es bloqueante para el release del componente. | PROPOSED |
