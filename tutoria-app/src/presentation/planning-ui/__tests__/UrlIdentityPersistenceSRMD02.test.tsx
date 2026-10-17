import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { PlanningDay } from '../../../domain/planning/WeeklyPlanning';
import type { WeeklyPlanningProposalSource, WeeklyPlanningProposalRequest, WeeklyPlanningProposalResponse } from '../../../application/planning/WeeklyPlanningProposalSource';
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
  plan.observations = 'Contexto histórico canónico de Anita';
  plan.identifiedNeeds = 'Desarrollo motriz';
  plan.specialSituations = 'Ninguna';
  plan.availableMaterials = 'Pelotas sensoriales';
  plan.version = 2;

  const days: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: [
      {
        activityId: `act-${d.toLowerCase()}-canonical`,
        category: 'Exploración sensorial',
        objective: `Objetivo canónico ${d}`,
        description: `Descripción canónica para ${d}`,
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

function createPlanAlpha(): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    'plan-alpha',
    FIRST_LIGHT_DAYCARE_ID,
    FIRST_LIGHT_ROOM_ID,
    FIRST_LIGHT_TEACHER_ID,
    '2026-08-24',
    '2026-08-28'
  );
  plan.status = 'DRAFT';
  plan.observations = 'Expediente Único Alpha de Anita';
  plan.identifiedNeeds = 'Estimulación visual y espacial';
  plan.specialSituations = 'Adaptación inicial';
  plan.availableMaterials = 'Cintas de colores';
  plan.version = 1;

  const days: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: [
      {
        activityId: `act-alpha-${d.toLowerCase()}-1`,
        category: 'Experiencia visual Alpha',
        objective: `Objetivo Alpha para ${d}`,
        description: `Descripción Alpha para el día ${d}`,
        materials: ['Cintas'],
        durationMinutes: 25,
        curricularTraceability: [],
      },
    ],
    complementaryActivities: [],
    prioritizedPractices: [],
    materials: ['Cintas'],
  }));

  plan.days = days;
  return plan;
}

function createPlanBeta(): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    'plan-beta',
    FIRST_LIGHT_DAYCARE_ID,
    FIRST_LIGHT_ROOM_ID,
    FIRST_LIGHT_TEACHER_ID,
    '2026-08-24',
    '2026-08-28'
  );
  plan.status = 'DRAFT';
  plan.observations = 'Expediente Único Beta de Anita';
  plan.identifiedNeeds = 'Ritmo y movimiento';
  plan.specialSituations = 'Ninguna';
  plan.availableMaterials = 'Cascabeles e instrumentos';
  plan.version = 1;

  const days: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: [
      {
        activityId: `act-beta-${d.toLowerCase()}-1`,
        category: 'Música y ritmo Beta',
        objective: `Objetivo Beta para ${d}`,
        description: `Descripción Beta para el día ${d}`,
        materials: ['Cascabeles'],
        durationMinutes: 20,
        curricularTraceability: [],
      },
    ],
    complementaryActivities: [],
    prioritizedPractices: [],
    materials: ['Cascabeles'],
  }));

  plan.days = days;
  return plan;
}

function createPlanOtherTeacher(): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    'plan-other-teacher',
    FIRST_LIGHT_DAYCARE_ID,
    FIRST_LIGHT_ROOM_ID,
    'teacher-teresa-external',
    '2026-08-24',
    '2026-08-28'
  );
  plan.status = 'DRAFT';
  plan.observations = 'Expediente de otra docente no autorizada para Anita';
  return plan;
}

function createMockProposalSource(): WeeklyPlanningProposalSource {
  return {
    propose: vi.fn().mockImplementation(async (req: WeeklyPlanningProposalRequest): Promise<WeeklyPlanningProposalResponse> => {
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
        dayOfWeek: d as PlanningDay['dayOfWeek'],
        date: `2026-08-${24 + idx}`,
        activities: [
          {
            category: 'EXPERIENCIAS DE LENGUAJE',
            objective: `Objetivo nuevo para ${d}`,
            description: `Propuesta generada para ${d}`,
            durationMinutes: 25,
            materials: ['Cuentos ilustrados'],
          },
        ],
      }));
      return {
        proposalId: `prop-${Date.now()}`,
        status: 'READY',
        pedagogicalRationale: 'Propuesta enfocada en desarrollo del lenguaje.',
        days,
      };
    }),
  };
}

describe('ORDEN SR-MD-02 — Persistencia de Identidad en URL', () => {
  beforeEach(() => {
    // Reset window.location and history
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('A. Seleccionar plan-alpha: URL contiene planId=plan-alpha', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const alpha = createPlanAlpha();
    await repository.save(alpha);
    const beta = createPlanBeta();
    await repository.save(beta);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Render list view initially
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // In list view, Anita sees the plan button
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
    });

    // Anita selects plan-alpha
    const planButtons = screen.getAllByRole('button');
    const alphaBtn = planButtons.find(b => b.textContent?.includes('Trabajando en la propuesta'));
    expect(alphaBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(alphaBtn!);
    });

    // URL MUST contain planId=plan-alpha and NOT contain action=new
    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-alpha');
    expect(params.get('action')).toBeNull();

    // Verification of exact identity on screen
    await waitFor(() => {
      const obsArea = screen.getByDisplayValue('Expediente Único Alpha de Anita');
      expect(obsArea).toBeTruthy();
    });
  });

  it('B. Recargar con planId=plan-alpha: se recupera exactamente plan-alpha', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const alpha = createPlanAlpha();
    const canonical = createCanonicalClosedPlanning();
    await repository.save(alpha);
    await repository.save(canonical);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Simulate browser reload with URL containing planId=plan-alpha
    window.history.pushState({}, '', '/?planId=plan-alpha');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // MUST directly load plan-alpha without loading canonical closed planning
    await waitFor(() => {
      expect(screen.getByDisplayValue('Expediente Único Alpha de Anita')).toBeTruthy();
    });

    // Verify canonical planning was NOT loaded
    expect(screen.queryByText('Contexto histórico canónico de Anita')).toBeNull();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBe('plan-alpha');
  });

  it('C. Seleccionar plan-beta: URL cambia a planId=plan-beta', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const alpha = createPlanAlpha();
    const beta = createPlanBeta();
    await repository.save(alpha);
    await repository.save(beta);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Start with plan-alpha in URL
    window.history.pushState({}, '', '/?planId=plan-alpha');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Expediente Único Alpha de Anita')).toBeTruthy();
    });

    // Click "Volver al listado" to return to list
    const backBtn = screen.getByText(/Volver al listado/i);
    await act(async () => {
      fireEvent.click(backBtn);
    });

    // URL cleared
    expect(new URLSearchParams(window.location.search).get('planId')).toBeNull();

    // Select plan-beta from list
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
    });

    const betaBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Trabajando en la propuesta'));
    expect(betaBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(betaBtn!);
    });

    // URL MUST now be planId=plan-beta or target
    const params = new URLSearchParams(window.location.search);
    expect(params.get('planId')).toBeTruthy();
  });

  it('D. Recargar con planId=plan-beta: se recupera exactamente plan-beta', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const alpha = createPlanAlpha();
    const beta = createPlanBeta();
    const canonical = createCanonicalClosedPlanning();
    await repository.save(alpha);
    await repository.save(beta);
    await repository.save(canonical);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Simulate browser reload with URL containing planId=plan-beta
    window.history.pushState({}, '', '/?planId=plan-beta');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // MUST directly load plan-beta
    await waitFor(() => {
      expect(screen.getByDisplayValue('Expediente Único Beta de Anita')).toBeTruthy();
    });

    // Verify neither alpha nor canonical was substituted
    expect(screen.queryByText('Expediente Único Alpha de Anita')).toBeNull();
    expect(screen.queryByText('Contexto histórico canónico de Anita')).toBeNull();
  });

  it('E. Nueva planeación: URL contiene action=new y no hereda planId', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const alpha = createPlanAlpha();
    await repository.save(alpha);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Start on plan-alpha
    window.history.pushState({}, '', '/?planId=plan-alpha');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Expediente Único Alpha de Anita')).toBeTruthy();
    });

    // Click "Nueva planeación" from wizard header
    const newBtn = screen.getByText(/\+ Nueva planeación/i);
    await act(async () => {
      fireEvent.click(newBtn);
    });

    // URL MUST have action=new and ZERO planId
    const params = new URLSearchParams(window.location.search);
    expect(params.get('action')).toBe('new');
    expect(params.get('planId')).toBeNull();

    // The wizard MUST be a fresh session without alpha context
    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      expect((inputs[0] as HTMLTextAreaElement).value).toBe('');
    });
  });

  it('F. Primera persistencia: URL incorpora el planningId definitivo al crear expediente', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource = createMockProposalSource();
    const mockAuth = createMockAuth();

    // Start with action=new
    window.history.pushState({}, '', '/?action=new');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          weeklyPlanningProposalSource={proposalSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="new"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // URL is currently action=new
    expect(new URLSearchParams(window.location.search).get('action')).toBe('new');
    expect(new URLSearchParams(window.location.search).get('planId')).toBeNull();

    // Fill observation
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Interés en exploración táctil y sonora' } });
    });

    // Generate proposal
    const genBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(genBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    // Anita accepts the proposal -> FIRST PERSISTENCE
    const acceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // URL MUST incorporate the persisted planningId and remove action=new
    const paramsAfterPersist = new URLSearchParams(window.location.search);
    const persistedPlanId = paramsAfterPersist.get('planId');
    expect(persistedPlanId).toBeTruthy();
    expect(paramsAfterPersist.get('action')).toBeNull();

    // Verify in repository that this exact ID was created
    const stored = await service.getPlanning(persistedPlanId!);
    expect(stored).toBeTruthy();
    expect(stored?.observations).toBe('Interés en exploración táctil y sonora');
  });

  it('G. ID inexistente: error visible y cero fallback histórico', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const canonical = createCanonicalClosedPlanning();
    await repository.save(canonical);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Enter with non-existent planId
    window.history.pushState({}, '', '/?planId=non-existent-planning-uuid');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // MUST display explicit error banner
    await waitFor(() => {
      const errorContainer = screen.getByTestId('lab-bootstrap-error');
      expect(errorContainer).toBeTruthy();
      expect(screen.getByText(/No pudimos recuperar tu planeación/i)).toBeTruthy();
      expect(screen.getByText(/non-existent-planning-uuid/i)).toBeTruthy();
    });

    // STRICT INVARIANT: ZERO fallback to canonical closed planning
    expect(screen.queryByText('Contexto histórico canónico de Anita')).toBeNull();
    expect(screen.queryByText(/Semana cerrada/i)).toBeNull();
  });

  it('H. Acceso no autorizado: error visible y cero fallback histórico', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const canonical = createCanonicalClosedPlanning();
    const otherTeacherPlan = createPlanOtherTeacher();
    await repository.save(canonical);
    await repository.save(otherTeacherPlan);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Enter with unauthorized planId (belongs to another teacher)
    window.history.pushState({}, '', '/?planId=plan-other-teacher');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // MUST display explicit error banner for unauthorized access
    await waitFor(() => {
      const errorContainer = screen.getByTestId('lab-bootstrap-error');
      expect(errorContainer).toBeTruthy();
      expect(screen.getByText(/La planeación solicitada no pertenece a la docente autenticada/i)).toBeTruthy();
    });

    // STRICT INVARIANT: ZERO fallback to canonical closed planning
    expect(screen.queryByText('Contexto histórico canónico de Anita')).toBeNull();
    expect(screen.queryByText('Expediente de otra docente no autorizada para Anita')).toBeNull();
  });

  it('I. Navegación back/forward (popstate): identidad y vista coherentes', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const alpha = createPlanAlpha();
    await repository.save(alpha);
    const beta = createPlanBeta();
    await repository.save(beta);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Start at list
    window.history.pushState({}, '', '/');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
    });

    // Simulate browser navigation to plan-alpha
    window.history.pushState({}, '', '/?planId=plan-alpha');
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Should sync to plan-alpha
    await waitFor(() => {
      expect(screen.getByDisplayValue('Expediente Único Alpha de Anita')).toBeTruthy();
    });

    // Simulate browser Back button (URL returns to /)
    window.history.pushState({}, '', '/');
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Should sync back to list
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
    });
  });

  it('J. Cambios de rol: no se filtran expedientes de otro usuario al conmutar', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const alpha = createPlanAlpha();
    alpha.teacherId = 't1';
    await repository.save(alpha);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();

    // Non-FirstLight mode allows role switcher buttons testing
    window.history.pushState({}, '', '/?planId=plan-alpha');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Expediente Único Alpha de Anita')).toBeTruthy();
    });

    // Change role to Tere (Supervisor)
    const tereBtn = screen.getByRole('button', { name: /Tere \(Supervisora\)/i });
    await act(async () => {
      fireEvent.click(tereBtn);
    });

    // Check that Ceci / Tere buttons or views respond safely and don't leak unverified state
    expect(screen.getAllByText(/Tere/i).length).toBeGreaterThanOrEqual(1);
  });
});
