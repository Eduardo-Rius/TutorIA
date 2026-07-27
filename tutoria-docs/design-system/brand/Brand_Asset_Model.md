# Brand Asset Model

Este documento define el modelo conceptual de metadatos para cualquier activo de diseño dentro de la arquitectura de marca de TutorIA. (Aplica exclusivamente al Design System documental, no al Core Domain).

## Entidad: `BrandAsset`

Atributos conceptuales requeridos para registrar cualquier gráfico oficial:

- `assetId`: Identificador único y semántico (ej. `LOGO_MASTER_TRN`).
- `officialName`: Nombre del archivo maestro (ej. `TutorIA_Master_Transparent.png`).
- `category`: Clasificación estructural (ej. `Master`, `Imagotype`, `Icon`).
- `variant`: Variante visual (ej. `Color Sólido`, `Color con transparencia`).
- `format`: Formato del archivo físico (ej. `png`, `svg`, `jpeg`).
- `dimensions`: Resolución nativa (Width x Height).
- `checksum`: Firma criptográfica (SHA-256) para garantizar inmutabilidad.
- `backgroundSupport`: Condiciones del fondo (`Opaco`, `Transparente`).
- `usage`: Descripción funcional recomendada.
- `eligibility`: Clasificación técnica de destino (`APP_ELIGIBLE`, `DOCUMENT_ELIGIBLE`, `MASTER_ONLY`, `REQUIRES_REVIEW`, `PRINT_ELIGIBLE`).
- `status`: Estado del activo en el flujo de aprobación (ej. `CANDIDATE`, `RELEASED`).
- `brandVersion`: Versión de la marca en la que se integró el activo.
- `accessibilityNotes`: Notas sobre contraste, requerimientos para Dark Mode, etc.
