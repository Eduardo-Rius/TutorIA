import { describe, it, expect } from 'vitest';
import { DateOverlapPolicy } from '../policies/DateOverlapPolicy';
import { PlanningPolicyContext } from '../policies/PlanningPolicyContext';

describe('DateOverlapPolicy', () => {
  const policy = new DateOverlapPolicy();
  const getContext = (validFrom: string, validUntil: string, existing: Array<{ validFrom: Date; validUntil: Date }> = []): PlanningPolicyContext => ({
    targetId: '1',
    timestamp: new Date(),
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    schoolPeriodStart: new Date('2024-01-01'),
    schoolPeriodEnd: new Date('2024-12-31'),
    authorId: 'a1',
    activities: [],
    existingPlans: existing
  });

  it('passes when no overlap', () => {
    const ctx = getContext('2024-05-01', '2024-05-15', [
      { validFrom: new Date('2024-04-01'), validUntil: new Date('2024-04-30') }
    ]);
    const res = policy.evaluate(ctx);
    expect(res.passed).toBe(true);
  });

  it('fails when overlapping', () => {
    const ctx = getContext('2024-05-01', '2024-05-15', [
      { validFrom: new Date('2024-05-10'), validUntil: new Date('2024-05-20') }
    ]);
    const res = policy.evaluate(ctx);
    expect(res.passed).toBe(false);
    expect(res.violations[0]!.code.value).toBe('PLN-001');
  });

  it('fails on exact touching edges (if policy dictates inclusive overlap)', () => {
    const ctx = getContext('2024-05-01', '2024-05-15', [
      { validFrom: new Date('2024-05-15'), validUntil: new Date('2024-05-20') }
    ]);
    const res = policy.evaluate(ctx);
    expect(res.passed).toBe(false);
  });

  it('fails on invalid date range (from > until)', () => {
    const ctx = getContext('2024-05-15', '2024-05-01');
    const res = policy.evaluate(ctx);
    expect(res.passed).toBe(false);
    expect(res.violations[0]!.messageKey).toBe('planning.date.invalid_range');
  });

  it('handles leap year correctly', () => {
    const ctx = getContext('2024-02-28', '2024-03-01', [
      { validFrom: new Date('2024-02-29'), validUntil: new Date('2024-02-29') }
    ]);
    const res = policy.evaluate(ctx);
    expect(res.passed).toBe(false);
  });
});
