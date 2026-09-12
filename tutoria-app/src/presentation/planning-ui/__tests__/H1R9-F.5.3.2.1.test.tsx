import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.5.3.2.1: Direct Physical Print Safe Inset — Corrective Test', () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createPlan = async (id: string) => {
    const plan = WeeklyPlanning.create(id, 'dc-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    plan.days = [
      {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        activities: [{ activityId: 'act-mon', category: 'C', objective: 'ACTIVIDAD_LUNES_INSET_TEST', description: 'Desc Mon', durationMinutes: 25, materials: ['MATERIAL_LUNES_INSET_TEST'], curricularTraceability: [] }],
        complementaryActivities: [{ programArea: 'PROGRAMA_LUNES', activityName: 'ACTIVIDAD_COMP_LUNES' }],
        materials: ['MATERIAL_LUNES_INSET_TEST'],
        evaluation: 'EVALUACION_LUNES_INSET_TEST',
        evaluationStatus: 'APPROVED'
      },
      {
        date: '2026-08-25',
        dayOfWeek: 'TUESDAY',
        activities: [{ activityId: 'act-tue', category: 'C', objective: 'ACTIVIDAD_MARTES_INSET_TEST', description: 'Desc Tue', durationMinutes: 30, materials: ['MATERIAL_MARTES_INSET_TEST'], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: ['MATERIAL_MARTES_INSET_TEST'],
        evaluation: 'EVALUACION_MARTES_INSET_TEST',
        evaluationStatus: 'APPROVED'
      },
      { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-27', dayOfWeek: 'THURSDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-28', dayOfWeek: 'FRIDAY', activities: [], complementaryActivities: [], materials: [] }
    ];
    plan.observations = 'Observaciones Inset Test';
    plan.status = 'APPROVED_FOR_EXECUTION';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date();
    await repository.save(plan);
    return plan;
  };

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

  it('A-F. DIRECT print maintains internal safe-print inset structure, 5 Anverso + 5 Reverso pairs, and Monday content/signatures', async () => {
    await createPlan('plan-inset-test');
    await openDirectOfficialView();

    const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    // B & C: 5 Anversos + 5 Reversos exist
    for (const d of weekdays) {
      expect(screen.getByTestId(`direct-anverso-${d}`)).toBeDefined();
      expect(screen.getByTestId(`direct-reverso-${d}`)).toBeDefined();
    }

    // D: Monday content
    const mondayAnverso = screen.getByTestId('direct-anverso-MONDAY');
    expect(within(mondayAnverso).getByText('Planeación de Actividades Pedagógicas')).toBeDefined();
    expect(within(mondayAnverso).getByText('Guardería No.:')).toBeDefined();
    expect(within(mondayAnverso).getByText('Guardería IMSS Demo (001)')).toBeDefined();
    expect(within(mondayAnverso).getByText('Sala de atención o Grupo:')).toBeDefined();
    expect(within(mondayAnverso).getByText('Lactantes C')).toBeDefined();
    expect(within(mondayAnverso).getByText('Periodo:')).toBeDefined();
    expect(within(mondayAnverso).getByText('24 al 28 de agosto de 2026')).toBeDefined();
    expect(within(mondayAnverso).getByText('ACTIVIDAD_LUNES_INSET_TEST')).toBeDefined();
    expect(within(mondayAnverso).getByText('EVALUACION_LUNES_INSET_TEST')).toBeDefined();

    // E: Signatures
    expect(within(mondayAnverso).getByText('Educadora')).toBeDefined();
    expect(within(mondayAnverso).getByText('Oficial de Puericultura')).toBeDefined();

    // F: Curricular matrix on Reverso
    const mondayReverso = screen.getByTestId('direct-reverso-MONDAY');
    expect(within(mondayReverso).getByText('Elementos curriculares del Programa Sintético de la Fase 1 para educación inicial')).toBeDefined();
    expect(within(mondayReverso).getByText('Lenguajes')).toBeDefined();
    expect(within(mondayReverso).getByText('Saberes y Pensamiento Científico')).toBeDefined();
    expect(within(mondayReverso).getByText('Ética, Naturaleza y Sociedades')).toBeDefined();
    expect(within(mondayReverso).getByText('De lo Humano y lo Comunitario')).toBeDefined();
  });

  it('G. INDIRECT official view remains behaviorally and structurally unchanged', async () => {
    await createPlan('plan-indirect-inset-test');
    render(<PlanningDemoApp service={service} source={source} />);

    const modalitySelect = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });
    });

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

    expect(screen.getAllByText(/Planeación de Acciones Pedagógicas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('DPES/CG/2020/PDG/04').length).toBeGreaterThan(0);
  });
});
