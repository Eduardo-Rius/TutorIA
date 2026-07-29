# Tactical Domain Design: Operational Intelligence

**Status:** PENDING REVIEW
**Wave:** WAVE 8D

Este documento rige la conceptualización técnica y arquitectónica de la **Capa 4: Operational Intelligence** dentro del ecosistema TutorIA.

---

## 1. ¿Qué es Operational Intelligence?
Operational Intelligence **no es un módulo de métricas**, es el sistema de **gobernanza institucional** sobre la Inteligencia Artificial. Su misión es orquestar decisiones humanas, asignar responsabilidades, auditar interacciones y garantizar el aprendizaje institucional continuo.
- **Gobernanza de la IA:** Rige cómo las hipótesis generadas (Capa 3) interactúan con la operación real, exigiendo revisión humana donde el dominio lo indique.
- **Trazabilidad Absoluta:** Toda decisión sobre una sugerencia algorítmica queda registrada inmutablemente.

---

## 2. Tactical Design (Value Objects y Entidades)

### A. GovernancePolicy
El corazón de la inteligencia operativa. Define las reglas de gobernanza sobre la IA. 
Ejemplos de políticas:
- *Todas las hipótesis con ConfidenceScore "Low" o "VeryLow" requieren revisión humana obligatoria.*
- *Capacidades críticas ("GenerateActivities") exigen doble aprobación.*

### B. HypothesisStateMachine
La máquina de estados del dominio. No es un simple enumerador, sino el guardián de las transiciones del ciclo de vida de una hipótesis.
- **Estados**: `Generated`, `Reviewed`, `Accepted`, `Rejected`, `Edited`, `Superseded`.
- **Comportamientos**:
  - `canTransition(toState): boolean`
  - `transition(toState): void` (Asegura invariantes: no se puede pasar de `Rejected` a `Generated`, por ejemplo).

### C. HumanDecision y ReviewReason
- **`HumanDecision`**: Representa la postura pura del actor humano (Aceptar, Rechazar, Editar). Una decisión puede existir de forma aislada (ej. `Accepted` sin más contexto).
- **`ReviewReason`**: Value Object tipificado exigido cuando una decisión lo amerita (ej. `Rejected`). Categorías:
  - `Pedagogical`, `Safety`, `Tone`, `Complexity`, `Institutional`, `Other`.

### D. ReviewOutcome
Value Object rico que agrupa la totalidad de la evaluación de una hipótesis.
```typescript
interface ReviewOutcome {
  readonly decision: HumanDecision;
  readonly reason?: ReviewReason;
  readonly comments?: string;
  readonly editedContent?: string;
  readonly confidenceAdjustment?: number;
}
```

### E. HypothesisReview (Aggregate Root)
Es el registro oficial e inmutable de la interacción humana con una `GenerativeHypothesis`.
```typescript
interface HypothesisReview {
  readonly id: string;
  readonly hypothesisId: string;
  readonly reviewerId: string;
  readonly outcome: ReviewOutcome;
  readonly reviewDate: Date;
}
```

### F. OperationalObservation y LearningInsight
- **`OperationalObservation`**: El hecho registrado por el dominio. Representa puramente "Lo que ocurrió" (ej. Hipótesis X fue rechazada por Tono).
- **`LearningInsight`**: Una conclusión destilada a partir de múltiples observaciones (ej. "El modelo frecuentemente asume un tono informal en las observaciones de matemáticas"). El `LearningInsight` retroalimenta la arquitectura institucional.

---

## 3. Application Layer y Eventos de Dominio

### FeedbackProcessor (Application Service)
Servicio responsable de orquestar la revisión. Recibe la evaluación del actor humano, actualiza la `HypothesisStateMachine`, persiste la `HypothesisReview` y, de manera crítica, **emite eventos de dominio**.

### Domain Events
Operational Intelligence nutre al resto de TutorIA mediante la emisión asíncrona de eventos:
- `HypothesisAccepted`
- `HypothesisRejected`
- `HypothesisEdited`
- `HypothesisSuperseded`

Estos eventos permitirán que otros módulos reaccionen y detonen la analítica que dará origen a los `LearningInsight`.

---

## 4. El Flujo de Inteligencia Operacional
La inteligencia operativa y la gobernanza humana cierran el ciclo arquitectónico a través de esta secuencia rigurosa:

```text
GenerativeHypothesis
         ↓
HumanDecision (Actor Humano)
         ↓
FeedbackProcessor (Application Service)
         ↓
(Emite Eventos: HypothesisAccepted, HypothesisRejected...)
         ↓
HypothesisReview (Aggregate)
         ↓
OperationalObservation (El Hecho)
         ↓
LearningInsight (La Conclusión)
         ↓
Future Improvements (Policy/Context/Prompts)
```
