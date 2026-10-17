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
import type {
  WeeklyPlanningProposalSource,
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
} from '../../../application/planning/WeeklyPlanningProposalSource';
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

function createMockAuth(uid: string = FIRST_LIGHT_TEACHER_ID): AuthenticationProvider {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid),
  };
}

function create5DayProposal(): WeeklyPlanningProposalResponse {
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    date: `2026-08-${24 + idx}`,
    activities: [
      {
        category: 'LECTURA EN VOZ ALTA' as const,
        objective: `Objetivo de lectura interactiva para ${d}`,
        description: `Lectura interactiva y compartida para ${d} con libro de texturas y animales.`,
        durationMinutes: 15,
        materials: ['Libro de texturas', 'Cojines'],
      },
    ],
  }));
  return {
    days,
  };
}

function createMockProposalSource(proposalData: WeeklyPlanningProposalResponse = create5DayProposal()): WeeklyPlanningProposalSource {
  return {
    propose: vi.fn().mockResolvedValue(proposalData),
  };
}

describe('SR-MD-18-U — Corrección P0 de Aceptación e Inserción de Propuesta IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  });

  afterEach(() => {
    cleanup();
  });

  it('1, 2, 3, 4, 5: Aceptar propuesta de IA con latencia asíncrona persiste draft, NO desmonta el wizard y mantiene visibles las 5 actividades', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposal = create5DayProposal();
    const proposalSource = createMockProposalSource(proposal);
    const mockAuth = createMockAuth();

    // Simular latencia de red en saveDraft mediante una promesa controlada
    let resolveSaveDraftPromise: () => void = () => {};
    const originalSaveDraft = service.saveDraft.bind(service);
    vi.spyOn(service, 'saveDraft').mockImplementation(async (...args) => {
      await new Promise<void>((resolve) => {
        resolveSaveDraftPromise = resolve;
      });
      return originalSaveDraft(...args);
    });

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

    // Llenar contexto pedagógico
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Grupo de 8 lactantes con interés en estimulación sensorial sonora' } });
    });

    const needsInput = screen.getByPlaceholderText(/Ej: Control postural, atención conjunta/i);
    await act(async () => {
      fireEvent.change(needsInput, { target: { value: 'Fortalecer el sostén cefálico y seguimiento visual' } });
    });

    // Generar propuesta
    const genBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(genBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Usar esta propuesta' })).toBeTruthy();
    });

    // Anita hace clic en "Usar esta propuesta"
    const acceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    // 3. Mientras saveDraft está en vuelo (latencia asíncrona), el botón muestra estado pendiente y el diálogo permanece
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Guardando borrador…/i)).toBeTruthy();

    // Resolver la latencia de red de saveDraft
    await act(async () => {
      resolveSaveDraftPromise();
    });

    // 4. El modal se cierra tras la persistencia exitosa
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // 5. Las 5 actividades y los datos del contexto permanecen VISIBLES en la pantalla
    expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Grupo de 8 lactantes con interés en estimulación sensorial sonora/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Fortalecer el sostén cefálico y seguimiento visual/i)).toBeTruthy();

    // Confirmar que la actividad de LECTURA EN VOZ ALTA con su objetivo son visibles
    expect(screen.getByText(/LECTURA EN VOZ ALTA/i)).toBeTruthy();
    expect(screen.getByText(/Objetivo de lectura interactiva para MONDAY/i)).toBeTruthy();

    // Confirmar que el botón de editar contexto semanal está presente (bloqueado por haber actividades)
    expect(screen.getByText(/Editar contexto semanal/i)).toBeTruthy();

    // Verificar que la URL se actualizó con el planId persistido y eliminó action=new
    const params = new URLSearchParams(window.location.search);
    const persistedPlanId = params.get('planId');
    expect(persistedPlanId).toBeTruthy();
    expect(params.get('action')).toBeNull();

    // Verificar en el repositorio que se persistieron exactamente 5 días con la actividad
    const persisted = await service.getPlanning(persistedPlanId!);
    expect(persisted?.days?.length).toBe(5);
    expect(persisted?.days[0]?.activities?.[0]?.category).toBe('LECTURA EN VOZ ALTA');
  });

  it('6: Recargar y recuperar una planeación por planId preserva observaciones, necesidades y las 5 actividades', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Crear una planeación persistida con 5 actividades
    const savedPlan = WeeklyPlanning.create(
      'plan-rehydrated-test-123',
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_ROOM_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    savedPlan.status = 'DRAFT';
    savedPlan.observations = 'Observación pedagógica recuperada desde Firestore';
    savedPlan.identifiedNeeds = 'Coordinación visomotora y prensión palmar';
    savedPlan.specialSituations = 'Lactante en adaptación';
    savedPlan.availableMaterials = 'Sonajas, tapete suave';
    savedPlan.days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
      date: `2026-08-${24 + idx}`,
      dayOfWeek: d as PlanningDay['dayOfWeek'],
      activities: [
        {
          activityId: `act-${d.toLowerCase()}-saved`,
          category: 'LECTURA EN VOZ ALTA',
          objective: `Lectura compartida para ${d}`,
          description: `Experiencia de lectura en voz alta con rimas y canciones infantiles para ${d}`,
          durationMinutes: 15,
          materials: ['Libro de rimas'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['Libro de rimas'],
    }));
    await repository.save(savedPlan);

    // Navegar directamente vía URL con planId
    window.history.pushState({}, '', '/?planId=plan-rehydrated-test-123');

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
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // Verificar que los datos persistidos se cargaron en la interfaz
    expect(screen.getByDisplayValue(/Observación pedagógica recuperada desde Firestore/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Coordinación visomotora y prensión palmar/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Lactante en adaptación/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Sonajas, tapete suave/i)).toBeTruthy();

    // Las actividades deben estar visibles
    expect(screen.getByText(/LECTURA EN VOZ ALTA/i)).toBeTruthy();
    expect(screen.getByText(/Lectura compartida para MONDAY/i)).toBeTruthy();
  });

  it('7: Cambiar entre dos planeaciones diferentes no mezcla estados', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth();

    // Plan A
    const planA = WeeklyPlanning.create(
      'plan-alpha-001',
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_ROOM_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    planA.status = 'DRAFT';
    planA.observations = 'Observación Única del Plan ALPHA';
    planA.identifiedNeeds = 'Necesidad ALPHA';
    planA.days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
      date: `2026-08-${24 + idx}`,
      dayOfWeek: d as PlanningDay['dayOfWeek'],
      activities: [
        {
          activityId: `act-alpha-${d}`,
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Objetivo ALPHA de Lectura',
          description: 'Descripción ALPHA',
          durationMinutes: 15,
          materials: ['Material ALPHA'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['Material ALPHA'],
    }));
    await repository.save(planA);

    // Plan B
    const planB = WeeklyPlanning.create(
      'plan-beta-002',
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_ROOM_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-31',
      '2026-09-04'
    );
    planB.status = 'DRAFT';
    planB.observations = 'Observación Única del Plan BETA';
    planB.identifiedNeeds = 'Necesidad BETA';
    planB.days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((d, idx) => ({
      date: `2026-08-${31 + idx}`,
      dayOfWeek: d as PlanningDay['dayOfWeek'],
      activities: [
        {
          activityId: `act-beta-${d}`,
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Objetivo BETA de Arte',
          description: 'Descripción BETA',
          durationMinutes: 20,
          materials: ['Material BETA'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['Material BETA'],
    }));
    await repository.save(planB);

    // Entrar a la lista de planeaciones (sin planId en URL)
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

    // En modo multi-plan docente, si hay 2 planeaciones activas, se muestran sus tarjetas
    await waitFor(() => {
      expect(screen.getByTestId('planning-card-plan-alpha-001')).toBeTruthy();
      expect(screen.getByTestId('planning-card-plan-beta-002')).toBeTruthy();
    });

    // Seleccionar Plan A
    const planACard = screen.getByTestId('planning-card-plan-alpha-001');
    await act(async () => {
      fireEvent.click(planACard);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Observación Única del Plan ALPHA/i)).toBeTruthy();
      expect(screen.getByText(/Objetivo ALPHA de Lectura/i)).toBeTruthy();
    });
    expect(screen.queryByDisplayValue(/Observación Única del Plan BETA/i)).toBeNull();

    // Volver a la lista
    const backBtn = screen.getByText(/Volver al listado/i);
    await act(async () => {
      fireEvent.click(backBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('planning-card-plan-beta-002')).toBeTruthy();
    });

    // Seleccionar Plan B
    const planBCard = screen.getByTestId('planning-card-plan-beta-002');
    await act(async () => {
      fireEvent.click(planBCard);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Observación Única del Plan BETA/i)).toBeTruthy();
      expect(screen.getByText(/Objetivo BETA de Arte/i)).toBeTruthy();
    });
    expect(screen.queryByDisplayValue(/Observación Única del Plan ALPHA/i)).toBeNull();
  });

  it('8: Si saveDraft falla, NO se produce una falsa confirmación y el modal permite reintentar', async () => {
    const repository = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repository);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposal = create5DayProposal();
    const proposalSource = createMockProposalSource(proposal);
    const mockAuth = createMockAuth();

    // Simular error en saveDraft
    vi.spyOn(service, 'saveDraft').mockRejectedValue(new Error('Error de conexión a Firestore LAB'));

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

    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Contexto para prueba de fallo de red' } });
    });

    // Generar propuesta
    const genBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(genBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    // Anita intenta aceptar
    const acceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    // El diálogo NO se cierra
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    // Mensaje de error visible en pantalla (toast o alert)
    const errorElements = screen.getAllByText(/Error de conexión a Firestore LAB/i);
    expect(errorElements.length).toBeGreaterThan(0);

    // Cero mensaje falso de éxito
    expect(screen.queryByText(/✓ Propuesta incorporada a tu planeación como borrador/i)).toBeNull();

    // El botón vuelve a habilitarse para permitir reintentar o descartar
    const retryAcceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' }) as HTMLButtonElement;
    const discardBtn = screen.getByRole('button', { name: 'Descartar' }) as HTMLButtonElement;
    expect(retryAcceptBtn.disabled).toBe(false);
    expect(discardBtn.disabled).toBe(false);
  });
});
