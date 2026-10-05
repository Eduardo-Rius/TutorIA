/**
 * H1R12.5-D.4.2 — Provider Weekly Progression Execution Test Matrix (Tests 1–20)
 *
 * Operationalizes the approved H1R12.5-D.4.1 progression contract at the provider boundary.
 * Verifies strict 1:1 bidirectional activity <-> progression correspondence,
 * intentional repetition enforcement, flexible progression arc, prospective observation guard,
 * single-invocation execution, governance/material enclosure, and Third Light structural regression.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  InvalidWeeklyPlanningProposalError,
  OFFICIAL_WEEKDAYS,
  WeeklyPedagogicalProgression,
} from '../WeeklyPlanningProposalSource';
import { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R12.5-D.4.2 — Provider Weekly Progression Execution (Tests 1–20)', () => {
  const sampleLactantesARoom: Room = Object.freeze({
    roomId: 'secret-room-db-uuid-999',
    name: 'Lactantes A',
    minAgeMonths: 0,
    maxAgeMonths: 6,
    capacity: 10,
  });

  const createValidRequest = (): WeeklyPlanningProposalRequest => ({
    planningId: 'plan-cabo-d42-001',
    centerId: 'center-001',
    room: sampleLactantesARoom,
    modality: 'DIRECT',
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    currentContext: {
      observations: 'Lactantes muestran interés en estímulos sonoros suaves y seguimiento visual.',
      identifiedNeeds: 'Fortalecer el sostén cefálico y la coordinación visual-auditiva.',
      specialSituations: 'Ninguna',
      availableMaterials: 'pelotas suaves, telas de diferentes texturas, música instrumental',
    },
  });

  interface ActivityFixture {
    category: string;
    objective: string;
    proceduralAction: string;
    durationMinutes: number;
    materialRefs: string[];
    progression?: ProgressionExperienceFixture;
  }

  interface ProgressionExperienceFixture {
    role: 'EXPLORE' | 'REVISIT' | 'VARY' | 'DEEPEN_OR_ADAPT' | 'OBSERVE_OR_CONSOLIDATE';
    revisitsSlot: string | null;
    repetitionPurpose:
      | 'REINFORCEMENT'
      | 'FAMILIARIZATION'
      | 'VARIATION'
      | 'PROGRESSION'
      | 'RESPONSE_OBSERVATION'
      | null;
    variationDimensions:
      | (
          | 'PEDAGOGICAL_INTENT'
          | 'INTERACTION_MODE'
          | 'ADULT_MEDIATION'
          | 'CHILD_AGENCY'
          | 'GROUP_ORGANIZATION'
          | 'SENSORY_EXPERIENCE'
          | 'OBSERVATION_FOCUS'
        )[]
      | null;
    observationTarget: string | null;
  }

  const createValidFullWeekMockResponse = (): Record<string, unknown> => {
    const progressionExperiences: ProgressionExperienceFixture[] = [];

    const days = OFFICIAL_WEEKDAYS.map((dayOfWeek, dayIdx) => {
      if (dayIdx === 0) {
        // Monday: initial explorations
        progressionExperiences.push(
          {
            role: 'EXPLORE',
            revisitsSlot: null,
            repetitionPurpose: null,
            variationDimensions: null,
            observationTarget: 'Observar si orienta la mirada y responde con sonrisas a la voz',
          },
          {
            role: 'EXPLORE',
            revisitsSlot: null,
            repetitionPurpose: null,
            variationDimensions: null,
            observationTarget: 'Observar respuesta y acomodo postural al contacto con texturas',
          }
        );
      } else if (dayIdx === 1) {
        // Tuesday: Revisit reading with familiarization, explore movement
        progressionExperiences.push(
          {
            role: 'REVISIT',
            revisitsSlot: 'D1_A1',
            repetitionPurpose: 'FAMILIARIZATION',
            variationDimensions: ['ADULT_MEDIATION'],
            observationTarget: 'Observar reconocimiento de rimas y nanas suaves',
          },
          {
            role: 'EXPLORE',
            revisitsSlot: null,
            repetitionPurpose: null,
            variationDimensions: null,
            observationTarget: 'Observar pataleo libre y relajación muscular',
          }
        );
      } else if (dayIdx === 2) {
        // Wednesday: Vary reading, revisit sensory from Monday
        progressionExperiences.push(
          {
            role: 'VARY',
            revisitsSlot: 'D1_A1',
            repetitionPurpose: null,
            variationDimensions: ['ADULT_MEDIATION'],
            observationTarget: 'Observar seguimiento visual de modulaciones de voz y gestos',
          },
          {
            role: 'REVISIT',
            revisitsSlot: 'D1_A2',
            repetitionPurpose: 'VARIATION',
            variationDimensions: ['SENSORY_EXPERIENCE', 'ADULT_MEDIATION'],
            observationTarget: 'Observar respuesta táctil al ritmo pausado de contacto',
          }
        );
      } else if (dayIdx === 3) {
        // Thursday: Revisit reading with observation focus, deepen movement
        progressionExperiences.push(
          {
            role: 'REVISIT',
            revisitsSlot: 'D1_A1',
            repetitionPurpose: 'RESPONSE_OBSERVATION',
            variationDimensions: ['OBSERVATION_FOCUS'],
            observationTarget: 'Observar emisión de gorjeos o balbuceos en pausas vocales',
          },
          {
            role: 'DEEPEN_OR_ADAPT',
            revisitsSlot: 'D1_A2',
            repetitionPurpose: null,
            variationDimensions: null,
            observationTarget: 'Observar comodidad y tiempo de sostén en posición boca abajo',
          }
        );
      } else {
        // Friday: Consolidate
        progressionExperiences.push(
          {
            role: 'OBSERVE_OR_CONSOLIDATE',
            revisitsSlot: 'D1_A1',
            repetitionPurpose: null,
            variationDimensions: null,
            observationTarget: 'Observar relajación general y calma afectiva compartida',
          },
          {
            role: 'OBSERVE_OR_CONSOLIDATE',
            revisitsSlot: 'D1_A2',
            repetitionPurpose: null,
            variationDimensions: null,
            observationTarget: 'Observar interacción tranquila y cierre semanal sereno',
          }
        );
      }

      const activities: ActivityFixture[] = [
        {
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Vínculo afectivo y estimulación auditiva mediante nanas cantadas',
          proceduralAction:
            'Cantar nanas tradicionales con voz cálida y suave manteniendo contacto visual amoroso.',
          durationMinutes: 15,
          materialRefs: [],
          progression: progressionExperiences[dayIdx * 2],
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
          progression: progressionExperiences[dayIdx * 2 + 1],
        },
      ];

      return {
        dayOfWeek,
        date: '2026-08-24',
        activities,
      };
    });

    return {
      weeklyFocus: 'Vínculo afectivo, discriminación auditiva y exploración sensorial táctil',
      days,
    };
  };

  // -------------------------------------------------------------------------
  // TEST 1 — VALID FULL-WEEK PROGRESSION RESPONSE
  // -------------------------------------------------------------------------
  it('TEST 1 — VALID FULL-WEEK PROGRESSION RESPONSE: passes with 5 weekdays, density, weeklyFocus, complete progression, and 1:1 correspondence', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);
    const totalActivities = response.days.reduce((acc, d) => acc + d.activities.length, 0);
    expect(totalActivities).toBe(10);
    expect(response.progression).toBeDefined();
    expect(response.progression?.weeklyFocus).toBe(
      'Vínculo afectivo, discriminación auditiva y exploración sensorial táctil'
    );
    expect(response.progression?.experiences).toHaveLength(10);
  });

  // -------------------------------------------------------------------------
  // TEST 2 — EVERY ACTIVITY HAS EXACTLY ONE EXPERIENCE ID
  // -------------------------------------------------------------------------
  it('TEST 2 — EVERY ACTIVITY HAS EXACTLY ONE EXPERIENCE ID: fails closed if progression metadata is removed for an activity', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    // Remove progression metadata from one activity
    delete (rawOutput['days'] as any[])[0].activities[0].progression;

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /missing required progression metadata/i
    );
  });

  // -------------------------------------------------------------------------
  // TEST 3 — ORPHAN PROGRESSION EXPERIENCE
  // -------------------------------------------------------------------------
  it('TEST 3 — ORPHAN PROGRESSION EXPERIENCE: fails closed if progression contains invalid or unknown revisit reference', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D9_A9';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /unknown or invalid slot reference 'D9_A9'/i
    );
  });

  // -------------------------------------------------------------------------
  // TEST 4 — DUPLICATE EXPERIENCE ID
  // -------------------------------------------------------------------------
  it('TEST 4 — DUPLICATE EXPERIENCE ID: fails closed if provider attempts to inject experience identity', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    (rawOutput['days'] as any[])[1].activities[0].experienceId = 'exp-monday-1';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /contains unexpected or forbidden property 'experienceId'/i
    );
  });

  // -------------------------------------------------------------------------
  // TEST 5 — INTENTIONAL REVISIT
  // -------------------------------------------------------------------------
  it('TEST 5 — INTENTIONAL REVISIT: passes when later experience revisits earlier experience with valid purpose and variation dimension', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    // Tuesday reading revisits Monday reading with valid purpose and dimension
    const tuesdayReadingExp = (rawOutput['days'] as any[])[1].activities[0].progression;
    expect(tuesdayReadingExp.role).toBe('REVISIT');
    expect(tuesdayReadingExp.revisitsSlot).toBe('D1_A1');
    expect(tuesdayReadingExp.repetitionPurpose).toBe('FAMILIARIZATION');
    expect(tuesdayReadingExp.variationDimensions).toEqual(['ADULT_MEDIATION']);

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response).toBeDefined();
    expect(response.progression?.experiences[2].role).toBe('REVISIT');
    expect(response.progression?.experiences[2].revisitsExperienceId).toBe('EXP-D1-A1');
  });

  // -------------------------------------------------------------------------
  // TEST 6 — REVISIT WITHOUT PURPOSE
  // -------------------------------------------------------------------------
  it('TEST 6 — REVISIT WITHOUT PURPOSE: fails closed when REVISIT role lacks repetitionPurpose', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression.repetitionPurpose = null;

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /lacks required repetitionPurpose/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 7 — REVISIT WITHOUT VARIATION/OBSERVATION DIMENSION
  // -------------------------------------------------------------------------
  it('TEST 7 — REVISIT WITHOUT VARIATION/OBSERVATION DIMENSION: fails closed when REVISIT lacks variationDimensions', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression.variationDimensions = [];

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /declares no meaningful variationDimensions/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 8 — FORWARD REFERENCE
  // -------------------------------------------------------------------------
  it('TEST 8 — FORWARD REFERENCE: fails closed when Tuesday experience references Friday experience', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    // Tuesday reading attempts to revisit Friday reading
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D5_A1';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /must reference an earlier experience/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 9 — SELF REFERENCE
  // -------------------------------------------------------------------------
  it('TEST 9 — SELF REFERENCE: fails closed when experience revisits itself', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    // Tuesday reading attempts to revisit itself
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D2_A1';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /cannot revisit its own slot/i
    );
  });

  // -------------------------------------------------------------------------
  // TEST 10 — FLEXIBLE ROLE ORDER
  // -------------------------------------------------------------------------
  it('TEST 10 — FLEXIBLE ROLE ORDER: passes when week does NOT follow monotonic weekday sequence', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    // Monday activity 2 varies activity 1; Tuesday activity 1 consolidates Monday; Friday starts with EXPLORE
    (rawOutput['days'] as any[])[0].activities[1].progression.role = 'VARY';
    (rawOutput['days'] as any[])[0].activities[1].progression.revisitsSlot = 'D1_A1';
    (rawOutput['days'] as any[])[0].activities[1].progression.variationDimensions = ['ADULT_MEDIATION'];
    (rawOutput['days'] as any[])[1].activities[0].progression.role = 'OBSERVE_OR_CONSOLIDATE';
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D1_A1';
    (rawOutput['days'] as any[])[1].activities[1].progression.role = 'EXPLORE';
    (rawOutput['days'] as any[])[1].activities[1].progression.revisitsSlot = null;
    (rawOutput['days'] as any[])[1].activities[1].progression.repetitionPurpose = null;
    (rawOutput['days'] as any[])[1].activities[1].progression.variationDimensions = null;
    (rawOutput['days'] as any[])[4].activities[0].progression.role = 'EXPLORE';
    (rawOutput['days'] as any[])[4].activities[0].progression.revisitsSlot = null;
    (rawOutput['days'] as any[])[4].activities[0].progression.repetitionPurpose = null;
    (rawOutput['days'] as any[])[4].activities[0].progression.variationDimensions = null;
    (rawOutput['days'] as any[])[4].activities[1].progression.role = 'DEEPEN_OR_ADAPT';
    (rawOutput['days'] as any[])[4].activities[1].progression.revisitsSlot = 'D1_A2';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response).toBeDefined();
    expect(response.progression?.experiences[1].role).toBe('VARY');
    expect(response.progression?.experiences[8].role).toBe('EXPLORE');
    expect(response.progression?.experiences[9].role).toBe('DEEPEN_OR_ADAPT');
  });

  // -------------------------------------------------------------------------
  // TEST 11 — NO FORCED NOVELTY
  // -------------------------------------------------------------------------
  it('TEST 11 — NO FORCED NOVELTY: passes when same material/stimulus is intentionally revisited with valid metadata', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    // Thursday activity 2 intentionally revisits Monday activity 2 with same MAT-01
    (rawOutput['days'] as any[])[3].activities[1].materialRefs = ['MAT-01'];
    (rawOutput['days'] as any[])[3].activities[1].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D1_A2',
      repetitionPurpose: 'REINFORCEMENT',
      variationDimensions: ['SENSORY_EXPERIENCE', 'ADULT_MEDIATION'],
      observationTarget: 'Observar mayor familiaridad y seguridad al interactuar con la textura',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response).toBeDefined();
    expect(response.progression?.experiences[7].role).toBe('REVISIT');
    expect(response.progression?.experiences[7].revisitsExperienceId).toBe('EXP-D1-A2');
  });

  // -------------------------------------------------------------------------
  // TEST 12 — SYNONYM-ONLY PROGRESSION CLAIM
  // -------------------------------------------------------------------------
  it('TEST 12 — SYNONYM-ONLY PROGRESSION CLAIM: fails closed when provider marks revisit without valid purpose/dimension (metadata invalid, no text comparison)', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    // Provider changes prose synonyms but leaves repetitionPurpose null
    (rawOutput['days'] as any[])[1].activities[0].objective = 'Vínculo afectivo con rimas orales';
    (rawOutput['days'] as any[])[1].activities[0].progression.repetitionPurpose = null;

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /lacks required repetitionPurpose/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 13 — PROSPECTIVE OBSERVATION
  // -------------------------------------------------------------------------
  it('TEST 13 — PROSPECTIVE OBSERVATION: valid prospective phrasing passes, synthetic retrospective outcome fails closed', async () => {
    // 1. Valid prospective target passes
    const validRawOutput = createValidFullWeekMockResponse();
    (validRawOutput.days as any[]).forEach((day) => {
      day.activities.forEach((act: any) => {
        act.progression.observationTarget = 'Observar si gira la cabeza hacia la fuente sonora y adapta el ritmo';
      });
    });
    const validExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(validRawOutput),
    };
    const validSource = new AIWeeklyPlanningProposalSource(validExecutor);
    const validRes = await validSource.propose(createValidRequest());
    expect(validRes).toBeDefined();

    // 2. Synthetic completed outcome fails closed through D.4.1 guard
    const badRawOutput = createValidFullWeekMockResponse();
    (badRawOutput['days'] as any[])[0].activities[0].progression.observationTarget =
      'El lactante logró gatear y dominar el movimiento con éxito total.';

    const badExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(badRawOutput),
    };
    const badSource = new AIWeeklyPlanningProposalSource(badExecutor);

    await expect(badSource.propose(createValidRequest())).rejects.toThrow(
      /fabricated completed outcome/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 14 — GOVERNANCE INJECTION
  // -------------------------------------------------------------------------
  it('TEST 14 — GOVERNANCE INJECTION: fails closed when progression contains governance fields (approval, status, evaluation, pda, persistence)', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    (rawOutput['days'] as any[])[0].activities[0].progression.approvalStatus = 'APPROVED';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /contains forbidden governance property 'approvalStatus'/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 15 — MATERIAL INJECTION THROUGH PROGRESSION
  // -------------------------------------------------------------------------
  it('TEST 15 — MATERIAL INJECTION THROUGH PROGRESSION: fails closed when progression attempts to declare or authorize materials', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    (rawOutput['days'] as any[])[0].activities[0].progression.materials = ['sonaja suave'];

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /cannot define materials; materialRefs is the sole material authority/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 16 — UNKNOWN PROGRESSION KEY
  // -------------------------------------------------------------------------
  it('TEST 16 — UNKNOWN PROGRESSION KEY: fails closed on unknown or arbitrary root or experience progression property', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    (rawOutput['days'] as any[])[0].activities[0].progression.internalReasoning = 'Heuristic planning trace';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /unexpected or forbidden property 'internalReasoning'/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 17 — ONE PROVIDER INVOCATION
  // -------------------------------------------------------------------------
  it('TEST 17 — ONE PROVIDER INVOCATION: proves propose() executes exactly one executor invocation across Monday through Friday', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await source.propose(createValidRequest());

    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TEST 18 — NO PERSISTENCE
  // -------------------------------------------------------------------------
  it('TEST 18 — NO PERSISTENCE: proves provider progression execution causes zero persistence/lifecycle mutation', async () => {
    const rawOutput = createValidFullWeekMockResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    // Transient in-memory proposal only; no persistence metadata attached
    expect((response as any).id).toBeUndefined();
    expect((response as any).saved).toBeUndefined();
    expect((response as any).status).toBeUndefined();
    expect((response as any).lifecycle).toBeUndefined();
    expect((response as any).persistence).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TEST 19 — THIRD LIGHT STRUCTURAL REGRESSION
  // -------------------------------------------------------------------------
  it('TEST 19 — THIRD LIGHT STRUCTURAL REGRESSION: synthetic Third Light shape omitting progression contract fails closed without semantic similarity engine', async () => {
    // Resembling Third Light output: 5 weekdays with repeated reading/movement experiences,
    // but completely lacking the structured progression block.
    const thirdLightDefectiveOutput = {
      days: OFFICIAL_WEEKDAYS.map((dayOfWeek) => ({
        dayOfWeek,
        date: '2026-08-24',
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Lectura de cuento breve con ilustraciones',
            proceduralAction: 'Mostrar ilustraciones y modular la voz con {material}.',
            durationMinutes: 15,
            materialRefs: ['MAT-01'],
          },
          {
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Movimiento libre de brazos y piernas',
            proceduralAction: 'Acompañar movimientos corporales sobre la colchoneta.',
            durationMinutes: 10,
            materialRefs: [],
          },
        ],
      })),
    };

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(thirdLightDefectiveOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    // Fails closed because progression is strictly required in D.4.2
    await expect(source.propose(createValidRequest())).rejects.toThrow(
      /missing required weekly pedagogical progression/
    );
  });

  // -------------------------------------------------------------------------
  // TEST 20 — VALID INTENTIONAL THIRD-LIGHT-LIKE WEEK
  // -------------------------------------------------------------------------
  it('TEST 20 — VALID INTENTIONAL THIRD-LIGHT-LIKE WEEK: passes when repeated experiences explicitly declare earlier revisit, purpose, and variation dimension', async () => {
    // Construct a week where later sensory/movement experiences intentionally revisit earlier ones
    const progressionExperiences: ProgressionExperienceFixture[] = [
      // Monday
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar atención visual a las páginas del libro',
      },
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar respuesta táctil inicial a la tela suave',
      },
      // Tuesday: Revisit reading with familiarization
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: 'FAMILIARIZATION',
        variationDimensions: ['ADULT_MEDIATION'],
        observationTarget: 'Observar mayor calma y anticipación afectiva',
      },
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar pataleo y movimiento libre sobre colchoneta',
      },
      // Wednesday: Revisit reading with variation, revisit sensory with progression
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: 'VARIATION',
        variationDimensions: ['INTERACTION_MODE'],
        observationTarget: 'Observar seguimiento ante pausas rítmicas más lentas',
      },
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: 'PROGRESSION',
        variationDimensions: ['SENSORY_EXPERIENCE', 'ADULT_MEDIATION'],
        observationTarget: 'Observar prensión voluntaria de la tela en postura semi-reclinada',
      },
      // Thursday: Revisit reading with observation focus, revisit movement with reinforcement
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: 'RESPONSE_OBSERVATION',
        variationDimensions: ['OBSERVATION_FOCUS'],
        observationTarget: 'Observar intentos de emisión vocal o sonrisas dirigidas',
      },
      {
        role: 'REVISIT',
        revisitsSlot: 'D2_A2',
        repetitionPurpose: 'REINFORCEMENT',
        variationDimensions: ['ADULT_MEDIATION'],
        observationTarget: 'Observar sostén cefálico gradual con acompañamiento suave',
      },
      // Friday: Observe and consolidate
      {
        role: 'OBSERVE_OR_CONSOLIDATE',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar integración afectiva y disfrute compartido',
      },
      {
        role: 'OBSERVE_OR_CONSOLIDATE',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar relajación general y cierre semanal reconfortante',
      },
    ];

    const days = [
      {
        dayOfWeek: 'MONDAY',
        date: '2026-08-24',
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Vínculo y exploración con libro de tela suave',
            proceduralAction: 'Presentar {material} leyendo con entonación afectiva.',
            durationMinutes: 15,
            materialRefs: ['MAT-01'],
          },
          {
            category: 'AMBIENTES DE APRENDIZAJE',
            objective: 'Exploración táctil con tela de textura suave',
            proceduralAction: 'Acariciar suavemente los brazos del lactante con {material}.',
            durationMinutes: 10,
            materialRefs: ['MAT-01'],
          },
        ],
      },
      {
        dayOfWeek: 'TUESDAY',
        date: '2026-08-25',
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Reencuentro familiar con el cuento de tela suave',
            proceduralAction: 'Releer pasajes del cuento con {material} pausando para mirar al lactante.',
            durationMinutes: 15,
            materialRefs: ['MAT-01'],
          },
          {
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Pataleo libre sobre superficie acolchada',
            proceduralAction: 'Colocar al lactante boca arriba invitando al movimiento libre de piernas.',
            durationMinutes: 10,
            materialRefs: [],
          },
        ],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        date: '2026-08-26',
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Variación rítmica en la lectura del cuento suave',
            proceduralAction: 'Modular la voz con ritmos más pausados mostrando {material}.',
            durationMinutes: 15,
            materialRefs: ['MAT-01'],
          },
          {
            category: 'AMBIENTES DE APRENDIZAJE',
            objective: 'Profundización de exploración táctil en postura semi-reclinada',
            proceduralAction: 'Ofrecer {material} invitando al agarre voluntario con supervisión cercana.',
            durationMinutes: 10,
            materialRefs: ['MAT-01'],
          },
        ],
      },
      {
        dayOfWeek: 'THURSDAY',
        date: '2026-08-27',
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Observación de respuestas vocales ante el cuento conocido',
            proceduralAction: 'Leer suavemente con {material} esperando las respuestas vocales del bebé.',
            durationMinutes: 15,
            materialRefs: ['MAT-01'],
          },
          {
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Refuerzo de pataleo y coordinación con acompañamiento adulto',
            proceduralAction: 'Acompañar suavemente la flexión de rodillas cantando una tonada tranquila.',
            durationMinutes: 10,
            materialRefs: [],
          },
        ],
      },
      {
        dayOfWeek: 'FRIDAY',
        date: '2026-08-28',
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Cierre y consolidación afectiva de la narración semanal',
            proceduralAction: 'Abrazar y compartir lectura tranquila de {material} en ambiente sereno.',
            durationMinutes: 15,
            materialRefs: ['MAT-01'],
          },
          {
            category: 'AMBIENTES DE APRENDIZAJE',
            objective: 'Consolidación sensorial de tacto y relajación compartida',
            proceduralAction: 'Despedir la semana con caricias suaves usando {material} en calma.',
            durationMinutes: 10,
            materialRefs: ['MAT-01'],
          },
        ],
      },
    ];

    const intentionalDays = days.map((day, dIdx) => ({
      ...day,
      activities: day.activities.map((act, aIdx) => ({
        ...act,
        progression: progressionExperiences[dIdx * 2 + aIdx],
      })),
    }));

    const intentionalThirdLightWeek = {
      weeklyFocus: 'Narración afectiva repetida y exploración sensorial táctil progresiva',
      days: intentionalDays,
    };

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(intentionalThirdLightWeek),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);
    expect(response.progression?.experiences).toHaveLength(10);
    // Proves that intentional repetition passes cleanly without forcing artificial novelty
    const revisits = response.progression?.experiences.filter((e) => e.role === 'REVISIT');
    expect(revisits?.length).toBe(5);
  });
});
