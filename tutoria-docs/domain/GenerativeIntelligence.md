# Tactical Domain Design: Generative Intelligence

**Status:** PENDING REVIEW
**Wave:** WAVE 8C

Este documento rige la conceptualización técnica y arquitectónica de la **Capa 3: Generative Intelligence** dentro del ecosistema TutorIA.

---

## 1. ¿Qué es Generative Intelligence?
Generative Intelligence es el motor de razonamiento e ideación de TutorIA. Su única responsabilidad es **consumir las reglas** (Policy Intelligence) y **el contexto** (Context Intelligence) para construir hipótesis fundamentadas que asistan al usuario.
- **Consumidor, no Gobernante:** La IA no crea verdades, genera hipótesis. La verdad institucional le pertenece siempre al humano y al Dominio central.
- **IA Asistencial:** Opera bajo el principio estricto de sugerir, proponer y enriquecer, dejando la decisión final ("Human in the loop") fuera de su alcance autónomo.

## 2. Lo que NO es Generative Intelligence
- **NO es Prompt Engineering:** Los prompts son un detalle técnico de infraestructura; el dominio modela capacidades pedagógicas.
- **NO evalúa validez:** Si una hipótesis incumple normativas, es Policy Intelligence (Capa 1) quien la rechaza.
- **NO recolecta datos:** Si le falta información, declara dependencias mediante Context Intelligence (Capa 2).
- **NO incluye librerías de IA:** No contiene referencias a LLMs concretos o parámetros de modelos.

---

## 3. Tactical Design (Value Objects y Entidades)

### A. GenerativeCapability
El punto de entrada del dominio. Modela intenciones pedagógicas específicas.
Ejemplos: `GenerateActivities`, `GenerateObservations`, `ImproveWriting`, `SummarizePlanning`, `ReviewPlanning`, `GenerateRubric`.

### B. GenerativeConstraint
Define las restricciones de generación aplicables a la capacidad, independientes de las reglas institucionales.
Ejemplos: *Longitud máxima, Idioma, Formato requerido, Tono institucional, Estructura pedagógica.*

### C. ConfidenceScore
Value Object inmutable que categoriza el nivel de certeza de una inferencia o evidencia.
- **Niveles semánticos**: `VeryLow`, `Low`, `Medium`, `High`, `VeryHigh`.
- **Comportamientos del Dominio**:
  - `isReliable(): boolean`
  - `isLowConfidence(): boolean`
  - `requiresHumanReview(): boolean`

### D. HypothesisEvidence
Value Object que documenta de dónde extrajo la IA sus conclusiones para fomentar la trazabilidad.
```typescript
interface HypothesisEvidence {
  readonly sourceType: string; // ej. InstitutionalPolicy, PreviousPlanning, StudentHistory
  readonly sourceId: string;
  readonly relevance: number;
  readonly confidence: ConfidenceScore;
}
```

### E. InferenceProfile
Desacopla al dominio de los parámetros crudos.
Perfiles del dominio: `Creative`, `Balanced`, `Strict`, `Review`, `Summary`, `Pedagogical`.

### F. InferenceRequest e InferenceResult
- **`InferenceRequest`**: El contrato que el Application Service envía al proveedor. Contiene los conceptos de negocio puros: `capability`, `profile`, `expectedOutput`, `constraints`. (No conoce parámetros como *temperatura*, *tokens*, *top_p* o *seed*).
- **`InferenceResult`**: La respuesta asíncrona estructurada que entrega el proveedor, lista para ensamblarse.

### G. HypothesisMetadata
Value Object fuertemente tipado que aloja la metadata sin caer en bolsas genéricas abiertas.
```typescript
interface HypothesisMetadata {
  readonly executionTimeMs: number;
  readonly schemaVersion: string;
}
```

### H. GenerativeHypothesis
El Aggregate Root de esta capa. Representa una propuesta completa, inmutable y documentada.
```typescript
interface GenerativeHypothesis {
  readonly id: string;
  readonly capability: GenerativeCapability;
  readonly createdAt: Date;
  readonly hypothesis: string; // La propuesta central
  readonly confidence: ConfidenceScore;
  readonly limitations: string[]; // ¿Por qué podría estar incompleta?
  readonly assumptions: string[]; // ¿Qué supuso la IA?
  readonly alternatives: string[]; // Opciones para Degradación Elegante
  readonly citations: HypothesisEvidence[]; // Trazabilidad al contexto (fuentes estructuradas)
  readonly warnings: string[]; // Contexto incompleto, contradicciones, baja confianza
  readonly metadata: HypothesisMetadata; // Tipado fuerte
}
```

---

## 4. Application Layer y Puertos

### PromptComposer (Application Service)
Servicio de aplicación responsable de orquestar la fusión del `ContextSnapshot` (obtenido de WAVE 8B) y los lineamientos de política, traduciéndolos a un `InferenceRequest`. Su artefacto interno de composición no pertenece al modelo de Dominio.

### InferenceProvider
Puerto responsable estrictamente de: *"Resolver una solicitud de inferencia"*. 

### El Flujo de Resolución Generativa
El flujo opera puramente bajo la siguiente secuencia:

```text
GenerativeCapability
         ↓
ContextSnapshot
         ↓
PromptComposer (Application)
         ↓
InferenceRequest
         ↓
InferenceProvider
         ↓
InferenceResult
         ↓
GenerativeHypothesis
```

---

## 5. Conceptos Futuros (ADR en Radar)
Se reserva el concepto arquitectónico de **`InferencePipeline`** (WAVE 11/12), un orquestador superior capaz de encadenar todo el flujo: *Capability -> Policy -> Context -> Composition -> Inference -> Hypothesis -> Review*.
