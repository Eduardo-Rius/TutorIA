import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { PlanningDay, ComplementaryProgramActivity } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.2: Anita Daily Complementary Activity Visibility', () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const renderApp = async (service: PlanningWorkflowService, source: DeterministicPedagogicalRecommendationSource) => {
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="TEACHER" />);
    });
    await act(async () => {
      const anita = screen.getByText('Anita');
      fireEvent.click(anita);
    });
    await act(async () => {
      fireEvent.click(screen.getByText('✨ Comenzar nuestra semana'));
    });
  };

  it('A. Anita sees the heading "Actividades complementarias de otros programas" inside daily planning review', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés en exploración' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    const heading = await screen.findByText('Actividades complementarias de otros programas');
    expect(heading).toBeDefined();
  });

  it('B. With complementaryActivities: [], Anita sees the governed empty-state message and notice', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés en exploración' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(await screen.findByText('Sin actividad complementaria registrada para este día.')).toBeDefined();
    expect(
      screen.getByText(
        'Registra este apartado únicamente cuando exista una actividad indicada por otro programa o instrucción institucional.'
      )
    ).toBeDefined();
    expect(screen.queryByText('Pendiente')).toBeNull();
  });

  it('C. Empty complementary activities do NOT prevent Anita from reviewing the day', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés en exploración' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.getByText('0/5 días revisados')).toBeDefined();

    // Click "Guardar Día" (which marks Monday reviewed)
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Lunes 24' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar Día'));
    });

    expect(screen.getByText('1/5 días revisados')).toBeDefined();
  });

  it('D. Empty complementary activities do NOT prevent normal weekly submission when all 5 days are reviewed', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés en exploración' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    const days = ['Lunes 24', 'Martes 25', 'Miércoles 26', 'Jueves 27', 'Viernes 28'];
    for (const d of days) {
      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: d }));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('Guardar Día'));
      });
    }

    expect(screen.getByText('5/5 días revisados')).toBeDefined();

    const submitBtn = screen.getByText('Enviar a Revisión').closest('button');
    expect(submitBtn).not.toHaveProperty('disabled', true);

    await act(async () => {
      fireEvent.click(screen.getByText('Enviar a Revisión'));
    });

    expect(screen.queryByText('En revisión por la Directora')).toBeDefined();
  });

  it('E. When a test-only structured ComplementaryProgramActivity exists, Anita can see its fields', async () => {
    const { service, source } = createTestDeps();

    const customActivity: ComplementaryProgramActivity = {
      programArea: 'PROGRAM_AREA_TEST_A',
      activityName: 'ACTIVITY_TEST_A',
      purpose: 'PURPOSE_TEST_A',
      description: 'DESCRIPTION_TEST_A',
      sourceReference: 'SOURCE_REFERENCE_TEST_A'
    };

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

    await service.createPlanning('plan-test-f2', 'd1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28', 'TEACHER');
    await service.saveDraft('plan-test-f2', 'Obs', 'Needs', 'Sit', 'Mat', [], days, 'TEACHER');

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="TEACHER" planId="plan-test-f2" />);
    });
    await act(async () => {
      const continueBtn = screen.getByText('Continuar donde nos quedamos');
      fireEvent.click(continueBtn);
    });

    expect(await screen.findByText('PROGRAM_AREA_TEST_A')).toBeDefined();
    expect(screen.getByText('ACTIVITY_TEST_A')).toBeDefined();
    expect(screen.getByText(/PURPOSE_TEST_A/)).toBeDefined();
    expect(screen.getByText('DESCRIPTION_TEST_A')).toBeDefined();
    expect(screen.getByText(/SOURCE_REFERENCE_TEST_A/)).toBeDefined();
  });
});
