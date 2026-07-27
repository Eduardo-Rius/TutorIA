# Brand Issues Tracker

### BRAND-001
- **Severity:** HIGH
- **Affected Assets:** `TutorIA_Isotype_Robot_Color.png`, `TutorIA_Isotype_Robot_Transparent.png`
- **Description:** Ambos archivos comparten exactamente el mismo hash criptográfico. El activo Color es simplemente un clon del Transparente.
- **Impact:** Duplicidad innecesaria en el repositorio maestro y confusión en el consumo.
- **Recommended Action:** El Product Owner debe exportar una versión Color real (con fondo sólido y sin canal alpha) para sustituir al clon.
- **Status:** OPEN_ISSUE
- **Blocking For App:** Sí (la versión Color no está en la App).
- **Blocking For Brand Release:** Sí.

### BRAND-002
- **Severity:** CRITICAL
- **Affected Assets:** `TutorIA_Seal_Education_Transparent.png`
- **Description:** El archivo declara ser transparente en su nombre, pero carece de canal alpha. Posee una falsa transparencia (trama rasterizada o fondo sólido).
- **Impact:** Rotura visual severa si se inyecta en componentes con fondos tintados o Dark Mode.
- **Recommended Action:** Re-exportar el master conservando el canal alpha nativo.
- **Status:** OPEN_ISSUE
- **Blocking For App:** Sí (no se ha importado a la aplicación).
- **Blocking For Brand Release:** Sí.

### BRAND-003
- **Severity:** MEDIUM
- **Affected Assets:** `TutorIA_Isotype_Robot_Transparent.png`
- **Description:** El archivo original pesa 2.25 MB y tiene dimensiones excesivas (1536x1024) para el caso de uso común (avatares, iconos pequeños).
- **Impact:** Impacto drástico en performance (LCP, Network Load) si se inyecta en el frontend tal como está.
- **Recommended Action:** Crear una versión optimizada derivada (WebP, SVG, o PNG re-escalado) dentro de la carpeta `assets` de la App, conservando este original como master inmutable.
- **Status:** OPEN_ISSUE
- **Blocking For App:** Sí.
- **Blocking For Brand Release:** No (el Master está bien, pero requiere derivada).

### BRAND-004
- **Severity:** LOW
- **Affected Assets:** Múltiples (todas las variantes)
- **Description:** Las dimensiones de las variantes Sólidas y Transparentes difieren masivamente (Ej. Master Color es 1182x896, Master Transparent es 574x435).
- **Impact:** Dificultad para intercambiar las variantes programáticamente sin causar layout shifts en CSS.
- **Recommended Action:** Estandarizar los artboards de exportación para que variantes homólogas compartan la misma resolución base.
- **Status:** OPEN_ISSUE
- **Blocking For App:** No (se pueden usar los transparentes de forma aislada).
- **Blocking For Brand Release:** Sí.
