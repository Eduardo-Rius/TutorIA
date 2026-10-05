import { describe, it, expect } from 'vitest';
import {
  WeeklyPedagogicalProgression,
  ExperienceProgressionMetadata,
  EXPERIENCE_COMPOSITION_ROLES,
  validateWeeklyPedagogicalProgression,
  resolveWeeklyCompositionContract,
  InvalidWeeklyPlanningProposalError,
  WeeklyPlanningProposalRequest,
  validateWeeklyPlanningProposalRequest,
} from '../WeeklyPlanningProposalSource';

describe('H1R12.5-D.4.1 — Weekly Pedagogical Progression Contract (Tests 1–14)', () => {
  // Helper to build a valid base progression
  const createValidProgression = (): WeeklyPedagogicalProgression => ({
    weeklyFocus: 'Exploración sensorial de texturas y seguimiento auditivo afectuoso',
    experiences: [
      {
        experienceId: 'exp-mon-1',
        role: 'EXPLORE',
        observationTarget: 'Observar si el lactante orienta la mirada hacia el estímulo',
      },
      {
        experienceId: 'exp-tue-1',
        role: 'EXPLORE',
        observationTarget: 'Observar la respuesta de alerta y calma ante tonos vocales',
      },
      {
        experienceId: 'exp-wed-1',
        role: 'VARY',
        revisitsExperienceId: 'exp-mon-1',
        repetitionPurpose: 'VARIATION',
        variationDimensions: ['ADULT_MEDIATION', 'SENSORY_EXPERIENCE'],
        observationTarget: 'Observar si muestra mayor tolerancia a texturas contrastantes',
      },
      {
        experienceId: 'exp-thu-1',
        role: 'REVISIT',
        revisitsExperienceId: 'exp-tue-1',
        repetitionPurpose: 'FAMILIARIZATION',
        variationDimensions: ['INTERACTION_MODE'],
        observationTarget: 'Observar reconocimiento del tono vocal familiar',
      },
      {
        experienceId: 'exp-fri-1',
        role: 'OBSERVE_OR_CONSOLIDATE',
        revisitsExperienceId: 'exp-mon-1',
        observationTarget: 'Observar estados de tranquilidad y descanso tras la interacción',
      },
    ],
  });

  // TEST 1 — COHERENT WEEK CONTRACT
  it('TEST 1 — COHERENT WEEK CONTRACT: a five-day composition expresses one bounded weekly focus and experience roles', () => {
    const progression = createValidProgression();
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  // TEST 2 — FLEXIBLE ARC
  it('TEST 2 — FLEXIBLE ARC: does NOT require fixed MON=EXPLORE ... FRI=CONSOLIDATE progression', () => {
    // Arc A: starts with EXPLORE, repeats with VARY, closes with EXPLORE
    const arcA: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Vínculo y comunicación temprana',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'VARY',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'VARIATION',
          variationDimensions: ['ADULT_MEDIATION'],
        },
        {
          experienceId: 'exp-3',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['INTERACTION_MODE'],
        },
        { experienceId: 'exp-4', role: 'EXPLORE' },
        {
          experienceId: 'exp-5',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'exp-1',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(arcA)).not.toThrow();

    // Arc B: starts with EXPLORE, then DEEPEN_OR_ADAPT, then OBSERVE_OR_CONSOLIDATE, then REVISIT
    const arcB: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Movimiento libre y acompañamiento sensible',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        { experienceId: 'exp-2', role: 'EXPLORE' },
        {
          experienceId: 'exp-3',
          role: 'DEEPEN_OR_ADAPT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'PROGRESSION',
          variationDimensions: ['CHILD_AGENCY', 'ADULT_MEDIATION'],
        },
        {
          experienceId: 'exp-4',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'exp-1',
        },
        {
          experienceId: 'exp-5',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-2',
          repetitionPurpose: 'RESPONSE_OBSERVATION',
          variationDimensions: ['OBSERVATION_FOCUS'],
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(arcB)).not.toThrow();
  });

  // TEST 3 — INTENTIONAL REPETITION
  it('TEST 3 — INTENTIONAL REPETITION: experience B revisits experience A with ref, purpose, and variation dimension', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración de texturas suaves',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'EXPLORE',
          observationTarget: 'Observar contacto inicial con las manos',
        },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'FAMILIARIZATION',
          variationDimensions: ['ADULT_MEDIATION', 'SENSORY_EXPERIENCE'],
          observationTarget: 'Observar si muestra relajación en los brazos',
        },
      ],
    };

    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  // TEST 4 — PURPOSELESS REPETITION METADATA
  it('TEST 4 — PURPOSELESS REPETITION METADATA: fails closed if revisit omits purpose or variation dimensions', () => {
    // 4a. Missing repetitionPurpose
    const missingPurpose: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Estimulación visual',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          variationDimensions: ['ADULT_MEDIATION'],
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(missingPurpose)).toThrow(
      /lacks required repetitionPurpose/
    );

    // 4b. Missing variationDimensions
    const missingDimensions: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Estimulación visual',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: [],
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(missingDimensions)).toThrow(
      /declares no meaningful variationDimensions/
    );

    // 4c. Role REVISIT without revisitsExperienceId
    const missingRef: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Estimulación visual',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(missingRef)).toThrow(
      /missing required revisitsExperienceId/
    );
  });

  // TEST 5 — DANGLING REVISIT
  it('TEST 5 — DANGLING REVISIT: references nonexistent or future experience -> fails closed', () => {
    // Unknown ID
    const unknownRef: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Estimulación sonora',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-nonexistent-99',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(unknownRef)).toThrow(
      /revisits unknown or future experience 'exp-nonexistent-99'/
    );

    // Future ID (references exp-2 from exp-1)
    const futureRef: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Estimulación sonora',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-2',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
        },
        { experienceId: 'exp-2', role: 'EXPLORE' },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(futureRef)).toThrow(
      /revisits unknown or future experience 'exp-2'/
    );
  });

  // TEST 6 — SELF REFERENCE
  it('TEST 6 — SELF REFERENCE: experience revisits itself -> fails closed', () => {
    const selfRef: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Movimiento en colchoneta',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(selfRef)).toThrow(
      /cannot revisit itself/
    );
  });

  // TEST 7 — SYNONYM CHANGE IS NOT STRUCTURAL VARIATION
  it('TEST 7 — SYNONYM CHANGE IS NOT STRUCTURAL VARIATION: different prose without structured variation dimensions is rejected', () => {
    // Two experiences with distinct lexical text ("acariciar suavemente" vs "deslizar delicadamente")
    // attempting to declare a revisit without specifying variationDimensions
    const synonymOnlyRevisit: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración táctil',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'VARIATION',
          // Omitting variationDimensions: synonym changes alone do NOT substitute for structural dimensions
          variationDimensions: [],
        },
      ],
    };

    expect(() => validateWeeklyPedagogicalProgression(synonymOnlyRevisit)).toThrow(
      /declares no meaningful variationDimensions/
    );
  });

  // TEST 8 — LEGITIMATE SAME-STIMULUS REVISIT
  it('TEST 8 — LEGITIMATE SAME-STIMULUS REVISIT: same material stimulus with different declared mediation passes', () => {
    // Monday exploration with educator modeling and holding; Thursday revisit with waiting for child reach
    const sameStimulusRevisit: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración táctil con telas suaves',
      experiences: [
        {
          experienceId: 'exp-mon-telas',
          role: 'EXPLORE',
          observationTarget: 'Observar reacción inicial de calma o curiosidad ante la tela',
        },
        {
          experienceId: 'exp-thu-telas',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-mon-telas',
          repetitionPurpose: 'PROGRESSION',
          variationDimensions: ['ADULT_MEDIATION', 'CHILD_AGENCY'],
          observationTarget: 'Observar si intenta extender la mano espontáneamente hacia la tela',
        },
      ],
    };

    expect(() => validateWeeklyPedagogicalProgression(sameStimulusRevisit)).not.toThrow();
  });

  // TEST 9 — NO FORCED NOVELTY
  it('TEST 9 — NO FORCED NOVELTY: week with intentional repetition is valid without demanding 10 completely distinct activities', () => {
    const validRepeatedWeek: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Canciones de cuna y arrullo',
      experiences: [
        { experienceId: 'exp-1', role: 'EXPLORE' },
        {
          experienceId: 'exp-2',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'FAMILIARIZATION',
          variationDimensions: ['ADULT_MEDIATION'],
        },
        {
          experienceId: 'exp-3',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['INTERACTION_MODE'],
        },
        {
          experienceId: 'exp-4',
          role: 'VARY',
          revisitsExperienceId: 'exp-1',
          repetitionPurpose: 'VARIATION',
          variationDimensions: ['OBSERVATION_FOCUS'],
        },
        {
          experienceId: 'exp-5',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'exp-1',
        },
      ],
    };

    expect(() => validateWeeklyPedagogicalProgression(validRepeatedWeek)).not.toThrow();
  });

  // TEST 10 — NO FABRICATED CHILD OUTCOME
  it('TEST 10 — NO FABRICATED CHILD OUTCOME: prospective targets pass; retrospective completed outcomes fail closed', () => {
    // 10a. Valid prospective targets pass
    const prospective: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Seguimiento visual',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'EXPLORE',
          observationTarget: 'Observar si el lactante sigue el movimiento lento con los ojos',
        },
        {
          experienceId: 'exp-2',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'exp-1',
          observationTarget: 'Adaptar la distancia si muestra signos de cansancio o desvía la mirada',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(prospective)).not.toThrow();

    // 10b. Fabricated completed outcomes fail closed
    const fabricatedOutcomes = [
      'El lactante logró gatear y dominó la postura',
      'El niño aprendió a sostener los objetos con precisión',
      'Ya domina la coordinación viso-motriz completamente',
      'Resultado: se alcanzó el objetivo con éxito en todos los niños',
    ];

    for (const target of fabricatedOutcomes) {
      const fabricated: WeeklyPedagogicalProgression = {
        weeklyFocus: 'Seguimiento visual',
        experiences: [
          {
            experienceId: 'exp-1',
            role: 'EXPLORE',
            observationTarget: target,
          },
        ],
      };
      expect(() => validateWeeklyPedagogicalProgression(fabricated)).toThrow(
        /contains fabricated completed outcome/
      );
    }
  });

  // TEST 11 — ONE WEEK / ONE REQUEST PRESERVED
  it('TEST 11 — ONE WEEK / ONE REQUEST PRESERVED: models the entire week in a single coherent structure', () => {
    const fullWeekProgression = createValidProgression();
    expect(fullWeekProgression.weeklyFocus).toBeDefined();
    expect(fullWeekProgression.experiences).toHaveLength(5);
    // Preserved in one week-level structure, zero per-day provider calls
    expect(() => validateWeeklyPedagogicalProgression(fullWeekProgression)).not.toThrow();
  });

  // TEST 12 — GOVERNANCE ABSENCE
  it('TEST 12 — GOVERNANCE ABSENCE: forbidden governance fields at root or experience fail closed', () => {
    const forbiddenProps = [
      'approval',
      'approved',
      'approvedBy',
      'isApproved',
      'status',
      'lifecycleState',
      'workflowState',
      'pdaId',
      'pda',
      'curricularPDA',
      'curricularTraceability',
      'catalogRevision',
      'complementaryActivities',
      'prioritizedPractices',
      'evaluation',
      'evaluations',
      'persist',
      'persistence',
    ];

    // Root level injection
    for (const prop of forbiddenProps) {
      const badRoot: any = {
        ...createValidProgression(),
        [prop]: 'forbidden_value',
      };
      expect(() => validateWeeklyPedagogicalProgression(badRoot)).toThrow(
        /contains forbidden governance property/
      );
    }

    // Experience level injection
    for (const prop of forbiddenProps) {
      const badExp: WeeklyPedagogicalProgression = {
        weeklyFocus: 'Enfoque semanal',
        experiences: [
          {
            experienceId: 'exp-1',
            role: 'EXPLORE',
            [prop]: 'forbidden_value',
          } as any,
        ],
      };
      expect(() => validateWeeklyPedagogicalProgression(badExp)).toThrow(
        /contains forbidden governance property/
      );
    }
  });

  // TEST 13 — MATERIAL AUTHORITY UNCHANGED
  it('TEST 13 — MATERIAL AUTHORITY UNCHANGED: progression metadata cannot define or authorize materials', () => {
    const materialInProgression: any = {
      weeklyFocus: 'Exploración con materiales',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'EXPLORE',
          materials: ['pelota de goma'], // Progression cannot define materials
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(materialInProgression)).toThrow(
      /cannot define materials; materialRefs is the sole material authority/
    );

    const refInProgression: any = {
      weeklyFocus: 'Exploración con materiales',
      experiences: [
        {
          experienceId: 'exp-1',
          role: 'EXPLORE',
          materialRefs: ['MAT-01'], // materialRefs belongs to activity, not progression metadata
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(refInProgression)).toThrow(
      /cannot define materials; materialRefs is the sole material authority/
    );
  });

  // TEST 14 — THIRD LIGHT FAILURE SHAPE REGRESSION
  it('TEST 14 — THIRD LIGHT FAILURE SHAPE REGRESSION: unmotivated duplicate experiences cannot claim intentional progression without structured metadata', () => {
    // Synthetic Third Light defect shape:
    // Repeated experiences across days with differing descriptive text,
    // but when marked as REVISIT without explicit revisit purpose and variation dimensions,
    // the contract strictly rejects them.
    const thirdLightDefectShape: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Lectura y nanas repetidas',
      experiences: [
        {
          experienceId: 'exp-mon-reading',
          role: 'EXPLORE',
        },
        {
          experienceId: 'exp-wed-reading',
          role: 'REVISIT',
          revisitsExperienceId: 'exp-mon-reading',
          // Lacks repetitionPurpose and variationDimensions:
          // In Third Light, this was masquerading as progression merely through paraphrased wording
        },
      ],
    };

    expect(() => validateWeeklyPedagogicalProgression(thirdLightDefectShape)).toThrow(
      /lacks required repetitionPurpose/
    );

    // Resolving via WeeklyCompositionContract also fails closed
    expect(() =>
      resolveWeeklyCompositionContract({
        progression: thirdLightDefectShape,
      })
    ).toThrow(InvalidWeeklyPlanningProposalError);

    // Validating via WeeklyPlanningProposalRequest also fails closed
    const badRequest: WeeklyPlanningProposalRequest = {
      weekStart: '2026-10-12',
      weekEnd: '2026-10-16',
      modality: 'DIRECT',
      room: { roomId: 'room-lactantes-a', name: 'Lactantes A', minAgeMonths: 0, maxAgeMonths: 6 },
      currentContext: {},
      compositionIntent: {
        progression: thirdLightDefectShape,
      },
    };
    expect(() => validateWeeklyPlanningProposalRequest(badRequest)).toThrow(
      InvalidWeeklyPlanningProposalError
    );
  });
});
