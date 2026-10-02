import type { ImssCategory } from '../../constants/imssCategories';
import type { Room } from '../../domain/planning/RoomCatalog';
import type {
  WeeklyPlanningProposalResponse,
  WeeklyPlanningModality,
  WeeklyPlanningWeekday,
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
 * Target evidence representation for LAB-only qualitative pedagogical review.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. ZERO DOMAIN CONTAMINATION: Pure presentation-layer observation contract.
 * 2. DETERMINISTIC: Same proposal + same context => byte-for-byte identical JSON.
 * 3. NO VOLATILE METADATA: No capturedAt, no random IDs, no correlation IDs.
 * 4. NO CREDENTIALS/PII: No UID, teacher email, tokens, secrets, child data.
 * 5. NO LIFECYCLE: No draft/approval/review/closure state.
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
      readonly category: ImssCategory;
      readonly objective: string;
      readonly description: string;
      readonly durationMinutes: number;
      readonly materials: readonly string[];
    }[];
  }[];
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
