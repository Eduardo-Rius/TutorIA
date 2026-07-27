# Elevation and Depth (CANDIDATE)

El lenguaje de elevación usa sombras (shadows) y superposiciones (overlays) para guiar la atención y separar el contenido de los contenedores.

## Niveles de Elevación (Z-Index / Shadows)

1. **Base (Nivel 0):**
   - **Uso:** Fondo principal, contenido estático.
   - **Estética:** Sin sombra. Fondo `surfaceSecondary`.

2. **Raised (Nivel 1 - Cards / Paneles):**
   - **Uso:** Contenedores de información, tarjetas de planeaciones.
   - **Estética:** Sombra muy suave y dispersa (`sm`), fondo `surfacePrimary` (blanco).
   - **Alternativa:** Borde sutil (`borderSubtle`) en lugar de sombra para alta densidad de datos.

3. **Floating (Nivel 2 - Dropdowns / Tooltips):**
   - **Uso:** Menús contextuales, popovers.
   - **Estética:** Sombra pronunciada (`md`), bordes definidos. Diferencia clara contra la capa Base.

4. **Modal (Nivel 3 - Diálogos / Sidebars):**
   - **Uso:** Formularios de creación, alertas de eliminación.
   - **Estética:** Sombra extensa (`xl`), apoyado visualmente por un fondo oscurecido (Overlay).

5. **Overlay (Backdrop):**
   - **Uso:** Fondo detrás de modales.
   - **Estética:** Navy translúcido (`#003c58` al 40-50% de opacidad) o Gris/Negro translúcido. No usar blur (backdrop-filter) excesivo por razones de rendimiento en equipos institucionales antiguos.

## Reglas Críticas
- **Evitar Elevación Innecesaria:** Si dos paneles no se solapan, sepáralos con bordes finos o contraste de grises, no con sombras que ensucian el diseño.
- **Dark Mode (Futuro):** Las sombras dejan de ser perceptibles. La elevación se simulará haciendo el color de superficie más claro que el fondo base.
