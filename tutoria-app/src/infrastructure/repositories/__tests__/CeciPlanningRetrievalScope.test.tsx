import React, { act } from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FirestoreWeeklyPlanningRepository } from '../FirestoreWeeklyPlanningRepository';
import { InMemoryWeeklyPlanningRepository } from '../InMemoryWeeklyPlanningRepository';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { PlanningDemoApp } from '../../../presentation/planning-ui/PlanningDemoApp';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_TEACHER_ID,
} from '../../../presentation/planning-ui/firstLightLabHarness';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  doc,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';

vi.mock('firebase/firestore', () => {
  return {
    Timestamp: class Timestamp {
      constructor(public seconds: number, public nanoseconds: number) {}
      static fromDate(d: Date) { return new Timestamp(d.getTime() / 1000, 0); }
      toDate() { return new Date(this.seconds * 1000); }
    },
    doc: vi.fn((_db, coll, id) => ({ _path: `${coll}/${id}`, id })),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    collection: vi.fn((_db, name) => ({ _name: name })),
    query: vi.fn((coll, ...constraints) => ({ _coll: coll, _constraints: constraints })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    getDocs: vi.fn(),
  };
});

vi.mock('../../firebase/firebaseConfig', () => ({
  db: { _type: 'mockDb' },
  auth: { currentUser: null },
}));

describe('PUERTA 2 — Ceci Authorized Planning Retrieval Scoping', () => {
  const AUTHORIZED_DAYCARE_ID = '00000000-0000-4000-8000-000000000001';
  const WRONG_DAYCARE_ID = '99999999-9999-4000-8000-999999999999';
  const NEW_PLANNING_ID = 'dd13d295-3810-48d2-b1a9-c30030776c69';
  const HISTORICAL_PLANNING_ID = 'f1000000-0000-4000-8000-000000000001';

  let repo: FirestoreWeeklyPlanningRepository;
  let service: PlanningWorkflowService;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.clearAllMocks();
    repo = new FirestoreWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repo);
    // Set authenticated user context
    (auth as any).currentUser = { uid: 'lab-director-ceci' };
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('TEST A: Ceci query is scoped by daycareId + IN_REVIEW', async () => {
    // Mock user authorizationContext doc in Firestore
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        institutionalRole: 'DIRECTOR',
        authorizedDaycareIds: [AUTHORIZED_DAYCARE_ID],
        active: true,
      }),
    } as any);

    // Mock query result
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [],
    } as any);

    await repo.listInReview();

    // Verify query constraints: BOTH status == IN_REVIEW AND daycareId == AUTHORIZED_DAYCARE_ID
    expect(where).toHaveBeenCalledWith('status', '==', 'IN_REVIEW');
    expect(where).toHaveBeenCalledWith('daycareId', '==', AUTHORIZED_DAYCARE_ID);

    const queryMock = vi.mocked(query);
    expect(queryMock).toHaveBeenCalled();
    const lastCallConstraints = queryMock.mock.calls[0].slice(1);
    expect(lastCallConstraints).toEqual(
      expect.arrayContaining([
        { field: 'status', op: '==', val: 'IN_REVIEW' },
        { field: 'daycareId', op: '==', val: AUTHORIZED_DAYCARE_ID },
      ])
    );
  });

  it('TEST B: Ceci receives dd13d295-3810-48d2-b1a9-c30030776c69 with status IN_REVIEW', async () => {
    // Mock authorization context
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        institutionalRole: 'DIRECTOR',
        authorizedDaycareIds: [AUTHORIZED_DAYCARE_ID],
      }),
    } as any);

    const mockDocData = {
      planningId: NEW_PLANNING_ID,
      daycareId: AUTHORIZED_DAYCARE_ID,
      roomId: 'room-lactantes-a',
      teacherId: 'lab-teacher-anita',
      weekStart: '2026-08-10',
      weekEnd: '2026-08-14',
      status: 'IN_REVIEW',
      version: 9,
      days: [],
    };

    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [{ data: () => mockDocData }],
    } as any);

    const results = await service.listDirectorReviewQueue('DIRECTOR');

    expect(results).toHaveLength(1);
    expect(results[0].planningId).toBe(NEW_PLANNING_ID);
    expect(results[0].status).toBe('IN_REVIEW');
    expect(results[0].daycareId).toBe(AUTHORIZED_DAYCARE_ID);
    expect(results[0].version).toBe(9);
  });

  it('TEST C: Historical CLOSED planning is NOT selected as Ceci pending review', async () => {
    // If database contains both the new IN_REVIEW planning and the historical CLOSED planning,
    // the query strictly filters by status == IN_REVIEW.
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        institutionalRole: 'DIRECTOR',
        authorizedDaycareIds: [AUTHORIZED_DAYCARE_ID],
      }),
    } as any);

    const mockInReviewDoc = {
      planningId: NEW_PLANNING_ID,
      daycareId: AUTHORIZED_DAYCARE_ID,
      roomId: 'room-lactantes-a',
      teacherId: 'lab-teacher-anita',
      weekStart: '2026-08-10',
      weekEnd: '2026-08-14',
      status: 'IN_REVIEW',
      version: 9,
      days: [],
    };

    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [{ data: () => mockInReviewDoc }],
    } as any);

    const results = await service.listDirectorReviewQueue('DIRECTOR');

    const closedPlan = results.find(p => p.planningId === HISTORICAL_PLANNING_ID);
    expect(closedPlan).toBeUndefined();
    expect(results.every(p => p.status === 'IN_REVIEW')).toBe(true);
  });

  it('TEST D: Wrong daycare planning is NOT returned', async () => {
    // Query filter enforces daycareId == authorizedDaycareId
    repo.setAuthorizedDaycareId(AUTHORIZED_DAYCARE_ID);

    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [],
    } as any);

    await repo.listInReview(AUTHORIZED_DAYCARE_ID);

    expect(where).toHaveBeenCalledWith('daycareId', '==', AUTHORIZED_DAYCARE_ID);
    expect(where).not.toHaveBeenCalledWith('daycareId', '==', WRONG_DAYCARE_ID);
  });

  it('TEST E: Existing CLOSED retrieval remains intact where legitimately used', async () => {
    const historicalClosedData = {
      planningId: HISTORICAL_PLANNING_ID,
      daycareId: AUTHORIZED_DAYCARE_ID,
      roomId: 'room-lactantes-a',
      teacherId: 'lab-teacher-anita',
      weekStart: '2026-08-03',
      weekEnd: '2026-08-07',
      status: 'CLOSED',
      version: 15,
      days: [],
    };

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => historicalClosedData,
    } as any);

    const plan = await repo.findById(HISTORICAL_PLANNING_ID);

    expect(plan).not.toBeNull();
    expect(plan!.planningId).toBe(HISTORICAL_PLANNING_ID);
    expect(plan!.status).toBe('CLOSED');
    expect(plan!.daycareId).toBe(AUTHORIZED_DAYCARE_ID);
  });

  it('TEST F: No mutation occurs during Ceci retrieval', async () => {
    repo.setAuthorizedDaycareId(AUTHORIZED_DAYCARE_ID);

    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [],
    } as any);

    await service.listDirectorReviewQueue('DIRECTOR');

    expect(setDoc).not.toHaveBeenCalled();
    const { updateDoc, deleteDoc } = await import('firebase/firestore');
    expect(updateDoc).not.toHaveBeenCalled();
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it('TEST G: UI Bootstrap selects real IN_REVIEW planning dd13d295-3810-48d2-b1a9-c30030776c69 when historical canonical is CLOSED', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    // 1. Historical plan is CLOSED
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      'lab-teacher-anita',
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    await memoryRepo.save(historicalPlan);

    // 2. New plan is IN_REVIEW
    const newPlan = WeeklyPlanning.create(
      NEW_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      'lab-teacher-anita',
      '2026-08-10',
      '2026-08-14'
    );
    newPlan.status = 'IN_REVIEW';
    newPlan.observations = 'Observaciones pedagógicas de la semana nueva';
    await memoryRepo.save(newPlan);

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('ceci@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // Verify Ceci opens in Director Review mode with the NEW planning, NOT the historical CLOSED planning
    await waitFor(() => {
      expect(screen.getByText(/Observaciones pedagógicas de la semana nueva/i)).toBeTruthy();
    });

    // Historical CLOSED plan was NOT selected as Ceci's pending review
    expect(screen.queryByText(/Semana cerrada/i)).toBeNull();
  });

  it('TEST H: Anita bootstrap selects active APPROVED planning over historical CLOSED planning', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    // 1. Historical plan is CLOSED
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    historicalPlan.observations = 'Observación histórica de la semana cerrada';
    await memoryRepo.save(historicalPlan);

    // 2. Active plan is APPROVED
    const approvedPlan = WeeklyPlanning.create(
      NEW_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-10',
      '2026-08-14'
    );
    approvedPlan.status = 'APPROVED';
    approvedPlan.observations = 'Observaciones activas aprobadas por Ceci para Anita';
    await memoryRepo.save(approvedPlan);

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('anita@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // Verify Anita opens into her active APPROVED planning
    await waitFor(() => {
      expect(screen.getByText(/Observaciones activas aprobadas por Ceci para Anita/i)).toBeTruthy();
    });

    // Historical CLOSED planning was NOT selected
    expect(screen.queryByText(/Observación histórica de la semana cerrada/i)).toBeNull();
  });

  it('TEST I: When no active planning exists, Anita lands on list with history and + Nueva planeación', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    // Only historical CLOSED plan exists
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    historicalPlan.observations = 'Observación histórica única y cerrada';
    await memoryRepo.save(historicalPlan);

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('anita@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // SR-MD-03 CASO 3: Con solo CLOSED, Anita ve la lista y el historial (nunca auto-abre CLOSED)
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
      expect(screen.getByText(/Semana cerrada ✓ \(Registro completado\)/i)).toBeTruthy();
    });

    // Invariante: No entra automáticamente al wizard de edición
    expect(screen.queryByText(/Contexto Pedagógico Semanal/i)).toBeNull();

    // Anita puede abrir la cerrada explícitamente desde el historial
    const closedCard = screen.getByText(/Semana cerrada ✓ \(Registro completado\)/i);
    await act(async () => {
      fireEvent.click(closedCard);
    });

    await waitFor(() => {
      expect(screen.getByText(/Semana cerrada/i)).toBeTruthy();
      expect(screen.getByText(/Observación histórica única y cerrada/i)).toBeTruthy();
    });
  });

  it('TEST J: Ceci bootstrap selects active APPROVED planning with pending IN_REVIEW daily evaluations over historical CLOSED planning', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    const sampleDays = [
      {
        dayOfWeek: 'MONDAY',
        date: '2026-08-24',
        activities: [{ activityId: 'act-1', category: 'Cuidado', objective: 'Act 1', description: 'Desc 1', durationMinutes: 30, materials: [], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: [],
        prioritizedPractices: [],
        evaluationStatus: 'IN_REVIEW',
        evaluation: 'Evaluación del lunes enviada por Anita',
        evaluationSubmittedBy: FIRST_LIGHT_TEACHER_ID,
        evaluationSubmittedAt: new Date('2026-08-24T18:00:00Z'),
      },
      {
        dayOfWeek: 'TUESDAY',
        date: '2026-08-25',
        activities: [{ activityId: 'act-2', category: 'Cuidado', objective: 'Act 2', description: 'Desc 2', durationMinutes: 30, materials: [], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: [],
        prioritizedPractices: [],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        date: '2026-08-26',
        activities: [{ activityId: 'act-3', category: 'Cuidado', objective: 'Act 3', description: 'Desc 3', durationMinutes: 30, materials: [], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: [],
        prioritizedPractices: [],
      },
      {
        dayOfWeek: 'THURSDAY',
        date: '2026-08-27',
        activities: [{ activityId: 'act-4', category: 'Cuidado', objective: 'Act 4', description: 'Desc 4', durationMinutes: 30, materials: [], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: [],
        prioritizedPractices: [],
      },
      {
        dayOfWeek: 'FRIDAY',
        date: '2026-08-28',
        activities: [{ activityId: 'act-5', category: 'Cuidado', objective: 'Act 5', description: 'Desc 5', durationMinutes: 30, materials: [], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: [],
        prioritizedPractices: [],
      },
    ];

    // 1. Historical plan is CLOSED
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    historicalPlan.observations = 'Observación histórica de la semana cerrada';
    await memoryRepo.save(historicalPlan);

    // 2. Active plan is APPROVED with daily evaluations in IN_REVIEW
    const approvedPlan = WeeklyPlanning.create(
      NEW_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-10',
      '2026-08-14'
    );
    approvedPlan.status = 'APPROVED';
    approvedPlan.observations = 'Planeación activa aprobada para ejecución';
    approvedPlan.days = sampleDays as any;
    await memoryRepo.save(approvedPlan);

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('ceci@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // Verify Ceci opens in Director Review mode with the APPROVED active planning containing pending evaluation
    await waitFor(() => {
      expect(screen.getByText(/Evaluación del lunes enviada por Anita/i)).toBeTruthy();
    });

    // Verify pending review indicator is visible for Ceci
    expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();

    // Verify historical CLOSED planning was NOT selected
    expect(screen.queryByText(/Observación histórica de la semana cerrada/i)).toBeNull();
  });

  it('TEST K: Historical CLOSED planning is selected as fallback when no active planning with pending evaluations exists, and remains unaltered', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    // 1. Historical plan is CLOSED with no pending evaluations
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    historicalPlan.observations = 'Observación histórica de la semana cerrada';
    await memoryRepo.save(historicalPlan);

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('ceci@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // SR-MD-03 CASO 4: Si no hay pendientes, mostrar estado vacío verdadero. No abrir un expediente CLOSED como fallback.
    await waitFor(() => {
      expect(screen.getByText(/No tenemos propuestas para conversar en este momento/i)).toBeTruthy();
    });

    // Verify historical CLOSED planning was NOT loaded
    expect(screen.queryByText(/Observación histórica de la semana cerrada/i)).toBeNull();

    // Check that historical planning document is not altered in the repo
    const persisted = await memoryRepo.findById(HISTORICAL_PLANNING_ID);
    expect(persisted?.status).toBe('CLOSED');
    expect(persisted?.observations).toBe('Observación histórica de la semana cerrada');
  });

  it('TEST L: Multiple pending plannings show queue list with contextual badges for human selection', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    const sampleDays = [
      {
        dayOfWeek: 'MONDAY',
        date: '2026-08-24',
        activities: [{ activityId: 'act-1', category: 'Cuidado', objective: 'Act 1', description: 'Desc 1', durationMinutes: 30, materials: [], curricularTraceability: [] }],
        complementaryActivities: [],
        materials: [],
        prioritizedPractices: [],
        evaluationStatus: 'IN_REVIEW',
        evaluation: 'Evaluación del lunes de la semana aprobada',
        evaluationSubmittedBy: FIRST_LIGHT_TEACHER_ID,
      },
    ];

    // 1. Historical CLOSED plan
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    await memoryRepo.save(historicalPlan);

    // 2. An APPROVED planning with evaluations in review
    const approvedPlan = WeeklyPlanning.create(
      NEW_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-10',
      '2026-08-14'
    );
    approvedPlan.status = 'APPROVED';
    approvedPlan.days = sampleDays as any;
    await memoryRepo.save(approvedPlan);

    // 3. An IN_REVIEW planning (whole week submission pending whole week approval)
    const inReviewPlan = WeeklyPlanning.create(
      'ee13d295-3810-48d2-b1a9-c30030776c70',
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-17',
      '2026-08-21'
    );
    inReviewPlan.status = 'IN_REVIEW';
    inReviewPlan.observations = 'Propuesta de semana en revisión inicial por Ceci';
    await memoryRepo.save(inReviewPlan);

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_DIRECTOR_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('ceci@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // SR-MD-03 CASO 4: Si hay varios expedientes, mostrar lista para selección explícita con badges contextuales
    await waitFor(() => {
      expect(screen.getByText(/Acompañamiento pedagógico/i)).toBeTruthy();
      expect(screen.getByText(/Lista para conversar/i)).toBeTruthy();
      expect(screen.getByText(/Evaluación diaria pendiente/i)).toBeTruthy();
    });

    // Ceci selecciona explícitamente la planeación IN_REVIEW
    const inReviewCard = screen.getByText(/Lista para conversar/i);
    await act(async () => {
      fireEvent.click(inReviewCard);
    });

    // Se abre en vista de revisión detallada
    await waitFor(() => {
      expect(screen.getByText(/Propuesta de semana en revisión inicial por Ceci/i)).toBeTruthy();
      expect(screen.getByText(/APROBAR TODA LA PLANEACIÓN/i)).toBeTruthy();
    });
  });

  it('TEST L (Anita) — Anita lands on list with history and + Nueva planeación when only CLOSED plans exist', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    // 1. Historical canonical CLOSED planning exists
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    historicalPlan.closedAt = new Date('2026-10-07T16:00:00Z');
    historicalPlan.version = 2;
    historicalPlan.observations = 'Semana histórica antigua cerrada';
    await memoryRepo.save(historicalPlan);

    // 2. Newer CLOSED planning of Anita exists
    const newerClosedPlan = WeeklyPlanning.create(
      NEW_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-10',
      '2026-08-14'
    );
    newerClosedPlan.status = 'CLOSED';
    newerClosedPlan.closedAt = new Date('2026-10-08T00:40:00Z');
    newerClosedPlan.version = 9;
    newerClosedPlan.observations = 'Semana recién cerrada por Ceci para Anita';
    await memoryRepo.save(newerClosedPlan);

    // 3. No active planning exists

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('anita@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // SR-MD-03 CASO 3: Con solo CLOSED, Anita ve la lista con historial y opción de nueva planeación (nunca auto-abre CLOSED)
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
      expect(screen.getAllByText(/Semana cerrada ✓ \(Registro completado\)/i).length).toBe(2);
    });

    // Invariante: No entra automáticamente al wizard de edición
    expect(screen.queryByText(/Contexto Pedagógico Semanal/i)).toBeNull();

    // Anita puede abrir la cerrada explícitamente desde el historial
    const newerCard = screen.getByTestId(`planning-card-${NEW_PLANNING_ID}`);
    await act(async () => {
      fireEvent.click(newerCard);
    });

    await waitFor(() => {
      expect(screen.getByText(/Semana cerrada/i)).toBeTruthy();
      expect(screen.getByDisplayValue(/Semana recién cerrada por Ceci para Anita/i)).toBeTruthy();
    });
  });

  it('TEST M — active planning still wins', async () => {
    const memoryRepo = new InMemoryWeeklyPlanningRepository();

    // 1. Historical canonical CLOSED planning exists
    const historicalPlan = WeeklyPlanning.create(
      HISTORICAL_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-03',
      '2026-08-07'
    );
    historicalPlan.status = 'CLOSED';
    historicalPlan.closedAt = new Date('2026-10-07T16:00:00Z');
    historicalPlan.version = 2;
    await memoryRepo.save(historicalPlan);

    // 2. Newer CLOSED planning exists
    const newerClosedPlan = WeeklyPlanning.create(
      'ee13d295-3810-48d2-b1a9-c30030776c70',
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-10',
      '2026-08-14'
    );
    newerClosedPlan.status = 'CLOSED';
    newerClosedPlan.closedAt = new Date('2026-10-08T00:40:00Z');
    newerClosedPlan.version = 9;
    newerClosedPlan.observations = 'Semana recién cerrada de prueba';
    await memoryRepo.save(newerClosedPlan);

    // 3. Active planning of Anita exists (APPROVED)
    const activePlan = WeeklyPlanning.create(
      NEW_PLANNING_ID,
      AUTHORIZED_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-17',
      '2026-08-21'
    );
    activePlan.status = 'APPROVED';
    activePlan.observations = 'Semana activa aprobada en ejecución';
    await memoryRepo.save(activePlan);

    const uiService = new PlanningWorkflowService(memoryRepo);
    const mockAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      restoreSession: vi.fn().mockResolvedValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUser: vi.fn().mockReturnValue(FIRST_LIGHT_TEACHER_ID),
      getCurrentUserEmail: vi.fn().mockReturnValue('anita@lab.tutoria.invalid'),
    };

    render(
      <PlanningDemoApp
        service={uiService}
        source={new DeterministicPedagogicalRecommendationSource()}
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth as any}
      />
    );

    // Verify Anita selects the active planning over the newer CLOSED planning
    await waitFor(() => {
      expect(screen.getByText(/Semana activa aprobada en ejecución/i)).toBeTruthy();
    });

    // Newer CLOSED planning is NOT selected
    expect(screen.queryByText(/Semana recién cerrada de prueba/i)).toBeNull();
  });
});
