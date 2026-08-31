import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('H1R5: State, History, and Print Remediation', () => {
  let service: PlanningWorkflowService;
  let repo: InMemoryWeeklyPlanningRepository;

  beforeEach(() => {
    repo = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repo);
    vi.restoreAllMocks();
  });

  it('P0-16 & P0-17: Preserves append-only review history and propagates RESOLVED state across views', async () => {
    // 1. Create a plan in DRAFT state
    const plan = WeeklyPlanning.create('plan-1', 'dc-1', 'rm-1', 't1', '2026-08-10', '2026-08-14');
    plan.editPedagogicalContent('obs', 'needs', 'sit', 'mat', ['ref1'], [
        { dayOfWeek: 'MONDAY', date: '2026-08-10', activities: [{ activityId: 'a1', category: 'C', objective: 'Obj 1', description: 'Desc 1', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'TUESDAY', date: '2026-08-11', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-12', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'THURSDAY', date: '2026-08-13', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'FRIDAY', date: '2026-08-14', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
    ]);
    plan.submit();
    await repo.save(plan);

    const ui = render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

    // ROLE: DIRECTOR (Round 1 Observation)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    // Expand activity
    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    const obsInput = screen.getByPlaceholderText(/sugerencia tienes/i);
    fireEvent.change(obsInput, { target: { value: 'Obs Round 1' } });
    fireEvent.click(screen.getByText('Guardar observación'));
    fireEvent.click(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA')[0] as HTMLElement);

    // ROLE: EDUCATOR (Round 1 Correction)
    fireEvent.click(screen.getByText('Anita (Pedagoga)'));
    await waitFor(() => expect(screen.getByText('Revisar sugerencias de la Directora')).toBeTruthy());
    fireEvent.click(screen.getByText('Revisar sugerencias de la Directora'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    await waitFor(() => expect(screen.getByDisplayValue('Desc 1')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('Desc 1'), { target: { value: 'Desc 1 edited' } });

    await waitFor(() => expect(screen.getByText('Enviar correcciones a la Directora')).toBeTruthy());
    fireEvent.click(screen.getByText('Enviar correcciones a la Directora'));

    // ROLE: DIRECTOR (Round 2 Observation)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    // Expand activity again
    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    const obsInputs2 = screen.getByPlaceholderText(/nuevo ajuste/i);
    fireEvent.change(obsInputs2, { target: { value: 'Obs Round 2' } });
    fireEvent.click(screen.getByText(/SOLICITAR NUEVO AJUSTE/i));
    fireEvent.click(screen.getAllByText('ENVIAR OBSERVACIONES A LA EDUCADORA')[0] as HTMLElement);

    // ROLE: EDUCATOR (Round 2 Correction)
    fireEvent.click(screen.getByText('Anita (Pedagoga)'));
    await waitFor(() => expect(screen.getByText('Revisar sugerencias de la Directora')).toBeTruthy());
    fireEvent.click(screen.getByText('Revisar sugerencias de la Directora'));

    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    await waitFor(() => expect(screen.getByDisplayValue('Desc 1 edited')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('Desc 1 edited'), { target: { value: 'Desc 1 edited 2' } });

    await waitFor(() => expect(screen.getByText('Enviar correcciones a la Directora')).toBeTruthy());
    fireEvent.click(screen.getByText('Enviar correcciones a la Directora'));

    // ROLE: DIRECTOR (Marks Attended)
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    // Expand activity
    await waitFor(() => expect(screen.getByText('Obj 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Obj 1'));

    await waitFor(() => expect(screen.getByText('MARCAR COMO ATENDIDA')).toBeTruthy());
    fireEvent.click(screen.getByText('MARCAR COMO ATENDIDA'));

    await waitFor(() => expect(screen.getByText(/Atendida/i)).toBeTruthy());
    await waitFor(() => expect(screen.getByRole("tab", { name: /Lunes 24/i })).toBeTruthy());
    const daysToReview = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of daysToReview) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") }));
      if (screen.queryByText("Marcar día revisado")) {
        fireEvent.click(screen.getByText("Marcar día revisado"));
      }
    }


    // ROLE: SUPERVISOR (Checks History)
    fireEvent.click(screen.getByText(/APROBAR TODA LA PLANE/i));

    await waitFor(async () => {
      const p = await repo.listApproved();
      expect(p.length).toBeGreaterThan(0);
    });

    const planToClose = await repo.findById('plan-1');
    if (planToClose) {
      for (const d of planToClose.days) {
        d.evaluation = 'Evaluación completada';
        d.evaluationStatus = 'APPROVED';
      }
      planToClose.status = 'CLOSED';
      planToClose.closedBy = 'Ceci';
      planToClose.closedAt = new Date();
      await repo.save(planToClose);
    }

    fireEvent.click(screen.getByText('Tere (Supervisora)'));
    await waitFor(() => expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText('Anita'));

    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));

    expect(screen.getByText(/ÚLTIMA REVISIÓN/i)).toBeTruthy();
    expect(screen.getByText(/REVISIÓN ANTERIOR/i)).toBeTruthy();

    const resolvedBadges = screen.getAllByText(/Atendida/i);
    expect(resolvedBadges.length).toBeGreaterThan(0);
  });

  it('P0-18: Render DIRECT isolated print markup', async () => {
    // 1. Create a plan in APPROVED state
    const plan = WeeklyPlanning.create('plan-print', 'dc-1', 'rm-1', 't1', '2026-08-10', '2026-08-14');
    plan.editPedagogicalContent('obs', 'needs', 'sit', 'mat', ['ref1'], [
        { dayOfWeek: 'MONDAY', date: '2026-08-10', activities: [{ activityId: 'a1', category: 'C', objective: 'Obj 1', description: 'Desc 1', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'TUESDAY', date: '2026-08-11', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-12', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'THURSDAY', date: '2026-08-13', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'FRIDAY', date: '2026-08-14', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
    ]);
    plan.submit();
    plan.approve('DIRECTOR');
    await repo.save(plan);

    const ui = render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

    // Select DIRECT
    const modalitySelect = screen.getByRole('combobox');
    fireEvent.change(modalitySelect, { target: { value: 'DIRECT' } });

    // Switch to Educator, should see Approved status and Print button
    fireEvent.click(screen.getByText('Anita (Pedagoga)'));

    // We need to wait for the plans list to show up for Educator,
    // and click "Propuesta lista para usarse"
    await waitFor(() => expect(screen.getByText(/Propuesta lista para usarse/i)).toBeTruthy());
    fireEvent.click(screen.getByText(/Propuesta lista para usarse/i));

    // Wait for Educator's detail view to show "Versión Oficial IMSS" button
    await waitFor(() => expect(screen.getByText('Versión Oficial IMSS')).toBeTruthy());

    // Click it to switch to PRINT view
    fireEvent.click(screen.getByText('Versión Oficial IMSS'));

    // Wait for PRINT view to render and show "Imprimir PDF"
    await waitFor(() => expect(screen.getByText('Imprimir PDF')).toBeTruthy());

    let printedHtml = '';
    const mockWindow = {
      document: {
        write: (html: string) => { printedHtml += html; },
        close: () => {}
      },
      print: () => {},
      close: () => {},
      focus: () => {}
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);

    // Click "Imprimir PDF" to trigger the print popup
    fireEvent.click(screen.getByText('Imprimir PDF'));

    expect(printedHtml).toContain('Planeación de Actividades Pedagógicas');
    expect(printedHtml).toContain('3D11-009-003');
  });

  it('P0-18: Render INDIRECT isolated print markup', async () => {
    // 1. Create a plan in APPROVED state
    const plan = WeeklyPlanning.create('plan-print-2', 'dc-1', 'rm-1', 't1', '2026-08-10', '2026-08-14');
    plan.editPedagogicalContent('obs', 'needs', 'sit', 'mat', ['ref1'], [
        { dayOfWeek: 'MONDAY', date: '2026-08-10', activities: [{ activityId: 'a1', category: 'C', objective: 'Obj 1', description: 'Desc 1', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'TUESDAY', date: '2026-08-11', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-12', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'THURSDAY', date: '2026-08-13', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'FRIDAY', date: '2026-08-14', activities: [{ activityId: 'a_dummy', category: 'C', objective: 'Obj', description: 'Desc', durationMinutes: 30, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
    ]);
    plan.submit();
    plan.approve('DIRECTOR');
    await repo.save(plan);

    const ui = render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

    // Select INDIRECT
    const modalitySelect = screen.getByRole('combobox');
    fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });

    // Switch to Educator
    fireEvent.click(screen.getByText('Anita (Pedagoga)'));

    await waitFor(() => expect(screen.getByText(/Propuesta lista para usarse/i)).toBeTruthy());
    fireEvent.click(screen.getByText(/Propuesta lista para usarse/i));

    await waitFor(() => expect(screen.getByText('Versión Oficial IMSS')).toBeTruthy());
    fireEvent.click(screen.getByText('Versión Oficial IMSS'));

    await waitFor(() => expect(screen.getByText('Imprimir PDF')).toBeTruthy());

    let printedHtml = '';
    const mockWindow = {
      document: {
        write: (html: string) => { printedHtml += html; },
        close: () => {}
      },
      print: () => {},
      close: () => {},
      focus: () => {}
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);

    fireEvent.click(screen.getByText('Imprimir PDF'));

    expect(printedHtml).toContain('Planeación de Acciones Pedagógicas');
    expect(printedHtml).toContain('DPES/CG/2020/PDG/04');
  });
});
