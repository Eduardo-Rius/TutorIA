import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { PlanningDay } from '../../../domain/planning/WeeklyPlanning';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_ROOM_ID,
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

function createMockAuth(uid: string = FIRST_LIGHT_TEACHER_ID) {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid),
    getCurrentUserEmail: vi.fn().mockReturnValue('anita@lab.tutoria.invalid'),
  };
}

function makePlanning(params: {
  planningId: string;
  roomId?: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'APPROVED_FOR_EXECUTION' | 'CLOSED';
  weekStart?: string;
  weekEnd?: string;
  observations?: string;
  daysCount?: number;
  createdAt?: Date | null;
}): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    params.planningId,
    FIRST_LIGHT_DAYCARE_ID,
    params.roomId || FIRST_LIGHT_ROOM_ID,
    FIRST_LIGHT_TEACHER_ID,
    params.weekStart || '2026-08-24',
    params.weekEnd || '2026-08-28'
  );
  plan.status = params.status;
  plan.observations = params.observations ?? '';
  plan.identifiedNeeds = params.observations ? 'Necesidades pedagógicas identificadas' : '';
  (plan as any).createdAt = params.createdAt ?? undefined;

  const count = params.daysCount ?? 0;
  const days: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: idx < count ? [
      {
        activityId: `act-${params.planningId}-${d.toLowerCase()}`,
        category: 'Exploración sensorial',
        objective: `Objetivo para ${d}`,
        description: `Descripción para ${d}`,
        materials: ['Material sensorial'],
        durationMinutes: 20,
        curricularTraceability: [],
      }
    ] : [],
    complementaryActivities: [],
    prioritizedPractices: [],
    materials: ['Material'],
  }));
  plan.days = days;
  return plan;
}

describe('ORDEN SR-MD-14-D — IDENTIFICACIÓN VISUAL DE PLANEACIONES LAB', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  // =========================================================================
  // VALIDACIÓN A — Cambiar de Lactantes A a Lactantes B actualiza el listado
  // =========================================================================
  it('A. Cambiar de Lactantes A a Lactantes B actualiza correctamente el listado', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    // Plan en Lactantes A (FIRST_LIGHT_ROOM_ID)
    const planA = makePlanning({
      planningId: 'plan-lact-a-1',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Observaciones de Lactantes A',
      daysCount: 3,
    });
    // Plan en Lactantes B
    const planB = makePlanning({
      planningId: 'plan-lact-b-1',
      roomId: 'room-lactantes-b',
      status: 'DRAFT',
      observations: 'Observaciones de Lactantes B',
      daysCount: 4,
    });

    await repo.save(planA);
    await repo.save(planB);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    // Inicialmente activa es Lactantes A
    await waitFor(() => {
      expect(screen.getByTestId('planning-card-plan-lact-a-1')).toBeTruthy();
      expect(screen.queryByTestId('planning-card-plan-lact-b-1')).toBeNull();
    });

    // Conmutar a pestaña de Lactantes B
    const tabB = screen.getByTestId('room-tab-room-lactantes-b');
    expect(tabB).toBeTruthy();
    await act(async () => {
      fireEvent.click(tabB);
    });

    // Ahora sólo debe verse la tarjeta de Lactantes B
    await waitFor(() => {
      expect(screen.queryByTestId('planning-card-plan-lact-a-1')).toBeNull();
      expect(screen.getByTestId('planning-card-plan-lact-b-1')).toBeTruthy();
    });
  });

  // =========================================================================
  // VALIDACIÓN B — No aparecen planeaciones de salas no autorizadas
  // =========================================================================
  it('B. No aparecen planeaciones de salas no autorizadas', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    const planAuthorized = makePlanning({
      planningId: 'plan-auth-1',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'En sala autorizada',
      daysCount: 2,
    });
    const planUnauthorized = makePlanning({
      planningId: 'plan-unauth-forbidden',
      roomId: 'room-maternal-b2', // Sala no autorizada para Anita
      status: 'DRAFT',
      observations: 'En sala no autorizada',
      daysCount: 2,
    });

    await repo.save(planAuthorized);
    await repo.save(planUnauthorized);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('planning-card-plan-auth-1')).toBeTruthy();
      expect(screen.queryByTestId('planning-card-plan-unauth-forbidden')).toBeNull();
    });
  });

  // =========================================================================
  // VALIDACIÓN C — Cada tarjeta conserva su planningId original y su navegación
  // =========================================================================
  it('C. Cada tarjeta conserva su planningId original y navega correctamente', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    const planAlpha = makePlanning({
      planningId: 'alpha-uuid-1111-2222',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Observaciones de plan Alpha',
      daysCount: 3,
    });
    const planBeta = makePlanning({
      planningId: 'beta-uuid-3333-4444',
      roomId: 'room-lactantes-a',
      status: 'IN_REVIEW',
      observations: 'Observaciones de plan Beta',
      daysCount: 5,
    });

    await repo.save(planAlpha);
    await repo.save(planBeta);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    await waitFor(() => {
      const cardAlpha = screen.getByTestId('planning-card-alpha-uuid-1111-2222');
      expect(cardAlpha).toBeTruthy();
      expect(cardAlpha.textContent).toContain('ID: alpha-uu...');

      const cardBeta = screen.getByTestId('planning-card-beta-uuid-3333-4444');
      expect(cardBeta).toBeTruthy();
      expect(cardBeta.textContent).toContain('ID: beta-uui...');
    });

    // Al hacer clic en planBeta, navega y actualiza la URL con su planningId original
    const cardBeta = screen.getByTestId('planning-card-beta-uuid-3333-4444');
    await act(async () => {
      fireEvent.click(cardBeta);
    });

    await waitFor(() => {
      expect(window.location.search).toContain('planId=beta-uuid-3333-4444');
    });
  });

  // =========================================================================
  // VALIDACIÓN D — Las planeaciones CLOSED siguen consultables y no editables
  // =========================================================================
  it('D. Las planeaciones CLOSED siguen consultables y no editables', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    const closedPlan = makePlanning({
      planningId: 'plan-closed-historical',
      roomId: 'room-lactantes-a',
      status: 'CLOSED',
      observations: 'Observación del expediente cerrado',
      daysCount: 5,
    });
    closedPlan.version = 5;

    await repo.save(closedPlan);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    // En la lista docente, se visualiza en la sección de expedientes concluidos
    await waitFor(() => {
      const card = screen.getByTestId('planning-card-plan-closed-historical');
      expect(card).toBeTruthy();
      expect(card.textContent).toContain('CONCLUIDA');
      expect(card.textContent).toContain('Semana concluida y archivada');
    });

    // Abrir la planeación cerrada
    const card = screen.getByTestId('planning-card-plan-closed-historical');
    await act(async () => {
      fireEvent.click(card);
    });

    // Verificar que está en modo de solo lectura (readOnly)
    await waitFor(() => {
      const obsTextarea = screen.getByDisplayValue('Observación del expediente cerrado') as HTMLTextAreaElement;
      expect(obsTextarea.disabled).toBe(true);
    });
  });

  // =========================================================================
  // VALIDACIÓN E — Los borradores con contenido permanecen accesibles en elaboración
  // =========================================================================
  it('E. Los borradores con contenido permanecen en la sección de elaboración y accesibles', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    const draftWithContent = makePlanning({
      planningId: 'draft-con-actividades',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Observaciones iniciales del grupo',
      daysCount: 2,
    });

    const draftSecond = makePlanning({
      planningId: 'draft-segundo',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Otro borrador',
      daysCount: 1,
    });

    await repo.save(draftWithContent);
    await repo.save(draftSecond);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    await waitFor(() => {
      const section = screen.getByTestId('section-drafts-with-content');
      expect(section).toBeTruthy();
      expect(section.textContent).toContain('Planeaciones en elaboración');

      const card = screen.getByTestId('planning-card-draft-con-actividades');
      expect(card).toBeTruthy();
      expect(card.textContent).toContain('2 de 5 días con actividades');
      expect(card.textContent).toContain('Continuar donde nos quedamos');
    });
  });

  // =========================================================================
  // VALIDACIÓN F — Los borradores vacíos permanecen recuperables en la sección secundaria
  // =========================================================================
  it('F. Los borradores vacíos se agrupan en sección secundaria colapsable y son recuperables', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    // Borrador con contenido
    const draftReal = makePlanning({
      planningId: 'draft-legitimo',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Grupo con avances motrices',
      daysCount: 1,
    });

    // Borrador vacío histórico (sonda E2E: 0 actividades, sin observaciones)
    const draftEmpty = makePlanning({
      planningId: 'draft-vacio-historico',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: '',
      daysCount: 0,
    });

    await repo.save(draftReal);
    await repo.save(draftEmpty);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    // El borrador legítimo está en la sección principal
    await waitFor(() => {
      const draftSection = screen.getByTestId('section-drafts-with-content');
      const realCard = screen.getByTestId('planning-card-draft-legitimo');
      expect(draftSection.contains(realCard)).toBe(true);
      expect(draftSection.textContent).not.toContain('draft-va');
    });

    // El borrador vacío está en el acordeón secundario
    const accordion = screen.getByTestId('empty-drafts-accordion');
    expect(accordion).toBeTruthy();
    expect(accordion.textContent).toContain('Borradores iniciales sin actividades (1)');

    const emptyCard = screen.getByTestId('planning-card-draft-vacio-historico');
    expect(emptyCard).toBeTruthy();
    expect(emptyCard.textContent).toContain('0 de 5 días con actividades');

    // Al hacer clic en el borrador vacío histórico, se puede abrir y recuperar
    await act(async () => {
      fireEvent.click(emptyCard);
    });

    await waitFor(() => {
      expect(window.location.search).toContain('planId=draft-vacio-historico');
    });
  });

  // =========================================================================
  // VALIDACIÓN G — Cero documentos nuevos creados al navegar o abrir el listado
  // =========================================================================
  it('G. No se crean documentos nuevos al abrir o navegar por el listado', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const saveSpy = vi.spyOn(repo, 'save');

    const planExisting1 = makePlanning({
      planningId: 'plan-existente-listado-1',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Observación existente 1',
      daysCount: 3,
    });
    const planExisting2 = makePlanning({
      planningId: 'plan-existente-listado-2',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Observación existente 2',
      daysCount: 2,
    });

    await repo.save(planExisting1);
    await repo.save(planExisting2);
    saveSpy.mockClear();

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('planning-card-plan-existente-listado-1')).toBeTruthy();
      expect(screen.getByTestId('planning-card-plan-existente-listado-2')).toBeTruthy();
    });

    // Verificar que NINGUNA creación ocurrió
    expect(saveSpy).toHaveBeenCalledTimes(0);
    const allPlans = await repo.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(allPlans.length).toBe(2);
  });

  // =========================================================================
  // VALIDACIÓN H — Fechas y datos institucionales reales sin ficción
  // =========================================================================
  it('H. Muestra "Fecha de creación no disponible" si createdAt no existe y no inventa nombres', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    const planSinCreatedAt = makePlanning({
      planningId: 'plan-sin-fecha',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Sin fecha de creación',
      daysCount: 1,
      createdAt: null,
    });
    const planConCreatedAt = makePlanning({
      planningId: 'plan-con-fecha',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      observations: 'Con fecha de creación',
      daysCount: 2,
      createdAt: new Date('2026-08-20T10:00:00Z'),
    });

    await repo.save(planSinCreatedAt);
    await repo.save(planConCreatedAt);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    await waitFor(() => {
      const card = screen.getByTestId('planning-card-plan-sin-fecha');
      expect(card).toBeTruthy();
      // Requisito 7: Si createdAt no existe, mostrar "Fecha de creación no disponible"
      expect(card.textContent).toContain('Fecha de creación no disponible');
      // Requisito 8: No nombres ficticios de personas, rol institucional
      expect(card.textContent).toContain('Responsable: Educadora Titular — Sala Lactantes A');
      // Requisito 3: Guardería, Sala, Semana, Estado
      expect(card.textContent).toContain('Sala: Lactantes A');
      expect(card.textContent).toContain('Guardería No. 1 (LAB)');
      expect(card.textContent).toContain('Semana: 24/08/2026 – 28/08/2026');
      expect(card.textContent).toContain('EN ELABORACIÓN');
      expect(card.textContent).toContain('1 de 5 días con actividades');
      expect(card.textContent).toContain('Continuar donde nos quedamos →');
    });
  });

  // =========================================================================
  // VALIDACIÓN I — Orden cronológico usando fechas de semana (más reciente primero)
  // =========================================================================
  it('I. Ordena cronológicamente las tarjetas por semana disponible (más reciente primero)', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();

    const planSemana1 = makePlanning({
      planningId: 'plan-semana-antigua',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      weekStart: '2026-08-10',
      weekEnd: '2026-08-14',
      observations: 'Semana antigua',
      daysCount: 2,
    });

    const planSemana2 = makePlanning({
      planningId: 'plan-semana-reciente',
      roomId: 'room-lactantes-a',
      status: 'DRAFT',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      observations: 'Semana reciente',
      daysCount: 3,
    });

    // Guardar primero la antigua en repo
    await repo.save(planSemana1);
    await repo.save(planSemana2);

    const service = new PlanningWorkflowService(repo);
    const mockAuth = createMockAuth();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={new DeterministicPedagogicalRecommendationSource()}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth as any}
        />
      );
    });

    await waitFor(() => {
      const cards = screen.getAllByTestId(/^planning-card-/);
      expect(cards.length).toBe(2);
      // La semana más reciente (24-28 agosto) debe ser la primera
      expect(cards[0].getAttribute('data-testid')).toBe('planning-card-plan-semana-reciente');
      // La semana anterior (10-14 agosto) debe ser la segunda
      expect(cards[1].getAttribute('data-testid')).toBe('planning-card-plan-semana-antigua');
    });
  });
});
