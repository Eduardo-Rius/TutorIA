# Pedagogical Component Boundaries

Este documento define la arquitectura y los límites de responsabilidad del software para los componentes específicos del dominio pedagógico de TutorIA.

## 1. Componentes Cubiertos
- `PlanningCard`
- `ObservationCard`
- `ApprovalStatus`
- `NormativeReference`
- `LearningResourceCard`

## 2. Distinción Arquitectónica

En TutorIA existe una barrera estricta entre la UI visual y el Core Domain (Clean Architecture).

- **Visual Component (React UI):** Archivos mudos (dumb components) que solo saben pintar información en la pantalla usando Tokens y Primitives.
- **Application View Model:** Objeto plano que la UI entiende.
- **Domain Model (Aggregate Roots):** Entidades ricas de negocio con lógica y reglas de invariantes.

## 3. Reglas y Límites de Responsabilidad

Todo componente de la categoría `Pedagogical` DEBE cumplir con las siguientes reglas arquitectónicas:

1. **Mapeo Plano:** Pueden recibir DTOs (Data Transfer Objects) o View Models planos, nunca la instancia viva de un Aggregate Root.
2. **Prohibición de Importaciones de Dominio:** NO pueden importar clases o interfaces del Core Domain (`src/domain/...`). Deben ser declarados con sus propias interfaces visuales locales.
3. **Cero Lógica de Negocio:** NO ejecutan reglas de dominio. Si una `PlanningCard` no se puede aprobar sin fechas, la UI solo recibe una prop `isApprovable: boolean`, no debe calcularlo leyendo fechas internamente.
4. **Cero Persistencia:** NO llaman a repositorios, fetch, Axios ni mutaciones GraphQL directamente.
5. **Cero Infraestructura:** NO conocen de la existencia de Firebase, Firestore, Auth, ni entornos de red.
6. **Cero Eventos de Dominio:** NO publican Domain Events. Únicamente emiten callbacks puros de interacción de UI (ej. `onApproveClick`, `onViewDetails`).
7. **Composición:** Representan visualmente el estado componiendo elementos primitivos (Cards, Text, StatusIndicatoricators).
