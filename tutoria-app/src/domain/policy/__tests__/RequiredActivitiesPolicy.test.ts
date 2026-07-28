import { describe, it, expect } from 'vitest';
import { RequiredActivitiesPolicy } from '../policies/RequiredActivitiesPolicy';
import { PlanningPolicyContext } from '../policies/PlanningPolicyContext';

describe('RequiredActivitiesPolicy', () => {
  const policy = new RequiredActivitiesPolicy();
  const ctx = {
    targetId: '1', timestamp: new Date(), validFrom: new Date(), validUntil: new Date(),
    schoolPeriodStart: new Date(), schoolPeriodEnd: new Date(),
    authorId: 'u1', existingPlans: []
  };

  it('passes if has activities', () => {
    const res = policy.evaluate({ ...ctx, activities: [{id: '1', name: 'Act', requiresObservation: false}] } as PlanningPolicyContext);
    expect(res.passed).toBe(true);
  });

  it('fails if no activities', () => {
    const res = policy.evaluate({ ...ctx, activities: [] } as PlanningPolicyContext);
    expect(res.passed).toBe(false);
    expect(res.violations[0]!.code.value).toBe('PLN-004');
  });
});
