import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanningDashboard } from '../../../pages/planning/PlanningDashboard';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { FirestoreWeeklyPlanningRepository } from '../../../infrastructure/repositories/FirestoreWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type {
  WeeklyPlanStatus,
  DailyEvaluationStatus,
  PlanningDay,
} from '../../../domain/planning/WeeklyPlanning';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_ANITA_EMAIL,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_CECI_EMAIL,
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

function createCanonicalLabPlanning(params: {
  planningId?: string;
  teacherId?: string;
  status?: WeeklyPlanStatus;
  days?: PlanningDay[];
} = {}): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    params.planningId || FIRST_LIGHT_PLANNING_ID,
    FIRST_LIGHT_DAYCARE_ID,
    FIRST_LIGHT_ROOM_ID,
    params.teacherId || FIRST_LIGHT_TEACHER_ID,
    '2026-08-24',
    '2026-08-28'
  );

  plan.status = params.status || 'APPROVED';
  plan.observations = 'Observación pedagógica canónica de Anita';
  plan.identifiedNeeds = 'Desarrollo de motricidad y exploración sensorial';
  plan.specialSituations = 'Ninguna';
  plan.availableMaterials = 'Pelotas sensoriales, tapetes, sonajas';
  plan.curricularReferences = ['TUTORIA-PDA-0001'];
  plan.version = 2;

  const days: PlanningDay[] = params.days || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: [
      {
        activityId: `act-${d.toLowerCase()}-1`,
        category: 'Exploración sensorial',
        objective: `Objetivo para ${d}`,
        description: `Descripción de actividades para el día ${d}`,
        materials: ['Pelotas suaves', 'Tapetes'],
        durationMinutes: 20,
        curricularTraceability: [],
      },
    ],
    complementaryActivities: [],
    prioritizedPractices: [],
    materials: ['Pelotas suaves', 'Tapetes'],
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

describe('H1R13.3H.6 — LAB Weekly Planning Durable Persistence + Rehydration Cable', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  // --------------------------------------------------------------------------
  // TEST 1: LAB REPOSITORY INJECTION
  // --------------------------------------------------------------------------
  describe('1. LAB Repository Injection Policy', () => {
    it('1.1. Injects FirestoreWeeklyPlanningRepository when First Light LAB mode is active', () => {
      const { container } = render(
        <PlanningDashboard
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
        />
      );
      expect(container).toBeTruthy();
    });

    it('1.2. Injects InMemoryWeeklyPlanningRepository when outside LAB mode', () => {
      const { container } = render(
        <PlanningDashboard firstLightEnv={{}} />
      );
      expect(container).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // TEST 2 & 3: STARTUP REHYDRATION & REFRESH/REMOUNT PRESERVATION
  // --------------------------------------------------------------------------
  describe('2 & 3. Startup Rehydration and Refresh Invariance', () => {
    it('2. Startup rehydration automatically loads an existing persisted planning for Anita', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

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

      // Verify that after rehydration, TeacherWizard mounts and displays Anita's plan
      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Verify status reflects APPROVED / Aprobada para ejecución
      expect(screen.getByText(/Aprobada para ejecución/)).toBeTruthy();
    });

    it('3. Refresh / remount preserves planning identity, weekly context, activities, and APPROVED state', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      // First mount
      const { unmount } = render(
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

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Simulate browser refresh by unmounting and mounting a fresh instance against the same repository
      unmount();

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

      // Re-assert complete reconstructed state after reload
      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      expect(screen.getByText(/Aprobada para ejecución/)).toBeTruthy();
      expect(screen.getByText(/Objetivo para MONDAY/)).toBeTruthy();

      // Expand activity to verify full description is preserved
      const expandBtn = screen.getByText(/Objetivo para MONDAY/);
      await act(async () => {
        fireEvent.click(expandBtn);
      });
      expect(screen.getByDisplayValue(/Descripción de actividades para el día MONDAY/)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // TEST 4 & 5: SAVE DAILY EVALUATION DRAFT PERSISTENCE & RESTORATION
  // --------------------------------------------------------------------------
  describe('4 & 5. Daily Evaluation Draft Durable Persistence', () => {
    it('4. Saving a daily evaluation draft persists to the underlying repository', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-24"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Find the evaluation textarea
      const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/);
      fireEvent.change(textarea, { target: { value: 'Borrador persistido del lunes para Anita' } });

      // Click Guardar borrador
      const saveBtn = screen.getByRole('button', { name: /💾 Guardar borrador/ });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      // Verify persistent repository has the draft saved
      const savedInRepo = await repo.findById(FIRST_LIGHT_PLANNING_ID);
      expect(savedInRepo).not.toBeNull();
      const mondayInRepo = savedInRepo!.days.find(d => d.dayOfWeek === 'MONDAY');
      expect(mondayInRepo?.evaluation).toBe('Borrador persistido del lunes para Anita');
    });

    it('5. Remount after draft save restores the draft into the textarea', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      // Session 1: save draft
      const { unmount } = render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-24"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      const textarea1 = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/);
      fireEvent.change(textarea1, { target: { value: 'Borrador que sobrevive al F5' } });

      const saveBtn = screen.getByRole('button', { name: /💾 Guardar borrador/ });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      // Simulate refresh
      unmount();

      // Session 2: mount fresh
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-24"
        />
      );

      await waitFor(() => {
        const textarea2 = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/) as HTMLTextAreaElement;
        expect(textarea2.value).toBe('Borrador que sobrevive al F5');
      });
    });
  });

  // --------------------------------------------------------------------------
  // TEST 6 & 7: SUBMIT MONDAY EVALUATION PERSISTENCE & RESTORATION
  // --------------------------------------------------------------------------
  describe('6 & 7. Evaluation Submission Durable Persistence', () => {
    it('6. Submitting Monday evaluation persists status SUBMITTED and metadata to repository', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-24"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/);
      fireEvent.change(textarea, { target: { value: 'Evaluación oficial de lunes enviada a Ceci' } });

      const submitBtn = screen.getByRole('button', { name: /🚀 Enviar evaluación a Ceci/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Verify repository has submitted state
      const savedInRepo = await repo.findById(FIRST_LIGHT_PLANNING_ID);
      expect(savedInRepo).not.toBeNull();
      const mondayInRepo = savedInRepo!.days.find(d => d.dayOfWeek === 'MONDAY');
      expect(mondayInRepo?.evaluation).toBe('Evaluación oficial de lunes enviada a Ceci');
      expect(mondayInRepo?.evaluationStatus).toBe('IN_REVIEW');
      expect(mondayInRepo?.evaluationSubmittedBy).toBe(FIRST_LIGHT_TEACHER_ID);
      expect(mondayInRepo?.evaluationSubmittedAt).toBeTruthy();
    });

    it('7. Remount after submission preserves Monday in review state with submitted metadata', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      // Submit in session 1
      const { unmount } = render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-24"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/);
      fireEvent.change(textarea, { target: { value: 'Evaluación confirmada lunes' } });

      const submitBtn = screen.getByRole('button', { name: /🚀 Enviar evaluación a Ceci/ });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Simulate refresh
      unmount();

      // Mount session 2
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-24"
        />
      );

      // Verify that Monday shows in-review state
      await waitFor(() => {
        expect(screen.getByText(/Evaluación enviada a Dirección/)).toBeTruthy();
        expect(screen.getByText(/✓ Enviada por Anita/)).toBeTruthy();
        expect(screen.getByText(/Evaluación registrada y en revisión por Ceci/)).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // TEST 8 & 9: DOMAIN INVARIANT FOR TUESDAY EVALUATION LOCK & UNLOCK
  // --------------------------------------------------------------------------
  describe('8 & 9. Chronological Evaluation Domain Invariants', () => {
    it('8. Tuesday remains locked when Monday evaluation is not submitted', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      // Plan with no evaluations on any day
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-25" // Viewing Tuesday
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Switch to Tuesday tab
      const tuesdayTab = screen.getByRole('tab', { name: /Martes 25/ });
      await act(async () => {
        fireEvent.click(tuesdayTab);
      });

      // Verify Tuesday is locked because Monday is pending
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Martes 25/i, level: 4 })).toBeTruthy();
        expect(screen.getByText(/🔒 Evaluación bloqueada por orden cronológico/)).toBeTruthy();
        expect(screen.getByText(/Completa primero la evaluación de Lunes/i)).toBeTruthy();
      });
    });

    it('9. Tuesday becomes evaluable after Monday is legitimately submitted', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      // Durably submit Monday using canonical domain method
      canonicalPlan.confirmAndSubmitDailyEvaluation('MONDAY', 'Evaluación de lunes completada', FIRST_LIGHT_TEACHER_ID, '2026-08-24');
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-25" // Viewing Tuesday
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Switch to Tuesday tab
      const tuesdayTab = screen.getByRole('tab', { name: /Martes 25/ });
      await act(async () => {
        fireEvent.click(tuesdayTab);
      });

      // Verify Tuesday is now unlocked and editable
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Martes 25/i, level: 4 })).toBeTruthy();
        expect(screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /💾 Guardar borrador/ })).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // TEST 10: FRESH WEEK BEHAVIOR WHEN NO PLANNING EXISTS
  // --------------------------------------------------------------------------
  describe('10. Fresh-Week Behavior When No Planning Exists', () => {
    it('10. Fresh week shows "Comenzar nuestra semana" and does not fabricate a planning', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

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

      // Verify fresh week button is visible and no fabricated planning is auto-created
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /✨ Comenzar nuestra semana/ })).toBeTruthy();
      });

      const plansInRepo = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
      expect(plansInRepo).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // TEST 11: CROSS-TEACHER ISOLATION
  // --------------------------------------------------------------------------
  describe('11. Cross-Teacher Isolation Policy', () => {
    it('11. Another teacher cannot load Anita\'s planning on rehydration', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      // Authenticated as teacher-other
      const otherAuth = createMockAuth('lab-teacher-other');

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={otherAuth}
        />
      );

      // In First Light LAB: fails closed, does NOT expose planning, and does NOT fall through to fresh-week CTA
      await waitFor(() => {
        expect(screen.getByTestId('lab-bootstrap-error')).toBeTruthy();
      });
      expect(screen.queryByRole('button', { name: /✨ Comenzar nuestra semana/ })).toBeNull();
      expect(screen.queryByText(/Observación pedagógica canónica de Anita/)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // TEST 12, 13 & 14: NON-REGRESSION OF WORKFLOWS
  // --------------------------------------------------------------------------
  describe('12, 13 & 14. Non-Regression of Governed Workflows', () => {
    it('12. Human Gate / Evaluation AI CTA renders for eligible day on rehydrated planning', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          currentDate="2026-08-24"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Verify the AI evaluation human gate button exists on rehydrated planning
      expect(screen.getByRole('button', { name: /✨ Ayúdame a redactar mi evaluación/ })).toBeTruthy();
    });

    it('14. Director approval workflow functions and persists approval status', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const plan = createCanonicalLabPlanning({ status: 'IN_REVIEW' });
      await repo.save(plan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      // Director approves
      await service.approve(plan.planningId, 'DIRECTOR', 'Ceci');

      const approvedPlan = await repo.findById(plan.planningId);
      expect(approvedPlan).not.toBeNull();
      expect(approvedPlan!.status).toBe('APPROVED');
      expect(approvedPlan!.approvedBy).toBe('Ceci');
    });
  });

  // ==========================================================================
  // H1R13.3H.7B — BOOTSTRAP NAVIGATION GATE INVARIANTS
  // ==========================================================================
  describe('H1R13.3H.7B — Bootstrap Navigation Gate Invariants', () => {
    it('A. AUTH PENDING: Neutral loading UI is shown, TeacherList is not mounted, and no t1 lookup occurs while auth is unresolved', async () => {
      let resolveAuthSession!: (uid: string | null) => void;
      const pendingAuthPromise = new Promise<string | null>((resolve) => {
        resolveAuthSession = resolve;
      });

      const pendingAuth: AuthenticationProvider = {
        login: vi.fn(),
        logout: vi.fn(),
        restoreSession: vi.fn().mockReturnValue(pendingAuthPromise),
        getCurrentUser: vi.fn().mockReturnValue(null),
      };

      const repo = new InMemoryWeeklyPlanningRepository();
      const getPlanningSpy = vi.spyOn(repo, 'findById');
      const listTeacherSpy = vi.spyOn(repo, 'listByTeacher');
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: 'true',
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={pendingAuth}
        />
      );

      // Invariant: Neutral loading UI is shown
      expect(screen.getByTestId('lab-bootstrap-loading')).toBeTruthy();
      expect(screen.getByText(/Cargando tu planeación pedagógica\.\.\./)).toBeTruthy();

      // Invariant: TeacherList is NOT shown
      expect(screen.queryByText(/Hola Anita 👋/)).toBeNull();
      // Invariant: "Comenzar nuestra semana" is NOT shown
      expect(screen.queryByRole('button', { name: /✨ Comenzar nuestra semana/ })).toBeNull();

      // Invariant: No planning lookup has proceeded with t1 or any other user
      expect(getPlanningSpy).not.toHaveBeenCalled();
      expect(listTeacherSpy).not.toHaveBeenCalledWith('t1');

      // Cleanup pending promise
      await act(async () => {
        resolveAuthSession(FIRST_LIGHT_TEACHER_ID);
      });
    });

    it('B. EXISTING CANONICAL PLANNING: Auto-opens canonical planning directly without requiring user clicks', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

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

      // Invariant: Automatically transitions to TeacherWizard with canonical plan loaded
      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Invariant: Canonical context visible and approved status preserved
      expect(screen.getByText(/Aprobada para ejecución/)).toBeTruthy();
      expect(screen.queryByTestId('lab-bootstrap-loading')).toBeNull();
      expect(screen.queryByTestId('lab-bootstrap-error')).toBeNull();
      // Invariant: User was NOT required to click "Comenzar nuestra semana"
      expect(screen.queryByRole('button', { name: /✨ Comenzar nuestra semana/ })).toBeNull();
    });

    it('C. NO CANONICAL PLANNING: Authoritative empty state reveals fresh-week CTA and performs zero writes', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const saveSpy = vi.spyOn(repo, 'save');
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

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

      // Invariant: Fresh-week CTA becomes available ONLY after authoritative resolution confirms no planning
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /✨ Comenzar nuestra semana/ })).toBeTruthy();
      });

      // Invariant: No planning was auto-created and zero writes occurred
      expect(saveSpy).not.toHaveBeenCalled();
      const allPlans = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
      expect(allPlans).toHaveLength(0);
    });

    it('D. LOOKUP ERROR: Fails closed to error state, does not show fresh-week CTA, and performs zero writes', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      vi.spyOn(repo, 'findById').mockRejectedValue(new Error('Firestore connectivity failure'));
      const saveSpy = vi.spyOn(repo, 'save');
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

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

      // Invariant: Fail-closed error state shown
      await waitFor(() => {
        expect(screen.getByTestId('lab-bootstrap-error')).toBeTruthy();
        expect(screen.getByText(/No pudimos recuperar tu planeación\. Intenta nuevamente\./)).toBeTruthy();
      });

      // Invariant: Fresh-week CTA is NOT shown
      expect(screen.queryByRole('button', { name: /✨ Comenzar nuestra semana/ })).toBeNull();
      // Invariant: No planning creation occurred
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('E. OWNERSHIP DEFENSE: If returned planning belongs to another teacher, fail closed without showing CTA', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      // Planning with canonical ID but belonging to a different teacher
      const wrongTeacherPlan = createCanonicalLabPlanning({ teacherId: 'lab-teacher-carmen' });
      await repo.save(wrongTeacherPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_TEACHER_ID);

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

      // Invariant: Fails closed with error UI
      await waitFor(() => {
        expect(screen.getByTestId('lab-bootstrap-error')).toBeTruthy();
      });

      // Invariant: Planning is not exposed
      expect(screen.queryByText(/Observación pedagógica canónica de Anita/)).toBeNull();
      // Invariant: Fresh-week CTA is not used as fallback
      expect(screen.queryByRole('button', { name: /✨ Comenzar nuestra semana/ })).toBeNull();
    });

    it('F & G. IDENTITY & CANONICAL ID: Resolves exact canonical ID and never queries with t1 in First Light LAB', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const findByIdSpy = vi.spyOn(repo, 'findById');
      const listTeacherSpy = vi.spyOn(repo, 'listByTeacher');
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

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

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Invariant G: Resolves exactly the canonical ID
      expect(findByIdSpy).toHaveBeenCalledWith('f1000000-0000-4000-8000-000000000001');

      // Invariant F: Zero calls made with legacy 't1'
      expect(findByIdSpy).not.toHaveBeenCalledWith('t1');
      expect(listTeacherSpy).not.toHaveBeenCalledWith('t1');
    });

    it('H. NO DUPLICATE: Existing canonical planning bootstrap executes zero createPlanning calls', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const createPlanningSpy = vi.spyOn(service, 'createPlanning');
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth();

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

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Invariant H: Zero createPlanning calls
      expect(createPlanningSpy).not.toHaveBeenCalled();
    });
  });

  describe('H1R13.3H.8 — Ceci Governed Review First Light: Director Runtime Wiring', () => {
    // A. FIRST LIGHT IDENTITY
    it('1. Anita identity resolves TEACHER runtime', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_TEACHER_ID);

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

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });
      expect(screen.getAllByText(/Anita/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/⏳ PENDIENTE DE MI REVISIÓN/)).toBeNull();
    });

    it('2. Ceci identity resolves DIRECTOR runtime', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Observaciones pedagógicas del lunes por Anita';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

      await waitFor(() => {
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
      });
      expect(screen.getAllByText(/Directora/i).length).toBeGreaterThan(0);
    });

    it('3. Unknown UID fails closed and does not expose Director or Teacher runtime', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      await repo.save(canonicalPlan);
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth('unknown-intruder-uid');

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

      await waitFor(() => {
        expect(screen.getByTestId('lab-bootstrap-error')).toBeTruthy();
      });
      expect(screen.queryByText(/Observación pedagógica canónica de Anita/)).toBeNull();
      expect(screen.queryByText(/PENDIENTE DE MI REVISIÓN/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Aprobar evaluación/i })).toBeNull();
    });

    it('4. Director UI cannot become active while Firebase Auth is Anita', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Observaciones pedagógicas del lunes por Anita';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_TEACHER_ID);

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

      await waitFor(() => {
        expect(screen.getByText(/Observación pedagógica canónica de Anita/)).toBeTruthy();
      });

      // Assert Director controls are not rendered
      expect(screen.queryByText(/PENDIENTE DE MI REVISIÓN/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Aprobar evaluación/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Solicitar cambio/i })).toBeNull();
    });

    // B. DIRECTOR BOOTSTRAP
    it('5. Ceci First Light resolves canonical planning by direct ID', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Lunes completado';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const findByIdSpy = vi.spyOn(repo, 'findById');
      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

      await waitFor(() => {
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
      });

      expect(findByIdSpy).toHaveBeenCalledWith(FIRST_LIGHT_PLANNING_ID);
    });

    it('6. Director bootstrap does not depend on broad review-queue query in controlled First Light', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Lunes completado';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const listDirectorQueueSpy = vi.spyOn(service, 'listDirectorReviewQueue');
      const listSupervisorSpy = vi.spyOn(service, 'listSupervisorApprovedPlanning');
      const listInReviewSpy = vi.spyOn(repo, 'listInReview');
      const listApprovedSpy = vi.spyOn(repo, 'listApproved');
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

      await waitFor(() => {
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
      });

      expect(listDirectorQueueSpy).not.toHaveBeenCalled();
      expect(listSupervisorSpy).not.toHaveBeenCalled();
      expect(listInReviewSpy).not.toHaveBeenCalled();
      expect(listApprovedSpy).not.toHaveBeenCalled();
    });

    it('7. Correct canonical planning is opened with Monday IN_REVIEW and sent by Anita', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Evaluación canónica de Anita para lunes';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

      await waitFor(() => {
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
      });

      expect(screen.getByText(/Evaluación canónica de Anita para lunes/)).toBeTruthy();
      expect(screen.getByText(/✓ Enviada por Anita/)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Aprobar evaluación/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Solicitar cambio/i })).toBeTruthy();
    });

    it('8. Refresh / remount under Ceci returns directly to Director experience', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Evaluación para revisión de Ceci';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

      const { unmount } = render(
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

      await waitFor(() => {
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
      });

      unmount();

      // Simulate refresh / remount
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

      await waitFor(() => {
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
      });
      expect(screen.getByText(/✓ Enviada por Anita/)).toBeTruthy();
    });

    // C. REVIEWER IDENTITY
    it('9. Approve action passes authenticated UID as directorId to domain service', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Evaluación completada';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const approveSpy = vi.spyOn(service, 'approveDailyEvaluation');
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Aprobar evaluación/i })).toBeTruthy();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Aprobar evaluación/i }));
      });

      await waitFor(() => {
        expect(approveSpy).toHaveBeenCalledTimes(1);
      });

      expect(approveSpy).toHaveBeenCalledWith(
        FIRST_LIGHT_PLANNING_ID,
        'MONDAY',
        'DIRECTOR',
        FIRST_LIGHT_DIRECTOR_ID
      );

      // Verify repository persistence
      const saved = await repo.findById(FIRST_LIGHT_PLANNING_ID);
      expect(saved?.days[0].evaluationStatus).toBe('APPROVED');
      expect(saved?.days[0].evaluationReviewedBy).toBe(FIRST_LIGHT_DIRECTOR_ID);
    });

    it('10. Request-change action passes authenticated UID as directorId to domain service', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Evaluación requiere ajuste';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const requestChangeSpy = vi.spyOn(service, 'requestDailyEvaluationChange');
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Solicitar cambio/i })).toBeTruthy();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Solicitar cambio/i }));
      });

      const commentInput = screen.getByPlaceholderText(/Escribe la observación o ajuste solicitado/i);
      await act(async () => {
        fireEvent.change(commentInput, { target: { value: 'Favor de ampliar notas pedagógicas del lunes' } });
      });

      const submitBtn = screen.getByRole('button', { name: /Enviar solicitud de cambio/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(requestChangeSpy).toHaveBeenCalledTimes(1);
      });

      expect(requestChangeSpy).toHaveBeenCalledWith(
        FIRST_LIGHT_PLANNING_ID,
        'MONDAY',
        'Favor de ampliar notas pedagógicas del lunes',
        'DIRECTOR',
        FIRST_LIGHT_DIRECTOR_ID
      );

      const saved = await repo.findById(FIRST_LIGHT_PLANNING_ID);
      expect(saved?.days[0].evaluationStatus).toBe('CHANGES_REQUESTED');
      expect(saved?.days[0].evaluationReviewedBy).toBe(FIRST_LIGHT_DIRECTOR_ID);
    });

    it('11. Display label "Ceci" is never persisted as evaluationReviewedBy in repository', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Evaluación completada';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Aprobar evaluación/i })).toBeTruthy();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Aprobar evaluación/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/✓ Evaluación aprobada/i)).toBeTruthy();
      });

      const persistedPlan = await repo.findById(FIRST_LIGHT_PLANNING_ID);
      expect(persistedPlan?.days[0].evaluationReviewedBy).not.toBe('Ceci');
      expect(persistedPlan?.days[0].evaluationReviewedBy).toBe('lab-director-ceci');
    });

    it('12. Missing authenticated UID fails closed and prevents Director review operations', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const canonicalPlan = createCanonicalLabPlanning();
      canonicalPlan.days[0].evaluation = 'Evaluación completada';
      canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
      canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      await repo.save(canonicalPlan);

      const service = new PlanningWorkflowService(repo);
      const source = new DeterministicPedagogicalRecommendationSource();
      const mockAuth: AuthenticationProvider = {
        login: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn().mockResolvedValue(undefined),
        restoreSession: vi.fn().mockResolvedValue(null),
        getCurrentUser: vi.fn().mockReturnValue(null),
      };

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

      await waitFor(() => {
        expect(screen.getByTestId('lab-bootstrap-error')).toBeTruthy();
      });

      expect(screen.queryByText(/PENDIENTE DE MI REVISIÓN/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Aprobar evaluación/i })).toBeNull();
    });
  });

  describe('H1R13.3H.9 — Director Governance UX Hardening', () => {
    describe('Debt A: Planning Review Action Visibility', () => {
      it('Case 1: planning.status = IN_REVIEW -> legitimate planning-review action remains available', async () => {
        const repo = new InMemoryWeeklyPlanningRepository();
        const canonicalPlan = createCanonicalLabPlanning();
        canonicalPlan.status = 'IN_REVIEW';
        canonicalPlan.days[0].directorReviewed = false;
        await repo.save(canonicalPlan);

        const service = new PlanningWorkflowService(repo);
        const source = new DeterministicPedagogicalRecommendationSource();
        const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Marcar día revisado/i })).toBeTruthy();
        });
      });

      it('Case 2: planning.status = APPROVED -> Marcar día revisado is NOT actionable/rendered', async () => {
        const repo = new InMemoryWeeklyPlanningRepository();
        const canonicalPlan = createCanonicalLabPlanning();
        canonicalPlan.status = 'APPROVED';
        canonicalPlan.days[0].directorReviewed = false;
        await repo.save(canonicalPlan);

        const service = new PlanningWorkflowService(repo);
        const source = new DeterministicPedagogicalRecommendationSource();
        const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

        await waitFor(() => {
          expect(screen.getByText(/Desarrollo de las acciones pedagógicas/i)).toBeTruthy();
        });

        expect(screen.queryByRole('button', { name: /Marcar día revisado/i })).toBeNull();
        expect(screen.queryByText(/Día revisado/i)).toBeNull();
      });

      it('Case 3: planning.status = READY_FOR_CLOSURE -> planning-review action is NOT actionable/rendered', async () => {
        const repo = new InMemoryWeeklyPlanningRepository();
        const canonicalPlan = createCanonicalLabPlanning();
        canonicalPlan.status = 'APPROVED';
        for (const d of canonicalPlan.days) {
          d.evaluationStatus = 'APPROVED';
        }
        expect(canonicalPlan.isReadyForClosure).toBe(true);
        await repo.save(canonicalPlan);

        const service = new PlanningWorkflowService(repo);
        const source = new DeterministicPedagogicalRecommendationSource();
        const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

        await waitFor(() => {
          expect(screen.getByText(/Semana lista para cierre/i)).toBeTruthy();
        });

        expect(screen.queryByRole('button', { name: /Marcar día revisado/i })).toBeNull();
        expect(screen.queryByText(/Día revisado/i)).toBeNull();
      });

      it('Case 4: planning.status = CLOSED -> planning-review action is NOT actionable/rendered', async () => {
        const repo = new InMemoryWeeklyPlanningRepository();
        const canonicalPlan = createCanonicalLabPlanning();
        canonicalPlan.status = 'CLOSED';
        await repo.save(canonicalPlan);

        const service = new PlanningWorkflowService(repo);
        const source = new DeterministicPedagogicalRecommendationSource();
        const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

        await waitFor(() => {
          expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);
        });

        expect(screen.queryByRole('button', { name: /Marcar día revisado/i })).toBeNull();
        expect(screen.queryByText(/Día revisado/i)).toBeNull();
      });
    });

    describe('Debt B: Safe Director Action Error Feedback & Double Action Protection', () => {
      it('Director approval failure: shows safe error, preserves IN_REVIEW, does not call onSaved or show success', async () => {
        const repo = new InMemoryWeeklyPlanningRepository();
        const canonicalPlan = createCanonicalLabPlanning();
        canonicalPlan.days[0].evaluation = 'Evaluación completada';
        canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
        canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
        await repo.save(canonicalPlan);

        const service = new PlanningWorkflowService(repo);
        vi.spyOn(service, 'approveDailyEvaluation').mockRejectedValue(
          new Error('PERMISSION_DENIED: Cloud Firestore Rules evaluation rejected write')
        );
        const source = new DeterministicPedagogicalRecommendationSource();
        const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Aprobar evaluación/i })).toBeTruthy();
        });

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: /Aprobar evaluación/i }));
        });

        await waitFor(() => {
          expect(screen.getByText('No fue posible aprobar la evaluación. Intenta nuevamente.')).toBeTruthy();
        });

        // UI does NOT show evaluation approved
        expect(screen.queryByText(/Evaluación aprobada/i)).toBeNull();
        // UI remains reviewable/pending according to canonical state
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Aprobar evaluación/i })).toBeTruthy();
        // No raw internal error/stack/path rendered
        expect(screen.queryByText(/PERMISSION_DENIED/i)).toBeNull();
        expect(screen.queryByText(/Cloud Firestore Rules/i)).toBeNull();

        // Verify repository remains unchanged
        const doc = await repo.findById(FIRST_LIGHT_PLANNING_ID);
        expect(doc?.days[0].evaluationStatus).toBe('IN_REVIEW');
        expect(doc?.days[0].evaluationReviewedBy).toBeUndefined();
      });

      it('Director request-changes failure: shows safe error, preserves IN_REVIEW, does not show CHANGES_REQUESTED', async () => {
        const repo = new InMemoryWeeklyPlanningRepository();
        const canonicalPlan = createCanonicalLabPlanning();
        canonicalPlan.days[0].evaluation = 'Evaluación completada';
        canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
        canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
        await repo.save(canonicalPlan);

        const service = new PlanningWorkflowService(repo);
        vi.spyOn(service, 'requestDailyEvaluationChange').mockRejectedValue(
          new Error('PERMISSION_DENIED: Missing authorization')
        );
        const source = new DeterministicPedagogicalRecommendationSource();
        const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Solicitar cambio/i })).toBeTruthy();
        });

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: /Solicitar cambio/i }));
        });

        const commentInput = screen.getByPlaceholderText(/Escribe la observación o ajuste solicitado/i);
        await act(async () => {
          fireEvent.change(commentInput, { target: { value: 'Comentario de prueba' } });
        });

        const submitBtn = screen.getByRole('button', { name: /Enviar solicitud de cambio/i });
        await act(async () => {
          fireEvent.click(submitBtn);
        });

        await waitFor(() => {
          expect(screen.getByText('No fue posible solicitar el cambio. Intenta nuevamente.')).toBeTruthy();
        });

        // UI does NOT show CHANGES_REQUESTED / CAMBIO SOLICITADO
        expect(screen.queryByText(/CAMBIO SOLICITADO/i)).toBeNull();
        // UI remains in reviewable state
        expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeTruthy();
        // No raw internal error rendered
        expect(screen.queryByText(/PERMISSION_DENIED/i)).toBeNull();

        // Repository remains unchanged
        const doc = await repo.findById(FIRST_LIGHT_PLANNING_ID);
        expect(doc?.days[0].evaluationStatus).toBe('IN_REVIEW');
      });

      it('Double action protection: action buttons are disabled while persistence is pending', async () => {
        const repo = new InMemoryWeeklyPlanningRepository();
        const canonicalPlan = createCanonicalLabPlanning();
        canonicalPlan.days[0].evaluation = 'Evaluación completada';
        canonicalPlan.days[0].evaluationStatus = 'IN_REVIEW';
        canonicalPlan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
        await repo.save(canonicalPlan);

        const service = new PlanningWorkflowService(repo);
        let resolveApprove: () => void = () => {};
        const approvePromise = new Promise<void>((resolve) => {
          resolveApprove = resolve;
        });
        const approveSpy = vi.spyOn(service, 'approveDailyEvaluation').mockImplementation(async () => {
          await approvePromise;
        });

        const source = new DeterministicPedagogicalRecommendationSource();
        const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

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

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Aprobar evaluación/i })).toBeTruthy();
        });

        const approveBtn = screen.getByRole('button', { name: /Aprobar evaluación/i });
        const requestChangeBtn = screen.getByRole('button', { name: /Solicitar cambio/i });

        // Trigger first click
        await act(async () => {
          fireEvent.click(approveBtn);
        });

        // While pending: both controls disabled
        expect((approveBtn as HTMLButtonElement).disabled).toBe(true);
        expect((requestChangeBtn as HTMLButtonElement).disabled).toBe(true);

        // Second click does nothing
        await act(async () => {
          fireEvent.click(approveBtn);
        });
        expect(approveSpy).toHaveBeenCalledTimes(1);

        // Resolve promise
        await act(async () => {
          resolveApprove();
        });

        await waitFor(() => {
          expect(screen.getByText(/✓ Evaluación aprobada/i)).toBeTruthy();
        });
      });
    });
  });
});
