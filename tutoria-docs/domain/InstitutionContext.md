# Domain Model: Institution Context

**Status:** APPROVED
**Wave:** WAVE 5

## 1. Modelo de Dominio (Domain Model)

El sistema institucional de TutorIA requiere un modelo de identidad y membresía altamente flexible pero estrictamente segmentado. A continuación, las definiciones de las entidades y agregados clave.

- **Actor:** El concepto abstracto de "quien realiza la acción" dentro del sistema (puede ser un usuario humano o un proceso del sistema).
- **Session:** Representa el ciclo de vida del acceso del Actor al sistema. Contiene un estado transaccional (ej. `AUTHENTICATED`, `UNKNOWN`) y una fecha de expiración. **Regla estricta:** La sesión NUNCA contiene la Membership. La sesión sólo sabe quién es el usuario, no dónde opera.
- **Identity:** Representa "quién es" físicamente la persona en el mundo real (ej. nombre, correo, teléfono, identificador en Firebase Auth). Una sola identidad en el sistema.
- **Tenant:** Es el "arrendatario" principal del software. En TutorIA, un Tenant suele mapear 1:1 con un cliente a gran escala.
- **Institution:** La entidad jurídica o matriz administrativa bajo un Tenant. Una institución posee y opera múltiples centros.
- **Region / Zone (Nivel Intermedio):** Nivel organizacional opcional entre Institution y Center, utilizado para segmentación geográfica o administrativa (ej. "Zona Norte").
- **Center:** La unidad física u operativa final donde ocurre la acción (ej. "Guardería 001", "Campus Norte"). Es la frontera contextual más granular.
- **Role:** Una agrupación semántica de responsabilidades y expectativas operativas (ej. "Director", "Tutor", "Supervisor").
- **Capability:** Una facultad específica de negocio asociada a un Rol o Membresía.
- **Policy:** Reglas condicionales de acceso o negocio que determinan si una Capability puede ser ejercida.
- **PermissionSnapshot:** Una captura inmutable en el tiempo de los permisos calculados para una sesión operativa, utilizada para auditoría.
- **ActiveContext (Value Object):** Representa el contexto institucional actualmente seleccionado por el usuario en tiempo de ejecución (el puntero a la Membresía activa).
- **Membership (Membresía):** El agregado central que vincula a una **Identity** con un **Center** (o Institution/Zone) y le otorga un **Role** específico bajo el paraguas de un **Tenant**.
- **MembershipAssignment:** El registro de auditoría que documenta quién, cuándo y por qué otorgó una Membresía.
- **MembershipStatus:** Estado del ciclo de vida de la membresía (`ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED`).

## 2. Relaciones y Ciclo de Vida

### ¿Quién pertenece a quién?
- **Un Tenant** agrupa múltiples **Institutions**.
- **Una Institution** agrupa múltiples **Regions/Zones**.
- **Una Region/Zone** agrupa múltiples **Centers**.
- **Una Identity** puede tener **Múltiples Memberships**.
- **Una Membership** vincula estrictamente: `[Identity + Tenant + Center/Zone/Institution + Role]`.

### Identidad Única de la Membresía
La clave primaria que identifica de forma única una membresía es un **UUID independiente** (`MembershipID`). Ya no es un hash determinístico. Esto permite tener múltiples asignaciones con diferentes ciclos de vida para los mismos atributos (ej. renovación de contratos).

### Ciclo de Vida y Validez
Toda Membresía debe contener:
- `ValidFrom`: Fecha de inicio de vigencia.
- `ValidUntil`: Fecha (opcional) de fin de vigencia.
- `Status`: `MembershipStatus` actual.

### Mutabilidad de la Sesión Activa
- **Lo que NUNCA puede cambiar durante una sesión activa:** 
  - La `Identity` (el usuario autenticado).
  - El `Tenant` subyacente de la sesión (requiere reautenticación).
- **Lo que SÍ puede cambiar durante una sesión activa:**
  - El `ActiveContext` (cambiar la vista de la "Guardería A" a la "Guardería B").

## 3. Casos Especiales y Complejidad Operativa

El modelo debe soportar de forma nativa los siguientes escenarios:

1. **Usuario con múltiples centros:**
   - Una misma `Identity` posee dos registros de `Membership` con UUIDs distintos.
   - El usuario elige su `ActiveContext` en la UI.

2. **Usuario con múltiples roles en el mismo centro:**
   - Una misma `Identity` posee dos membresías en el mismo centro.

3. **Directora responsable de varias guarderías:**
   - Resuelto por múltiples membresías vinculadas a distintos Centers.

4. **Supervisor Regional (Scope a nivel Zone/Institution):**
   - La `Membership` apunta al nivel intermedio (`Zone` o `Institution`). La resolución de políticas (Policy) hereda permisos hacia abajo.

5. **Administrador Global (Scope a nivel Tenant):**
   - La `Membership` se vincula directamente al **Tenant**, sin institución ni centro específico.

6. **Usuarios sin membresía activa:**
   - La `Identity` existe, pero ninguna `Membership` está `ACTIVE` o dentro del rango `ValidFrom`-`ValidUntil`.
   - Se debe enrutar a un estado *Pending Approval/Empty*.

## 4. Fronteras de Seguridad (Autorización)

Para mantener TutorIA como un producto seguro y escalable, NUNCA deben mezclarse los siguientes 4 conceptos:

| Concepto | Pregunta que responde | Responsabilidad Técnica |
|----------|-----------------------|-------------------------|
| **Autenticación (Authentication)** | *¿Estás seguro de quién dices ser?* | Probar la existencia real de la persona. (Session). |
| **Identidad (Identity)** | *¿Quién eres?* | Proveer el ID único, correo y perfil básico. |
| **Pertenencia (Membership)** | *¿A dónde perteneces y qué papel juegas?* | Resolver en qué Tenant, Institución y Centro opera el usuario. (Base de datos). |
| **Autorización (Authorization)** | *¿Puedes realizar esta acción técnica exacta ahora mismo?* | Calcular si el cruce entre el `ActiveContext` activo y las `Policies` otorgan la `Capability`. |

**Regla de Oro:** La Sesión sólo prueba quién eres. La Autorización prueba qué puedes hacer. Y la Pertenencia (Membresía) dicta en qué contexto puedes hacerlo.
