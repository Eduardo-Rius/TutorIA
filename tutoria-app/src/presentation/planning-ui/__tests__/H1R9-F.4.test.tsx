import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning, PlanningDay, ComplementaryProgramActivity } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.4: CLOSED + Tere Daily Complementary Activity Visibility', () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = 'plan-h1r9-f4'
  ) => {
    const plan = WeeklyPlanning.create(id, 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    const recs = await source.generateRecommendation(null as any, 'Obs F4', 'Needs F4', 'Sit F4', 'Mat F4');
    plan.days = recs;
    plan.observations = 'Obs Grupo F4';
    plan.identifiedNeeds = 'Needs Grupo F4';
    plan.specialSituations = 'Sit Grupo F4';
    plan.availableMaterials = 'Mat Grupo F4';
    await repo.save(plan);
    return plan;
  };

  it('A. Tere does NOT see a non-CLOSED planning record', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source);

    plan.status = 'IN_REVIEW';
    await repo.save(plan);

    const closedList = await service.listSupervisorClosedPlanning('SUPERVISOR');
    expect(closedList.length).toBe(0);

    const { unmount } = render(<PlanningDemoApp service={service} source={source} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
    });

    expect(screen.getByText(/Aún no hay semanas cerradas para supervisión/i)).toBeDefined();
    expect(screen.queryByText('Lactantes C • Semana del 24 al 28 de agosto')).toBeNull();
    unmount();
  });

  it('B. Tere does NOT see a 5/5 evaluation-approved planning that is READY_FOR_CLOSURE but has not been explicitly closed by Ceci', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source);

    plan.status = 'APPROVED';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date();
    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = `Evaluación aprobada día ${i + 1}`;
      plan.days[i].evaluationStatus = 'APPROVED';
    }
    expect(plan.isReadyForClosure).toBe(true);
    expect(plan.status).toBe('APPROVED');
    await repo.save(plan);

    const closedList = await service.listSupervisorClosedPlanning('SUPERVISOR');
    expect(closedList.length).toBe(0);

    const { unmount } = render(<PlanningDemoApp service={service} source={source} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
    });

    expect(screen.getByText(/Aún no hay semanas cerradas para supervisión/i)).toBeDefined();
    expect(screen.queryByText('Lactantes C • Semana del 24 al 28 de agosto')).toBeNull();
    unmount();
  });

  it('C & D. After explicit closeWeek(), Tere sees the SAME planning and same planningId is preserved', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source, 'plan-lifecycle-id');

    plan.status = 'APPROVED';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date();
    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = `Evaluación aprobada día ${i + 1}`;
      plan.days[i].evaluationStatus = 'APPROVED';
    }
    await repo.save(plan);

    // Explicit closure by Ceci
    await service.closeWeek('plan-lifecycle-id', 'DIRECTOR', 'Ceci');

    const closedList = await service.listSupervisorClosedPlanning('SUPERVISOR');
    expect(closedList.length).toBe(1);
    expect(closedList[0].planningId).toBe('plan-lifecycle-id');
    expect(closedList[0].status).toBe('CLOSED');
    expect(closedList[0].closedBy).toBe('Ceci');
  });

  it('E, F & H. Tere sees "Actividades complementarias de otros programas", empty-state when [], and zero mutation controls', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source, 'plan-closed-detail');

    plan.status = 'APPROVED';
    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = `Evaluación día ${i + 1}`;
      plan.days[i].evaluationStatus = 'APPROVED';
    }
    await repo.save(plan);
    await service.closeWeek('plan-closed-detail', 'DIRECTOR', 'Ceci');

    render(<PlanningDemoApp service={service} source={source} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
    });

    // Open the closed plan
    await act(async () => {
      fireEvent.click(screen.getByText(/Semana cerrada/i));
    });

    // E. Heading appears in daily detail (5 times, once per day)
    const headings = await screen.findAllByText('Actividades complementarias de otros programas');
    expect(headings.length).toBe(5);

    // F. Empty-state notice appears on each day
    const emptyNotices = screen.getAllByText('Sin actividad complementaria propuesta para este día.');
    expect(emptyNotices.length).toBe(5);
    expect(screen.queryByText('Pendiente')).toBeNull();

    // H. Zero mutation controls
    expect(screen.queryByText(/Agregar actividad/i)).toBeNull();
    expect(screen.queryByText(/Crear programa/i)).toBeNull();
    expect(screen.queryByText(/Editar actividad/i)).toBeNull();
    expect(screen.queryByText(/Eliminar actividad/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/Escribe/i)).toBeNull();
  });

  it('G. With a neutral structured test activity on one day, Tere sees all available fields', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source, 'plan-structured-tere');

    const customActivity: ComplementaryProgramActivity = {
      programArea: 'PROGRAM_AREA_TEST_A',
      activityName: 'ACTIVITY_TEST_A',
      purpose: 'PURPOSE_TEST_A',
      description: 'DESCRIPTION_TEST_A',
      sourceReference: 'SOURCE_REFERENCE_TEST_A'
    };

    plan.days[0].complementaryActivities = [customActivity];
    plan.status = 'APPROVED';
    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = `Evaluación aprobada ${i + 1}`;
      plan.days[i].evaluationStatus = 'APPROVED';
    }
    await repo.save(plan);
    await service.closeWeek('plan-structured-tere', 'DIRECTOR', 'Ceci');

    render(<PlanningDemoApp service={service} source={source} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Semana cerrada/i));
    });

    expect(await screen.findByText('PROGRAM_AREA_TEST_A')).toBeDefined();
    expect(screen.getByText('ACTIVITY_TEST_A')).toBeDefined();
    expect(screen.getByText(/PURPOSE_TEST_A/)).toBeDefined();
    expect(screen.getByText('DESCRIPTION_TEST_A')).toBeDefined();
    expect(screen.getByText(/SOURCE_REFERENCE_TEST_A/)).toBeDefined();
  });

  it('I. Anita F.2 visibility remains intact', async () => {
    const { service, source } = createTestDeps();
    render(<PlanningDemoApp service={service} source={source} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Anita (Pedagoga)'));
      fireEvent.click(screen.getByText('✨ Comenzar nuestra semana'));
    });

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

  it('J. Ceci F.3 visibility remains intact', async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source, 'plan-ceci-check');
    plan.status = 'IN_REVIEW';
    await repo.save(plan);

    render(<PlanningDemoApp service={service} source={source} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Ceci (Directora)'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    expect(await screen.findByText('Actividades complementarias de otros programas')).toBeDefined();
    expect(screen.getByText('Sin actividad complementaria propuesta para este día.')).toBeDefined();
  });
});
