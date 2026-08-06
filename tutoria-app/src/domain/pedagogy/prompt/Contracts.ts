import { PedagogicalAction, DecisionDiagnostic } from '../decision/Contracts';
import { 
  PedagogicalPlanType, 
  PedagogicalGenerationPlanResolution, 
  GenerationPlanDiagnostic,
  GenerationRuleCode,
  PedagogicalReasoningStepCode,
  GenerationConstraintType,
  OutputSectionCode,
  GenerationValidationCode
} from '../generation/Contracts';

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

export type PromptCompilationDiagnosticCode =
  | 'INVALID_TIMESTAMP'
  | 'PLAN_NOT_READY'
  | 'MISSING_TRACEABILITY'
  | 'MISSING_SCHEMA'
  | 'CANONICAL_ORDER_VIOLATION'
  | 'UNSUPPORTED_PLAN'
  | 'UNMAPPED_RULE'
  | 'UNMAPPED_CONSTRAINT'
  | 'INCONSISTENT_PLAN';

export interface PromptCompilationDiagnostic {
  readonly code: PromptCompilationDiagnosticCode;
  readonly severity: 'error' | 'warning';
  readonly field: string;
  readonly message: string;
}

export type PromptSectionCode =
  | 'system_role'
  | 'pedagogical_objective'
  | 'learner_context'
  | 'reasoning_instructions'
  | 'institutional_constraints'
  | 'knowledge_boundaries'
  | 'output_contract'
  | 'validation_requirements'
  | 'evidence_trace';

export type PromptDirectiveCode = PedagogicalReasoningStepCode;
export type PromptConstraintCode = GenerationConstraintType;
export type PromptOutputInstructionCode = OutputSectionCode;
export type PromptValidationInstructionCode = GenerationValidationCode;

export type PromptDirectiveType = 'mandatory' | 'guidance' | 'restriction';

export interface PromptDirective {
  readonly directiveType: PromptDirectiveType;
  readonly directiveCode: PromptDirectiveCode | PromptConstraintCode | PromptValidationInstructionCode | GenerationRuleCode;
  readonly sourceReferences: readonly string[];
}

export interface PromptOutputInstruction {
  readonly sectionCode: PromptOutputInstructionCode;
  readonly required: boolean;
  readonly sequence: number;
  readonly sourceValidationCodes: readonly PromptValidationInstructionCode[];
}

export interface PromptTraceEntry {
  readonly ruleCode: GenerationRuleCode;
  readonly sourceReferences: readonly string[];
}

export interface PromptSection {
  readonly sectionCode: PromptSectionCode;
  readonly content: string; // Exact escaped serialization of source data
  readonly directives: readonly PromptDirective[];
  readonly sequence: number;
}

export interface PromptCompilationPlan {
  readonly sections: readonly PromptSection[];
  readonly outputContract: readonly PromptOutputInstruction[];
  readonly evidenceTrace: readonly PromptTraceEntry[];
}

export interface PromptCompilationResolutionBase {
  readonly requestedAction: PedagogicalAction;
  readonly planType?: PedagogicalPlanType;
  readonly compiledAt: string;
  readonly plannedAt: string;
  readonly decisionDiagnostics: readonly DecisionDiagnostic[];
  readonly generationDiagnostics: readonly GenerationPlanDiagnostic[];
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
  readonly generationResolution: PedagogicalGenerationPlanResolution;
  readonly compiledAt: string;
}
