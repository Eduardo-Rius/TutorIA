import { describe, it, expect } from 'vitest';
import {
  WeeklyPlanning,
  PlanningDay,
  ComplementaryProgramActivity
} from '../WeeklyPlanning';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { RoomCatalog } from '../RoomCatalog';

describe('ComplementaryProgramActivity Domain Foundation (H1R9-F.1)', () => {
  it('A. A PlanningDay can contain 0 complementary activities', () => {
    const day: PlanningDay = {
      date: '2026-08-24',
      dayOfWeek: 'MONDAY',
      activities: [],
      complementaryActivities: [],
      materials: []
    };

    expect(day.complementaryActivities).toHaveLength(0);
    expect(day.complementaryActivities).toEqual([]);
  });

  it('B. A PlanningDay can contain one structured complementary activity', () => {
    const activity: ComplementaryProgramActivity = {
      programArea: 'PROGRAM_AREA_TEST_A',
      activityName: 'ACTIVITY_TEST_A',
      purpose: 'PURPOSE_TEST_A',
      description: 'DESCRIPTION_TEST_A',
      sourceReference: 'SOURCE_REFERENCE_TEST_A'
    };

    const day: PlanningDay = {
      date: '2026-08-24',
      dayOfWeek: 'MONDAY',
      activities: [],
      complementaryActivities: [activity],
      materials: ['MATERIAL_TEST_1', 'MATERIAL_TEST_2']
    };

    expect(day.complementaryActivities).toHaveLength(1);
    expect(day.complementaryActivities[0].programArea).toBe('PROGRAM_AREA_TEST_A');
    expect(day.complementaryActivities[0].activityName).toBe('ACTIVITY_TEST_A');
    expect(day.complementaryActivities[0].purpose).toBe('PURPOSE_TEST_A');
    expect(day.complementaryActivities[0].description).toBe('DESCRIPTION_TEST_A');
    expect(day.complementaryActivities[0].sourceReference).toBe('SOURCE_REFERENCE_TEST_A');
  });

  it('C. Multiple structured complementary activities can belong to the same day', () => {
    const act1: ComplementaryProgramActivity = {
      programArea: 'PROGRAM_AREA_TEST_A',
      activityName: 'ACTIVITY_TEST_A',
      purpose: 'PURPOSE_TEST_A'
    };
    const act2: ComplementaryProgramActivity = {
      programArea: 'PROGRAM_AREA_TEST_B',
      activityName: 'ACTIVITY_TEST_B',
      purpose: 'PURPOSE_TEST_B'
    };

    const day: PlanningDay = {
      date: '2026-08-25',
      dayOfWeek: 'TUESDAY',
      activities: [],
      complementaryActivities: [act1, act2],
      materials: []
    };

    expect(day.complementaryActivities).toHaveLength(2);
    expect(day.complementaryActivities[0].programArea).toBe('PROGRAM_AREA_TEST_A');
    expect(day.complementaryActivities[1].programArea).toBe('PROGRAM_AREA_TEST_B');
  });

  it('D. Generated days no longer misclassify care/routine strings as complementary-program activities', async () => {
    const source = new DeterministicPedagogicalRecommendationSource();
    const generatedDays = await source.generateRecommendation(
      RoomCatalog.getRoom('lactantes-c')!,
      'Obs',
      'Needs',
      'Sit',
      'Mat'
    );

    expect(generatedDays).toHaveLength(5);

    // Verify all 5 days have empty complementaryActivities (not raw care/routine strings)
    for (const day of generatedDays) {
      expect(day.complementaryActivities).toEqual([]);
      expect(day.complementaryActivities).not.toContain('Bienvenida afectiva');
      expect(day.complementaryActivities).not.toContain('Siesta');
      expect(day.complementaryActivities).not.toContain('Cambiado de pañal afectivo');
      expect(day.complementaryActivities).not.toContain('Alimentación guiada');
      expect(day.complementaryActivities).not.toContain('Despedida afectiva');
    }
  });

  it('E. The five-day weekly planning lifecycle remains valid with empty complementaryActivities', () => {
    const days: PlanningDay[] = [
      { date: '2026-08-24', dayOfWeek: 'MONDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-25', dayOfWeek: 'TUESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-27', dayOfWeek: 'THURSDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-28', dayOfWeek: 'FRIDAY', activities: [], complementaryActivities: [], materials: [] }
    ];

    const plan = WeeklyPlanning.create(
      'plan-f1',
      'daycare-1',
      'lactantes-c',
      'teacher-1',
      '2026-08-24',
      '2026-08-28'
    );
    plan.days = days;

    expect(plan.days).toHaveLength(5);
    expect(plan.days.every(d => Array.isArray(d.complementaryActivities))).toBe(true);
    expect(plan.days.every(d => d.complementaryActivities.length === 0)).toBe(true);
  });
});
