import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning, PlanningDay, ComplementaryProgramActivity } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.5.3: Direct Daily Anverso/Reverso Projection (3D11-009-003)', () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createPlanWithDays = async (id: string, days: PlanningDay[]) => {
    const plan = WeeklyPlanning.create(id, 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    plan.days = days;
    plan.observations = 'Observaciones del grupo DIRECT';
    plan.status = 'APPROVED_FOR_EXECUTION';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date();
    await repository.save(plan);
    return plan;
  };

  const createIsoDays = (): PlanningDay[] => [
    {
      date: '2026-08-24',
      dayOfWeek: 'MONDAY',
      activities: [{ activityId: 'act-mon', category: 'C', objective: 'ACTIVITY_MONDAY_TEST', description: 'Desc Mon', durationMinutes: 25, materials: ['MATERIAL_MONDAY_TEST'], curricularTraceability: [] }],
      complementaryActivities: [{ programArea: 'PROGRAM_AREA_TEST_A', activityName: 'ACTIVITY_TEST_A', purpose: 'PURPOSE_TEST_A', description: 'DESC_TEST_A', sourceReference: 'REF_TEST_A' }],
      materials: ['MATERIAL_MONDAY_TEST'],
      evaluation: 'EVALUATION_MONDAY_TEST',
      evaluationStatus: 'APPROVED'
    },
    {
      date: '2026-08-25',
      dayOfWeek: 'TUESDAY',
      activities: [{ activityId: 'act-tue', category: 'C', objective: 'ACTIVITY_TUESDAY_TEST', description: 'Desc Tue', durationMinutes: 30, materials: ['MATERIAL_TUESDAY_TEST'], curricularTraceability: [] }],
      complementaryActivities: [{ programArea: 'PROGRAM_AREA_TEST_B', activityName: 'ACTIVITY_TEST_B' }],
      materials: ['MATERIAL_TUESDAY_TEST'],
      evaluation: 'EVALUATION_TUESDAY_TEST',
      evaluationStatus: 'APPROVED'
    },
    {
      date: '2026-08-26',
      dayOfWeek: 'WEDNESDAY',
      activities: [{ activityId: 'act-wed', category: 'C', objective: 'ACTIVITY_WEDNESDAY_TEST', description: 'Desc Wed', durationMinutes: 20, materials: ['MATERIAL_WEDNESDAY_TEST'], curricularTraceability: [] }],
      complementaryActivities: [],
      materials: ['MATERIAL_WEDNESDAY_TEST'],
      evaluation: 'EVALUATION_WEDNESDAY_TEST',
      evaluationStatus: 'APPROVED'
    },
    {
      date: '2026-08-27',
      dayOfWeek: 'THURSDAY',
      activities: [{ activityId: 'act-thu', category: 'C', objective: 'ACTIVITY_THURSDAY_TEST', description: 'Desc Thu', durationMinutes: 20, materials: ['MATERIAL_THURSDAY_TEST'], curricularTraceability: [] }],
      complementaryActivities: [],
      materials: ['MATERIAL_THURSDAY_TEST'],
      evaluation: 'EVALUATION_THURSDAY_TEST',
      evaluationStatus: 'APPROVED'
    },
    {
      date: '2026-08-28',
      dayOfWeek: 'FRIDAY',
      activities: [{ activityId: 'act-fri', category: 'C', objective: 'ACTIVITY_FRIDAY_TEST', description: 'Desc Fri', durationMinutes: 20, materials: ['MATERIAL_FRIDAY_TEST'], curricularTraceability: [] }],
      complementaryActivities: [],
      materials: ['MATERIAL_FRIDAY_TEST'],
      evaluation: 'EVALUATION_FRIDAY_TEST',
      evaluationStatus: 'APPROVED'
    }
  ];

  const openDirectOfficialView = async () => {
    render(<PlanningDemoApp service={service} source={source} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Anita (Pedagoga)'));
    });
    const approvedCard = await screen.findByText(/Propuesta lista para usarse/i);
    await act(async () => {
      fireEvent.click(approvedCard);
    });
    const officialBtn = await screen.findByText(/Versión Oficial IMSS/i);
    await act(async () => {
      fireEvent.click(officialBtn);
    });
  };

  it('21. DIRECT projects exactly 5 daily document pairs (5 Anverso + 5 Reverso)', async () => {
    await createPlanWithDays('plan-direct-5pairs', createIsoDays());
    await openDirectOfficialView();

    const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    for (const d of weekdays) {
      expect(screen.getByTestId(`direct-day-${d}`)).toBeDefined();
      expect(screen.getByTestId(`direct-anverso-${d}`)).toBeDefined();
      expect(screen.getByTestId(`direct-reverso-${d}`)).toBeDefined();
    }

    const anversos = screen.getAllByText(/(Anverso)/);
    expect(anversos.length).toBe(5);

    const reversos = screen.getAllByText(/(Reverso)/);
    // 5 days x 2 explicit Reverso pages (Page 1 + Page 2 continuation) = 10 pages total
    expect(reversos.length).toBe(10);
  });

  it('22. Daily Activities are isolated per day without cross-contamination', async () => {
    await createPlanWithDays('plan-direct-act-iso', createIsoDays());
    await openDirectOfficialView();

    const mondayAnverso = screen.getByTestId('direct-anverso-MONDAY');
    expect(within(mondayAnverso).getByText('ACTIVITY_MONDAY_TEST')).toBeDefined();
    expect(within(mondayAnverso).queryByText('ACTIVITY_TUESDAY_TEST')).toBeNull();

    const tuesdayAnverso = screen.getByTestId('direct-anverso-TUESDAY');
    expect(within(tuesdayAnverso).getByText('ACTIVITY_TUESDAY_TEST')).toBeDefined();
    expect(within(tuesdayAnverso).queryByText('ACTIVITY_MONDAY_TEST')).toBeNull();
  });

  it('23. Daily Evaluations are isolated per day in each Anverso', async () => {
    await createPlanWithDays('plan-direct-eval-iso', createIsoDays());
    await openDirectOfficialView();

    const mondayAnverso = screen.getByTestId('direct-anverso-MONDAY');
    expect(within(mondayAnverso).getByText('EVALUATION_MONDAY_TEST')).toBeDefined();
    expect(within(mondayAnverso).queryByText('EVALUATION_TUESDAY_TEST')).toBeNull();

    const tuesdayAnverso = screen.getByTestId('direct-anverso-TUESDAY');
    expect(within(tuesdayAnverso).getByText('EVALUATION_TUESDAY_TEST')).toBeDefined();
    expect(within(tuesdayAnverso).queryByText('EVALUATION_MONDAY_TEST')).toBeNull();
  });

  it('24. Daily Complementary Activities are isolated per day in Anverso and [] renders neutral finalized statement', async () => {
    await createPlanWithDays('plan-direct-comp-iso', createIsoDays());
    await openDirectOfficialView();

    const mondayAnverso = screen.getByTestId('direct-anverso-MONDAY');
    expect(within(mondayAnverso).getByText('[PROGRAM_AREA_TEST_A]')).toBeDefined();
    expect(within(mondayAnverso).getByText('ACTIVITY_TEST_A')).toBeDefined();
    expect(within(mondayAnverso).queryByText('ACTIVITY_TEST_B')).toBeNull();

    const tuesdayAnverso = screen.getByTestId('direct-anverso-TUESDAY');
    expect(within(tuesdayAnverso).getByText('[PROGRAM_AREA_TEST_B]')).toBeDefined();
    expect(within(tuesdayAnverso).getByText('ACTIVITY_TEST_B')).toBeDefined();
    expect(within(tuesdayAnverso).queryByText('ACTIVITY_TEST_A')).toBeNull();

    const wednesdayAnverso = screen.getByTestId('direct-anverso-WEDNESDAY');
    expect(within(wednesdayAnverso).getByText('Sin actividad complementaria registrada para este día.')).toBeDefined();
  });

  it('25. Daily Materials are isolated to currentDay without cross-contamination', async () => {
    await createPlanWithDays('plan-direct-mat-iso', createIsoDays());
    await openDirectOfficialView();

    const mondayAnverso = screen.getByTestId('direct-anverso-MONDAY');
    expect(within(mondayAnverso).getByText('MATERIAL_MONDAY_TEST')).toBeDefined();
    expect(within(mondayAnverso).queryByText('MATERIAL_TUESDAY_TEST')).toBeNull();

    const tuesdayAnverso = screen.getByTestId('direct-anverso-TUESDAY');
    expect(within(tuesdayAnverso).getByText('MATERIAL_TUESDAY_TEST')).toBeDefined();
    expect(within(tuesdayAnverso).queryByText('MATERIAL_MONDAY_TEST')).toBeNull();
  });

  it('26. DIRECT Anverso signatures are Educadora and Oficial de Puericultura (and NOT Directora)', async () => {
    await createPlanWithDays('plan-direct-sig', createIsoDays());
    await openDirectOfficialView();

    const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    for (const d of weekdays) {
      const anverso = screen.getByTestId(`direct-anverso-${d}`);
      expect(within(anverso).getByText('Educadora')).toBeDefined();
      expect(within(anverso).getByText('Oficial de Puericultura')).toBeDefined();
      expect(within(anverso).queryByText('Directora')).toBeNull();
    }
  });

  it('27. DIRECT Reverso contains curricular matrix and ZERO dynamic capture fields', async () => {
    await createPlanWithDays('plan-direct-rev-structure', createIsoDays());
    await openDirectOfficialView();

    const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    for (const d of weekdays) {
      const reverso = screen.getByTestId(`direct-reverso-${d}`);
      expect(within(reverso).getByText('Elementos curriculares del Programa Sintético de la Fase 1 para educación inicial')).toBeDefined();
      expect(within(reverso).getByText('Lenguajes')).toBeDefined();
      expect(within(reverso).getByText('Saberes y Pensamiento Científico')).toBeDefined();
      expect(within(reverso).getByText('Ética, Naturaleza y Sociedades')).toBeDefined();
      expect(within(reverso).getByText('De lo Humano y lo Comunitario')).toBeDefined();

      // Zero dynamic capture fields on Reverso
      expect(within(reverso).queryByText('Evaluación:')).toBeNull();
      expect(within(reverso).queryByText('Actividades complementarias de otros programas')).toBeNull();
      expect(within(reverso).queryByText(/Materiales/)).toBeNull();
      expect(within(reverso).queryByText('Educadora')).toBeNull();
      expect(within(reverso).queryByText('Oficial de Puericultura')).toBeNull();
    }
  });
});
