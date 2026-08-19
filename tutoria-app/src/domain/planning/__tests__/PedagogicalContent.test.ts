import { describe, it, expect } from 'vitest';
import { PedagogicalContent, DailyPedagogicalPlan, PlanningDay } from '../ValueObjects';

describe('PedagogicalContent Domain', () => {
  it('A. can represent the canonical Monday-Friday week', () => {
    const content = PedagogicalContent.createEmpty();
    expect(content.dailyPlans).toHaveLength(5);
    const days = content.dailyPlans.map(dp => dp.day);
    expect(days).toContain('MONDAY');
    expect(days).toContain('TUESDAY');
    expect(days).toContain('WEDNESDAY');
    expect(days).toContain('THURSDAY');
    expect(days).toContain('FRIDAY');
  });

  it('B & C. Each weekday identity is unique and duplicate weekday identity is rejected', () => {
    const result = PedagogicalContent.create([
      DailyPedagogicalPlan.create({ day: 'MONDAY' }),
      DailyPedagogicalPlan.create({ day: 'MONDAY' }), // Duplicate!
      DailyPedagogicalPlan.create({ day: 'WEDNESDAY' }),
      DailyPedagogicalPlan.create({ day: 'THURSDAY' }),
      DailyPedagogicalPlan.create({ day: 'FRIDAY' })
    ]);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('duplicate days');
  });

  it('D. Unsupported weekday identity cannot enter canonical state', () => {
    // TypeScript prevents passing invalid literal strings, but we simulate it via casting
    const result = PedagogicalContent.create([
      DailyPedagogicalPlan.create({ day: 'MONDAY' }),
      DailyPedagogicalPlan.create({ day: 'TUESDAY' }),
      DailyPedagogicalPlan.create({ day: 'WEDNESDAY' }),
      DailyPedagogicalPlan.create({ day: 'THURSDAY' }),
      DailyPedagogicalPlan.create({ day: 'SATURDAY' as PlanningDay }) // Invalid for this boundary!
    ]);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('missing day: FRIDAY');
  });

  it('E. DailyPedagogicalPlan behaves as a Value Object', () => {
    const day1 = DailyPedagogicalPlan.create({ day: 'MONDAY' });
    const day2 = DailyPedagogicalPlan.create({ day: 'MONDAY' });
    expect(day1.equals(day2)).toBe(true);
  });

  it('F. PedagogicalContent does not expose silently mutable daily collections', () => {
    const content = PedagogicalContent.createEmpty();
    const plans = content.dailyPlans as any;
    expect(() => {
      plans.push(DailyPedagogicalPlan.create({ day: 'MONDAY' }));
    }).toThrow(); // Should be frozen
  });
});
