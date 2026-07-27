# Design Authority

Este documento define la estructura de gobernanza y las responsabilidades para la evolución del Design System de TutorIA.

## Roles y Responsabilidades

### PRODUCT OWNER
Responsable de:
- Aprobación final de marca.
- Identidad del robot y nomenclatura.
- Personalidad visual y tono emocional.
- Decisiones comerciales de la interfaz.
- Aceptación visual final de la plataforma.

### ARCHITECTURE REVIEW BOARD (ARB)
Responsable de:
- Consistencia del Design System y adherencia a lineamientos.
- Gobernanza del código y de la estructura de repositorios.
- Accesibilidad (WCAG).
- Arquitectura de tokens y sistemas de espaciado/elevación.
- Aplicación de la política estricta de separación Master / Derived assets.
- Impacto técnico de los componentes UI (Performance y LCP).

### ANTIGRAVITY (AI)
Responsable de:
- Implementación de código y documentación automatizada.
- Ejecución de validaciones y testing (Unit, Lint, Typecheck, Build).
- Trazabilidad y actualización de bitácoras de decisiones.
- Cumplimiento de las decisiones aceptadas y de las directrices Zero Legacy.

## Proceso de Decisión Definitiva
**Regla de Oro:** Toda decisión visual definitiva y su transición de estado (de `CANDIDATE` a `RELEASED`) debe requerir invariablemente la firma de:
**Product Owner + ARB**. Ningún desarrollador o agente (incluyendo Antigravity) puede promover un componente o paleta a RELEASED de forma autónoma.
