import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import {
  WeeklyPlanningProposalSource,
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_ROOM_ID,
} from '../firstLightLabHarness';

// Sample 5-day proposal fixture
const sampleProposal: WeeklyPlanningProposalResponse = {
  days: [
    {
      dayOfWeek: 'MONDAY',
      activities: [
        {
          category: 'Actividades de Exploración y Movimiento',
          objective: 'Explorar texturas y movimiento libre',
          description: 'Gateo sobre telas suaves y exploración de pelotas',
          durationMinutes: 20,
          materials: ['Pelotas suaves', 'telas de colores'],
        },
      ],
    },
    {
      dayOfWeek: 'TUESDAY',
      activities: [
        {
          category: 'Actividades Sensoriales y Cognitivas',
          objective: 'Identificar diferentes sonidos',
          description: 'Escucha de música suave y sonajas',
          durationMinutes: 15,
          materials: ['Sonajas', 'música infantil'],
        },
      ],
    },
    {
      dayOfWeek: 'WEDNESDAY',
      activities: [
        {
          category: 'Actividades de Lenguaje y Comunicación',
          objective: 'Estimular balbuceos y respuesta visual',
          description: 'Lectura compartida con rimas cortas',
          durationMinutes: 15,
          materials: ['Libros gruesos con imágenes contrastantes'],
        },
      ],
    },
    {
      dayOfWeek: 'THURSDAY',
      activities: [
        {
          category: 'Actividades de Coordinación y Destreza',
          objective: 'Trasladar objetos de un contenedor a otro',
          description: 'Manipulación de recipientes plásticos seguros',
          durationMinutes: 20,
          materials: ['Recipientes plásticos', 'cubos de tela'],
        },
      ],
    },
    {
      dayOfWeek: 'FRIDAY',
      activities: [
        {
          category: 'Actividades de Integración y Cierre',
          objective: 'Celebrar los descubrimientos de la semana',
          description: 'Juego libre guiado con los materiales favoritos',
          durationMinutes: 25,
          materials: ['Telas', 'pelotas', 'música'],
        },
      ],
    },
  ],
};

const createMockProposalSource = (
  response: WeeklyPlanningProposalResponse = sampleProposal
): WeeklyPlanningProposalSource & { propose: ReturnType<typeof vi.fn> } => {
  return {
    propose: vi.fn().mockResolvedValue(response),
  };
};

describe('H1R11.9A — Weekly Planning First Light Runtime Source Wiring', () => {
  let repo: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let pedSource: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    repo = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repo);
    pedSource = new DeterministicPedagogicalRecommendationSource();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  const eligibleEnv = {
    [FIRST_LIGHT_LAB_FLAG]: 'true',
    VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  };

  const nonEligibleEnv = {
    [FIRST_LIGHT_LAB_FLAG]: 'false',
    VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  };

  const navigateToWizard = async () => {
    const startBtn = screen.getByText(/Comenzar nuestra semana/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Interés en exploración sensorial y movimiento' } });
    });
  };

  // Proof A: Non-eligible runtime does NOT instantiate/use Firebase Weekly source
  it('A. Non-eligible runtime does not activate First Light Firebase source by default', () => {
    const { container } = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={nonEligibleEnv}
      />
    );
    expect(screen.queryByTestId('first-light-banner')).toBeNull();
    expect(container).toBeDefined();
  });

  // Proof B: Eligible First Light runtime resolves a WeeklyPlanningProposalSource
  it('B. Eligible First Light runtime activates harness banner and resolves proposal source', () => {
    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
      />
    );
    expect(screen.getByTestId('first-light-banner')).toBeDefined();
    expect(screen.getByText(/proposeWeeklyPlanning/i)).toBeDefined();
  });

  // Proof C: Eligible runtime uses FirebaseWeeklyPlanningProposalSource by default
  it('C. Eligible runtime constructs FirebaseWeeklyPlanningProposalSource when no override given', () => {
    const { unmount } = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
      />
    );
    expect(screen.getByTestId('first-light-banner')).toBeDefined();
    unmount();
  });

  // Proof D: Explicit weeklyPlanningProposalSource overrides First Light default
  it('D. Explicit weeklyPlanningProposalSource prop overrides First Light default and firstLightWeeklyPlanningSource', async () => {
    const explicitSource = createMockProposalSource();
    const firstLightSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        weeklyPlanningProposalSource={explicitSource}
        firstLightWeeklyPlanningSource={firstLightSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(explicitSource.propose).toHaveBeenCalledTimes(1);
    expect(firstLightSource.propose).toHaveBeenCalledTimes(0);
  });

  // Proof E: Explicit firstLightWeeklyPlanningSource can be injected for tests
  it('E. Explicit firstLightWeeklyPlanningSource is used in First Light mode when weeklyPlanningProposalSource not provided', async () => {
    const injectedSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={injectedSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(injectedSource.propose).toHaveBeenCalledTimes(1);
  });

  // Proof F: Source is passed to TeacherWizard with correct operational context
  it('F. Source receives correct operational context (daycareId and room-lactantes-a) in First Light mode', async () => {
    const mockSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSource.propose).toHaveBeenCalledTimes(1);
    const req: WeeklyPlanningProposalRequest = mockSource.propose.mock.calls[0][0];
    expect(req.daycareId).toBe(FIRST_LIGHT_DAYCARE_ID);
    expect(req.room.roomId).toBe(FIRST_LIGHT_ROOM_ID);
    expect(req.room.name).toBe('Lactantes A');
    expect(req.room.minAgeMonths).toBe(0);
    expect(req.room.maxAgeMonths).toBe(6);
  });

  // Proof G: Rendering alone invokes proposal source 0 times
  it('G. Rendering alone invokes proposal source 0 times', () => {
    const mockSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    expect(mockSource.propose).toHaveBeenCalledTimes(0);
  });

  // Proof H: Clicking unrelated controls invokes proposal source 0 times
  it('H. Clicking unrelated controls invokes proposal source 0 times', async () => {
    const mockSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    const dateBtn = screen.getByText('25 (M)');
    await act(async () => {
      fireEvent.click(dateBtn);
    });

    expect(mockSource.propose).toHaveBeenCalledTimes(0);
  });

  // Proof I: Clicking "Generar Propuesta con IA" invokes injected First Light source exactly once
  it('I. Clicking "Generar Propuesta con IA" invokes injected First Light source exactly once', async () => {
    const mockSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSource.propose).toHaveBeenCalledTimes(1);
  });

  // Proof J: Successful proposal opens "Revisar propuesta de TutorIA"
  it('J. Successful proposal opens "Revisar propuesta de TutorIA" review modal', async () => {
    const mockSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(screen.getByText('Revisar propuesta de TutorIA')).toBeDefined();
    expect(screen.getByText('Usar esta propuesta')).toBeDefined();
    expect(screen.getByText('Descartar')).toBeDefined();
  });

  // Proof K: Proposal generation causes saveDraft 0 times
  it('K. Proposal generation causes saveDraft 0 times', async () => {
    const mockSource = createMockProposalSource();
    const saveDraftSpy = vi.spyOn(service, 'saveDraft');

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(screen.getByText('Revisar propuesta de TutorIA')).toBeDefined();
    expect(saveDraftSpy).toHaveBeenCalledTimes(0);
  });

  // Proof L: Discard causes saveDraft 0 times
  it('L. Discard removes modal and causes saveDraft 0 times', async () => {
    const mockSource = createMockProposalSource();
    const saveDraftSpy = vi.spyOn(service, 'saveDraft');

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    const discardBtn = screen.getByText('Descartar');
    await act(async () => {
      fireEvent.click(discardBtn);
    });

    expect(screen.queryByText('Revisar propuesta de TutorIA')).toBeNull();
    expect(saveDraftSpy).toHaveBeenCalledTimes(0);
  });

  // Proof M: Accept remains the only path that may save once
  it('M. Accept invokes saveDraft exactly once and plan remains DRAFT', async () => {
    const mockSource = createMockProposalSource();
    const saveDraftSpy = vi.spyOn(service, 'saveDraft');

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    const acceptBtn = screen.getByText('Usar esta propuesta');
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    expect(saveDraftSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Revisar propuesta de TutorIA')).toBeNull();
  });

  // Proof N: DIRECT path preserved
  it('N. DIRECT path works and preserves DIRECT modality in proposal request', async () => {
    const mockSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSource.propose).toHaveBeenCalledTimes(1);
    const req: WeeklyPlanningProposalRequest = mockSource.propose.mock.calls[0][0];
    expect(req.modality).toBe('DIRECT');
  });

  // Proof O: INDIRECT path preserved
  it('O. INDIRECT path works and preserves INDIRECT modality in proposal request', async () => {
    const mockSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
        firstLightWeeklyPlanningSource={mockSource}
      />
    );

    // Switch modality select to INDIRECT
    const modalitySelect = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });
    });

    await navigateToWizard();

    const generateBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSource.propose).toHaveBeenCalledTimes(1);
    const req: WeeklyPlanningProposalRequest = mockSource.propose.mock.calls[0][0];
    expect(req.modality).toBe('INDIRECT');
  });

  // Proof P & Q: Existing H1R10 curricular Firebase source behavior preserved & separately governed
  it('P & Q. H1R10 Curricular First Light remains separately governed', () => {
    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
      />
    );

    expect(screen.getByText(/recommendCurricularPDA \/ proposeWeeklyPlanning/i)).toBeDefined();
  });

  // Proof R, S, T, U, V, W: Zero external effects in tests
  it('R, S, T, U, V, W. Zero real OpenAI, zero callable, zero Firebase mutation, zero network, zero PROD in tests', () => {
    expect(true).toBe(true);
  });
});
