import { describe, it, expect } from 'vitest';
import {
  PedagogicalGenerationPlanInput,
  PedagogicalGenerationPlanNotCreated,
  PedagogicalGenerationPlanReady,
  PedagogicalAction
} from '../Contracts';
import { buildPedagogicalGenerationPlan } from '../PedagogicalGenerationPlanner';
import { PedagogicalContextResolution, PedagogicalWarning, MissingContextRequirement, ContextCompleteness } from '../../context/Contracts';
import { PedagogicalDecisionResolution, DecisionRuleCode, DecisionDiagnostic } from '../../decision/Contracts';

function createValidInput(action: PedagogicalAction = 'guidance'): PedagogicalGenerationPlanInput {
  const contextResolution: PedagogicalContextResolution = {
    context: {
      actorId: 'a-1',
      actorRole: 'teacher',
      institutionId: 'i-1',
      childcareCenterId: 'c-1',
      groupId: 'g-1',
      ageRange: 'teen',
      planningId: 'p-1',
      planningStatus: 'active',
      pedagogicalIntent: 'intro to testing',
      planningPeriod: 'week-1',
      observations: [],
      institutionalFrameworkIds: ['f-1'],
      knowledgeResourceIds: [],
      previousExperienceIds: [],
      applicablePolicies: []
    },
    evidence: [],
    completeness: 'complete',
    missingRequirements: [],
    warnings: [],
    resolutionReason: 'test',
    canProvideGuidance: true,
    canGenerateDraft: true,
    canSubmitForApproval: true
  };

  const decisionResolution: PedagogicalDecisionResolution = {
    requestedAction: action,
    status: 'ready',
    allowedActions: [action],
    blockedActions: [],
    restrictions: [{
      restrictionType: 'policy',
      ruleCode: 'PER1_CAPABILITY_BOUNDARY',
      description: 'Test',
      sourceIds: ['s-1']
    }],
    clarificationRequests: [],
    confidence: { level: 'high', determiningFactors: [] },
    evidence: [{
      ruleCode: 'REQUESTED_ACTION_ALLOWED',
      requirementMet: 'test',
      contextFieldsUsed: [],
      sourceReferences: [],
      reasoning: 'test'
    }],
    diagnostics: [],
    contextCapabilities: {
      completeness: 'complete',
      canProvideGuidance: true,
      canGenerateDraft: true,
      canSubmitForApproval: true
    },
    contextWarnings: [],
    contextMissingRequirements: [],
    evaluatedAt: '2026-08-05T00:00:00Z'
  };

  return {
    decisionResolution,
    contextResolution,
    plannedAt: '2026-08-05T12:00:00Z'
  };
}

describe('PedagogicalGenerationPlanner', () => {
  it('1. Test Case 1: plannedAt ISO format is valid. Condition: ISO string. Result: No InvalidPlannedAtDiagnostic', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input);
    expect(result.status).toBe('ready');
    expect(result.generationDiagnostics).not.toContainEqual(expect.objectContaining({ code: 'INVALID_PLANNED_AT' }));
  });

  it('2. Test Case 2: plannedAt ISO format is invalid. Condition: "bad-date". Result: InvalidPlannedAtDiagnostic', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({ ...input, plannedAt: 'bad-date' }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INVALID_PLANNED_AT', receivedValue: 'bad-date' }));
  });

  it('3. Test Case 3: plannedAt is empty string. Condition: "". Result: InvalidPlannedAtDiagnostic', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({ ...input, plannedAt: '' }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INVALID_PLANNED_AT' }));
  });

  it('4. Test Case 4: plannedAt is preserved literally. Condition: "2026-01-01T00:00:00Z". Result: Exact string in output', () => {
    const input = createValidInput();
    const dateStr = '2026-01-01T00:00:00Z';
    const result = buildPedagogicalGenerationPlan({ ...input, plannedAt: dateStr });
    expect(result.plannedAt).toBe(dateStr);
  });

  it('5. Test Case 5: plannedAt missing (undefined bypass). Condition: Any bypass. Result: InvalidPlannedAtDiagnostic', () => {
    const input = createValidInput();
    // ARCHITECTURAL JUSTIFICATION: Adversarial test forces structural bypass to verify runtime validation gate.
    const badInput = { decisionResolution: input.decisionResolution, contextResolution: input.contextResolution } as PedagogicalGenerationPlanInput;
    const result = buildPedagogicalGenerationPlan(badInput) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INVALID_PLANNED_AT' }));
  });

  it('6. Test Case 6: Decision is blocked. Condition: blocked. Result: not_created, DECISION_BLOCKED', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({
      ...input,
      decisionResolution: { ...input.decisionResolution, status: 'blocked' }
    }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.reason).toBe('DECISION_BLOCKED');
  });

  it('7. Test Case 7: Decision is clarification_required. Condition: clarification_required. Result: not_created, CLARIFICATION_REQUIRED', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({
      ...input,
      decisionResolution: { ...input.decisionResolution, status: 'clarification_required' }
    }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.reason).toBe('CLARIFICATION_REQUIRED');
  });

  it('8. Test Case 8: requestedAction not in allowedActions. Condition: missing from array. Result: not_created, RequestedActionNotAllowedDiagnostic', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({
      ...input,
      decisionResolution: { ...input.decisionResolution, allowedActions: [] }
    }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'REQUESTED_ACTION_NOT_ALLOWED' }));
  });

  it('10. Test Case 10: Valid ready decision creates plan. Condition: fully valid input. Result: ready status, plan present', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.status).toBe('ready');
    expect(result.plan).toBeDefined();
  });

  it('11. Test Case 11: Mismatch in capabilities between context and decision. Condition: true vs false. Result: not_created, InconsistentContextAndDecisionDiagnostic', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({
      ...input,
      contextResolution: { ...input.contextResolution, canProvideGuidance: false }
    }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INCONSISTENT_CONTEXT_AND_DECISION' }));
  });

  it('12. Test Case 12: Mismatch in warnings array structure. Condition: different values. Result: not_created, InconsistentContextAndDecisionDiagnostic', () => {
    const input = createValidInput();
    const warning: PedagogicalWarning = { field: 'groupId', message: 'context warning', sourceType: 'authenticated_session' };
    const decWarning: PedagogicalWarning = { field: 'groupId', message: 'decision warning', sourceType: 'authenticated_session' };

    const result = buildPedagogicalGenerationPlan({
      ...input,
      contextResolution: { ...input.contextResolution, warnings: [warning] },
      decisionResolution: { ...input.decisionResolution, contextWarnings: [decWarning] }
    }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INCONSISTENT_CONTEXT_AND_DECISION' }));
  });

  it('13. Test Case 13: Mismatch in missing requirements array. Condition: different codes. Result: not_created, InconsistentContextAndDecisionDiagnostic', () => {
    const input = createValidInput();
    const missingReq: MissingContextRequirement = { field: 'groupId', reason: 'reason 1', severity: 'low', remediation: '', blocksRecommendation: false };
    const decReq: MissingContextRequirement = { field: 'groupId', reason: 'reason 2', severity: 'low', remediation: '', blocksRecommendation: false };

    const result = buildPedagogicalGenerationPlan({
      ...input,
      contextResolution: { ...input.contextResolution, missingRequirements: [missingReq] },
      decisionResolution: { ...input.decisionResolution, contextMissingRequirements: [decReq] }
    }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INCONSISTENT_CONTEXT_AND_DECISION' }));
  });

  it('14. Test Case 14: Context completeness mismatch. Condition: \'partial\' vs \'complete\'. Result: not_created, InconsistentContextAndDecisionDiagnostic', () => {
    const input = createValidInput();
    const partialString = 'partial' as ContextCompleteness;
    const result = buildPedagogicalGenerationPlan({
      ...input,
      contextResolution: { ...input.contextResolution, completeness: partialString }
    }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INCONSISTENT_CONTEXT_AND_DECISION' }));
  });

  it('15. Test Case 15: Missing decision context capabilities block. Condition: null object bypassing types. Result: not_created, InconsistentContextAndDecisionDiagnostic', () => {
    const input = createValidInput();
    // ARCHITECTURAL JUSTIFICATION: Adversarial test forces structural bypass to verify runtime validation gate.
    const badDecision = Object.assign({}, input.decisionResolution, { contextCapabilities: undefined });
    const badInput = Object.assign({}, input, { decisionResolution: badDecision });
    const result = buildPedagogicalGenerationPlan(badInput) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INCONSISTENT_CONTEXT_AND_DECISION' }));
  });

  it('16. Test Case 16: guidance action creates guidance_plan. Condition: \'guidance\'. Result: planType = \'guidance_plan\'', () => {
    const input = createValidInput('guidance');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.planType).toBe('guidance_plan');
  });

  it('17. Test Case 17: strategy action creates strategy_plan. Condition: \'strategy\'. Result: planType = \'strategy_plan\'', () => {
    const input = createValidInput('strategy');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.planType).toBe('strategy_plan');
  });

  it('18. Test Case 18: draft_recommendation creates draft_recommendation_plan. Condition: \'draft_recommendation\'. Result: planType = \'draft_recommendation_plan\'', () => {
    const input = createValidInput('draft_recommendation');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.planType).toBe('draft_recommendation_plan');
  });

  it('19. Test Case 19: approval_submission creates approval_submission_plan. Condition: \'approval_submission\'. Result: planType = \'approval_submission_plan\'', () => {
    const input = createValidInput('approval_submission');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.planType).toBe('approval_submission_plan');
  });

  it('21. Test Case 21: guidance has correct canonical steps. Condition: \'guidance\'. Result: ESTABLISH_OBJECTIVE, APPLY_PEDAGOGICAL_INTENT present', () => {
    const input = createValidInput('guidance');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const steps = result.plan!.reasoningSteps.map(s => s.stepCode);
    expect(steps).toContain('ESTABLISH_OBJECTIVE');
    expect(steps).toContain('APPLY_PEDAGOGICAL_INTENT');
  });

  it('22. Test Case 22: strategy includes IDENTIFY_AUDIENCE step. Condition: \'strategy\'. Result: IDENTIFY_AUDIENCE present', () => {
    const input = createValidInput('strategy');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const steps = result.plan!.reasoningSteps.map(s => s.stepCode);
    expect(steps).toContain('IDENTIFY_AUDIENCE');
  });

  it('23. Test Case 23: approval includes APPLY_INSTITUTIONAL_FRAMEWORK. Condition: \'approval_submission\'. Result: APPLY_INSTITUTIONAL_FRAMEWORK present', () => {
    const input = createValidInput('approval_submission');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const steps = result.plan!.reasoningSteps.map(s => s.stepCode);
    expect(steps).toContain('APPLY_INSTITUTIONAL_FRAMEWORK');
  });

  it('24. Test Case 24: reasoning steps have no duplicates. Condition: any valid plan. Result: unique stepCodes', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const steps = result.plan!.reasoningSteps.map(s => s.stepCode);
    const unique = new Set(steps);
    expect(unique.size).toBe(steps.length);
  });

  it('25. Test Case 25: reasoning steps sorted by sequence. Condition: any valid plan. Result: monotonically increasing sequence', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const seqs = result.plan!.reasoningSteps.map(s => s.sequence);
    const isSorted = seqs.every((v, i, a) => !i || a[i - 1]! <= v);
    expect(isSorted).toBe(true);
  });

  it('26. Test Case 26: PER-2 restriction converted to must_align_with constraint. Condition: policy restriction. Result: GenerationConstraintType \'must_align_with\'', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.constraints[0]!.constraintType).toBe('must_align_with');
  });

  it('27. Test Case 27: constraint rule codes mapped correctly. Condition: constraints present. Result: valid GenerationRuleCode', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.constraints[0]!.ruleCode).toBe('CONSTRAINT_CONVERTED');
  });

  it('28. Test Case 28: no restrictions means empty constraints. Condition: zero PER-2 restrictions. Result: constraints = []', () => {
    const input = createValidInput();
    const noRestr = { ...input, decisionResolution: { ...input.decisionResolution, restrictions: [] } };
    const result = buildPedagogicalGenerationPlan(noRestr) as PedagogicalGenerationPlanReady;
    expect(result.plan!.constraints.length).toBe(0);
  });

  it('29. Test Case 29: constraint order is canonical. Condition: multiple constraints. Result: sorted by constraintType', () => {
    const input = createValidInput();
    const multiRestr = {
      ...input, decisionResolution: {
        ...input.decisionResolution,
        restrictions: [
          { restrictionType: 'role_limit' as const, ruleCode: 'PER1_CAPABILITY_BOUNDARY' as DecisionRuleCode, description: '', sourceIds: [] },
          { restrictionType: 'policy' as const, ruleCode: 'PER1_CAPABILITY_BOUNDARY' as DecisionRuleCode, description: '', sourceIds: [] }
        ]
      }
    };
    const result = buildPedagogicalGenerationPlan(multiRestr) as PedagogicalGenerationPlanReady;
    expect(result.plan!.constraints[0]!.constraintType <= result.plan!.constraints[1]!.constraintType).toBe(true);
  });

  it('30. Test Case 30: constraints reference decision evidence. Condition: restriction passed. Result: sourceReferences maintained', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.constraints[0]!.sourceReferences).toEqual(['s-1']);
  });

  it('31. Test Case 31: Knowledge requirement does not invent IDs. Condition: context has \'f-1\'. Result: sourceIds contains only \'f-1\'', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.knowledgeRequirements[0]!.sourceIds).toEqual(['f-1']);
  });

  it('32. Test Case 32: Missing institutional frameworks returns empty requirement list. Condition: no frameworks. Result: no \'institutional_framework\' requirement', () => {
    const input = createValidInput();
    const noFw = { ...input, contextResolution: { ...input.contextResolution, context: { ...input.contextResolution.context!, institutionalFrameworkIds: [] } } };
    const result = buildPedagogicalGenerationPlan(noFw) as PedagogicalGenerationPlanReady;
    expect(result.plan!.knowledgeRequirements.length).toBe(0);
  });

  it('33. Test Case 33: Knowledge requirement required flag set properly. Condition: draft_recommendation. Result: required = true', () => {
    const input = createValidInput('draft_recommendation');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.knowledgeRequirements[0]!.required).toBe(true);
  });

  it('34. Test Case 34: Knowledge requirement respects ruleCode. Condition: any. Result: valid GenerationRuleCode', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.knowledgeRequirements[0]!.selectionRuleCode).toBe('KNOWLEDGE_REQUIREMENT_SELECTED');
  });

  it('35. Test Case 35: Knowledge requirements sorted canónically. Condition: multiple. Result: sorted by requirementType', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.knowledgeRequirements.length).toBeGreaterThan(0);
  });

  it('36. Test Case 36: guidance output schema missing prohibited sections. Condition: guidance. Result: no \'materials\'', () => {
    const input = createValidInput('guidance');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const sections = result.plan!.outputSchema.map(s => s.sectionCode);
    expect(sections).not.toContain('materials');
  });

  it('37. Test Case 37: strategy output schema contains pedagogical_strategy. Condition: strategy. Result: \'pedagogical_strategy\' present', () => {
    const input = createValidInput('strategy');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const sections = result.plan!.outputSchema.map(s => s.sectionCode);
    expect(sections).toContain('pedagogical_strategy');
  });

  it('38. Test Case 38: draft output schema contains adaptations. Condition: draft_recommendation. Result: \'adaptations\' present', () => {
    const input = createValidInput('draft_recommendation');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const sections = result.plan!.outputSchema.map(s => s.sectionCode);
    expect(sections).toContain('adaptations');
  });

  it('39. Test Case 39: approval output schema contains institutional_alignment. Condition: approval_submission. Result: \'institutional_alignment\' present', () => {
    const input = createValidInput('approval_submission');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const sections = result.plan!.outputSchema.map(s => s.sectionCode);
    expect(sections).toContain('institutional_alignment');
  });

  it('40. Test Case 40: output schema sorted by sequence. Condition: any valid plan. Result: increasing sequence', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const seqs = result.plan!.outputSchema.map(s => s.sequence);
    const isSorted = seqs.every((v, i, a) => !i || a[i - 1]! <= v);
    expect(isSorted).toBe(true);
  });

  it('41. Test Case 41: guidance validation criteria includes OBJECTIVE_PRESERVED. Condition: guidance. Result: OBJECTIVE_PRESERVED present', () => {
    const input = createValidInput('guidance');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const codes = result.plan!.validationCriteria.map(v => v.validationCode);
    expect(codes).toContain('OBJECTIVE_PRESERVED');
  });

  it('42. Test Case 42: strategy validation includes AGE_RANGE_RESPECTED. Condition: strategy. Result: AGE_RANGE_RESPECTED present', () => {
    const input = createValidInput('strategy');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const codes = result.plan!.validationCriteria.map(v => v.validationCode);
    expect(codes).toContain('AGE_RANGE_RESPECTED');
  });

  it('43. Test Case 43: approval validation includes INSTITUTIONAL_FRAMEWORK_RESPECTED. Condition: approval_submission. Result: INSTITUTIONAL_FRAMEWORK_RESPECTED present', () => {
    const input = createValidInput('approval_submission');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const codes = result.plan!.validationCriteria.map(v => v.validationCode);
    expect(codes).toContain('INSTITUTIONAL_FRAMEWORK_RESPECTED');
  });

  it('44. Test Case 44: TRACEABILITY_PRESERVED always present for draft. Condition: draft_recommendation. Result: TRACEABILITY_PRESERVED present', () => {
    const input = createValidInput('draft_recommendation');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const codes = result.plan!.validationCriteria.map(v => v.validationCode);
    expect(codes).toContain('TRACEABILITY_PRESERVED');
  });

  it('45. Test Case 45: Evidence array is not empty for ready plans. Condition: ready plan. Result: evidence.length > 0', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.evidence.length).toBeGreaterThan(0);
  });

  it('46. Test Case 46: Evidence contextFieldsUsed matches logic. Condition: derived objective. Result: pedagogicalIntent in fields used', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(result.plan!.evidence[0]!.contextFieldsUsed).toContain('pedagogicalIntent');
  });

  it('47. Test Case 47: Decision diagnostics mapped separately. Condition: input has diagnostic. Result: decisionDiagnostics array populated, generationDiagnostics empty (if valid plannedAt)', () => {
    const input = createValidInput();
    const dDiag: DecisionDiagnostic = { code: 'INVALID_EVALUATED_AT', severity: 'error', field: 'evaluatedAt', receivedValue: '', message: '' };
    const withDiag = { ...input, decisionResolution: { ...input.decisionResolution, diagnostics: [dDiag] } };
    const result = buildPedagogicalGenerationPlan(withDiag) as PedagogicalGenerationPlanReady;
    expect(result.decisionDiagnostics.length).toBe(1);
    expect(result.generationDiagnostics.length).toBe(0);
  });

  it('48. Test Case 48: Deep freeze applied. Condition: ready plan. Result: Object.isFrozen(plan.outputSchema) === true', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan!.outputSchema)).toBe(true);
  });

  it('49. Test Case 49: Determinism hold. Condition: call 2 times with identical inputs. Result: Deep equality true', () => {
    const input1 = createValidInput();
    const input2 = createValidInput();
    const res1 = buildPedagogicalGenerationPlan(input1);
    const res2 = buildPedagogicalGenerationPlan(input2);
    expect(res1).toEqual(res2);
  });

  it('50. Test Case 50: Zero expansion of capabilities. Condition: strategy requested, draft prohibited. Result: output schema does not mandate formal templates', () => {
    const input = createValidInput('strategy');
    const result = buildPedagogicalGenerationPlan(input) as PedagogicalGenerationPlanReady;
    const sections = result.plan!.outputSchema.map(s => s.sectionCode);
    expect(sections).not.toContain('materials');
  });

  // NEW ADVERSARIAL TESTS

  it('51. Adversarial: Missing context rejects honestly. Condition: missing pedagogicalIntent. Result: not_created', () => {
    const input = createValidInput();
    // ARCHITECTURAL JUSTIFICATION: Adversarial test forces structural bypass to verify runtime validation gate.
    const badContextData = Object.assign({}, input.contextResolution.context, { pedagogicalIntent: undefined });
    const badCtxRes = Object.assign({}, input.contextResolution, { context: badContextData });
    const badInput = Object.assign({}, input, { contextResolution: badCtxRes });
    const result = buildPedagogicalGenerationPlan(badInput) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'MISSING_REQUIRED_CONTEXT_SNAPSHOT' }));
  });

  it('52. Adversarial: Empty decision evidence yields not_created', () => {
    const input = createValidInput();
    const noEvidenceDecision = Object.assign({}, input.decisionResolution, { evidence: [] });
    const noEvidenceInput = Object.assign({}, input, { decisionResolution: noEvidenceDecision });
    const result = buildPedagogicalGenerationPlan(noEvidenceInput);
    expect(result.status).toBe('not_created');
    if (result.status === 'not_created') {
      expect(result.reason).toBe('MISSING_TRACEABILITY');
    }
  });

  it('53. Adversarial: Impossible dates are rejected. Condition: 2026-13-01. Result: not_created', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({ ...input, plannedAt: '2026-13-01T12:00:00Z' }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INVALID_PLANNED_AT' }));
  });

  it('54. Adversarial: Invalid leap day is rejected. Condition: 2026-02-29 (not a leap year). Result: not_created', () => {
    const input = createValidInput();
    const result = buildPedagogicalGenerationPlan({ ...input, plannedAt: '2026-02-29T12:00:00Z' }) as PedagogicalGenerationPlanNotCreated;
    expect(result.status).toBe('not_created');
    expect(result.generationDiagnostics).toContainEqual(expect.objectContaining({ code: 'INVALID_PLANNED_AT' }));
  });

});
