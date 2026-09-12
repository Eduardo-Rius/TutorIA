import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning, PlanningDay } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.5.3.1: Direct Official Anverso Header Fidelity (3D11-009-003)', () => {
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
        activities: [{ activityId: 'act-mon', category: 'C', objective: 'ACTIVIDAD_LUNES_HEADER_TEST', description: 'Desc Mon', durationMinutes: 25, materials: ['MATERIAL_LUNES_HEADER_TEST'], curricularTraceability: [] }],
        complementaryActivities: [{ programArea: 'PROGRAMA_LUNES', activityName: 'ACTIVIDAD_COMP_LUNES' }],
        materials: ['MATERIAL_LUNES_HEADER_TEST'],
        evaluation: 'EVALUACION_LUNES_HEADER_TEST',
        evaluationStatus: 'APPROVED'
      },
      {
        date: '2026-08-25',
        dayOfWeek: 'TUESDAY',
        activities: [{ activityId: 'act-tue', category: 'C', objective: 'ACTIVIDAD_MARTES_HEADER_TEST', description: 'Desc Tue', durationMinutes: 30, materials: ['MATERIAL_MARTES_HEADER_TEST'], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: ['MATERIAL_MARTES_HEADER_TEST'],
        evaluation: 'EVALUACION_MARTES_HEADER_TEST',
        evaluationStatus: 'APPROVED'
      },
      { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-27', dayOfWeek: 'THURSDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-28', dayOfWeek: 'FRIDAY', activities: [], complementaryActivities: [], materials: [] }
    ];
    plan.observations = 'Observaciones Header Test';
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

  it('A-J. DIRECT Anverso header fidelity: title, institutional identity, code, identification lines, and NO APROBADA badge', async () => {
    await createPlan('plan-header-test');
    await openDirectOfficialView();

    const mondayAnverso = screen.getByTestId('direct-anverso-MONDAY');

    // Institutional identity
    expect(within(mondayAnverso).getByText(/Instituto Mexicano del Seguro Social/i)).toBeDefined();
    expect(within(mondayAnverso).getByText(/Seguridad y Solidaridad Social/i)).toBeDefined();

    // Official Title & Code
    expect(within(mondayAnverso).getByText('Planeación de Actividades Pedagógicas')).toBeDefined();
    expect(within(mondayAnverso).getByText('(Anverso)')).toBeDefined();
    expect(within(mondayAnverso).getByText(/3D11-009-003/)).toBeDefined();

    // Identification fields
    expect(within(mondayAnverso).getByText('Guardería No.:')).toBeDefined();
    expect(within(mondayAnverso).getByText('Guardería IMSS Demo (001)')).toBeDefined();
    expect(within(mondayAnverso).getByText('Sala de atención o Grupo:')).toBeDefined();
    expect(within(mondayAnverso).getByText('Lactantes C')).toBeDefined();
    expect(within(mondayAnverso).getByText('Periodo:')).toBeDefined();
    expect(within(mondayAnverso).getByText('24 al 28 de agosto de 2026')).toBeDefined();

    // NO non-official APROBADA badge inside DIRECT Anverso
    expect(within(mondayAnverso).queryByText('Aprobada')).toBeNull();
    expect(within(mondayAnverso).queryByText('APROBADA')).toBeNull();
    expect(within(mondayAnverso).queryByText('Borrador')).toBeNull();

    // Section bar
    expect(within(mondayAnverso).getByText('Planeación')).toBeDefined();
  });

  it('K-P. Monday Anverso retains body sections, pedagogical content, evaluation, complementaries, materials, prioritized practices, and signatures', async () => {
    await createPlan('plan-body-preservation');
    await openDirectOfficialView();

    const mondayAnverso = screen.getByTestId('direct-anverso-MONDAY');

    // K. Pedagogical activities
    expect(within(mondayAnverso).getByText('ACTIVIDAD_LUNES_HEADER_TEST')).toBeDefined();

    // L. Daily evaluation
    expect(within(mondayAnverso).getByText('EVALUACION_LUNES_HEADER_TEST')).toBeDefined();

    // M. Complementary activities
    expect(within(mondayAnverso).getByText('[PROGRAMA_LUNES]')).toBeDefined();
    expect(within(mondayAnverso).getByText('ACTIVIDAD_COMP_LUNES')).toBeDefined();

    // N. Materials
    expect(within(mondayAnverso).getByText('MATERIAL_LUNES_HEADER_TEST')).toBeDefined();

    // O. Prioritized practices
    expect(within(mondayAnverso).getByText('Práctica(s) Priorizada(s) a implementar')).toBeDefined();

    // P. Signatures
    expect(within(mondayAnverso).getByText('Educadora')).toBeDefined();
    expect(within(mondayAnverso).getByText('Oficial de Puericultura')).toBeDefined();
    expect(within(mondayAnverso).queryByText('Directora')).toBeNull();
  });

  it('Q-T. DIRECT Reverso and 5 daily pairs remain structurally preserved', async () => {
    await createPlan('plan-reverso-preservation');
    await openDirectOfficialView();

    const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    for (const d of weekdays) {
      expect(screen.getByTestId(`direct-anverso-${d}`)).toBeDefined();
      expect(screen.getByTestId(`direct-reverso-${d}`)).toBeDefined();

      const reverso = screen.getByTestId(`direct-reverso-${d}`);
      expect(within(reverso).getByText('Elementos curriculares del Programa Sintético de la Fase 1 para educación inicial')).toBeDefined();
      expect(within(reverso).getByText('Lenguajes')).toBeDefined();
      expect(within(reverso).getByText('Saberes y Pensamiento Científico')).toBeDefined();
      expect(within(reverso).getByText('Ética, Naturaleza y Sociedades')).toBeDefined();
      expect(within(reverso).getByText('De lo Humano y lo Comunitario')).toBeDefined();
    }
  });

  it('U. INDIRECT official view remains reachable and behaviorally unchanged', async () => {
    await createPlan('plan-indirect-preservation');
    render(<PlanningDemoApp service={service} source={source} />);

    // Switch combobox to INDIRECT
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
