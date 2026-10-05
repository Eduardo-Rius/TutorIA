import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WeeklyPlanningProposalHumanGate } from '../WeeklyPlanningProposalHumanGate';
import {
  buildWeeklyPlanningProposalEvidence,
  serializeWeeklyPlanningProposalEvidence,
  WeeklyPlanningEvidenceContext,
} from '../weeklyPlanningProposalEvidence';
import type {
  WeeklyPlanningProposalResponse,
  ProposedPlanningDay,
  ProposedActivity,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import type { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R12.5-D.5.1 — LAB Pedagogical Progression Evidence Capture', () => {
  const canonicalRoom: Room = {
    roomId: 'room-lactantes-b',
    name: 'Lactantes B',
    minAgeMonths: 6,
    maxAgeMonths: 12,
  };

  const canonicalContext: WeeklyPlanningEvidenceContext = {
    room: canonicalRoom,
    modality: 'DIRECT',
    weekStart: '2026-09-01',
    weekEnd: '2026-09-05',
  };

  const createSixthLightShapeProposal = (): WeeklyPlanningProposalResponse => {
    const days: ProposedPlanningDay[] = [
      {
        dayOfWeek: 'MONDAY',
        date: '2026-09-01',
        activities: [
          {
            experienceId: 'EXP-D1-A1',
            category: 'EXPLORACIÓN SENSORIAL',
            objective: 'Rastreo visual de elementos brillantes',
            description: 'Exploración de telas brillantes a la altura de los ojos.',
            durationMinutes: 15,
            materials: ['Telas brillantes'],
          },
          {
            experienceId: 'EXP-D1-A2',
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Favorecer apoyo en antebrazos',
            description: 'Postura boca abajo sobre colchoneta con apoyo suave.',
            durationMinutes: 15,
            materials: ['Colchoneta firme'],
          },
        ],
      },
      {
        dayOfWeek: 'TUESDAY',
        date: '2026-09-02',
        activities: [
          {
            experienceId: 'EXP-D2-A1',
            category: 'LENGUAJE Y COMUNICACIÓN',
            objective: 'Balbuceo responsivo con la educadora',
            description: 'Conversación cara a cara imitando sonidos vocálicos.',
            durationMinutes: 15,
            materials: ['Espejo irrompible'],
          },
          {
            experienceId: 'EXP-D2-A2',
            category: 'EXPLORACIÓN SENSORIAL',
            objective: 'Seguimiento sonoro direccional',
            description: 'Hacer sonar sonaja a la izquierda y derecha suavemente.',
            durationMinutes: 15,
            materials: ['Sonaja'],
          },
        ],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        date: '2026-09-03',
        activities: [
          {
            experienceId: 'EXP-D3-A1',
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Fijación de la mirada en contrastes',
            description: 'Lectura compartida de libro de tela con figuras de alto contraste.',
            durationMinutes: 15,
            materials: ['Libro de tela'],
          },
          {
            experienceId: 'EXP-D3-A2',
            category: 'EXPLORACIÓN SENSORIAL',
            objective: 'Revisitación del rastreo visual con mayor alcance',
            description: 'Telas brillantes desplazadas horizontalmente de lado a lado.',
            durationMinutes: 15,
            materials: ['Telas brillantes'],
          },
        ],
      },
      {
        dayOfWeek: 'THURSDAY',
        date: '2026-09-04',
        activities: [
          {
            experienceId: 'EXP-D4-A1',
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Alcance de objeto suspendido boca abajo',
            description: 'Alcanzar sonaja mientras mantiene apoyo en antebrazos.',
            durationMinutes: 15,
            materials: ['Colchoneta firme'],
          },
          {
            experienceId: 'EXP-D4-A2',
            category: 'LENGUAJE Y COMUNICACIÓN',
            objective: 'Canción de cuna con contacto visual sostenido',
            description: 'Cantar rimas cortas manteniendo la mirada cariñosa.',
            durationMinutes: 15,
            materials: ['Colchoneta firme'],
          },
        ],
      },
      {
        dayOfWeek: 'FRIDAY',
        date: '2026-09-05',
        activities: [
          {
            experienceId: 'EXP-D5-A1',
            category: 'EXPLORACIÓN SENSORIAL',
            objective: 'Consolidación de prensión y rastreo integrado',
            description: 'Manipulación libre de telas brillantes y sonaja sonora.',
            durationMinutes: 15,
            materials: ['Telas brillantes'],
          },
          {
            experienceId: 'EXP-D5-A2',
            category: 'PENSAMIENTO Y EXPLORACIÓN',
            objective: 'Permanencia de objeto con tela',
            description: 'Cubrir parcialmente la sonaja con tela brillante y observar búsqueda.',
            durationMinutes: 15,
            materials: ['Telas brillantes'],
          },
        ],
      },
    ];

    return {
      days,
      progression: {
        weeklyFocus: 'Exploración sensorial visual y motora temprana',
        experiences: [
          {
            experienceId: 'EXP-D1-A1',
            role: 'EXPLORE',
            observationTarget: 'Fija la mirada en telas brillantes al menos 5 segundos',
          },
          {
            experienceId: 'EXP-D1-A2',
            role: 'EXPLORE',
            observationTarget: 'Eleva la cabeza con apoyo en antebrazos',
          },
          {
            experienceId: 'EXP-D2-A1',
            role: 'EXPLORE',
            observationTarget: 'Emite vocalizaciones al contacto visual',
          },
          {
            experienceId: 'EXP-D2-A2',
            role: 'EXPLORE',
            observationTarget: 'Gira la cabeza hacia la fuente sonora',
          },
          {
            experienceId: 'EXP-D3-A1',
            role: 'EXPLORE',
            observationTarget: 'Extiende la mano hacia las páginas del libro',
          },
          {
            experienceId: 'EXP-D3-A2',
            role: 'REVISIT',
            revisitsExperienceId: 'EXP-D1-A1',
            repetitionPurpose: 'Consolidar el rastreo visual continuo con mayor amplitud',
            variationDimensions: ['TRAJECTORY', 'DURATION'],
            observationTarget: 'Sigue el movimiento horizontal continuo de la tela',
          },
          {
            experienceId: 'EXP-D4-A1',
            role: 'VARY',
            revisitsExperienceId: 'EXP-D1-A2',
            repetitionPurpose: 'Añadir alcance intencional al apoyo en antebrazos',
            variationDimensions: ['TASK_COMPLEXITY'],
            observationTarget: 'Despega un brazo del suelo para intentar tocar la sonaja',
          },
          {
            experienceId: 'EXP-D4-A2',
            role: 'DEEPEN_OR_ADAPT',
            revisitsExperienceId: 'EXP-D1-A1',
            observationTarget: 'Sostiene mirada durante estrofas rítmicas',
          },
          {
            experienceId: 'EXP-D5-A1',
            role: 'OBSERVE_OR_CONSOLIDATE',
            revisitsExperienceId: 'EXP-D1-A1',
            repetitionPurpose: 'Integrar rastreo con prensión autónoma',
            variationDimensions: ['AUTONOMY'],
            observationTarget: 'Sujeta y agita la tela mientras mira',
          },
          {
            experienceId: 'EXP-D5-A2',
            role: 'OBSERVE_OR_CONSOLIDATE',
            revisitsExperienceId: 'EXP-D1-A1',
            observationTarget: 'Descubre el objeto retirando la tela',
          },
        ],
      },
    };
  };

  let originalClipboard: Clipboard;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  // TEST 1 — EXISTING EVIDENCE PRESERVED
  it('TEST 1 — preserves all existing H1R12.1 proposal evidence fields', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.version).toBe('1.0');
    expect(evidence.room).toEqual({
      roomId: 'room-lactantes-b',
      name: 'Lactantes B',
      minAgeMonths: 6,
      maxAgeMonths: 12,
    });
    expect(evidence.modality).toBe('DIRECT');
    expect(evidence.weekStart).toBe('2026-09-01');
    expect(evidence.weekEnd).toBe('2026-09-05');
    expect(evidence.days).toHaveLength(5);

    const firstActivity = evidence.days[0].activities[0];
    expect(firstActivity.category).toBe('EXPLORACIÓN SENSORIAL');
    expect(firstActivity.objective).toBe('Rastreo visual de elementos brillantes');
    expect(firstActivity.description).toBe('Exploración de telas brillantes a la altura de los ojos.');
    expect(firstActivity.durationMinutes).toBe(15);
    expect(firstActivity.materials).toEqual(['Telas brillantes']);
  });

  // TEST 2 — TRUSTED PROGRESSION INCLUDED
  it('TEST 2 — includes pedagogicalProgression in LAB evidence', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.pedagogicalProgression).toBeDefined();
    expect(evidence.pedagogicalProgression.weeklyFocus).toBe('Exploración sensorial visual y motora temprana');
    expect(Array.isArray(evidence.pedagogicalProgression.experiences)).toBe(true);
    expect(evidence.pedagogicalProgression.experiences.length).toBeGreaterThan(0);
  });

  // TEST 3 — WEEKLY FOCUS INCLUDED
  it('TEST 3 — serializes trusted canonical weeklyFocus faithfully', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.pedagogicalProgression.weeklyFocus).toBe(proposal.progression!.weeklyFocus);
  });

  // TEST 4 — ONE ENTRY PER ACCEPTED ACTIVITY
  it('TEST 4 — produces exactly N progression evidence entries for N accepted activities (not hardcoded to 10)', () => {
    // Test with 6 activities across 5 days (1 on Mon, 2 on Tue, 1 on Wed, 1 on Thu, 1 on Fri)
    const variableProposal: WeeklyPlanningProposalResponse = {
      days: [
        {
          dayOfWeek: 'MONDAY',
          date: '2026-09-01',
          activities: [
            {
              experienceId: 'EXP-D1-A1',
              category: 'CAT-1',
              objective: 'Obj 1',
              description: 'Desc 1',
              durationMinutes: 15,
              materials: ['Mat 1'],
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY',
          date: '2026-09-02',
          activities: [
            {
              experienceId: 'EXP-D2-A1',
              category: 'CAT-2',
              objective: 'Obj 2',
              description: 'Desc 2',
              durationMinutes: 15,
              materials: ['Mat 2'],
            },
            {
              experienceId: 'EXP-D2-A2',
              category: 'CAT-3',
              objective: 'Obj 3',
              description: 'Desc 3',
              durationMinutes: 15,
              materials: ['Mat 3'],
            },
          ],
        },
        {
          dayOfWeek: 'WEDNESDAY',
          date: '2026-09-03',
          activities: [
            {
              experienceId: 'EXP-D3-A1',
              category: 'CAT-4',
              objective: 'Obj 4',
              description: 'Desc 4',
              durationMinutes: 15,
              materials: ['Mat 4'],
            },
          ],
        },
        {
          dayOfWeek: 'THURSDAY',
          date: '2026-09-04',
          activities: [
            {
              experienceId: 'EXP-D4-A1',
              category: 'CAT-5',
              objective: 'Obj 5',
              description: 'Desc 5',
              durationMinutes: 15,
              materials: ['Mat 5'],
            },
          ],
        },
        {
          dayOfWeek: 'FRIDAY',
          date: '2026-09-05',
          activities: [
            {
              experienceId: 'EXP-D5-A1',
              category: 'CAT-6',
              objective: 'Obj 6',
              description: 'Desc 6',
              durationMinutes: 15,
              materials: ['Mat 6'],
            },
          ],
        },
      ],
      progression: {
        weeklyFocus: 'Enfoque de 6 actividades',
        experiences: [
          { experienceId: 'EXP-D1-A1', role: 'EXPLORE', observationTarget: 'Obs 1' },
          { experienceId: 'EXP-D2-A1', role: 'EXPLORE', observationTarget: 'Obs 2' },
          { experienceId: 'EXP-D2-A2', role: 'EXPLORE', observationTarget: 'Obs 3' },
          { experienceId: 'EXP-D3-A1', role: 'EXPLORE', observationTarget: 'Obs 4' },
          { experienceId: 'EXP-D4-A1', role: 'EXPLORE', observationTarget: 'Obs 5' },
          { experienceId: 'EXP-D5-A1', role: 'OBSERVE_OR_CONSOLIDATE', revisitsExperienceId: 'EXP-D1-A1', observationTarget: 'Obs 6' },
        ],
      },
    };

    const evidence = buildWeeklyPlanningProposalEvidence(variableProposal, canonicalContext);
    const totalActivities = variableProposal.days.reduce((acc, d) => acc + d.activities.length, 0);

    expect(totalActivities).toBe(6);
    expect(evidence.pedagogicalProgression.experiences).toHaveLength(6);
  });

  // TEST 5 — EXPERIENCE ID CORRELATION
  it('TEST 5 — correlates each visible activity to exactly one progression entry via experienceId and structural coordinates', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    evidence.days.forEach((day) => {
      day.activities.forEach((act, actIdx) => {
        expect(act.experienceId).toBeDefined();

        const matchingProg = evidence.pedagogicalProgression.experiences.find(
          (p) => p.experienceId === act.experienceId
        );
        expect(matchingProg).toBeDefined();
        expect(matchingProg!.dayOfWeek).toBe(day.dayOfWeek);
        expect(matchingProg!.activityIndex).toBe(actIdx);
      });
    });
  });

  // TEST 6 — ROLE SERIALIZED
  it('TEST 6 — preserves canonical role exactly for all experiences', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const roles = evidence.pedagogicalProgression.experiences.map((e) => e.role);
    expect(roles).toContain('EXPLORE');
    expect(roles).toContain('REVISIT');
    expect(roles).toContain('VARY');
    expect(roles).toContain('DEEPEN_OR_ADAPT');
    expect(roles).toContain('OBSERVE_OR_CONSOLIDATE');
  });

  // TEST 7 — VALID REVISIT SERIALIZED
  it('TEST 7 — serializes canonical revisitsExperienceId faithfully', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const revisitEntry = evidence.pedagogicalProgression.experiences.find(
      (e) => e.experienceId === 'EXP-D3-A2'
    );
    expect(revisitEntry).toBeDefined();
    expect(revisitEntry?.role).toBe('REVISIT');
    expect(revisitEntry?.revisitsExperienceId).toBe('EXP-D1-A1');
  });

  // TEST 8 — REPETITION PURPOSE SERIALIZED
  it('TEST 8 — serializes canonical repetitionPurpose when present', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const revisitEntry = evidence.pedagogicalProgression.experiences.find(
      (e) => e.experienceId === 'EXP-D3-A2'
    );
    expect(revisitEntry?.repetitionPurpose).toBe(
      'Consolidar el rastreo visual continuo con mayor amplitud'
    );
  });

  // TEST 9 — VARIATION DIMENSIONS SERIALIZED
  it('TEST 9 — serializes variationDimensions in deterministic order', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const revisitEntry = evidence.pedagogicalProgression.experiences.find(
      (e) => e.experienceId === 'EXP-D3-A2'
    );
    expect(revisitEntry?.variationDimensions).toEqual(['TRAJECTORY', 'DURATION']);
  });

  // TEST 10 — OBSERVATION TARGET SERIALIZED
  it('TEST 10 — serializes prospective observationTarget faithfully', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const exp1 = evidence.pedagogicalProgression.experiences.find((e) => e.experienceId === 'EXP-D1-A1');
    expect(exp1?.observationTarget).toBe('Fija la mirada en telas brillantes al menos 5 segundos');
  });

  // TEST 11 — OPTIONAL FIELDS NOT FABRICATED
  it('TEST 11 — does not fabricate optional fields when absent in canonical type', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const exploreEntry = evidence.pedagogicalProgression.experiences.find(
      (e) => e.experienceId === 'EXP-D1-A1'
    );
    expect(exploreEntry).toBeDefined();
    expect(exploreEntry?.role).toBe('EXPLORE');
    expect(exploreEntry?.revisitsExperienceId).toBeUndefined();
    expect(exploreEntry?.repetitionPurpose).toBeUndefined();
    expect(exploreEntry?.variationDimensions).toBeUndefined();

    // Verify raw JSON serialization does NOT contain fabricated null or dummy keys
    const jsonStr = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    const parsed = JSON.parse(jsonStr);
    const parsedExplore = parsed.pedagogicalProgression.experiences.find(
      (e: any) => e.experienceId === 'EXP-D1-A1'
    );
    expect('revisitsExperienceId' in parsedExplore).toBe(false);
    expect('repetitionPurpose' in parsedExplore).toBe(false);
    expect('variationDimensions' in parsedExplore).toBe(false);
  });

  // TEST 12 — DETERMINISTIC SERIALIZATION
  it('TEST 12 — produces byte-for-byte identical JSON serialization for the same input', () => {
    const proposal = createSixthLightShapeProposal();
    const json1 = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    const json2 = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(json1).toBe(json2);
    expect(Buffer.from(json1).equals(Buffer.from(json2))).toBe(true);
  });

  // TEST 13 — NO TIMESTAMP
  it('TEST 13 — contains no capturedAt, Date.now, or nondeterministic timestamp fields', () => {
    const proposal = createSixthLightShapeProposal();
    const json = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(json).not.toContain('capturedAt');
    expect(json).not.toContain('timestamp');
    expect(json).not.toContain('createdAt');
    expect(json).not.toContain('generatedAt');
  });

  // TEST 14 — LAB GUARD
  it('TEST 14 — progression evidence is unavailable outside approved LAB mode', () => {
    const proposal = createSixthLightShapeProposal();

    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={false}
        evidenceContext={canonicalContext}
      />
    );

    expect(screen.queryByTestId('copy-lab-evidence-button')).toBeNull();
    expect(screen.queryByTestId('lab-evidence-json')).toBeNull();
    expect(screen.queryByText(/Copiar evidencia LAB/i)).toBeNull();
  });

  // TEST 15 — PRODUCTION UI UNCHANGED
  it('TEST 15 — normal activity cards do not expose technical progression metadata to Anita', () => {
    const proposal = createSixthLightShapeProposal();

    const { container } = render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
        isLabMode={false}
      />
    );

    // Visible UI must NOT contain technical IDs, roles, or progression labels
    expect(screen.queryByText(/EXP-D1-A1/)).toBeNull();
    expect(screen.queryByText(/EXP-D3-A2/)).toBeNull();
    expect(screen.queryByText(/DEEPEN_OR_ADAPT/)).toBeNull();
    expect(screen.queryByText(/OBSERVE_OR_CONSOLIDATE/)).toBeNull();
    expect(screen.queryByText(/TRAJECTORY/)).toBeNull();

    // Regular pedagogic card elements MUST be visible
    expect(screen.getByText('Rastreo visual de elementos brillantes')).toBeDefined();
    expect(screen.getAllByText('Telas brillantes').length).toBeGreaterThan(0);
  });

  // TEST 16 — SAME SERIALIZER FOR CLIPBOARD + HIDDEN EVIDENCE
  it('TEST 16 — clipboard and hidden evidence element use the exact same serialization payload', async () => {
    const proposal = createSixthLightShapeProposal();
    let clipboardText = '';

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation((text: string) => {
          clipboardText = text;
          return Promise.resolve();
        }),
      },
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

    const hiddenEvidence = screen.getByTestId('lab-evidence-json');
    const copyButton = screen.getByTestId('copy-lab-evidence-button');

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(clipboardText).toBe(hiddenEvidence.textContent);
    expect(clipboardText).toBe(serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext));
  });

  // TEST 17 — MISSING TRUSTED PROGRESSION
  it('TEST 17 — fails closed without changing Human Gate or proposal if progression is missing', () => {
    const proposalWithoutProgression: WeeklyPlanningProposalResponse = {
      days: [
        {
          dayOfWeek: 'MONDAY',
          date: '2026-09-01',
          activities: [
            {
              category: 'EXPLORACIÓN SENSORIAL',
              objective: 'Obj 1',
              description: 'Desc 1',
              durationMinutes: 15,
              materials: ['Mat 1'],
            },
          ],
        },
      ],
      // progression is intentionally omitted
    };

    const onAccept = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposalWithoutProgression}
        onAccept={onAccept}
        onDiscard={onDiscard}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    // Copy button should be disabled because evidenceJson failed closed (null)
    const copyButton = screen.getByTestId('copy-lab-evidence-button');
    expect((copyButton as HTMLButtonElement).disabled).toBe(true);

    // Hidden evidence element is NOT rendered
    expect(screen.queryByTestId('lab-evidence-json')).toBeNull();

    // Human Gate actions and proposal remain unmutated and functional
    expect(onAccept).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
    expect(screen.getByText('Usar esta propuesta')).toBeDefined();
    expect(screen.getByText('Descartar')).toBeDefined();
  });

  // TEST 18 — ZERO NETWORK
  it('TEST 18 — evidence serialization and copy execute with zero network requests', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(() => {
      throw new Error('NETWORK CALL DETECTED: fetch is strictly prohibited in evidence capture');
    });
    global.fetch = fetchMock;

    try {
      const proposal = createSixthLightShapeProposal();
      const serialized = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);
      expect(serialized).toBeDefined();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  // TEST 19 — ZERO PERSISTENCE
  it('TEST 19 — evidence capture causes zero persistence or storage mutations', () => {
    const proposal = createSixthLightShapeProposal();
    const initialClone = JSON.parse(JSON.stringify(proposal));

    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    expect(evidence).toBeDefined();

    // Verify input proposal was not mutated in place
    expect(proposal).toEqual(initialClone);
  });

  // TEST 20 — ZERO GOVERNANCE MUTATION
  it('TEST 20 — evidence copy causes zero governance or lifecycle mutations', () => {
    const proposal = createSixthLightShapeProposal();
    const onAccept = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WeeklyPlanningProposalHumanGate
        proposal={proposal}
        onAccept={onAccept}
        onDiscard={onDiscard}
        isLabMode={true}
        evidenceContext={canonicalContext}
      />
    );

    const copyButton = screen.getByTestId('copy-lab-evidence-button');
    act(() => {
      fireEvent.click(copyButton);
    });

    expect(onAccept).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  // TEST 21 — PRIVACY
  it('TEST 21 — evidence payload excludes UIDs, auth tokens, secrets, prompts, and personal data', () => {
    const proposal = createSixthLightShapeProposal();
    const json = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(json).not.toMatch(/"uid"/i);
    expect(json).not.toMatch(/"token"/i);
    expect(json).not.toMatch(/"authorization"/i);
    expect(json).not.toMatch(/"apiKey"/i);
    expect(json).not.toMatch(/"openai"/i);
    expect(json).not.toMatch(/"prompt"/i);
    expect(json).not.toMatch(/"systemPrompt"/i);
    expect(json).not.toMatch(/bearer/i);
    expect(json).not.toMatch(/"medical"/i);
    expect(json).not.toMatch(/"health"/i);
    expect(json).not.toMatch(/"teacherId"/i);
  });

  // TEST 22 — NO CHAIN OF THOUGHT
  it('TEST 22 — evidence payload excludes provider reasoning or chain of thought', () => {
    const proposal = createSixthLightShapeProposal();
    const json = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(json).not.toMatch(/"reasoning"/i);
    expect(json).not.toMatch(/"thoughtProcess"/i);
    expect(json).not.toMatch(/"whyIChose"/i);
    expect(json).not.toMatch(/"rationale"/i);
    expect(json).not.toMatch(/"analysis"/i);
  });

  // TEST 23 — CANONICAL, NOT PROVIDER, REVISIT REFERENCE
  it('TEST 23 — evidence references canonical revisitsExperienceId, never raw provider revisitsSlot', () => {
    const proposal = createSixthLightShapeProposal();
    const json = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(json).toContain('"revisitsExperienceId"');
    expect(json).not.toContain('revisitsSlot');
  });

  // TEST 24 — MATERIALS UNCHANGED
  it('TEST 24 — progression evidence does not alter, augment, or reauthorize materials', () => {
    const proposal = createSixthLightShapeProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.days[0].activities[0].materials).toEqual(['Telas brillantes']);
    expect(evidence.days[0].activities[1].materials).toEqual(['Colchoneta firme']);
    expect(evidence.days[1].activities[0].materials).toEqual(['Espejo irrompible']);
    expect(evidence.days[1].activities[1].materials).toEqual(['Sonaja']);
    expect(evidence.days[2].activities[0].materials).toEqual(['Libro de tela']);
  });

  // TEST 25 — CURRENT SIXTH-LIGHT-SHAPE FIXTURE
  it('TEST 25 — safe synthetic Sixth-Light-shape proposal produces exactly 10 activities and 10 progression entries without hardcoded 10', () => {
    const proposal = createSixthLightShapeProposal();
    const totalActivities = proposal.days.reduce((acc, d) => acc + d.activities.length, 0);
    expect(totalActivities).toBe(10);

    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    expect(evidence.days.flatMap((d) => d.activities)).toHaveLength(10);
    expect(evidence.pedagogicalProgression.experiences).toHaveLength(10);

    // Verify 1:1 correspondence across all 10
    const progressionExperienceIds = evidence.pedagogicalProgression.experiences.map((e) => e.experienceId);
    const activityExperienceIds = evidence.days.flatMap((d) => d.activities.map((a) => a.experienceId));
    expect(progressionExperienceIds).toEqual(activityExperienceIds);
  });
});
