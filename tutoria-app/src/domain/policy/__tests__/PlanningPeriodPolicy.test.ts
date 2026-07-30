import { describe, it, expect } from 'vitest';
import { PlanningPeriodPolicy } from '../policies/PlanningPeriodPolicy';
import { PlanningPolicyContext } from '../policies/PlanningPolicyContext';

describe('PlanningPeriodPolicy', () => {
  const policy = new PlanningPeriodPolicy();
  const ctx = {
    targetId: '1', timestamp: new Date(),
    schoolPeriodStart: new Date('2024-01-01'), schoolPeriodEnd: new Date('2024-12-31'),
    authorId: 'u1', activities: [], existingPlans: []
  };

  it('passes if within period', () => {
    const res = policy.evaluate({ ...ctx, validFrom: new Date('2024-05-01'), validUntil: new Date('2024-05-30') } as PlanningPolicyContext);
    expect(res.passed).toBe(true);
  });

  it('fails if outside period', () => {
    const res = policy.evaluate({ ...ctx, validFrom: new Date('2023-12-01'), validUntil: new Date('2024-01-10') } as PlanningPolicyContext);
    expect(res.passed).toBe(false);
    expect(res.violations[0]!.code.value).toBe('PLN-002');
  });
});
