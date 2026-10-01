import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { Sidebar } from '../../../components/layouts/Sidebar';
import { AppShell } from '../../../components/layouts/AppShell';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { RoomCatalog, Room } from '../../../domain/planning/RoomCatalog';
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

const sampleProposal: WeeklyPlanningProposalResponse = {
  days: [
    {
      dayOfWeek: 'MONDAY',
      activities: [
        {
          category: 'Actividades de Exploración y Movimiento',
          objective: 'Estimular el seguimiento visual y control cefálico',
          description: 'Móvil de alto contraste a 30 cm de distancia',
          durationMinutes: 10,
          materials: ['Móvil de contraste'],
        },
      ],
    },
    {
      dayOfWeek: 'TUESDAY',
      activities: [
        {
          category: 'Actividades Sensoriales y Cognitivas',
          objective: 'Exploración auditiva suave',
          description: 'Sonajero suave a los lados para giro cefálico',
          durationMinutes: 10,
          materials: ['Sonajero suave'],
        },
      ],
    },
    {
      dayOfWeek: 'WEDNESDAY',
      activities: [
        {
          category: 'Actividades de Lenguaje y Comunicación',
          objective: 'Contacto visual y respuesta a la voz materna',
          description: 'Canción de cuna suave cara a cara',
          durationMinutes: 10,
          materials: ['Voz humana'],
        },
      ],
    },
    {
      dayOfWeek: 'THURSDAY',
      activities: [
        {
          category: 'Actividades de Coordinación y Destreza',
          objective: 'Apertura de palmas y prensión palmar voluntaria',
          description: 'Tacto con tela de algodón texturizada',
          durationMinutes: 10,
          materials: ['Tela de algodón'],
        },
      ],
    },
    {
      dayOfWeek: 'FRIDAY',
      activities: [
        {
          category: 'Actividades de Integración y Cierre',
          objective: 'Masaje relajante y cierre semanal',
          description: 'Masaje suave en extremidades sobre colchoneta',
          durationMinutes: 10,
          materials: ['Colchoneta firme'],
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

describe('H1R11.12R-A — Canonical Room Presentation Alignment', () => {
  let repo: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let pedSource: DeterministicPedagogicalRecommendationSource;

  const eligibleEnv = {
    [FIRST_LIGHT_LAB_FLAG]: 'true',
    VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  };

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

  // ==================================================================
  // REQUIREMENT A: When canonical room is Lactantes A, visible UI says Lactantes A
  // ==================================================================
  it('A: renders "Lactantes A" and "Pedagoga · Lactantes A" when canonical room is Lactantes A in LAB', async () => {
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleEnv}
        />
      );
    });

    // 1. Header shows "Pedagoga · Lactantes A" for Anita
    expect(screen.getByText('Pedagoga · Lactantes A')).toBeDefined();
    expect(screen.getByText('Anita')).toBeDefined();

    // 2. Planning subtitle in TeacherList shows "para Lactantes A"
    const subtitle = screen.getByText(/Del 24 al 28 de agosto para/i);
    expect(subtitle.textContent).toContain('Lactantes A');
    expect(subtitle.textContent).not.toContain('Lactantes C');
  });

  it('A.2: renders "Lactantes A" in Sidebar when roomName is passed or under LAB environment', () => {
    // Direct with roomName prop
    const { unmount: unmount1 } = render(
      <MemoryRouter>
        <Sidebar roomName="Lactantes A" />
      </MemoryRouter>
    );
    expect(screen.getByText('Lactantes A')).toBeDefined();
    expect(screen.getByText('Pedagoga')).toBeDefined();
    unmount1();

    // Via AppShell with roomName prop
    render(
      <MemoryRouter>
        <AppShell roomName="Lactantes A">
          <div>Workspace Content</div>
        </AppShell>
      </MemoryRouter>
    );
    expect(screen.getAllByText('Lactantes A').length).toBeGreaterThan(0);
  });

  // ==================================================================
  // REQUIREMENT B: Visible planning room equals the canonical Room used by generation handler
  // ==================================================================
  it('B: establishes VISIBLE ROOM === CANONICAL ACTIVE ROOM === ROOM SENT TO GENERATION', async () => {
    const mockProposalSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        weeklyPlanningProposalSource={mockProposalSource}
        firstLightEnv={eligibleEnv}
      />
    );

    // Verify visible room in header
    const visibleHeader = screen.getByText('Pedagoga · Lactantes A');
    expect(visibleHeader).toBeDefined();

    // Navigate to TeacherWizard
    const startBtn = screen.getByText(/Comenzar nuestra semana/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

    // Fill valid observations
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Bebés de 2 a 4 meses exploran el entorno.' } });
    });

    // Trigger AI generation
    const generateBtn = screen.getByText(/Ayúdame con TutorIA \(Generar Semana\)/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    // Verify mock was called
    expect(mockProposalSource.propose).toHaveBeenCalledTimes(1);
    const req: WeeklyPlanningProposalRequest = mockProposalSource.propose.mock.calls[0][0];

    // Core Invariant Assertions:
    // 1. Generation room matches canonical room-lactantes-a
    expect(req.room).toBeDefined();
    expect(req.room.roomId).toBe(FIRST_LIGHT_ROOM_ID);
    expect(req.room.name).toBe('Lactantes A');
    expect(req.room.minAgeMonths).toBe(0);
    expect(req.room.maxAgeMonths).toBe(6);

    // 2. Visible room matches generation room exactly
    expect(visibleHeader.textContent).toContain(req.room.name);
  });

  // ==================================================================
  // REQUIREMENT C: No active Weekly Planning presentation path under LAB renders legacy "Lactantes C"
  // ==================================================================
  it('C: ensures zero occurrences of legacy "Lactantes C" anywhere in active Weekly Planning presentation under LAB', async () => {
    const { container } = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={eligibleEnv}
      />
    );

    // Check list view
    expect(container.textContent).not.toContain('Lactantes C');
    expect(container.textContent).not.toContain('Pedagoga · Lactantes C');
    expect(container.textContent).not.toContain('para Lactantes C');

    // Navigate into Wizard view
    const startBtn = screen.getByText(/Comenzar nuestra semana/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

    // Check wizard view
    expect(container.textContent).not.toContain('Lactantes C');
    expect(container.textContent).not.toContain('Pedagoga · Lactantes C');
  });

  // ==================================================================
  // REQUIREMENT D: Dynamic resolution — follows any canonical room fixture
  // ==================================================================
  it('D: dynamically updates visible presentation and generation room when a different room fixture is provided', async () => {
    const lactantesBRoom: Room = {
      roomId: 'room-lactantes-b',
      name: 'Lactantes B',
      minAgeMonths: 7,
      maxAgeMonths: 12,
    };

    vi.spyOn(RoomCatalog, 'getRoom').mockImplementation((id: string) => {
      if (id === 'room-lactantes-b') return lactantesBRoom;
      if (id === 'room-lactantes-a') {
        return {
          roomId: 'room-lactantes-a',
          name: 'Lactantes A',
          minAgeMonths: 0,
          maxAgeMonths: 6,
        };
      }
      return undefined;
    });

    const mockProposalSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        weeklyPlanningProposalSource={mockProposalSource}
        firstLightEnv={eligibleEnv}
        roomOverride={lactantesBRoom}
      />
    );

    // 1. Visible header follows overridden room, not hardcoded Lactantes A
    expect(screen.getByText('Pedagoga · Lactantes B')).toBeDefined();
    expect(screen.queryByText('Pedagoga · Lactantes A')).toBeNull();

    // 2. TeacherList subtitle follows overridden room
    const subtitle = screen.getByText(/Del 24 al 28 de agosto para/i);
    expect(subtitle.textContent).toContain('Lactantes B');
    expect(subtitle.textContent).not.toContain('Lactantes A');

    // 3. Generation handler receives Lactantes B
    const startBtn = screen.getByText(/Comenzar nuestra semana/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Bebés de 8 meses gateando activamente.' } });
    });

    const generateBtn = screen.getByText(/Ayúdame con TutorIA \(Generar Semana\)/i);
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockProposalSource.propose).toHaveBeenCalledTimes(1);
    const req: WeeklyPlanningProposalRequest = mockProposalSource.propose.mock.calls[0][0];
    expect(req.room.roomId).toBe('room-lactantes-b');
    expect(req.room.name).toBe('Lactantes B');
    expect(req.room.minAgeMonths).toBe(7);
    expect(req.room.maxAgeMonths).toBe(12);
  });

  // ==================================================================
  // REQUIREMENT E: Zero generation triggered by rendering or editing presentation
  // ==================================================================
  it('E: triggers zero generation calls during render, navigation, or text editing', async () => {
    const mockProposalSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        weeklyPlanningProposalSource={mockProposalSource}
        firstLightEnv={eligibleEnv}
      />
    );

    // Navigate to Wizard
    const startBtn = screen.getByText(/Comenzar nuestra semana/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

    // Edit fields
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, { target: { value: 'Observaciones de prueba.' } });
    });

    const needsInput = screen.getByPlaceholderText(/Ej: Control postural, atención conjunta/i);
    await act(async () => {
      fireEvent.change(needsInput, { target: { value: 'Necesidades de prueba.' } });
    });

    // Zero generation calls must have occurred!
    expect(mockProposalSource.propose).toHaveBeenCalledTimes(0);
  });

  // ==================================================================
  // REQUIREMENT F: Zero saveDraft/persistence occurs because of presentation correction
  // ==================================================================
  it('F: does not invoke saveDraft or persist proposals merely due to presentation alignment', async () => {
    const saveDraftSpy = vi.spyOn(service, 'saveDraft');
    const mockProposalSource = createMockProposalSource();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        weeklyPlanningProposalSource={mockProposalSource}
        firstLightEnv={eligibleEnv}
      />
    );

    // Initial load: createPlanning may be called for initial demo state, but zero saveDraft
    expect(saveDraftSpy).toHaveBeenCalledTimes(0);

    // Navigate to wizard
    const startBtn = screen.getByText(/Comenzar nuestra semana/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

    // In wizard view, verify saveDraft is still 0
    expect(saveDraftSpy).toHaveBeenCalledTimes(0);
  });
});
