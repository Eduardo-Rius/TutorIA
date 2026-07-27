# ADR-005: Primitives

**Estado:** Aprobado  
**Contexto:** Los elementos atómicos (Button, Text, Icon, Badge) varían a través de la interfaz pero deben seguir un contrato estricto visual.  
**Decisión:** Crear primitivas que consuman directamente las *Foundations* y los tokens sin lógica funcional. Se descartan colores no aprobados como *danger/error* en primera instancia.  
**Consecuencias:** UI altamente predecible y estandarizada.
