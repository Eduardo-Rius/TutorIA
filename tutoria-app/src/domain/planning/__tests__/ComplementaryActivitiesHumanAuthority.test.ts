import { describe, it, expect } from 'vitest';
import {
  WeeklyPlanning,
  PlanningDay,
  ComplementaryProgramActivity,
  InvalidComplementaryActivityError,
} from '../WeeklyPlanning';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { RoomCatalog } from '../RoomCatalog';

describe('Complementary Activities — Human Instruction Authority (H1R9-F.6.1)', () => {
  const createBaseFiveDays = (): PlanningDay[] => [
    {
      date: '2026-08-24',
      dayOfWeek: 'MONDAY',
      activities: [
        {
          activityId: 'act-1',
          category: 'C',
          objective: 'Obj 1',
          description: 'Desc 1',
          materials: ['Mat 1'],
          durationMinutes: 20,
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      materials: ['Mat 1'],
    },
    {
      date: '2026-08-25',
      dayOfWeek: 'TUESDAY',
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
    {
      date: '2026-08-26',
      dayOfWeek: 'WEDNESDAY',
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
    {
      date: '2026-08-27',
      dayOfWeek: 'THURSDAY',
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
    {
      date: '2026-08-28',
      dayOfWeek: 'FRIDAY',
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
  ];

  const createTestPlan = (status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED_FOR_EXECUTION' | 'REJECTED' | 'CLOSED' = 'DRAFT') => {
    const plan = WeeklyPlanning.create(
      'plan-comp-test',
      'daycare-1',
      'lactantes-c',
      'teacher-1',
      '2026-08-24',
      '2026-08-28'
    );
    plan.status = status;
    plan.days = createBaseFiveDays();
    return plan;
  };

  it('17. TEST — EMPTY: [] accepted for one PlanningDay, other days unchanged, plan remains valid', () => {
    const plan = createTestPlan('DRAFT');

    // Setting empty list on Monday
    plan.setDayComplementaryActivities('MONDAY', []);

    expect(plan.days[0].complementaryActivities).toEqual([]);
    expect(plan.days[1].complementaryActivities).toEqual([]);
    expect(plan.days[2].complementaryActivities).toEqual([]);
    expect(plan.days[3].complementaryActivities).toEqual([]);
    expect(plan.days[4].complementaryActivities).toEqual([]);
    expect(() => plan.assertValidComplementaryInvariants()).not.toThrow();
  });

  it('18. TEST — SINGLE ENTRY: one valid human-entered complementary activity is stored exactly for the selected day', () => {
    const plan = createTestPlan('DRAFT');

    const activity: ComplementaryProgramActivity = {
      programArea: 'Programa de Estimulación Oportuna',
      activityName: 'Seguimiento de tono muscular y gateo',
      purpose: 'Fortalecer motricidad gruesa',
      description: 'Sesión guiada en colchoneta según instrucción médica',
      sourceReference: 'Instrucción técnica IMSS 2026-08',
    };

    plan.setDayComplementaryActivities('MONDAY', [activity]);

    expect(plan.days[0].complementaryActivities).toHaveLength(1);
    expect(plan.days[0].complementaryActivities[0].programArea).toBe('Programa de Estimulación Oportuna');
    expect(plan.days[0].complementaryActivities[0].activityName).toBe('Seguimiento de tono muscular y gateo');
    expect(plan.days[0].complementaryActivities[0].purpose).toBe('Fortalecer motricidad gruesa');
    expect(plan.days[0].complementaryActivities[0].description).toBe('Sesión guiada en colchoneta según instrucción médica');
    expect(plan.days[0].complementaryActivities[0].sourceReference).toBe('Instrucción técnica IMSS 2026-08');

    // Other days remain empty
    expect(plan.days[1].complementaryActivities).toEqual([]);
    expect(plan.days[2].complementaryActivities).toEqual([]);
  });

  it('19. TEST — MULTIPLE: multiple valid complementary activities can coexist on the same PlanningDay without arbitrary limits', () => {
    const plan = createTestPlan('DRAFT');

    const act1: ComplementaryProgramActivity = {
      programArea: 'Salud y Nutrición Integral',
      activityName: 'Monitoreo de deglución y textura sólida',
    };
    const act2: ComplementaryProgramActivity = {
      programArea: 'Prevención y Bienestar Infantil',
      activityName: 'Taller de lavado de manos afectivo',
    };
    const act3: ComplementaryProgramActivity = {
      programArea: 'Fomento a la Participación de la Familia',
      activityName: 'Registro de mensaje familiar en bitácora',
    };

    plan.setDayComplementaryActivities('TUESDAY', [act1, act2, act3]);

    expect(plan.days[1].complementaryActivities).toHaveLength(3);
    expect(plan.days[1].complementaryActivities[0].activityName).toBe('Monitoreo de deglución y textura sólida');
    expect(plan.days[1].complementaryActivities[1].activityName).toBe('Taller de lavado de manos afectivo');
    expect(plan.days[1].complementaryActivities[2].activityName).toBe('Registro de mensaje familiar en bitácora');
  });

  it('20. TEST — INVALID REQUIRED VALUES: rejects blank/whitespace program or activity atomically', () => {
    const plan = createTestPlan('DRAFT');

    // Initial valid state
    const original: ComplementaryProgramActivity = {
      programArea: 'Programa Base',
      activityName: 'Actividad Base',
    };
    plan.setDayComplementaryActivities('MONDAY', [original]);

    // 1. Blank programArea
    expect(() => {
      plan.setDayComplementaryActivities('MONDAY', [
        { programArea: '', activityName: 'Actividad 1' },
      ]);
    }).toThrow(InvalidComplementaryActivityError);

    // 2. Whitespace-only programArea
    expect(() => {
      plan.setDayComplementaryActivities('MONDAY', [
        { programArea: '   \t  ', activityName: 'Actividad 1' },
      ]);
    }).toThrow(InvalidComplementaryActivityError);

    // 3. Blank activityName
    expect(() => {
      plan.setDayComplementaryActivities('MONDAY', [
        { programArea: 'Programa Salud', activityName: '' },
      ]);
    }).toThrow(InvalidComplementaryActivityError);

    // 4. Whitespace-only activityName
    expect(() => {
      plan.setDayComplementaryActivities('MONDAY', [
        { programArea: 'Programa Salud', activityName: '   \n  ' },
      ]);
    }).toThrow(InvalidComplementaryActivityError);

    // 5. Atomic invariant: previous state remains 100% preserved
    expect(plan.days[0].complementaryActivities).toHaveLength(1);
    expect(plan.days[0].complementaryActivities[0].programArea).toBe('Programa Base');
    expect(plan.days[0].complementaryActivities[0].activityName).toBe('Actividad Base');

    // 6. Sibling atomicity: first item valid, second item invalid -> rejected completely
    expect(() => {
      plan.setDayComplementaryActivities('MONDAY', [
        { programArea: 'Programa Valido', activityName: 'Actividad Valida' },
        { programArea: '', activityName: 'Actividad Invalida' },
      ]);
    }).toThrow(InvalidComplementaryActivityError);

    // Previous state still preserved
    expect(plan.days[0].complementaryActivities).toHaveLength(1);
    expect(plan.days[0].complementaryActivities[0].activityName).toBe('Actividad Base');
  });

  it('21. TEST — DAY ISOLATION: setting complementaries on Monday and Wednesday preserves isolation with zero leakage', () => {
    const plan = createTestPlan('DRAFT');

    plan.setDayComplementaryActivities('MONDAY', [
      { programArea: 'Programa Lunes', activityName: 'Act Lunes' },
    ]);
    plan.setDayComplementaryActivities('WEDNESDAY', [
      { programArea: 'Programa Miércoles', activityName: 'Act Miércoles' },
    ]);

    expect(plan.days[0].complementaryActivities).toHaveLength(1);
    expect(plan.days[0].complementaryActivities[0].programArea).toBe('Programa Lunes');

    expect(plan.days[1].complementaryActivities).toEqual([]); // Tuesday

    expect(plan.days[2].complementaryActivities).toHaveLength(1);
    expect(plan.days[2].complementaryActivities[0].programArea).toBe('Programa Miércoles');

    expect(plan.days[3].complementaryActivities).toEqual([]); // Thursday
    expect(plan.days[4].complementaryActivities).toEqual([]); // Friday

    // Pedagogical activities, planningId, context are completely intact
    expect(plan.planningId).toBe('plan-comp-test');
    expect(plan.days[0].activities).toHaveLength(1);
    expect(plan.days[0].activities[0].activityId).toBe('act-1');
  });

  it('22. TEST — REPLACEMENT / CLEAR: replacing with another list removes old entries; setting [] clears list', () => {
    const plan = createTestPlan('DRAFT');

    // Step 1: Initial list
    plan.setDayComplementaryActivities('THURSDAY', [
      { programArea: 'Programa Viejo', activityName: 'Actividad Vieja' },
    ]);
    expect(plan.days[3].complementaryActivities).toHaveLength(1);
    expect(plan.days[3].complementaryActivities[0].activityName).toBe('Actividad Vieja');

    // Step 2: Replacement with a new list
    plan.setDayComplementaryActivities('THURSDAY', [
      { programArea: 'Programa Nuevo 1', activityName: 'Actividad Nueva 1' },
      { programArea: 'Programa Nuevo 2', activityName: 'Actividad Nueva 2' },
    ]);
    expect(plan.days[3].complementaryActivities).toHaveLength(2);
    expect(plan.days[3].complementaryActivities[0].activityName).toBe('Actividad Nueva 1');
    expect(plan.days[3].complementaryActivities[1].activityName).toBe('Actividad Nueva 2');

    // Step 3: Clear with []
    plan.setDayComplementaryActivities('THURSDAY', []);
    expect(plan.days[3].complementaryActivities).toEqual([]);
    expect(plan.days[3].complementaryActivities).toHaveLength(0);
  });

  it('23. TEST — LIFECYCLE: editable in DRAFT and REJECTED; strictly immutable in IN_REVIEW, APPROVED_FOR_EXECUTION, CLOSED', () => {
    const sampleActivity = [
      { programArea: 'Programa Salud', activityName: 'Control de hidratación' },
    ];

    // 1. DRAFT: Allowed
    const draftPlan = createTestPlan('DRAFT');
    expect(() => draftPlan.setDayComplementaryActivities('MONDAY', sampleActivity)).not.toThrow();
    expect(draftPlan.days[0].complementaryActivities).toHaveLength(1);

    // 2. REJECTED (correction state): Allowed
    const rejectedPlan = createTestPlan('REJECTED');
    expect(() => rejectedPlan.setDayComplementaryActivities('MONDAY', sampleActivity)).not.toThrow();
    expect(rejectedPlan.days[0].complementaryActivities).toHaveLength(1);

    // 3. IN_REVIEW: Read-only
    const inReviewPlan = createTestPlan('IN_REVIEW');
    expect(() => inReviewPlan.setDayComplementaryActivities('MONDAY', sampleActivity)).toThrow(
      /Cannot edit complementary activities in status: IN_REVIEW/
    );

    // 4. APPROVED_FOR_EXECUTION: Read-only
    const approvedPlan = createTestPlan('APPROVED_FOR_EXECUTION');
    expect(() => approvedPlan.setDayComplementaryActivities('MONDAY', sampleActivity)).toThrow(
      /Cannot edit complementary activities in status: APPROVED_FOR_EXECUTION/
    );

    // 5. CLOSED: Read-only
    const closedPlan = createTestPlan('CLOSED');
    expect(() => closedPlan.setDayComplementaryActivities('MONDAY', sampleActivity)).toThrow(
      /Cannot edit complementary activities in status: CLOSED/
    );
  });

  it('24. TEST — GENERATOR: newly generated week starts with empty [] complementaryActivities across all 5 days with zero invented programs', async () => {
    const source = new DeterministicPedagogicalRecommendationSource();
    const generatedDays = await source.generateRecommendation(
      RoomCatalog.getRoom('lactantes-c')!,
      'Los niños están muy atentos a los sonidos',
      'Exploración auditiva',
      'Ninguna',
      'Sonajas y cascabeles'
    );

    expect(generatedDays).toHaveLength(5);

    // Assert every day starts with exactly []
    for (const d of generatedDays) {
      expect(d.complementaryActivities).toEqual([]);
      expect(d.complementaryActivities).toHaveLength(0);
    }
  });
});
