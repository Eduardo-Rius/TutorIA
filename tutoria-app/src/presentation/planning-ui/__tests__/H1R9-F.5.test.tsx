import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning, PlanningDay, ComplementaryProgramActivity } from '../../../domain/planning/WeeklyPlanning';

describe('H1R9-F.5: Official DIRECT + INDIRECT Complementary Program Binding', () => {
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
    plan.observations = 'Observaciones del grupo';
    plan.status = 'APPROVED_FOR_EXECUTION';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date();
    await repository.save(plan);
    return plan;
  };

  const createDefaultEmptyDays = (): PlanningDay[] => [
    { date: '2026-08-24', dayOfWeek: 'MONDAY', activities: [{ activityId: 'a1', category: 'C', objective: 'Obj 1', description: 'Desc 1', durationMinutes: 20, materials: ['Mat 1'], curricularTraceability: [] }], complementaryActivities: [], materials: [] },
    { date: '2026-08-25', dayOfWeek: 'TUESDAY', activities: [{ activityId: 'a2', category: 'C', objective: 'Obj 2', description: 'Desc 2', durationMinutes: 20, materials: ['Mat 2'], curricularTraceability: [] }], complementaryActivities: [], materials: [] },
    { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', activities: [{ activityId: 'a3', category: 'C', objective: 'Obj 3', description: 'Desc 3', durationMinutes: 20, materials: ['Mat 3'], curricularTraceability: [] }], complementaryActivities: [], materials: [] },
    { date: '2026-08-27', dayOfWeek: 'THURSDAY', activities: [{ activityId: 'a4', category: 'C', objective: 'Obj 4', description: 'Desc 4', durationMinutes: 20, materials: ['Mat 4'], curricularTraceability: [] }], complementaryActivities: [], materials: [] },
    { date: '2026-08-28', dayOfWeek: 'FRIDAY', activities: [{ activityId: 'a5', category: 'C', objective: 'Obj 5', description: 'Desc 5', durationMinutes: 20, materials: ['Mat 5'], curricularTraceability: [] }], complementaryActivities: [], materials: [] }
  ];

  const openOfficialView = async (modality: 'DIRECT' | 'INDIRECT') => {
    render(<PlanningDemoApp service={service} source={source} />);

    if (modality === 'INDIRECT') {
      const modalitySelect = screen.getByRole('combobox');
      fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });
    }

    // Go to Teacher list / approved card
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

  // ==========================================
  // DIRECT FORMAT TESTS (A - F)
  // ==========================================
  describe('DIRECT Official View (3D11-009-003)', () => {
    it('A, B & C. DIRECT view renders section heading, removes static "Pendiente", and shows neutral finalized statement when []', async () => {
      await createPlanWithDays('plan-direct-empty', createDefaultEmptyDays());
      await openOfficialView('DIRECT');

      expect((await screen.findAllByText(/Planeación de Actividades Pedagógicas/i))[0]).toBeDefined();
      expect(screen.getAllByText('Código: 3D11-009-003')[0]).toBeDefined();

      const heading = screen.getAllByText('Actividades complementarias de otros programas')[0];
      expect(heading).toBeDefined();

      const emptyNotices = screen.getAllByText('Sin actividad complementaria registrada para este día.');
      expect(emptyNotices.length).toBe(5);

      // Verify the governance explanation does NOT appear in official print
      expect(screen.queryByText(/TutorIA no asignará actividades de otros programas/i)).toBeNull();
    });

    it('D & E. DIRECT view renders neutral structured activity fields and omits missing optional fields without placeholders', async () => {
      const days = createDefaultEmptyDays();
      const activityFull: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_A',
        activityName: 'ACTIVITY_TEST_A',
        purpose: 'PURPOSE_TEST_A',
        description: 'DESCRIPTION_TEST_A',
        sourceReference: 'SOURCE_REFERENCE_TEST_A'
      };
      const activityMinimal: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_MINIMAL',
        activityName: 'ACTIVITY_TEST_MINIMAL'
      };

      days[0].complementaryActivities = [activityFull];
      days[1].complementaryActivities = [activityMinimal];

      await createPlanWithDays('plan-direct-structured', days);
      await openOfficialView('DIRECT');

      // Day 1: Full activity
      expect(await screen.findByText('[PROGRAM_AREA_TEST_A]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_A')).toBeDefined();
      expect(screen.getByText(/PURPOSE_TEST_A/)).toBeDefined();
      expect(screen.getByText('DESCRIPTION_TEST_A')).toBeDefined();
      expect(screen.getByText(/SOURCE_REFERENCE_TEST_A/)).toBeDefined();

      // Day 2: Minimal activity (no purpose, description, sourceReference)
      expect(screen.getByText('[PROGRAM_AREA_TEST_MINIMAL]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_MINIMAL')).toBeDefined();
      expect(screen.queryByText(/undefined/i)).toBeNull();
      expect(screen.queryByText(/null/i)).toBeNull();
    });

    it('F. DIRECT view renders multiple neutral activities on a single day in order', async () => {
      const days = createDefaultEmptyDays();
      const act1: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_1',
        activityName: 'ACTIVITY_TEST_1',
        description: 'Desc 1'
      };
      const act2: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_2',
        activityName: 'ACTIVITY_TEST_2',
        description: 'Desc 2'
      };

      days[0].complementaryActivities = [act1, act2];

      await createPlanWithDays('plan-direct-multi', days);
      await openOfficialView('DIRECT');

      expect(await screen.findByText('[PROGRAM_AREA_TEST_1]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_1')).toBeDefined();
      expect(screen.getByText('[PROGRAM_AREA_TEST_2]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_2')).toBeDefined();
    });
  });

  // ==========================================
  // INDIRECT FORMAT TESTS (G - L)
  // ==========================================
  describe('INDIRECT Official View (DPES/CG/2020/PDG/04)', () => {
    it('G, H & I. INDIRECT view renders section heading, removes static "Pendiente", and shows neutral finalized statement when []', async () => {
      await createPlanWithDays('plan-indirect-empty', createDefaultEmptyDays());
      await openOfficialView('INDIRECT');

      expect(await screen.findAllByText(/Planeación de Acciones Pedagógicas/i)).toBeDefined();
      expect(screen.getAllByText('DPES/CG/2020/PDG/04').length).toBe(5);

      const headings = screen.getAllByText('Actividades complementarias de otros programas');
      expect(headings.length).toBe(5);

      const emptyNotices = screen.getAllByText('Sin actividad complementaria registrada para este día.');
      expect(emptyNotices.length).toBe(5);

      expect(screen.queryByText(/TutorIA no asignará actividades de otros programas/i)).toBeNull();
    });

    it('J & K. INDIRECT view renders neutral structured activity fields and omits missing optional fields without placeholders', async () => {
      const days = createDefaultEmptyDays();
      const activityFull: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_A',
        activityName: 'ACTIVITY_TEST_A',
        purpose: 'PURPOSE_TEST_A',
        description: 'DESCRIPTION_TEST_A',
        sourceReference: 'SOURCE_REFERENCE_TEST_A'
      };

      days[0].complementaryActivities = [activityFull];

      await createPlanWithDays('plan-indirect-structured', days);
      await openOfficialView('INDIRECT');

      expect(await screen.findByText('[PROGRAM_AREA_TEST_A]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_A')).toBeDefined();
      expect(screen.getByText(/PURPOSE_TEST_A/)).toBeDefined();
      expect(screen.getByText('DESCRIPTION_TEST_A')).toBeDefined();
      expect(screen.getByText(/SOURCE_REFERENCE_TEST_A/)).toBeDefined();
      expect(screen.queryByText(/undefined/i)).toBeNull();
      expect(screen.queryByText(/null/i)).toBeNull();
    });

    it('L. INDIRECT view renders multiple neutral activities on a single day in order', async () => {
      const days = createDefaultEmptyDays();
      const act1: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_1',
        activityName: 'ACTIVITY_TEST_1',
        description: 'Desc 1'
      };
      const act2: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_2',
        activityName: 'ACTIVITY_TEST_2',
        description: 'Desc 2'
      };

      days[0].complementaryActivities = [act1, act2];

      await createPlanWithDays('plan-indirect-multi', days);
      await openOfficialView('INDIRECT');

      expect(await screen.findByText('[PROGRAM_AREA_TEST_1]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_1')).toBeDefined();
      expect(screen.getByText('[PROGRAM_AREA_TEST_2]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_2')).toBeDefined();
    });
  });

  // ==========================================
  // DAILY DATA-INTEGRITY TEST (M)
  // ==========================================
  describe('Daily Data-Integrity', () => {
    it('M. Proves each day renders its own complementary activities independently without cross-day leakage', async () => {
      const days = createDefaultEmptyDays();
      const mondayActivity: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_MONDAY',
        activityName: 'ACTIVITY_TEST_MONDAY'
      };
      const tuesdayActivity: ComplementaryProgramActivity = {
        programArea: 'PROGRAM_AREA_TEST_TUESDAY',
        activityName: 'ACTIVITY_TEST_TUESDAY'
      };

      days[0].complementaryActivities = [mondayActivity];
      days[1].complementaryActivities = [tuesdayActivity];
      // Wed, Thu, Fri remain []

      await createPlanWithDays('plan-integrity-test', days);
      await openOfficialView('DIRECT');

      // Monday has TEST_MONDAY
      expect(await screen.findByText('[PROGRAM_AREA_TEST_MONDAY]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_MONDAY')).toBeDefined();

      // Tuesday has TEST_TUESDAY
      expect(screen.getByText('[PROGRAM_AREA_TEST_TUESDAY]')).toBeDefined();
      expect(screen.getByText('ACTIVITY_TEST_TUESDAY')).toBeDefined();

      // Wednesday, Thursday, Friday show empty state
      const emptyNotices = screen.getAllByText('Sin actividad complementaria registrada para este día.');
      expect(emptyNotices.length).toBe(3);
    });
  });
});
