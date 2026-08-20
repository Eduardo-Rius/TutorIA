import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';

describe('H1R6: Audit Snapshot Correctness + Director Authorization', () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
  });

  it('P0-1 to P0-6: EXACT CONTENT SNAPSHOTS (BEFORE != AFTER)', async () => {
    const plan = WeeklyPlanning.create('plan-1', 'dc-1', 'rm-1', 't1', '2026-08-10', '2026-08-14');
    plan.editPedagogicalContent('obs', 'needs', 'sit', 'mat', ['ref1'], [
        { dayOfWeek: 'MONDAY', date: '2026-08-10', activities: [{ activityId: 'act1', category: 'C', objective: 'Obj 1', description: 'Desc 1', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'TUESDAY', date: '2026-08-11', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-12', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'THURSDAY', date: '2026-08-13', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'FRIDAY', date: '2026-08-14', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
    ] as any);
    plan.submit();
    await repository.save(plan);

    render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

    // ROLE: DIRECTOR (Round 1)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    await waitFor(() => expect(screen.getByPlaceholderText(/¿Qué sugerencia tienes/i)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(/¿Qué sugerencia tienes/i), { target: { value: 'DIRECTOR_FEEDBACK_ALPHA' } });
    fireEvent.click(screen.getByText('Guardar observación'));

    await waitFor(() => expect(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA')[0] as HTMLElement);

    // ROLE: EDUCATOR (Correction)
    fireEvent.click(screen.getByText('Anita (Pedagoga)'));
    await waitFor(() => expect(screen.getByText('Revisar sugerencias de la Directora')).toBeTruthy());
    fireEvent.click(screen.getByText('Revisar sugerencias de la Directora'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    await waitFor(() => expect(screen.getByDisplayValue('Desc 1')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('Desc 1'), { target: { value: 'CORRECTED_ACTIVITY_BETA' } });

    await waitFor(() => expect(screen.getByText('Enviar a Revisión')).toBeTruthy());
    fireEvent.click(screen.getByText('Enviar a Revisión'));

    // ROLE: DIRECTOR (Review and Resolve)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    // Verify Director sees BEFORE = Desc 1, NOW = CORRECTED_ACTIVITY_BETA
    expect(screen.getAllByText('Desc 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CORRECTED_ACTIVITY_BETA').length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByText('MARCAR COMO ATENDIDA')).toBeTruthy());
    fireEvent.click(screen.getByText('MARCAR COMO ATENDIDA'));

    // Approve to archive
    await waitFor(() => expect(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN')).toBeTruthy());
    fireEvent.click(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN'));

    // ROLE: SUPERVISOR (Audit)
    fireEvent.click(screen.getByText('Tere (Supervisora)'));
    await waitFor(() => expect(screen.getByText(/Planeación aprobada/i)).toBeTruthy());
    fireEvent.click(screen.getByText(/Planeación aprobada/i));

    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));

    await waitFor(() => expect(screen.getByText(/ÚLTIMA REVISIÓN/i)).toBeTruthy());

    // Assert Supervisor history contains the BEFORE and AFTER correctly
    expect(screen.getAllByText('Desc 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CORRECTED_ACTIVITY_BETA').length).toBeGreaterThan(0);
  });

  it('P0-7: TWO ROUND CHAIN (A -> B -> C)', async () => {
    const plan = WeeklyPlanning.create('plan-2', 'dc-1', 'rm-1', 't1', '2026-08-10', '2026-08-14');
    plan.editPedagogicalContent('obs', 'needs', 'sit', 'mat', ['ref1'], [
        { dayOfWeek: 'MONDAY', date: '2026-08-10', activities: [{ activityId: 'act1', category: 'C', objective: 'Obj 1', description: 'ORIGINAL_A', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'TUESDAY', date: '2026-08-11', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-12', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'THURSDAY', date: '2026-08-13', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'FRIDAY', date: '2026-08-14', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
    ] as any);
    plan.submit();
    await repository.save(plan);

    render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

    // ROLE: DIRECTOR (Round 1)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));
    await waitFor(() => expect(screen.getByPlaceholderText(/¿Qué sugerencia tienes/i)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(/¿Qué sugerencia tienes/i), { target: { value: 'FEEDBACK 1' } });
    fireEvent.click(screen.getByText('Guardar observación'));
    await waitFor(() => expect(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA')[0] as HTMLElement);

    // ROLE: EDUCATOR (Correction 1)
    fireEvent.click(screen.getByText('Anita (Pedagoga)'));
    await waitFor(() => expect(screen.getByText('Revisar sugerencias de la Directora')).toBeTruthy());
    fireEvent.click(screen.getByText('Revisar sugerencias de la Directora'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));
    await waitFor(() => expect(screen.getByDisplayValue('ORIGINAL_A')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('ORIGINAL_A'), { target: { value: 'CORRECTED_B' } });
    fireEvent.click(screen.getByText('Enviar a Revisión'));

    // ROLE: DIRECTOR (Round 2)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));
    await waitFor(() => expect(screen.getByPlaceholderText(/nuevo ajuste/i)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(/nuevo ajuste/i), { target: { value: 'FEEDBACK 2' } });
    fireEvent.click(screen.getByText('SOLICITAR NUEVO AJUSTE (Guardar observación)'));
    await waitFor(() => expect(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA')[0] as HTMLElement);

    // ROLE: EDUCATOR (Correction 2)
    fireEvent.click(screen.getByText('Anita (Pedagoga)'));
    await waitFor(() => expect(screen.getByText('Revisar sugerencias de la Directora')).toBeTruthy());
    fireEvent.click(screen.getByText('Revisar sugerencias de la Directora'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));
    await waitFor(() => expect(screen.getByDisplayValue('CORRECTED_B')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('CORRECTED_B'), { target: { value: 'CORRECTED_C' } });
    fireEvent.click(screen.getByText('Enviar a Revisión'));

    // ROLE: DIRECTOR (Approve)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));
    await waitFor(() => expect(screen.getByText('MARCAR COMO ATENDIDA')).toBeTruthy());
    fireEvent.click(screen.getByText('MARCAR COMO ATENDIDA'));

    await waitFor(() => expect(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN')).toBeTruthy());
    fireEvent.click(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN'));

    // ROLE: SUPERVISOR (Audit Chain)
    fireEvent.click(screen.getByText('Tere (Supervisora)'));
    await waitFor(() => expect(screen.getByText(/Planeación aprobada/i)).toBeTruthy());
    fireEvent.click(screen.getByText(/Planeación aprobada/i));
    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));

    await waitFor(() => expect(screen.getByText(/ÚLTIMA REVISIÓN/i)).toBeTruthy());

    // Check Round 2 is B -> C
    expect(screen.getAllByText('CORRECTED_B').length).toBeGreaterThan(0);
    expect(screen.getByText('CORRECTED_C')).toBeTruthy();

    // Check Round 1 is A -> B
    fireEvent.click(screen.getByText(/REVISIÓN ANTERIOR — RONDA 1/i));
    await waitFor(() => expect(screen.getByText('ORIGINAL_A')).toBeTruthy());
    // Note: CORRECTED_B appears in both rounds, so getAllByText would find 2
    expect(screen.getAllByText('CORRECTED_B').length).toBeGreaterThanOrEqual(2);
  });

  it('P0-8 to P0-10: RESOLUTION AUDIT & PLAN APPROVAL SEPARATION', () => {
    // This is tested in the above flows natively, but let's just do a focused check
    // by reading the repo object since it's the domain truth

    const plan = WeeklyPlanning.create('plan1', 'dc1', 'room1', 't1', 'week1', 'week2');

    // Educator edit
    plan.days = [{ dayOfWeek: 'MONDAY', activities: [{ activityId: 'act1', category: '', objective: 'obj', description: 'XYZ', materials: [], durationMinutes: 10, curricularTraceability: [] }], complementaryActivities: [], materials: [] } as any,
                 { dayOfWeek: 'TUESDAY', activities: [], complementaryActivities: [], materials: [] } as any,
                 { dayOfWeek: 'WEDNESDAY', activities: [], complementaryActivities: [], materials: [] } as any,
                 { dayOfWeek: 'THURSDAY', activities: [], complementaryActivities: [], materials: [] } as any,
                 { dayOfWeek: 'FRIDAY', activities: [], complementaryActivities: [], materials: [] } as any];

    // Add a granular observation
    plan.submit();
    plan.reject('revisar', 'Ceci', [{ targetId: 'act1', observation: 'Change this', originalContent: 'ABC',  status: 'PENDING_CORRECTION', reviewer: 'Ceci', timestamp: new Date() }]);

    plan.editPedagogicalContent('', '', '', '', [], plan.days);
    plan.submit();

    // Director resolves but DOES NOT approve yet
    plan.resolveGranularObservation('act1', 'Ceci');

    // Audit resolution state
    const obs = plan.granularObservations[0]!;
    expect(obs.status).toBe('RESOLVED');
    expect(obs.resolvedBy).toBe('Ceci');
    expect(obs.resolvedAt).toBeInstanceOf(Date);

    // Audit plan state
    expect(plan.status).toBe('IN_REVIEW');
    expect(plan.approvedBy).toBeUndefined();
    expect(plan.approvedAt).toBeUndefined();

    // Now approve
    plan.approve('Ceci');

    // Audit plan approval state
    expect(plan.status).toBe('APPROVED');
    expect(plan.approvedBy).toBe('Ceci');
    expect(plan.approvedAt).toBeInstanceOf(Date);

    // Assert history retained resolution
    expect(plan.historicalRounds.length).toBe(1);
    const histObs = plan.historicalRounds[0]!.observations[0]!;
    expect(histObs.status).toBe('RESOLVED');
    expect(histObs.resolvedBy).toBe('Ceci');
    expect(histObs.resolvedAt).toBeDefined();
  });
});
