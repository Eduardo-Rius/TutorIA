import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning, PlanningDay, ComplementaryProgramActivity } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.3: Ceci Daily Complementary Activity Review', () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const renderApp = async (
    service: PlanningWorkflowService,
    source: DeterministicPedagogicalRecommendationSource,
    role: 'TEACHER' | 'DIRECTOR' = 'DIRECTOR'
  ) => {
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });
    await act(async () => {
      if (role === 'DIRECTOR') {
        fireEvent.click(screen.getByText('Ceci (Directora)'));
      } else {
        fireEvent.click(screen.getByText('Anita (Pedagoga)'));
        fireEvent.click(screen.getByText('✨ Comenzar nuestra semana'));
      }
    });
  };

  it('A. Ceci sees heading "Actividades complementarias de otros programas" inside daily review', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create('plan-1', 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    const recs = await source.generateRecommendation(null as any, '', '', '', '');
    plan.days = recs;
    plan.status = 'IN_REVIEW';
    await repo.save(plan);

    await renderApp(service, source, 'DIRECTOR');
    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    const heading = await screen.findByText('Actividades complementarias de otros programas');
    expect(heading).toBeDefined();
  });

  it('B. With complementaryActivities: [], Ceci sees the governed empty-state message and notice', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create('plan-1', 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    const recs = await source.generateRecommendation(null as any, '', '', '', '');
    plan.days = recs;
    plan.status = 'IN_REVIEW';
    await repo.save(plan);

    await renderApp(service, source, 'DIRECTOR');
    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    expect(await screen.findByText('Sin actividad complementaria propuesta para este día.')).toBeDefined();
    expect(
      screen.getByText(
        'TutorIA no asignará actividades de otros programas hasta contar con una fuente institucional validada.'
      )
    ).toBeDefined();
    expect(screen.queryByText('Pendiente')).toBeNull();
  });

  it('C. Empty complementary activities do not block normal day review by Ceci', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create('plan-1', 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    const recs = await source.generateRecommendation(null as any, '', '', '', '');
    plan.days = recs;
    plan.status = 'IN_REVIEW';
    await repo.save(plan);

    await renderApp(service, source, 'DIRECTOR');
    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    expect(screen.getByText('0/5 días revisados')).toBeDefined();

    const markBtn = screen.getByText('Marcar día revisado');
    await act(async () => {
      fireEvent.click(markBtn);
    });

    expect(screen.getByText('1/5 días revisados')).toBeDefined();
    expect(screen.getByText('Día revisado')).toBeDefined();
  });

  it('D. Empty complementary activities do not block APPROVED_FOR_EXECUTION after 5/5 days are reviewed', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create('plan-1', 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    const recs = await source.generateRecommendation(null as any, '', '', '', '');
    plan.days = recs;
    plan.status = 'IN_REVIEW';
    await repo.save(plan);

    await renderApp(service, source, 'DIRECTOR');
    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    const days = ['Lunes 24', 'Martes 25', 'Miércoles 26', 'Jueves 27', 'Viernes 28'];
    for (const d of days) {
      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: new RegExp(d, 'i') }));
      });
      const markBtn = screen.queryByText('Marcar día revisado');
      if (markBtn) {
        await act(async () => {
          fireEvent.click(markBtn);
        });
      }
    }

    expect(screen.getByText('5/5 días revisados')).toBeDefined();

    const approveBtn = screen.getByText(/APROBAR TODA LA PLANEACIÓN/i).closest('button');
    expect(approveBtn).not.toHaveProperty('disabled', true);

    await act(async () => {
      fireEvent.click(approveBtn!);
    });

    const savedPlan = await service.getPlanning('plan-1');
    expect(savedPlan?.status === 'APPROVED' || savedPlan?.status === 'APPROVED_FOR_EXECUTION').toBe(true);
  });

  it('E. When a neutral structured test activity exists, Ceci sees its fields', async () => {
    const { repo, service, source } = createTestDeps();

    const customActivity: ComplementaryProgramActivity = {
      programArea: 'PROGRAM_AREA_TEST_A',
      activityName: 'ACTIVITY_TEST_A',
      purpose: 'PURPOSE_TEST_A',
      description: 'DESCRIPTION_TEST_A',
      sourceReference: 'SOURCE_REFERENCE_TEST_A'
    };

    const plan = WeeklyPlanning.create('plan-custom', 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    const days: PlanningDay[] = [
      {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        activities: [
          {
            activityId: 'act-1',
            category: 'C',
            objective: 'Obj 1',
            description: 'Desc 1',
            materials: [],
            durationMinutes: 20,
            curricularTraceability: []
          }
        ],
        complementaryActivities: [customActivity],
        materials: []
      },
      { date: '2026-08-25', dayOfWeek: 'TUESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-27', dayOfWeek: 'THURSDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-28', dayOfWeek: 'FRIDAY', activities: [], complementaryActivities: [], materials: [] }
    ];
    plan.days = days;
    plan.status = 'IN_REVIEW';
    await repo.save(plan);

    await renderApp(service, source, 'DIRECTOR');
    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    expect(await screen.findByText('PROGRAM_AREA_TEST_A')).toBeDefined();
    expect(screen.getByText('ACTIVITY_TEST_A')).toBeDefined();
    expect(screen.getByText(/PURPOSE_TEST_A/)).toBeDefined();
    expect(screen.getByText('DESCRIPTION_TEST_A')).toBeDefined();
    expect(screen.getByText(/SOURCE_REFERENCE_TEST_A/)).toBeDefined();
  });

  it('F. Anita H1R9-F.2 visibility remains intact', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source, 'TEACHER');

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés en exploración' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(await screen.findByText('Actividades complementarias de otros programas')).toBeDefined();
    expect(screen.getByText('Sin actividad complementaria registrada para este día.')).toBeDefined();
  });
});
