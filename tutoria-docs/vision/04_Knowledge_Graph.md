# TutorIA — Knowledge Graph

*(Nota: Esta es una visión arquitectónica futura y no constituye una decisión de implementar una base de grafos (como Neo4j) durante el MVP ni en fases tempranas).*

## Propósito
Describir la ontología de cómo las piezas de conocimiento interactúan, trascienden la simple búsqueda semántica vectorial, y conforman un tejido lógico institucional.

## Nodos Conceptuales (Entidades del Grafo)
- `Law` (Ley Federal o Estatal).
- `Regulation` (Reglamento de Ley).
- `Norm` (Norma Oficial, ej. NOM).
- `Procedure` (Procedimiento estandarizado).
- `Guideline` (Lineamiento técnico).
- `Circular` (Aviso temporal).
- `OfficialFormat` (Plantilla de registro).
- `Process` (Flujo operativo).
- `Activity` (Paso dentro de un proceso).
- `Role` (Puesto de trabajo).
- `Evidence` (Documento probatorio resultante).
- `EducationalLevel` (Nivel escolar).
- `AgeGroup` (Rango etario).
- `PedagogicalPractice` (Práctica sugerida).
- `DevelopmentProcess` (Hito de desarrollo).
- `Institution` / `Center` (Organización territorial).
- `DocumentVersion` (Un snapshot inmutable en el tiempo).

## Relaciones Conceptuales (Aristas)
- `governs`: Una norma gobierna un proceso.
- `supersedes`: La versión 2026 reemplaza a la versión 2024.
- `references`: Un manual cita a una ley.
- `requires`: Un proceso exige un rol o un formato oficial.
- `appliesTo`: Una circular aplica a una Zona específica o a un Rango Etario.
- `executedBy`: El procedimiento es ejecutado por la Educadora.
- `generates`: La actividad genera una evidencia.
- `evidencedBy`: El cumplimiento normativo se prueba mediante el formato.
- `validates`: El directivo valida la actividad.
- `conflictsWith`: Dos documentos vigentes estipulan reglas mutuamente excluyentes (Detección crítica).
- `complements`: Un anexo complementa al manual base.
- `restrictedTo`: Visible solo para un Tenant.
- `effectiveDuring`: Periodo de validez temporal.
- `derivedFrom`: Un chunk vectorial derivado de un DocumentVersion.

## Casos de Uso del Grafo de Conocimiento
- **Análisis de impacto normativo:** "Si derogo este Artículo, ¿cuántos procesos operativos, manuales y perfiles de puesto en la plataforma se rompen?"
- **Detección de contradicciones:** La IA cruza las aristas de un nuevo documento contra la base existente y encuentra que la nueva regla exige 5 niños por adulto, mientras la base histórica exigía 8.
- **Localización de formatos requeridos:** La IA sabe que si recomienda "Salir al patio", la arista `requires` indica que se debe llenar la bitácora de exteriores.
- **Explicación normativa:** Trazabilidad semántica visual de "por qué aplica esta regla" a este centro en particular.
- **Navegación ontológica:** Permitir al usuario saltar de un lineamiento al proceso, del proceso al formato, y del formato al rol responsable.
