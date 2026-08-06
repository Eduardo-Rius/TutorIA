# PER-4 PROMPT COMPILATION ENGINE

## Goal Description

Design PER-4 as a deterministic, provider-agnostic Prompt Compilation Engine that consumes only an approved PER-3 `PedagogicalGenerationPlanResolution` and transforms it into a strongly typed, immutable `PromptCompilationPlan`.

PER-4 acts purely as a deterministic compiler between PER-3 and a future provider/network orchestration layer. It compiles structured semantic generation instructions but strictly guarantees NO network access, NO API calls, NO SDK usage, NO AI generation, and NO interpretation.

PER-4 compiles semantic prompt structure only. It makes zero claims about token cost, provider capacity, or transport feasibility. Tokenization, provider limits, truncation strategy, context-window management, and transport budgeting belong exclusively to PER-5.

## 1. Exact Input Contract

The input contract must contain only:
- `generationResolution: PedagogicalGenerationPlanResolution`
- `compiledAt: string` supplied explicitly by the caller.

Do not include provider name, model name, temperature, max tokens, API metadata, locale inferred from the system, user-selected formatting preferences, network options, or hidden environmental configuration.

PER-4 must preserve `compiledAt` literally. It must validate `compiledAt` deterministically without `Date.now()`, `new Date()`, `performance.now()`, locale parsing, epoch substitution, or system-clock fallback.

## 2. Proposed Contracts

```typescript
export type PromptCompilationStatus = 'ready' | 'not_created';

export type PromptCompilationNotCreatedReason =
  | 'GENERATION_PLAN_NOT_READY'
  | 'INVALID_COMPILED_AT'
  | 'EMPTY_OUTPUT_SCHEMA'
  | 'MISSING_TRACEABILITY'
  | 'INVALID_CANONICAL_ORDER'
  | 'UNSUPPORTED_PLAN_TYPE'
  | 'INCONSISTENT_GENERATION_PLAN'
  | 'UNCOMPILABLE_DIRECTIVE'
  | 'UNMAPPED_GENERATION_RULE';

export interface PromptCompilationDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly field: string;
  readonly message: string;
}

export type PromptCompilationRuleCode =
  | 'AUTHORIZATION_GATE_PASSED'
  | 'AUTHORIZATION_GATE_REJECTED'
  | 'SECTION_ORDER_APPLIED'
  | 'REASONING_MAPPED'
  | 'CONSTRAINTS_MAPPED'
  | 'KNOWLEDGE_MAPPED'
  | 'OUTPUT_MAPPED'
  | 'VALIDATION_MAPPED'
  | 'EVIDENCE_MAPPED';

export type PromptSectionType =
  | 'system_role'
  | 'pedagogical_objective'
  | 'learner_context'
  | 'reasoning_instructions'
  | 'institutional_constraints'
  | 'knowledge_boundaries'
  | 'output_contract'
  | 'validation_requirements'
  | 'evidence_trace';

export type PromptDirectiveType = 'mandatory' | 'guidance' | 'restriction';

export interface PromptDirective {
  readonly directiveType: PromptDirectiveType;
  readonly directiveCode: PromptCompilationRuleCode;
  readonly sourceReferences: readonly string[];
}

export interface PromptOutputContract {
  readonly sectionCode: string;
  readonly required: boolean;
  readonly sequence: number;
  readonly sourceValidationCodes: readonly string[];
}

export interface PromptEvidenceTrace {
  readonly ruleCode: string;
  readonly sourceReferences: readonly string[];
}

export interface PromptSection {
  readonly sectionType: PromptSectionType;
  readonly content: string;
  readonly directives: readonly PromptDirective[];
  readonly sequence: number;
}

export interface PromptCompilationPlan {
  readonly sections: readonly PromptSection[];
  readonly outputContract: readonly PromptOutputContract[];
  readonly evidenceTrace: readonly PromptEvidenceTrace[];
}

export interface PromptCompilationResolutionBase {
  readonly requestedAction: import('../decision/Contracts').PedagogicalAction;
  readonly planType?: import('../generation/Contracts').PedagogicalPlanType;
  readonly compiledAt: string;
  readonly plannedAt: string;
  readonly decisionDiagnostics: readonly import('../decision/Contracts').DecisionDiagnostic[];
  readonly generationDiagnostics: readonly import('../generation/Contracts').GenerationPlanDiagnostic[];
  readonly compilationDiagnostics: readonly PromptCompilationDiagnostic[];
}

export interface PromptCompilationReady extends PromptCompilationResolutionBase {
  readonly status: 'ready';
  readonly promptPlan: PromptCompilationPlan;
}

export interface PromptCompilationNotCreated extends PromptCompilationResolutionBase {
  readonly status: 'not_created';
  readonly reason: PromptCompilationNotCreatedReason;
}

export type PromptCompilationResolution = PromptCompilationReady | PromptCompilationNotCreated;

export interface PromptCompilationInput {
  readonly generationResolution: import('../generation/Contracts').PedagogicalGenerationPlanResolution;
  readonly compiledAt: string;
}
```

## 3. Diagnostic Channel Separation

The resulting contract must preserve three independent diagnostic channels:
- `decisionDiagnostics`: copied from PER-2 through PER-3.
- `generationDiagnostics`: copied from PER-3.
- `compilationDiagnostics`: created exclusively by PER-4.

PER-4 must never add, delete, reinterpret, merge, or rewrite entries in the first two channels. A compilation diagnostic must never be inserted into `decisionDiagnostics` or `generationDiagnostics`.

## 4. No Free-Text Instruction Invention

Any semantic instruction produced by PER-4 must originate from:
- A closed code;
- A fixed canonical template associated with that code; or
- An exact source value already present in the PER-3 generation plan.

No arbitrary prose composition is permitted. Fields such as `instruction: string`, `purpose: string`, `reasoning: string` are prohibited unless explicitly derived from a deterministic constant selected by a closed code or an exact escaped serialization of a source field.

## 5. Compilation Matrix

The matrix must cover `guidance_plan`, `strategy_plan`, `draft_recommendation_plan`, `approval_submission_plan`.

For each plan type:
- Required prompt sections are derived deterministically.
- Prohibited prompt sections must be explicitly rejected if erroneously mapped.
- Source fields are consumed exactly.
- Directive codes, constraint codes, validation codes, and evidence trace requirements are emitted mapped 1:1.
- Failure behavior if a required source is absent defaults to `not_created`.
- An unknown or unmapped plan type must produce `not_created` with `UNSUPPORTED_PLAN_TYPE`.

No generic default section is allowed. No "best effort" behavior is allowed.

## 6. Canonical Prompt Section Order

Define one constant:
```typescript
export const CANONICAL_PROMPT_SECTION_ORDER: readonly PromptSectionType[] = [
  'system_role',
  'pedagogical_objective',
  'learner_context',
  'reasoning_instructions',
  'institutional_constraints',
  'knowledge_boundaries',
  'output_contract',
  'validation_requirements',
  'evidence_trace'
];
```
*Note: `learner_context` is currently omitted from compilation because its data is not passed in the PER-3 generation plan, avoiding knowledge invention.*
Every compiled section must follow that order. The implementation may filter sections that do not apply, but it may never reorder them dynamically.
Invariants:
- no duplicate section codes;
- strictly increasing canonical sequence;
- required sections present;
- prohibited sections absent;
- union of emitted sections matching the action matrix exactly.

## 7. Data/Instruction Boundary and Escaping

PER-4 compiles data that may eventually be consumed by an LLM.
PER-4 preserves the distinction between trusted compiler directives and untrusted source-derived data through typed sections and deterministic serialization.

Source-derived values must never become executable compiler instructions merely because they contain imperative text.
Deterministic serialization and escaping policy required for:
- line breaks
- delimiter-like content
- control characters
- embedded section markers
- markdown fences
- XML-like tags
- quotes

## 8. Source Traceability

Every emitted prompt section and directive must include structured provenance referencing existing PER-3 artifacts only (e.g. reasoning step codes, constraint rule codes).
PER-4 must not create fictitious source IDs, evidence references, or provenance labels.
A ready compilation must contain non-empty traceability. If traceability required by a section is absent, return `not_created` with `MISSING_TRACEABILITY`.

## 9. Constraint Compilation Without Fallbacks

Every GenerationConstraint type and GenerationRuleCode accepted from PER-3 must have an explicit deterministic mapping. No generic fallback (e.g., "treat unknown as must_align_with") is permitted. Unmapped rules or constraints must produce `not_created` with a closed reason (`UNMAPPED_GENERATION_RULE` or `UNCOMPILABLE_DIRECTIVE`) and compilation diagnostic.

## 10. Output Schema Compilation

The compiled output contract must remain provider-neutral. Do not encode OpenAI `response_format`, Gemini schemas, etc.
Output instruction contains:
- `sectionCode`
- `required`
- `sequence`
- `cardinality` (if applicable)
- `sourceValidationCodes`
- prohibition markers where applicable.

## 11. Authorization Gate Fail-Fast Order

1. Validate the input discriminant.
2. Preserve upstream diagnostics.
3. Validate `compiledAt`.
4. Reject a PER-3 `not_created` resolution.
5. Validate that the ready branch contains a plan.
6. Validate supported planType/action correspondence.
7. Validate non-empty evidence and traceability.
8. Validate output schema integrity.
9. Validate canonical source ordering.
10. Compile sections using the exact matrix.
11. Compile directives using closed mappings.
12. Compile constraints without fallback.
13. Compile output instructions.
14. Build traceability entries.
15. Validate canonical section order and invariants.
16. Deep-freeze the entire resolution.
17. Return the discriminated result.

## 12. Deep Immutability

Require deep freezing of:
- the root resolution
- the prompt plan
- all section arrays and objects
- directive arrays and objects
- constraint arrays and objects
- output instructions
- validation instructions
- traceability arrays and trace objects
- all copied upstream diagnostic arrays and nested objects.

## 13. Determinism Requirements

Two structurally equivalent inputs must produce structurally identical outputs.
Determinism must not depend on key insertion order, locale, timezone, system clock, filesystem, environment variables, random numbers, or network state.
Arrays must be canonicalized before comparison or compilation. Do not use `JSON.stringify` for semantic equivalence.

## 14. Prohibited Constructs

Prohibit:
- `any`, `unknown`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, non-null assertions used as type escapes
- `Date.now`, `new Date`, `performance.now`, `Math.random`
- `fetch`, `axios`, `OpenAI`, `Gemini`, `Anthropic`, `Firebase`, `React`, `n8n`
- `process.env`, `localStorage`, filesystem writes
- token estimation, character-count token proxies, provider names or model IDs in production contracts

## 15. Proposed File Inventory

- `tutoria-app/src/domain/pedagogy/prompt/Contracts.ts`
- `tutoria-app/src/domain/pedagogy/prompt/PromptCompilationPolicies.ts`
- `tutoria-app/src/domain/pedagogy/prompt/PromptSectionBuilders.ts`
- `tutoria-app/src/domain/pedagogy/prompt/PromptCompilationEngine.ts`
- `tutoria-app/src/domain/pedagogy/prompt/index.ts`
- `tutoria-app/src/domain/pedagogy/prompt/__tests__/PromptCompilationEngine.test.ts`

## 16. Test Strategy (Minimum 70 Explicit Cases)

Explicit minimum of 70 test cases covering:
1-5. All ready and not_created union branches.
6-9. All four plan types.
10-14. compiledAt valid cases (leap year, ISO variants).
15-18. compiledAt invalid cases (impossible date rejection).
19. Preservation of the literal compiledAt input.
20. Upstream diagnostic-channel separation (no leak or overwrite).
21. Empty evidence rejection (MISSING_TRACEABILITY).
22. Empty output schema rejection (EMPTY_OUTPUT_SCHEMA).
23. Missing traceability mapping rejection.
24. Unsupported plan type through a type-safe adversarial fixture.
25. Unmapped rule behavior.
26. Unmapped constraint behavior.
27. No generic fallback logic.
28-32. Canonical section ordering (CANONICAL_PROMPT_SECTION_ORDER).
33. Duplicate sections rejection.
34. Missing required sections rejection.
35. Prohibited sections rejection.
36-40. Deterministic escaping (line breaks, delimiters, XML tags).
41. Source values containing fake section delimiters.
42. Source values containing imperative or prompt-injection-like text.
43. Preservation of source content as data.
44. No interpretation of source data.
45-48. Output schema mapping for each plan type.
49. No provider-specific structures mapping.
50-55. Deep freeze of every nested collection.
56. No input mutation (side effect freedom).
57. Repeated execution equality.
58. Structurally equivalent inputs with different irrelevant ordering equality.
59. Traceability non-empty for ready results.
60. Exact provenance references preservation.
61-64. Zero knowledge invention tests (free-text instructions blocked).
65. Zero capability expansion.
66. exactOptionalPropertyTypes compatibility.
67-70. Differential TypeScript stability against the PER-3 sealed baseline.

STATUS: READY FOR PER-4 FINAL ARCHITECTURAL REVIEW
