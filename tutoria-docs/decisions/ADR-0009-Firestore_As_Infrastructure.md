# ADR-0009: Firestore as Infrastructure (Domain-First Approach)

## Status
Accepted

## Context
TutorIA requiere una arquitectura resistente al tiempo y a cambios de proveedores de tecnología. Originalmente, las aplicaciones basadas en Firebase suelen acoplar fuertemente la interfaz de usuario (React) con la base de datos (Firestore), llevando lógica de negocio a los componentes visuales o a las reglas de seguridad. 

Para escalar como una plataforma de 10 años (Knowledge Operating System), este acoplamiento es inaceptable.

## Decision
A partir del Sprint 0.6, se establece la **Firestore Architecture Directive**, la cual degrada oficialmente a Firestore (y todo el ecosistema Firebase) a ser **exclusivamente una tecnología de infraestructura (Infrastructure Layer)**. 

Se adoptan los principios de Clean Architecture / Arquitectura Hexagonal para el acceso a datos.

### Reglas mandatorias:
1. **Lógica de negocio:** Queda estrictamente prohibido colocar reglas de negocio en Firestore, Cloud Functions, Firestore Rules, Auth o Storage. Toda lógica pertenece al Domain Layer.
2. **Domain First:** Se prohíbe crear colecciones antes que su Domain Contract, Aggregate, Repository Interface, Application Service y Persistence Adapter.
3. **Repository Pattern:** La UI (React) jamás interactuará con Firestore directamente. Todo acceso será a través de un `RepositoryInterface` implementado por un `FirestoreRepository`.
4. **DTOs Separados:** Toda entidad debe tener su representación de dominio (Domain Entity) y su representación de persistencia (Persistence DTO). No se reutilizarán objetos.
5. **Mappers:** Es obligatoria la existencia de Mappers para traducir de DTO a Entidad y viceversa.
6. **Firestore Rules:** Limitadas únicamente a validar: Tenant, Authentication, Authorization, Ownership y validación de Schema mínimo. No implementan negocio.
7. **Diseño de Colecciones:** Representan Aggregate Roots, nunca pantallas ni formularios.
8. **Tamaño de Documento:** Límite recomendado de 100 KB para evitar degradación. Se deben privilegiar las referencias (IDs) y eventos.
9. **Subcolecciones:** Uso restringido a recursos cuyo ciclo de vida dependa 100% de su padre. En cualquier otro caso, será una colección raíz.
10. **IDs:** Obligatorio uso de UUIDs administrados por el dominio. Prohibido usar autogenerados de Firestore como identificador maestro de dominio.
11. **Tenant:** Absolutamente toda colección, regla y consulta exige inyección de `tenantId`.
12. **Auditoría:** La colección de Audit es *Append Only*. Prohibidos los updates y deletes.
13. **Versionado:** `KnowledgeSource`, `Planning` y `Recommendation` deben soportar versionado inmutable.
14. **Soft Delete:** Hard Delete prohibido. Todo documento debe soportar `status`, `deletedAt` y `deletedBy`.
15. **Transacciones:** Restringidas a casos de verdadera necesidad de consistencia fuerte.
16. **Consultas (Queries):** El modelo debe diseñarse para responder preguntas, no para emular normalización SQL.
17. **Índices:** Prohibidos los índices preventivos. Solo se crearán bajo un caso de uso real documentado.
18. **Observabilidad:** Toda operación crítica emitirá Domain Event, Audit Event y Telemetry Event.
19. **Testing:** Todo repositorio de infraestructura debe ser sustituible por un Fake Repository.
20. **Regla Suprema de Desacoplamiento:** El Domain Layer debe poder compilar y ejecutarse intacto si el día de mañana se elimina Firebase del proyecto.

## Consequences
- **Positivas:** Desacoplamiento total, alta testabilidad, capacidad de migrar a PostgreSQL o MongoDB en el futuro sin reescribir negocio.
- **Negativas:** Mayor verbosidad (escribir Interfaces, Mappers y DTOs para cada entidad), desarrollo inicial más lento.
