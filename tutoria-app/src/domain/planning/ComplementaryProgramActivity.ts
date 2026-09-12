/**
 * Explicit domain representation of a human-governed complementary program activity
 * (Actividad complementaria de otro programa institucional).
 *
 * Institutional Rule:
 * Complementary activities are actions originating from an institutional,
 * intra-institutional or extra-institutional program / instruction received
 * by the daycare. They are human-governed inputs and MUST NOT be autonomously
 * invented or inferred by AI.
 */
export interface ComplementaryProgramActivity {
  readonly programArea: string;
  readonly activityName: string;
  readonly purpose?: string;
  readonly description?: string;
  readonly sourceReference?: string;
}

export class InvalidComplementaryActivityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidComplementaryActivityError';
  }
}

/**
 * Validates a single complementary activity entry.
 *
 * Requirements:
 * - Must be an object.
 * - programArea must be non-blank, non-whitespace string.
 * - activityName must be non-blank, non-whitespace string.
 * - Optional fields (purpose, description, sourceReference) are trimmed if provided.
 */
export function validateComplementaryProgramActivity(
  activity: ComplementaryProgramActivity
): ComplementaryProgramActivity {
  if (!activity || typeof activity !== 'object') {
    throw new InvalidComplementaryActivityError(
      'Complementary activity must be a valid object'
    );
  }

  if (
    typeof activity.programArea !== 'string' ||
    activity.programArea.trim().length === 0
  ) {
    throw new InvalidComplementaryActivityError(
      'Originating program/instruction (programArea) cannot be blank or whitespace'
    );
  }

  if (
    typeof activity.activityName !== 'string' ||
    activity.activityName.trim().length === 0
  ) {
    throw new InvalidComplementaryActivityError(
      'Activity name (activityName) cannot be blank or whitespace'
    );
  }

  return {
    programArea: activity.programArea.trim(),
    activityName: activity.activityName.trim(),
    ...(activity.purpose !== undefined && activity.purpose !== null
      ? { purpose: typeof activity.purpose === 'string' ? activity.purpose.trim() : activity.purpose }
      : {}),
    ...(activity.description !== undefined && activity.description !== null
      ? { description: typeof activity.description === 'string' ? activity.description.trim() : activity.description }
      : {}),
    ...(activity.sourceReference !== undefined && activity.sourceReference !== null
      ? { sourceReference: typeof activity.sourceReference === 'string' ? activity.sourceReference.trim() : activity.sourceReference }
      : {}),
  };
}

/**
 * Validates an array of complementary activities atomically.
 * If any entry is invalid, the entire operation is rejected before mutation.
 */
export function validateComplementaryProgramActivities(
  activities: readonly ComplementaryProgramActivity[]
): ComplementaryProgramActivity[] {
  if (!activities || !Array.isArray(activities)) {
    throw new InvalidComplementaryActivityError(
      'Complementary activities must be an array'
    );
  }

  return activities.map(validateComplementaryProgramActivity);
}
