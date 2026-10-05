import type { ImssCategory } from '../../constants/imssCategories';
import type { Room } from '../../domain/planning/RoomCatalog';
import {
  type WeeklyPlanningProposalResponse,
  type WeeklyPlanningModality,
  type WeeklyPlanningWeekday,
  type ExperienceCompositionRole,
  type IntentionalRepetitionPurpose,
  type PedagogicalVariationDimension,
  type ExperienceProgressionMetadata,
} from '../../application/planning/WeeklyPlanningProposalSource';

/**
 * Supported weekdays in canonical order for official school week.
 */
export const CANONICAL_WEEKDAY_ORDER: readonly WeeklyPlanningWeekday[] = Object.freeze([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
]);

/**
 * Minimal presentation-layer evidence context provided by canonical runtime.
 * INVARIANT: VISIBLE ROOM = GENERATION ROOM = EVIDENCE ROOM.
 */
export interface WeeklyPlanningEvidenceContext {
  readonly room: Room;
  readonly modality: WeeklyPlanningModality;
  readonly weekStart: string;
  readonly weekEnd: string;
}

/**
 * Progression experience evidence representing one activity's pedagogical progression metadata.
 */
export interface PedagogicalProgressionExperienceEvidence {
  readonly experienceId: string;
  readonly dayOfWeek: WeeklyPlanningWeekday;
  readonly activityIndex: number;
  readonly role: ExperienceCompositionRole;
  readonly revisitsExperienceId?: string;
  readonly repetitionPurpose?: IntentionalRepetitionPurpose;
  readonly variationDimensions?: readonly PedagogicalVariationDimension[];
  readonly observationTarget?: string;
}

/**
 * Bounded pedagogical progression section within LAB evidence.
 */
export interface PedagogicalProgressionEvidence {
  readonly weeklyFocus: string;
  readonly experiences: readonly PedagogicalProgressionExperienceEvidence[];
}

/**
 * Target evidence representation for LAB-only qualitative pedagogical review.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. ZERO DOMAIN CONTAMINATION: Pure presentation-layer observation contract.
 * 2. DETERMINISTIC: Same proposal + same context => byte-for-byte identical JSON.
 * 3. NO VOLATILE METADATA: No capturedAt, no random IDs, no correlation IDs.
 * 4. NO CREDENTIALS/PII: No UID, teacher email, tokens, secrets, child data.
 * 5. NO LIFECYCLE: No draft/approval/review/closure state.
 * 6. TRUSTED CANONICAL: Serializes accepted progression, not raw provider output.
 */
export interface WeeklyPlanningProposalEvidence {
  readonly version: '1.0';

  readonly room: {
    readonly roomId: string;
    readonly name: string;
    readonly minAgeMonths: number;
    readonly maxAgeMonths: number;
  };

  readonly modality: WeeklyPlanningModality;

  readonly weekStart: string;
  readonly weekEnd: string;

  readonly days: readonly {
    readonly dayOfWeek: WeeklyPlanningWeekday;
    readonly date?: string;

    readonly activities: readonly {
      readonly experienceId?: string;
      readonly category: ImssCategory;
      readonly objective: string;
      readonly description: string;
      readonly durationMinutes: number;
      readonly materials: readonly string[];
    }[];
  }[];

  readonly pedagogicalProgression: PedagogicalProgressionEvidence;
}

/**
 * Transforms a validated WeeklyPlanningProposalResponse and canonical evidence context
 * into a pure, deterministic WeeklyPlanningProposalEvidence structure.
 *
 * Invariants:
 * - Does NOT mutate the input proposal.
 * - Weekdays strictly ordered: Monday to Friday.
 * - Activity ordering within each day strictly preserved.
 * - Materials ordering within each activity strictly preserved.
 * - Every activity maps to exactly one canonical progression entry.
 * - Fails closed if trusted canonical progression is missing or invalid.
 * - Excludes all lifecycle, auth, tokens, provider metadata, and timestamps.
 */
export function buildWeeklyPlanningProposalEvidence(
  proposal: WeeklyPlanningProposalResponse,
  context: WeeklyPlanningEvidenceContext
): WeeklyPlanningProposalEvidence {
  if (!proposal || !Array.isArray(proposal.days)) {
    throw new Error('Invalid proposal: proposal.days must be an array.');
  }
  if (!context || !context.room) {
    throw new Error('Invalid context: room context is required.');
  }
  if (!proposal.progression || typeof proposal.progression !== 'object') {
    throw new Error('Invalid proposal: trusted canonical pedagogical progression is required for LAB evidence.');
  }
  if (
    typeof proposal.progression.weeklyFocus !== 'string' ||
    !proposal.progression.weeklyFocus.trim()
  ) {
    throw new Error('Invalid proposal: progression.weeklyFocus must be a non-empty string.');
  }
  if (!Array.isArray(proposal.progression.experiences)) {
    throw new Error('Invalid proposal: progression.experiences must be an array.');
  }

  const dayMap = new Map(proposal.days.map((d) => [d.dayOfWeek, d]));

  const orderedDays = CANONICAL_WEEKDAY_ORDER.map((weekday) => {
    const day = dayMap.get(weekday);
    if (!day) {
      throw new Error(`Missing required weekday in proposal: ${weekday}`);
    }
    return Object.freeze({
      dayOfWeek: day.dayOfWeek,
      ...(day.date ? { date: day.date } : {}),
      activities: Object.freeze(
        day.activities.map((act) =>
          Object.freeze({
            ...(act.experienceId ? { experienceId: act.experienceId } : {}),
            category: act.category,
            objective: act.objective,
            description: act.description,
            durationMinutes: act.durationMinutes,
            materials: Object.freeze([...act.materials]),
          })
        )
      ),
    });
  });

  const progressionExpMap = new Map<string, ExperienceProgressionMetadata>();
  for (const exp of proposal.progression.experiences) {
    if (exp && typeof exp.experienceId === 'string') {
      progressionExpMap.set(exp.experienceId, exp);
    }
  }

  let flatIndex = 0;
  const progressionExperiences: PedagogicalProgressionExperienceEvidence[] = [];

  for (const day of orderedDays) {
    for (let actIdx = 0; actIdx < day.activities.length; actIdx++) {
      const act = day.activities[actIdx];
      let matchedExp: ExperienceProgressionMetadata | undefined;

      if (act.experienceId && progressionExpMap.has(act.experienceId)) {
        matchedExp = progressionExpMap.get(act.experienceId);
      } else if (flatIndex < proposal.progression.experiences.length) {
        matchedExp = proposal.progression.experiences[flatIndex];
      }

      if (!matchedExp) {
        throw new Error(
          `Cannot correlate activity at ${day.dayOfWeek} index ${actIdx} to a canonical progression experience.`
        );
      }

      progressionExperiences.push(
        Object.freeze({
          experienceId: matchedExp.experienceId,
          dayOfWeek: day.dayOfWeek,
          activityIndex: actIdx,
          role: matchedExp.role,
          ...(matchedExp.revisitsExperienceId
            ? { revisitsExperienceId: matchedExp.revisitsExperienceId }
            : {}),
          ...(matchedExp.repetitionPurpose
            ? { repetitionPurpose: matchedExp.repetitionPurpose }
            : {}),
          ...(matchedExp.variationDimensions && matchedExp.variationDimensions.length > 0
            ? { variationDimensions: Object.freeze([...matchedExp.variationDimensions]) }
            : {}),
          ...(matchedExp.observationTarget
            ? { observationTarget: matchedExp.observationTarget }
            : {}),
        })
      );

      flatIndex++;
    }
  }

  if (progressionExperiences.length !== proposal.progression.experiences.length) {
    throw new Error(
      `Progression experiences count (${progressionExperiences.length}) does not match canonical progression count (${proposal.progression.experiences.length}).`
    );
  }

  return Object.freeze({
    version: '1.0' as const,
    room: Object.freeze({
      roomId: context.room.roomId,
      name: context.room.name,
      minAgeMonths: context.room.minAgeMonths,
      maxAgeMonths: context.room.maxAgeMonths,
    }),
    modality: context.modality,
    weekStart: context.weekStart,
    weekEnd: context.weekEnd,
    days: Object.freeze(orderedDays),
    pedagogicalProgression: Object.freeze({
      weeklyFocus: proposal.progression.weeklyFocus,
      experiences: Object.freeze(progressionExperiences),
    }),
  });
}

/**
 * Deterministic serializer: converts proposal + context into human-readable JSON string.
 * Guaranteed byte-for-byte identical output for the same input.
 */
export function serializeWeeklyPlanningProposalEvidence(
  proposal: WeeklyPlanningProposalResponse,
  context: WeeklyPlanningEvidenceContext
): string {
  const evidence = buildWeeklyPlanningProposalEvidence(proposal, context);
  return JSON.stringify(evidence, null, 2);
}
