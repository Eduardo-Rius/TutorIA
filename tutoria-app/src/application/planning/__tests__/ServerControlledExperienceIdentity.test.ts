/**
 * H1R12.5-D.4.8 — Server-Controlled Experience Identity Test Matrix (Tests 1–22)
 *
 * Implements Master ARB approved microbullet D.4.8:
 * Moves weekly activity/experience technical identity authority from provider
 * to deterministic server-side projection while preserving provider authority
 * to express pedagogical revisit relationships.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  parseAndAllowlistUntrustedProposal,
  resolveRevisitSlot,
  createRequestScopedMaterialTable,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  InvalidWeeklyPlanningProposalError,
  OFFICIAL_WEEKDAYS,
  validateWeeklyPedagogicalProgression,
  validateActivityProgressionCorrespondence,
  WeeklyPedagogicalProgression,
} from '../WeeklyPlanningProposalSource';
import { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R12.5-D.4.8 — Server-Controlled Experience Identity (Tests 1–22)', () => {
  const sampleLactantesARoom: Room = Object.freeze({
    roomId: 'secret-room-db-uuid-999',
    name: 'Lactantes A',
    minAgeMonths: 0,
    maxAgeMonths: 6,
    capacity: 10,
  });

  const sampleMaterialTable = createRequestScopedMaterialTable([
    "pelotas suaves",
    "telas de diferentes texturas",
    "música instrumental",
  ]);

  const createValidRequest = (): WeeklyPlanningProposalRequest => ({
    planningId: 'plan-cabo-d48-001',
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

  /**
   * Constructs a valid provider response under the D.4.8 contract:
   * ZERO canonical experienceId properties in activities or progression.
   * Revisit relationships declared via bounded slot reference (e.g. "D1_A1").
   */
  const createValidProviderResponse = (): Record<string, unknown> => {
    const progressionExperiences = [
      // Monday
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar si orienta la mirada a la voz',
      },
      {
        role: 'EXPLORE',
        revisitsSlot: null,
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar respuesta y acomodo postural al contacto',
      },
      // Tuesday
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
      },
      // Wednesday
      {
        role: 'VARY',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: null,
        variationDimensions: ['ADULT_MEDIATION'],
        observationTarget: 'Observar seguimiento visual de modulaciones de voz',
      },
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: 'VARIATION',
        variationDimensions: ['SENSORY_EXPERIENCE', 'ADULT_MEDIATION'],
        observationTarget: 'Observar respuesta táctil al ritmo pausado',
      },
      // Thursday
      {
        role: 'REVISIT',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: 'RESPONSE_OBSERVATION',
        variationDimensions: ['OBSERVATION_FOCUS'],
        observationTarget: 'Observar emisión de gorjeos o balbuceos',
      },
      {
        role: 'DEEPEN_OR_ADAPT',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar comodidad y tiempo de sostén boca abajo',
      },
      // Friday
      {
        role: 'OBSERVE_OR_CONSOLIDATE',
        revisitsSlot: 'D1_A1',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar relajación general y calma afectiva',
      },
      {
        role: 'OBSERVE_OR_CONSOLIDATE',
        revisitsSlot: 'D1_A2',
        repetitionPurpose: null,
        variationDimensions: null,
        observationTarget: 'Observar interacción tranquila y cierre sereno',
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
      ],
    }));

    return {
      weeklyFocus: 'Vínculo afectivo, discriminación auditiva y exploración sensorial táctil',
      days,
    };
  };

  // -------------------------------------------------------------------------
  // TEST 1 — SERVER ASSIGNS UNIQUE IDS
  // -------------------------------------------------------------------------
  it('TEST 1 — SERVER ASSIGNS UNIQUE IDS: server assigns exactly one unique canonical experienceId per activity when provider has zero ID authority', () => {
    const rawOutput = createValidProviderResponse();
    const result = parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });

    expect(result.progression).toBeDefined();
    expect(result.days).toHaveLength(5);

    const projectedActivityIds: string[] = [];
    for (const day of result.days) {
      for (const act of day.activities) {
        expect(act.experienceId).toBeDefined();
        expect(typeof act.experienceId).toBe('string');
        projectedActivityIds.push(act.experienceId!);
      }
    }

    expect(projectedActivityIds).toHaveLength(10);
    const uniqueIds = new Set(projectedActivityIds);
    expect(uniqueIds.size).toBe(10);

    const progressionIds = result.progression!.experiences.map((e) => e.experienceId);
    expect(progressionIds).toEqual(projectedActivityIds);
  });

  // -------------------------------------------------------------------------
  // TEST 2 — DETERMINISM
  // -------------------------------------------------------------------------
  it('TEST 2 — DETERMINISM: same provider structural response projected twice yields identical canonical experience IDs', () => {
    const rawOutput1 = createValidProviderResponse();
    const rawOutput2 = createValidProviderResponse();

    const result1 = parseAndAllowlistUntrustedProposal(rawOutput1, sampleMaterialTable, { requireProgression: true });
    const result2 = parseAndAllowlistUntrustedProposal(rawOutput2, sampleMaterialTable, { requireProgression: true });

    const ids1 = result1.progression!.experiences.map((e) => e.experienceId);
    const ids2 = result2.progression!.experiences.map((e) => e.experienceId);

    expect(ids1).toEqual(ids2);
    expect(ids1).toEqual([
      'EXP-D1-A1',
      'EXP-D1-A2',
      'EXP-D2-A1',
      'EXP-D2-A2',
      'EXP-D3-A1',
      'EXP-D3-A2',
      'EXP-D4-A1',
      'EXP-D4-A2',
      'EXP-D5-A1',
      'EXP-D5-A2',
    ]);
  });

  // -------------------------------------------------------------------------
  // TEST 3 — NO COLLISION
  // -------------------------------------------------------------------------
  it('TEST 3 — NO COLLISION: all valid generated activity slots receive strictly unique canonical IDs', () => {
    const rawOutput = createValidProviderResponse();
    const result = parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });

    const allIds = result.progression!.experiences.map((e) => e.experienceId);
    const set = new Set(allIds);
    expect(set.size).toBe(allIds.length);
  });

  // -------------------------------------------------------------------------
  // TEST 4 — PROVIDER CANNOT CHOOSE CANONICAL ID
  // -------------------------------------------------------------------------
  it('TEST 4 — PROVIDER CANNOT CHOOSE CANONICAL ID: fails closed as unexpected provider key if provider attempts to inject experienceId', () => {
    // 1. Attempt to inject experienceId in activity
    const hostileActOutput = createValidProviderResponse();
    (hostileActOutput['days'] as any[])[0].activities[0].experienceId = 'custom-llm-id';

    expect(() =>
      parseAndAllowlistUntrustedProposal(hostileActOutput, sampleMaterialTable, { requireProgression: true })
    ).toThrowError(InvalidWeeklyPlanningProposalError);

    try {
      parseAndAllowlistUntrustedProposal(hostileActOutput, sampleMaterialTable, { requireProgression: true });
    } catch (err) {
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe('UNKNOWN_PROGRESSION_FIELD');
    }

    // 2. Attempt to inject experienceId in progression experience
    const hostileExpOutput = createValidProviderResponse();
    (hostileExpOutput['days'] as any[])[0].activities[0].progression.experienceId = 'custom-llm-id';

    expect(() =>
      parseAndAllowlistUntrustedProposal(hostileExpOutput, sampleMaterialTable, { requireProgression: true })
    ).toThrowError(InvalidWeeklyPlanningProposalError);

    try {
      parseAndAllowlistUntrustedProposal(hostileExpOutput, sampleMaterialTable, { requireProgression: true });
    } catch (err) {
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe('UNKNOWN_PROGRESSION_FIELD');
    }
  });

  // -------------------------------------------------------------------------
  // TEST 5 — VALID REVISIT POSITION
  // -------------------------------------------------------------------------
  it('TEST 5 — VALID REVISIT POSITION: later activity references valid earlier slot, server resolves reference to canonical experienceId', () => {
    const rawOutput = createValidProviderResponse();
    const result = parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });

    // Tuesday activity 1 revisits D1_A1 -> resolves to EXP-D1-A1
    const tueExp1 = result.progression!.experiences[2];
    expect(tueExp1.role).toBe('REVISIT');
    expect(tueExp1.revisitsExperienceId).toBe('EXP-D1-A1');

    // Wednesday activity 2 revisits D1_A2 -> resolves to EXP-D1-A2
    const wedExp2 = result.progression!.experiences[5];
    expect(wedExp2.role).toBe('REVISIT');
    expect(wedExp2.revisitsExperienceId).toBe('EXP-D1-A2');

    // Thursday activity 1 revisits D1_A1 -> resolves to EXP-D1-A1
    const thuExp1 = result.progression!.experiences[6];
    expect(thuExp1.role).toBe('REVISIT');
    expect(thuExp1.revisitsExperienceId).toBe('EXP-D1-A1');
  });

  // -------------------------------------------------------------------------
  // TEST 6 — SELF/CURRENT SLOT
  // -------------------------------------------------------------------------
  it('TEST 6 — SELF/CURRENT SLOT: fails closed with REVISIT_SELF_REFERENCE when revisit references current slot', () => {
    const rawOutput = createValidProviderResponse();
    // Tuesday activity 1 (D2_A1) attempts to revisit D2_A1
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D2_A1';

    try {
      parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
      expect.fail('Should have failed on self-slot reference');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe('REVISIT_SELF_REFERENCE');
    }
  });

  // -------------------------------------------------------------------------
  // TEST 7 — FORWARD SLOT
  // -------------------------------------------------------------------------
  it('TEST 7 — FORWARD SLOT: fails closed with REVISIT_FORWARD_OR_UNKNOWN_REFERENCE when revisit references future slot', () => {
    const rawOutput = createValidProviderResponse();
    // Tuesday activity 1 attempts to revisit Friday activity 1 (D5_A1)
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D5_A1';

    try {
      parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
      expect.fail('Should have failed on forward slot reference');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe(
        'REVISIT_FORWARD_OR_UNKNOWN_REFERENCE'
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 8 — UNKNOWN SLOT
  // -------------------------------------------------------------------------
  it('TEST 8 — UNKNOWN SLOT: fails closed with REVISIT_FORWARD_OR_UNKNOWN_REFERENCE when revisit references nonexistent slot', () => {
    const rawOutput = createValidProviderResponse();
    // Tuesday activity 1 attempts to revisit D1_A99 (nonexistent activity)
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D1_A99';

    try {
      parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
      expect.fail('Should have failed on unknown slot reference');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe(
        'REVISIT_FORWARD_OR_UNKNOWN_REFERENCE'
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 9 — REVISIT WITHOUT REFERENCE
  // -------------------------------------------------------------------------
  it('TEST 9 — REVISIT WITHOUT REFERENCE: fails closed with REVISIT_REFERENCE_MISSING when role is REVISIT but revisitsSlot is null or missing', () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = null;

    try {
      parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
      expect.fail('Should have failed on missing revisit reference');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe('REVISIT_REFERENCE_MISSING');
    }
  });

  // -------------------------------------------------------------------------
  // TEST 10 — REVISIT PURPOSE STILL REQUIRED
  // -------------------------------------------------------------------------
  it('TEST 10 — REVISIT PURPOSE STILL REQUIRED: fails closed with REPETITION_PURPOSE_MISSING_OR_INVALID when revisit lacks repetitionPurpose', () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression.repetitionPurpose = null;

    try {
      parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
      expect.fail('Should have failed on missing repetition purpose');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe(
        'REPETITION_PURPOSE_MISSING_OR_INVALID'
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 11 — VARIATION DIMENSION STILL REQUIRED
  // -------------------------------------------------------------------------
  it('TEST 11 — VARIATION DIMENSION STILL REQUIRED: fails closed with VARIATION_DIMENSIONS_MISSING_OR_INVALID when revisit lacks variationDimensions', () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression.variationDimensions = [];

    try {
      parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
      expect.fail('Should have failed on missing variation dimensions');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe(
        'VARIATION_DIMENSIONS_MISSING_OR_INVALID'
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 12 — NON-REVISIT DOES NOT REQUIRE REVISIT TARGET
  // -------------------------------------------------------------------------
  it('TEST 12 — NON-REVISIT DOES NOT REQUIRE REVISIT TARGET: passes according to existing D.4.1 semantics when role is EXPLORE, VARY, etc.', () => {
    const rawOutput = createValidProviderResponse();
    // Monday activity 1 is EXPLORE with revisitsSlot null
    expect((rawOutput['days'] as any[])[0].activities[0].progression.role).toBe('EXPLORE');
    expect((rawOutput['days'] as any[])[0].activities[0].progression.revisitsSlot).toBeNull();

    const result = parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
    expect(result.progression!.experiences[0].role).toBe('EXPLORE');
    expect(result.progression!.experiences[0].revisitsExperienceId).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TEST 13 — CANONICAL D.4.1 CONTRACT STILL PASSES
  // -------------------------------------------------------------------------
  it('TEST 13 — CANONICAL D.4.1 CONTRACT STILL PASSES: projected progression satisfies validateWeeklyPedagogicalProgression without modification', () => {
    const rawOutput = createValidProviderResponse();
    const result = parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });

    expect(() => validateWeeklyPedagogicalProgression(result.progression!)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // TEST 14 — 1:1 CORRESPONDENCE STILL PASSES
  // -------------------------------------------------------------------------
  it('TEST 14 — 1:1 CORRESPONDENCE STILL PASSES: projected activities and progression have exact bijection and sequence match', () => {
    const rawOutput = createValidProviderResponse();
    const result = parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });

    expect(() =>
      validateActivityProgressionCorrespondence(result.days as any, result.progression!)
    ).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // TEST 15 — DEFENSE-IN-DEPTH DUPLICATE DETECTION REMAINS
  // -------------------------------------------------------------------------
  it('TEST 15 — DEFENSE-IN-DEPTH DUPLICATE DETECTION REMAINS: synthetic internal canonical fixture with duplicate IDs is rejected by DUPLICATE_ACTIVITY_EXPERIENCE_ID', () => {
    const duplicateCanonicalProgression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque de prueba',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
        },
        {
          experienceId: 'EXP-D1-A1', // Manual duplicate
          role: 'EXPLORE',
        },
      ],
    };

    try {
      validateWeeklyPedagogicalProgression(duplicateCanonicalProgression);
      expect.fail('Should have failed on duplicate experience ID in canonical validator');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe(
        'DUPLICATE_ACTIVITY_EXPERIENCE_ID'
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 16 — FOURTH LIGHT #2 ROOT-CAUSE REGRESSION
  // -------------------------------------------------------------------------
  it('TEST 16 — FOURTH LIGHT #2 ROOT-CAUSE REGRESSION: provider generates repeated/revisited experiences without IDs, system assigns distinct IDs and resolves revisit', async () => {
    // Under Fourth Light #2, the provider reused an experienceId on Tuesday reading that matched Monday reading.
    // In D.4.8, the provider does NOT invent canonical IDs; it declares revisitsSlot: 'D1_A1'.
    // The server assigns EXP-D1-A1 to Monday reading and EXP-D2-A1 to Tuesday reading.
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    const result = await source.propose(createValidRequest());

    expect(result).toBeDefined();
    const mondayReadingExp = result.progression!.experiences[0];
    const tuesdayReadingExp = result.progression!.experiences[2];

    expect(mondayReadingExp.experienceId).toBe('EXP-D1-A1');
    expect(tuesdayReadingExp.experienceId).toBe('EXP-D2-A1');
    expect(mondayReadingExp.experienceId).not.toEqual(tuesdayReadingExp.experienceId);
    expect(tuesdayReadingExp.revisitsExperienceId).toBe('EXP-D1-A1');
  });

  // -------------------------------------------------------------------------
  // TEST 17 — PROVIDER DOES NOT CONTROL ID VIA REFERENCE
  // -------------------------------------------------------------------------
  it('TEST 17 — PROVIDER DOES NOT CONTROL ID VIA REFERENCE: provider revisit reference cannot inject an arbitrary canonical ID string', () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[1].activities[0].progression.revisitsSlot = 'EXP-MALICIOUS-INJECTED-ID';

    try {
      parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });
      expect.fail('Should have failed on arbitrary ID string injection');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect((err as InvalidWeeklyPlanningProposalError).diagnosticSubtype).toBe(
        'REVISIT_FORWARD_OR_UNKNOWN_REFERENCE'
      );
    }
  });

  // -------------------------------------------------------------------------
  // TEST 18 — ONE PROVIDER INVOCATION
  // -------------------------------------------------------------------------
  it('TEST 18 — ONE PROVIDER INVOCATION: propose() executes exactly one provider invocation across Monday through Friday', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await source.propose(createValidRequest());
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TEST 19 — ZERO PERSISTENCE
  // -------------------------------------------------------------------------
  it('TEST 19 — ZERO PERSISTENCE: identity projection causes no persistence or lifecycle mutation', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    const response = await source.propose(createValidRequest());

    expect((response as any).id).toBeUndefined();
    expect((response as any).saved).toBeUndefined();
    expect((response as any).status).toBeUndefined();
    expect((response as any).lifecycle).toBeUndefined();
    expect((response as any).persistence).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TEST 20 — PRIVACY
  // -------------------------------------------------------------------------
  it('TEST 20 — PRIVACY: canonical experience IDs contain zero UID, room text, Anita text, child/family data, or provider prose', () => {
    const rawOutput = createValidProviderResponse();
    const result = parseAndAllowlistUntrustedProposal(rawOutput, sampleMaterialTable, { requireProgression: true });

    for (const exp of result.progression!.experiences) {
      // Must match strict technical position pattern: EXP-D<1-5>-A<1-10>
      expect(exp.experienceId).toMatch(/^EXP-D[1-5]-A([1-9]|10)$/);
      expect(exp.experienceId).not.toContain('Anita');
      expect(exp.experienceId).not.toContain('Lactantes');
      expect(exp.experienceId).not.toContain('uid');
      expect(exp.experienceId).not.toContain('sonaja');
    }
  });

  // -------------------------------------------------------------------------
  // TEST 21 — GOVERNANCE PRESERVED
  // -------------------------------------------------------------------------
  it('TEST 21 — GOVERNANCE PRESERVED: no approval, status, PDA, evaluation, or persistence fields are introduced into response', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    const response = await source.propose(createValidRequest());

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('approval');
    expect(serialized).not.toContain('status');
    expect(serialized).not.toContain('pdaId');
    expect(serialized).not.toContain('curricularPDA');
    expect(serialized).not.toContain('evaluation');
  });

  // -------------------------------------------------------------------------
  // TEST 22 — ACCEPT/REJECT INTENT
  // -------------------------------------------------------------------------
  it('TEST 22 — ACCEPT/REJECT INTENT: proves valid provider structural relationships remain accepted, invalid temporal relationships remain rejected, only technical identity authority moves', () => {
    // 1. Valid provider structural revisit passes
    const validRaw = createValidProviderResponse();
    const validResult = parseAndAllowlistUntrustedProposal(validRaw, sampleMaterialTable, { requireProgression: true });
    expect(validResult.progression!.experiences[2].role).toBe('REVISIT');
    expect(validResult.progression!.experiences[2].revisitsExperienceId).toBe('EXP-D1-A1');

    // 2. Invalid temporal relationship (future slot) rejects
    const invalidRaw = createValidProviderResponse();
    (invalidRaw['days'] as any[])[1].activities[0].progression.revisitsSlot = 'D4_A1';
    expect(() =>
      parseAndAllowlistUntrustedProposal(invalidRaw, sampleMaterialTable, { requireProgression: true })
    ).toThrowError(InvalidWeeklyPlanningProposalError);

    // 3. Technical identity authority is firmly in server: provider cannot inject IDs
    const hostileIdRaw = createValidProviderResponse();
    (hostileIdRaw['days'] as any[])[0].activities[0].experienceId = 'LLM-CONTROLLED-ID';
    expect(() =>
      parseAndAllowlistUntrustedProposal(hostileIdRaw, sampleMaterialTable, { requireProgression: true })
    ).toThrowError(InvalidWeeklyPlanningProposalError);
  });
});
