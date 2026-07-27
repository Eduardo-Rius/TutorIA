# Domain Model: Operational Workspace

**Status:** APPROVED
**Wave:** WAVE 6

## El Problema de los 15 Segundos

¿Qué necesita ver un usuario durante los primeros 15 segundos después de entrar a TutorIA para poder empezar a trabajar sin pensar?

Cuando un usuario cruza el `ContextBoundary`, su estado mental cambia de administrativo a **operativo**. El Workspace no es un Dashboard inteligente que responde "¿Qué está pasando?". Es un **Operational Workspace** que responde **"¿Qué debo hacer ahora?"**.

Para que el usuario trabaje sin fricción, el Workspace se organiza en 5 zonas cognitivas (no visuales):

### Zona 1: Identidad Operativa (Contexto)
El usuario necesita certeza absoluta de su entorno operativo actual.
Debe responder: **¿Quién soy aquí?**
- "Estoy trabajando como Directora de Guardería Norte."
- La identidad institucional no debe tener ambigüedad, especialmente si la sesión se reanuda tras una interrupción.

### Zona 2: Foco (Urgencia)
La única cosa más importante que el usuario debe resolver hoy. Nada de 10 KPIs.
- Ejemplo: "3 planeaciones esperan aprobación -> Revisarlas ahora."
- Si no hay alertas de máxima prioridad, el sistema proyecta "todo está bajo control".

### Zona 3: Continuidad
Debe responder: **¿Qué estaba haciendo y por qué me detuve?**
- Accesos a borradores (Drafts) interrumpidos.
- No solo muestra "Planeación B", sino el contexto de la pausa.

### Zona 4: Excepciones (Work Queue)
El núcleo del Workspace. No es un *timeline* ni un *feed* de actividad. Es una **Cola de Trabajo (Work Queue)**.
- Solo contiene información accionable que requiere intervención humana.
- Ejemplo: "Planeación rechazada", "Normatividad modificada".
- Estados: `Pendiente -> En proceso -> Bloqueado -> Esperando aprobación`.

### Zona 5: Momento Siguiente (Next Action)
Debe responder: **¿Cuál es el siguiente paso lógico?**
- Acciones recomendadas ordenadas por contexto, rol, historial y urgencia.
- Menos menús de navegación, más flujos de trabajo directos.

## Principios UX y Arquitectónicos

### 1. Zero Navigation Principle
El usuario idealmente debería poder completar el 80% de su trabajo sin buscar menús. Todo el trabajo importante debe empujarse al Workspace basándose en el `ActiveContext`.

### 2. Workspace is a Read Model
El Workspace no es dueño de ninguna lógica de negocio. Es puramente un **Read Model**.
- Consume información de: Planning, Approval, Notification, Membership, Audit, Policy, etc.
- Construye una vista unificada pero NUNCA ejecuta mutaciones directas de estado crítico.
- Actúa como el orquestador visual para delegar a los módulos específicos.
