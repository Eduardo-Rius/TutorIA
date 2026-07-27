# Visual Language Issues

### VLI-001
- **Severity:** MEDIUM
- **Description:** Definir el nombre oficial del robot. Actualmente se usa "TutorIA".
- **Impact:** El personaje necesita identidad propia para que el asistente IA tenga personalidad definida.
- **Recommended Action:** Consultar con el Product Owner sobre nombres candidatos.
- **Status:** OPEN_ISSUE
- **Blocking For Tokens:** No
- **Blocking For UI:** No
- **Blocking For Brand Release:** Sí

### VLI-002
- **Severity:** HIGH
- **Description:** Crear versión inversa del logotipo para fondos Navy y Teal oscuros.
- **Impact:** Actualmente las variantes Color o Transparente carecen de contraste suficiente sobre el Brand Navy institucional.
- **Recommended Action:** El equipo de diseño debe exportar un Master 100% blanco transparente.
- **Status:** OPEN_ISSUE
- **Blocking For Tokens:** No
- **Blocking For UI:** Sí (Dark mode y Headers)
- **Blocking For Brand Release:** Sí

### VLI-003
- **Severity:** HIGH
- **Description:** Validar matemáticamente toda la escala Teal y sus contrastes.
- **Impact:** Las escalas derivadas necesitan cumplir WCAG estrictamente antes de usarse en componentes.
- **Recommended Action:** Ejecutar APCA/WCAG checker sobre la rampa 50-950 propuesta.
- **Status:** OPEN_ISSUE
- **Blocking For Tokens:** Sí
- **Blocking For UI:** Sí
- **Blocking For Brand Release:** Sí

### VLI-004
- **Severity:** HIGH
- **Description:** Definir el color Danger oficial derivado o complementario.
- **Impact:** No tenemos un token semántico rojo/danger que empate armónicamente con la paleta.
- **Recommended Action:** Proponer un `brandDanger` en sintonía con la paleta actual y probar contraste.
- **Status:** OPEN_ISSUE
- **Blocking For Tokens:** Sí
- **Blocking For UI:** Sí
- **Blocking For Brand Release:** Sí

### VLI-005
- **Severity:** MEDIUM
- **Description:** Completar escalas 50–950 para Navy, Teal, Orange y neutrales.
- **Impact:** Requisito indispensable para construir el Component System.
- **Recommended Action:** Generar escalas utilizando interpolación HSL desde los HEX maestros.
- **Status:** OPEN_ISSUE
- **Blocking For Tokens:** Sí
- **Blocking For UI:** Sí
- **Blocking For Brand Release:** Sí

### VLI-006
- **Severity:** LOW
- **Description:** Definir tipografía para documentos cuando Inter no pueda incrustarse.
- **Impact:** En la generación de PDFs del servidor puede haber problemas instalando fuentes web.
- **Recommended Action:** Seleccionar un system-font stack fallback (ej. Arial/Helvetica).
- **Status:** OPEN_ISSUE
- **Blocking For Tokens:** No
- **Blocking For UI:** No
- **Blocking For Brand Release:** No

### VLI-007
- **Severity:** MEDIUM
- **Description:** Resolver optimización y exportación del Isotipo Robot.
- **Impact:** El isotipo pesa 2.25MB limitando la performance de la aplicación.
- **Recommended Action:** Exportar variante Vector SVG o WebP al 90% para consumo como `APP_ELIGIBLE`.
- **Status:** OPEN_ISSUE
- **Blocking For Tokens:** No
- **Blocking For UI:** Sí
- **Blocking For Brand Release:** No
