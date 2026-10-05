import { describe, it, expect } from 'vitest';
import {
  InvalidWeeklyPlanningProposalError,
  validateWeeklyPedagogicalProgression,
  validateActivityProgressionCorrespondence,
  validateWeeklyPlanningProposalResponse,
  type WeeklyPedagogicalProgression,
  type WeeklyPlanningProposalResponse,
} from '../WeeklyPlanningProposalSource';
import { parseAndAllowlistUntrustedProposal } from '../AIWeeklyPlanningProposalSource';
import { classifyWeeklyPlanningFailure } from '../../../../functions/src/proposeWeeklyPlanning';

function createValidBaseProgression(): WeeklyPedagogicalProgression {
  return {
    weeklyFocus: 'Exploración sensorial táctil y auditiva',
    experiences: [
      {
        experienceId: 'exp-mon-1',
        role: 'EXPLORE',
        observationTarget: 'Observar si el bebé gira la cabeza',
      },
      {
        experienceId: 'exp-mon-2',
        role: 'EXPLORE',
        observationTarget: 'Observar respuesta al contacto suave',
      },
    ],
  };
}

function createValidDays() {
  return [
    {
      dayOfWeek: 'lunes' as const,
      activities: [
        {
          experienceId: 'exp-mon-1',
          category: 'LECTURA EN VOZ ALTA' as const,
          title: 'Lectura compartida',
          objective: 'Fomentar vínculo afectivo',
          proceduralAction: 'Leer cuento en voz baja',
          durationMinutes: 15,
          materialRefs: [],
        },
        {
          experienceId: 'exp-mon-2',
          category: 'EXPLORACIÓN SENSORIAL Y MOTRIZ' as const,
          title: 'Exploración táctil',
          objective: 'Estimular percepción táctil',
          proceduralAction: 'Ofrecer caricias suaves',
          durationMinutes: 10,
          materialRefs: [],
        },
      ],
    },
  ];
}

describe('H1R12.5-D.4.5: Progression Diagnostic Precision (Tests 1–20)', () => {
  // TEST 1 — PROGRESSION MISSING
  it('TEST 1 — PROGRESSION MISSING: rejects with PROGRESSION_MISSING', () => {
    let thrownError: unknown;
    try {
      parseAndAllowlistUntrustedProposal(
        { days: createValidDays() },
        undefined,
        { requireProgression: true }
      );
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('PROGRESSION_MISSING');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('PROGRESSION_MISSING');
  });

  // TEST 2 — INVALID ROLE
  it('TEST 2 — INVALID ROLE: rejects with INVALID_PROGRESSION_ROLE', () => {
    const invalidProgression: any = {
      weeklyFocus: 'Enfoque semanal',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'NON_EXISTENT_ROLE',
        },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(invalidProgression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('INVALID_PROGRESSION_ROLE');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('INVALID_PROGRESSION_ROLE');
  });

  // TEST 3 — ACTIVITY EXPERIENCE ID MISSING
  it('TEST 3 — ACTIVITY EXPERIENCE ID MISSING: rejects with ACTIVITY_EXPERIENCE_ID_MISSING', () => {
    const daysWithoutExpId = [
      {
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            title: 'Lectura',
            objective: 'Escuchar',
            proceduralAction: 'Leer',
            durationMinutes: 15,
            materialRefs: [],
          },
        ],
      },
    ];

    let thrownError: unknown;
    try {
      validateActivityProgressionCorrespondence(
        daysWithoutExpId as any,
        createValidBaseProgression()
      );
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('ACTIVITY_EXPERIENCE_ID_MISSING');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('ACTIVITY_EXPERIENCE_ID_MISSING');
  });

  // TEST 4 — DUPLICATE ACTIVITY EXPERIENCE ID
  it('TEST 4 — DUPLICATE ACTIVITY EXPERIENCE ID: rejects with DUPLICATE_ACTIVITY_EXPERIENCE_ID', () => {
    const duplicateProgression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        { experienceId: 'dup-id', role: 'EXPLORE' },
        { experienceId: 'dup-id', role: 'EXPLORE' },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(duplicateProgression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('DUPLICATE_ACTIVITY_EXPERIENCE_ID');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('DUPLICATE_ACTIVITY_EXPERIENCE_ID');
  });

  // TEST 5 — ORPHAN PROGRESSION ENTRY
  it('TEST 5 — ORPHAN PROGRESSION ENTRY: rejects with ORPHAN_PROGRESSION_EXPERIENCE', () => {
    const days = [
      {
        activities: [
          { experienceId: 'exp-1' },
          { experienceId: 'exp-2' },
        ],
      },
    ];
    const progressionWithOrphan: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        { experienceId: 'exp-orphan', role: 'EXPLORE' },
      ],
    };

    let thrownError: unknown;
    try {
      validateActivityProgressionCorrespondence(days as any, progressionWithOrphan);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('ORPHAN_PROGRESSION_EXPERIENCE');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('ORPHAN_PROGRESSION_EXPERIENCE');
  });

  // TEST 6 — ACTIVITY WITHOUT PROGRESSION ENTRY
  it('TEST 6 — ACTIVITY WITHOUT PROGRESSION ENTRY: rejects with ACTIVITY_PROGRESSION_ENTRY_MISSING', () => {
    const days = [
      {
        activities: [
          { experienceId: 'exp-1' },
          { experienceId: 'exp-unmapped' },
        ],
      },
    ];
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [{ experienceId: 'exp-1', role: 'EXPLORE' }],
    };

    let thrownError: unknown;
    try {
      validateActivityProgressionCorrespondence(days as any, progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('ACTIVITY_PROGRESSION_ENTRY_MISSING');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('ACTIVITY_PROGRESSION_ENTRY_MISSING');
  });

  // TEST 7 — REVISIT TARGET MISSING
  it('TEST 7 — REVISIT TARGET MISSING: rejects with REVISIT_REFERENCE_MISSING', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        { experienceId: 'exp-2', role: 'REVISIT' }, // missing revisitsExperienceId
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('REVISIT_REFERENCE_MISSING');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('REVISIT_REFERENCE_MISSING');
  });

  // TEST 8 — SELF REFERENCE
  it('TEST 8 — SELF REFERENCE: rejects with REVISIT_SELF_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'FAMILIARIZATION',
          variationDimensions: ['PEDAGOGICAL_INTENT'],
        },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('REVISIT_SELF_REFERENCE');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('REVISIT_SELF_REFERENCE');
  });

  // TEST 9 — FORWARD / UNKNOWN REFERENCE
  it('TEST 9 — FORWARD / UNKNOWN REFERENCE: rejects with REVISIT_FORWARD_OR_UNKNOWN_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-future',
          repetitionPurpose: 'FAMILIARIZATION',
          variationDimensions: ['PEDAGOGICAL_INTENT'],
        },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('REVISIT_FORWARD_OR_UNKNOWN_REFERENCE');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('REVISIT_FORWARD_OR_UNKNOWN_REFERENCE');
  });

  // TEST 10 — REPETITION PURPOSE INVALID/MISSING
  it('TEST 10 — REPETITION PURPOSE INVALID/MISSING: rejects with REPETITION_PURPOSE_MISSING_OR_INVALID', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          // missing repetitionPurpose
          variationDimensions: ['PEDAGOGICAL_INTENT'],
        },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('REPETITION_PURPOSE_MISSING_OR_INVALID');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('REPETITION_PURPOSE_MISSING_OR_INVALID');
  });

  // TEST 11 — VARIATION DIMENSIONS INVALID/MISSING
  it('TEST 11 — VARIATION DIMENSIONS INVALID/MISSING: rejects with VARIATION_DIMENSIONS_MISSING_OR_INVALID', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'FAMILIARIZATION',
          variationDimensions: [], // empty
        },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('VARIATION_DIMENSIONS_MISSING_OR_INVALID');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('VARIATION_DIMENSIONS_MISSING_OR_INVALID');
  });

  // TEST 12 — RETROSPECTIVE OUTCOME CLAIM
  it('TEST 12 — RETROSPECTIVE OUTCOME CLAIM: rejects with INVALID_PROSPECTIVE_OBSERVATION and ZERO CONTENT in telemetry', () => {
    const sensitiveProse = 'El lactante logró dominar el objeto perfectamente';
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Enfoque',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'EXPLORE',
          observationTarget: sensitiveProse,
        },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('INVALID_PROSPECTIVE_OBSERVATION');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('INVALID_PROSPECTIVE_OBSERVATION');

    // Telemetry Zero Content verification
    const telemetryString = JSON.stringify(classified);
    expect(telemetryString).not.toContain(sensitiveProse);
    expect(telemetryString).not.toContain('logró');
    expect(telemetryString).not.toContain('lactante');
  });

  // TEST 13 — FORBIDDEN GOVERNANCE FIELD
  it('TEST 13 — FORBIDDEN GOVERNANCE FIELD: rejects with FORBIDDEN_PROGRESSION_FIELD', () => {
    const progression: any = {
      weeklyFocus: 'Enfoque',
      experiences: [{ experienceId: 'exp-1', role: 'EXPLORE' }],
      approvalStatus: 'APPROVED',
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('FORBIDDEN_PROGRESSION_FIELD');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('FORBIDDEN_PROGRESSION_FIELD');
  });

  // TEST 14 — MATERIAL AUTHORITY IN PROGRESSION
  it('TEST 14 — MATERIAL AUTHORITY IN PROGRESSION: rejects with MATERIAL_AUTHORITY_IN_PROGRESSION', () => {
    const progression: any = {
      weeklyFocus: 'Enfoque',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'EXPLORE',
          materials: ['pelota'],
        },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('MATERIAL_AUTHORITY_IN_PROGRESSION');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('MATERIAL_AUTHORITY_IN_PROGRESSION');
  });

  // TEST 15 — UNKNOWN PROGRESSION KEY
  it('TEST 15 — UNKNOWN PROGRESSION KEY: rejects with UNKNOWN_PROGRESSION_FIELD', () => {
    const progression: any = {
      weeklyFocus: 'Enfoque',
      experiences: [{ experienceId: 'exp-1', role: 'EXPLORE' }],
      unauthorizedCustomKey: 'someValue',
    };

    let thrownError: unknown;
    try {
      validateWeeklyPedagogicalProgression(progression);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('UNKNOWN_PROGRESSION_FIELD');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('UNKNOWN_PROGRESSION_FIELD');
  });

  // TEST 16 — CANONICAL DAY STRUCTURE
  it('TEST 16 — CANONICAL DAY STRUCTURE: rejects with CANONICAL_DAY_STRUCTURE_INVALID', () => {
    const fourDayResponse: WeeklyPlanningProposalResponse = {
      days: [
        { dayOfWeek: 'lunes', activities: [] },
        { dayOfWeek: 'martes', activities: [] },
        { dayOfWeek: 'miércoles', activities: [] },
        { dayOfWeek: 'jueves', activities: [] },
      ],
    };

    let thrownError: unknown;
    try {
      validateWeeklyPlanningProposalResponse(fourDayResponse);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
    const typed = thrownError as InvalidWeeklyPlanningProposalError;
    expect(typed.diagnosticSubtype).toBe('CANONICAL_DAY_STRUCTURE_INVALID');

    const classified = classifyWeeklyPlanningFailure(typed);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('CANONICAL_DAY_STRUCTURE_INVALID');
  });

  // TEST 17 — VALID PROGRESSION
  it('TEST 17 — VALID PROGRESSION: passes without error or diagnostic subtype', () => {
    const validProgression = createValidBaseProgression();
    expect(() => validateWeeklyPedagogicalProgression(validProgression)).not.toThrow();

    const validDays = createValidDays();
    expect(() =>
      validateActivityProgressionCorrespondence(validDays as any, validProgression)
    ).not.toThrow();
  });

  // TEST 18 — ACCEPT/REJECT PARITY
  it('TEST 18 — ACCEPT/REJECT PARITY: proves D.4.5 preserves boolean accept/reject outcomes identically', () => {
    // 1. Valid fixture must accept
    const validProg = createValidBaseProgression();
    expect(() => validateWeeklyPedagogicalProgression(validProg)).not.toThrow();

    // 2. Rejected fixtures must strictly reject with InvalidWeeklyPlanningProposalError
    const invalidFixtures = [
      { prog: null, desc: 'null' },
      { prog: { weeklyFocus: '' }, desc: 'empty focus' },
      { prog: { weeklyFocus: 'Ok', experiences: [] }, desc: 'empty experiences' },
      {
        prog: {
          weeklyFocus: 'Ok',
          experiences: [{ experienceId: 'e1', role: 'INVALID' }],
        },
        desc: 'invalid role',
      },
    ];

    for (const fixture of invalidFixtures) {
      expect(() =>
        validateWeeklyPedagogicalProgression(fixture.prog as any)
      ).toThrow(InvalidWeeklyPlanningProposalError);
    }
  });

  // TEST 19 — ZERO CONTENT TELEMETRY
  it('TEST 19 — ZERO CONTENT TELEMETRY: verifies telemetry classification contains zero content / PII / prose', () => {
    const sensitiveProse = 'Cuento de estimulación con pelotas y sonajas en sala de lactantes';
    const err = new InvalidWeeklyPlanningProposalError(
      `Detailed error referring to ${sensitiveProse}`,
      'INVALID_PROGRESSION_ROLE'
    );

    const classified = classifyWeeklyPlanningFailure(err);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('INVALID_PROGRESSION_ROLE');

    // Stringify and assert absence of all prose
    const serialized = JSON.stringify(classified);
    expect(serialized).not.toContain(sensitiveProse);
    expect(serialized).not.toContain('Cuento');
    expect(serialized).not.toContain('pelotas');
    expect(serialized).not.toContain('sonajas');
    expect(serialized).not.toContain('Detailed error');
  });

  // TEST 20 — FALLBACK
  it('TEST 20 — FALLBACK: unclassified InvalidWeeklyPlanningProposalError maps safely to OTHER_CANONICAL_VALIDATION', () => {
    const unclassifiedErr = new InvalidWeeklyPlanningProposalError(
      'Some unexpected custom canonical check failed without diagnostic code'
    );
    expect(unclassifiedErr.diagnosticSubtype).toBeUndefined();

    const classified = classifyWeeklyPlanningFailure(unclassifiedErr);
    expect(classified.processingStage).toBe('CANONICAL_VALIDATION');
    expect(classified.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
    expect(classified.diagnosticSubtype).toBe('OTHER_CANONICAL_VALIDATION');
    expect(classified.safeError.code).toBe('internal');

    const serialized = JSON.stringify(classified);
    expect(serialized).not.toContain('Some unexpected custom canonical check');
  });
});
