import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_DAYCARE_ID,
} from '../firstLightLabHarness';

describe('SR-MD-21 — F5 Room Identity Preservation & Historical Integrity', () => {
  const PLAN_B_ID = 'd28a4788-35e7-4ed4-a278-92825f2be73e';
  const PLAN_A_ID = 'a11a1111-2222-3333-4444-555555555555';
  const ROOM_B_ID = 'room-lactantes-b';
  const ROOM_A_ID = 'room-lactantes-a';
  const CURRENT_DATE = '2026-08-24';

  const defaultFirstLightEnv = {
    [FIRST_LIGHT_LAB_FLAG]: 'true',
    VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  };

  const createMockAuth = (uid: string = FIRST_LIGHT_TEACHER_ID): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid),
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
  });

  const setupTestEnvironment = async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_TEACHER_ID);

    // Plan Lactantes B
    const planB = WeeklyPlanning.create(
      PLAN_B_ID,
      FIRST_LIGHT_DAYCARE_ID,
      ROOM_B_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    const recsB = await pedSource.generateRecommendation(null as any, 'Obs B', 'Needs B', 'Sit B', 'Mat B');
    planB.days = recsB;
    planB.status = 'APPROVED';
    planB.approvedBy = 'Ceci';
    planB.approvedAt = new Date('2026-08-23T12:00:00Z');
    await repo.save(planB);

    // Plan Lactantes A
    const planA = WeeklyPlanning.create(
      PLAN_A_ID,
      FIRST_LIGHT_DAYCARE_ID,
      ROOM_A_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    const recsA = await pedSource.generateRecommendation(null as any, 'Obs A', 'Needs A', 'Sit A', 'Mat A');
    planA.days = recsA;
    planA.status = 'APPROVED';
    planA.approvedBy = 'Ceci';
    planA.approvedAt = new Date('2026-08-23T12:00:00Z');
    await repo.save(planA);

    return { repo, service, pedSource, mockAuth, planB, planA };
  };

  // 1. Apertura directa por URL de expediente Lactantes B
  it('1. Apertura directa por URL: recupera expediente B y muestra cabecera institucional LB', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // Wait for plan to load
    await screen.findByRole('tab', { name: /Lunes 24/i });

    // Assert institutional identity in header
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();

    // Verify it does NOT show Lactantes A in header
    expect(screen.queryByText('Asistente Educativa LA')).toBeNull();
    expect(screen.queryByText('Asistente Educativa · Lactantes A')).toBeNull();
  });

  // 2. F5 Reload: remount con la misma URL mantiene contexto Lactantes B
  it('2. F5 Reload: remount con la misma URL permanece en contexto Lactantes B', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    // Initial mount
    const firstRender = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();

    // Simulate F5: unmount and remount with identical URL
    firstRender.unmount();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    expect(screen.queryByText('Asistente Educativa LA')).toBeNull();
  });

  // 3. Retorno al listado: volver atrás permanece en el listado de Lactantes B
  it('3. Retorno al listado: al pulsar Volver al listado, conserva el filtro de Lactantes B', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });

    // Click "← Volver al listado" to return to list
    const backBtn = screen.getByRole('button', { name: /Volver al listado/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });

    // Verify view transitioned to LIST and active room is Lactantes B
    await waitFor(() => {
      expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
      expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    });

    // The room pill for Lactantes B should be selected
    const roomBPill = screen.getByTestId('room-tab-room-lactantes-b');
    expect(roomBPill.className).toContain('bg-brand-primary');
  });

  // 4. Cambio voluntario de sala en el listado
  it('4. Cambio voluntario de sala: conmuta ordenadamente de B a A en el listado', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });

    // Return to list
    const backBtn = screen.getByRole('button', { name: /Volver al listado/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    });

    // Voluntarily switch to Lactantes A
    const roomAPill = screen.getByTestId('room-tab-room-lactantes-a');
    await act(async () => {
      fireEvent.click(roomAPill);
    });

    // Verify active room switched to Lactantes A
    await waitFor(() => {
      expect(screen.getByText('Asistente Educativa LA')).toBeTruthy();
      expect(screen.getByText('Asistente Educativa · Lactantes A')).toBeTruthy();
    });
  });

  // 5. Navegación hacia atrás (popstate): sincroniza la sala canónica del plan destino
  it('5. Navegación hacia atrás (popstate): sincroniza correctamente con la sala del plan al navegar en historial', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();

    // Simulate browser navigation to Plan A
    await act(async () => {
      window.history.pushState({}, '', `/?planId=${PLAN_A_ID}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(screen.getByText('Asistente Educativa LA')).toBeTruthy();
      expect(screen.getByText('Asistente Educativa · Lactantes A')).toBeTruthy();
    });

    // Simulate browser navigation back to Plan B
    await act(async () => {
      window.history.pushState({}, '', `/?planId=${PLAN_B_ID}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
      expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    });
  });

  // 6. Precedencia de roomOverride
  it('6. Precedencia de roomOverride: tiene prioridad absoluta sobre selecciones y URL', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    const overrideRoom = {
      roomId: 'room-maternal-a',
      name: 'Maternal A',
      minAgeMonths: 19,
      maxAgeMonths: 24,
    };

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
        roomOverride={overrideRoom}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });

    // Header must honor roomOverride
    expect(screen.getByText('Asistente Educativa MA')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Maternal A')).toBeTruthy();
  });

  // 7. Circuito completo de evaluación e integridad histórica:
  // V1 -> Observación -> Borrador V2 -> F5 -> Reenvío -> Aprobación
  it('7. Circuito V1 -> Observación -> Borrador V2 -> F5 -> Reenvío -> Aprobación: preserva roomId e integridad histórica', async () => {
    const { repo, service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    // Paso A: Asistente registra y envía evaluación V1
    const initialRender = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    const evalTextarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i);
    await act(async () => {
      fireEvent.change(evalTextarea, {
        target: { value: 'Evaluación pedagógica inicial V1 de Lactantes B.' },
      });
    });

    const submitBtn = screen.getByRole('button', { name: /Enviar evaluación a Educadora/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Check plan in review
    await waitFor(async () => {
      const p = await repo.findById(PLAN_B_ID);
      const day = p?.days.find(d => d.dayOfWeek === 'MONDAY');
      expect(day?.evaluationStatus).toBe('IN_REVIEW');
      expect(day?.evaluation).toBe('Evaluación pedagógica inicial V1 de Lactantes B.');
    });

    // Paso B: Educadora solicita corrección con observación
    await service.requestDailyEvaluationChange(
      PLAN_B_ID,
      'MONDAY',
      'Favor de precisar la interacción de los lactantes con el material sensorial.',
      'DIRECTOR',
      FIRST_LIGHT_DIRECTOR_ID
    );

    // Paso C: Asistente guarda borrador V2
    await service.saveDailyEvaluationDraft(
      PLAN_B_ID,
      'MONDAY',
      'Evaluación V2 corregida con observación sensorial [CONTROL E2E-LB-24AGO-V2].',
      'TEACHER',
      CURRENT_DATE,
      FIRST_LIGHT_TEACHER_ID
    );

    // Paso D: Simular F5 (desmontar y remontar con la misma URL)
    initialRender.unmount();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    const reloadedMondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(reloadedMondayTab);
    });

    // Comprobar que tras F5:
    // 1. Cabecera sigue en Lactantes B
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();

    // 2. El texto del borrador V2 se conservó intacto en el editor
    const reloadedTextarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i);
    expect((reloadedTextarea as HTMLTextAreaElement).value).toContain('CONTROL E2E-LB-24AGO-V2');

    // Paso E: Reenviar evaluación a la Educadora (V2)
    const resubmitBtn = screen.getByRole('button', { name: /Reenviar evaluación a la Educadora/i });
    await act(async () => {
      fireEvent.click(resubmitBtn);
    });

    // Paso F: Educadora aprueba evaluación corregida
    await service.approveDailyEvaluation(
      PLAN_B_ID,
      'MONDAY',
      'DIRECTOR',
      FIRST_LIGHT_DIRECTOR_ID
    );

    // Verificación final en el repositorio:
    const finalizedPlan = await repo.findById(PLAN_B_ID);
    expect(finalizedPlan).toBeTruthy();
    expect(finalizedPlan?.planningId).toBe(PLAN_B_ID);
    expect(finalizedPlan?.roomId).toBe(ROOM_B_ID);

    const finalizedMonday = finalizedPlan?.days.find(d => d.dayOfWeek === 'MONDAY');
    expect(finalizedMonday?.evaluationStatus).toBe('APPROVED');
    expect(finalizedMonday?.evaluation).toBe('Evaluación V2 corregida con observación sensorial [CONTROL E2E-LB-24AGO-V2].');
    expect(finalizedMonday?.evaluationDraft).toBeUndefined();

    // Integridad histórica demostrada: V1 permanece inmutable en el historial
    expect(finalizedMonday?.evaluationHistory).toBeDefined();
    expect(finalizedMonday?.evaluationHistory?.length).toBe(1);
    expect(finalizedMonday?.evaluationHistory?.[0].evaluation).toBe('Evaluación pedagógica inicial V1 de Lactantes B.');
    expect(finalizedMonday?.evaluationHistory?.[0].directorComment).toBe(
      'Favor de precisar la interacción de los lactantes con el material sensorial.'
    );
  });

  // 8. Protección contra condiciones de carrera: respuesta asíncrona obsoleta no sobrescribe sala
  it('8. Protección contra condiciones de carrera: respuesta asíncrona obsoleta no sobrescribe la sala activa', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    // Wait for Plan B to be displayed
    await screen.findByRole('tab', { name: /Lunes 24/i });
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();

    let resolvePlanA: ((val: any) => void) | null = null;
    const planAPromise = new Promise((resolve) => {
      resolvePlanA = resolve;
    });

    const originalGetPlanning = service.getPlanning.bind(service);
    vi.spyOn(service, 'getPlanning').mockImplementation(async (id: string) => {
      if (id === PLAN_A_ID) {
        await planAPromise;
        return originalGetPlanning(id);
      }
      return originalGetPlanning(id);
    });

    // Select Plan A, then immediately select Plan B
    await act(async () => {
      window.history.pushState({}, '', `/?planId=${PLAN_A_ID}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await act(async () => {
      window.history.pushState({}, '', `/?planId=${PLAN_B_ID}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Wait for Plan B to resolve
    await waitFor(() => {
      expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    });

    // Now let obsolete Plan A resolve
    await act(async () => {
      if (resolvePlanA) resolvePlanA(undefined);
    });

    // Verify it is STILL in Lactantes B (not overwritten by stale Plan A response)
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    expect(screen.queryByText('Asistente Educativa LA')).toBeNull();
  });

  // 9. Manejo de error en handleSelectPlan (documento inexistente al hacer clic)
  it('9. handleSelectPlan con ID inexistente: activa fail-closed con BOOTSTRAP_ERROR y no muestra sala engañosa', async () => {
    const { repo, service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', '/');

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // Initial state: starts in LIST view showing Lactantes A plans
    await screen.findByTestId('list-new-planning-btn');

    // Simulate plan is deleted right before clicking its card
    vi.spyOn(service, 'getPlanning').mockResolvedValueOnce(null as any);

    // Click the planning card in list (PLAN_A_ID is in default room LA)
    const card = await screen.findByTestId(`planning-card-${PLAN_A_ID}`);
    await act(async () => {
      fireEvent.click(card);
    });

    // Must show explicit error screen, not an empty wizard with wrong room
    await waitFor(() => {
      expect(screen.getByTestId('lab-bootstrap-error')).toBeTruthy();
      expect(screen.getByText(new RegExp(`La planeación solicitada \\(${PLAN_A_ID}\\) no fue encontrada`, 'i'))).toBeTruthy();
    });
  });

  // 10. Manejo de excepción en handleSelectPlan (fallo de red/servicio al hacer clic)
  it('10. handleSelectPlan con fallo de lectura: activa fail-closed con mensaje explícito y botón reintentar', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', '/');

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // Starts in LIST view
    await screen.findByTestId('list-new-planning-btn');

    // Mock network/service failure on getPlanning
    vi.spyOn(service, 'getPlanning').mockRejectedValueOnce(new Error('Firestore network timeout'));

    const card = await screen.findByTestId(`planning-card-${PLAN_A_ID}`);
    await act(async () => {
      fireEvent.click(card);
    });

    // Must show explicit error screen with retry option
    await waitFor(() => {
      expect(screen.getByTestId('lab-bootstrap-error')).toBeTruthy();
      expect(screen.getByText(/No pudimos recuperar tu planeación. Intenta nuevamente./i)).toBeTruthy();
      expect(screen.getByTestId('lab-bootstrap-retry-btn')).toBeTruthy();
    });
  });
});
