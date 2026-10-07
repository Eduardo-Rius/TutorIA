import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanningDashboard } from '../../../pages/planning/PlanningDashboard';
import { PlanningDemoApp } from '../PlanningDemoApp';
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

function createCanonicalClosedPlanning(): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    FIRST_LIGHT_PLANNING_ID,
    FIRST_LIGHT_DAYCARE_ID,
    FIRST_LIGHT_ROOM_ID,
    FIRST_LIGHT_TEACHER_ID,
    '2026-08-24',
    '2026-08-28'
  );
  plan.status = 'CLOSED';
  plan.observations = 'Observación pedagógica canónica de Anita';
  plan.identifiedNeeds = 'Desarrollo motriz';
  plan.specialSituations = 'Ninguna';
  plan.availableMaterials = 'Pelotas sensoriales';
  plan.version = 2;

  const days: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: [
      {
        activityId: `act-${d.toLowerCase()}-1`,
        category: 'Exploración sensorial',
        objective: `Objetivo para ${d}`,
        description: `Descripción de actividades para el día ${d}`,
        materials: ['Pelotas suaves'],
        durationMinutes: 20,
        curricularTraceability: [],
      },
    ],
    complementaryActivities: [],
    prioritizedPractices: [],
    materials: ['Pelotas suaves'],
    evaluation: `Evaluación aprobada de ${d}`,
    evaluationStatus: 'APPROVED' as const,
    evaluationReviewedBy: 'lab-director-ceci',
  }));

  plan.days = days;
  return plan;
}

function createMockAuth(uid: string = FIRST_LIGHT_TEACHER_ID): AuthenticationProvider {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid),
  };
}

describe('H1R13 — Second Lab Planning: Connect “+ Nueva planeación” End-to-End', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }
  });

  // =========================================================================
  // TEST A — ANITA CAN VISIBLY FIND THE “NUEVA PLANEACIÓN” ACTION
  // =========================================================================
  it('TEST A — From historical CLOSED planning, “+ Nueva planeación” is visible', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // 1. When hydrated into the canonical closed planning, Anita visibly sees "+ Nueva planeación" in the header
    await waitFor(() => {
      expect(screen.getByText(/Semana cerrada/i)).toBeTruthy();
    });

    const wizardNewBtn = screen.getByTestId('wizard-new-planning-btn');
    expect(wizardNewBtn).toBeTruthy();
    expect(wizardNewBtn.textContent).toContain('Nueva planeación');

    // 2. When navigating to the planning list via "← Volver al listado", Anita visibly sees "+ Nueva planeación"
    const backBtn = screen.getByText(/Volver al listado/i);
    await act(async () => {
      fireEvent.click(backBtn);
    });

    const listNewBtn = await screen.findByTestId('list-new-planning-btn');
    expect(listNewBtn).toBeTruthy();
    expect(listNewBtn.textContent).toContain('Nueva planeación');
  });

  // =========================================================================
  // TEST B — CLICKING IT ENTERS EXPLICIT NEW/CREATE INTENT
  // =========================================================================
  it('TEST B — Clicking “+ Nueva planeación” produces explicit NEW/CREATE intent and updates URL', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Semana cerrada/i)).toBeTruthy();
    });

    // Click "+ Nueva planeación" from wizard header
    const wizardNewBtn = screen.getByTestId('wizard-new-planning-btn');
    await act(async () => {
      fireEvent.click(wizardNewBtn);
    });

    // URL now contains action=new
    expect(window.location.search).toContain('action=new');

    // Closed badges/buttons disappear
    await waitFor(() => {
      expect(screen.queryByText(/Semana cerrada/i)).toBeNull();
      expect(screen.queryByText(/Versión Oficial IMSS/i)).toBeNull();
    });
  });

  // =========================================================================
  // TEST C — ACTUAL PlanningDemoApp RUNTIME PATH RENDERS FRESH PLANNING UI
  // =========================================================================
  it('TEST C — Actual PlanningDemoApp runtime path renders the fresh planning initialization UI (not blank below title)', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="new"
        />
      );
    });

    // Proves header renders
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Planeación Semanal/i })).toBeTruthy();
    });

    // CRITICAL: Proves the page is NOT blank below the title!
    expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeTruthy();
    expect(screen.getByText(/2\. ¿Qué necesitan fortalecer\?/i)).toBeTruthy();
    expect(screen.getByText(/3\. ¿Hay situaciones a considerar\?/i)).toBeTruthy();
    expect(screen.getByText(/4\. ¿Qué materiales tienes disponibles\?/i)).toBeTruthy();
  });

  // =========================================================================
  // TEST D — THE FRESH PLANNING HAS A UNIQUE PLANNING ID
  // =========================================================================
  it('TEST D — The fresh planning has a planningId different from f1000000-0000-4000-8000-000000000001', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="new"
        />
      );
    });

    await waitFor(async () => {
      const allPlans = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
      expect(allPlans.length).toBe(2);
    });

    const allPlans = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    const newPlan = allPlans.find(p => p.planningId !== FIRST_LIGHT_PLANNING_ID);

    expect(newPlan).toBeDefined();
    expect(newPlan!.planningId).not.toBe(FIRST_LIGHT_PLANNING_ID);
    expect(newPlan!.planningId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^p-/i);
    expect(newPlan!.daycareId).toBe(FIRST_LIGHT_DAYCARE_ID);
    expect(newPlan!.roomId).toBe(FIRST_LIGHT_ROOM_ID);
  });

  // =========================================================================
  // TEST E — FRESH PLANNING BEGINS DRAFT AND DOES NOT INHERIT CLOSED STATE
  // =========================================================================
  it('TEST E — The fresh planning begins DRAFT and does not inherit CLOSED state', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="new"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // Verification of DRAFT state in UI:
    expect(screen.queryByText(/Semana cerrada/i)).toBeNull();
    expect(screen.queryByText(/Versión Oficial IMSS/i)).toBeNull();

    // In repo:
    const allPlans = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    const newPlan = allPlans.find(p => p.planningId !== FIRST_LIGHT_PLANNING_ID);
    expect(newPlan).toBeDefined();
    expect(newPlan!.status).toBe('DRAFT');
  });

  // =========================================================================
  // TEST F — WEEKLY PEDAGOGICAL CONTEXT FIELDS ARE VISIBLE AND USABLE
  // =========================================================================
  it('TEST F — The weekly pedagogical context fields are visible and usable', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="new"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    const obsTextarea = screen.getByPlaceholderText(/Los niños muestran interés en los sonidos/i) as HTMLTextAreaElement;
    expect(obsTextarea).toBeTruthy();
    expect(obsTextarea.disabled).toBe(false);

    // Anita types new observations
    await act(async () => {
      fireEvent.change(obsTextarea, { target: { value: 'Nueva observación sensorial para semana 2' } });
    });
    expect(obsTextarea.value).toBe('Nueva observación sensorial para semana 2');

    // Generate week button is rendered and becomes active
    const generateBtn = screen.getByRole('button', { name: /Ayúdame con TutorIA \(Generar Semana\)/i });
    expect(generateBtn).toBeTruthy();
    expect(generateBtn.hasAttribute('disabled')).toBe(false);
  });

  // =========================================================================
  // TEST G — HISTORICAL CLOSED PLANNING REMAINS IMMUTABLE AND AVAILABLE
  // =========================================================================
  it('TEST G — Historical CLOSED planning remains immutable and available', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="continue"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Semana cerrada/i)).toBeTruthy();
    });

    // Immutability verified
    expect(() => {
      closedPlan.editPedagogicalContent(
        'Intento de modificar cerrado',
        'Mutación ilegal',
        '',
        '',
        [],
        closedPlan.days
      );
    }).toThrow(/Cannot edit planning in status: CLOSED/);

    const storedCanonical = await repo.findById(FIRST_LIGHT_PLANNING_ID);
    expect(storedCanonical!.status).toBe('CLOSED');
    expect(storedCanonical!.version).toBe(2);
  });

  // =========================================================================
  // TEST H — REFRESH/LIST BEHAVIOR FOR HISTORICAL PLANNING IS NOT REGRESSED
  // =========================================================================
  it('TEST H — Refresh/list behavior for the historical planning is not regressed', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repo.save(closedPlan);

    const secondPlan = WeeklyPlanning.create(
      'plan-second-week-test',
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_ROOM_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-31',
      '2026-09-04'
    );
    secondPlan.status = 'DRAFT';
    await repo.save(secondPlan);

    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="continue"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Semana cerrada/i)).toBeTruthy();
    });

    // Navigate back to list
    const backBtn = screen.getByText(/Volver al listado/i);
    await act(async () => {
      fireEvent.click(backBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Semana cerrada ✓ \(Registro completado\)/i)).toBeTruthy();
      expect(screen.getByText(/Trabajando en la propuesta/i)).toBeTruthy();
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
    });
  });
});
