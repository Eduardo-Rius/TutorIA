# TutorIA Engineering Constitution v1.0

## 1. Propósito
Esta constitución no es un documento de arquitectura técnica ni un diagrama de software. Es el contrato cultural, operativo y ético que define *cómo* se escribe, valida y despliega software en TutorIA. Su objetivo es garantizar la consistencia, la trazabilidad institucional y la prevención absoluta de la deuda técnica heredada.

## 2. Alcance
Aplica a todo ingeniero, agente de IA, revisor de código o product owner involucrado en el ciclo de vida de desarrollo, sin importar la fase del Sprint. Las violaciones a esta constitución son bloqueantes absolutos en cualquier Pull Request (PR) o Commit local.

## 3. Principios Fundamentales

### Knowledge First
- **Definición:** TutorIA es primero una plataforma de conocimiento y después un producto de software. La calidad del dominio institucional está por encima de la velocidad de desarrollo de las interfaces.
- **Razón:** Sin reglas de negocio claras, la IA alucinará; sin roles institucionales claros, los datos se fugarán.
- **Implicaciones prácticas:** No se puede programar lógica que no esté primero documentada en `tutoria-docs/architecture` o autorizada en un ADR.
- **Ejemplos:** Configurar la taxonomía de la base de datos antes de pintar los formularios en React.
- **Comportamientos prohibidos:** Inventar permisos "sobre la marcha" en el código fuente.

### Architecture Before Code
- **Definición:** Queda prohibida la escritura compulsiva de código (Hacking) sin un diseño técnico explícito previo.
- **Razón:** Para prevenir el espagueti arquitectónico y los retrabajos dolorosos que detuvieron prototipos anteriores.
- **Implicaciones prácticas:** Todo módulo nuevo exige al menos una revisión documental antes de instalar la primera dependencia.
- **Ejemplos:** El Sprint 0 entero, donde no se escribió una sola línea de React hasta no tener la Arquitectura Orientada a Eventos aprobada.
- **Comportamientos prohibidos:** Empezar a crear pantallas antes de diseñar cómo se comunican mediante Eventos.

### Foundation Rule
- **Definición:** Nunca se modifica el historial de un Sprint cerrado.
- **Razón:** Proteger la memoria institucional del proyecto y mantener un rastro inmutable de las decisiones y auditorías pasadas.
- **Implicaciones prácticas:** Si se encuentra un error estructural heredado del Sprint 0, se crea un ADR en el Sprint 1 para resolverlo, pero no se "reescribe" la documentación del Sprint 0 como si el error nunca hubiera existido.
- **Ejemplos:** Mantener las auditorías base (Baseline) incluso si el código fue purgado posteriormente.
- **Comportamientos prohibidos:** Reescribir reportes de sprints pasados para que encajen con realidades futuras.

### ADR First (Architecture Decision Records)
- **Definición:** Las decisiones que impactan la escalabilidad, mantenibilidad o seguridad deben quedar registradas permanentemente y sometidas a consenso.
- **Razón:** Para no perder el contexto del "por qué" se decidió usar una tecnología sobre otra, reduciendo las dependencias a largo plazo.
- **Implicaciones prácticas:** Cualquier cambio de base de datos, librería de UI (Tailwind), o modelo de IA exige un documento formal en `tutoria-docs/decisions/`.
- **Ejemplos:** El ADR-0006 que obliga a un modelo MultiTenant nativo.
- **Comportamientos prohibidos:** Cambiar Firebase por Supabase "porque sí" sin un ADR.

### Human Oversight
- **Definición:** Ningún agente de inteligencia artificial (incluyendo bots de auto-commit) está autorizado para empujar código a repositorios remotos sin la aprobación humana explícita.
- **Razón:** Asegurar que la responsabilidad ética y legal del código recaiga en el equipo humano de la institución.
- **Implicaciones prácticas:** Los commits automatizados son siempre locales y los PR exigen revisión.
- **Ejemplos:** Entregar reportes de estado antes de ejecutar `git push`.
- **Comportamientos prohibidos:** Usar `--force` o inyectar lógica de negocio en remotos (origin) sin supervisión.

### Build Before Commit
- **Definición:** Queda prohibido registrar en la historia oficial un commit que rompa la compilación del software.
- **Razón:** Mantener siempre la rama `develop` y `main` en un estado donde otro ingeniero pueda clonar, instalar y arrancar el entorno sin fricción.
- **Implicaciones prácticas:** Ejecutar validaciones locales formales en cada iteración de código.
- **Ejemplos:** Finalizar el Sprint 0.5 confirmando un `npm run build` exitoso.
- **Comportamientos prohibidos:** "Commitear para guardar el trabajo de hoy" dejando imports rotos intencionalmente.

### Documentation is Part of the Product
- **Definición:** La documentación no es un "extra" o algo que se hace "al final si da tiempo". Se diseña, desarrolla y versiona a la par (o antes) del código funcional.
- **Razón:** La memoria técnica institucional de TutorIA es tan valiosa como sus binarios.
- **Implicaciones prácticas:** Un pull request sin la actualización correspondiente en `tutoria-docs` está incompleto.
- **Ejemplos:** El reporte "Zero Legacy Cleanup Report" creado durante el Sprint 0.5.
- **Comportamientos prohibidos:** Ignorar el mantenimiento del `CHANGELOG.md` o del `implementation_plan.md`.

### Security by Design
- **Definición:** La seguridad de la información, el aislamiento de datos (MultiTenant) y la privacidad de los menores nunca son añadidos a posteriori; son el primer criterio de evaluación de cualquier bloque de código.
- **Razón:** Proteger información extremadamente sensible (PII, observaciones médicas) de la niñez.
- **Implicaciones prácticas:** No subida accidental de `.env`, no hardcoding de credenciales, y no delegación de privilegios en el front-end.
- **Ejemplos:** Evitar exponer cualquier API Key de OpenAI o n8n en el cliente Vite.
- **Comportamientos prohibidos:** Almacenar tokens de servicio (Service Accounts) en el repositorio.

### Zero Hidden Magic
- **Definición:** El código y las configuraciones deben ser declarativos, explícitos e identificables. No debe haber abstracciones incomprensibles ni cadenas de herramientas no auditables.
- **Razón:** El equipo técnico debe entender exactamente cómo y por qué se construye la aplicación para poder depurarla en el futuro (Observabilidad).
- **Implicaciones prácticas:** Explicar el "Por qué" en comentarios cuando el código solucione problemas arquitectónicos complejos.
- **Ejemplos:** La purga "Zero Legacy" eliminó contextos inútiles y código fantasma.
- **Comportamientos prohibidos:** Mantener "código muerto por si acaso" o variables globales que mutan misteriosamente el estado.

### Every Sprint Leaves the Code Better
- **Definición:** El Boy Scout Rule en práctica absoluta: El código debe quedar más limpio, legible y modularizado después del Sprint que antes de comenzarlo.
- **Razón:** TutorIA es una plataforma a 10 años. La acumulación de deuda técnica matará el proyecto.
- **Implicaciones prácticas:** Aprovechar los refactors necesarios para limpiar deuda cercana al área modificada.
- **Ejemplos:** No tolerar `TODO`, `FIXME` o dependencias rotas pospuestas indefinidamente.
- **Comportamientos prohibidos:** Introducir deudas técnicas deliberadas para "cumplir los tiempos del MVP" sin la promesa auditada de repararlo.

## 4. Engineering Oath

Cualquier ente (humano o sintético) que modifique el código fuente de TutorIA se compromete a:
1. Respetar el aislamiento de los datos (MultiTenant) de la institución por sobre la conveniencia del desarrollo.
2. Reconocer que la Inteligencia Artificial debe someterse siempre a las reglas institucionales (Knowledge Governance).
3. No ocultar errores, deudas técnicas o fallos de compilación mediante trucos opacos (mocks no documentados).
4. No publicar software que no esté listo para revisión humana crítica.
5. Cuidar la memoria histórica y documental de TutorIA para las generaciones futuras de ingenieros de la plataforma.

## 5. Definition of Engineering Excellence
En TutorIA, la excelencia de ingeniería no se mide en líneas de código producidas. Se mide por la **ausencia de ambigüedad**, la **limpieza de la trazabilidad** (Git, Logs, Observabilidad), la **robusted de los límites arquitectónicos** (Clean Architecture, Event-Driven) y la **certidumbre legal y pedagógica** con la que la tecnología empodera a los humanos involucrados en la plataforma.
