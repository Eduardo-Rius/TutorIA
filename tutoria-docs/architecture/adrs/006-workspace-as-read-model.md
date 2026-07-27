# ADR 006: Workspace is a Read Model

**Date:** 2026-07-27
**Status:** Approved
**Wave:** WAVE 6

## Contexto
El "Operational Workspace" (o página de inicio autenticada) es el punto de entrada para todos los usuarios. Requiere mostrar información consolidada de múltiples dominios (Planeaciones, Notificaciones, Membresías, Autorizaciones). 
Si permitimos que el módulo de Workspace gestione las reglas de negocio de estos elementos, se convertirá rápidamente en un "God Object" que acoplará todos los dominios del sistema.

## Decisión
Se establece arquitectónicamente que el **Workspace es un Read Model puro**.
- El Workspace **no** posee lógica de negocio de planeaciones, aprobaciones o notificaciones.
- Actúa como una capa de agregación de lectura. Solo consume proyecciones o interfaces de solo lectura de otros dominios.
- Cualquier acción generada desde el Workspace (ej. "Aprobar planeación") debe delegarse al agregado/dominio correspondiente, no resolverse en los componentes del Workspace.

## Consecuencias
- **Desacoplamiento:** Los módulos de negocio (Planning, Approvals) pueden evolucionar independientemente del Workspace.
- **Rendimiento:** Permite en el futuro implementar proyecciones CQRS reales u optimizadas para renderizar el Workspace sin cargar los agregados de dominio completos.
- **UX (Zero Navigation):** El Workspace puede actuar como una bandeja de entrada (Work Queue) universal al acoplar interfaces estándar (ej. `IWorkItem`) sin conocer los detalles de implementación de cada elemento de trabajo.
