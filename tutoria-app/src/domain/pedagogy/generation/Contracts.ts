import { PedagogicalContext, PedagogicalContextResolution } from '../context/Contracts';
import { PedagogicalDecisionResolution, PedagogicalAction, DecisionRuleCode, DecisionDiagnostic } from '../decision/Contracts';

export type { PedagogicalAction } from '../decision/Contracts';
import { DecisionEvidence } from '../decision/Contracts';

export type PedagogicalPlanType =
  | 'guidance_plan'
  | 'strategy_plan'
  | 'draft_recommendation_plan'
  | 'approval_submission_plan';

export type GenerationPlanStatus = 'not_created' | 'ready';

export type GenerationPlanNotCreatedReason =
  | 'DECISION_BLOCKED'
  | 'CLARIFICATION_REQUIRED'
  | 'INCONSISTENT_DECISION_INPUT'
  | 'MISSING_TRACEABILITY'
  | 'UNSUPPORTED_RESTRICTION_TYPE';

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

export type GenerationDiagnosticMessageCode = 'INVALID_ISO_FORMAT' | 'UNEXPECTED_DECISION_STATUS' | 'ACTION_MISMATCH' | 'ACTION_FORBIDDEN' | 'CONTEXT_MISSING' | 'NO_EVIDENCE' | 'CAPABILITY_MISMATCH' | 'WARNING_MISMATCH' | 'UNSUPPORTED_RESTRICTION';

export interface InvalidPlannedAtDiagnostic { readonly code: 'INVALID_PLANNED_AT'; readonly severity: 'error'; readonly field: 'plannedAt'; readonly receivedValue: string; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface InconsistentDecisionStatusDiagnostic { readonly code: 'INCONSISTENT_DECISION_STATUS'; readonly severity: 'error'; readonly field: 'status'; readonly receivedValue: string; readonly messageCode: GenerationDiagnosticMessageCode; }

export interface RequestedActionNotAllowedDiagnostic { readonly code: 'REQUESTED_ACTION_NOT_ALLOWED'; readonly severity: 'error'; readonly field: 'allowedActions'; readonly receivedValue: readonly string[]; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface MissingRequiredContextSnapshotDiagnostic { readonly code: 'MISSING_REQUIRED_CONTEXT_SNAPSHOT'; readonly severity: 'error'; readonly field: 'contextResolution'; readonly receivedValue: null | undefined; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface MissingTraceabilityDiagnostic { readonly code: 'MISSING_TRACEABILITY'; readonly severity: 'error'; readonly field: 'evidence'; readonly receivedValue: readonly DecisionEvidence[]; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface InconsistentContextAndDecisionDiagnostic { readonly code: 'INCONSISTENT_CONTEXT_AND_DECISION'; readonly severity: 'error'; readonly field: 'contextCapabilities'; readonly receivedValue: Record<string, string | boolean | number | null | readonly string[]> | readonly import('../context/Contracts').PedagogicalWarning[] | readonly import('../context/Contracts').MissingContextRequirement[]; readonly messageCode: GenerationDiagnosticMessageCode; }
export interface UnsupportedRestrictionTypeDiagnostic { readonly code: 'UNSUPPORTED_RESTRICTION_TYPE'; readonly severity: 'error'; readonly field: 'restrictions'; readonly receivedValue: string; readonly messageCode: GenerationDiagnosticMessageCode; }

export type GenerationPlanDiagnostic = 
  | InvalidPlannedAtDiagnostic 
  | InconsistentDecisionStatusDiagnostic 
  | RequestedActionNotAllowedDiagnostic 
  | MissingRequiredContextSnapshotDiagnostic 
  | MissingTraceabilityDiagnostic 
  | InconsistentContextAndDecisionDiagnostic
  | UnsupportedRestrictionTypeDiagnostic;

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

export interface PedagogicalGenerationPlanInput {
  readonly decisionResolution: PedagogicalDecisionResolution;
  readonly contextResolution: PedagogicalContextResolution;
  readonly plannedAt: string;
}

export interface UntrustedGenerationPlanInput {
  readonly decisionResolution?: PedagogicalDecisionResolution;
  readonly contextResolution?: PedagogicalContextResolution;
  readonly plannedAt?: string;
}
