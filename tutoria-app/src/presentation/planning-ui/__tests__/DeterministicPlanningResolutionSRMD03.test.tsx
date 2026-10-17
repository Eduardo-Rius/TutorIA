import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanningDemoApp, resolveTeacherPlanningSession, resolveDirectorReviewSession } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { PlanningDay } from '../../../domain/planning/WeeklyPlanning';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_ROOM_ID,
  FIRST_LIGHT_PLANNING_ID,
} from '../firstLightLabHarness';

vi.mock('../../../infrastructure/firebase/firebaseConfig', () => ({
  app: {},
  auth: {},
  db: {},
}));

const eligibleLabEnv = {
  [FIRST_LIGHT_LAB_FLAG]: 'true',
  VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
};

function createMockAuth(uid: string = FIRST_LIGHT_TEACHER_ID): AuthenticationProvider {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid),
  };
}

function createTestPlanning(
  planningId: string,
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'APPROVED_FOR_EXECUTION' | 'CLOSED',
  observations = `Observaciones para ${planningId}`,
  teacherId = FIRST_LIGHT_TEACHER_ID,
  daycareId = FIRST_LIGHT_DAYCARE_ID
): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    planningId,
    daycareId,
    FIRST_LIGHT_ROOM_ID,
    teacherId,
    '2026-08-24',
    '2026-08-28'
  );
  plan.status = status;
  plan.observations = observations;
  plan.identifiedNeeds = 'Desarrollo integral';
  plan.specialSituations = 'Ninguna';
  plan.availableMaterials = 'Materiales sensoriales';
  plan.version = 1;

  const days: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: [
      {
        activityId: `act-${planningId}-${d.toLowerCase()}`,
        category: 'Exploración sensorial',
        objective: `Objetivo para ${d}`,
        description: `Descripción ${planningId} para ${d}`,
        materials: ['Material'],
        durationMinutes: 20,
        curricularTraceability: [],
      },
    ],
    complementaryActivities: [],
    prioritizedPractices: [],
    materials: ['Material'],
  }));

  plan.days = days;
  return plan;
}

describe('ORDEN SR-MD-03 — Deterministic Planning Resolution', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  // -------------------------------------------------------------------------
  // 1. URL con planId recupera ID exacto.
  // -------------------------------------------------------------------------
  it('1. URL con planId recupera ID exacto', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = createTestPlanning('plan-exact-01', 'DRAFT', 'Expediente Exacto 01');
    await repo.save(plan);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/?planId=plan-exact-01');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Expediente Exacto 01')).toBeTruthy();
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-exact-01');
  });

  // -------------------------------------------------------------------------
  // 2. URL con ID inexistente muestra error.
  // -------------------------------------------------------------------------
  it('2. URL con ID inexistente muestra error', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/?planId=plan-ghost-404');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/La planeación solicitada \(plan-ghost-404\) no fue encontrada/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 3. URL con ID no autorizado muestra error.
  // -------------------------------------------------------------------------
  it('3. URL con ID no autorizado muestra error', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const unauthorizedPlan = createTestPlanning('plan-unauth', 'DRAFT', 'Privado', 'other-teacher-99');
    await repo.save(unauthorizedPlan);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(); // Anita is authenticated

    window.history.pushState({}, '', '/?planId=plan-unauth');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/La planeación solicitada no pertenece a la docente autenticada/i)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 4. action=new inicia sesión limpia.
  // -------------------------------------------------------------------------
  it('4. action=new inicia sesión limpia sin heredar contexto ni planningId anterior', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/?action=new');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Planeación Semanal/i })).toBeTruthy();
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('action')).toBe('new');
    expect(params.get('planId')).toBeNull();

    // Zero writes on mount (SR-MD-01)
    const plansInRepo = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(plansInRepo.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 5. Una planeación DRAFT activa se recupera.
  // -------------------------------------------------------------------------
  it('5. Una planeación DRAFT activa se recupera directamente cuando la URL no tiene planId', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const singleDraft = createTestPlanning('plan-draft-solo', 'DRAFT', 'Borrador activo único');
    await repo.save(singleDraft);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Borrador activo único')).toBeTruthy();
    });

    // URL is synced to planId
    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-draft-solo');
  });

  // -------------------------------------------------------------------------
  // 6. Una IN_REVIEW permanece identificable.
  // -------------------------------------------------------------------------
  it('6. Una IN_REVIEW permanece identificable y se recupera directamente', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const inReview = createTestPlanning('plan-in-review-solo', 'IN_REVIEW', 'Propuesta en revisión única');
    await repo.save(inReview);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Propuesta en revisión única')).toBeTruthy();
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-in-review-solo');
  });

  // -------------------------------------------------------------------------
  // 7. Una APPROVED se recupera correctamente.
  // -------------------------------------------------------------------------
  it('7. Una APPROVED se recupera correctamente', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const approved = createTestPlanning('plan-approved-solo', 'APPROVED', 'Planeación Aprobada Única');
    await repo.save(approved);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Planeación Aprobada Única')).toBeTruthy();
      expect(screen.getByText(/Aprobada para ejecución/i)).toBeTruthy();
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-approved-solo');
  });

  // -------------------------------------------------------------------------
  // 8. Varias activas muestran lista.
  // -------------------------------------------------------------------------
  it('8. Varias activas muestran lista para selección humana', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const draft1 = createTestPlanning('plan-draft-1', 'DRAFT', 'Primer borrador activo');
    const draft2 = createTestPlanning('plan-draft-2', 'DRAFT', 'Segundo borrador activo');
    await repo.save(draft1);
    await repo.save(draft2);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Neither is auto-opened; user is presented the list
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
    });

    const buttons = screen.getAllByRole('button');
    const cards = buttons.filter(b => b.textContent?.includes('Trabajando en la propuesta'));
    expect(cards.length).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 9. Sólo CLOSED muestra historial y opción de nueva planeación.
  // -------------------------------------------------------------------------
  it('9. Sólo CLOSED muestra historial y opción de nueva planeación sin auto-abrir la cerrada', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closed = createTestPlanning('plan-closed-historical', 'CLOSED', 'Histórico cerrado');
    await repo.save(closed);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Stays on list view; does NOT auto-open into wizard
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
      expect(screen.getByText(/Semana cerrada ✓ \(Registro completado\)/i)).toBeTruthy();
    });

    // In list view, the closed plan's text area is NOT rendered
    expect(screen.queryByDisplayValue('Histórico cerrado')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 10. Ningún caso carga automáticamente FIRST_LIGHT_PLANNING_ID.
  // -------------------------------------------------------------------------
  it('10. Ningún caso carga automáticamente FIRST_LIGHT_PLANNING_ID como fallback', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const canonicalClosed = createTestPlanning(FIRST_LIGHT_PLANNING_ID, 'CLOSED', 'Histórico Seed First Light');
    await repo.save(canonicalClosed);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Must be in list view, never automatically in wizard displaying FIRST_LIGHT_PLANNING_ID
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
    });

    expect(screen.queryByDisplayValue('Histórico Seed First Light')).toBeNull();
    expect(window.location.search).not.toContain(FIRST_LIGHT_PLANNING_ID);
  });

  // -------------------------------------------------------------------------
  // 11. Dirección encuentra IN_REVIEW.
  // -------------------------------------------------------------------------
  it('11. Dirección encuentra y abre directamente una planeación IN_REVIEW', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const inReview = createTestPlanning('plan-ceci-review', 'IN_REVIEW', 'Para revisión de Ceci');
    await repo.save(inReview);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/días revisados/i)).toBeTruthy();
      expect(screen.getByRole('heading', { name: /Asistente Educativa/i })).toBeTruthy();
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-ceci-review');
  });

  // -------------------------------------------------------------------------
  // 12. Dirección encuentra APPROVED con evaluaciones pendientes.
  // -------------------------------------------------------------------------
  it('12. Dirección encuentra APPROVED con evaluaciones pendientes', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const approved = createTestPlanning('plan-approved-pending-eval', 'APPROVED', 'Semana en curso');
    approved.days[0].evaluation = 'Evaluación de lunes por Anita';
    approved.days[0].evaluationStatus = 'IN_REVIEW';
    approved.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
    await repo.save(approved);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Evaluaciones aprobadas:/i)).toBeTruthy();
      expect(screen.getByRole('heading', { name: /Asistente Educativa/i })).toBeTruthy();
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-approved-pending-eval');
  });

  // -------------------------------------------------------------------------
  // 13. Dirección encuentra APPROVED con cinco evaluaciones aprobadas y semana pendiente de cierre.
  // -------------------------------------------------------------------------
  it('13. Dirección encuentra APPROVED con 5 evaluaciones aprobadas y semana pendiente de cierre', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const approvedReady = createTestPlanning('plan-ready-closure', 'APPROVED', 'Semana completa');
    for (const d of approvedReady.days) {
      d.evaluation = 'Aprobada';
      d.evaluationStatus = 'APPROVED';
      d.evaluationReviewedBy = FIRST_LIGHT_DIRECTOR_ID;
    }
    await repo.save(approvedReady);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Semana lista para cierre/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Cerrar semana/i })).toBeTruthy();
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-ready-closure');
  });

  // -------------------------------------------------------------------------
  // 14. Dirección no confunde lista vacía con fallo Firestore.
  // -------------------------------------------------------------------------
  it('14. Dirección no confunde lista vacía con fallo Firestore', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

    // Fail closed: mock error from service
    vi.spyOn(service, 'listDirectorReviewQueue').mockRejectedValue(new Error('Firestore unavailable (simulated)'));

    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Error banner is shown, NOT empty list
    await waitFor(() => {
      expect(screen.getByText(/No pudimos recuperar las planeaciones/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeTruthy();
    });

    expect(screen.queryByText(/No tenemos propuestas para conversar en este momento/i)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 15. Cambio de rol preserva aislamiento.
  // -------------------------------------------------------------------------
  it('15. Cambio de rol preserva aislamiento', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const planAnita = createTestPlanning('plan-anita-auth', 'DRAFT', 'Plan Anita', 't1', 'daycare-demo');
    await repo.save(planAnita);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();

    // Start in non-FirstLight mode with plan-anita-auth in URL
    window.history.pushState({}, '', '/?planId=plan-anita-auth');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Plan Anita')).toBeTruthy();
    });

    // Switch role to Ceci (Directora) via role button
    const ceciBtn = screen.getByRole('button', { name: /Ceci \(Directora\)/i });
    await act(async () => {
      fireEvent.click(ceciBtn);
    });

    // In Director view for compatible daycare plan, it renders in REVIEW mode (DirectorReview)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Asistente Educativa/i })).toBeTruthy();
      expect(screen.getByText(/Observaciones del grupo/i)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 16. Recarga mantiene planningId.
  // -------------------------------------------------------------------------
  it('16. Recarga mantiene planningId exacto desde la URL', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = createTestPlanning('plan-persistent-reload', 'DRAFT', 'Contenido para recarga');
    await repo.save(plan);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/?planId=plan-persistent-reload');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Contenido para recarga')).toBeTruthy();
    });

    expect(window.location.search).toContain('planId=plan-persistent-reload');
  });

  // -------------------------------------------------------------------------
  // 17. Back/forward conserva identidad.
  // -------------------------------------------------------------------------
  it('17. Back/forward conserva identidad mediante popstate', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const planA = createTestPlanning('plan-pop-a', 'DRAFT', 'Plan Alpha Pop');
    const planB = createTestPlanning('plan-pop-b', 'DRAFT', 'Plan Beta Pop');
    await repo.save(planA);
    await repo.save(planB);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/?planId=plan-pop-a');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Plan Alpha Pop')).toBeTruthy();
    });

    // Simulate browser forward to plan-pop-b
    window.history.pushState({}, '', '/?planId=plan-pop-b');
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Plan Beta Pop')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 18. CLOSED continúa inmutable.
  // -------------------------------------------------------------------------
  it('18. CLOSED continúa inmutable y rechaza modificaciones pedagógicas', async () => {
    const closed = createTestPlanning('plan-closed-immut', 'CLOSED', 'Cerrado inmutable');

    expect(() => {
      closed.editPedagogicalContent(
        'Mutación no permitida',
        'Necesidad',
        '',
        '',
        [],
        closed.days
      );
    }).toThrow(/Cannot edit planning in status: CLOSED/);
  });

  // -------------------------------------------------------------------------
  // 19. Dos expedientes consecutivos no se mezclan.
  // -------------------------------------------------------------------------
  it('19. Dos expedientes consecutivos no se mezclan', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const planOne = createTestPlanning('plan-one', 'DRAFT', 'Texto exclusivo del Plan Uno');
    const planTwo = createTestPlanning('plan-two', 'DRAFT', 'Texto exclusivo del Plan Dos');
    await repo.save(planOne);
    await repo.save(planTwo);

    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/?planId=plan-one');

    const { unmount } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={mockAuth}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Texto exclusivo del Plan Uno')).toBeTruthy();
    });

    unmount();

    // Now render plan two
    window.history.pushState({}, '', '/?planId=plan-two');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Texto exclusivo del Plan Dos')).toBeTruthy();
    });

    expect(screen.queryByDisplayValue('Texto exclusivo del Plan Uno')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 20. No aparecen nuevos DRAFTs vacíos.
  // -------------------------------------------------------------------------
  it('20. No aparecen nuevos DRAFTs vacíos al navegar o montar la interfaz', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    window.history.pushState({}, '', '/?action=new');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Planeación Semanal/i })).toBeTruthy();
    });

    // Zero plannings created in repository
    const plannings = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(plannings.length).toBe(0);
  });
});
