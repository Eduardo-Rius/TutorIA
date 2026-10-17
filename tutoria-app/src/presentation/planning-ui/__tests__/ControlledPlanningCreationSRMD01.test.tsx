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

function createMockProposalSource(): WeeklyPlanningProposalSource {
  return {
    propose: vi.fn().mockImplementation(async (req: WeeklyPlanningProposalRequest): Promise<WeeklyPlanningProposalResponse> => {
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
        dayOfWeek: d as PlanningDay['dayOfWeek'],
        date: `2026-08-${24 + idx}`,
        activities: [
          {
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: `Objetivo para ${d}`,
            description: `Descripción detallada de la propuesta pedagógica para ${d}`,
            durationMinutes: 25,
            materials: ['Bloques de madera', 'Texturas suaves'],
          },
        ],
      }));
      return {
        proposalId: `prop-${Date.now()}`,
        planningId: req.planningId,
        days,
        pedagogicalRationale: 'Propuesta enfocada en desarrollo sensorial y motor',
        validationPassed: true,
      };
    }),
  };
}

describe('ORDEN SR-MD-01 — Creación Controlada de Planeaciones', () => {
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

  it('TEST A: Abrir Nueva planeación produce CERO llamadas a createPlanning', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repository.save(closedPlan);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource = createMockProposalSource();
    const mockAuth = createMockAuth();

    const createPlanningSpy = vi.spyOn(service, 'createPlanning');

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

    // Wait for the fresh planning wizard to render
    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
      expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeTruthy();
    });

    // CERO llamadas a createPlanning
    expect(createPlanningSpy).toHaveBeenCalledTimes(0);

    // Repositorio contiene únicamente la planeación histórica cerrada canónica (cero documentos nuevos)
    const all = await repository.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(all.length).toBe(1);
    expect(all[0].planningId).toBe(FIRST_LIGHT_PLANNING_ID);
  });

  it('TEST B: Montar y desmontar TeacherWizard produce CERO documentos nuevos', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repository.save(closedPlan);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource = createMockProposalSource();
    const mockAuth = createMockAuth();

    const createPlanningSpy = vi.spyOn(service, 'createPlanning');

    let unmountFn: () => void = () => {};
    await act(async () => {
      const { unmount } = render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          weeklyPlanningProposalSource={proposalSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
          initialAction="new"
        />
      );
      unmountFn = unmount;
    });

    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // Desmontar el wizard
    await act(async () => {
      unmountFn();
    });

    // CERO llamadas a createPlanning y CERO documentos nuevos
    expect(createPlanningSpy).toHaveBeenCalledTimes(0);
    const all = await repository.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(all.length).toBe(1);
    expect(all[0].planningId).toBe(FIRST_LIGHT_PLANNING_ID);
  });

  it('TEST C: Aceptar una propuesta válida ejecuta EXACTAMENTE UNA creación persistente', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repository.save(closedPlan);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource = createMockProposalSource();
    const mockAuth = createMockAuth();

    const createPlanningSpy = vi.spyOn(service, 'createPlanning');

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

    expect(createPlanningSpy).toHaveBeenCalledTimes(0);

    // Enter observation context to enable the generate button
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Grupo muestra interés en estimulación sensorial y texturas' } });
    });

    // Click "✨ Ayúdame con TutorIA (Generar Semana)"
    const genBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(genBtn);
    });

    // Modal proposal should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Usar esta propuesta' })).toBeTruthy();
    });

    // Generar propuesta fue transient en memoria: cero creaciones aún
    expect(createPlanningSpy).toHaveBeenCalledTimes(0);
    expect((await repository.listByTeacher(FIRST_LIGHT_TEACHER_ID)).length).toBe(1);

    // Anita acepta la propuesta haciendo clic en "Usar esta propuesta"
    const acceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    // Modal se cierra y borrador queda incorporado
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // EXACTAMENTE UNA creación persistente
    expect(createPlanningSpy).toHaveBeenCalledTimes(1);

    const all = await repository.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(all.length).toBe(2);

    const newPlan = all.find(p => p.planningId !== FIRST_LIGHT_PLANNING_ID)!;
    expect(newPlan).toBeTruthy();
    expect(newPlan.status).toBe('DRAFT');
    expect(newPlan.days.length).toBe(5);
    expect(newPlan.days[0].activities.length).toBeGreaterThan(0);
  });

  it('TEST D: Guardar modificaciones posteriores reutiliza el planningId existente', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repository.save(closedPlan);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource = createMockProposalSource();
    const mockAuth = createMockAuth();

    const createPlanningSpy = vi.spyOn(service, 'createPlanning');

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

    // Enter observation context to enable generate button
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Grupo muestra interés en estimulación sensorial y texturas' } });
    });

    // Generar y aceptar propuesta
    const genBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(genBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    const acceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(createPlanningSpy).toHaveBeenCalledTimes(1);
    const docsAfterAccept = await repository.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(docsAfterAccept.length).toBe(2);
    const newlyCreatedPlan = docsAfterAccept.find(p => p.planningId !== FIRST_LIGHT_PLANNING_ID)!;
    const establishedPlanningId = newlyCreatedPlan.planningId;

    // Editar contexto semanal
    const editContextBtn = screen.getByText(/Editar contexto semanal/i);
    await act(async () => {
      fireEvent.click(editContextBtn);
    });

    const needsInput = screen.getByPlaceholderText(/Control postural, atención conjunta/i);
    await act(async () => {
      fireEvent.change(needsInput, { target: { value: 'Fortalecer agarre fino' } });
    });

    // Guardar contexto modificado
    const saveContextBtn = screen.getByText(/Guardar contexto semanal/i);
    await act(async () => {
      fireEvent.click(saveContextBtn);
    });

    // Sigue siendo EXACTAMENTE 1 llamada a createPlanning: NO se crea un nuevo documento
    expect(createPlanningSpy).toHaveBeenCalledTimes(1);

    const docsAfterSave = await repository.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(docsAfterSave.length).toBe(2);
    const updatedPlan = docsAfterSave.find(p => p.planningId === establishedPlanningId)!;
    expect(updatedPlan).toBeTruthy();
    expect(updatedPlan.identifiedNeeds).toBe('Fortalecer agarre fino');
  });

  it('TEST E: Recargar una planeación persistida conserva planningId y contenido', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const closedPlan = createCanonicalClosedPlanning();
    await repository.save(closedPlan);

    // Creamos una segunda planeación persistida en DRAFT
    const existingDraftPlan = WeeklyPlanning.create(
      'persisted-active-draft-999',
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_ROOM_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    existingDraftPlan.observations = 'Observación pedagógica persistida de Anita';
    existingDraftPlan.identifiedNeeds = 'Exploración de texturas';
    existingDraftPlan.status = 'DRAFT';
    existingDraftPlan.days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
      date: `2026-08-${24 + idx}`,
      dayOfWeek: d as PlanningDay['dayOfWeek'],
      activities: [
        {
          activityId: `persisted-act-${d.toLowerCase()}-1`,
          category: 'Juego sensorial',
          objective: `Objetivo para ${d}`,
          description: `Actividad para ${d}`,
          materials: ['Bloques suaves'],
          durationMinutes: 20,
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['Bloques suaves'],
    }));
    await repository.save(existingDraftPlan);

    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource = createMockProposalSource();
    const mockAuth = createMockAuth();

    const createPlanningSpy = vi.spyOn(service, 'createPlanning');

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={recSource}
          weeklyPlanningProposalSource={proposalSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // SR-MD-03: Anita entra directamente a su planeación activa en borrador (sin fallback a la cerrada)
    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // Ir a la lista de planeaciones
    const backBtn = screen.getByText(/Volver al listado/i);
    await act(async () => {
      fireEvent.click(backBtn);
    });

    // En la lista aparece la tarjeta de la planeación en borrador "Trabajando en la propuesta" y el historial cerrado
    const draftCardBtn = await screen.findByText(/Trabajando en la propuesta/i);
    expect(draftCardBtn).toBeTruthy();
    expect(screen.getByText(/Semana cerrada ✓ \(Registro completado\)/i)).toBeTruthy();

    // Seleccionar nuevamente la planeación en borrador
    await act(async () => {
      fireEvent.click(draftCardBtn);
    });

    // Verificar que recarga el wizard con la planeación seleccionada
    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // Recargar NO invoca createPlanning
    expect(createPlanningSpy).toHaveBeenCalledTimes(0);

    // Observaciones y contenido rehidratados
    const obsTextarea = screen.getByDisplayValue(/Observación pedagógica persistida de Anita/i);
    expect(obsTextarea).toBeTruthy();

    const all = await repository.listByTeacher(FIRST_LIGHT_TEACHER_ID);
    expect(all.length).toBe(2);
    const retrieved = all.find(p => p.planningId === 'persisted-active-draft-999')!;
    expect(retrieved).toBeTruthy();
    expect(retrieved.observations).toBe('Observación pedagógica persistida de Anita');
  });
});
