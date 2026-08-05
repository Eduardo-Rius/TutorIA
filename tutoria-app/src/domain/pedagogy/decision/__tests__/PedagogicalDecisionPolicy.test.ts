import { describe, it, expect } from 'vitest';
import { PedagogicalDecisionPolicy } from '../PedagogicalDecisionPolicy';
import { PedagogicalDecisionInput, ALL_PEDAGOGICAL_ACTIONS, PedagogicalAction, DecisionRuleCode } from '../Contracts';
import { 
  PedagogicalContextResolution, 
  ContextCompleteness, 
  PedagogicalWarning, 
  MissingContextRequirement, 
  AnyContextEvidence,
  PedagogicalContext,
  PartialPedagogicalContext
} from '../../context/Contracts';

// Type-safe factories
const createMockWarning = (overrides: Partial<PedagogicalWarning> = {}): PedagogicalWarning => ({
  field: 'pedagogicalIntent',
  message: 'Intent is vague',
  sourceType: 'system_default',
  ...overrides
});

const createMockMissingRequirement = (overrides: Partial<MissingContextRequirement> = {}): MissingContextRequirement => ({
  field: 'pedagogicalIntent',
  reason: 'Required for strategy',
  severity: 'high',
  remediation: 'Provide intent',
  blocksRecommendation: true,
  ...overrides
});

const createMockEvidence = (overrides: Partial<AnyContextEvidence> = {}): AnyContextEvidence => {
  return {
    field: 'generatedAt',
    value: '2026-08-05T12:00:00Z',
    sourceType: 'user_provided',
    sourceReference: 'user-input',
    capturedAt: '2026-08-05T12:00:00Z',
    confidence: 1,
    isAuthoritative: true,
    isSelected: true,
    ...overrides
  } as AnyContextEvidence;
};

const createMockContext = (overrides: Partial<PedagogicalContext> = {}, omitFields: (keyof PedagogicalContext)[] = []): PedagogicalContext | PartialPedagogicalContext => {
  const base: Partial<PedagogicalContext> = {
    actorId: 'actor-1',
    actorRole: 'educator',
    institutionId: 'inst-1',
    childcareCenterId: 'center-1',
    roomId: 'room-a',
    groupId: 'group-1',
    ageRange: '4-5',
    planningId: 'plan-1',
    planningStatus: 'draft',
    planningPeriod: 'Q1',
    observations: [],
    pedagogicalIntent: 'Teach math',
    institutionalFrameworkIds: [],
    knowledgeResourceIds: [],
    previousExperienceIds: [],
    applicablePolicies: [],
    locale: 'es-MX',
    generatedAt: '2026-08-05T12:00:00Z',
    ...overrides
  };
  for (const field of omitFields) {
    delete base[field];
  }
  return base;
};

const createMockResolution = (
  overrides: Partial<PedagogicalContextResolution> = {}, 
  omitContextFields: (keyof PedagogicalContext)[] = []
): PedagogicalContextResolution => ({
  context: createMockContext(overrides.context as Partial<PedagogicalContext>, omitContextFields),
  completeness: 'complete' as ContextCompleteness,
  canProvideGuidance: true,
  canGenerateDraft: true,
  canSubmitForApproval: true,
  missingRequirements: [],
  warnings: [],
  evidence: [createMockEvidence()],
  resolutionReason: 'Mocked',
  ...overrides
});

const createInput = (
  requestedAction: PedagogicalAction,
  contextOverrides: Partial<PedagogicalContextResolution> = {},
  evaluatedAt: string = '2026-08-05T12:00:00Z',
  omitContextFields: (keyof PedagogicalContext)[] = []
): PedagogicalDecisionInput => ({
  contextResolution: createMockResolution(contextOverrides, omitContextFields),
  requestedAction,
  evaluatedAt
});

describe('PedagogicalDecisionPolicy', () => {

  describe('Basic Validation & Invariants', () => {
    it('1. should accept valid ISO-8601 evaluatedAt without diagnostics', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {}, '2026-08-05T12:00:00Z'));
      expect(res.diagnostics).toHaveLength(0);
      expect(res.evaluatedAt).toBe('2026-08-05T12:00:00Z');
    });

    it('2. should emit INVALID_EVALUATED_AT diagnostic for invalid dates and preserve exactly', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {}, 'not-a-date'));
      expect(res.diagnostics).toHaveLength(1);
      const diag = res.diagnostics[0];
      if (!diag) throw new Error('Missing diagnostic');
      expect(diag.code).toBe('INVALID_EVALUATED_AT');
      expect(res.evaluatedAt).toBe('not-a-date');
    });

    it('3. should return contextWarnings structurally equivalent and deeply frozen', () => {
      const warnings = [createMockWarning()];
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', { warnings }, 'invalid-date'));
      expect(res.contextWarnings).toEqual(warnings);
      expect(res.contextWarnings).not.toBe(warnings); 
      expect(Object.isFrozen(res.contextWarnings)).toBe(true);
      expect(res.diagnostics).toHaveLength(1); // Didn't contaminate
    });

    it('4. should enforce complete partition invariant', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', { canGenerateDraft: false, canSubmitForApproval: false }));
      const allowed = new Set(res.allowedActions);
      const blocked = new Set(res.blockedActions);
      const intersection = [...allowed].filter(x => blocked.has(x));
      expect(intersection).toHaveLength(0);
      expect(new Set([...allowed, ...blocked]).size).toBe(ALL_PEDAGOGICAL_ACTIONS.length);
    });

    it('5. should enforce canonical ordering in partition arrays', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance'));
      const combined = [...res.allowedActions, ...res.blockedActions].sort((a, b) => 
        ALL_PEDAGOGICAL_ACTIONS.indexOf(a) - ALL_PEDAGOGICAL_ACTIONS.indexOf(b)
      );
      expect(combined).toEqual([...ALL_PEDAGOGICAL_ACTIONS]);
    });

    it('6. should be deterministic on repeated executions', () => {
      const input = createInput('approval_submission', { 
        canSubmitForApproval: false,
        missingRequirements: [createMockMissingRequirement({ field: 'roomId' })]
      });
      const res1 = PedagogicalDecisionPolicy.evaluate(input);
      const res2 = PedagogicalDecisionPolicy.evaluate(input);
      expect(res1).toEqual(res2);
    });

    it('7. should freeze all collections deeply', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', { 
        warnings: [createMockWarning()],
        missingRequirements: [createMockMissingRequirement()]
      }));
      expect(Object.isFrozen(res)).toBe(true);
      expect(Object.isFrozen(res.allowedActions)).toBe(true);
      expect(Object.isFrozen(res.blockedActions)).toBe(true);
      expect(Object.isFrozen(res.clarificationRequests)).toBe(true);
      expect(Object.isFrozen(res.diagnostics)).toBe(true);
      expect(Object.isFrozen(res.contextWarnings)).toBe(true);
      expect(Object.isFrozen(res.evidence)).toBe(true);
    });
  });

  describe('PER-1.1 Capability Ceiling & Restrictive Hierarchy', () => {
    it('8. should emit INCONSISTENT_CONTEXT_CAPABILITIES for submit=true, draft=false with strict semantic shape', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission', { 
        canSubmitForApproval: true, 
        canGenerateDraft: false,
        canProvideGuidance: true,
        completeness: 'complete'
      }, '2026-08-05T12:00:00Z'));
      
      const diag = res.diagnostics.find(d => d.code === 'INCONSISTENT_CONTEXT_CAPABILITIES');
      expect(diag).toBeDefined();
      if (diag && diag.code === 'INCONSISTENT_CONTEXT_CAPABILITIES') {
        expect(diag.field).toBe('contextCapabilities');
        expect(diag.receivedValue).toBeDefined();
        expect(diag.receivedValue).toEqual({
          completeness: 'complete',
          canProvideGuidance: true,
          canGenerateDraft: false,
          canSubmitForApproval: true
        });
        expect(Object.isFrozen(diag.receivedValue)).toBe(true);
        expect(res.evaluatedAt).toBe('2026-08-05T12:00:00Z');
      }
    });

    it('9. should emit INCONSISTENT_CONTEXT_CAPABILITIES for draft=true, guidance=false', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', { 
        canGenerateDraft: true, 
        canProvideGuidance: false 
      }));
      expect(res.diagnostics.find(d => d.code === 'INCONSISTENT_CONTEXT_CAPABILITIES')).toBeDefined();
    });

    it('10. should emit INCONSISTENT_CONTEXT_CAPABILITIES for completeness=blocked but capacities true', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', { 
        completeness: 'blocked',
        canProvideGuidance: true
      }));
      expect(res.diagnostics.find(d => d.code === 'INCONSISTENT_CONTEXT_CAPABILITIES')).toBeDefined();
    });

    it('11. should restrict draft to false if guidance is false, never expanding ceiling', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', { 
        canProvideGuidance: false,
        canGenerateDraft: true 
      }));
      expect(res.allowedActions).not.toContain('draft_recommendation');
      expect(res.allowedActions).not.toContain('guidance');
    });

    it('12. should restrict submission to false if draft is false', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission', { 
        canGenerateDraft: false,
        canSubmitForApproval: true 
      }));
      expect(res.allowedActions).not.toContain('approval_submission');
    });

    it('13. should handle repeated contradictory inputs identically', () => {
      const input = createInput('approval_submission', { canSubmitForApproval: true, canGenerateDraft: false });
      const res1 = PedagogicalDecisionPolicy.evaluate(input);
      const res2 = PedagogicalDecisionPolicy.evaluate(input);
      expect(res1).toEqual(res2);
    });
  });

  describe('Strategy Derivation', () => {
    it('14. should derive strategy = true if guidance true and intent, group, age exist', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy'));
      expect(res.allowedActions).toContain('strategy');
      expect(res.evidence.find(e => e.ruleCode === 'STRATEGY_CAPABILITY_DERIVED')).toBeDefined();
    });

    it('15. should block strategy if pedagogicalIntent is missing', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {}, undefined, ['pedagogicalIntent']));
      expect(res.allowedActions).not.toContain('strategy');
      const ruleCode: DecisionRuleCode = 'PER1_CAPABILITY_BOUNDARY';
      expect(res.evidence.find(e => e.ruleCode === ruleCode)).toBeDefined();
    });

    it('16. should block strategy if groupId is missing', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {}, undefined, ['groupId']));
      expect(res.allowedActions).not.toContain('strategy');
    });

    it('17. should block strategy if ageRange is missing', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {}, undefined, ['ageRange']));
      expect(res.allowedActions).not.toContain('strategy');
    });
  });

  describe('Clarification Honesty & Action Hierarchy', () => {
    it('18. should require clarification for strategy if groupId is missing (relevant)', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {
        missingRequirements: [createMockMissingRequirement({ field: 'groupId' })]
      }, undefined, ['groupId']));
      expect(res.status).toBe('clarification_required');
      expect(res.clarificationRequests).toHaveLength(1);
    });

    it('19. should BLOCK (not clarify) if requested is strategy but missing requirement is institutionId (irrelevant to strategy)', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {
        missingRequirements: [createMockMissingRequirement({ field: 'institutionId' })]
      }, undefined, ['groupId']));
      expect(res.status).toBe('blocked');
      expect(res.blockReason).toBe('PER1_CAPABILITY_DENIED');
      expect(res.clarificationRequests).toHaveLength(0);
    });

    it('20. should require clarification for approval_submission if institutionId is missing', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission', {
        canSubmitForApproval: false,
        missingRequirements: [createMockMissingRequirement({ field: 'institutionId' })]
      }));
      expect(res.status).toBe('clarification_required');
      expect(res.clarificationRequests).toHaveLength(1);
      const req = res.clarificationRequests[0];
      if (!req) throw new Error('Missing request');
      expect(req.missingField).toBe('institutionId');
    });

    it('21. should BLOCK approval_submission if PER-1.1 denies it and missing field is irrelevant to approval', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission', {
        canSubmitForApproval: false,
        missingRequirements: []
      }));
      expect(res.status).toBe('blocked');
      expect(res.blockReason).toBe('PER1_CAPABILITY_DENIED');
    });
    
    it('22. should evaluate action guidance as ready if allowed', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance'));
      expect(res.status).toBe('ready');
      expect(res.evidence.find(e => e.ruleCode === 'REQUESTED_ACTION_ALLOWED')).toBeDefined();
    });

    it('23. should evaluate action draft_recommendation as ready if allowed', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation'));
      expect(res.status).toBe('ready');
    });

    it('24. should evaluate action approval_submission as ready if allowed', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission'));
      expect(res.status).toBe('ready');
    });

    it('25. should evaluate action strategy as ready if allowed', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy'));
      expect(res.status).toBe('ready');
    });

    it('26. should BLOCK completely if completeness is blocked (CONTEXT_BLOCKED)', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        completeness: 'blocked',
        canProvideGuidance: false,
        canGenerateDraft: false,
        canSubmitForApproval: false
      }));
      expect(res.status).toBe('blocked');
      expect(res.blockReason).toBe('CONTEXT_BLOCKED');
      expect(res.allowedActions).toHaveLength(0);
    });

    it('27. CONTEXT_BLOCKED should override missing requirements and return blocked', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        completeness: 'blocked',
        canProvideGuidance: false,
        canGenerateDraft: false,
        canSubmitForApproval: false,
        missingRequirements: [createMockMissingRequirement({ field: 'groupId' })]
      }));
      expect(res.status).toBe('blocked');
      expect(res.blockReason).toBe('CONTEXT_BLOCKED');
    });

    it('28. should properly set confidence = none if critically blocked', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        completeness: 'blocked',
        canProvideGuidance: false,
        canGenerateDraft: false,
        canSubmitForApproval: false
      }));
      expect(res.confidence.level).toBe('none');
    });

    it('29. should properly set confidence = high if 0 warnings, 0 missing, 100% authoritative', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        warnings: [],
        missingRequirements: [],
        evidence: [createMockEvidence({ isAuthoritative: true })]
      }));
      expect(res.confidence.level).toBe('high');
    });

    it('30. should properly set confidence = medium if 0 missing but has warnings', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        warnings: [createMockWarning()],
        missingRequirements: []
      }));
      expect(res.confidence.level).toBe('medium');
    });

    it('31. should properly set confidence = low if missing requirements exist', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        warnings: [],
        missingRequirements: [createMockMissingRequirement()]
      }));
      expect(res.confidence.level).toBe('low');
    });
  });

  describe('Evidence completeness', () => {
    it('32. should have evidence for REQUESTED_ACTION_ALLOWED when ready', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance'));
      expect(res.evidence.find(e => e.ruleCode === 'REQUESTED_ACTION_ALLOWED')).toBeDefined();
    });

    it('33. should have evidence for REQUESTED_ACTION_BLOCKED when PER1_CAPABILITY_DENIED', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission', {
        canSubmitForApproval: false,
        missingRequirements: []
      }));
      expect(res.evidence.find(e => e.ruleCode === 'REQUESTED_ACTION_BLOCKED')).toBeDefined();
    });

    it('34. should have evidence for REQUESTED_ACTION_REQUIRES_CLARIFICATION when relevant reqs exist', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {
        missingRequirements: [createMockMissingRequirement({ field: 'groupId' })]
      }, undefined, ['groupId']));
      expect(res.evidence.find(e => e.ruleCode === 'REQUESTED_ACTION_REQUIRES_CLARIFICATION')).toBeDefined();
    });

    it('35. should have evidence for REQUESTED_ACTION_BLOCKED when CONTEXT_BLOCKED', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        completeness: 'blocked',
        canProvideGuidance: false,
        canGenerateDraft: false,
        canSubmitForApproval: false
      }));
      expect(res.evidence.find(e => e.ruleCode === 'REQUESTED_ACTION_BLOCKED')).toBeDefined();
    });

    it('36. should have evidence for ACTION_HIERARCHY_ENFORCED in all decisions', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance'));
      expect(res.evidence.find(e => e.ruleCode === 'ACTION_HIERARCHY_ENFORCED')).toBeDefined();
    });

    it('37. evidence list must not be empty for ready', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance'));
      expect(res.evidence.length).toBeGreaterThan(0);
    });

    it('38. evidence list must not be empty for blocked', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission', { canSubmitForApproval: false }));
      expect(res.evidence.length).toBeGreaterThan(0);
    });

    it('39. evidence list must not be empty for clarification_required', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {
        missingRequirements: [createMockMissingRequirement({ field: 'groupId' })]
      }, undefined, ['groupId']));
      expect(res.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('Adversarial Cases', () => {
    it('40. should treat requestedAction draft_recommendation with false capabilities but valid missing fields', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', {
        canGenerateDraft: false,
        missingRequirements: [createMockMissingRequirement({ field: 'roomId' })]
      }));
      expect(res.status).toBe('clarification_required');
      expect(res.clarificationRequests).toHaveLength(1);
    });

    it('41. should block draft_recommendation if missing fields are only for approval_submission (irrelevant to draft)', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', {
        canGenerateDraft: false,
        missingRequirements: [createMockMissingRequirement({ field: 'institutionId' })]
      }));
      expect(res.status).toBe('blocked');
      expect(res.blockReason).toBe('PER1_CAPABILITY_DENIED');
      expect(res.clarificationRequests).toHaveLength(0);
    });

    it('42. should allow guidance even if everything else is denied', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        canProvideGuidance: true,
        canGenerateDraft: false,
        canSubmitForApproval: false
      }, undefined, ['pedagogicalIntent']));
      expect(res.status).toBe('ready');
      expect(res.allowedActions).toContain('guidance');
      expect(res.allowedActions).not.toContain('strategy');
      expect(res.allowedActions).not.toContain('draft_recommendation');
      expect(res.allowedActions).not.toContain('approval_submission');
    });

    it('43. An unmapped missing field creates zero clarification requests and preserves in contextMissingRequirements', () => {
      // "childcareCenterId" is not in ClarificationEngine mapping
      const res = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {
        missingRequirements: [createMockMissingRequirement({ field: 'childcareCenterId' })]
      }, undefined, ['groupId']));
      expect(res.clarificationRequests).toHaveLength(0);
      expect(res.status).toBe('blocked');
      expect(res.blockReason).toBe('PER1_CAPABILITY_DENIED');
      expect(res.contextMissingRequirements).toHaveLength(1);
      const missing = res.contextMissingRequirements[0];
      if (!missing) throw new Error('Missing contextMissingRequirement');
      expect(missing.field).toBe('childcareCenterId');
    });

    it('44. An unmapped missing field does not default to guidance', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('guidance', {
        missingRequirements: [createMockMissingRequirement({ field: 'childcareCenterId' })]
      }));
      expect(res.clarificationRequests).toHaveLength(0);
      expect(res.status).toBe('ready'); // Guidance is allowed, unmapped field doesn't trigger clarification
    });

    it('45. An approval-only field does not clarify strategy or draft', () => {
      // institutionId is mapped to approval_submission
      const resDraft = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', {
        canGenerateDraft: false,
        missingRequirements: [createMockMissingRequirement({ field: 'institutionId' })]
      }));
      expect(resDraft.clarificationRequests).toHaveLength(0);
      
      const resStrategy = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {
        missingRequirements: [createMockMissingRequirement({ field: 'institutionId' })]
      }, undefined, ['groupId']));
      expect(resStrategy.clarificationRequests).toHaveLength(0);
    });

    it('46. A draft dependency may clarify draft and approval, but not strategy or guidance', () => {
      // roomId is mapped to draft_recommendation
      const resApproval = PedagogicalDecisionPolicy.evaluate(createInput('approval_submission', {
        canSubmitForApproval: false,
        missingRequirements: [createMockMissingRequirement({ field: 'roomId' })]
      }));
      expect(resApproval.clarificationRequests).toHaveLength(1); // Relevant for approval
      
      const resDraft = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', {
        canGenerateDraft: false,
        missingRequirements: [createMockMissingRequirement({ field: 'roomId' })]
      }));
      expect(resDraft.clarificationRequests).toHaveLength(1); // Relevant for draft

      const resStrategy = PedagogicalDecisionPolicy.evaluate(createInput('strategy', {
        missingRequirements: [createMockMissingRequirement({ field: 'roomId' })]
      }, undefined, ['groupId']));
      expect(resStrategy.clarificationRequests).toHaveLength(0); // Irrelevant for strategy
    });

    it('47. Multiple mixed requirements return only relevant mapped requests in deterministic input order', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', {
        canGenerateDraft: false,
        missingRequirements: [
          createMockMissingRequirement({ field: 'institutionId' }), // Irrelevant for draft
          createMockMissingRequirement({ field: 'roomId' }), // Relevant for draft
          createMockMissingRequirement({ field: 'childcareCenterId' }), // Unmapped
          createMockMissingRequirement({ field: 'groupId' }) // Relevant for strategy (which is prerequisite of draft)
        ]
      }));
      
      expect(res.clarificationRequests).toHaveLength(2);
      // Order must be deterministic (preserved from input)
      const req0 = res.clarificationRequests[0];
      const req1 = res.clarificationRequests[1];
      if (!req0 || !req1) throw new Error('Missing requests');
      
      expect(req0.missingField).toBe('roomId');
      expect(req0.unlocksCapability).toBe('draft_recommendation');
      expect(req1.missingField).toBe('groupId');
      expect(req1.unlocksCapability).toBe('strategy');
    });

    it('48. Duplicate requirements do not create misleading capability assignments', () => {
      const res = PedagogicalDecisionPolicy.evaluate(createInput('draft_recommendation', {
        canGenerateDraft: false,
        missingRequirements: [
          createMockMissingRequirement({ field: 'roomId' }),
          createMockMissingRequirement({ field: 'roomId', reason: 'Another reason' })
        ]
      }));
      
      expect(res.clarificationRequests).toHaveLength(2);
      const req0 = res.clarificationRequests[0];
      const req1 = res.clarificationRequests[1];
      if (!req0 || !req1) throw new Error('Missing requests');
      
      expect(req0.unlocksCapability).toBe('draft_recommendation');
      expect(req1.unlocksCapability).toBe('draft_recommendation');
    });
  });
});
