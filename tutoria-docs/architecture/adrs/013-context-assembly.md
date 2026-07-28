# ADR 013: Context Assembly Pattern

**Status:** ACCEPTED
**Date:** 2026-07-28

## Contexto
Durante WAVE 8B, fue necesario definir cómo agrupar información periférica de múltiples orígenes sin acoplar rígidamente las clases del dominio a dichas fuentes, ni perder seguridad de tipos exponiendo colecciones puramente genéricas (`Record<string, unknown>`).

## Decisión
Se implementa el patrón **Context Assembler** con `ContextComponent<T>`. Un `ContextAssembler` es un servicio puro de dominio responsable de consolidar múltiples fuentes dispares (componentes resueltos y fragmentos) en un único `ContextSnapshot`.
- El Snapshot protege la inmutabilidad de sus componentes y fragmentos.
- `ContextProvider` coordina en la capa de Aplicación la obtención asíncrona de los componentes, y solo inyecta el resultado al `ContextAssembler`.

## Consecuencias
**Positivas:**
- Extensibilidad absoluta apoyada por un fuerte tipado. Los componentes tienen identidad y tipo (`type`), sin acoplar el Snapshot a casos de uso específicos.
- Fronteras limpias entre Domain (reglas de ensamblaje) y Application (coordinación y llamadas a infraestructura).
