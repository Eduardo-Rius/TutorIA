import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import {
  PlanningDemoApp,
  getApprovedEvaluationForPrint,
  KNOWN_HISTORICAL_SUPERVISORY_INSTRUCTION,
} from '../PlanningDemoApp';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_SUPERVISOR_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_PLANNING_ID,
  FIRST_LIGHT_G002_DAYCARE_ID,
  FIRST_LIGHT_G002_SUPERVISOR_ID,
} from '../firstLightLabHarness';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { DIRECT_PDA_CATALOG } from '../../../domain/planning/DirectCurricularCatalog';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';

describe('SR-MD-27 — Corrección Transversal del Formato Oficial IMSS (Evaluaciones)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
  });

  const createMockAuth = (uid: string | null): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid ? { uid, email: `${uid}@lab.tutoria.invalid` } : null),
  });

  const buildClosedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    params: {
      planningId?: string;
      daycareId?: string;
      roomId?: string;
      daysConfig?: Array<{
        dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
        evaluation?: string;
        evaluationStatus?: 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED';
        evaluationDirectorComment?: string;
        evaluationHistory?: Array<{
          evaluation: string;
          directorComment?: string;
          status: string;
          submittedAt: Date;
          submittedBy: string;
          reviewedAt?: Date;
          reviewedBy?: string;
        }>;
      }>;
    }
  ) => {
    const planningId = params.planningId || FIRST_LIGHT_PLANNING_ID;
    const daycareId = params.daycareId || FIRST_LIGHT_DAYCARE_ID;
    const roomId = params.roomId || 'room-lactantes-b';

    const plan = WeeklyPlanning.create(
      planningId,
      daycareId,
      roomId,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );

    const recs = await source.generateRecommendation(null as any, 'Obs', 'Needs', 'Sit', 'Mat');
    plan.days = recs;
    plan.observations = 'Observaciones pedagógicas del grupo.';
    plan.identifiedNeeds = 'Atención y motricidad.';
    plan.specialSituations = 'Sin situaciones especiales.';
    plan.availableMaterials = 'Materiales sensoriales seguros.';

    // Traceability on Monday
    const pda1 = DIRECT_PDA_CATALOG[0]!;
    plan.setActivityCurricularTraceability('MONDAY', plan.days[0]!.activities[0]!.activityId, [
      { pdaId: pda1.id, catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1' },
    ]);

    // Apply day overrides
    for (const d of plan.days) {
      const override = params.daysConfig?.find((c) => c.dayOfWeek === d.dayOfWeek);
      if (override) {
        d.evaluation = override.evaluation;
        d.evaluationStatus = override.evaluationStatus;
        d.evaluationDirectorComment = override.evaluationDirectorComment;
        d.evaluationHistory = override.evaluationHistory as any;
      } else {
        d.evaluation = `Evaluación aprobada de ${d.dayOfWeek}`;
        d.evaluationStatus = 'APPROVED';
      }
    }

    plan.status = 'CLOSED';
    plan.closedBy = FIRST_LIGHT_DIRECTOR_ID;
    plan.closedAt = new Date();
    await repo.save(plan);
    return plan;
  };

  describe('1. Función Pura getApprovedEvaluationForPrint: Reglas de Estructura e Integridad', () => {
    it('1.1. Retorna la evaluación pedagógica cuando evaluationStatus === APPROVED', () => {
      const day = {
        evaluation: 'Los lactantes exploraron los aros de plástico con curiosidad.',
        evaluationStatus: 'APPROVED',
      };
      expect(getApprovedEvaluationForPrint(day)).toBe(
        'Los lactantes exploraron los aros de plástico con curiosidad.'
      );
    });

    it('1.2. Retorna null cuando evaluationStatus no es APPROVED (DRAFT, IN_REVIEW, CHANGES_REQUESTED o undefined)', () => {
      expect(
        getApprovedEvaluationForPrint({
          evaluation: 'Texto borrador',
          evaluationStatus: 'DRAFT',
        })
      ).toBeNull();

      expect(
        getApprovedEvaluationForPrint({
          evaluation: 'Texto en revisión',
          evaluationStatus: 'IN_REVIEW',
        })
      ).toBeNull();

      expect(
        getApprovedEvaluationForPrint({
          evaluation: 'Texto con cambio solicitado',
          evaluationStatus: 'CHANGES_REQUESTED',
        })
      ).toBeNull();

      expect(
        getApprovedEvaluationForPrint({
          evaluation: 'Texto sin status',
          evaluationStatus: undefined,
        })
      ).toBeNull();

      expect(getApprovedEvaluationForPrint(null)).toBeNull();
      expect(getApprovedEvaluationForPrint({})).toBeNull();
    });

    it('1.3. Retorna null si la evaluación es vacía o solo espacios en blanco', () => {
      expect(
        getApprovedEvaluationForPrint({
          evaluation: '   ',
          evaluationStatus: 'APPROVED',
        })
      ).toBeNull();
      expect(
        getApprovedEvaluationForPrint({
          evaluation: '',
          evaluationStatus: 'APPROVED',
        })
      ).toBeNull();
    });

    it('1.4. Defensa estructural: Retorna null si la evaluación coincide con el comentario de la Educadora (sustitución anómala)', () => {
      const directorInstruction =
        'Se solicita precisar qué indicadores observables permitieron identificar avances en la búsqueda de objetos parcialmente ocultos.';
      const day = {
        evaluation: directorInstruction,
        evaluationDirectorComment: directorInstruction,
        evaluationStatus: 'APPROVED',
      };
      expect(getApprovedEvaluationForPrint(day)).toBeNull();
    });

    it('1.5. Defensa estructural: Retorna null si la evaluación coincide con un comentario histórico de la Educadora', () => {
      const historicalComment =
        'Distingue las respuestas de los bebés que participaron de manera autónoma de aquellos que necesitaron acompañamiento.';
      const day = {
        evaluation: historicalComment,
        evaluationStatus: 'APPROVED',
        evaluationHistory: [
          {
            evaluation: 'Evaluación V1',
            directorComment: historicalComment,
            status: 'CHANGES_REQUESTED',
          },
        ],
      };
      expect(getApprovedEvaluationForPrint(day)).toBeNull();
    });

    it('1.6. Defensa estructural inter-día: Retorna null si la evaluación coincide con un comentario de la Educadora de otro día del mismo plan semanal', () => {
      const crossDayComment =
        'La evaluación describe adecuadamente las experiencias realizadas... Se solicita precisar qué indicadores observables...';
      const monday = {
        dayOfWeek: 'MONDAY',
        evaluation: 'Evaluación pedagógica corregida y aprobada del lunes',
        evaluationStatus: 'APPROVED',
        evaluationHistory: [
          {
            evaluation: 'Evaluación original V1',
            directorComment: crossDayComment,
            status: 'CHANGES_REQUESTED',
          },
        ],
      };
      const tuesdayWithPastedInstruction = {
        dayOfWeek: 'TUESDAY',
        evaluation: crossDayComment,
        evaluationStatus: 'APPROVED',
      };
      const plan = {
        days: [monday, tuesdayWithPastedInstruction],
      };

      // Monday has real text -> returns text
      expect(getApprovedEvaluationForPrint(monday, plan)).toBe(
        'Evaluación pedagógica corregida y aprobada del lunes'
      );
      // Tuesday has the pasted instruction -> cross-day defense returns null
      expect(getApprovedEvaluationForPrint(tuesdayWithPastedInstruction, plan)).toBeNull();
    });

    it('1.7. Detección explícita de anomalía histórica verificable: Retorna null para la instrucción institucional conocida aun sin comentarios ni historial', () => {
      // Simula exactamente los registros de Martes a Viernes de los documentos reales de LAB
      const historicalAnomalousDay = {
        dayOfWeek: 'TUESDAY',
        evaluation: KNOWN_HISTORICAL_SUPERVISORY_INSTRUCTION,
        evaluationStatus: 'APPROVED',
        evaluationDirectorComment: undefined,
        evaluationHistory: undefined,
      };

      expect(getApprovedEvaluationForPrint(historicalAnomalousDay)).toBeNull();
    });

    it('1.8. Evaluaciones legítimas no se ocultan aunque su texto coincida entre días (eliminación de identicalCount >= 3)', () => {
      const legitText = 'Lactantes participaron en la experiencia con atención sostenida.';
      const day1 = { dayOfWeek: 'TUESDAY', evaluation: legitText, evaluationStatus: 'APPROVED' };
      const day2 = { dayOfWeek: 'WEDNESDAY', evaluation: legitText, evaluationStatus: 'APPROVED' };
      const day3 = { dayOfWeek: 'THURSDAY', evaluation: legitText, evaluationStatus: 'APPROVED' };
      const plan = { days: [day1, day2, day3] };

      // Las evaluaciones legítimas se imprimen íntegramente
      expect(getApprovedEvaluationForPrint(day1, plan)).toBe(legitText);
      expect(getApprovedEvaluationForPrint(day2, plan)).toBe(legitText);
      expect(getApprovedEvaluationForPrint(day3, plan)).toBe(legitText);
    });
  });

  describe('2. Pruebas de Regresión Obligatorias A–D en PrintableView', () => {
    it('Caso A: Evaluación aprobada directamente se imprime en el PDF sin placeholder', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      const approvedPedagogicalText =
        'Lactantes B: Los bebés mantuvieron la atención visual hacia los títeres de tela y vocalizaron activamente.';

      await buildClosedPlan(repo, source, {
        planningId: FIRST_LIGHT_PLANNING_ID,
        daysConfig: [
          {
            dayOfWeek: 'MONDAY',
            evaluation: approvedPedagogicalText,
            evaluationStatus: 'APPROVED',
          },
        ],
      });

      const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

      await act(async () => {
        render(
          <PlanningDemoApp
            service={service}
            source={source}
            firstLightEnv={{
              [FIRST_LIGHT_LAB_FLAG]: 'true',
              VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
            }}
            firstLightAuth={mockAuth}
          />
        );
      });

      // Navigate to PrintableView
      const planBtn = screen.getByText(/Semana del 24 al 28 de agosto/i).closest('button')!;
      await act(async () => {
        fireEvent.click(planBtn);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      // Verify the PDF displays the approved text
      const evalSection = screen.getAllByTestId('section-evaluacion')[0]!;
      expect(within(evalSection).getByText(approvedPedagogicalText)).toBeTruthy();
      expect(
        within(evalSection).queryByText(/Espacio para la evaluación posterior a la implementación/i)
      ).toBeNull();
    });

    it('Caso B: Evaluación devuelta y posteriormente corregida imprime ÚNICAMENTE la versión corregida y aprobada', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      const v1Devuelta = 'Evaluación original V1: Los niños jugaron en el piso.';
      const obsEducadora =
        'Se solicita precisar qué indicadores observables permitieron identificar avances.';
      const v2Aprobada =
        'Evaluación corregida V2: Dos lactantes se desplazaron en cuatro puntos hacia los aros.';

      await buildClosedPlan(repo, source, {
        planningId: FIRST_LIGHT_PLANNING_ID,
        daysConfig: [
          {
            dayOfWeek: 'MONDAY',
            evaluation: v2Aprobada,
            evaluationStatus: 'APPROVED',
            evaluationDirectorComment: obsEducadora,
            evaluationHistory: [
              {
                evaluation: v1Devuelta,
                directorComment: obsEducadora,
                status: 'CHANGES_REQUESTED',
                submittedAt: new Date('2026-08-24T10:00:00Z'),
                submittedBy: 'lab-teacher-anita',
                reviewedAt: new Date('2026-08-24T12:00:00Z'),
                reviewedBy: 'lab-director-ceci',
              },
            ],
          },
        ],
      });

      const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

      await act(async () => {
        render(
          <PlanningDemoApp
            service={service}
            source={source}
            firstLightEnv={{
              [FIRST_LIGHT_LAB_FLAG]: 'true',
              VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
            }}
            firstLightAuth={mockAuth}
          />
        );
      });

      // Navigate to PrintableView
      const planBtn = screen.getByText(/Semana del 24 al 28 de agosto/i).closest('button')!;
      await act(async () => {
        fireEvent.click(planBtn);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      // Verify Monday's evaluation section prints ONLY V2
      const evalSection = screen.getAllByTestId('section-evaluacion')[0]!;
      expect(within(evalSection).getByText(v2Aprobada)).toBeTruthy();
      expect(within(evalSection).queryByText(v1Devuelta)).toBeNull();
      expect(within(evalSection).queryByText(obsEducadora)).toBeNull();

      // Go back and verify History tab preserves V1, observation, and V2
      await act(async () => {
        fireEvent.click(screen.getByText('← Volver'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /HISTORIAL/i }));
      });

      // Verify the history tab contains the audit trail
      expect(screen.getByText(obsEducadora)).toBeTruthy();
      expect(screen.getByText(v1Devuelta)).toBeTruthy();
      expect(screen.getByText(v2Aprobada)).toBeTruthy();
    });

    it('Caso C: Evaluación con observaciones pendientes (CHANGES_REQUESTED) NO imprime la observación como evaluación', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      const obsEducadora =
        'Instrucción de ajuste: Detallar la respuesta de los lactantes durante la exploración táctil.';

      await buildClosedPlan(repo, source, {
        planningId: FIRST_LIGHT_PLANNING_ID,
        daysConfig: [
          {
            dayOfWeek: 'TUESDAY',
            evaluation: 'Evaluación pendiente de corrección',
            evaluationStatus: 'CHANGES_REQUESTED',
            evaluationDirectorComment: obsEducadora,
          },
        ],
      });

      const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

      await act(async () => {
        render(
          <PlanningDemoApp
            service={service}
            source={source}
            firstLightEnv={{
              [FIRST_LIGHT_LAB_FLAG]: 'true',
              VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
            }}
            firstLightAuth={mockAuth}
          />
        );
      });

      const planBtn = screen.getByText(/Semana del 24 al 28 de agosto/i).closest('button')!;
      await act(async () => {
        fireEvent.click(planBtn);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      // Tuesday is day index 1 (second daily page)
      const tuesdayEvalSection = screen.getAllByTestId('section-evaluacion')[1]!;
      expect(within(tuesdayEvalSection).queryByText(obsEducadora)).toBeNull();
      expect(within(tuesdayEvalSection).queryByText('Evaluación pendiente de corrección')).toBeNull();
      expect(
        within(tuesdayEvalSection).getByText(
          'Espacio para la evaluación posterior a la implementación.'
        )
      ).toBeTruthy();
    });

    it('Caso D: Evaluación sin versión aprobada (IN_REVIEW o DRAFT) muestra el placeholder oficial', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      await buildClosedPlan(repo, source, {
        planningId: FIRST_LIGHT_PLANNING_ID,
        daysConfig: [
          {
            dayOfWeek: 'WEDNESDAY',
            evaluation: 'Borrador sin aprobar por la Educadora',
            evaluationStatus: 'IN_REVIEW',
          },
        ],
      });

      const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

      await act(async () => {
        render(
          <PlanningDemoApp
            service={service}
            source={source}
            firstLightEnv={{
              [FIRST_LIGHT_LAB_FLAG]: 'true',
              VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
            }}
            firstLightAuth={mockAuth}
          />
        );
      });

      const planBtn = screen.getByText(/Semana del 24 al 28 de agosto/i).closest('button')!;
      await act(async () => {
        fireEvent.click(planBtn);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      // Wednesday is day index 2
      const wednesdayEvalSection = screen.getAllByTestId('section-evaluacion')[2]!;
      expect(
        within(wednesdayEvalSection).queryByText('Borrador sin aprobar por la Educadora')
      ).toBeNull();
      expect(
        within(wednesdayEvalSection).getByText(
          'Espacio para la evaluación posterior a la implementación.'
        )
      ).toBeTruthy();
    });
  });

  describe('3. Pruebas de Regresión Obligatorias E–G: Cinco Días, Tres Salas y Dos Guarderías', () => {
    it('Caso E: Cinco días de la semana imprimen cada uno su evaluación pedagógica correcta sin fugas cruzadas', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      const evalTexts = {
        MONDAY: 'Evaluación pedagógica institucional de Lunes 24.',
        TUESDAY: 'Evaluación pedagógica institucional de Martes 25.',
        WEDNESDAY: 'Evaluación pedagógica institucional de Miércoles 26.',
        THURSDAY: 'Evaluación pedagógica institucional de Jueves 27.',
        FRIDAY: 'Evaluación pedagógica institucional de Viernes 28.',
      };

      await buildClosedPlan(repo, source, {
        planningId: FIRST_LIGHT_PLANNING_ID,
        daysConfig: [
          { dayOfWeek: 'MONDAY', evaluation: evalTexts.MONDAY, evaluationStatus: 'APPROVED' },
          { dayOfWeek: 'TUESDAY', evaluation: evalTexts.TUESDAY, evaluationStatus: 'APPROVED' },
          { dayOfWeek: 'WEDNESDAY', evaluation: evalTexts.WEDNESDAY, evaluationStatus: 'APPROVED' },
          { dayOfWeek: 'THURSDAY', evaluation: evalTexts.THURSDAY, evaluationStatus: 'APPROVED' },
          { dayOfWeek: 'FRIDAY', evaluation: evalTexts.FRIDAY, evaluationStatus: 'APPROVED' },
        ],
      });

      const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

      await act(async () => {
        render(
          <PlanningDemoApp
            service={service}
            source={source}
            firstLightEnv={{
              [FIRST_LIGHT_LAB_FLAG]: 'true',
              VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
            }}
            firstLightAuth={mockAuth}
          />
        );
      });

      const planBtn = screen.getByText(/Semana del 24 al 28 de agosto/i).closest('button')!;
      await act(async () => {
        fireEvent.click(planBtn);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      const evalSections = screen.getAllByTestId('section-evaluacion');
      expect(evalSections).toHaveLength(5);

      expect(within(evalSections[0]!).getByText(evalTexts.MONDAY)).toBeTruthy();
      expect(within(evalSections[1]!).getByText(evalTexts.TUESDAY)).toBeTruthy();
      expect(within(evalSections[2]!).getByText(evalTexts.WEDNESDAY)).toBeTruthy();
      expect(within(evalSections[3]!).getByText(evalTexts.THURSDAY)).toBeTruthy();
      expect(within(evalSections[4]!).getByText(evalTexts.FRIDAY)).toBeTruthy();
    });

    it('Caso F: Cobertura transversal compartida en las Tres Salas (Lactantes A, B y C)', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      const rooms = [
        { id: 'room-lactantes-a', name: 'Lactantes A', eval: 'Pedagogía sensorial Lactantes A' },
        { id: 'room-lactantes-b', name: 'Lactantes B', eval: 'Pedagogía exploratoria Lactantes B' },
        { id: 'room-lactantes-c', name: 'Lactantes C', eval: 'Pedagogía motriz Lactantes C' },
      ];

      for (const r of rooms) {
        await buildClosedPlan(repo, source, {
          planningId: `plan-${r.id}`,
          roomId: r.id,
          daysConfig: [
            { dayOfWeek: 'MONDAY', evaluation: r.eval, evaluationStatus: 'APPROVED' },
          ],
        });

        const planObj = await service.getPlanning(`plan-${r.id}`);
        expect(planObj).toBeTruthy();
        expect(planObj!.roomId).toBe(r.id);
        const approvedText = getApprovedEvaluationForPrint(planObj!.days[0]);
        expect(approvedText).toBe(r.eval);
      }
    });

    it('Caso G: Compatibilidad y Aislamiento estricto entre Guardería 001 y Guardería 002', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      const evalG001 = 'Evaluación propia y soberana de Guardería 001.';
      const evalG002 = 'Evaluación propia y soberana de Guardería 002 (Piloto Andrea).';

      await buildClosedPlan(repo, source, {
        planningId: FIRST_LIGHT_PLANNING_ID,
        daycareId: FIRST_LIGHT_DAYCARE_ID,
        daysConfig: [
          { dayOfWeek: 'MONDAY', evaluation: evalG001, evaluationStatus: 'APPROVED' },
        ],
      });

      await buildClosedPlan(repo, source, {
        planningId: 'plan-g002',
        daycareId: FIRST_LIGHT_G002_DAYCARE_ID,
        daysConfig: [
          { dayOfWeek: 'MONDAY', evaluation: evalG002, evaluationStatus: 'APPROVED' },
        ],
      });

      // Render G001
      const mockAuthG001 = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);
      const { unmount: unmountG001 } = render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuthG001}
        />
      );

      const planTextG001 = await screen.findByText(/Semana del 24 al 28 de agosto/i);
      const planBtnG001 = planTextG001.closest('button')!;
      await act(async () => {
        fireEvent.click(planBtnG001);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      const headerG001 = screen.getAllByTestId('direct-ident-field-guarderia')[0]!;
      expect(within(headerG001).getByText(/Guardería IMSS Demo \(001\)/i)).toBeTruthy();
      expect(screen.getAllByText(evalG001).length).toBeGreaterThan(0);
      expect(screen.queryByText(evalG002)).toBeNull();

      unmountG001();
      window.history.replaceState({}, '', '/');

      // Render G002
      const mockAuthG002 = createMockAuth(FIRST_LIGHT_G002_SUPERVISOR_ID);
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuthG002}
        />
      );

      const planTextG002 = await screen.findByText(/Semana del 24 al 28 de agosto/i);
      const planBtnG002 = planTextG002.closest('button')!;
      await act(async () => {
        fireEvent.click(planBtnG002);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      const headerG002 = screen.getAllByTestId('direct-ident-field-guarderia')[0]!;
      expect(within(headerG002).getByText(/Guardería 002/i)).toBeTruthy();
      expect(screen.getAllByText(evalG002).length).toBeGreaterThan(0);
      expect(screen.queryByText(evalG001)).toBeNull();
    });

    it('Caso H: Modalidad Indirecta renderiza con la misma fidelidad en la sección de evaluación del Reverso', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      const approvedEval = 'Evaluación aprobada en modalidad indirecta.';
      await buildClosedPlan(repo, source, {
        planningId: FIRST_LIGHT_PLANNING_ID,
        daysConfig: [
          { dayOfWeek: 'MONDAY', evaluation: approvedEval, evaluationStatus: 'APPROVED' },
          { dayOfWeek: 'TUESDAY', evaluation: 'Pendiente', evaluationStatus: 'CHANGES_REQUESTED' },
        ],
      });

      const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

      await act(async () => {
        render(
          <PlanningDemoApp
            service={service}
            source={source}
            firstLightEnv={{
              [FIRST_LIGHT_LAB_FLAG]: 'true',
              VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
            }}
            firstLightAuth={mockAuth}
          />
        );
      });

      // Switch to indirect modality via modality-select
      const modalitySelect = screen.getByTestId('modality-select');
      await act(async () => {
        fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });
      });

      const planBtn = screen.getByText(/Semana del 24 al 28 de agosto/i).closest('button')!;
      await act(async () => {
        fireEvent.click(planBtn);
      });
      await act(async () => {
        fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));
      });

      const indirectEvalSections = screen.getAllByTestId('indirect-section-evaluacion');
      expect(indirectEvalSections).toHaveLength(5);

      // Monday (Approved): displays evaluation
      expect(within(indirectEvalSections[0]!).getByText(approvedEval)).toBeTruthy();

      // Tuesday (Changes Requested): displays placeholder
      expect(
        within(indirectEvalSections[1]!).getByText(
          'Espacio para la evaluación posterior a la implementación.'
        )
      ).toBeTruthy();
      expect(within(indirectEvalSections[1]!).queryByText('Pendiente')).toBeNull();
    });
  });
});
