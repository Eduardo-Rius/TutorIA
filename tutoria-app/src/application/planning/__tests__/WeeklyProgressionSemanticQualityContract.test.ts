/**
 * H1R12.5-D.5.3 — Weekly Progression Semantic Quality Contract Test Matrix (Tests 1–35)
 *
 * Implements Master ARB approved microbullet D.5.3:
 * Enforces deterministic semantic quality contracts for weekly pedagogical progression
 * relationships, resolving ambiguities exposed in Seventh Light:
 * - EXPLORE: Introduces new pedagogical experience; cannot have revisit relationship,
 *   repetitionPurpose, or variationDimensions.
 * - Relationship-bearing roles (REVISIT, VARY, DEEPEN_OR_ADAPT, OBSERVE_OR_CONSOLIDATE):
 *   Must reference a chronologically earlier canonical experience in the week.
 * - REVISIT: Requires earlier reference, repetitionPurpose, and >= 1 variationDimensions.
 * - VARY: Requires earlier reference and >= 1 variationDimensions.
 * - DEEPEN_OR_ADAPT & OBSERVE_OR_CONSOLIDATE: Require earlier reference.
 * - Flexible weekly arc preserved: NO five-role requirement, NO weekday choreography, NO quotas.
 * - Material enclosure, duration policy, daily reading provenance remain untouched.
 * - Single provider invocation, fail-closed, no retry.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  WeeklyPedagogicalProgression,
  ExperienceProgressionMetadata,
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  InvalidWeeklyPlanningProposalError,
  OFFICIAL_WEEKDAYS,
  validateWeeklyPedagogicalProgression,
  validateActivityProgressionCorrespondence,
} from '../WeeklyPlanningProposalSource';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  createRequestScopedMaterialTable,
} from '../AIWeeklyPlanningProposalSource';
import { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R12.5-D.5.3 — Weekly Progression Semantic Quality Contract (Tests 1–35)', () => {
  const sampleRoom: Room = Object.freeze({
    roomId: 'room-lactantes-a-uuid',
    name: 'Lactantes A',
    minAgeMonths: 0,
    maxAgeMonths: 6,
    capacity: 10,
  });

  const createValidRequest = (): WeeklyPlanningProposalRequest => ({
    planningId: 'plan-d53-001',
    centerId: 'center-001',
    room: sampleRoom,
    modality: 'DIRECT',
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    currentContext: {
      observations: 'Interés en exploración sensorial y seguimiento visual.',
      identifiedNeeds: 'Estimular seguimiento visual y sostén cefálico.',
      specialSituations: 'Ninguna',
      availableMaterials: 'pelotas suaves, sonaja, colchoneta',
    },
  });

  const createValidProviderResponse = () => ({
    weeklyFocus: 'Exploración sensorial y seguimiento auditivo afectuoso',
    days: OFFICIAL_WEEKDAYS.map((dayOfWeek, dayIdx) => ({
      dayOfWeek,
      date: '2026-08-24',
      activities: [
        {
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Vínculo afectivo y estimulación auditiva',
          proceduralAction: 'Leer narraciones rítmicas con voz suave observando mirada.',
          durationMinutes: 15,
          materialRefs: [],
          progression: {
            role: dayIdx === 0 ? 'EXPLORE' : 'REVISIT',
            revisitsSlot: dayIdx === 0 ? null : 'D1_A1',
            repetitionPurpose: dayIdx === 0 ? null : 'REINFORCEMENT',
            variationDimensions: dayIdx === 0 ? null : ['ADULT_MEDIATION'],
            observationTarget: 'Observar respuesta y calma afectiva',
          },
        },
        {
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Exploración sensorial táctil acompañada',
          proceduralAction: 'Ofrecer {material} para contacto suave sobre superficie limpia.',
          durationMinutes: 10,
          materialRefs: ['MAT-01'],
          progression: {
            role: 'EXPLORE',
            revisitsSlot: null,
            repetitionPurpose: null,
            variationDimensions: null,
            observationTarget: 'Observar prensión y orientación corporal',
          },
        },
      ],
    })),
  });

  // =========================================================================
  // 1. EXPLORE Semantics (Tests 1–4)
  // =========================================================================

  it('TEST 1 — VALID EXPLORE: no prior reference, no repetitionPurpose, no variationDimensions, prospective observationTarget -> PASS', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración de texturas',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar si el lactante orienta la mirada hacia el estímulo',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 2 — EXPLORE + REVISIT REFERENCE: fail closed with EXPLORE_HAS_RELATIONSHIP', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración de texturas',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar contacto visual',
        },
        {
          experienceId: 'EXP-D1-A2',
          role: 'EXPLORE',
          revisitsExperienceId: 'EXP-D1-A1',
          observationTarget: 'Observar exploración',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'EXPLORE_HAS_RELATIONSHIP',
      })
    );
  });

  it('TEST 3 — EXPLORE + REPETITION PURPOSE: fail closed with EXPLORE_HAS_REPETITION_PURPOSE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración de texturas',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          repetitionPurpose: 'REINFORCEMENT',
          observationTarget: 'Observar contacto visual',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'EXPLORE_HAS_REPETITION_PURPOSE',
      })
    );
  });

  it('TEST 4 — EXPLORE + VARIATION DIMENSIONS: fail closed with EXPLORE_HAS_VARIATION_DIMENSIONS (Seventh Light regression)', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración de texturas',
      experiences: [
        {
          experienceId: 'EXP-D2-A2',
          role: 'EXPLORE',
          variationDimensions: ['SENSORY_EXPERIENCE'],
          observationTarget: 'Observar respuesta táctil',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'EXPLORE_HAS_VARIATION_DIMENSIONS',
      })
    );
  });

  // =========================================================================
  // 2. REVISIT Semantics (Tests 5–11)
  // =========================================================================

  it('TEST 5 — VALID REVISIT: earlier reference, recognized repetitionPurpose, >=1 recognized variation dimension, prospective observation -> PASS', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Continuidad pedagógica en lectura y apego',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar atención auditiva temprana',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar si muestra mayor familiaridad con el tono de voz',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 6 — REVISIT WITHOUT REFERENCE: fail closed with REVISIT_REFERENCE_MISSING', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Continuidad pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar atención auditiva temprana',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar familiaridad',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'REVISIT_REFERENCE_MISSING',
      })
    );
  });

  it('TEST 7 — REVISIT TO CURRENT EXPERIENCE: fail closed with REVISIT_SELF_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Continuidad pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar autorreferencia',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'REVISIT_SELF_REFERENCE',
      })
    );
  });

  it('TEST 8 — REVISIT TO FUTURE EXPERIENCE: fail closed with REVISIT_FORWARD_OR_UNKNOWN_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Continuidad pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D2-A1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar referencia futura',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar atención auditiva temprana',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'REVISIT_FORWARD_OR_UNKNOWN_REFERENCE',
      })
    );
  });

  it('TEST 9 — REVISIT TO UNKNOWN EXPERIENCE: fail closed with REVISIT_FORWARD_OR_UNKNOWN_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Continuidad pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar atención auditiva temprana',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-GHOST-99',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar referencia desconocida',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'REVISIT_FORWARD_OR_UNKNOWN_REFERENCE',
      })
    );
  });

  it('TEST 10 — REVISIT WITHOUT REPETITION PURPOSE: fail closed with REVISIT_MISSING_REPETITION_PURPOSE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Continuidad pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar atención auditiva temprana',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar familiaridad',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'REPETITION_PURPOSE_MISSING_OR_INVALID',
      })
    );
  });

  it('TEST 11 — REVISIT WITHOUT VARIATION: fail closed with VARIATION_DIMENSIONS_MISSING_OR_INVALID', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Continuidad pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar atención auditiva temprana',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: [],
          observationTarget: 'Observar familiaridad',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'VARIATION_DIMENSIONS_MISSING_OR_INVALID',
      })
    );
  });

  // =========================================================================
  // 3. VARY Semantics (Tests 12–14)
  // =========================================================================

  it('TEST 12 — VALID VARY: earlier relationship, recognized variation, prospective observation -> PASS', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Exploración y variación de texturas',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar contacto visual con texturas',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'VARY',
          revisitsExperienceId: 'EXP-D1-A1',
          variationDimensions: ['SENSORY_EXPERIENCE'],
          observationTarget: 'Observar discriminación entre texturas rugosas y suaves',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 13 — VARY WITHOUT REFERENCE: fail closed with RELATIONSHIP_ROLE_MISSING_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Variación pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar exploración inicial',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'VARY',
          variationDimensions: ['SENSORY_EXPERIENCE'],
          observationTarget: 'Observar variación',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'RELATIONSHIP_ROLE_MISSING_REFERENCE',
      })
    );
  });

  it('TEST 14 — VARY WITHOUT VARIATION: fail closed with VARY_MISSING_VARIATION', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Variación pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar exploración inicial',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'VARY',
          revisitsExperienceId: 'EXP-D1-A1',
          variationDimensions: [],
          observationTarget: 'Observar variación sin dimensión',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'VARY_MISSING_VARIATION',
      })
    );
  });

  // =========================================================================
  // 4. DEEPEN_OR_ADAPT Semantics (Tests 15–16)
  // =========================================================================

  it('TEST 15 — VALID DEEPEN_OR_ADAPT: earlier relationship, prospective observation, plus canonical structure -> PASS', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Movimiento libre y acompañamiento sensible',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar postura prona inicial',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'DEEPEN_OR_ADAPT',
          revisitsExperienceId: 'EXP-D1-A1',
          observationTarget: 'Observar tiempo de sostén y comodidad en la postura',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 16 — DEEPEN_OR_ADAPT WITHOUT REFERENCE: fail closed with RELATIONSHIP_ROLE_MISSING_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Profundización pedagógica',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar inicio',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'DEEPEN_OR_ADAPT',
          observationTarget: 'Observar profundización sin referencia previa',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'RELATIONSHIP_ROLE_MISSING_REFERENCE',
      })
    );
  });

  // =========================================================================
  // 5. OBSERVE_OR_CONSOLIDATE Semantics (Tests 17–18)
  // =========================================================================

  it('TEST 17 — VALID OBSERVE_OR_CONSOLIDATE: earlier relationship, prospective observation -> PASS', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Consolidación semanal afectiva',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar interacción inicial',
        },
        {
          experienceId: 'EXP-D5-A1',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'EXP-D1-A1',
          observationTarget: 'Observar serenidad compartida y relajación al cierre de la semana',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 18 — OBSERVE_OR_CONSOLIDATE WITHOUT REFERENCE: fail closed with RELATIONSHIP_ROLE_MISSING_REFERENCE', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Consolidación semanal',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar interacción inicial',
        },
        {
          experienceId: 'EXP-D5-A1',
          role: 'OBSERVE_OR_CONSOLIDATE',
          observationTarget: 'Observar consolidación sin referencia',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'RELATIONSHIP_ROLE_MISSING_REFERENCE',
      })
    );
  });

  // =========================================================================
  // 6. Observation Target Quality (Tests 19–20)
  // =========================================================================

  it('TEST 19 — PROSPECTIVE OBSERVATION PRESERVED: prospective observational goals pass validation', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Seguimiento visual y vocalización',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar si el lactante orienta la mirada hacia el rostro de la educadora',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 20 — RETROSPECTIVE OBSERVATION CLAIM: fail closed on retrospective developmental claims', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Seguimiento visual',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'El lactante logró gatear y dominó la postura',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'INVALID_PROSPECTIVE_OBSERVATION',
      })
    );
  });

  // =========================================================================
  // 7. Flexible Weekly Arc Preserved (Tests 21–25)
  // =========================================================================

  it('TEST 21 — FLEXIBLE WEEK WITH ONLY EXPLORE + REVISIT: semantically valid week with no five-role quota passes', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Vínculo y exploración temprana',
      experiences: [
        { experienceId: 'EXP-D1-A1', role: 'EXPLORE', observationTarget: 'Observar respuesta inicial' },
        { experienceId: 'EXP-D1-A2', role: 'EXPLORE', observationTarget: 'Observar contacto visual' },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar reconocimiento',
        },
        { experienceId: 'EXP-D2-A2', role: 'EXPLORE', observationTarget: 'Observar descanso' },
        {
          experienceId: 'EXP-D3-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'FAMILIARIZATION',
          variationDimensions: ['INTERACTION_MODE'],
          observationTarget: 'Observar familiarización',
        },
        { experienceId: 'EXP-D3-A2', role: 'EXPLORE', observationTarget: 'Observar movimiento' },
        {
          experienceId: 'EXP-D4-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D2-A2',
          repetitionPurpose: 'PROGRESSION',
          variationDimensions: ['CHILD_AGENCY'],
          observationTarget: 'Observar autonomía',
        },
        { experienceId: 'EXP-D4-A2', role: 'EXPLORE', observationTarget: 'Observar postura' },
        {
          experienceId: 'EXP-D5-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'RESPONSE_OBSERVATION',
          variationDimensions: ['OBSERVATION_FOCUS'],
          observationTarget: 'Observar respuesta final',
        },
        { experienceId: 'EXP-D5-A2', role: 'EXPLORE', observationTarget: 'Observar tranquilidad' },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 22 — VALID WEEK WITHOUT VARY: passes cleanly', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Semana sin rol VARY',
      experiences: [
        { experienceId: 'EXP-1', role: 'EXPLORE', observationTarget: 'Observar inicio' },
        {
          experienceId: 'EXP-2',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar repetición',
        },
        {
          experienceId: 'EXP-3',
          role: 'DEEPEN_OR_ADAPT',
          revisitsExperienceId: 'EXP-1',
          observationTarget: 'Observar profundización',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 23 — VALID WEEK WITHOUT DEEPEN_OR_ADAPT: passes cleanly', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Semana sin rol DEEPEN_OR_ADAPT',
      experiences: [
        { experienceId: 'EXP-1', role: 'EXPLORE', observationTarget: 'Observar inicio' },
        {
          experienceId: 'EXP-2',
          role: 'VARY',
          revisitsExperienceId: 'EXP-1',
          variationDimensions: ['SENSORY_EXPERIENCE'],
          observationTarget: 'Observar variación',
        },
        {
          experienceId: 'EXP-3',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'EXP-1',
          observationTarget: 'Observar consolidación',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 24 — VALID WEEK WITHOUT OBSERVE_OR_CONSOLIDATE: passes cleanly', () => {
    const progression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Semana sin rol OBSERVE_OR_CONSOLIDATE',
      experiences: [
        { experienceId: 'EXP-1', role: 'EXPLORE', observationTarget: 'Observar inicio' },
        {
          experienceId: 'EXP-2',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-1',
          repetitionPurpose: 'FAMILIARIZATION',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar familiarización',
        },
        {
          experienceId: 'EXP-3',
          role: 'VARY',
          revisitsExperienceId: 'EXP-1',
          variationDimensions: ['INTERACTION_MODE'],
          observationTarget: 'Observar variación de interacción',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(progression)).not.toThrow();
  });

  it('TEST 25 — NO FIXED WEEKDAY ROLE ORDER: non-monotonic role sequence passes validation', () => {
    // Week with varied ordering:
    // D1: EXPLORE, VARY (revisiting D1_A1)
    // D2: REVISIT (revisiting D1_A1), EXPLORE
    // D3: EXPLORE, DEEPEN_OR_ADAPT (revisiting D2_A2)
    // D4: OBSERVE_OR_CONSOLIDATE (revisiting D1_A1), REVISIT (revisiting D3_A1)
    // D5: EXPLORE, VARY (revisiting D5_A1)
    const nonMonotonicProgression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Arc flexible no secuencial',
      experiences: [
        { experienceId: 'EXP-D1-A1', role: 'EXPLORE', observationTarget: 'Observar inicio D1A1' },
        {
          experienceId: 'EXP-D1-A2',
          role: 'VARY',
          revisitsExperienceId: 'EXP-D1-A1',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar variación D1A2',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['INTERACTION_MODE'],
          observationTarget: 'Observar revisit D2A1',
        },
        { experienceId: 'EXP-D2-A2', role: 'EXPLORE', observationTarget: 'Observar inicio D2A2' },
        { experienceId: 'EXP-D3-A1', role: 'EXPLORE', observationTarget: 'Observar inicio D3A1' },
        {
          experienceId: 'EXP-D3-A2',
          role: 'DEEPEN_OR_ADAPT',
          revisitsExperienceId: 'EXP-D2-A2',
          observationTarget: 'Observar profundización D3A2',
        },
        {
          experienceId: 'EXP-D4-A1',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'EXP-D1-A1',
          observationTarget: 'Observar consolidación D4A1',
        },
        {
          experienceId: 'EXP-D4-A2',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D3-A1',
          repetitionPurpose: 'VARIATION',
          variationDimensions: ['SENSORY_EXPERIENCE'],
          observationTarget: 'Observar revisit D4A2',
        },
        { experienceId: 'EXP-D5-A1', role: 'EXPLORE', observationTarget: 'Observar inicio D5A1' },
        {
          experienceId: 'EXP-D5-A2',
          role: 'VARY',
          revisitsExperienceId: 'EXP-D5-A1',
          variationDimensions: ['GROUP_ORGANIZATION'],
          observationTarget: 'Observar variación D5A2',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(nonMonotonicProgression)).not.toThrow();
  });

  // =========================================================================
  // 8. Server-Controlled Identity & Bijection (Tests 26–28)
  // =========================================================================

  it('TEST 26 — SERVER-CONTROLLED EXPERIENCE IDS PRESERVED: server deterministically projects canonical experienceId', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(response.progression).toBeDefined();
    expect(response.progression?.experiences).toHaveLength(10);
    // Canonical format: EXP-D{dayIndex+1}-A{actIndex+1}
    expect(response.progression?.experiences[0].experienceId).toBe('EXP-D1-A1');
    expect(response.progression?.experiences[1].experienceId).toBe('EXP-D1-A2');
    expect(response.progression?.experiences[2].experienceId).toBe('EXP-D2-A1');
    expect(response.progression?.experiences[9].experienceId).toBe('EXP-D5-A2');
  });

  it('TEST 27 — PROVIDER CANNOT INJECT EXPERIENCE ID: provider experienceId fails closed under approved boundary', async () => {
    const rawOutput = createValidProviderResponse();
    (rawOutput['days'] as any[])[0].activities[0].experienceId = 'MALICIOUS_INJECTED_ID_666';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'UNKNOWN_PROGRESSION_FIELD',
      })
    );
  });

  it('TEST 28 — CANONICAL ACTIVITY ↔ PROGRESSION BIJECTION PRESERVED: 10 activities map exactly to 10 progression experiences', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    expect(() =>
      validateActivityProgressionCorrespondence(response.days, response.progression!)
    ).not.toThrow();
  });

  // =========================================================================
  // 9. Architecture Invariants: Material Enclosure, Single Call, No Retry, Reading Provenance (Tests 29–32)
  // =========================================================================

  it('TEST 29 — MATERIAL ENCLOSURE REGRESSION: request-scoped material table projection preserved untouched', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(rawOutput),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response = await source.propose(createValidRequest());

    // MAT-01 is 'pelotas suaves' from currentContext.availableMaterials
    expect(response.days[0].activities[1].materials).toEqual(['pelotas suaves']);
  });

  it('TEST 30 — ONE PROVIDER INVOCATION: provider executed exactly once per proposal request', async () => {
    const rawOutput = createValidProviderResponse();
    const mockExecute = vi.fn().mockResolvedValue(rawOutput);
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: mockExecute };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await source.propose(createValidRequest());
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('TEST 31 — NO RETRY: on AI failure, fails closed immediately without retry loop', async () => {
    const mockExecute = vi.fn().mockRejectedValue(new Error('AI provider connection timeout'));
    const mockExecutor: WeeklyPlanningAIExecutor = { execute: mockExecute };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    await expect(source.propose(createValidRequest())).rejects.toThrow('AI provider connection timeout');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('TEST 32 — DAILY READING PROVENANCE REGRESSION: prompt preserves TUTORIA V1 PRODUCT POLICY attribution', async () => {
    let capturedSystemPrompt = '';
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn(async (payload) => {
        capturedSystemPrompt = payload.systemPrompt;
        return createValidProviderResponse();
      }),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    await source.propose(createValidRequest());

    expect(capturedSystemPrompt).toContain('TUTORIA V1 PRODUCT POLICY');
    expect(capturedSystemPrompt).toContain('NOT ESTABLISHED HERE AS A CURRENT IMSS NORMATIVE REQUIREMENT');
  });

  // =========================================================================
  // 10. Seventh Light Specific Regressions (Tests 33–34)
  // =========================================================================

  it('TEST 33 — SEVENTH LIGHT INVALID EXPLORE VARIATION REGRESSION: EXPLORE with variationDimensions fails closed', () => {
    // Synthetic equivalent of Seventh Light EXP-D2-A2, EXP-D3-A2, EXP-D5-A2
    const seventhLightExplore: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Desarrollo motor y juego afectivo',
      experiences: [
        {
          experienceId: 'EXP-D2-A2',
          role: 'EXPLORE',
          variationDimensions: ['SENSORY_EXPERIENCE'],
          observationTarget: 'Observar respuesta táctil y relajación corporal',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(seventhLightExplore)).toThrowError(
      expect.objectContaining({
        diagnosticSubtype: 'EXPLORE_HAS_VARIATION_DIMENSIONS',
      })
    );
  });

  it('TEST 34 — SEVENTH LIGHT VALID REVISIT REGRESSION: REVISIT -> earlier experience, REINFORCEMENT, ADULT_MEDIATION -> PASS', () => {
    // Synthetic equivalent of Seventh Light EXP-D2-A1: REVISIT -> EXP-D1-A1
    const seventhLightRevisit: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Desarrollo motor y juego afectivo',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Observar contacto visual con el cuento de tela',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'REVISIT',
          revisitsExperienceId: 'EXP-D1-A1',
          repetitionPurpose: 'REINFORCEMENT',
          variationDimensions: ['ADULT_MEDIATION'],
          observationTarget: 'Observar si muestra mayor tranquilidad al escuchar la lectura compartida',
        },
      ],
    };
    expect(() => validateWeeklyPedagogicalProgression(seventhLightRevisit)).not.toThrow();
  });

  // =========================================================================
  // 11. No Role Distribution Quotas (Test 35)
  // =========================================================================

  it('TEST 35 — NO ROLE DISTRIBUTION QUOTA: a semantically valid week composed exclusively of EXPLORE activities passes', () => {
    const allExploreProgression: WeeklyPedagogicalProgression = {
      weeklyFocus: 'Semana introductoria de adaptación y exploración sensorial',
      experiences: Array.from({ length: 10 }, (_, idx) => ({
        experienceId: `EXP-D${Math.floor(idx / 2) + 1}-A${(idx % 2) + 1}`,
        role: 'EXPLORE',
        observationTarget: `Observar adaptación y respuestas exploratorias ${idx + 1}`,
      })),
    };
    expect(() => validateWeeklyPedagogicalProgression(allExploreProgression)).not.toThrow();
  });
});
