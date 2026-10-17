import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_SUPERVISOR_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
} from '../firstLightLabHarness';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';

describe('SR-MD-21B — Historial de la Directora (Dual Section, Sin Invalid Date, Persistencia)', () => {
  const TEST_PLAN_ID = 'test-plan-lactantes-b-sr-md-21b';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', `/?planId=${TEST_PLAN_ID}`);
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

  const createMockAuth = (uid: string): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue({ uid, email: `${uid}@lab.tutoria.invalid` }),
  });

  const seedPlanWithPlanningAndEvaluationHistory = async (repo: InMemoryWeeklyPlanningRepository) => {
    const plan = WeeklyPlanning.create(
      TEST_PLAN_ID,
      FIRST_LIGHT_DAYCARE_ID,
      'room-lactantes-b',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-10',
      '2026-08-14'
    );

    const source = new DeterministicPedagogicalRecommendationSource();
    const days = await source.generateRecommendation(null as any, 'Obs', 'Needs', 'Sit', 'Mat');
    plan.days = days;
    plan.observations = 'OBSERVACIÓN DE CONTROL — SR-MD-21 / LACTANTES B';
    plan.identifiedNeeds = 'CONTROL SR-MD-21-LB-01';

    // 1. Modificaciones de la planeación pedagógica
    plan.historicalRounds = [
      {
        roundId: 'round-1',
        observations: [
          {
            observationId: 'obs-planning-1',
            activityId: 'mon-ea',
            originalContent: 'Lectura con sonajas de tela en tapete.',
            currentContent: 'Lectura con sonajas de tela y cascabeles adaptados por la Asistente.',
            observation: 'Agregar cascabeles grandes con costura reforzada para estimulación auditiva.',
            authorRole: 'DIRECTOR',
            authorName: 'Ceci',
            createdAt: { seconds: 1792020009, nanoseconds: 0 },
            status: 'RESOLVED',
            resolvedAt: { seconds: 1792020640, nanoseconds: 0 },
            resolvedBy: 'Ceci',
          },
        ],
        createdAt: { seconds: 1792020720, nanoseconds: 0 },
      },
    ];

    // 2. Modificaciones de las evaluaciones diarias
    // Lunes: Tuvo observación de cambio y fue posteriormente corregida
    plan.days[0].evaluation = 'Lunes 10 de agosto 2026: Los lactantes respondieron activamente a la lectura con sonajas.';
    plan.days[0].evaluationStatus = 'APPROVED';
    plan.days[0].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
    plan.days[0].evaluationSubmittedAt = { seconds: 1792024000, nanoseconds: 0 };
    plan.days[0].evaluationReviewedBy = FIRST_LIGHT_DIRECTOR_ID;
    plan.days[0].evaluationReviewedAt = { seconds: 1792024500, nanoseconds: 0 };
    plan.days[0].evaluationHistory = [
      {
        evaluation: 'Los lactantes respondieron a la lectura.',
        status: 'CHANGES_REQUESTED',
        directorComment: 'Favor de especificar la fecha completa (mes y año) al inicio de la redacción.',
        reviewedBy: 'lab-director-ceci',
        reviewedAt: { seconds: 1792023863, nanoseconds: 0 },
        submittedBy: 'lab-teacher-anita',
        submittedAt: { seconds: 1792023401, nanoseconds: 0 },
      },
    ];

    // Martes a Viernes: Aprobadas sin modificaciones históricas
    for (let i = 1; i < plan.days.length; i++) {
      plan.days[i].evaluation = `Evaluación aprobada institucional para día ${plan.days[i].dayOfWeek}`;
      plan.days[i].evaluationStatus = 'APPROVED';
      plan.days[i].evaluationSubmittedBy = FIRST_LIGHT_TEACHER_ID;
      plan.days[i].evaluationSubmittedAt = { seconds: 1792025000 + i * 1000, nanoseconds: 0 };
      plan.days[i].evaluationReviewedBy = FIRST_LIGHT_DIRECTOR_ID;
      plan.days[i].evaluationReviewedAt = { seconds: 1792025500 + i * 1000, nanoseconds: 0 };
      plan.days[i].evaluationHistory = undefined;
    }

    plan.status = 'CLOSED';
    plan.closedBy = FIRST_LIGHT_SUPERVISOR_ID;
    plan.closedAt = { seconds: 1792026000, nanoseconds: 0 };

    await repo.save(plan);
    return plan;
  };

  it('1. Al presionar «VER HISTORIAL DE CAMBIOS», la Directora visualiza ambas secciones diferenciadas', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    await seedPlanWithPlanningAndEvaluationHistory(repo);
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    // Esperar a que la vista de Supervisor esté lista
    await waitFor(() => {
      expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy();
    });

    // Cambiar a la pestaña de historial
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));

    // 1. Contenedor y encabezado institucional
    await waitFor(() => {
      expect(screen.getByTestId('supervisor-history-container')).toBeTruthy();
      expect(screen.getByText('HISTORIAL DE REVISIONES')).toBeTruthy();
    });

    // 2. Sección 1: Modificaciones de la Planeación Pedagógica
    const planningSection = screen.getByTestId('supervisor-planning-history-section');
    expect(planningSection).toBeTruthy();
    expect(screen.getByText(/Modificaciones de la Planeación Pedagógica/i)).toBeTruthy();

    // 3. Sección 2: Modificaciones de las Evaluaciones Diarias
    const evalSection = screen.getByTestId('supervisor-evaluation-history-section');
    expect(evalSection).toBeTruthy();
    expect(screen.getByText(/Modificaciones de las Evaluaciones Diarias/i)).toBeTruthy();
  });

  it('2. Las modificaciones de planeación muestran versión anterior, posterior, autor y resolución sin "Invalid Date"', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    await seedPlanWithPlanningAndEvaluationHistory(repo);
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));

    await waitFor(() => expect(screen.getByTestId('supervisor-history-container')).toBeTruthy());

    // Comprobación de contenido anterior y posterior de planeación
    expect(screen.getByText('Lectura con sonajas de tela en tapete.')).toBeTruthy();
    expect(screen.getByText('Lectura con sonajas de tela y cascabeles adaptados por la Asistente.')).toBeTruthy();
    expect(screen.getByText('Agregar cascabeles grandes con costura reforzada para estimulación auditiva.')).toBeTruthy();

    // Badge de estado y actor
    expect(screen.getByText('✅ ATENDIDA')).toBeTruthy();
    expect(screen.getByText(/Atendida por: Educadora/i)).toBeTruthy();

    // Sin presencia de Invalid Date
    expect(screen.queryByText(/Invalid Date/i)).toBeNull();
  });

  it('3. Las modificaciones de evaluación muestran versión devuelta, versión actual, instrucción y fechas válidas', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    await seedPlanWithPlanningAndEvaluationHistory(repo);
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));

    await waitFor(() => expect(screen.getByTestId('supervisor-evaluation-history-section')).toBeTruthy());

    // 1. Día de evaluación y badge de modificaciones
    expect(screen.getByTestId('eval-history-day-MONDAY')).toBeTruthy();
    expect(screen.getByText('1 modificación registrada')).toBeTruthy();
    expect(screen.getByText('🟠 Cambio solicitado')).toBeTruthy();

    // 2. Instrucción del directivo
    expect(screen.getByText(/Favor de especificar la fecha completa/i)).toBeTruthy();

    // 3. Versión Anterior (Devuelta)
    expect(screen.getByText('Versión Anterior (Devuelta)')).toBeTruthy();
    expect(screen.getByText('Los lactantes respondieron a la lectura.')).toBeTruthy();

    // 4. Versión Posterior (Corregida / Actual)
    expect(screen.getByText('Versión Posterior (Corregida / Actual)')).toBeTruthy();
    expect(screen.getByText('Lunes 10 de agosto 2026: Los lactantes respondieron activamente a la lectura con sonajas.')).toBeTruthy();

    // 5. Nomenclatura institucional de actores
    expect(screen.getByText(/Enviada originalmente por:/i)).toBeTruthy();
    expect(screen.getAllByText(/Asistente Educativa/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/✓ Aprobada por:/i)).toBeTruthy();
    expect(screen.getAllByText(/Educadora/i).length).toBeGreaterThan(0);

    // 6. Cero Invalid Date en la sección
    expect(screen.queryByText(/Invalid Date/i)).toBeNull();
  });

  it('4. Días sin modificaciones de evaluación no se listan en el historial y no muestran brechas falsas', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    await seedPlanWithPlanningAndEvaluationHistory(repo);
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));

    await waitFor(() => expect(screen.getByTestId('supervisor-evaluation-history-section')).toBeTruthy());

    // Lunes existe porque tiene historial
    expect(screen.queryByTestId('eval-history-day-MONDAY')).toBeTruthy();

    // Martes a Viernes NO tienen historial de ajustes y no deben mostrar cajas vacías de modificación
    expect(screen.queryByTestId('eval-history-day-TUESDAY')).toBeNull();
    expect(screen.queryByTestId('eval-history-day-WEDNESDAY')).toBeNull();
    expect(screen.queryByTestId('eval-history-day-THURSDAY')).toBeNull();
    expect(screen.queryByTestId('eval-history-day-FRIDAY')).toBeNull();
  });

  it('5. Funciona en Prestación Directa e Indirecta identificando la modalidad correctamente', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    await seedPlanWithPlanningAndEvaluationHistory(repo);
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    // Test con Prestación Indirecta
    const { unmount } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    await waitFor(() => expect(screen.getByRole('combobox')).toBeTruthy());
    const modalitySelect = screen.getByRole('combobox');
    fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });

    await waitFor(() => {
      expect(screen.getByText('Prestación Indirecta')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));
    await waitFor(() => {
      expect(screen.getByTestId('supervisor-history-container')).toBeTruthy();
      expect(screen.getByText('Prestación Indirecta')).toBeTruthy();
    });

    unmount();

    // Test con Prestación Directa
    render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Prestación Directa')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));
    await waitFor(() => {
      expect(screen.getByTestId('supervisor-history-container')).toBeTruthy();
      expect(screen.getByText('Prestación Directa')).toBeTruthy();
    });
  });

  it('6. Persistencia tras recargar la página: la información histórica se recarga sin pérdida', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    await seedPlanWithPlanningAndEvaluationHistory(repo);
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    // Sesión 1
    const { unmount } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));
    await waitFor(() => expect(screen.getByTestId('supervisor-history-container')).toBeTruthy());

    expect(screen.getByText('Lectura con sonajas de tela en tapete.')).toBeTruthy();
    expect(screen.getByText('Favor de especificar la fecha completa (mes y año) al inicio de la redacción.')).toBeTruthy();

    // Simular recarga de página / desmontar y montar de nuevo
    unmount();

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={mockAuth}
      />
    );

    // Sesión 2: Reingreso como Directora
    await waitFor(() => expect(screen.getByText('VER HISTORIAL DE CAMBIOS')).toBeTruthy());
    fireEvent.click(screen.getByText('VER HISTORIAL DE CAMBIOS'));
    await waitFor(() => expect(screen.getByTestId('supervisor-history-container')).toBeTruthy());

    expect(screen.getByText('Lectura con sonajas de tela en tapete.')).toBeTruthy();
    expect(screen.getByText('Favor de especificar la fecha completa (mes y año) al inicio de la redacción.')).toBeTruthy();
    expect(screen.queryByText(/Invalid Date/i)).toBeNull();
  });
});
