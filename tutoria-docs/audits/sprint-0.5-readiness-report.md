# Informe de Preparación: Sprint 0.5 - Architectural Cleanup

## 1. Ruta del workspace
`/Users/rius/Developer/TutorIA`

## 2. Integridad del repositorio
- **Validación Exitosa**: Se encuentra una única carpeta `.git`.
- **Carpetas detectadas**: `tutoria-app/`, `tutoria-docs/`.
- **Carpetas faltantes**: `tutoria-assets/`, `tutoria-ai-knowledge/`, `tutoria-scripts/`, `tutoria-backups/` (pendiente de creación según necesidades futuras, no se llenaron con carpetas vacías).
- El manejo de entorno es correcto: `.env` es ignorado y no rastreado. `.env.example` está rastreado correctamente y no contiene valores reales.

## 3. Rama activa
`develop` (con el HEAD actual en `de3cf42 chore: define TutorIA Platform v0.9.0`)

## 4. Estado del remoto
- **Origen**: `https://github.com/Eduardo-Rius/TutorIA.git`
- **Estado**: El remoto no reporta ramas de manera activa (`ls-remote` vacío), lo que indica que es un repositorio recién creado o aún no se han subido las ramas iniciales.

## 5. Estado de ramas y tags
- **Ramas Locales**: `develop`, `main`
- **Tags Locales**: `v0.9.0`
- **Ramas en GitHub**: No existen aún.
- **Tags en GitHub**: No existen aún.
- **Divergencia**: Al no existir en remoto, las ramas locales no cuentan con un `upstream` configurado.

## 6. Resultado de npm ci
- **Completado exitosamente**: Instaló dependencias creando 323 paquetes en un ambiente limpio utilizando `package-lock.json`.

## 7. Resultado de npm run build
- **Estado**: Fallido (Exit code 1).

## 8. Número total de errores
Se reportaron un total de **15 errores** durante la fase de Rollup (Vite build).

## 9. Clasificación de errores
1. **Import faltante**: Referencias a módulos de utilidades no migrados (ej. `../utils/normalizeData`).
2. **Servicio heredado**: Importaciones a servicios de negocio eliminados como `../services/usuariosService`, `../services/personalService`.
3. **Asset faltante**: Importaciones directas a assets que ya no existen como `../assets/imss_logo.svg`.
4. **Componente heredado**: Errores en cascada debido a que componentes del MVP antiguo no se resolvían.

## 10. Lista completa de referencias heredadas
Se detectaron menciones extensas al MVP ("Guarderías IMSS") en los siguientes componentes y archivos:
- `tutoria-app/src/pages/ResetPassword.jsx` (Colores y logos)
- `tutoria-app/src/pages/Dashboard.jsx` (Branding completo, lógica de "guarderías asignadas", "reglamentos", íconos)
- `tutoria-app/src/pages/Login.jsx` (Logo, branding institucional exclusivo, colores)
- `tutoria-app/src/pages/Register.jsx` (Logo, textos "Personal Autorizado", colores)
- `CHANGELOG.md` (Referencias históricas de extracción)
- `tutoria-docs/archive/implementation_plan_extraction_legacy.md` (Plan obsoleto renombrado)

## 11. Riesgos técnicos
- **Build Roto**: La aplicación no compila debido a referencias estrictas en dependencias (archivos que importan módulos inexistentes).
- **Deuda Técnica Acoplada**: El sistema de autenticación (`AuthContext.jsx`) está altamente acoplado a un esquema de datos viejo (como `personalService` y estructuras normalizadas propias del MVP).
- **Riesgo de pérdida de sincronización**: El proyecto local está en un estado desvinculado con respecto al remoto, lo cual debe solventarse luego de la limpieza para evitar subir versiones rotas o perder historia.

## 12. Archivos que deben modificarse en el Sprint 0.5
- `tutoria-app/src/context/AuthContext.jsx` (Desacoplar de servicios del MVP)
- `tutoria-app/src/pages/Login.jsx` (Limpiar UI y métodos de negocio específicos)
- `tutoria-app/src/pages/Register.jsx` (Refactorizar al nuevo dominio o simplificar)
- `tutoria-app/src/pages/ResetPassword.jsx` (Desacoplar assets y UI vieja)
- `tutoria-app/src/pages/Dashboard.jsx` (Eliminar componentes de guarderías, sustituir con placeholder estructural)
- `tutoria-app/tailwind.config.js` (Eliminar paleta de colores `imss-*` e inyectar variables base de TutorIA)

## 13. Archivos que deben conservarse
- Archivos de configuración de build: `vite.config.js`, `package.json`, `package-lock.json`
- Estructura base de React: `src/App.jsx`, `src/main.jsx`, `src/index.css`
- Sistema de enrutamiento: `src/routes/AppRoutes.jsx` (Aunque requerirá limpieza, la estructura es valiosa)
- Layout global: `src/components/layout/MainLayout.jsx`

## 14. Archivos que deben eliminarse
- No se han identificado archivos completos por borrar en la auditoría presente más allá de *referencias internas* a assets/servicios. Sin embargo, cualquier archivo bajo `/services` que contenga lógicas exclusivas del MVP debe considerarse candidato a eliminación.

## 15. Recomendación
**APROBADO PARA SPRINT 0.5**
El repositorio se encuentra unificado correctamente en la nueva ubicación, en una rama limpia y aislada. Los errores observados en el compilador son esperables (debido a la extracción selectiva del repositorio origen) y se alinean exactamente con los objetivos del Sprint 0.5 (Architectural Cleanup).
