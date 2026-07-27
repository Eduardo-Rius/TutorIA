# Release Notes: Brand v1.0.0-candidate

## Resumen
Esta release establece la fundación del Design System y la Arquitectura de Marca de TutorIA, documentando los activos oficiales y configurando su consumo controlado en la aplicación web.

## Novedades Principales
- **Creación de Brand Architecture:** Estructura de repositorios y documentación centralizada en `tutoria-docs/design-system/brand/`.
- **Incorporación de Másters:** 10 activos originales han sido provistos por el Product Owner y documentados en el `Brand_Registry.md`.
- **App Eligibles:** 3 de los activos se determinaron aptos técnica y funcionalmente (bajos en peso, canal alpha real) y se importaron a `tutoria-app/src/assets/brand/...`.
- **Tipado Fuerte:** Se generó el archivo de tokens `logos.ts` para proveer intellisense y seguridad de compilación en el acceso futuro a la marca.

## Auditoría Técnica (Issues Detectados)
Se corrió una auditoría exhaustiva donde se detectó que:
- `TutorIA_Isotype_Robot_Color.png` es un clon directo del transparente (checksum idéntico).
- `TutorIA_Seal_Education_Transparent.png` posee una falsa transparencia.
- Los isologotipos base pesan 2.25MB, lo cual es inaceptable para un despliegue optimizado, por lo que permanecen como `MASTER_ONLY` hasta que se optimicen.

## Decisiones del ARB
- **No Mezclar Bases:** Se implementa una estricta política `MASTER vs DERIVED` para asegurar que los originales nunca se alteren por las presiones y optimizaciones del frontend.
- **Estado de la Marca:** Permanece como `CANDIDATE`. No se transicionará a `RELEASED` hasta resolver los open issues y aprobar la paleta de colores.
- **Seguridad Repositorio:** El estado del proyecto es validado exhaustivamente. No se permitieron _git push_ ni escrituras al dominio central durante la concepción de esta capa visual.
