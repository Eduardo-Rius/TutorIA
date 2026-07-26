# Aggregate Boundaries

Definición explícita de los límites de agregación (Aggregate Roots) para proteger la consistencia de los datos en TutorIA.

## 1. Tenant Aggregate
- **Aggregate Root:** Tenant
- **Entidades internas:** TenantSettings
- **Objetos de valor:** BrandingConfig, TenantStatus
- **Referencias externas:** Ninguna.
- **Reglas de consistencia:** El Tenant es la raíz absoluta. Nada puede existir sin un Tenant.

## 2. Institution Aggregate
- **Aggregate Root:** Institution
- **Entidades internas:** OrganizationalUnit, Delegation
- **Objetos de valor:** LegalInfo, ServiceScheme
- **Referencias externas:** `tenantId`
- **Reglas de consistencia:** Los sub-niveles institucionales deben borrarse (o archivarse) si la Institución matriz se inactiva.

## 3. Center Aggregate
- **Aggregate Root:** Center
- **Entidades internas:** Room, RoomCapacity
- **Objetos de valor:** Address, ExternalCode
- **Referencias externas:** `tenantId`, `institutionId`
- **Reglas de consistencia:** El Center gestiona sus Rooms y capacidades. Un Room no existe fuera de un Center.

## 4. Group Aggregate
- **Aggregate Root:** Group
- **Entidades internas:** -
- **Objetos de valor:** AgeRange, EducationalLevel
- **Referencias externas:** `centerId`, `roomId`
- **Reglas de consistencia:** Es la unidad propietaria de la memoria pedagógica.

## 5. Identity & Access Aggregate
- **Aggregate Root:** User
- **Entidades internas:** Assignment
- **Objetos de valor:** Email, AuthProviderUID
- **Referencias externas:** `roleId`, `centerId`, `groupId`
- **Reglas de consistencia:** Las Asignaciones dependen totalmente del Usuario. Si el Usuario es bloqueado, sus Asignaciones quedan inefectivas.

## 6. Child Aggregate
- **Aggregate Root:** Child
- **Entidades internas:** Enrollment, HealthRecord, FamilyContact
- **Objetos de valor:** CURP, DateOfBirth
- **Referencias externas:** `groupId`
- **Reglas de consistencia:** Toda la información de salud, contacto y matrícula está atada vitaliciamente al menor. Un menor solo puede tener un Enrollment activo a la vez.

## 7. Knowledge Aggregate
- **Aggregate Root:** KnowledgeSource
- **Entidades internas:** KnowledgeChunk
- **Objetos de valor:** Version, Status, EffectiveDate
- **Referencias externas:** `institutionId`
- **Reglas de consistencia:** Los Chunks no existen fuera de un Source. Si el Source se deroga, todos sus Chunks se invalidan para el motor RAG.

## 8. Pedagogical Cycle Aggregate
- **Aggregate Root:** Planning
- **Entidades internas:** PlanningActivity, Evaluation (como sub-recurso eventual, aunque Evaluation puede ser root dependiendo del peso, aquí es parte del ciclo).
- **Objetos de valor:** DateRange, Status, QualitativeNotes
- **Referencias externas:** `groupId`, `observationId`, `recommendationId`, `approvalId`
- **Reglas de consistencia:** La planeación es el contenedor del diseño instruccional. Las actividades no pueden existir sin una planeación.

## Justificación
La separación obedece al ciclo de vida. Un Enrollment no tiene sentido si el Child no existe, por lo que pertenece a su Aggregate. Sin embargo, un Group no le pertenece al Center de la misma forma que un Room (el Group tiene vida histórica propia y cruza ciclos escolares), por lo que Group es su propio Aggregate Root. Esto prevendrá bloqueos masivos y deep-nesting excesivo en Firestore.
