/**
 * Explicit domain representation of a human-governed prioritized practice
 * (Práctica priorizada a implementar).
 *
 * Institutional Rule:
 * A prioritized practice exists ONLY when there is an applicable formal
 * institutional instruction, mentoring/accompaniment process, or equivalent
 * authoritative source.
 * They are human-governed inputs and MUST NOT be autonomously invented or inferred by AI.
 */
export interface PrioritizedPractice {
  readonly practiceName: string;
  readonly sourceReference?: string;
}

export class InvalidPrioritizedPracticeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPrioritizedPracticeError";
  }
}

/**
 * Validates a single prioritized practice entry.
 *
 * Requirements:
 * - Must be an object.
 * - practiceName must be non-blank, non-whitespace string.
 * - Optional sourceReference is trimmed if provided.
 */
export function validatePrioritizedPractice(
  practice: PrioritizedPractice
): PrioritizedPractice {
  if (!practice || typeof practice !== "object") {
    throw new InvalidPrioritizedPracticeError(
      "Prioritized practice must be a valid object"
    );
  }

  if (
    typeof practice.practiceName !== "string" ||
    practice.practiceName.trim().length === 0
  ) {
    throw new InvalidPrioritizedPracticeError(
      "Practice name (practiceName) cannot be blank or whitespace"
    );
  }

  return {
    practiceName: practice.practiceName.trim(),
    ...(practice.sourceReference !== undefined && practice.sourceReference !== null
      ? { sourceReference: typeof practice.sourceReference === "string" ? practice.sourceReference.trim() : practice.sourceReference }
      : {}),
  };
}

/**
 * Validates an array of prioritized practices atomically.
 * If any entry is invalid, the entire operation is rejected before mutation.
 */
export function validatePrioritizedPractices(
  practices: readonly PrioritizedPractice[]
): PrioritizedPractice[] {
  if (!practices || !Array.isArray(practices)) {
    throw new InvalidPrioritizedPracticeError(
      "Prioritized practices must be an array"
    );
  }

  return practices.map(validatePrioritizedPractice);
}
