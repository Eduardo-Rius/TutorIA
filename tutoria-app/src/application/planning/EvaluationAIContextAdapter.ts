import type {
  SanitizedEvaluationAIPayload,
  SanitizedEvaluationPlannedActivity,
  SanitizedEvaluationRoomProfile,
  HumanObservationEvidence,
  EvaluationWeekday,
} from './GovernedEvaluationAIContract';
import { WeeklyPlanning, PlanningDay } from '../../domain/planning/WeeklyPlanning';
import { Room, RoomCatalog } from '../../domain/planning/RoomCatalog';
import { DIRECT_PDA_CATALOG_BY_ID } from '../../domain/planning/DirectCurricularCatalog';

export interface EvaluationAIContextAdapterOptions {
  roomResolver?: (roomId: string) => Room | undefined;
}

/**
 * Pure pedagogical context adapter for Governed Evaluation AI.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Derives provider payload strictly from server-retrieved WeeklyPlanning and validated HumanObservationEvidence.
 * 2. Strictly EXCLUDES technical identifiers (planningId, daycareId, teacherId, authUid, roomId, activityId).
 * 3. Transports prospectiveObservationTarget ONLY when present in trusted planning data; never invents or synthesizes.
 * 4. Maps PDA references only from canonical governed catalog data.
 * 5. Guarantees zero side effects and zero persistence.
 */
export function adaptPlanningToSanitizedPayload(
  planning: WeeklyPlanning,
  day: PlanningDay,
  humanEvidence: HumanObservationEvidence,
  options?: EvaluationAIContextAdapterOptions
): SanitizedEvaluationAIPayload {
  // 1. Resolve room profile from server planning (RoomCatalog or optional custom resolver)
  const room = options?.roomResolver
    ? options.roomResolver(planning.roomId)
    : RoomCatalog.getRoom(planning.roomId);

  if (!room) {
    throw new Error(`Room profile could not be resolved for roomId: ${planning.roomId}`);
  }

  const roomProfile: SanitizedEvaluationRoomProfile = {
    name: room.name,
    minAgeMonths: room.minAgeMonths,
    maxAgeMonths: room.maxAgeMonths,
  };

  // 2. Day of week (strict EvaluationWeekday)
  const dayOfWeek = day.dayOfWeek as EvaluationWeekday;

  // 3. Map planned activities
  const activities: SanitizedEvaluationPlannedActivity[] = (day.activities || []).map((act) => {
    let pdaReference: string | undefined = undefined;

    // Direct string property on activity takes precedence if present
    if (typeof (act as any).pdaReference === 'string' && (act as any).pdaReference.trim()) {
      pdaReference = (act as any).pdaReference.trim();
    } else if (act.curricularTraceability && act.curricularTraceability.length > 0) {
      const primaryRef = act.curricularTraceability[0];
      if (primaryRef && primaryRef.pdaId) {
        const catalogEntry = DIRECT_PDA_CATALOG_BY_ID.get(primaryRef.pdaId);
        pdaReference = catalogEntry ? catalogEntry.pda : primaryRef.pdaId;
      }
    }

    // Prospective observation target: ONLY if already present in trusted domain activity data
    let prospectiveObservationTarget: string | undefined = undefined;
    if (
      typeof (act as any).prospectiveObservationTarget === 'string' &&
      (act as any).prospectiveObservationTarget.trim()
    ) {
      prospectiveObservationTarget = (act as any).prospectiveObservationTarget.trim();
    } else if (
      typeof (act as any).observationTarget === 'string' &&
      (act as any).observationTarget.trim()
    ) {
      prospectiveObservationTarget = (act as any).observationTarget.trim();
    } else if (
      typeof (act as any).progression?.observationTarget === 'string' &&
      (act as any).progression.observationTarget.trim()
    ) {
      prospectiveObservationTarget = (act as any).progression.observationTarget.trim();
    }

    const plannedActivity: SanitizedEvaluationPlannedActivity = {
      category: act.category,
      objective: act.objective,
      description: act.description,
      durationMinutes: act.durationMinutes,
      ...(pdaReference ? { pdaReference } : {}),
      ...(prospectiveObservationTarget ? { prospectiveObservationTarget } : {}),
    };

    return plannedActivity;
  });

  // 4. Return strictly sanitized payload
  return {
    roomProfile,
    dayOfWeek,
    plannedContext: {
      activities,
    },
    humanEvidence: {
      activitiesDevelopment: humanEvidence.activitiesDevelopment,
      groupResponse: humanEvidence.groupResponse,
      ...(humanEvidence.adaptations ? { adaptations: humanEvidence.adaptations } : {}),
      ...(humanEvidence.continuity ? { continuity: humanEvidence.continuity } : {}),
    },
  };
}
