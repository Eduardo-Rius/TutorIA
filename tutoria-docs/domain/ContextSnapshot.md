# Domain Design: ContextSnapshot

**Status:** ACTIVE

## ¿Qué es?
`ContextSnapshot` es el ensamblador universal del contexto en TutorIA. Representa una visión unificada, inmutable y evaluada de la realidad institucional en el momento exacto en que una Capacidad del sistema (`ContextCapability`) lo solicita.

## Propiedades Clave
- **Dinámico y Tipado:** En lugar de `Record<string, unknown>`, agrupa un array inmutable de `ContextComponent<T>`. Esto evita propiedades rígidas como "planningSnapshot" pero garantiza seguridad de tipos y contratos (con `.hasComponent(type)` y `.getComponent<T>(type)`).
- **Evaluado:** Cuenta con un `ContextScore` que define qué tan robusto (coverage), reciente (freshness), y preciso (relevance) es el contexto recuperado.
- **Trazable:** Conserva todos los `ContextFragment` de origen (incluyendo de dónde se obtuvieron) para propósitos de auditoría institucional.
