import { PedagogicalContext, AnyContextEvidence } from '../context/Contracts';
import {
  PedagogicalDecisionInput,
  PedagogicalDecisionResolution,
  DecisionStatus,
  PedagogicalAction,
  ALL_PEDAGOGICAL_ACTIONS,
  DecisionBlockReason,
  DecisionEvidence,
  DecisionConfidence,
  ClarificationRequest,
  DecisionDiagnostic,
  RequestedPedagogicalAction
} from './Contracts';
import { ClarificationEngine } from './ClarificationEngine';

export class PedagogicalDecisionPolicy {
  public static evaluate(input: PedagogicalDecisionInput): PedagogicalDecisionResolution {
    const diagnostics: DecisionDiagnostic[] = [];
    const isValidDate = this.isValidISO8601(input.evaluatedAt);
    if (!isValidDate) {
      diagnostics.push(Object.freeze({
        code: 'INVALID_EVALUATED_AT',
        severity: 'error',
        field: 'evaluatedAt',
        receivedValue: input.evaluatedAt,
        message: 'The evaluatedAt timestamp is not a valid ISO-8601 string.'
      }));
    }

    const ctx = input.contextResolution;
    const contextCapabilities = Object.freeze({
      completeness: ctx.completeness,
      canProvideGuidance: ctx.canProvideGuidance,
      canGenerateDraft: ctx.canGenerateDraft,
      canSubmitForApproval: ctx.canSubmitForApproval
    });
    
    // Structurally equivalent, provenance-preserving, independently frozen copy.
    const contextWarnings = Object.freeze([...ctx.warnings.map(w => Object.freeze({ ...w }))]);
    const contextMissingRequirements = Object.freeze([...ctx.missingRequirements.map(m => Object.freeze({ ...m }))]);
    const evidenceList: DecisionEvidence[] = [];

    const isCriticallyBlocked = ctx.completeness === 'blocked';

    let isInconsistent = false;
    if (isCriticallyBlocked && (ctx.canProvideGuidance || ctx.canGenerateDraft || ctx.canSubmitForApproval)) {
      isInconsistent = true;
    }
    if (ctx.canSubmitForApproval && (!ctx.canGenerateDraft || !ctx.canProvideGuidance)) {
      isInconsistent = true;
    }
    if (ctx.canGenerateDraft && !ctx.canProvideGuidance) {
      isInconsistent = true;
    }

    if (isInconsistent) {
      diagnostics.push(Object.freeze({
        code: 'INCONSISTENT_CONTEXT_CAPABILITIES',
        severity: 'error',
        field: 'contextCapabilities',
        receivedValue: contextCapabilities,
        message: 'PER-1.1 context capabilities are logically contradictory.'
      }));
    }

    // Restrictive interpretation (never expand PER-1.1 ceiling)
    let maxGuidance = ctx.canProvideGuidance && !isCriticallyBlocked;
    
    const hasIntent = ctx.context.pedagogicalIntent !== undefined;
    const hasGroup = ctx.context.groupId !== undefined;
    const hasAge = ctx.context.ageRange !== undefined;
    
    let maxStrategy = false;
    if (maxGuidance && hasIntent && hasGroup && hasAge) {
      maxStrategy = true;
      evidenceList.push(Object.freeze({
        ruleCode: 'STRATEGY_CAPABILITY_DERIVED',
        requirementMet: 'Strategy derived from guidance and required fields',
        contextFieldsUsed: Object.freeze(['pedagogicalIntent', 'groupId', 'ageRange'] as (keyof PedagogicalContext)[]),
        sourceReferences: Object.freeze([]),
        reasoning: 'The context has sufficient group and intent data to formulate a specific pedagogical strategy.'
      }));
    } else if (maxGuidance) {
      evidenceList.push(Object.freeze({
        ruleCode: 'PER1_CAPABILITY_BOUNDARY',
        requirementMet: 'Strategy derivation blocked',
        contextFieldsUsed: Object.freeze(['pedagogicalIntent', 'groupId', 'ageRange'] as (keyof PedagogicalContext)[]),
        sourceReferences: Object.freeze([]),
        reasoning: 'Missing required pedagogical intent, group id, or age range to derive strategy capability.'
      }));
    }

    // Jerarquía restrictiva
    let maxDraft = ctx.canGenerateDraft && maxStrategy; 
    let maxApproval = ctx.canSubmitForApproval && maxDraft;

    // Partición completa
    const allowedSet = new Set<PedagogicalAction>();
    if (maxGuidance) allowedSet.add('guidance');
    if (maxStrategy) allowedSet.add('strategy');
    if (maxDraft) allowedSet.add('draft_recommendation');
    if (maxApproval) allowedSet.add('approval_submission');

    const allowedActions: PedagogicalAction[] = [];
    const blockedActions: PedagogicalAction[] = [];
    for (const action of ALL_PEDAGOGICAL_ACTIONS) {
      if (allowedSet.has(action)) {
        allowedActions.push(action);
      } else {
        blockedActions.push(action);
      }
    }

    const requested = input.requestedAction;
    const isAllowed = allowedSet.has(requested);

    let status: DecisionStatus;
    let blockReason: DecisionBlockReason | undefined = undefined;

    const potentialClarifications = ClarificationEngine.generateRequests(contextMissingRequirements, requested);
    let clarificationRequests: ClarificationRequest[] = [];

    if (isCriticallyBlocked) {
      status = 'blocked';
      blockReason = 'CONTEXT_BLOCKED';
      evidenceList.push(Object.freeze({
        ruleCode: 'REQUESTED_ACTION_BLOCKED',
        requirementMet: 'Context is critically blocked',
        contextFieldsUsed: Object.freeze([]),
        sourceReferences: Object.freeze([]),
        reasoning: 'Critical missing context blocks all operations.'
      }));
    } else if (isAllowed) {
      status = 'ready';
      evidenceList.push(Object.freeze({
        ruleCode: 'REQUESTED_ACTION_ALLOWED',
        requirementMet: 'Requested action within capability bounds',
        contextFieldsUsed: Object.freeze([]),
        sourceReferences: Object.freeze([]),
        reasoning: 'The requested action satisfies the hierarchy and PER-1.1 boundary.'
      }));
    } else {
      if (potentialClarifications.length > 0) {
        status = 'clarification_required';
        blockReason = 'MISSING_REQUIRED_CONTEXT';
        clarificationRequests = [...potentialClarifications];
        evidenceList.push(Object.freeze({
          ruleCode: 'REQUESTED_ACTION_REQUIRES_CLARIFICATION',
          requirementMet: 'Missing fields can be clarified',
          contextFieldsUsed: Object.freeze(clarificationRequests.map(c => c.missingField as keyof PedagogicalContext)),
          sourceReferences: Object.freeze([]),
          reasoning: 'Relevant missing requirements were found that can unlock this action.'
        }));
      } else {
        status = 'blocked';
        blockReason = 'PER1_CAPABILITY_DENIED';
        evidenceList.push(Object.freeze({
          ruleCode: 'REQUESTED_ACTION_BLOCKED',
          requirementMet: 'No relevant missing requirements or hard limit hit',
          contextFieldsUsed: Object.freeze([]),
          sourceReferences: Object.freeze([]),
          reasoning: 'The action is blocked by policy or hard capability boundary and cannot be clarified.'
        }));
      }
    }

    evidenceList.push(Object.freeze({
      ruleCode: 'ACTION_HIERARCHY_ENFORCED',
      requirementMet: 'Hierarchy evaluated restrictively',
      contextFieldsUsed: Object.freeze([]),
      sourceReferences: Object.freeze([]),
      reasoning: 'The strict capability hierarchy was enforced without expanding PER-1.1 boundaries.'
    }));

    const confidence = this.calculateConfidence(isCriticallyBlocked, contextMissingRequirements.length, contextWarnings.length, ctx.evidence);

    const resolution: PedagogicalDecisionResolution = {
      requestedAction: requested,
      status,
      ...(blockReason ? { blockReason } : {}),
      allowedActions: Object.freeze(allowedActions),
      blockedActions: Object.freeze(blockedActions),
      restrictions: Object.freeze([]), // Pass-through
      clarificationRequests: Object.freeze(clarificationRequests),
      confidence: Object.freeze(confidence),
      evidence: Object.freeze(evidenceList),
      diagnostics: Object.freeze(diagnostics),
      contextCapabilities,
      contextWarnings,
      contextMissingRequirements,
      evaluatedAt: input.evaluatedAt
    };

    this.verifyInvariants(resolution);

    return Object.freeze(resolution);
  }

  private static isValidISO8601(dateString: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    if (!iso8601Regex.test(dateString)) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  private static calculateConfidence(
    isBlocked: boolean,
    missingCount: number,
    warningsCount: number,
    evidence: readonly AnyContextEvidence[]
  ): DecisionConfidence {
    if (isBlocked) {
      return { level: 'none', determiningFactors: Object.freeze(['Context is critically blocked.']) };
    }

    const hasOnlyAuthoritative = evidence.length > 0 && evidence.every(e => e.isAuthoritative === true);

    if (warningsCount === 0 && missingCount === 0 && hasOnlyAuthoritative) {
      return { level: 'high', determiningFactors: Object.freeze(['Zero warnings', '100% authoritative sources', 'Zero missing requirements']) };
    }

    if (missingCount === 0 && warningsCount > 0) {
      return { level: 'medium', determiningFactors: Object.freeze(['Context complete but has warnings', 'Mixed authoritative sources']) };
    }

    return { level: 'low', determiningFactors: Object.freeze(['Missing requirements or dependent on fallback values']) };
  }

  private static verifyInvariants(res: PedagogicalDecisionResolution): void {
    const allowed = new Set(res.allowedActions);
    const blocked = new Set(res.blockedActions);
    for (const a of allowed) {
      if (blocked.has(a)) throw new Error('Invariant violation: Intersecting sets');
    }
    if (allowed.size + blocked.size !== ALL_PEDAGOGICAL_ACTIONS.length) {
      throw new Error('Invariant violation: Incomplete partition');
    }
    
    let allowedIdx = 0;
    let blockedIdx = 0;
    for (let i = 0; i < ALL_PEDAGOGICAL_ACTIONS.length; i++) {
      const canonical = ALL_PEDAGOGICAL_ACTIONS[i];
      if (!canonical) continue;
      if (allowed.has(canonical)) {
        if (res.allowedActions[allowedIdx] !== canonical) throw new Error('Invariant violation: Invalid canonical order');
        allowedIdx++;
      } else {
        if (res.blockedActions[blockedIdx] !== canonical) throw new Error('Invariant violation: Invalid canonical order');
        blockedIdx++;
      }
    }

    if (allowed.has('approval_submission') && !allowed.has('draft_recommendation')) throw new Error('Hierarchy violation');
    if (allowed.has('draft_recommendation') && !allowed.has('strategy')) throw new Error('Hierarchy violation');
    if (allowed.has('strategy') && !allowed.has('guidance')) throw new Error('Hierarchy violation');
    
    if (res.status === 'ready' && !allowed.has(res.requestedAction)) throw new Error('Status violation: ready but not allowed');
    if (res.status !== 'ready' && allowed.has(res.requestedAction)) throw new Error('Status violation: not ready but allowed');
  }
}
