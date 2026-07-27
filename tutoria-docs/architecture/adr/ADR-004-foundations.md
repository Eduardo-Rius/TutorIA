# ADR-004: Foundations

**Estado:** Aprobado  
**Contexto:** Los contenedores estructurales repetitivos provocan deuda de maquetación (Stack, Inline, Surface).  
**Decisión:** Aislar estas estructuras en componentes genéricos presentacionales polimórficos (`as="div"`), libres de lógica.  
**Consecuencias:** Construcción acelerada de interfaces mediante legos estructurales comprobados.
