# Brand Asset Audit
**Fecha:** 2026-07-27
**Alcance:** Auditoría técnica de los archivos maestros aprovisionados en `tutoria-docs/design-system/brand/logos/`.

## 1. Resumen Ejecutivo
Se realizó un análisis profundo mediante extracción de metadatos (SIPS, File, Shasum) a 10 archivos. Se detectaron 2 anomalías graves de formato/falsa transparencia, 1 archivo duplicado exactamente por checksum, y 3 archivos técnicamente aptos (ligeros y con canal alpha) para integrarse como dependencias del frontend de forma inmediata.

## 2. Archivos Encontrados
- `TutorIA_Isotype_Robot_Color.png`
- `TutorIA_Isotype_Robot_Transparent.png`
- `TutorIA_Logotype_Color.png`
- `TutorIA_Logotype_Transparent.png`
- `TutorIA_Seal_Education_Color.png`
- `TutorIA_Seal_Education_Transparent.png`
- `TutorIA_Master_Color.jpeg`
- `TutorIA_Master_Transparent.png`
- `TutorIA_Imagotype_Color.png`
- `TutorIA_Imagotype_Transparent.png`

## 3. Archivos Faltantes
Ninguno de los requeridos orgánicamente. Se aprovisionaron los 10 previstos.

## 4. Nombres Incorrectos
No hay nombres con errores tipográficos, los archivos coinciden con el manifiesto. Sin embargo, hay incongruencia semántica en nombres (Ej. "*_Transparent.png" careciendo de canal alpha).

## 5. Transparencia Real
**Archivos con transparencia verdadera (hasAlpha = yes):**
- `TutorIA_Logotype_Transparent.png`
- `TutorIA_Master_Transparent.png`
- `TutorIA_Imagotype_Transparent.png`
- `TutorIA_Isotype_Robot_Color.png`
- `TutorIA_Isotype_Robot_Transparent.png`

**FALSOS TRANSPARENTES (hasAlpha = no):**
- ❌ `TutorIA_Seal_Education_Transparent.png`: Su nombre indica "Transparent", pero NO posee canal Alpha. Probablemente tiene fondo blanco quemado o trama cuadriculada rasterizada.

## 6. Calidad y Resolución
- **Excesivamente pesados para App:** `TutorIA_Isotype_Robot_*` pesan 2.25 MB c/u y miden 1536x1024. Muy ineficiente para uso nativo en web sin optimización.
- **Formato Sólido:** `TutorIA_Imagotype_Color.png` (1.45MB, 1441x1091) y `TutorIA_Seal_Education_Color.png` (1.37MB, 1413x1113).

## 7. Posibles Duplicados
- ⚠️ `TutorIA_Isotype_Robot_Color.png` y `TutorIA_Isotype_Robot_Transparent.png` son **EXACTAMENTE EL MISMO ARCHIVO**. Su SHA-256 es idéntico (`c432c174...d6d4`), ambos pesan 2,247,144 bytes y ambos tienen canal alpha. 

## 8. Diferencias entre Variantes
Las variantes `Color` (en su mayoría) carecen de transparencia (excepto Isotype que es clon). Las variantes `Transparent` sí la tienen (excepto Seal que es falso transparente). Las dimensiones de los `Transparent` (ej. Master: 574x435) son drásticamente distintas a las versiones `Color` (ej. Master: 1182x896), indicando exportaciones desde artboards distintos.

## 9. Riesgos Detectados
- Incrustar el Isotype de 2.25MB ralentizará drásticamente el FCP y LCP de la aplicación.
- Incrustar el Seal_Transparent con fondo falso arruinará componentes con modo oscuro o fondos tintados.

## 10. Recomendación de Uso y Clasificación

1. `TutorIA_Master_Color.jpeg` -> **MASTER_ONLY** (Pesado, no alpha, base de imprenta).
2. `TutorIA_Master_Transparent.png` -> **APP_ELIGIBLE** (271KB, tiene alpha).
3. `TutorIA_Imagotype_Color.png` -> **DOCUMENT_ELIGIBLE** (Fondo sólido, alta resolución).
4. `TutorIA_Imagotype_Transparent.png` -> **APP_ELIGIBLE** (265KB, tiene alpha).
5. `TutorIA_Logotype_Color.png` -> **DOCUMENT_ELIGIBLE** (Fondo sólido, bueno para PDF).
6. `TutorIA_Logotype_Transparent.png` -> **APP_ELIGIBLE** (107KB, ideal para web navbar).
7. `TutorIA_Isotype_Robot_Color.png` -> **REQUIRES_REVIEW** (Es un clon).
8. `TutorIA_Isotype_Robot_Transparent.png` -> **MASTER_ONLY** (Demasiado pesado 2.25MB para usar en App sin optimizar).
9. `TutorIA_Seal_Education_Color.png` -> **PRINT_ELIGIBLE** (Fondo sólido, 1.37MB).
10. `TutorIA_Seal_Education_Transparent.png` -> **REQUIRES_REVIEW** (Falsa transparencia).

## 11. Activos Aprobados (APP_ELIGIBLE)
Solo se copiarán a `tutoria-app/src/assets/brand/...`:
- `TutorIA_Master_Transparent.png`
- `TutorIA_Imagotype_Transparent.png`
- `TutorIA_Logotype_Transparent.png`

## 12. Activos Exclusivamente Maestros
Los otros 7 archivos permanecerán en `tutoria-docs/...` hasta su resolución, optimización o porque su fin es exclusivo para imprenta/documentos.
