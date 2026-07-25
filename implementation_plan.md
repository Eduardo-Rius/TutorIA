# TutorIA Platform — Implementation Plan

- **Producto:** TutorIA Platform
- **Versión actual:** 0.9.0
- **Repositorio canónico:** `/Users/rius/Developer/TutorIA`
- **Remoto oficial:** `https://github.com/Eduardo-Rius/TutorIA.git`
- **Estado actual:** Sprint 0 — Knowledge Architecture completado y aprobado
- **Próxima fase activa:** Sprint 0.5 — Platform Foundation
- **Objetivo de salida de Sprint 0.5:** Base técnica Zero Legacy con build exitoso, configuración saneada y cero dependencias funcionales del MVP heredado

*Nota: Architecture Board creado. Las capacidades documentadas en `tutoria-docs/vision/` son la visión a largo plazo y no están comprometidas con el MVP inmediato.*

### Hitos Posteriores
- **Sprint 0.6 — Core Domain:** Firebase, Identity, RBAC, Roles, Tenant.
- **Sprint 1:** Institution Core.
- **Sprint 2:** Knowledge Platform.
- **Sprint 3:** Pedagogical Platform.
- **Sprint 4:** AI Platform.
- **Sprint 5:** Planning Engine.
- **Sprint 6:** Normative RAG.
- **Sprint 7:** Piloto Operativo.

## Restricciones Estrictas

Queda explícitamente prohibido:
- Copiar archivos `.env`.
- Almacenar credenciales en Git.
- Copiar nuevos componentes desde GuarderiasIMSS.
- Desarrollar directamente sobre `main`.
- Crear repositorios Git anidados.
- Trabajar dentro de OneDrive.
- Exponer claves de Firebase, OpenAI o n8n en el frontend.
