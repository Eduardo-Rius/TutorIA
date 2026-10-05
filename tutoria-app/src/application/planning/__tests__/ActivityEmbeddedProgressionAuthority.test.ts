/**
 * H1R12.5-D.4.11 — Activity-Embedded Progression Authority Test Matrix (Tests 1–30)
 *
 * Implements Master ARB approved microbullet D.4.11:
 * Single-source provider-side pedagogical progression authority embedded inside
 * each provider activity object, with deterministic canonical projection of
 * WeeklyPedagogicalProgression on the trusted application/server side.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  parseAndAllowlistUntrustedProposal,
  createRequestScopedMaterialTable,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  InvalidWeeklyPlanningProposalError,
  OFFICIAL_WEEKDAYS,
  validateWeeklyPedagogicalProgression,
  validateActivityProgressionCorrespondence,
  WeeklyPedagogicalProgression,
  ProposedActivity,
} from '../WeeklyPlanningProposalSource';
import { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R12.5-D.4.11 — Activity-Embedded Progression Authority (Tests 1–30)', () => {
  const sampleLactantesARoom: Room = Object.freeze({
    roomId: 'room-lactantes-a-d411',
    name: 'Lactantes A',
    minAgeMonths: 0,
    maxAgeMonths: 6,
    capacity: 10,
  });

  const sampleMaterialTable = createRequestScopedMaterialTable([
    'pelotas suaves',
    'telas de diferentes texturas',
    'música instrumental',
  ]);

  const createValidRequest = (): WeeklyPlanningProposalRequest => ({
    planningId: 'plan-cabo-d411-001',
    centerId: 'center-001',
    room: sampleLactantesARoom,
    modality: 'DIRECT',
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    currentContext: {
      observations: 'Lactantes receptivos ante estímulos auditivos suaves y exploración táctil.',
      identifiedNeeds: 'Estimulación del tono muscular, sostén cefálico y apego seguro.',
      specialSituations: 'Ninguna',
      availableMaterials: 'pelotas suaves, telas de diferentes texturas, música instrumental',
    },
  });

  /**
   * Constructs a valid provider response under the D.4.11 contract:
   * 1. Top-level weeklyFocus.
   * 2. days array with 5 weekdays.
   * 3. Each activity contains its own bounded progression metadata.
   * 4. ZERO root progression.experiences array.
   * 5. ZERO provider-owned experienceId / revisitsExperienceId.
   */
  const createValidProviderResponse = (): Record<string, unknown> => {
    const progressionTemplates = [
      // Monday
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar orientación de la mirada hacia la fuente sonora',
      },
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar respuesta y relajación corporal al contacto con texturas',
      },
      // Tuesday
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: 'FAMILIARIZATION',
        variationDimensions: ['ADULT_MEDIATION'],
        observationTarget: 'Observar mayor calma y reconocimiento auditivo ante nanas conocidas',
      },
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar pataleo libre y movimiento armonioso de piernas',
      },
      // Wednesday
      {
        role: 'VARY',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: null,
        variationDimensions: ['ADULT_MEDIATION'],
        observationTarget: 'Observar seguimiento visual ante variaciones tonales de la voz',
      },
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: 'VARIATION',
        variationDimensions: ['SENSORY_EXPERIENCE', 'ADULT_MEDIATION'],
        observationTarget: 'Observar respuesta táctil diferenciada con ritmo más lento',
      },
      // Thursday
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: 'RESPONSE_OBSERVATION',
        variationDimensions: ['OBSERVATION_FOCUS'],
        observationTarget: 'Observar intentos de emisión vocal o sonrisas dirigidas',
      },
      {
        role: 'DEEPEN_OR_ADAPT',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar tolerancia y postura cómoda durante breve tiempo prono',
      },
      // Friday
      {
        role: 'OBSERVE_OR_CONSOLIDATE',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar disfrute compartido y calma en la interacción afectiva',
      },
      {
        role: 'OBSERVE_OR_CONSOLIDATE',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar serenidad y relajación como cierre de la semana',
      },
    ];

    const days = OFFICIAL_WEEKDAYS.map((dayOfWeek, dayIdx) => ({
      dayOfWeek,
      date: '2026-08-24',
      activities: [
        {
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Vínculo afectivo y estimulación auditiva mediante nanas cantadas',
          proceduralAction:
            'Cantar nanas tradicionales con voz cálida y suave manteniendo contacto visual amoroso.',
          durationMinutes: 15,
          materialRefs: [],
          progression: progressionTemplates[dayIdx * 2],
        },
        {
          category: dayIdx % 2 === 0 ? 'AMBIENTES DE APRENDIZAJE' : 'ACTIVACIÓN FÍSICA',
          objective:
            dayIdx % 2 === 0
              ? 'Exploración sensorial táctil acompañada sobre superficie acolchada'
              : 'Pataleo libre y flexión guiada para estimulación corporal temprana',
          proceduralAction:
            dayIdx % 2 === 0
              ? 'Acompañar al lactante a rozar suavemente {material} respetando su ritmo.'
              : 'Acompañar movimientos de flexión y extensión de piernas al ritmo de nanas.',
          durationMinutes: 10,
          materialRefs: dayIdx % 2 === 0 ? ['MAT-01'] : [],
          progression: progressionTemplates[dayIdx * 2 + 1],
        },
      ],
    }));

    return {
      weeklyFocus: 'Vínculo afectivo, discriminación auditiva y exploración sensorial táctil',
      days,
    };
  };

  // -------------------------------------------------------------------------
  // TEST 1 — ACTIVITY-LOCAL PROGRESSION ACCEPTED
  // -------------------------------------------------------------------------
  it('TEST 1 — ACTIVITY-LOCAL PROGRESSION ACCEPTED: valid provider activity with valid progression metadata passes', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);
    expect(response.progression).toBeDefined();
    expect(response.progression?.weeklyFocus).toBe(
      'Vínculo afectivo, discriminación auditiva y exploración sensorial táctil'
    );
    expect(response.progression?.experiences).toHaveLength(10);
    expect(response.progression?.experiences[0].role).toBe('EXPLORE');
  });

  // -------------------------------------------------------------------------
  // TEST 2 — NO PROVIDER PARALLEL EXPERIENCES ARRAY
  // -------------------------------------------------------------------------
  it('TEST 2 — NO PROVIDER PARALLEL EXPERIENCES ARRAY: fails closed when provider attempts to emit legacy top-level progression.experiences', async () => {
    const rawOutput = createValidProviderResponse();
    // Injects legacy top-level progression object
    (rawOutput as any).progression = {
      weeklyFocus: 'Focus',
      experiences: [],
    };

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /unexpected or forbidden root property 'progression'/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 3 — MISSING ACTIVITY PROGRESSION
  // -------------------------------------------------------------------------
  it('TEST 3 — MISSING ACTIVITY PROGRESSION: fails closed when one activity lacks required progression metadata', async () => {
    const rawOutput = createValidProviderResponse();
    delete (rawOutput['days'] as any[])[0].activities[1].progression;

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /missing required progression metadata/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 4 — INVALID ACTIVITY PROGRESSION ROLE
  // -------------------------------------------------------------------------
  it('TEST 4 — INVALID ACTIVITY PROGRESSION ROLE: fails closed on unknown composition role in activity progression', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[0].activities[0].progression.role = 'SUPER_HEROIC_ADVANCEMENT';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /Unknown composition role 'SUPER_HEROIC_ADVANCEMENT'/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 5 — ONE CANONICAL ENTRY PER ACTIVITY
  // -------------------------------------------------------------------------
  it('TEST 5 — ONE CANONICAL ENTRY PER ACTIVITY: N accepted activities produces exactly N canonical progression entries', async () => {
    const rawOutput = createValidProviderResponse();
    const totalActivities = (rawOutput['days'] as any[]).reduce(
      (sum, day) => sum + day.activities.length,
      0
    );

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response.progression?.experiences).toHaveLength(totalActivities);
  });

  // -------------------------------------------------------------------------
  // TEST 6 — DETERMINISTIC EXPERIENCE IDS
  // -------------------------------------------------------------------------
  it('TEST 6 — DETERMINISTIC EXPERIENCE IDS: same provider response projected twice produces identical canonical IDs', async () => {
    const rawOutput1 = createValidProviderResponse();
    const rawOutput2 = createValidProviderResponse();

    const mockExecutor1: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput1) };
    const mockExecutor2: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput2) };

    const source1 = new AIWeeklyPlanningProposalSource(mockExecutor1);
    const source2 = new AIWeeklyPlanningProposalSource(mockExecutor2);

    const res1 = await source1.propose(createValidRequest());
    const res2 = await source2.propose(createValidRequest());

    const ids1 = res1.progression?.experiences.map((e) => e.experienceId);
    const ids2 = res2.progression?.experiences.map((e) => e.experienceId);

    expect(ids1).toEqual(ids2);
  });

  // -------------------------------------------------------------------------
  // TEST 7 — UNIQUE EXPERIENCE IDS
  // -------------------------------------------------------------------------
  it('TEST 7 — UNIQUE EXPERIENCE IDS: all canonical experience IDs across the week are strictly unique', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    const expIds = response.progression?.experiences.map((e) => e.experienceId) ?? [];
    const uniqueIds = new Set(expIds);

    expect(expIds.length).toBeGreaterThan(0);
    expect(uniqueIds.size).toBe(expIds.length);
  });

  // -------------------------------------------------------------------------
  // TEST 8 — PROVIDER experienceId INJECTION
  // -------------------------------------------------------------------------
  it('TEST 8 — PROVIDER experienceId INJECTION: fails closed when provider attempts to inject experienceId into activity or progression', async () => {
    // 1. Injected into activity
    const rawOutputAct = createValidProviderResponse();
    (rawOutputAct['days'] as any[])[0].activities[0].experienceId = 'EXP-INJECTED-001';

    const mockExecutorAct: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutputAct) };
    const sourceAct = new AIWeeklyPlanningProposalSource(mockExecutorAct);
    await expect(sourceAct.propose(createValidRequest())).rejects.toThrow(
      /contains unexpected or forbidden property 'experienceId'/
    );

    // 2. Injected into activity progression
    const rawOutputProg = createValidProviderResponse();
    (rawOutputProg['days'] as any[])[0].activities[0].progression.experienceId = 'EXP-INJECTED-002';

    const mockExecutorProg: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutputProg) };
    const sourceProg = new AIWeeklyPlanningProposalSource(mockExecutorProg);
    await expect(sourceProg.propose(createValidRequest())).rejects.toThrow(
      /contains unexpected or forbidden property 'experienceId'/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 9 — PROVIDER revisitsExperienceId INJECTION
  // -------------------------------------------------------------------------
  it('TEST 9 — PROVIDER revisitsExperienceId INJECTION: fails closed when provider attempts to inject revisitsExperienceId', async () => {
    // 1. Injected into activity
    const rawOutputAct = createValidProviderResponse();
    (rawOutputAct['days'] as any[])[1].activities[0].revisitsExperienceId = 'EXP-D1-A1';

    const mockExecutorAct: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutputAct) };
    const sourceAct = new AIWeeklyPlanningProposalSource(mockExecutorAct);
    await expect(sourceAct.propose(createValidRequest())).rejects.toThrow(
      /contains unexpected or forbidden property 'revisitsExperienceId'/
    );

    // 2. Injected into activity progression
    const rawOutputProg = createValidProviderResponse();
    (rawOutputProg['days'] as any[])[1].activities[0].progression.revisitsExperienceId = 'EXP-D1-A1';

    const mockExecutorProg: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutputProg) };
    const sourceProg = new AIWeeklyPlanningProposalSource(mockExecutorProg);
    await expect(sourceProg.propose(createValidRequest())).rejects.toThrow(
      /contains unexpected or forbidden property 'revisitsExperienceId'/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 10 — VALID REVISIT SLOT
  // -------------------------------------------------------------------------
  it('TEST 10 — VALID REVISIT SLOT: later activity-local progression referencing earlier slot resolves revisitsExperienceId correctly', async () => {
    const rawOutput = createValidProviderResponse();
    // Tuesday activity 1 revisits Monday activity 1 via slot D1_A1
    (rawOutput['days'] as any[])[1].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D1_A1',
      repetitionPurpose: 'FAMILIARIZATION',
      variationDimensions: ['ADULT_MEDIATION'],
      observationTarget: 'Observar mayor familiaridad',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    const tuesdayExp = response.progression?.experiences[2];
    expect(tuesdayExp?.role).toBe('REVISIT');
    expect(tuesdayExp?.revisitsExperienceId).toBe('EXP-D1-A1');
  });

  // -------------------------------------------------------------------------
  // TEST 11 — SELF REVISIT
  // -------------------------------------------------------------------------
  it('TEST 11 — SELF REVISIT: fails closed when activity references its own slot', async () => {
    const rawOutput = createValidProviderResponse();
    // Monday activity 1 attempts to revisit D1_A1 (itself)
    (rawOutput['days'] as any[])[0].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D1_A1',
      repetitionPurpose: 'REINFORCEMENT',
      variationDimensions: ['ADULT_MEDIATION'],
      observationTarget: 'Self revisit target',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /cannot revisit its own slot/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 12 — FORWARD REVISIT
  // -------------------------------------------------------------------------
  it('TEST 12 — FORWARD REVISIT: fails closed when earlier activity references a future slot', async () => {
    const rawOutput = createValidProviderResponse();
    // Monday activity 1 attempts to revisit Friday activity 1 (D5_A1)
    (rawOutput['days'] as any[])[0].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D5_A1',
      repetitionPurpose: 'REINFORCEMENT',
      variationDimensions: ['ADULT_MEDIATION'],
      observationTarget: 'Forward revisit target',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /revisits future slot/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 13 — UNKNOWN REVISIT SLOT
  // -------------------------------------------------------------------------
  it('TEST 13 — UNKNOWN REVISIT SLOT: fails closed when activity references a non-existent slot', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D9_A9',
      repetitionPurpose: 'FAMILIARIZATION',
      variationDimensions: ['ADULT_MEDIATION'],
      observationTarget: 'Unknown slot target',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /unknown or invalid slot reference/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 14 — REVISIT WITHOUT TARGET
  // -------------------------------------------------------------------------
  it('TEST 14 — REVISIT WITHOUT TARGET: fails closed when REVISIT role has null revisitsSlot', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: null,
      repetitionPurpose: 'FAMILIARIZATION',
      variationDimensions: ['ADULT_MEDIATION'],
      observationTarget: 'Missing target',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /missing required revisitsSlot reference/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 15 — REVISIT PURPOSE REQUIRED
  // -------------------------------------------------------------------------
  it('TEST 15 — REVISIT PURPOSE REQUIRED: fails closed when REVISIT role lacks repetitionPurpose', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D1_A1',
      repetitionPurpose: null,
      variationDimensions: ['ADULT_MEDIATION'],
      observationTarget: 'Observar familiaridad',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /lacks required repetitionPurpose/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 16 — VARIATION DIMENSION REQUIRED
  // -------------------------------------------------------------------------
  it('TEST 16 — VARIATION DIMENSION REQUIRED: fails closed when REVISIT role declares empty variationDimensions', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D1_A1',
      repetitionPurpose: 'FAMILIARIZATION',
      variationDimensions: [],
      observationTarget: 'Observar familiaridad',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /declares no meaningful variationDimensions/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 17 — NON-REVISIT VALID WITHOUT TARGET
  // -------------------------------------------------------------------------
  it('TEST 17 — NON-REVISIT VALID WITHOUT TARGET: passes when EXPLORE/VARY/etc. have null revisitsSlot', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[0].activities[0].progression = {
      role: 'EXPLORE',
      revisitsSlot: null,
      repetitionPurpose: null,
      variationDimensions: null,
      observationTarget: 'Observar atención auditiva a la nanas',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response).toBeDefined();
    expect(response.progression?.experiences[0].role).toBe('EXPLORE');
    expect(response.progression?.experiences[0].revisitsExperienceId).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TEST 18 — WEEKLY FOCUS PRESERVED
  // -------------------------------------------------------------------------
  it('TEST 18 — WEEKLY FOCUS PRESERVED: trusted canonical WeeklyPedagogicalProgression receives bounded weeklyFocus', async () => {
    const rawOutput = createValidProviderResponse();
    rawOutput['weeklyFocus'] = 'Cuidado cariñoso, lenguaje y juego exploratorio';

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response.progression?.weeklyFocus).toBe(
      'Cuidado cariñoso, lenguaje y juego exploratorio'
    );
  });

  // -------------------------------------------------------------------------
  // TEST 19 — CANONICAL D.4.1 VALIDATOR STILL PASSES
  // -------------------------------------------------------------------------
  it('TEST 19 — CANONICAL D.4.1 VALIDATOR STILL PASSES: valid projected output passes canonical validator', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(() => validateWeeklyPedagogicalProgression(response.progression!)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // TEST 20 — CANONICAL BIJECTION STILL PASSES
  // -------------------------------------------------------------------------
  it('TEST 20 — CANONICAL BIJECTION STILL PASSES: 1:1 correspondence between canonical activities and progression passes', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(() =>
      validateActivityProgressionCorrespondence(
        response.days,
        response.progression!
      )
    ).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // TEST 21 — DEFENSE-IN-DEPTH MISSING ENTRY REMAINS
  // -------------------------------------------------------------------------
  it('TEST 21 — DEFENSE-IN-DEPTH MISSING ENTRY REMAINS: malformed internal canonical fixture with missing progression entry rejects', () => {
    const activities: ProposedActivity[] = [
      {
        experienceId: 'EXP-D1-A1',
        title: 'Lectura',
        description: 'Lectura de cuento breve',
        category: 'LECTURA EN VOZ ALTA',
        durationMinutes: 15,
        materials: [],
      },
      {
        experienceId: 'EXP-D1-A2',
        title: 'Música',
        description: 'Música instrumental suave',
        category: 'EXPERIENCIAS ARTÍSTICAS',
        durationMinutes: 10,
        materials: [],
      },
    ];

    const days = [
      {
        dayOfWeek: 'MONDAY' as const,
        activities,
      },
    ];

    // Only 1 progression entry for 2 activities
    const malformedProgression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque de prueba',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar atención visual',
        },
      ],
    };

    expect(() =>
      validateActivityProgressionCorrespondence(days, malformedProgression)
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringMatching(/does not match progression experiences count|ACTIVITY_PROGRESSION_ENTRY_MISSING/i),
      })
    );
  });

  // -------------------------------------------------------------------------
  // TEST 22 — DEFENSE-IN-DEPTH DUPLICATE ID REMAINS
  // -------------------------------------------------------------------------
  it('TEST 22 — DEFENSE-IN-DEPTH DUPLICATE ID REMAINS: malformed internal canonical fixture with duplicate ID rejects', () => {
    const malformedProgression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración sensorial',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar respuesta auditiva',
        },
        {
          experienceId: 'EXP-D1-A1', // Duplicate ID
          role: 'EXPLORE',
          observationTarget: 'Observar respuesta táctil',
        },
      ],
    };

    expect(() => validateWeeklyPedagogicalProgression(malformedProgression)).toThrowError(
      expect.objectContaining({
        message: expect.stringMatching(/DUPLICATE_ACTIVITY_EXPERIENCE_ID|duplicate experienceId/i),
      })
    );
  });

  // -------------------------------------------------------------------------
  // TEST 23 — FIFTH LIGHT ROOT-CAUSE REGRESSION
  // -------------------------------------------------------------------------
  it('TEST 23 — FIFTH LIGHT ROOT-CAUSE REGRESSION: provider cannot independently omit a separate progression counterpart because progression is single-source per activity', async () => {
    // In Fifth Light, failureCode: INVALID_CANONICAL_PROPOSAL, diagnosticSubtype: ACTIVITY_PROGRESSION_ENTRY_MISSING
    // occurred because the provider generated days[].activities and progression.experiences[] as separate arrays.
    // In D.4.11, the provider supplies progression metadata directly on each activity.
    const rawOutput = createValidProviderResponse();

    // Verify raw provider response has NO top-level progression array
    expect((rawOutput as any).progression).toBeUndefined();

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    const totalActivities = response.days.flatMap((d) => d.activities).length;
    expect(response.progression?.experiences.length).toBe(totalActivities);

    // Each activity's experienceId maps 1:1 to a progression entry
    for (const act of response.days.flatMap((d) => d.activities)) {
      const match = response.progression?.experiences.find((e) => e.experienceId === act.experienceId);
      expect(match).toBeDefined();
    }
  });

  // -------------------------------------------------------------------------
  // TEST 24 — FOURTH LIGHT #2 ROOT-CAUSE REGRESSION
  // -------------------------------------------------------------------------
  it('TEST 24 — FOURTH LIGHT #2 ROOT-CAUSE REGRESSION: duplicate-ID root cause remains structurally removed from provider authority', async () => {
    // In Fourth Light #2, provider hallucinated duplicate IDs across separate days.
    // In D.4.8 and D.4.11, server controls technical experienceId assignment deterministically.
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    const ids = response.progression?.experiences.map((e) => e.experienceId) ?? [];
    expect(ids).toEqual([
      'EXP-D1-A1', 'EXP-D1-A2',
      'EXP-D2-A1', 'EXP-D2-A2',
      'EXP-D3-A1', 'EXP-D3-A2',
      'EXP-D4-A1', 'EXP-D4-A2',
      'EXP-D5-A1', 'EXP-D5-A2',
    ]);
  });

  // -------------------------------------------------------------------------
  // TEST 25 — MATERIAL AUTHORITY NOT EXPANDED
  // -------------------------------------------------------------------------
  it('TEST 25 — MATERIAL AUTHORITY NOT EXPANDED: fails closed when progression metadata attempts to authorize or declare materials', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[0].activities[0].progression.materials = ['sonajas suaves'];

    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /cannot define materials; materialRefs is the sole material authority/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 26 — GOVERNANCE AUTHORITY NOT EXPANDED
  // -------------------------------------------------------------------------
  it('TEST 26 — GOVERNANCE AUTHORITY NOT EXPANDED: fails closed when progression metadata introduces governance or persistence properties', async () => {
    const forbiddenFields = [
      'approvalStatus',
      'status',
      'evaluation',
      'pdaId',
      'lifecycle',
      'persistence',
    ];

    for (const field of forbiddenFields) {
      const rawOutput = createValidProviderResponse();
      (rawOutput['days'] as any[])[0].activities[0].progression[field] = 'FORBIDDEN_VALUE';

      const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
      const source = new AIWeeklyPlanningProposalSource(mockExecutor);

      await expect(source.propose(createValidRequest())).rejects.toThrow(
        new RegExp(`contains forbidden governance property '${field}'|unexpected or forbidden property '${field}'`)
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 27 — ONE PROVIDER INVOCATION
  // -------------------------------------------------------------------------
  it('TEST 27 — ONE PROVIDER INVOCATION: propose() dispatches exactly one AI executor call', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await source.propose(createValidRequest());

    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TEST 28 — ZERO PERSISTENCE
  // -------------------------------------------------------------------------
  it('TEST 28 — ZERO PERSISTENCE: progression projection causes zero database or lifecycle mutation', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect((response as any).id).toBeUndefined();
    expect((response as any).saved).toBeUndefined();
    expect((response as any).status).toBeUndefined();
    expect((response as any).lifecycle).toBeUndefined();
    expect((response as any).persistence).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TEST 29 — PRIVACY
  // -------------------------------------------------------------------------
  it('TEST 29 — PRIVACY: canonical experience IDs and progression projection contain no UID, child/family data, Anita text, or room text', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(rawOutput) };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    for (const exp of response.progression!.experiences) {
      // Must match EXP-D{d}-A{a} pattern only
      expect(exp.experienceId).toMatch(/^EXP-D[1-5]-A[1-9][0-9]*$/);
      expect(exp.experienceId).not.toContain('secret-room-db-uuid-999');
      expect(exp.experienceId).not.toContain('Lactantes');
      expect(exp.experienceId).not.toContain('Anita');
      expect(exp.experienceId).not.toContain('plan-cabo-d411-001');

      if (exp.revisitsExperienceId) {
        expect(exp.revisitsExperienceId).toMatch(/^EXP-D[1-5]-A[1-9][0-9]*$/);
      }
    }
  });

  // -------------------------------------------------------------------------
  // TEST 30 — ACCEPT/REJECT INTENT
  // -------------------------------------------------------------------------
  it('TEST 30 — ACCEPT/REJECT INTENT: valid pedagogical metadata accepted, invalid rejected; only structural ownership moved', async () => {
    // 1. Valid: Accepted
    const validOutput = createValidProviderResponse();
    const validExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(validOutput) };
    const validSource = new AIWeeklyPlanningProposalSource(validExecutor);
    const validRes = await validSource.propose(createValidRequest());
    expect(validRes).toBeDefined();

    // 2. Missing observationTarget string (empty string): Rejected
    const emptyTargetOutput = createValidProviderResponse();
    (emptyTargetOutput['days'] as any[])[0].activities[0].progression.observationTarget = '   ';
    const badExecutor: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(emptyTargetOutput) };
    const badSource = new AIWeeklyPlanningProposalSource(badExecutor);
    await expect(badSource.propose(createValidRequest())).rejects.toThrow(
      /observationTarget must be a non-empty string/
    );

    // 3. Fabricated completed outcome in observationTarget: Rejected
    const completedOutcomeOutput = createValidProviderResponse();
    (completedOutcomeOutput['days'] as any[])[0].activities[0].progression.observationTarget =
      'El lactante logró gatear y dominar el movimiento con éxito total.';
    const badExecutor2: WeeklyPlanningAIExecutor = { execute: vi.fn().mockResolvedValue(completedOutcomeOutput) };
    const badSource2 = new AIWeeklyPlanningProposalSource(badExecutor2);
    await expect(badSource2.propose(createValidRequest())).rejects.toThrow(
      /fabricated completed outcome/
    );
  });
});
