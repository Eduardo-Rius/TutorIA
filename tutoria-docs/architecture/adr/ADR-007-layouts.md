# ADR-007: Application Layout System

**Estado:** Aprobado  
**Contexto:** Cada rol de TutorIA (Docente, Directora) necesita navegar el sistema de forma similar.  
**Decisión:** Los Layouts (AppShell, Sidebar, TopBar) serán 100% agnósticos a roles, enrutadores y estado. La variabilidad por perfil se inyectará mediante composición.  
**Consecuencias:** Solo existirá un Layout raíz mantenible transversalmente.
