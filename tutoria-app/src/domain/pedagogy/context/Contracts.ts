/**
 * Core pedagogical context contracts.
 * Immutable, deterministic, and free of runtime dependencies.
 */

export type PedagogicalContextSourceType =
  | 'authenticated_session'
  | 'membership_profile'
  | 'childcare_center_catalog'
  | 'group_catalog'
  | 'active_planning'
  | 'educator_observation'
  | 'institutional_knowledge'
  | 'normative_framework'
  | 'user_selection'
  | 'system_default';

export interface PedagogicalContext {
  readonly actorId: string;
  readonly actorRole: string;
  readonly institutionId: string;
  readonly childcareCenterId: string;
  // roomId is a legitimate optional field. A complete context can exist for a group without a specific physical room assignment.
  readonly roomId?: string;
  readonly groupId: string;
  readonly ageRange: string;
  readonly planningId: string;
  readonly planningStatus: string;
  readonly planningPeriod: string;
  // activeWorkflowStep is optional. It provides granular UX state but is not required for pedagogical generation.
  readonly activeWorkflowStep?: string;
  readonly observations: readonly string[];
  readonly pedagogicalIntent: string;
  readonly institutionalFrameworkIds: readonly string[];
  readonly knowledgeResourceIds: readonly string[];
  readonly previousExperienceIds: readonly string[];
  readonly applicablePolicies: readonly string[];
  readonly locale: string;
  readonly generatedAt: string;
}

// Honest Context Contract: Option B (Partial vs Complete)
export type PartialPedagogicalContext = Readonly<Partial<PedagogicalContext>>;
export type CompletePedagogicalContext = Readonly<PedagogicalContext>;

/**
 * Type guard establishing the boundary of trust for a complete context.
 *
 * Fields evaluated:
 * - Core targeting and auth: actorId, actorRole, institutionId, childcareCenterId, groupId, ageRange, planningId, planningStatus, planningPeriod, pedagogicalIntent, locale, generatedAt.
 *
 * Fields omitted:
 * - roomId, activeWorkflowStep: Legitimate optional fields in the domain.
 * - arrays (observations, institutionalFrameworkIds, etc.): The resolver always guarantees they are initialized to `readonly string[]` (empty if absent), so they never violate the CompletePedagogicalContext contract structurally.
 */
export const isCompleteContext = (ctx: PartialPedagogicalContext): ctx is CompletePedagogicalContext => {
  const required: Array<keyof PedagogicalContext> = [
    'actorId', 'actorRole', 'institutionId', 'childcareCenterId',
    'groupId', 'ageRange', 'planningId', 'planningStatus',
    'planningPeriod', 'pedagogicalIntent', 'locale', 'generatedAt'
  ];
  return required.every(field => ctx[field] !== undefined);
};

// Type-Safe Evidence Construction
export type ContextEvidence<K extends keyof PedagogicalContext = keyof PedagogicalContext> = Readonly<{
  field: K;
  value: PedagogicalContext[K];
  sourceType: PedagogicalContextSourceType;
  sourceReference: string;
  capturedAt: string; // ISO 8601 string
  confidence: number;
  isAuthoritative: boolean;
  isSelected: boolean; // Indicates if this was the winning evidence in a conflict
}>;

export type AnyContextEvidence = {
  [K in keyof PedagogicalContext]-?: ContextEvidence<K>
}[keyof PedagogicalContext];

export const createEvidence = <K extends keyof PedagogicalContext>(
  field: K,
  value: PedagogicalContext[K],
  sourceType: PedagogicalContextSourceType,
  sourceReference: string,
  capturedAt: string,
  confidence: number,
  isAuthoritative: boolean,
  isSelected: boolean
): ContextEvidence<K> => Object.freeze({
  field,
  value,
  sourceType,
  sourceReference,
  capturedAt,
  confidence,
  isAuthoritative,
  isSelected
});

export type ContextCompleteness =
  | 'complete'
  | 'sufficient_for_draft'
  | 'sufficient_for_guidance'
  | 'incomplete'
  | 'blocked';

export type MissingContextSeverity = 'critical' | 'high' | 'low';

export interface MissingContextRequirement {
  readonly field: keyof PedagogicalContext;
  readonly reason: string;
  readonly severity: MissingContextSeverity;
  readonly remediation: string;
  readonly blocksRecommendation: boolean;
}

export interface PedagogicalWarning {
  readonly field: keyof PedagogicalContext;
  readonly message: string;
  readonly sourceType: PedagogicalContextSourceType;
}

export interface PedagogicalContextResolution {
  readonly context: PartialPedagogicalContext | CompletePedagogicalContext;
  readonly evidence: readonly AnyContextEvidence[];
  readonly completeness: ContextCompleteness;
  readonly missingRequirements: readonly MissingContextRequirement[];
  readonly warnings: readonly PedagogicalWarning[];
  readonly resolutionReason: string;
  readonly canGenerateDraft: boolean;
  readonly canProvideGuidance: boolean;
  readonly canSubmitForApproval: boolean;
}

// Input contracts for the resolver
export interface ContextInputFragment {
  readonly sourceType: PedagogicalContextSourceType;
  readonly sourceReference: string;
  readonly capturedAt: string;
  readonly payload: Partial<PedagogicalContext>;
  readonly isAuthoritative: boolean;
}

export interface ContextResolverInput {
  readonly fragments: readonly ContextInputFragment[];
  readonly generatedAt: string;
}
