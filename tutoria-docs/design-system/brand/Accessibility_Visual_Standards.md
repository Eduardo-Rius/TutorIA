# Accessibility Visual Standards (CANDIDATE)

Este documento fija los estándares provisionales de contraste y accesibilidad visual de TutorIA según normas WCAG 2.1.

## Evaluaciones de Combinaciones Candidatas
- **Navy (`#003c58`) sobre Blanco (`#ffffff`):** ✅ Aprobado (Excelente ratio de contraste > 7:1). Ideal para textos.
- **Blanco sobre Teal (`#0ca994`):** Requiere ajuste. El Teal claro no puede utilizarse como fondo con texto blanco pequeño si no cumple WCAG AA. Utilizar Teal más oscuro o texto Navy.
- **Teal sobre Blanco:** ⚠️ Requiere ajuste para texto normal. Válido para botones grandes o íconos.
- **Blanco sobre Naranja (`#ff9e02`):** Combinación prohibida para texto pequeño. Usar texto Navy o negro. Orange puede utilizarse como acento, fondo decorativo, borde, ícono o badge con contenido oscuro.
- **Azul sobre fondos crema/Tinted:** ✅ Aprobado, excelente confort visual para lectura prolongada.
- **Texto sobre gradientes:** ⚠️ Prohibido para información crítica. Solo permitido en banners grandes con text shadow fuerte.

## Objetivos Mínimos
- **Texto Normal:** Contraste mínimo AA (4.5:1).
- **Texto Grande (>= 18pt):** Contraste mínimo AA (3.0:1).
- **Controles y Estados:** Todo botón e input debe tener un borde o fondo contrastante.
- **Foco Visible:** Obligatorio (`ring-teal-500` con outline offset).
- **Daltonismo:** El color nunca debe ser el único canal de información. Un error no solo es "rojo", incluye un ícono ❌ y un texto explicativo.

## Pantallas de baja calidad
El diseño debe sobrevivir en monitores institucionales antiguos (paneles TN con bajo brillo/contraste). Los bordes (`borderDefault`) deben ser suficientemente oscuros para distinguirse en monitores lavados.
