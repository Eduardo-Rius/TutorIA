# ROADMAP FASE 2: Product Development

## 1. Visión Estratégica
A partir de la Fase 2, TutorIA abandona la etapa de construcción de infraestructura técnica (Design System, Core Domain, Shared Kernel) para convertirse oficialmente en una **plataforma educativa impulsada por Inteligencia Artificial**. 

El objetivo principal es materializar un sistema operativo para la educación inicial escalable, multi-tenant y agnóstico al contexto específico (IMSS, guarderías privadas, SEP, etc.).

**Principio Rector de la IA:**  
La Inteligencia Artificial no es un módulo conversacional aislado (un chatbot), sino una **capacidad transversal** presente de forma natural en toda la plataforma a través de sugerencias, explicaciones, recomendaciones, validaciones y generación documental.

## 2. Objetivos de la Fase 2
El enfoque técnico cambia drásticamente:
- La prioridad absoluta es **construir capacidades de negocio** y generar valor visible para el usuario final.
- El Design System de TutorIA se declara como **Feature Complete v1**. Queda prohibida la creación de nuevos componentes base, capas de diseño o librerías paralelas sin autorización expresa del Architecture Review Board (ARB).
- Toda Feature nueva debe componerse orquestando los ecosistemas existentes (`Theme`, `Foundations`, `Primitives`, `Forms`, `Layouts`, `AI Experience`).
- La arquitectura actual se reutiliza, no se reescribe.
- Todo módulo funcional **debe poder operar sin IA**. La Inteligencia Artificial mejora, agiliza y potencia la experiencia, pero jamás debe ser un requisito de bloqueo operativo.

## 3. Roadmap Oficial de Evolución (Waves) y Criterios de Entrada/Salida

### WAVE 4 — Authentication & Navigation
- **Objetivo:** Implementar identidad, sesión y navegación funcional sin introducir todavía contexto institucional completo.
- **Precondiciones:** Fase 1 (Design System) completada.
- **Dentro del alcance:** acceso; cierre de sesión; persistencia y restauración segura de sesión; estado de autenticación; rutas públicas y protegidas; conexión del AppShell; navegación funcional; estados de carga y error; adaptadores de autenticación desacoplados de la UI.
- **Fuera del alcance:** autorización completa por tenant; permisos de negocio definitivos; dashboard por rol; administración de usuarios; recuperación de contraseña, salvo aprobación expresa; lógica institucional de WAVE 5.
- **Entregables:** Adaptadores de Auth, rutas integradas con el Layout.
- **Criterios de aceptación:** Un usuario autenticado puede ingresar, navegar por rutas protegidas y cerrar sesión sin que los componentes visuales dependan directamente de Firebase.
- **Riesgos principales:** Manejo inseguro de tokens de sesión.
- **Condición de cierre:** El flujo de navegación protegido está asegurado.

### WAVE 5 — Institution Context
- **Objetivo:** Resolver de manera segura el contexto operativo del usuario.
- **Precondiciones:** WAVE 4 completado (Identidad resuelta).
- **Dentro del alcance:** Tenant; Institution; Center o Guardería; perfil; roles; membresías; selección o resolución de contexto; aislamiento institucional; autorización básica; estados sin institución o sin permisos.
- **Fuera del alcance:** Módulos de negocio (Planeación).
- **Entregables:** Resolutores de contexto y guardas de rutas.
- **Criterios de aceptación:** Toda operación funcional puede conocer de manera explícita y validada: actor, tenant, institution, center, role, permissions. No confiar únicamente en datos recibidos desde el cliente.
- **Riesgos principales:** Escalabilidad Multi-Tenant (filtración accidental).
- **Condición de cierre:** El aislamiento institucional es criptográficamente validable.

### WAVE 6 — Dashboard Institucional
- **Objetivo:** Entregar la primera experiencia visible y contextualizada por rol.
- **Precondiciones:** WAVE 5 completado.
- **Dentro del alcance:** composición sobre AppShell; contenido contextual; estados vacío, carga y error; navegación hacia capacidades disponibles; variantes configuradas por permisos, no por componentes duplicados.
- **Fuera del alcance:** Edición de entidades complejas.
- **Entregables:** Dashboards dinámicos basados en permisos.
- **Criterios de aceptación:** Docente, Directora, Supervisor y Administrador reciben una experiencia coherente con sus permisos, sin crear cuatro dashboards independientes y duplicados.
- **Riesgos principales:** Acoplamiento de UI a lógica de negocio condicional pesada.
- **Condición de cierre:** La vista principal orquesta los Layouts exitosamente.

### WAVE 7 — Planeación Docente
- **Objetivo:** Construir el primer flujo completo de negocio sin dependencia obligatoria de IA.
- **Precondiciones:** Contexto (WAVE 5) e Interfaz (WAVE 6) resueltos.
- **Dentro del alcance:** creación; edición; guardado; consulta; validaciones; estados de borrador; trazabilidad básica; formularios pedagógicos; persistencia; recuperación ante errores.
- **Fuera del alcance:** Sugerencias automáticas o auto-llenado por IA.
- **Entregables:** Módulo de planeación completo.
- **Criterios de aceptación:** Una docente puede crear y conservar una planeación completa manualmente, aunque el Motor IA no esté disponible.
- **Riesgos principales:** Formatos estáticos inflexibles.
- **Condición de cierre:** La planeación es un agregado de dominio persistible.

### WAVE 8 — Motor IA
- **Objetivo:** Incorporar IA como capacidad transversal y degradable.
- **Precondiciones:** Módulo core (WAVE 7) existente para potenciarlo.
- **Dentro del alcance:** puertos y adaptadores; proveedor desacoplado; n8n o capa de orquestación; OpenAI mediante infraestructura; contratos de solicitud y respuesta; timeouts; reintentos controlados; fallback manual; observabilidad; control de errores; protección de datos; trazabilidad de sugerencias; límites de uso y costos.
- **Fuera del alcance:** Chat normativo libre.
- **Entregables:** Infraestructura de IA y adaptadores transversales.
- **Criterios de aceptación:** La IA puede fallar o quedar inactiva sin impedir la operación manual de Planeación Docente.
- **Riesgos principales:** Alucinaciones y dependencia del proveedor.
- **Condición de cierre:** La IA enriquece el contexto funcional de manera controlada.

### WAVE 9 — Workflow de Aprobación
- **Objetivo:** Implementar el ciclo transaccional Docente–Directora y la consulta supervisora.
- **Precondiciones:** Planeaciones funcionales (WAVE 7).
- **Dentro del alcance:** BORRADOR, EN_REVISIÓN, APROBADA, RECHAZADA. transiciones válidas; motivo de rechazo; fecha; actor; historial; auditoría; autorización por rol; prevención de cambios inválidos; concurrencia y consistencia.
- **Fuera del alcance:** Firmas electrónicas avanzadas.
- **Entregables:** Motor de estados y auditoría.
- **Criterios de aceptación:** Puede demostrarse el flujo completo: Creación → Envío → Revisión → Aprobación o rechazo → Corrección → Reenvío con trazabilidad y controles de autorización.
- **Riesgos principales:** Concurrencia de modificaciones.
- **Condición de cierre:** El ciclo de negocio principal (core) está completo.

### WAVE 10 — Chat Normativo
- **Objetivo:** Implementar asistencia normativa especializada sin convertir TutorIA en un producto centrado en chat.
- **Precondiciones:** Infraestructura IA (WAVE 8) validada.
- **Dentro del alcance:** recuperación de fuentes; referencias verificables; límites de respuesta; avisos de incertidumbre; separación entre normativa y recomendación; protección frente a respuestas sin respaldo; historial conforme a política de privacidad; integración con AI Experience System.
- **Fuera del alcance:** Reemplazar el manual oficial estático.
- **Entregables:** Asistente especializado en normas educativas.
- **Criterios de aceptación:** Las respuestas normativas muestran su fundamento y no presentan contenido generado como una instrucción oficial sin evidencia.
- **Riesgos principales:** Respuestas normativas incorrectas.
- **Condición de cierre:** Asistente integrado bajo control contextual estricto.

## 4. Dependencias Arquitectónicas
El flujo de desarrollo requiere un modelo secuencial estricto donde el contexto enriquece a la función:

`Authentication` → `Institution Context` → `Dashboard` → `Planeación` → `Motor IA` → `Aprobaciones`

Esta cadena asegura que, al momento de redactar una Planeación o requerir asistencia de IA, el sistema posea una identidad autenticada, un contexto institucional validado y una autorización verificable para cada operación.

## 5. Riesgos Conocidos

### Riesgos Operativos y de Arquitectura
- **Crecimiento de Deuda Técnica:** Riesgo de acoplamiento de lógica de negocio en la capa de UI.
- **Cambios Regulatorios:** La normativa SEP/IMSS evoluciona.

### Riesgos de Escalabilidad Multi-Tenant
- Filtración accidental entre guarderías.
- Consultas sin tenant.
- IDs predecibles.
- Reglas de seguridad incompletas.
- Privilegios heredados incorrectamente.
- Cambio de centro sin revalidación.
- Cache o estado global contaminado.
- Logs con datos cruzados.
- **Mitigación:** Validación en cliente, aplicación e infraestructura; pruebas negativas entre tenants; reglas de seguridad automatizadas; auditoría y contexto explícito en cada operación.

### Riesgos de IA y Privacidad
- Alucinaciones.
- Fuentes inexistentes.
- Prompt injection.
- Fuga de información.
- Exposición de datos personales.
- Dependencia del proveedor.
- Indisponibilidad.
- Costos variables.
- Respuestas normativas incorrectas.
- **Mitigación:** RAG con fuentes controladas; citación; filtros; minimización de datos; revisión humana; fallback; límites; observabilidad; abstracción del proveedor.

## 6. Definición de Producción (Go-Live)

### MVP Operativo
TutorIA podrá considerarse MVP operativo al cerrar WAVE 9 cuando demuestre:
- autenticación funcional;
- autorización por rol;
- aislamiento multi-tenant;
- creación manual de planeación;
- asistencia de IA no bloqueante;
- envío, revisión, aprobación y rechazo;
- auditoría;
- reglas de Firestore probadas;
- manejo de errores;
- respaldo o recuperación definidos;
- accesibilidad crítica;
- pruebas de aceptación aprobadas.

### Producción Controlada
TutorIA podrá considerarse listo para una producción controlada o piloto solamente cuando, además, exista evidencia de:
- revisión de seguridad;
- pruebas de aislamiento entre tenants;
- evaluación de reglas de Firestore;
- gestión de secretos;
- monitoreo y alertas;
- logs sin datos sensibles;
- política de privacidad y retención;
- respaldo y restauración probados;
- plan de respuesta a incidentes;
- criterios de disponibilidad;
- pruebas de carga acordes al piloto;
- aceptación funcional del cliente;
- rollback documentado;
- responsables operativos definidos.

### Producción General
La liberación general deberá depender de resultados del piloto, métricas operativas y aprobación formal del negocio, seguridad y operación.

WAVE 10 podrá ser posterior al MVP operativo si el Chat Normativo no forma parte del alcance contractual inicial. Si forma parte del compromiso de salida, deberá completarse antes del Go-Live correspondiente.

## 7. Principios de Evolución de TutorIA

### 7.1 Modular Monolith First
TutorIA evolucionará inicialmente como un monolito modular bien delimitado.
No introducir microservicios por anticipación.
Los módulos deberán separarse mediante contratos, no necesariamente mediante despliegues independientes.

### 7.2 Ports and Adapters
Toda tecnología externa deberá quedar detrás de interfaces o puertos: `AuthenticationProvider`, `PlanningRepository`, `AIProvider`, `DocumentStorage`, `AuditRepository`, `NotificationProvider`. Firebase, OpenAI y n8n son implementaciones, no el dominio.

### 7.3 Multi-Tenant by Design
Toda entidad institucional deberá estar vinculada explícitamente con su contexto correspondiente.
Nunca inferir el tenant únicamente desde la interfaz.
Toda consulta y escritura deberá validar el contexto autorizado.

### 7.4 Authorization over Visibility
Ocultar una opción en la UI no constituye seguridad.
Las operaciones deberán ser autorizadas también en las capas de aplicación e infraestructura.

### 7.5 AI Graceful Degradation
Toda capacidad asistida por IA deberá ofrecer: estado de espera; timeout; error; reintento controlado; alternativa manual; explicación de que la sugerencia requiere revisión humana.

### 7.6 Human-in-the-Loop
La IA podrá sugerir, redactar, resumir, explicar y alertar.
No deberá aprobar planeaciones ni ejecutar decisiones institucionales irreversibles sin intervención de un usuario autorizado.

### 7.7 Auditability
Las operaciones críticas deberán registrar: actor; acción; fecha y hora; entidad; estado anterior; estado posterior; tenant; centro; origen de la operación.
No registrar secretos ni información sensible innecesaria.

### 7.8 Privacy by Design
TutorIA trabaja en un contexto que puede involucrar información institucional, docente y de menores.
Aplicar: minimización de datos; finalidad definida; acceso por necesidad; retención controlada; anonimización cuando corresponda; prohibición de enviar información sensible a proveedores de IA sin política y autorización aprobadas.

### 7.9 Observability
Las integraciones deberán medir al menos: errores; latencia; disponibilidad; consumo; costos de IA; fallos por tenant; reintentos; operaciones críticas.

### 7.10 Configuration over Forks
Las diferencias entre IMSS, guarderías privadas u otras instituciones deberán resolverse preferentemente mediante: configuración; catálogos; permisos; reglas; feature flags; plantillas.
No mediante copias o forks del producto.

### 7.11 No Premature Generalization
La visión es construir una plataforma adaptable, pero cada abstracción deberá nacer de necesidades verificadas.
No construir hoy módulos hipotéticos para SEP, gobiernos estatales o programas internacionales si todavía no existe un caso real que lo requiera.

### 7.12 Design System Governance
El Design System permanece como: **Feature Complete v1**
Un componente nuevo solo podrá incorporarse cuando:
- no pueda resolverse mediante composición;
- tenga reutilización demostrable;
- no duplique una pieza existente;
- mantenga accesibilidad;
- cuente con autorización del ARB.

## 8. Decisiones Arquitectónicas Pendientes
Registrar, sin resolver todavía:
- proveedor definitivo de autenticación;
- estrategia de roles y permisos;
- formato de claims;
- resolución y cambio de tenant;
- modelo de datos de perfil y membresía;
- estrategia de sesión;
- estrategia offline;
- política de auditoría;
- retención de datos;
- almacenamiento documental;
- observabilidad;
- presupuesto y cuotas de IA;
- política de información enviada a LLM;
- entornos de desarrollo, pruebas y producción;
- NavigationService (Future Port).

Estas decisiones deberán resolverse en el Wave correspondiente mediante ADR cuando sean arquitectónicamente significativas.
