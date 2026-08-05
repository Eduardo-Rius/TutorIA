# PER-2 PEDAGOGICAL DECISION & RECOMMENDATION POLICY
## FINAL HARDENED ARCHITECTURAL IMPLEMENTATION PLAN

### 1. Decisión Arquitectónica y Responsabilidad Exacta
**Decisión:** Crear el módulo `src/domain/pedagogy/decision/` como motor de política guardián antes de la IA generativa.
**Responsabilidad:** PER-2 consumirá el `PedagogicalContextResolution` de PER-1.1 como límite superior inviolable. No inventará suficiencia de contexto, sino que aplicará jerarquía de acciones, derivaciones específicas (ej. `strategy`), políticas institucionales y restricciones operativas evaluando exclusivamente frente a una acción específica solicitada.

---

### 2. Contratos Propuestos (src/domain/pedagogy/decision/Contracts.ts)

```typescript
// 1. Universo Total Canónico de Acciones
export const ALL_PEDAGOGICAL_ACTIONS = [
  'guidance',
  'strategy',
  'draft_recommendation',
  'approval_submission'
] as const;

export type PedagogicalAction = typeof ALL_PEDAGOGICAL_ACTIONS[number];
export type RequestedPedagogicalAction = PedagogicalAction;

// 2. Estado de la Decisión Relativa
export type DecisionStatus =
  | 'blocked'                // Acción solicitada prohibida (límite PER-1.1, restricción o conflicto crítico).
  | 'clarification_required' // Acción solicitada bloqueada por faltantes reportados por PER-1.1, pero subsanable.
  | 'ready';                 // Acción solicitada permitida explícitamente.

// 3. Taxonomía Cerrada de Bloqueos, Reglas y Diagnósticos
export type DecisionRuleCode =
  | 'PER1_CAPABILITY_BOUNDARY'
  | 'ACTION_HIERARCHY_ENFORCED'
  | 'REQUESTED_ACTION_ALLOWED'
  | 'REQUESTED_ACTION_REQUIRES_CLARIFICATION'
  | 'REQUESTED_ACTION_BLOCKED'
  | 'ROLE_POLICY_NOT_YET_ENFORCED'
  | 'STRATEGY_CAPABILITY_DERIVED';

export type DecisionBlockReason =
  | 'CONTEXT_BLOCKED'
  | 'PER1_CAPABILITY_DENIED'
  | 'CRITICAL_INSTITUTIONAL_CONFLICT'
  | 'MISSING_REQUIRED_CONTEXT'
  | 'ACTION_HIERARCHY_NOT_SATISFIED'
  | 'INSTITUTIONAL_RESTRICTION'
  | 'ROLE_RESTRICTION';

export type DecisionDiagnosticCode =
  | 'INVALID_EVALUATED_AT';

export interface DecisionDiagnostic {
  readonly code: DecisionDiagnosticCode;
  readonly severity: 'warning' | 'error';
  readonly field: 'evaluatedAt';
  readonly receivedValue: string;
  readonly message: string;
}

// 4. Restricciones y Evidencia
export interface PedagogicalRestriction {
  readonly restrictionType: 'institutional_framework' | 'policy' | 'role_limit';
  readonly ruleCode: DecisionRuleCode;
  readonly description: string;
  readonly sourceIds: readonly string[];
}

export interface DecisionEvidence {
  readonly ruleCode: DecisionRuleCode;
  readonly requirementMet: string;
  readonly contextFieldsUsed: readonly (keyof PedagogicalContext)[];
  readonly sourceReferences: readonly string[];
  readonly reasoning: string;
}

// 5. Confianza y Aclaraciones Estructuradas
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';
export interface DecisionConfidence {
  readonly level: ConfidenceLevel;
  readonly determiningFactors: readonly string[];
}

export interface ClarificationRequest {
  readonly missingField: keyof PedagogicalContext;
  readonly pedagogicalReason: string;
  readonly severity: 'critical' | 'high' | 'low';
  readonly suggestedQuestion: string;
  readonly optionsSource?: 'institutional_catalog' | 'group_catalog' | 'policy_catalog';
  readonly impactOfSkipping: string;
  readonly unlocksCapability: PedagogicalAction;
}

// 6. Snapshot de PER-1.1
export interface ContextCapabilitySnapshot {
  readonly completeness: ContextCompleteness;
  readonly canProvideGuidance: boolean;
  readonly canGenerateDraft: boolean;
  readonly canSubmitForApproval: boolean;
}

// 7. Input y Output
export interface PedagogicalDecisionInput {
  readonly contextResolution: PedagogicalContextResolution;
  readonly requestedAction: RequestedPedagogicalAction;
  readonly evaluatedAt: string;
}

export interface PedagogicalDecisionResolution {
  readonly requestedAction: RequestedPedagogicalAction;
  readonly status: DecisionStatus;
  readonly blockReason?: DecisionBlockReason;

  // Partición Completa y Canónica
  readonly allowedActions: readonly PedagogicalAction[];
  readonly blockedActions: readonly PedagogicalAction[];

  readonly restrictions: readonly PedagogicalRestriction[];
  readonly clarificationRequests: readonly ClarificationRequest[];
  readonly confidence: DecisionConfidence;
  readonly evidence: readonly DecisionEvidence[];

  // Diagnósticos de la Decisión
  readonly diagnostics: readonly DecisionDiagnostic[];

  // Preservación Íntegra de PER-1.1
  readonly contextCapabilities: ContextCapabilitySnapshot;
  readonly contextWarnings: readonly PedagogicalWarning[];
  readonly contextMissingRequirements: readonly MissingContextRequirement[];
  readonly evaluatedAt: string;
}
```

---

### 3. Derivación de `strategy`

Como PER-1.1 no expone `canProvideStrategy`, PER-2 derivará esta capacidad bajo la siguiente política obligatoria. Esta derivación se reflejará con evidencia y código `STRATEGY_CAPABILITY_DERIVED`.

`strategy` sólo se permite si:
- `canProvideGuidance === true`
- Existe `pedagogicalIntent` (no es `undefined`)
- Existen `groupId` y `ageRange` (no son `undefined`)
- No hay bloqueo crítico (`completeness !== 'blocked'`)
- La jerarquía de acciones y `requestedAction` lo permiten.

---

### 4. Algoritmo Fail-Fast (Orden Exacto de Evaluación)

El resolver operará en estricto cumplimiento de este flujo:
1. Validar input y `evaluatedAt`. Si es inválido, emitir diagnóstico `INVALID_EVALUATED_AT`. No mutar el valor, no usar `Date.now()`.
2. Preservar *snapshot* de capacidades, `warnings` y `missingRequirements` de PER-1.1 intactos.
3. Evaluar bloqueo crítico inicial (`completeness === 'blocked'`). Si es verdadero, todo se bloquea (`CONTEXT_BLOCKED`).
4. Construir límite máximo de acciones a partir de: `canProvideGuidance`, `canGenerateDraft`, `canSubmitForApproval`.
5. Derivar la capacidad de `strategy` mediante su política explícita.
6. Aplicar jerarquía de acciones (`approval_submission` $\implies$ `draft_recommendation` $\implies$ `strategy` $\implies$ `guidance`).
7. Construir la partición completa `allowedActions` / `blockedActions`.
8. Evaluar exclusivamente el estado para `requestedAction` frente a `allowedActions`.
9. Determinar el `status` final:
   - `ready`: si `requestedAction` está en `allowedActions`.
   - `clarification_required`: si no está permitido, pero el impedimento está ligado directamente a campos en `missingRequirements` de PER-1.1.
   - `blocked`: si la acción choca con límites máximos de PER-1.1 (`PER1_CAPABILITY_DENIED`), bloqueos institucionales/roles, o ausencia de prerrequisitos jerárquicos irremediables por simple aclaración.
10. Generar aclaraciones **únicamente** desde `missingRequirements` originales.
11. Calcular confianza determinista (Nivel + Factores).
12. Congelar profundamente (Deep Freeze) el resultado, incluyendo `diagnostics`.
13. Verificar invariantes internas antes de retornar la salida.

---

### 5. Política del Canal Diagnóstico de Decisión (Timestamps)
- `contextWarnings` contiene **exclusivamente** las advertencias recibidas intactas desde PER-1.1. PER-2 nunca inserta advertencias ahí para no falsificar la procedencia.
- `diagnostics` contiene las validaciones generadas por PER-2 (como problemas con `evaluatedAt`).
- El valor original `evaluatedAt` es preservado literalmente.
- Si `evaluatedAt` es inválido, emite `INVALID_EVALUATED_AT`.
- Está prohibido usar `Date.now()`, `new Date()` fallback, epoch substitution o la hora del sistema.
- El diagnóstico de PER-2 por sí solo no inventa restricciones ni solicitudes de aclaración. La validez o invalidez del *timestamp* no altera silenciosamente reglas de autoridad ni la determinación de la `requestedAction` (al menos que futuras políticas explícitas lo definan).

---

### 6. Invariantes Obligatorias Extendidas

1. `allowedActions ∩ blockedActions = ∅`
2. `allowedActions ∪ blockedActions = ALL_PEDAGOGICAL_ACTIONS`
3. El orden de ambas colecciones debe respetar el orden canónico estipulado en `ALL_PEDAGOGICAL_ACTIONS`.
4. El dictamen final de `status` siempre y únicamente responde a `requestedAction`.
5. `contextWarnings` === el *snapshot* inmutable de advertencias de PER-1.1.
6. Los diagnósticos de PER-2 (`diagnostics`) nunca contaminan `contextWarnings`.
7. `evaluatedAt` inválido implica exactamente 1 diagnóstico `INVALID_EVALUATED_AT`.
8. `evaluatedAt` válido implica exactamente 0 diagnósticos `INVALID_EVALUATED_AT`.
9. El *string* `evaluatedAt` original siempre se preserva literalmente en la salida.
10. La colección `diagnostics` siempre es retornada con *deep freeze* y un orden determinista.

---

### 7. Estrategia de Pruebas (Escenarios Exigidos y Extendidos)

Implementación mínima de Vitest (40+ test cases), abarcando explícitamente:
- Cada una de las cuatro acciones como `requestedAction`.
- Escenario donde una acción inferior está permitida mientras la superior está bloqueada.
- `requestedAction = strategy` evaluado cuando `canProvideGuidance === true` pero faltan `groupId` y `ageRange`.
- `requestedAction = draft_recommendation` cuando PER-1.1 niega `canGenerateDraft`.
- `requestedAction = approval_submission` cuando `draft` está permitido pero `submission` no.
- Una acción no permitida que NO debe producir aclaración porque es una restricción/límite duro de PER-1.1.
- Una acción no permitida que SÍ produce aclaración porque los campos faltantes están en `missingRequirements`.
- Aserción algorítmica de la partición completa sin duplicados (Invariantes 1 y 2).
- Verificación del orden canónico absoluto en arreglos de salida.
- Inmutabilidad de referencias; `warnings` y `missingRequirements` idénticos bit a bit.
- Comprobación de determinismo: dos inputs con los fragmentos/warnings en orden distinto generan salida serializable idéntica.
- Congelación profunda (Deep Freeze) probada en todas las colecciones.
- Confirmación de cero ampliación de capacidades respecto al límite de PER-1.1.
- Restricciones de rol pasivas (*pass-through* preparatorio).

**Pruebas Adicionales Expresadas para Diagnóstico:**
- `evaluatedAt` ISO-8601 válido produce cero diagnósticos de error.
- `evaluatedAt` inválido (ej. "n/a", fechas corruptas) produce exactamente un diagnóstico `INVALID_EVALUATED_AT`.
- El *string* original defectuoso es devuelto exactamente como entró.
- Aserción de que `contextWarnings` es bit a bit idéntico a las advertencias emitidas por PER-1.1, sin mezclas de PER-2.
- Aserción de que ninguna rutina interna invoca la fecha u hora del sistema bajo la condición de error.
- Ejecuciones repetidas idénticas no alteran ningún factor del resultado ni el diagnóstico (determinismo total).
- Las colecciones `diagnostics` se congelan profundamente contra modificaciones de referencias (`Object.isFrozen`).
- Aserción de que el `evaluatedAt` corrupto no inserta un `PedagogicalRestriction` inventado o genera un requerimiento irreal en las aclaraciones.

---
**STATUS: READY FOR PER-2 IMPLEMENTATION AUTHORIZATION**
