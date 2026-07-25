# ADR-0006: MultiTenant First (Multiusuario Institucional desde la versión 1)

## Contexto
Frecuentemente, el software se diseña pensando en un solo cliente (Single-Tenant) y, cuando el negocio escala y se firma contrato con otra institución, el equipo de ingeniería debe clonar bases de datos enteras o parchar desesperadamente el código, creando "infierno de mantenimiento".

## Decisión
TutorIA se diseña con un particionamiento de datos MultiTenant nativo desde la primera línea de código de la Versión 1.0.

## Alternativas consideradas
- *Single-Tenant:* Construir solo para un cliente a la vez. Rechazado por limitar el modelo de negocio y fragmentar la operación.
- *Base de datos separada por cliente:* Rechazado, demasiado costoso operativamente para miles de guarderías.

## Ventajas
- Permite comercializar y desplegar TutorIA a instituciones privadas, gubernamentales o estatales compartiendo el mismo "motor" y abaratando costos de infraestructura (SaaS).
- El KOS (Knowledge Operating System) se retroalimenta globalmente, pero aísla herméticamente los datos poblacionales.

## Riesgos
- Un bug en las reglas de seguridad (Security Rules) podría cruzar datos entre dos instituciones (riesgo altísimo).

## Consecuencias
- Absolutamente toda consulta a la base de datos funcional debe llevar el `TenantID` en su filtro o en su ruta (Path).
