# PER-3 PEDAGOGICAL REASONING & GENERATION PLAN
## ARCHITECTURAL DISCOVERY AND IMPLEMENTATION PLAN

### 1. Architectural Decision and Exact Responsibility
PER-3 is the deterministic reasoning engine bridging pedagogical authorization (PER-2) with the generative phase. Its responsibility is to transform a valid `PedagogicalDecisionResolution` and `PedagogicalContextResolution` into an immutable `PedagogicalGenerationPlanResolution`.
PER-3 DOES NOT generate text, DOES NOT invoke LLMs, and DOES NOT fetch external knowledge. It strictly builds a verifiable structured plan.

### 2. Input Availability Audit
Based on PER-2 sealed contracts (`tutoria-app/src/domain/pedagogy/decision/Contracts.ts`):

Información necesaria por PER-3 | Disponible en PER-2 | Ruta exacta | Acción arquitectónica
--- | --- | --- | ---
requestedAction | Sí | `decisionResolution.requestedAction` | reutilizar
decision status | Sí | `decisionResolution.status` | reutilizar
pedagogicalIntent | No | N/A | requerir contexto
groupId | No | N/A | requerir contexto
ageRange | No | N/A | requerir contexto
planningPeriod | No | N/A | requerir contexto
observations | No | N/A | requerir contexto
institutionalFrameworkIds | No | N/A | requerir contexto
applicablePolicies | No | N/A | requerir contexto
evidence | Sí | `decisionResolution.evidence` | reutilizar
restrictions | Sí | `decisionResolution.restrictions` | reutilizar
warnings | Sí | `decisionResolution.contextWarnings` | preservar
diagnostics | Sí | `decisionResolution.diagnostics` | preservar separadamente

Input required is therefore:
```typescript
export interface PedagogicalGenerationPlanInput {
  readonly decisionResolution: PedagogicalDecisionResolution;
  readonly contextResolution: PedagogicalContextResolution;
  readonly plannedAt: string;
}
```

### 3. Canonical Action-to-Plan Mapping
- `guidance` → `guidance_plan`
- `strategy` → `strategy_plan`
- `draft_recommendation` → `draft_recommendation_plan`
- `approval_submission` → `approval_submission_plan`

### 4. Complete Proposed Contracts

```typescript
export type PedagogicalPlanType =
  | 'guidance_plan'
  | 'strategy_plan'
  | 'draft_recommendation_plan'
  | 'approval_submission_plan';

export type GenerationPlanStatus = 'not_created' | 'ready';

export type GenerationPlanNotCreatedReason =
  | 'DECISION_BLOCKED'
  | 'CLARIFICATION_REQUIRED'
  | 'INCONSISTENT_DECISION_INPUT';

export type GenerationRuleCode =
  | 'AUTHORIZATION_GATE_PASSED'
  | 'AUTHORIZATION_GATE_REJECTED'
  | 'REQUESTED_ACTION_PRESERVED'
  | 'CONTEXT_DECISION_CONSISTENCY_VERIFIED'
  | 'PLAN_TYPE_MAPPED'
  | 'OBJECTIVE_DERIVED'
  | 'REASONING_STEPS_SELECTED'
  | 'CONSTRAINT_CONVERTED'
  | 'KNOWLEDGE_REQUIREMENT_SELECTED'
  | 'OUTPUT_SCHEMA_DEFINED'
  | 'VALIDATION_CRITERIA_DEFINED'
  | 'TRACEABILITY_PRESERVED'
  | 'CANONICAL_ORDER_APPLIED'
  | 'TIMESTAMP_PRESERVED';

export type TargetAudienceCode = 'EDUCATOR' | 'STUDENT' | 'INSTITUTION' | 'PARENTS';
export type ExpectedOutcomeCode = 'IMMEDIATE_ACTION' | 'STRATEGIC_ALIGNMENT' | 'FORMAL_PLANNING' | 'EVALUATION_READY';

export interface PedagogicalGenerationObjective {
  readonly action: PedagogicalAction;
  readonly targetAudienceCode: TargetAudienceCode;
  readonly expectedOutcomeCode: ExpectedOutcomeCode;
  readonly derivedFromIntent: string;
}

export type PedagogicalReasoningStepCode =
  | 'ESTABLISH_OBJECTIVE'
  | 'IDENTIFY_AUDIENCE'
  | 'APPLY_PEDAGOGICAL_INTENT'
  | 'APPLY_INSTITUTIONAL_FRAMEWORK'
  | 'APPLY_DECISION_RESTRICTIONS'
  | 'SELECT_ALLOWED_KNOWLEDGE'
  | 'DEFINE_OUTPUT_STRUCTURE'
  | 'DEFINE_VALIDATION_CRITERIA';

export interface PedagogicalReasoningStep {
  readonly stepCode: PedagogicalReasoningStepCode;
  readonly sequence: number;
  readonly contextFieldsUsed: readonly (keyof PedagogicalContext)[];
  readonly decisionRuleCodesUsed: readonly DecisionRuleCode[];
  readonly sourceReferences: readonly string[];
}

export type GenerationConstraintType = 'must_include' | 'must_avoid' | 'must_align_with' | 'must_preserve' | 'must_not_infer';

export interface GenerationConstraint {
  readonly constraintType: GenerationConstraintType;
  readonly ruleCode: GenerationRuleCode;
  readonly sourceReferences: readonly string[];
}

export type KnowledgeRequirementType = 'institutional_framework' | 'applicable_policy' | 'age_range_guidance' | 'pedagogical_strategy' | 'planning_history' | 'educator_observation' | 'approved_template';

export interface KnowledgeRequirement {
  readonly requirementType: KnowledgeRequirementType;
  readonly required: boolean;
  readonly sourceIds: readonly string[];
  readonly selectionRuleCode: GenerationRuleCode;
}

export type OutputSectionCode = 'objective' | 'context_summary' | 'pedagogical_strategy' | 'recommended_activities' | 'materials' | 'adaptations' | 'evaluation_criteria' | 'institutional_alignment' | 'warnings';

export interface PlannedOutputSection {
  readonly sectionCode: OutputSectionCode;
  readonly required: boolean;
  readonly sequence: number;
}

export type GenerationValidationCode = 'OBJECTIVE_PRESERVED' | 'AGE_RANGE_RESPECTED' | 'GROUP_CONTEXT_RESPECTED' | 'INSTITUTIONAL_FRAMEWORK_RESPECTED' | 'APPLICABLE_POLICIES_RESPECTED' | 'NO_UNSUPPORTED_FACTS' | 'NO_UNAUTHORIZED_INFERENCE' | 'REQUIRED_SECTIONS_PRESENT' | 'FORBIDDEN_SECTIONS_ABSENT' | 'TRACEABILITY_PRESERVED' | 'REQUESTED_ACTION_PRESERVED';

export interface GenerationValidationCriterion {
  readonly validationCode: GenerationValidationCode;
  readonly severity: 'error' | 'warning';
  readonly contextFieldsUsed: readonly (keyof PedagogicalContext)[];
}

export interface GenerationPlanEvidence {
  readonly ruleCode: GenerationRuleCode;
  readonly contextFieldsUsed: readonly (keyof PedagogicalContext)[];
  readonly decisionEvidenceReferences: readonly string[];
}

export type GenerationDiagnosticMessageCode = 'INVALID_ISO_FORMAT' | 'UNEXPECTED_DECISION_STATUS' | 'ACTION_MISMATCH' | 'ACTION_FORBIDDEN' | 'CONTEXT_MISSING' | 'NO_EVIDENCE' | 'CAPABILITY_MISMATCH' | 'WARNING_MISMATCH';

export interface InvalidPlannedAtDiagnostic { readonly code: 'INVALID_PLANNED_AT'; readonly severity: 'error'; readonly field: 'plannedAt'; readonly receivedValue: string; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface InconsistentDecisionStatusDiagnostic { readonly code: 'INCONSISTENT_DECISION_STATUS'; readonly severity: 'error'; readonly field: 'status'; readonly receivedValue: string; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface RequestedActionNotAllowedDiagnostic { readonly code: 'REQUESTED_ACTION_NOT_ALLOWED'; readonly severity: 'error'; readonly field: 'allowedActions'; readonly receivedValue: readonly string[]; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface MissingRequiredContextSnapshotDiagnostic { readonly code: 'MISSING_REQUIRED_CONTEXT_SNAPSHOT'; readonly severity: 'error'; readonly field: 'contextResolution'; readonly receivedValue: null | undefined; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface MissingTraceabilityDiagnostic { readonly code: 'MISSING_TRACEABILITY'; readonly severity: 'error'; readonly field: 'evidence'; readonly receivedValue: readonly unknown[]; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface InconsistentContextAndDecisionDiagnostic { readonly code: 'INCONSISTENT_CONTEXT_AND_DECISION'; readonly severity: 'error'; readonly field: 'contextCapabilities'; readonly receivedValue: unknown; readonly messageCode: GenerationDiagnosticMessageCode; }

export type GenerationPlanDiagnostic =
  | InvalidPlannedAtDiagnostic
  | InconsistentDecisionStatusDiagnostic
  | RequestedActionNotAllowedDiagnostic
  | MissingRequiredContextSnapshotDiagnostic
  | MissingTraceabilityDiagnostic
  | InconsistentContextAndDecisionDiagnostic;

export interface PedagogicalGenerationPlan {
  readonly planType: PedagogicalPlanType;
  readonly action: PedagogicalAction;
  readonly objective: PedagogicalGenerationObjective;
  readonly reasoningSteps: readonly PedagogicalReasoningStep[];
  readonly constraints: readonly GenerationConstraint[];
  readonly knowledgeRequirements: readonly KnowledgeRequirement[];
  readonly outputSchema: readonly PlannedOutputSection[];
  readonly validationCriteria: readonly GenerationValidationCriterion[];
  readonly evidence: readonly GenerationPlanEvidence[];
}

export interface PedagogicalGenerationPlanResolutionBase {
  readonly requestedAction: PedagogicalAction;
  readonly plannedAt: string;
  readonly decisionDiagnostics: readonly DecisionDiagnostic[];
  readonly generationDiagnostics: readonly GenerationPlanDiagnostic[];
}

export interface PedagogicalGenerationPlanReady extends PedagogicalGenerationPlanResolutionBase {
  readonly status: 'ready';
  readonly plan: PedagogicalGenerationPlan;
}

export interface PedagogicalGenerationPlanNotCreated extends PedagogicalGenerationPlanResolutionBase {
  readonly status: 'not_created';
  readonly reason: GenerationPlanNotCreatedReason;
}

export type PedagogicalGenerationPlanResolution = PedagogicalGenerationPlanReady | PedagogicalGenerationPlanNotCreated;
```

### 5. Authorization Gate
`decision.status === 'ready' AND requestedAction ∈ decision.allowedActions AND requestedAction === decision.requestedAction ⇒ plan eligible for creation`. Any failure results in `not_created` without throwing exceptions. Structural input issues produce diagnostics.

**Context-Decision Consistency Matrix:**
Field | Decision Resolution | Context Resolution | Validation
--- | --- | --- | ---
completeness | `decision.contextCapabilities.completeness` | `context.completeness` | Exact Match
canProvideGuidance | `decision.contextCapabilities.canProvideGuidance` | `context.canProvideGuidance` | Exact Match
canGenerateDraft | `decision.contextCapabilities.canGenerateDraft` | `context.canGenerateDraft` | Exact Match
canSubmitForApproval | `decision.contextCapabilities.canSubmitForApproval` | `context.canSubmitForApproval` | Exact Match
warnings | `decision.contextWarnings` | `context.warnings` | Exact Length and Codes
missingRequirements | `decision.contextMissingRequirements` | `context.missingRequirements` | Exact Length and Fields

Any mismatch yields `INCONSISTENT_CONTEXT_AND_DECISION` and plan creation aborts (`not_created`).

### 6. Pedagogical Objective Derivation
Text fields `audienceDescription` and `expectedOutcome` are completely eliminated. The objective uses closed static codes `TargetAudienceCode` and `ExpectedOutcomeCode`, plus `derivedFromIntent` sourced directly from the context. No free text generation.

### 7. Structured Reasoning Plan
`description` strings are removed in favor of `stepCode` which implicitly provides semantic meaning.

### 8. Generation Constraints
`description` removed. Uses strictly closed `constraintType` and `ruleCode`.

### 9. Knowledge Requirements
`selectionReason` removed. Uses `selectionRuleCode`.

### 10. Output Schema Matrix
Acción | Tipo de plan | Secciones Requeridas | Secciones Opcionales | Secciones Prohibidas
--- | --- | --- | --- | ---
guidance | guidance_plan | objective, warnings | context_summary | materials, adaptations, evaluation_criteria, institutional_alignment
strategy | strategy_plan | objective, pedagogical_strategy, evaluation_criteria | context_summary, materials | institutional_alignment
draft_recommendation | draft_recommendation_plan | objective, pedagogical_strategy, materials, adaptations | evaluation_criteria | None
approval_submission | approval_submission_plan | objective, pedagogical_strategy, materials, adaptations, evaluation_criteria, institutional_alignment | warnings | None

### 11. Validation Criteria Matrix
Acción | Criterios Mínimos Exigidos
--- | ---
guidance | OBJECTIVE_PRESERVED, NO_UNSUPPORTED_FACTS, NO_UNAUTHORIZED_INFERENCE
strategy | AGE_RANGE_RESPECTED, GROUP_CONTEXT_RESPECTED, REQUIRED_SECTIONS_PRESENT
draft_recommendation | FORBIDDEN_SECTIONS_ABSENT, TRACEABILITY_PRESERVED
approval_submission | INSTITUTIONAL_FRAMEWORK_RESPECTED, APPLICABLE_POLICIES_RESPECTED

### 12. Generation Plan Evidence
`reasoning` text removed. Uses `ruleCode` and traces to PER-2.

### 13. PER-3 Diagnostic Channel
`decisionDiagnostics` and `generationDiagnostics` are strictly separated arrays in the output. `messageCode` replaces free string messages.

### 14. Exact Fail-Fast Algorithm
1. Validate input structure and `plannedAt` strictly via ISO-8601 regex.
2. Literal preservation of timestamp.
3. Validate context-decision consistency (capabilities, warnings, missing).
4. Apply Authorization Gate (`ready` status, action allowed, action match).
5. Map action to `planType`.
6. Derive objective via closed codes.
7. Construct reasoning steps.
8. Convert PER-2 restrictions to constraints.
9. Select knowledge requirements.
10. Construct output schema.
11. Construct validation criteria.
12. Construct evidence.
13. Apply canonical ordering.
14. Verify PER-3 invariants.
15. Execute `Object.freeze` deeply.
16. Return `PedagogicalGenerationPlanResolution`.

### 15. Mandatory Invariants
1. Mandatory Invariant 1: `ready` ⇒ plan existe.
2. Mandatory Invariant 2: `not_created` ⇒ plan no existe.
3. Mandatory Invariant 3: `ready` ⇒ `decision.status === 'ready'`.
4. Mandatory Invariant 4: `ready` ⇒ `requestedAction` permitida en PER-2.
5. Mandatory Invariant 5: `plan.action === decision.requestedAction`.
6. Mandatory Invariant 6: `planType` corresponde a `action`.
7. Mandatory Invariant 7: `evidence` nunca está vacía en plan `ready`.
8. Mandatory Invariant 8: `knowledge` IDs son subconjunto estricto de IDs del input.
9. Mandatory Invariant 9: `constraints` preservan trazabilidad de PER-2.
10. Mandatory Invariant 10: `required sections` están presentes en `outputSchema`.
11. Mandatory Invariant 11: `forbidden sections` están ausentes en `outputSchema`.
12. Mandatory Invariant 12: arrays no contienen elementos duplicados.
13. Mandatory Invariant 13: el orden de todas las colecciones es canónico.
14. Mandatory Invariant 14: `plannedAt` conserva su valor string literal.
15. Mandatory Invariant 15: input `decisionResolution` y `contextResolution` no son mutados.
16. Mandatory Invariant 16: Deep freeze recursivo completo en el output.
17. Mandatory Invariant 17: Diagnósticos PER-2 y PER-3 se alojan en arreglos separados.
18. Mandatory Invariant 18: Cero expansión de capacidades sobre el techo autorizado.
19. Mandatory Invariant 19: Ejecuciones sucesivas con el mismo input producen output idéntico (Determinismo).
20. Mandatory Invariant 20: Cero dependencias de infraestructura generativa (sin fetch, axios, o tokens).

### 16. Canonical Ordering Rules
Stable sorting applied to `reasoningSteps` (by `sequence`), `outputSchema` (by `sequence`), `constraints` (by `constraintType`), etc.

### 17. Deep-Immutability Strategy
Full `Object.freeze` applied to the returned `PedagogicalGenerationPlanResolution` and every nested collection/object.

### 18. Timestamp Policy
`plannedAt` validated locally against ISO-8601 pattern, preserved literally. Invalid timestamps add `InvalidPlannedAtDiagnostic` but never use system time as fallback.

### 19. Exact File Inventory
```
src/domain/pedagogy/generation/
├── Contracts.ts
├── GenerationPlanPolicies.ts
├── GenerationPlanBuilders.ts
├── PedagogicalGenerationPlanner.ts
├── index.ts
└── __tests__
    └── PedagogicalGenerationPlanner.test.ts
```

- **Contracts.ts:** dominio cerrado.
- **GenerationPlanPolicies.ts:** matrices canónicas y códigos.
- **GenerationPlanBuilders.ts:** funciones puras consolidadas.
- **PedagogicalGenerationPlanner.ts:** orquestador y authorization gate.

### 20. Test Strategy — Minimum 50 Cases
1. Test Case 1: plannedAt ISO format is valid. Condition: ISO string. Result: No InvalidPlannedAtDiagnostic.
2. Test Case 2: plannedAt ISO format is invalid. Condition: "bad-date". Result: InvalidPlannedAtDiagnostic.
3. Test Case 3: plannedAt is empty string. Condition: "". Result: InvalidPlannedAtDiagnostic.
4. Test Case 4: plannedAt is preserved literally. Condition: "2026-01-01T00:00:00Z". Result: Exact string in output.
5. Test Case 5: plannedAt missing (undefined/null if casting). Condition: Any bypass. Result: InvalidPlannedAtDiagnostic.
6. Test Case 6: Decision is blocked. Condition: blocked. Result: not_created, DECISION_BLOCKED.
7. Test Case 7: Decision is clarification_required. Condition: clarification_required. Result: not_created, CLARIFICATION_REQUIRED.
8. Test Case 8: requestedAction not in allowedActions. Condition: missing from array. Result: not_created, RequestedActionNotAllowedDiagnostic.
10. Test Case 10: Valid ready decision creates plan. Condition: fully valid input. Result: ready status, plan present.
11. Test Case 11: Mismatch in capabilities between context and decision. Condition: true vs false. Result: not_created, InconsistentContextAndDecisionDiagnostic.
12. Test Case 12: Mismatch in warnings array length. Condition: 1 vs 0. Result: not_created, InconsistentContextAndDecisionDiagnostic.
13. Test Case 13: Mismatch in missing requirements array. Condition: different codes. Result: not_created, InconsistentContextAndDecisionDiagnostic.
14. Test Case 14: Context completeness mismatch. Condition: 'partial' vs 'complete'. Result: not_created, InconsistentContextAndDecisionDiagnostic.
15. Test Case 15: Missing decision context capabilities block. Condition: null object bypassing types. Result: not_created, InconsistentContextAndDecisionDiagnostic.
16. Test Case 16: guidance action creates guidance_plan. Condition: 'guidance'. Result: planType = 'guidance_plan'.
17. Test Case 17: strategy action creates strategy_plan. Condition: 'strategy'. Result: planType = 'strategy_plan'.
18. Test Case 18: draft_recommendation creates draft_recommendation_plan. Condition: 'draft_recommendation'. Result: planType = 'draft_recommendation_plan'.
19. Test Case 19: approval_submission creates approval_submission_plan. Condition: 'approval_submission'. Result: planType = 'approval_submission_plan'.
21. Test Case 21: guidance has correct canonical steps. Condition: 'guidance'. Result: ESTABLISH_OBJECTIVE, APPLY_PEDAGOGICAL_INTENT present.
22. Test Case 22: strategy includes IDENTIFY_AUDIENCE step. Condition: 'strategy'. Result: IDENTIFY_AUDIENCE present.
23. Test Case 23: approval includes APPLY_INSTITUTIONAL_FRAMEWORK. Condition: 'approval_submission'. Result: APPLY_INSTITUTIONAL_FRAMEWORK present.
24. Test Case 24: reasoning steps have no duplicates. Condition: any valid plan. Result: unique stepCodes.
25. Test Case 25: reasoning steps sorted by sequence. Condition: any valid plan. Result: monotonically increasing sequence.
26. Test Case 26: PER-2 restriction converted to must_align_with constraint. Condition: policy restriction. Result: GenerationConstraintType 'must_align_with'.
27. Test Case 27: constraint rule codes mapped correctly. Condition: constraints present. Result: valid GenerationRuleCode.
28. Test Case 28: no restrictions means empty constraints. Condition: zero PER-2 restrictions. Result: constraints = [].
29. Test Case 29: constraint order is canonical. Condition: multiple constraints. Result: sorted by constraintType.
30. Test Case 30: constraints reference decision evidence. Condition: restriction passed. Result: sourceReferences maintained.
31. Test Case 31: Knowledge requirement does not invent IDs. Condition: context has 'f-1'. Result: sourceIds contains only 'f-1'.
32. Test Case 32: Missing institutional frameworks returns empty requirement list. Condition: no frameworks. Result: no 'institutional_framework' requirement.
33. Test Case 33: Knowledge requirement required flag set properly. Condition: draft_recommendation. Result: required = true.
34. Test Case 34: Knowledge requirement respects ruleCode. Condition: any. Result: valid GenerationRuleCode.
35. Test Case 35: Knowledge requirements sorted canónically. Condition: multiple. Result: sorted by requirementType.
36. Test Case 36: guidance output schema missing prohibited sections. Condition: guidance. Result: no 'materials'.
37. Test Case 37: strategy output schema contains pedagogical_strategy. Condition: strategy. Result: 'pedagogical_strategy' present.
38. Test Case 38: draft output schema contains adaptations. Condition: draft_recommendation. Result: 'adaptations' present.
39. Test Case 39: approval output schema contains institutional_alignment. Condition: approval_submission. Result: 'institutional_alignment' present.
40. Test Case 40: output schema sorted by sequence. Condition: any valid plan. Result: increasing sequence.
41. Test Case 41: guidance validation criteria includes OBJECTIVE_PRESERVED. Condition: guidance. Result: OBJECTIVE_PRESERVED present.
42. Test Case 42: strategy validation includes AGE_RANGE_RESPECTED. Condition: strategy. Result: AGE_RANGE_RESPECTED present.
43. Test Case 43: approval validation includes INSTITUTIONAL_FRAMEWORK_RESPECTED. Condition: approval_submission. Result: INSTITUTIONAL_FRAMEWORK_RESPECTED present.
44. Test Case 44: TRACEABILITY_PRESERVED always present for draft. Condition: draft_recommendation. Result: TRACEABILITY_PRESERVED present.
45. Test Case 45: Evidence array is not empty for ready plans. Condition: ready plan. Result: evidence.length > 0.
46. Test Case 46: Evidence contextFieldsUsed matches logic. Condition: derived objective. Result: pedagogicalIntent in fields used.
47. Test Case 47: Decision diagnostics mapped separately. Condition: input has diagnostic. Result: decisionDiagnostics array populated, generationDiagnostics empty (if valid plannedAt).
48. Test Case 48: Deep freeze applied. Condition: ready plan. Result: Object.isFrozen(plan.outputSchema) === true.
49. Test Case 49: Determinism hold. Condition: call 2 times with identical inputs. Result: Deep equality true.
50. Test Case 50: Zero expansion of capabilities. Condition: strategy requested, draft prohibited. Result: output schema does not mandate formal templates.

### 21. Prohibited Dependencies and Constructs
- OpenAI SDK, Gemini SDK, Anthropic SDK, Axios, fetch.
- React, UI Code, environment variables.
- `any`, `unknown` casts, `@ts-ignore`, `Date.now()`, `new Date()`.

### 22. User Review Required
Se presenta esta arquitectura completa para aprobación oficial del ARB.

**STATUS: READY FOR PER-3 ARCHITECTURAL REVIEW**
