# Tactical Domain Design: Context Intelligence

**Status:** PENDING REVIEW
**Wave:** WAVE 8B

Este documento rige la conceptualización técnica y arquitectónica de la **Capa 2: Context Intelligence** dentro del ecosistema TutorIA.

---

## 1. ¿Qué es Context Intelligence?
Context Intelligence es el motor de consciencia situacional e institucional de TutorIA. Su propósito es recuperar, estructurar y ensamblar la información periférica necesaria para que cualquier capacidad del sistema opere anclada a la realidad.
- **Ensamblador de Realidades:** Consolida la normativa, el historial y las directrices de la institución en un solo universo contextual estructurado.
- **Agnóstico:** Su única misión es proveer el contexto requerido; ignora por completo cómo ese contexto será consumido posteriormente.

## 2. Lo que NO es Context Intelligence
- **NO evalúa reglas:** Provee la información, pero la evaluación de violaciones normativas pertenece a la capa de *Policy Intelligence* (Capa 1).
- **NO pertenece a la infraestructura:** No conoce absolutamente nada de bases de datos, mecanismos de persistencia ni tecnologías de búsqueda. Todo mecanismo de obtención de datos recae estrictamente fuera del dominio.

---

## 3. Tactical Design (Value Objects y Entidades)

### A. ContextCapability
Desacopla la intención de la obtención del contexto. Cada capacidad declara qué contexto necesita en lugar de instruir cómo buscarlo. Ejemplos: `ReviewPlanningCapability`, `SafetyAssessmentCapability`.

### B. ContextRequirement
Declara los ejes de contexto específicos que requiere una `ContextCapability`.
Ejemplos:
- `Need: Normative Context`
- `Need: Planning History`

### C. ContextFragment
La unidad universal de contexto. Protege la procedencia y relevancia de cualquier pieza de información recolectada.
```typescript
interface ContextFragment {
  id: string;
  type: string;
  source: string;
  content: string;
  relevance: number;
  validFrom?: Date;
  validUntil?: Date;
  metadata: Record<string, unknown>;
}
```

### D. ContextScore
Value Object que evalúa la calidad del contexto recuperado cuando confluyen varias fuentes. Contiene métricas de:
- `Coverage`
- `Freshness`
- `Authority`
- `Relevance`

### E. ContextSnapshot
El ensamblador final del universo contextual. Se modela como un patrón agregado dinámico y extensible. No agrupa propiedades fijas preconcebidas, sino los componentes exactos que haya resuelto el ensamblador para la capacidad solicitada, entregando una visión completa de la realidad en un instante preciso.

---

## 4. Puertos y Flujo Arquitectónico

### ContextProvider
Puerto responsable de resolver un conjunto de `ContextRequirement` y devolver un `ContextSnapshot` consistente para una `ContextCapability`.

### ContextAssembler
El ensamblador responsable de consolidar múltiples fuentes en un único `ContextSnapshot`.

### El Flujo de Resolución de Contexto
El flujo del dominio para la Capa 2 opera estrictamente bajo la siguiente secuencia:

```text
ContextCapability
      ↓
ContextRequirement
      ↓
ContextProvider
      ↓
ContextAssembler
      ↓
ContextSnapshot
```

El flujo del dominio para la inteligencia de contexto termina ahí. El consumo de este `ContextSnapshot` por capas subsecuentes no es responsabilidad de WAVE 8B.
