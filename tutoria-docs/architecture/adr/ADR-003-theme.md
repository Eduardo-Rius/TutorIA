# ADR-003: Theme Tokens

**Estado:** Aprobado  
**Contexto:** Tailwind utiliza colores mágicos (`bg-red-500`), lo que genera inconsistencia y deuda técnica si los estilos cambian.  
**Decisión:** Centralizar todas las escalas visuales en TypeScript como *Single Source of Truth* y conectarlo al motor de configuración (`tailwind.config.ts`). Ningún hexadecimal puede existir fuera de este ecosistema.  
**Consecuencias:** Todo desarrollador debe utilizar el tipado y escalas cerradas aprobadas.
