# Firestore Mapping Strategy

Esta estrategia define cómo las entidades conceptuales del Domain Contract se traducirán físicamente a colecciones en Cloud Firestore.

## 1. Estrategia MultiTenant (Aislamiento Primario)
Debido a la naturaleza de Firestore y las limitaciones de Firestore Rules, el MultiTenant se manejará mediante **Filtros por TenantID en la Raíz**.
- Todas las colecciones existirán en la raíz de la base de datos (ej. `/users`, `/centers`, `/children`).
- ABSOLUTAMENTE TODOS los documentos llevarán el atributo `tenantId: "UUID"`.
- Las Firestore Rules usarán `request.auth.token.tenantId == resource.data.tenantId` como la regla cero para cualquier operación.

## 2. Criterios para Colecciones Raíz
Una entidad será una colección raíz si cumple alguno de estos criterios:
- Es un Aggregate Root (ej. `tenants`, `centers`, `groups`, `children`).
- Necesita ser consultada de forma independiente a través de múltiples agregados (ej. `users`, `knowledge_sources`).
- Está sujeta a paginación masiva o métricas independientes.

## 3. Cuándo usar Subcolecciones
Una entidad será subcolección si:
- Es intrínsecamente propiedad de un solo padre y su ciclo de vida depende de este.
- Raramente necesita ser consultada globalmente (ej. Collection Group Queries no justificados).
- Ejemplo 1: `assignments` será subcolección de `users` (ej. `/users/{userId}/assignments/{assignmentId}`).
- Ejemplo 2: `evaluations` será subcolección de `groups` o de `plannings`.

## 4. Cuándo usar Referencias (Relaciones)
- Se usarán los IDs en forma de strings (ej. `centerId: "xyz"`) en lugar de DataTypes de tipo `Reference` de Firestore. Esto simplifica la serialización JSON, el tipado en TypeScript y las llamadas a la API.

## 5. Cuándo duplicar información (Denormalización)
En Firestore (NoSQL), las lecturas son costosas y los joins no existen.
- Se duplicará información estática que raramente cambie para evitar consultas extra.
- Ejemplo: En un documento `planning`, no solo guardar `authorId: "abc"`, sino guardar `authorName: "Juan Pérez"` para pintar la UI sin un request adicional.
- Ejemplo: En `enrollments`, guardar `childFirstName` y `childLastName` junto al `childId`.

## 6. Estrategia de Índices
- Se preferirán consultas simples que aprovechen los Single-Field Indexes generados automáticamente.
- Índices compuestos (Composite Indexes) solo se crearán si la UI los exige estrictamente (Ej. `tenantId` + `centerId` + `status` == active).

## 7. Estrategia de Auditoría
- La colección raíz `/audit_logs` almacenará los eventos puros.
- Estará sujeta a una Firestore Rule: `allow create: if true (with strict schema); allow update, delete: if false;`. (Insert-Only).
- Alternativamente, se preferirá delegar la creación de Audit Logs a Cloud Functions o Triggers en backend, quitando la responsabilidad al cliente.

## 8. Estrategia de Soft Delete
- Queda prohibido el borrado físico (Hard Delete) de cualquier entidad, a excepción de tokens temporales.
- Toda colección raíz tendrá un campo `status` o `deletedAt`.
- Consultas UI siempre filtrarán `where("status", "==", "active")`.

## 9. Estrategia de Versionado
Para entidades inmutables que evolucionan (KnowledgeSource, Planning):
- No se actualiza el documento. Se clona y se incrementa el atributo `version`.
- El padre apunta siempre a la `currentVersionId`.
- El historial queda en subcolecciones `versions` (ej. `/knowledge_sources/{sourceId}/versions/{versionId}`).
