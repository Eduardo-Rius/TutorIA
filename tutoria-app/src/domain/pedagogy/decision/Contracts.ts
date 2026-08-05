import { 
  PedagogicalContext, 
  PedagogicalContextResolution, 
  ContextCompleteness, 
  PedagogicalWarning, 
  MissingContextRequirement 
} from '../context/Contracts';

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

export interface InvalidEvaluatedAtDiagnostic {
  readonly code: 'INVALID_EVALUATED_AT';
  readonly severity: 'error';
  readonly field: 'evaluatedAt';
  readonly receivedValue: string;
  readonly message: string;
}

export interface InconsistentContextCapabilitiesDiagnostic {
  readonly code: 'INCONSISTENT_CONTEXT_CAPABILITIES';
  readonly severity: 'error';
  readonly field: 'contextCapabilities';
  readonly receivedValue: ContextCapabilitySnapshot;
  readonly message: string;
}

export type DecisionDiagnostic =
  | InvalidEvaluatedAtDiagnostic
  | InconsistentContextCapabilitiesDiagnostic;

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
