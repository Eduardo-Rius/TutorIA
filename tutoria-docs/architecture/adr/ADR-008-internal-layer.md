# ADR-008: Internal Components Layer

**Estado:** Aprobado  
**Contexto:** El Design System tiene componentes que se reutilizan internamente (como `Spinner`) pero que no deberían publicarse a los desarrolladores de la aplicación para no ensuciar el API.  
**Decisión:** Se oficializa el directorio `src/components/internal/` donde residirán estas piezas. Los Layouts y Primitivas pueden depender de `internal/`, pero nunca al revés.  
**Consecuencias:** Mantenimiento simplificado y un contrato público del Design System rigurosamente blindado.
