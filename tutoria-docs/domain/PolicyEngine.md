# Policy Intelligence Engine

**Status:** ACTIVE
**Module:** `src/domain/policy`

El **Policy Intelligence Engine** es el motor principal de la Capa 1 (Policy Intelligence) dentro del ecosistema de TutorIA.

## Filosofía
Las reglas y validaciones no viven directamente en los métodos internos del Aggregate Root. En su lugar, se extraen como **Políticas (Policies)** genéricas que implementan un contrato estándar. 

El Aggregate ya no pregunta "¿Es válido?". El Application Service inyecta un `PolicyEngine<TContext>` y pregunta "¿Qué políticas se incumplen en este contexto?".

## Componentes Core
1. **Policy:** Un contrato puro de dominio con un código tipado (`PolicyCode`).
2. **PolicyCode:** Value Object (ej. `PLN-001`) para estandarizar errores.
3. **PolicyViolation:** Contiene el código, la severidad (`INFO`, `WARNING`, `ERROR`, `BLOCKING`), el campo, un `messageKey` de internacionalización y metadata rica.
4. **PolicyEngine:** Servicio genérico que evalúa cualquier contexto contra un set de políticas registradas, produciendo un `PolicyReport`.
5. **PolicyRegistry:** Contenedor inyectable (`PlanningPolicyRegistry`, `AttendancePolicyRegistry`, etc.) que registra las políticas para un módulo.

## Beneficios
- **Desacoplamiento:** El Dominio no sabe de UI ni de idiomas. Devuelve `messageKey` y la UI traduce.
- **Reutilización:** El motor es `PolicyEngine<TContext>`, aplicable a Planificación, Asistencia, etc.
- **Observabilidad:** El `PolicyReport` arroja métricas claras de policies evaluadas, pasadas, fallidas y execution time.\n