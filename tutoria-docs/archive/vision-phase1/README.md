# Architecture Board

## ¿Qué es el Architecture Board?
Esta carpeta (`tutoria-docs/vision/`) contiene la brújula estratégica y la visión a largo plazo (10 años) del producto TutorIA. Documenta las ideas audaces, los paradigmas cognitivos y las aspiraciones operativas que guiarán la evolución de la plataforma, más allá de la implementación inmediata.

## ¿Qué documentos contiene?
El Board se compone de documentos conceptuales sobre:
- Visión del producto y capacidades institucionales.
- Arquitectura cognitiva e hilos de pensamiento de la IA (Personas, Decision Engine).
- Contratos éticos y reglas de uso de IA (Human-in-the-loop, AI Contract).
- Aspiraciones tecnológicas (Knowledge Graph, Feedback Learning).
- Roadmap futuro (Horizontes de madurez).

## Diferencia entre `architecture/` y `vision/`
- **`architecture/`**: Contiene el diseño técnico **actual y aprobado** (Domain Model, Event Bus, Observability). Son reglas obligatorias en el código de hoy.
- **`vision/`**: Contiene **hipótesis futuras** y aspiraciones. Los conceptos aquí plasmados no están listos para codificarse inmediatamente ni comprometen la tecnología que se usará en el Sprint actual.

## ¿Qué NO es esta carpeta?
- **NO sustituye a los ADRs.** Una idea aquí no es una decisión técnica.
- **NO aprueba automáticamente su desarrollo.** Que exista aquí no significa que se incluirá en el MVP.

## Proceso de Adopción (De Visión a Realidad)
Para que un concepto del Board se convierta en software, debe seguir este flujo:
`Idea de visión` → `análisis de viabilidad técnica/legal` → `validación de usuario` → `ADR (Architecture Decision Record)` → `roadmap aprobado` → `diseño técnico (en architecture/)` → `implementación (código)`.

## Revisiones y Versionado
- Este directorio se versiona igual que el resto del repositorio, pero se espera que tenga una baja tasa de cambio técnico y alta tasa de adición conceptual.
- Cualquier adición debe ser revisada por el comité de Arquitectura o Product Owners.
