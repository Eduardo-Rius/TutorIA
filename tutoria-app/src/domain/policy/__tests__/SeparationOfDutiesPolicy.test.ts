import { describe, it, expect } from 'vitest';
import { SeparationOfDutiesPolicy } from '../policies/SeparationOfDutiesPolicy';
import { PlanningPolicyContext } from '../policies/PlanningPolicyContext';

describe('SeparationOfDutiesPolicy', () => {
  const policy = new SeparationOfDutiesPolicy();
  const ctx = {
    targetId: '1', timestamp: new Date(), validFrom: new Date(), validUntil: new Date(),
    schoolPeriodStart: new Date(), schoolPeriodEnd: new Date(),
    activities: [], existingPlans: []
  };

  it('passes if no approver', () => {
    const res = policy.evaluate({ ...ctx, authorId: 'u1' } as PlanningPolicyContext);
    expect(res.passed).toBe(true);
  });

  it('passes if approver is different', () => {
    const res = policy.evaluate({ ...ctx, authorId: 'u1', approverId: 'u2' } as PlanningPolicyContext);
    expect(res.passed).toBe(true);
  });

  it('fails if approver is author', () => {
    const res = policy.evaluate({ ...ctx, authorId: 'u1', approverId: 'u1' } as PlanningPolicyContext);
    expect(res.passed).toBe(false);
    expect(res.violations[0]!.code.value).toBe('PLN-005');
  });
});
