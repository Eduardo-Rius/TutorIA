# ADR-006: Forms Foundation

**Estado:** Aprobado  
**Contexto:** La captura de datos requiere estados (error, hint, loading) con consistencia de ARIA.  
**Decisión:** Construir los componentes de formulario separados de la validación. El estado de error (`FieldError` e `invalid`) será estructural y tipográfico antes que cromático para preservar el candado de Semantic Tokens.  
**Consecuencias:** Desacoplamiento total entre UI de formularios y gestores de estado complejos (React Hook Form/Formik).
