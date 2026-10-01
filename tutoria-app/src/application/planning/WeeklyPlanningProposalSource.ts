import { IMSS_CATEGORIES, type ImssCategory } from '../../constants/imssCategories';
import type { Room } from '../../domain/planning/RoomCatalog';
import type { PedagogicalPolicyViolation } from '../../domain/planning/PedagogicalAgePolicy';

/**
 * Custom error thrown when a weekly planning proposal request or response violates
 * canonical contract invariants.
 */
export class InvalidWeeklyPlanningProposalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWeeklyPlanningProposalError';
  }
}

/**
 * Thrown when the requested room or age profile has no matching pedagogical age policy.
 */
export class UnsupportedPedagogicalPolicyError extends InvalidWeeklyPlanningProposalError {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPedagogicalPolicyError';
  }
}

/**
 * Thrown when an AI proposal violates pedagogical safety or age-appropriate development policy.
 */
export class PedagogicalPolicyViolationError extends InvalidWeeklyPlanningProposalError {
  constructor(
    message: string,
    public readonly violations: readonly PedagogicalPolicyViolation[] = []
  ) {
    super(message);
    this.name = 'PedagogicalPolicyViolationError';
  }
}

/**
 * Thrown when an AI proposal requires materials outside the educator-supplied available materials set.
 */
export class BlockingMaterialPolicyViolationError extends PedagogicalPolicyViolationError {
  constructor(
    message: string,
    violations: readonly PedagogicalPolicyViolation[] = []
  ) {
    super(message, violations);
    this.name = 'BlockingMaterialPolicyViolationError';
  }
}

/**
 * Thrown when an AI proposal does not meet the product default daily activity density target.
 */
export class WeeklyPlanningDensityViolationError extends InvalidWeeklyPlanningProposalError {
  constructor(message: string) {
    super(message);
    this.name = 'WeeklyPlanningDensityViolationError';
  }
}

/**
 * Supported planning modalities for Weekly Planning.
 * Natively supports both Prestación Directa and Prestación Indirecta.
 */
export type WeeklyPlanningModality = 'DIRECT' | 'INDIRECT';

/**
 * Supported weekdays for an official 5-day school week.
 */
export type WeeklyPlanningWeekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export const OFFICIAL_WEEKDAYS: readonly WeeklyPlanningWeekday[] = Object.freeze([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
]);

/**
 * Maximum character length allowed for individual free-text context fields.
 * Explicitly labeled as a technical abuse-prevention ceiling, not an institutional norm.
 */
export const TECHNICAL_MAX_CONTEXT_FIELD_LENGTH = 5000;

/**
 * Maximum character length allowed for an activity objective.
 * Explicitly labeled as a technical abuse-prevention ceiling, not an institutional norm.
 */
export const TECHNICAL_MAX_OBJECTIVE_LENGTH = 500;

/**
 * Maximum character length allowed for an activity description.
 * Explicitly labeled as a technical abuse-prevention ceiling, not an institutional norm.
 */
export const TECHNICAL_MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Minimum and maximum duration in minutes for a single proposed activity.
 * Explicitly labeled as technical abuse-prevention bounds, not institutional norms.
 */
export const TECHNICAL_MIN_DURATION_MINUTES = 5;
export const TECHNICAL_MAX_DURATION_MINUTES = 180;

/**
 * Maximum items and individual item length for activity materials.
 * Explicitly labeled as technical abuse-prevention bounds, not institutional norms.
 */
export const TECHNICAL_MAX_MATERIALS_COUNT = 25;
export const TECHNICAL_MAX_MATERIAL_NAME_LENGTH = 200;

/**
 * Current weekly pedagogical context provided by educator Anita.
 *
 * PRIVACY & DATA MINIMIZATION NOTICE:
 * This context is represented ONCE at the weekly proposal request level.
 * Free-text fields are untrusted pedagogical input and MUST NOT contain child names,
 * child IDs, family names, medical records/diagnoses, CURP, phone numbers, addresses,
 * authentication credentials, or other Personally Identifiable Information (PII).
 */
export interface WeeklyPlanningCurrentContext {
  readonly observations?: string;
  readonly identifiedNeeds?: string;
  readonly specialSituations?: string;
  readonly availableMaterials?: string;
}

/**
 * Technical generation bounds to prevent abuse and malformed payloads.
 * Labeled explicitly as technical boundaries, not institutional pedagogical norms.
 */
export interface WeeklyPlanningProposalConstraints {
  readonly allowedCategories?: readonly ImssCategory[];
  readonly minActivitiesPerDay?: number;
  readonly maxActivitiesPerDay?: number;
  readonly minDurationMinutes?: number;
  readonly maxDurationMinutes?: number;
}

/**
 * Application-level request contract for proposing a 5-day weekly pedagogical plan.
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. PROPOSAL != PLANNING: Requesting a proposal creates no domain aggregate or persistence.
 * 2. PRIVACY MINIMIZATION: Zero child PII, zero credentials, zero teacher emails.
 * 3. NO PEDAGOGICAL MEMORY: Memory is intentionally absent from this baseline contract.
 * 4. MODALITY NEUTRAL: Supports both DIRECT and INDIRECT modalities equally.
 */
export interface WeeklyPlanningProposalRequest {
  readonly planningId?: string;
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly modality: WeeklyPlanningModality;
  readonly room: Room;
  readonly currentContext: WeeklyPlanningCurrentContext;
  readonly constraints?: WeeklyPlanningProposalConstraints;
}

/**
 * A single proposed core pedagogical activity.
 *
 * Restricted strictly to fields AI may legitimately propose.
 * Explicitly EXCLUDES:
 * - curricularTraceability (decision reserved for educator or post-activity H1R10 flow)
 * - complementaryActivities (institutional mandate reserved for human authority)
 * - prioritizedPractices (institutional mentoring reserved for human authority)
 * - evaluations (human observation reserved for post-execution)
 * - approval status
 */
export interface ProposedActivity {
  readonly category: ImssCategory;
  readonly objective: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly materials: readonly string[];
}

/**
 * A single candidate planning day within the proposed week.
 * Represents transient proposal content for one weekday.
 */
export interface ProposedPlanningDay {
  readonly dayOfWeek: WeeklyPlanningWeekday;
  readonly date?: string;
  readonly activities: readonly ProposedActivity[];
}

/**
 * Application-level response contract representing a transient proposed week.
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. PROPOSAL != PLANNING: This is NOT a WeeklyPlanning aggregate.
 * 2. NO LIFECYCLE: Contains zero status (DRAFT, IN_REVIEW, APPROVED, CLOSED, etc.).
 * 3. NO REVIEWS/APPROVALS: Contains zero approval/signature/review metadata.
 * 4. TRANSIENT: Exists in application memory only until explicit human acceptance.
 */
export interface WeeklyPlanningProposalResponse {
  readonly days: readonly ProposedPlanningDay[];
}

/**
 * Provider port for weekly planning proposal intelligence.
 *
 * The provider interface returns transient data only.
 * It receives zero repository authority, zero database access, and zero mutable domain state.
 */
export interface WeeklyPlanningProposalSource {
  propose(
    request: WeeklyPlanningProposalRequest
  ): Promise<WeeklyPlanningProposalResponse>;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  // Verify round-trip ISO date to prevent invalid dates like 2026-02-31
  const dateObj = new Date(parsed);
  return dateObj.toISOString().slice(0, 10) === value;
}

/**
 * Validates a WeeklyPlanningProposalRequest ensuring it satisfies all canonical invariants.
 */
export function validateWeeklyPlanningProposalRequest(
  request: WeeklyPlanningProposalRequest
): void {
  if (!request || typeof request !== 'object') {
    throw new InvalidWeeklyPlanningProposalError('Proposal request must be a valid non-null object.');
  }

  // 1. Validate planningId if provided
  if (request.planningId !== undefined) {
    if (typeof request.planningId !== 'string' || !request.planningId.trim()) {
      throw new InvalidWeeklyPlanningProposalError('Invalid planningId in proposal request.');
    }
  }

  // 2. Validate modality
  if (request.modality !== 'DIRECT' && request.modality !== 'INDIRECT') {
    throw new InvalidWeeklyPlanningProposalError(
      `Invalid modality '${String((request as any).modality)}'. Must be 'DIRECT' or 'INDIRECT'.`
    );
  }

  // 3. Validate week boundaries
  if (!request.weekStart || typeof request.weekStart !== 'string' || !isValidIsoDate(request.weekStart)) {
    throw new InvalidWeeklyPlanningProposalError(
      `Invalid weekStart '${String(request.weekStart)}'. Must be a valid ISO date string (YYYY-MM-DD).`
    );
  }

  if (!request.weekEnd || typeof request.weekEnd !== 'string' || !isValidIsoDate(request.weekEnd)) {
    throw new InvalidWeeklyPlanningProposalError(
      `Invalid weekEnd '${String(request.weekEnd)}'. Must be a valid ISO date string (YYYY-MM-DD).`
    );
  }

  if (request.weekStart > request.weekEnd) {
    throw new InvalidWeeklyPlanningProposalError(
      `weekStart (${request.weekStart}) cannot be later than weekEnd (${request.weekEnd}).`
    );
  }

  // 4. Validate room context
  if (!request.room || typeof request.room !== 'object') {
    throw new InvalidWeeklyPlanningProposalError('Proposal request must contain a valid room context object.');
  }

  const { roomId, name, minAgeMonths, maxAgeMonths } = request.room;

  if (typeof roomId !== 'string' || !roomId.trim()) {
    throw new InvalidWeeklyPlanningProposalError('Room context must contain a non-empty string roomId.');
  }

  if (typeof name !== 'string' || !name.trim()) {
    throw new InvalidWeeklyPlanningProposalError('Room context must contain a non-empty string name.');
  }

  if (
    typeof minAgeMonths !== 'number' ||
    !Number.isInteger(minAgeMonths) ||
    minAgeMonths < 0
  ) {
    throw new InvalidWeeklyPlanningProposalError('Room minAgeMonths must be a non-negative integer.');
  }

  if (
    typeof maxAgeMonths !== 'number' ||
    !Number.isInteger(maxAgeMonths) ||
    maxAgeMonths < minAgeMonths
  ) {
    throw new InvalidWeeklyPlanningProposalError(
      `Room maxAgeMonths (${maxAgeMonths}) must be an integer greater than or equal to minAgeMonths (${minAgeMonths}).`
    );
  }

  // 5. Validate current context
  if (!request.currentContext || typeof request.currentContext !== 'object') {
    throw new InvalidWeeklyPlanningProposalError('Proposal request must contain a valid currentContext object.');
  }

  const contextFields: (keyof WeeklyPlanningCurrentContext)[] = [
    'observations',
    'identifiedNeeds',
    'specialSituations',
    'availableMaterials',
  ];

  for (const field of contextFields) {
    const val = request.currentContext[field];
    if (val !== undefined && val !== null) {
      if (typeof val !== 'string') {
        throw new InvalidWeeklyPlanningProposalError(`currentContext.${field} must be a string.`);
      }
      if (val.length > TECHNICAL_MAX_CONTEXT_FIELD_LENGTH) {
        throw new InvalidWeeklyPlanningProposalError(
          `currentContext.${field} exceeds maximum allowed length of ${TECHNICAL_MAX_CONTEXT_FIELD_LENGTH} characters.`
        );
      }
    }
  }

  // 6. Validate constraints if provided
  if (request.constraints !== undefined && request.constraints !== null) {
    if (typeof request.constraints !== 'object') {
      throw new InvalidWeeklyPlanningProposalError('Proposal constraints must be an object.');
    }

    const { allowedCategories, minActivitiesPerDay, maxActivitiesPerDay, minDurationMinutes, maxDurationMinutes } =
      request.constraints;

    if (allowedCategories !== undefined) {
      if (!Array.isArray(allowedCategories) || allowedCategories.length === 0) {
        throw new InvalidWeeklyPlanningProposalError('allowedCategories constraint must be a non-empty array.');
      }
      for (const cat of allowedCategories) {
        if (!IMSS_CATEGORIES.includes(cat)) {
          throw new InvalidWeeklyPlanningProposalError(`Invalid category '${String(cat)}' in allowedCategories.`);
        }
      }
    }

    if (minActivitiesPerDay !== undefined) {
      if (!Number.isInteger(minActivitiesPerDay) || minActivitiesPerDay < 1) {
        throw new InvalidWeeklyPlanningProposalError('minActivitiesPerDay must be a positive integer.');
      }
    }

    if (maxActivitiesPerDay !== undefined) {
      if (!Number.isInteger(maxActivitiesPerDay) || maxActivitiesPerDay < (minActivitiesPerDay ?? 1)) {
        throw new InvalidWeeklyPlanningProposalError(
          'maxActivitiesPerDay must be an integer greater than or equal to minActivitiesPerDay.'
        );
      }
    }

    if (minDurationMinutes !== undefined) {
      if (!Number.isInteger(minDurationMinutes) || minDurationMinutes < 1) {
        throw new InvalidWeeklyPlanningProposalError('minDurationMinutes must be a positive integer.');
      }
    }

    if (maxDurationMinutes !== undefined) {
      if (!Number.isInteger(maxDurationMinutes) || maxDurationMinutes < (minDurationMinutes ?? 1)) {
        throw new InvalidWeeklyPlanningProposalError(
          'maxDurationMinutes must be an integer greater than or equal to minDurationMinutes.'
        );
      }
    }
  }
}

/**
 * Validates a single ProposedActivity ensuring it conforms to canonical IMSS categories,
 * bounded duration, non-blank text fields, and has no injected domain lifecycle properties.
 */
export function validateProposedActivity(
  activity: ProposedActivity,
  constraints?: WeeklyPlanningProposalConstraints
): ProposedActivity {
  if (!activity || typeof activity !== 'object') {
    throw new InvalidWeeklyPlanningProposalError('Proposed activity must be a valid non-null object.');
  }

  const raw = activity as unknown as Record<string, unknown>;

  // Check forbidden domain/lifecycle properties
  if ('curricularTraceability' in raw) {
    throw new InvalidWeeklyPlanningProposalError(
      'Proposed activity cannot contain curricularTraceability. Curricular selection is reserved for human authority.'
    );
  }
  if ('pdaId' in raw || 'reference' in raw) {
    throw new InvalidWeeklyPlanningProposalError(
      'Proposed activity cannot contain direct PDA reference IDs. PDA recommendation is a separate governed process.'
    );
  }
  if ('status' in raw || 'approved' in raw) {
    throw new InvalidWeeklyPlanningProposalError('Proposed activity cannot contain status or approval state.');
  }

  // Category validation
  const effectiveAllowedCategories = constraints?.allowedCategories ?? IMSS_CATEGORIES;
  if (!activity.category || typeof activity.category !== 'string' || !effectiveAllowedCategories.includes(activity.category as ImssCategory)) {
    throw new InvalidWeeklyPlanningProposalError(
      `Invalid proposed activity category '${String(activity.category)}'. Must be one of: ${effectiveAllowedCategories.join(', ')}.`
    );
  }

  // Objective validation
  if (typeof activity.objective !== 'string' || !activity.objective.trim()) {
    throw new InvalidWeeklyPlanningProposalError('Proposed activity must contain a non-empty string objective.');
  }
  if (activity.objective.trim().length > TECHNICAL_MAX_OBJECTIVE_LENGTH) {
    throw new InvalidWeeklyPlanningProposalError(
      `Proposed activity objective exceeds technical maximum of ${TECHNICAL_MAX_OBJECTIVE_LENGTH} characters.`
    );
  }

  // Description validation
  if (typeof activity.description !== 'string' || !activity.description.trim()) {
    throw new InvalidWeeklyPlanningProposalError('Proposed activity must contain a non-empty string description.');
  }
  if (activity.description.trim().length > TECHNICAL_MAX_DESCRIPTION_LENGTH) {
    throw new InvalidWeeklyPlanningProposalError(
      `Proposed activity description exceeds technical maximum of ${TECHNICAL_MAX_DESCRIPTION_LENGTH} characters.`
    );
  }

  // Duration validation
  const minDuration = constraints?.minDurationMinutes ?? TECHNICAL_MIN_DURATION_MINUTES;
  const maxDuration = constraints?.maxDurationMinutes ?? TECHNICAL_MAX_DURATION_MINUTES;

  if (
    typeof activity.durationMinutes !== 'number' ||
    !Number.isInteger(activity.durationMinutes) ||
    activity.durationMinutes < minDuration ||
    activity.durationMinutes > maxDuration
  ) {
    throw new InvalidWeeklyPlanningProposalError(
      `Proposed activity durationMinutes (${activity.durationMinutes}) must be an integer between ${minDuration} and ${maxDuration}.`
    );
  }

  // Materials validation
  if (!Array.isArray(activity.materials)) {
    throw new InvalidWeeklyPlanningProposalError('Proposed activity materials must be an array of strings.');
  }
  if (activity.materials.length > TECHNICAL_MAX_MATERIALS_COUNT) {
    throw new InvalidWeeklyPlanningProposalError(
      `Proposed activity materials collection exceeds maximum of ${TECHNICAL_MAX_MATERIALS_COUNT} items.`
    );
  }

  const cleanMaterials: string[] = [];
  for (const item of activity.materials) {
    if (typeof item !== 'string' || !item.trim()) {
      throw new InvalidWeeklyPlanningProposalError('Each material item in proposed activity must be a non-empty string.');
    }
    if (item.trim().length > TECHNICAL_MAX_MATERIAL_NAME_LENGTH) {
      throw new InvalidWeeklyPlanningProposalError(
        `Material item exceeds maximum allowed length of ${TECHNICAL_MAX_MATERIAL_NAME_LENGTH} characters.`
      );
    }
    cleanMaterials.push(item.trim());
  }

  return Object.freeze({
    category: activity.category,
    objective: activity.objective.trim(),
    description: activity.description.trim(),
    durationMinutes: activity.durationMinutes,
    materials: Object.freeze(cleanMaterials),
  });
}

/**
 * Validates a WeeklyPlanningProposalResponse ensuring exactly five weekdays,
 * at least one activity per day, no duplicate/missing days, and complete absence
 * of planning lifecycle, approvals, or evaluations.
 */
export function validateWeeklyPlanningProposalResponse(
  response: WeeklyPlanningProposalResponse,
  constraints?: WeeklyPlanningProposalConstraints
): WeeklyPlanningProposalResponse {
  if (!response || typeof response !== 'object') {
    throw new InvalidWeeklyPlanningProposalError('Proposal response must be a valid non-null object.');
  }

  const raw = response as unknown as Record<string, unknown>;

  // Check forbidden aggregate lifecycle / review / approval properties
  const forbiddenTopLevelFields = [
    'status',
    'approvedBy',
    'approvedAt',
    'closedBy',
    'closedAt',
    'reviewHistory',
    'historicalRounds',
    'granularObservations',
    'planningId',
    'daycareId',
    'teacherId',
    'roomId',
    'version',
  ];

  for (const field of forbiddenTopLevelFields) {
    if (field in raw) {
      throw new InvalidWeeklyPlanningProposalError(
        `Proposal response cannot contain lifecycle or domain aggregate field '${field}'.`
      );
    }
  }

  if (!Array.isArray(response.days)) {
    throw new InvalidWeeklyPlanningProposalError('Proposal response days must be an array.');
  }

  if (response.days.length !== 5) {
    throw new InvalidWeeklyPlanningProposalError(
      `Proposal response must contain exactly 5 days. Received ${response.days.length}.`
    );
  }

  const seenDays = new Set<WeeklyPlanningWeekday>();
  const validatedDays: ProposedPlanningDay[] = [];

  for (const day of response.days) {
    if (!day || typeof day !== 'object') {
      throw new InvalidWeeklyPlanningProposalError('Each proposed planning day must be a valid non-null object.');
    }

    const dayRaw = day as Record<string, unknown>;

    // Check forbidden day-level lifecycle / evaluation / institutional properties
    const forbiddenDayFields = [
      'evaluation',
      'executionNotes',
      'evaluationStatus',
      'evaluationConfirmedAt',
      'evaluationConfirmedBy',
      'evaluationReviewedAt',
      'evaluationReviewedBy',
      'evaluationDirectorComment',
      'evaluationHistory',
      'directorReviewed',
      'teacherReviewedAt',
      'teacherReviewedBy',
      'complementaryActivities',
      'prioritizedPractices',
    ];

    for (const field of forbiddenDayFields) {
      if (field in dayRaw) {
        throw new InvalidWeeklyPlanningProposalError(
          `Proposed day cannot contain evaluation, review, or institutional program field '${field}'.`
        );
      }
    }

    if (!OFFICIAL_WEEKDAYS.includes(day.dayOfWeek)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Invalid weekday '${String(day.dayOfWeek)}'. Must be one of: ${OFFICIAL_WEEKDAYS.join(', ')}.`
      );
    }

    if (seenDays.has(day.dayOfWeek)) {
      throw new InvalidWeeklyPlanningProposalError(`Duplicate proposed day for '${day.dayOfWeek}' is rejected.`);
    }
    seenDays.add(day.dayOfWeek);

    if (day.date !== undefined && day.date !== null) {
      if (typeof day.date !== 'string' || !isValidIsoDate(day.date)) {
        throw new InvalidWeeklyPlanningProposalError(
          `Invalid date '${String(day.date)}' in proposed day '${day.dayOfWeek}'. Must be ISO format (YYYY-MM-DD).`
        );
      }
    }

    if (!Array.isArray(day.activities)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Proposed day '${day.dayOfWeek}' activities must be an array.`
      );
    }

    const minActivities = constraints?.minActivitiesPerDay ?? 1;
    if (day.activities.length < minActivities) {
      throw new InvalidWeeklyPlanningProposalError(
        `Proposed day '${day.dayOfWeek}' must contain at least ${minActivities} activity. Received ${day.activities.length}.`
      );
    }

    if (constraints?.maxActivitiesPerDay !== undefined && day.activities.length > constraints.maxActivitiesPerDay) {
      throw new InvalidWeeklyPlanningProposalError(
        `Proposed day '${day.dayOfWeek}' exceeds maximum of ${constraints.maxActivitiesPerDay} activities.`
      );
    }

    const validatedActivities = day.activities.map((act: ProposedActivity) => validateProposedActivity(act, constraints));

    validatedDays.push(
      Object.freeze({
        dayOfWeek: day.dayOfWeek,
        ...(day.date ? { date: day.date } : {}),
        activities: Object.freeze(validatedActivities),
      })
    );
  }

  // Ensure all 5 official weekdays are present
  for (const expectedDay of OFFICIAL_WEEKDAYS) {
    if (!seenDays.has(expectedDay)) {
      throw new InvalidWeeklyPlanningProposalError(`Proposal response missing required weekday: ${expectedDay}.`);
    }
  }

  return Object.freeze({
    days: Object.freeze(validatedDays),
  });
}

/**
 * Application coordinating service that guarantees validation and invariant enforcement
 * across the weekly planning proposal boundary.
 */
export class WeeklyPlanningProposalService {
  constructor(private readonly source: WeeklyPlanningProposalSource) {}

  public async getProposal(
    request: WeeklyPlanningProposalRequest
  ): Promise<WeeklyPlanningProposalResponse> {
    validateWeeklyPlanningProposalRequest(request);
    const rawProposal = await this.source.propose(request);
    return validateWeeklyPlanningProposalResponse(rawProposal, request.constraints);
  }
}
