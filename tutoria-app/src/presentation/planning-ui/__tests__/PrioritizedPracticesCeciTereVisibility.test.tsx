import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.7.4: Prioritized Practices Read-Only Visibility (Ceci + Tere)', () => {
  const createDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const setupPlanningWithPractices = async (
    repo: InMemoryWeeklyPlanningRepository,
    service: PlanningWorkflowService,
    source: DeterministicPedagogicalRecommendationSource,
    planningId = 'plan-prioritized-test-1',
    status: 'IN_REVIEW' | 'CLOSED' = 'IN_REVIEW'
  ) => {
    const plan = WeeklyPlanning.create(
      planningId,
      'dc-1',
      'lactantes-c',
      't1',
      '2026-08-24',
      '2026-08-28'
    );
    const recs = await source.generateRecommendation(null as any, 'Obs', 'Needs', 'Sit', 'Mat');
    plan.days = recs;
    plan.observations = 'Observaciones de grupo';
    plan.identifiedNeeds = 'Necesidades identificadas';
    plan.specialSituations = 'Situaciones especiales';
    plan.availableMaterials = 'Materiales disponibles';

    // Monday: Practice A with sourceReference Ref A
    plan.setDayPrioritizedPractices('MONDAY', [
      { practiceName: 'Practice A', sourceReference: 'Ref A' }
    ]);

    // Tuesday: empty (no prioritized practices)
    plan.setDayPrioritizedPractices('TUESDAY', []);

    // Wednesday: Practice B without sourceReference
    plan.setDayPrioritizedPractices('WEDNESDAY', [
      { practiceName: 'Practice B' }
    ]);

    // Thursday & Friday: empty
    plan.setDayPrioritizedPractices('THURSDAY', []);
    plan.setDayPrioritizedPractices('FRIDAY', []);

    if (status === 'IN_REVIEW') {
      plan.status = 'IN_REVIEW';
      await repo.save(plan);
    } else if (status === 'CLOSED') {
      plan.status = 'APPROVED_FOR_EXECUTION';
      plan.approvedBy = 'Ceci';
      plan.approvedAt = new Date();
      for (let i = 0; i < 5; i++) {
        plan.days[i]!.evaluation = `Evaluación aprobada día ${i + 1}`;
        plan.days[i]!.evaluationStatus = 'APPROVED';
      }
      await repo.save(plan);
      await service.closeWeek(planningId, 'DIRECTOR', 'Ceci');
    }

    return (await repo.findById(planningId))!;
  };

  // ============================================================
  // 9. TEST — CECI WITH DATA & DAILY ISOLATION
  // ============================================================
  it('9. Ceci sees Monday Practice A + Ref A, Wednesday Practice B, and no cross-day leakage', async () => {
    const { repo, service, source } = createDeps();
    await setupPlanningWithPractices(repo, service, source, 'plan-ceci-data', 'IN_REVIEW');

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    // Switch to Ceci
    await act(async () => {
      fireEvent.click(screen.getByText('Ceci (Directora)'));
    });

    // Open planning for review
    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    // 1. Monday is active by default
    const mondaySection = screen.getByTestId('director-prioritized-practices-MONDAY');
    expect(within(mondaySection).getByText('Prácticas priorizadas')).toBeDefined();
    expect(within(mondaySection).getByText('Practice A')).toBeDefined();
    expect(within(mondaySection).getByText('Referencia: Ref A')).toBeDefined();
    expect(within(mondaySection).queryByText('Practice B')).toBeNull();

    // 2. Switch to Tuesday tab
    const tuesdayTab = screen.getByRole('tab', { name: /Martes 25/i });
    await act(async () => {
      fireEvent.click(tuesdayTab);
    });

    const tuesdaySection = screen.getByTestId('director-prioritized-practices-TUESDAY');
    expect(within(tuesdaySection).getByText('Sin práctica priorizada registrada para este día.')).toBeDefined();
    expect(within(tuesdaySection).queryByText('Practice A')).toBeNull();
    expect(within(tuesdaySection).queryByText('Practice B')).toBeNull();

    // 3. Switch to Wednesday tab
    const wednesdayTab = screen.getByRole('tab', { name: /Miércoles 26/i });
    await act(async () => {
      fireEvent.click(wednesdayTab);
    });

    const wednesdaySection = screen.getByTestId('director-prioritized-practices-WEDNESDAY');
    expect(within(wednesdaySection).getByText('Practice B')).toBeDefined();
    expect(within(wednesdaySection).queryByText(/Referencia:/i)).toBeNull();
    expect(within(wednesdaySection).queryByText('Practice A')).toBeNull();
    expect(within(wednesdaySection).queryByText('Ref A')).toBeNull();
  });

  // ============================================================
  // 10. TEST — CECI EMPTY
  // ============================================================
  it('10. Ceci empty day shows exact text "Sin práctica priorizada registrada para este día."', async () => {
    const { repo, service, source } = createDeps();
    await setupPlanningWithPractices(repo, service, source, 'plan-ceci-empty', 'IN_REVIEW');

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Ceci (Directora)'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    // Switch to Tuesday (empty)
    const tuesdayTab = screen.getByRole('tab', { name: /Martes 25/i });
    await act(async () => {
      fireEvent.click(tuesdayTab);
    });

    const tuesdaySection = screen.getByTestId('director-prioritized-practices-TUESDAY');
    expect(within(tuesdaySection).getByText('Sin práctica priorizada registrada para este día.')).toBeDefined();
  });

  // ============================================================
  // 11. TEST — CECI READ-ONLY
  // ============================================================
  it('11. Ceci prioritized practice section has zero mutation controls (no add, edit, delete, save)', async () => {
    const { repo, service, source } = createDeps();
    await setupPlanningWithPractices(repo, service, source, 'plan-ceci-readonly', 'IN_REVIEW');

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Ceci (Directora)'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Lista para conversar/i));
    });

    const mondaySection = screen.getByTestId('director-prioritized-practices-MONDAY');

    // Assert strictly absent within prioritized practice section
    expect(within(mondaySection).queryByText('Agregar práctica priorizada')).toBeNull();
    expect(within(mondaySection).queryByText('Agregar otra práctica priorizada')).toBeNull();
    expect(within(mondaySection).queryByText('Editar')).toBeNull();
    expect(within(mondaySection).queryByText('Eliminar')).toBeNull();
    expect(within(mondaySection).queryByText('Guardar práctica')).toBeNull();
    expect(within(mondaySection).queryByText('Guardar cambios')).toBeNull();
    expect(within(mondaySection).queryByRole('textbox')).toBeNull();
    expect(within(mondaySection).queryByRole('button')).toBeNull();
  });

  // ============================================================
  // 12. TEST — TERE CLOSED WITH DATA & SAME PLANNING ID
  // ============================================================
  it('12. Tere sees same stored prioritized practices from same planningId/day data in CLOSED planning', async () => {
    const { repo, service, source } = createDeps();
    const planningId = 'plan-tere-closed-canonical';
    const plan = await setupPlanningWithPractices(repo, service, source, planningId, 'CLOSED');
    expect(plan.status).toBe('CLOSED');

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    // Switch to Tere
    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
    });

    // Open the closed planning from Tere's list
    await act(async () => {
      fireEvent.click(screen.getByText('Guardería IMSS Demo (001)'));
    });

    // In SupervisorReview, all 5 days are visible
    // 1. Monday card
    const mondaySection = screen.getByTestId('supervisor-prioritized-practices-MONDAY');
    expect(within(mondaySection).getByText('Prácticas priorizadas')).toBeDefined();
    expect(within(mondaySection).getByText('Practice A')).toBeDefined();
    expect(within(mondaySection).getByText('Referencia: Ref A')).toBeDefined();
    expect(within(mondaySection).queryByText('Practice B')).toBeNull();

    // 2. Wednesday card
    const wednesdaySection = screen.getByTestId('supervisor-prioritized-practices-WEDNESDAY');
    expect(within(wednesdaySection).getByText('Practice B')).toBeDefined();
    expect(within(wednesdaySection).queryByText(/Referencia:/i)).toBeNull();
    expect(within(wednesdaySection).queryByText('Practice A')).toBeNull();

    // 3. Verify same planning domain source
    expect(plan.planningId).toBe(planningId);
    expect(plan.days[0]!.prioritizedPractices![0]!.practiceName).toBe('Practice A');
    expect(plan.days[2]!.prioritizedPractices![0]!.practiceName).toBe('Practice B');
  });

  // ============================================================
  // 13. TEST — TERE EMPTY
  // ============================================================
  it('13. Tere empty day shows exact wording "Sin práctica priorizada registrada para este día."', async () => {
    const { repo, service, source } = createDeps();
    await setupPlanningWithPractices(repo, service, source, 'plan-tere-empty', 'CLOSED');

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardería IMSS Demo (001)'));
    });

    const tuesdaySection = screen.getByTestId('supervisor-prioritized-practices-TUESDAY');
    expect(within(tuesdaySection).getByText('Sin práctica priorizada registrada para este día.')).toBeDefined();

    const thursdaySection = screen.getByTestId('supervisor-prioritized-practices-THURSDAY');
    expect(within(thursdaySection).getByText('Sin práctica priorizada registrada para este día.')).toBeDefined();

    const fridaySection = screen.getByTestId('supervisor-prioritized-practices-FRIDAY');
    expect(within(fridaySection).getByText('Sin práctica priorizada registrada para este día.')).toBeDefined();
  });

  // ============================================================
  // 14. TEST — TERE CONSULTATION ONLY
  // ============================================================
  it('14. Tere consultation has zero mutation controls on prioritized practices', async () => {
    const { repo, service, source } = createDeps();
    await setupPlanningWithPractices(repo, service, source, 'plan-tere-consultation', 'CLOSED');

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardería IMSS Demo (001)'));
    });

    const mondaySection = screen.getByTestId('supervisor-prioritized-practices-MONDAY');
    const wednesdaySection = screen.getByTestId('supervisor-prioritized-practices-WEDNESDAY');

    for (const section of [mondaySection, wednesdaySection]) {
      expect(within(section).queryByText('Agregar práctica priorizada')).toBeNull();
      expect(within(section).queryByText('Agregar otra práctica priorizada')).toBeNull();
      expect(within(section).queryByText('Editar')).toBeNull();
      expect(within(section).queryByText('Eliminar')).toBeNull();
      expect(within(section).queryByText('Guardar práctica')).toBeNull();
      expect(within(section).queryByText('Guardar cambios')).toBeNull();
      expect(within(section).queryByRole('textbox')).toBeNull();
      expect(within(section).queryByRole('button')).toBeNull();
    }
  });
});
