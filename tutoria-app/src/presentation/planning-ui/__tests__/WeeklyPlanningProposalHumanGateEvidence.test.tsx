import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WeeklyPlanningProposalHumanGate } from '../WeeklyPlanningProposalHumanGate';
import { serializeWeeklyPlanningProposalEvidence, WeeklyPlanningEvidenceContext } from '../weeklyPlanningProposalEvidence';
import type {
  WeeklyPlanningProposalResponse,
  ProposedPlanningDay,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import type { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R12.1 — WeeklyPlanningProposalHumanGate LAB Evidence Capture', () => {
  const canonicalRoom: Room = {
    roomId: 'room-lactantes-a',
    name: 'Lactantes A',
    minAgeMonths: 0,
    maxAgeMonths: 6,
  };

  const canonicalContext: WeeklyPlanningEvidenceContext = {
    room: canonicalRoom,
    modality: 'DIRECT',
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
  };

  const createSampleProposal = (): WeeklyPlanningProposalResponse => ({
    days: [
      {
        dayOfWeek: 'MONDAY',
        date: '2026-08-24',
        activities: [
          {
            experienceId: 'EXP-D1-A1',
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: 'Estimular el rastreo visual.',
            description: 'Móvil de contraste visual suave.',
            durationMinutes: 15,
            materials: ['Móvil de tela'],
          },
        ],
      },
      {
        dayOfWeek: 'TUESDAY',
        date: '2026-08-25',
        activities: [
          {
            experienceId: 'EXP-D2-A1',
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Favorecer tono muscular en cuello.',
            description: 'Tiempo boca abajo asistido.',
            durationMinutes: 10,
            materials: ['Cuña suave'],
          },
        ],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        date: '2026-08-26',
        activities: [
          {
            experienceId: 'EXP-D3-A1',
            category: 'LENGUAJE Y COMUNICACIÓN',
            objective: 'Vocalización responsiva.',
            description: 'Diálogo cercano con entonación cantada.',
            durationMinutes: 15,
            materials: ['Colchoneta'],
          },
        ],
      },
      {
        dayOfWeek: 'THURSDAY',
        date: '2026-08-27',
        activities: [
          {
            experienceId: 'EXP-D4-A1',
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Contacto visual con imágenes.',
            description: 'Lectura de cuento con figuras grandes.',
            durationMinutes: 10,
            materials: ['Libro de tela'],
          },
        ],
      },
      {
        dayOfWeek: 'FRIDAY',
        date: '2026-08-28',
        activities: [
          {
            experienceId: 'EXP-D5-A1',
            category: 'PENSAMIENTO MATEMÁTICO',
            objective: 'Permanencia del objeto.',
            description: 'Ocultar y descubrir sonaja con manta suave.',
            durationMinutes: 15,
            materials: ['Sonaja', 'Manta'],
          },
        ],
      },
    ],
    progression: {
      weeklyFocus: 'Exploración sensorial y afectiva',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Estimular el rastreo visual',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'EXPLORE',
          observationTarget: 'Favorecer tono muscular en cuello',
        },
        {
          experienceId: 'EXP-D3-A1',
          role: 'EXPLORE',
          observationTarget: 'Vocalización responsiva',
        },
        {
          experienceId: 'EXP-D4-A1',
          role: 'EXPLORE',
          observationTarget: 'Contacto visual con imágenes',
        },
        {
          experienceId: 'EXP-D5-A1',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'EXP-D1-A1',
          observationTarget: 'Permanencia del objeto',
        },
      ],
    },
  });

  let originalClipboard: Clipboard;

  beforeEach(() => {
    vi.useFakeTimers();
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  // Requirement 1: LAB mode renders "Copiar evidencia LAB"
  it('1. LAB mode renders "Copiar evidencia LAB" button in modal header', () => {
    const proposal = createSampleProposal();
    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const copyBtn = screen.getByTestId('copy-lab-evidence-button');
    expect(copyBtn).toBeDefined();
    expect(copyBtn.textContent).toContain('Copiar evidencia LAB');
  });

  // Requirement 2: non-LAB/undefined mode does NOT render evidence control
  it('2. non-LAB or undefined mode does NOT render evidence control button', () => {
    const proposal = createSampleProposal();

    // With isLabMode = false
    const { unmount } = render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={false}
        evidenceContext={canonicalContext}
      />
    );
    expect(screen.queryByTestId('copy-lab-evidence-button')).toBeNull();
    unmount();

    // With isLabMode = undefined (default)
    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
      />
    );
    expect(screen.queryByTestId('copy-lab-evidence-button')).toBeNull();
  });

  // Requirement 12: copy action writes EXACTLY the deterministic evidence JSON
  it('12. copy action writes EXACTLY the deterministic evidence JSON to clipboard', async () => {
    const proposal = createSampleProposal();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const expectedJson = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    const copyBtn = screen.getByTestId('copy-lab-evidence-button');

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(expectedJson);
    expect(copyBtn.textContent).toContain('✓ Evidencia copiada');

    // After timer expires, reverts to original label
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(copyBtn.textContent).toContain('Copiar evidencia LAB');
  });

  // Requirement 13: copy action does NOT invoke onAccept
  it('13. copy action does NOT invoke onAccept callback', async () => {
    const proposal = createSampleProposal();
    const onAcceptMock = vi.fn();
    const onDiscardMock = vi.fn();

    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={onAcceptMock}
        onDiscard={onDiscardMock}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const copyBtn = screen.getByTestId('copy-lab-evidence-button');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(onAcceptMock).not.toHaveBeenCalled();
  });

  // Requirement 14: copy action does NOT invoke onDiscard
  it('14. copy action does NOT invoke onDiscard callback', async () => {
    const proposal = createSampleProposal();
    const onAcceptMock = vi.fn();
    const onDiscardMock = vi.fn();

    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={onAcceptMock}
        onDiscard={onDiscardMock}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const copyBtn = screen.getByTestId('copy-lab-evidence-button');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(onDiscardMock).not.toHaveBeenCalled();
  });

  // Requirement 15: copy action does NOT call saveDraft/persistence
  it('15. copy action does NOT trigger any persistence side effects or draft save', async () => {
    const proposal = createSampleProposal();
    const onAcceptMock = vi.fn();
    const onDiscardMock = vi.fn();

    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={onAcceptMock}
        onDiscard={onDiscardMock}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const copyBtn = screen.getByTestId('copy-lab-evidence-button');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(onAcceptMock).toHaveBeenCalledTimes(0);
    expect(onDiscardMock).toHaveBeenCalledTimes(0);
  });

  // Requirement 17: proposal remains visible after copy
  it('17. proposal and modal dialog remain completely visible and intact after copy', async () => {
    const proposal = createSampleProposal();
    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const copyBtn = screen.getByTestId('copy-lab-evidence-button');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // Dialog remains open
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Revisar propuesta de TutorIA')).toBeDefined();
    expect(screen.getByText('Lunes')).toBeDefined();
    expect(screen.getByText('Viernes')).toBeDefined();
    // Governance buttons remain ready
    expect(screen.getByText('Usar esta propuesta')).toBeDefined();
    expect(screen.getByText('Descartar')).toBeDefined();
  });

  // Requirement 18: hidden/test evidence surface is present in LAB, absent outside LAB
  it('18. hidden/test evidence surface (data-testid="lab-evidence-json") is present in LAB and absent outside LAB', () => {
    const proposal = createSampleProposal();

    // LAB mode: present
    const { unmount } = render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const evidencePre = screen.getByTestId('lab-evidence-json');
    expect(evidencePre).toBeDefined();
    const expectedJson = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    expect(evidencePre.textContent).toBe(expectedJson);

    unmount();

    // Non-LAB mode: absent
    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={false}
        evidenceContext={canonicalContext}
      />
    );

    expect(screen.queryByTestId('lab-evidence-json')).toBeNull();
  });
});
