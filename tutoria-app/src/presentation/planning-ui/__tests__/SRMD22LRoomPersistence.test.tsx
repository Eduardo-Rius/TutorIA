import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import {
  PlanningDemoApp,
  getScopedSelectedRoomKey,
  readPersistedSelectedRoom,
  persistSelectedRoom,
  clearPersistedSelectedRoom,
  getUrlParams,
} from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import { RoomCatalog } from '../../../domain/planning/RoomCatalog';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_SUPERVISOR_ID,
  FIRST_LIGHT_DAYCARE_ID,
} from '../firstLightLabHarness';

describe('SR-MD-22L — Persistencia de Sala Seleccionada (Lactantes A / Lactantes B / Futuras salas)', () => {
  const PLAN_B_ID = 'plan-lb-2026-08-24-001';
  const PLAN_A_ID = 'plan-la-2026-08-24-001';
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

  // 1. Seleccionar LB → refrescar → permanecer en LB
  it('1. Seleccionar LB en listado -> refrescar navegador (F5) -> permanece en Lactantes B', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', '/');

    // 1. Initial mount in LIST view
    const initialRender = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // Initial state defaults to Lactantes A
    await screen.findByTestId('list-new-planning-btn');
    expect(screen.getByText('Asistente Educativa LA')).toBeTruthy();

    // 2. Click tab Lactantes B
    const roomBTab = screen.getByTestId('room-tab-room-lactantes-b');
    await act(async () => {
      fireEvent.click(roomBTab);
    });

    // Verify UI switched to Lactantes B
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    await screen.findByTestId(`planning-card-${PLAN_B_ID}`);
    expect(screen.queryByTestId(`planning-card-${PLAN_A_ID}`)).toBeNull();

    // Verify URL and storage persistence
    expect(getUrlParams().roomId).toBe(ROOM_B_ID);
    const scopedKey = getScopedSelectedRoomKey(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_DAYCARE_ID);
    expect(sessionStorage.getItem(scopedKey)).toBe(ROOM_B_ID);
    expect(localStorage.getItem(scopedKey)).toBe(ROOM_B_ID);

    // 3. Simulate browser refresh (F5): unmount and remount
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

    // 4. MUST remain in Lactantes B
    await screen.findByTestId('list-new-planning-btn');
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    await screen.findByTestId(`planning-card-${PLAN_B_ID}`);
    expect(screen.queryByTestId(`planning-card-${PLAN_A_ID}`)).toBeNull();

    const restoredTab = screen.getByTestId('room-tab-room-lactantes-b');
    expect(restoredTab.className).toContain('bg-brand-primary');
  });

  // 2. Seleccionar LA → refrescar → permanecer en LA
  it('2. Seleccionar LA en listado -> refrescar navegador (F5) -> permanece en Lactantes A', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    // Seed initial state in Lactantes B
    window.history.replaceState({}, '', `/?roomId=${ROOM_B_ID}`);
    const scopedKey = getScopedSelectedRoomKey(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_DAYCARE_ID);
    sessionStorage.setItem(scopedKey, ROOM_B_ID);

    const initialRender = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByTestId('list-new-planning-btn');
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();

    // Select Lactantes A tab
    const roomATab = screen.getByTestId('room-tab-room-lactantes-a');
    await act(async () => {
      fireEvent.click(roomATab);
    });

    expect(screen.getByText('Asistente Educativa LA')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes A')).toBeTruthy();
    await screen.findByTestId(`planning-card-${PLAN_A_ID}`);
    expect(screen.queryByTestId(`planning-card-${PLAN_B_ID}`)).toBeNull();
    expect(getUrlParams().roomId).toBe(ROOM_A_ID);

    // Simulate browser refresh (F5)
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

    await screen.findByTestId('list-new-planning-btn');
    expect(screen.getByText('Asistente Educativa LA')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes A')).toBeTruthy();
    await screen.findByTestId(`planning-card-${PLAN_A_ID}`);
    expect(screen.queryByTestId(`planning-card-${PLAN_B_ID}`)).toBeNull();
  });

  // 3. Abrir una planeación LB → regresar → mantener contexto LB
  it('3. Abrir una planeación LB desde el listado -> regresar -> conserva el contexto LB', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?roomId=${ROOM_B_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByTestId('list-new-planning-btn');
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();

    // Open Lactantes B plan
    const cardLB = await screen.findByTestId(`planning-card-${PLAN_B_ID}`);
    await act(async () => {
      fireEvent.click(cardLB);
    });

    // Wait for plan wizard to load
    await screen.findByRole('tab', { name: /Lunes 24/i });
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();

    // Click back to list
    const backBtn = screen.getByRole('button', { name: /Volver al listado/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });

    // Must be in LIST mode and preserve Lactantes B
    await waitFor(() => {
      expect(screen.getByTestId('list-new-planning-btn')).toBeTruthy();
      expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
      expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    });

    expect(screen.getByTestId(`planning-card-${PLAN_B_ID}`)).toBeTruthy();
    expect(screen.queryByTestId(`planning-card-${PLAN_A_ID}`)).toBeNull();
  });

  // 4. Cambiar de identidad → no heredar sala no autorizada
  it('4. Cambio de identidad: un nuevo usuario no hereda la sala guardada por otro usuario', async () => {
    const { service, pedSource } = await setupTestEnvironment();

    // Caso A: Modo estándar entre dos docentes (t1 y t2)
    // Docente A (t1) seleccionó Lactantes B
    const keyDocenteA = getScopedSelectedRoomKey('t1', 'default');
    localStorage.setItem(keyDocenteA, ROOM_B_ID);
    sessionStorage.setItem(keyDocenteA, ROOM_B_ID);

    // Docente B (t2) autorizada únicamente para Lactantes A
    const roomA = RoomCatalog.getRoom(ROOM_A_ID)!;

    const renderDocenteB = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        teacherId="t2"
        authorizedRooms={[roomA]}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByTestId('list-new-planning-btn');

    // Docente B NO debe heredar la sala de Docente A
    expect(screen.getByText('Asistente Educativa LA')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes A')).toBeTruthy();
    expect(screen.queryByText('Asistente Educativa LB')).toBeNull();

    // La clave de almacenamiento de Docente B no debe contener Lactantes B
    const keyDocenteB = getScopedSelectedRoomKey('t2', 'default');
    expect(sessionStorage.getItem(keyDocenteB)).not.toBe(ROOM_B_ID);

    renderDocenteB.unmount();

    // Caso B: First Light LAB entre Anita y Ceci
    // Anita selecciona Lactantes B en LAB
    const mockAuthAnita = createMockAuth(FIRST_LIGHT_TEACHER_ID);
    const keyAnita = getScopedSelectedRoomKey(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_DAYCARE_ID);
    sessionStorage.setItem(keyAnita, ROOM_B_ID);
    window.history.replaceState({}, '', `/?roomId=${ROOM_B_ID}`);

    // Anita cierra sesión en LAB
    clearPersistedSelectedRoom(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_DAYCARE_ID, true);
    expect(getUrlParams().roomId).toBeNull();
    expect(sessionStorage.getItem(keyAnita)).toBeNull();

    // Ahora Ceci (Educadora) inicia sesión en LAB
    const mockAuthCeci = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);
    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuthCeci}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByText(/Acompañamiento pedagógico/i);
    expect(screen.getAllByText('Educadora').length).toBeGreaterThanOrEqual(1);
    const keyCeci = getScopedSelectedRoomKey(FIRST_LIGHT_DIRECTOR_ID, FIRST_LIGHT_DAYCARE_ID);
    expect(sessionStorage.getItem(keyCeci)).not.toBe(ROOM_B_ID);
  });

  // 5. Sala previamente almacenada pero sin autorización → recuperación segura
  it('5. Sala almacenada pero no autorizada: fail-closed, purga almacenamiento y recupera sala autorizada', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();

    // Simulate stale storage with a room not in user's authorizedRooms
    const staleRoomId = 'room-maternal-c2';
    const scopedKey = getScopedSelectedRoomKey(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_DAYCARE_ID);
    sessionStorage.setItem(scopedKey, staleRoomId);
    localStorage.setItem(scopedKey, staleRoomId);
    window.history.replaceState({}, '', `/?roomId=${staleRoomId}`);

    const roomA = RoomCatalog.getRoom(ROOM_A_ID)!;

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        authorizedRooms={[roomA]}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByTestId('list-new-planning-btn');

    // Must safely fallback to authorized room LA
    expect(screen.getByText('Asistente Educativa LA')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes A')).toBeTruthy();
    expect(screen.queryByText(staleRoomId)).toBeNull();

    // The unauthorized room must be purged from storage and URL
    expect(sessionStorage.getItem(scopedKey)).toBeNull();
    expect(localStorage.getItem(scopedKey)).toBeNull();
    expect(getUrlParams().roomId).toBeNull();
  });

  // 6. Crear nueva planeación → asignación correcta de roomId
  it('6. Crear nueva planeación con Lactantes B activa: asigna canonical roomId de Lactantes B', async () => {
    const { service, pedSource, mockAuth } = await setupTestEnvironment();
    window.history.replaceState({}, '', `/?roomId=${ROOM_B_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByTestId('list-new-planning-btn');
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();

    // Click "Nueva Planeación"
    const newBtn = screen.getByTestId('list-new-planning-btn');
    await act(async () => {
      fireEvent.click(newBtn);
    });

    // Wizard opens for Lactantes B
    await waitFor(() => {
      expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
      expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    });

    // Fill observations to enable generation
    const obsTextarea = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsTextarea, { target: { value: 'Grupo muestra interés en texturas y gateo' } });
    });

    // Generate proposal
    const generateBtn = screen.getByRole('button', { name: /Ayúdame con TutorIA \(Generar Semana\)/i });
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    // Verify day tabs appear in Lactantes B
    await screen.findByRole('tab', { name: /Lunes 24/i });
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    expect(screen.getByText('Asistente Educativa · Lactantes B')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText(/Preparando propuesta semanal…/i)).toBeNull();
    });
  });

  // 7. Mantener intactos los flujos Asistente Educativa → Educadora → Directora
  it('7. Flujos institucionales completos: Asistente Educativa (LB) -> Educadora -> Directora', async () => {
    const { repo, service, pedSource } = await setupTestEnvironment();

    // 1. Asistente Educativa (Anita) creates & submits evaluation in LB
    const mockAuthAnita = createMockAuth(FIRST_LIGHT_TEACHER_ID);
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    const anitaRender = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuthAnita}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });
    expect(screen.getByText('Asistente Educativa LB')).toBeTruthy();
    anitaRender.unmount();

    // 2. Educadora (Ceci) reviews LB plan
    const mockAuthCeci = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    const ceciRender = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuthCeci}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByRole('tab', { name: /Lunes 24/i });
    // Assert Ceci sees Educadora role with LB context
    expect(screen.getAllByText('Educadora').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Lactantes B/i).length).toBeGreaterThanOrEqual(1);
    ceciRender.unmount();

    // Mark plan as CLOSED for Director/Supervisor review
    const plan = await service.getPlanning(PLAN_B_ID);
    plan!.status = 'CLOSED';
    await repo.save(plan!);

    // 3. Directora (Tere) reviews closed LB plan
    const mockAuthTere = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);
    window.history.replaceState({}, '', `/?planId=${PLAN_B_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuthTere}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByText(/Contenido de la Planeación y Evaluaciones/i);
    // Assert Tere sees Directora role with LB context
    expect(screen.getAllByText('Directora').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Lactantes B/i).length).toBeGreaterThanOrEqual(1);
  });
});
