import { describe, it, expect } from 'vitest';
import { RequiredObservationPolicy } from '../policies/RequiredObservationPolicy';
import { PlanningPolicyContext } from '../policies/PlanningPolicyContext';

describe('RequiredObservationPolicy', () => {
  const policy = new RequiredObservationPolicy();
  const ctx = {
    targetId: '1', timestamp: new Date(), validFrom: new Date(), validUntil: new Date(),
    schoolPeriodStart: new Date(), schoolPeriodEnd: new Date(),
    authorId: 'u1', existingPlans: []
  };

  it('passes with no warnings if observation met', () => {
    const res = policy.evaluate({ ...ctx, activities: [{id: '1', name: 'A', requiresObservation: true, hasObservation: true}] } as PlanningPolicyContext);
    expect(res.passed).toBe(true);
    expect(res.warnings.length).toBe(0);
  });

  it('passes but gives warning if observation missing', () => {
    const res = policy.evaluate({ ...ctx, activities: [{id: '1', name: 'A', requiresObservation: true, hasObservation: false}] } as PlanningPolicyContext);
    expect(res.passed).toBe(true);
    expect(res.warnings.length).toBe(1);
    expect(res.warnings[0]!.code.value).toBe('PLN-003');
  });
});
