import { IMSS_CATEGORIES, type ImssCategory } from '../../constants/imssCategories';
import type { Room } from '../../domain/planning/RoomCatalog';
import type { PedagogicalPolicyViolation } from '../../domain/planning/PedagogicalAgePolicy';

/**
 * Bounded safe diagnostic subtypes for canonical and weekly pedagogical progression failures.
 *
 * CRITICAL PRIVACY & GOVERNANCE INVARIANT:
 * Strictly typed enum/union. Never contains arbitrary provider prose, pedagogical content,
 * IDs, tokens, or PII.
 */
export type CanonicalProgressionDiagnosticSubtype =
  | 'PROGRESSION_MISSING'
  | 'PROGRESSION_MALFORMED'
  | 'INVALID_PROGRESSION_ROLE'
  | 'ACTIVITY_PROGRESSION_METADATA_MISSING'
  | 'INVALID_ACTIVITY_PROGRESSION_METADATA'
  | 'ACTIVITY_EXPERIENCE_ID_MISSING'
  | 'DUPLICATE_ACTIVITY_EXPERIENCE_ID'
  | 'ORPHAN_PROGRESSION_EXPERIENCE'
  | 'ACTIVITY_PROGRESSION_ENTRY_MISSING'
  | 'EXPLORE_HAS_RELATIONSHIP'
  | 'EXPLORE_HAS_REPETITION_PURPOSE'
  | 'EXPLORE_HAS_VARIATION_DIMENSIONS'
  | 'REVISIT_REFERENCE_MISSING'
  | 'RELATIONSHIP_ROLE_MISSING_REFERENCE'
  | 'REVISIT_SELF_REFERENCE'
  | 'REVISIT_FORWARD_OR_UNKNOWN_REFERENCE'
  | 'REVISIT_MISSING_REPETITION_PURPOSE'
  | 'REVISIT_MISSING_VARIATION'
  | 'VARY_MISSING_VARIATION'
  | 'REPETITION_PURPOSE_MISSING_OR_INVALID'
  | 'VARIATION_DIMENSIONS_MISSING_OR_INVALID'
  | 'INVALID_PROSPECTIVE_OBSERVATION'
  | 'FORBIDDEN_PROGRESSION_FIELD'
  | 'MATERIAL_AUTHORITY_IN_PROGRESSION'
  | 'UNKNOWN_PROGRESSION_FIELD'
  | 'CANONICAL_DAY_STRUCTURE_INVALID'
  | 'OTHER_CANONICAL_VALIDATION';

/**
 * Custom error thrown when a weekly planning proposal request or response violates
 * canonical contract invariants.
 */
export class InvalidWeeklyPlanningProposalError extends Error {
  readonly diagnosticSubtype?: CanonicalProgressionDiagnosticSubtype;

  constructor(
    message: string,
    diagnosticSubtype?: CanonicalProgressionDiagnosticSubtype
  ) {
    super(message);
    this.name = 'InvalidWeeklyPlanningProposalError';
    this.diagnosticSubtype = diagnosticSubtype;
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
 * Dimensions along which purposeful weekly pedagogical variation may occur.
 *
 * Variation across weekdays must be pedagogical rather than merely lexical
 * (avoiding superficial synonym substitution or paraphrasing).
 */
export type PedagogicalVariationDimension =
  | 'PEDAGOGICAL_INTENT'
  | 'INTERACTION_MODE'
  | 'ADULT_MEDIATION'
  | 'CHILD_AGENCY'
  | 'GROUP_ORGANIZATION'
  | 'SENSORY_EXPERIENCE'
  | 'OBSERVATION_FOCUS';

export const PEDAGOGICAL_VARIATION_DIMENSIONS: readonly PedagogicalVariationDimension[] =
  Object.freeze([
    'PEDAGOGICAL_INTENT',
    'INTERACTION_MODE',
    'ADULT_MEDIATION',
    'CHILD_AGENCY',
    'GROUP_ORGANIZATION',
    'SENSORY_EXPERIENCE',
    'OBSERVATION_FOCUS',
  ]);

/**
 * Valid pedagogical purposes for intentional repetition across weekdays.
 *
 * Repetition is valued in early childhood when pedagogically purposeful;
 * accidental copy-paste duplication without purpose is discouraged.
 */
export type IntentionalRepetitionPurpose =
  | 'REINFORCEMENT'
  | 'FAMILIARIZATION'
  | 'VARIATION'
  | 'PROGRESSION'
  | 'RESPONSE_OBSERVATION';

export const INTENTIONAL_REPETITION_PURPOSES: readonly IntentionalRepetitionPurpose[] =
  Object.freeze([
    'REINFORCEMENT',
    'FAMILIARIZATION',
    'VARIATION',
    'PROGRESSION',
    'RESPONSE_OBSERVATION',
  ]);

/**
 * Adult mediation modes in early childhood pedagogical experiences.
 *
 * Guides how the educator accompanies the experience without becoming
 * a mechanical executor of AI instructions.
 */
export type AdultMediationMode =
  | 'PRESENT'
  | 'INVITE'
  | 'ACCOMPANY'
  | 'OBSERVE'
  | 'CONVERSE'
  | 'MODEL'
  | 'SING'
  | 'WAIT_FOR_RESPONSE'
  | 'ADAPT';

export const ADULT_MEDIATION_MODES: readonly AdultMediationMode[] = Object.freeze([
  'PRESENT',
  'INVITE',
  'ACCOMPANY',
  'OBSERVE',
  'CONVERSE',
  'MODEL',
  'SING',
  'WAIT_FOR_RESPONSE',
  'ADAPT',
]);

/**
 * Composition roles for experiences within the weekly pedagogical progression.
 *
 * PROVENANCE: TUTORIA_POLICY / PEDAGOGICAL COMPOSITION GUIDANCE.
 * (Not an institutional IMSS normative requirement).
 *
 * Provides a flexible weekly arc: roles are NOT tied to specific weekdays
 * (e.g. Monday is NOT forced to be EXPLORE, Friday is NOT forced to be CONSOLIDATE).
 */
export type ExperienceCompositionRole =
  | 'EXPLORE'
  | 'REVISIT'
  | 'VARY'
  | 'DEEPEN_OR_ADAPT'
  | 'OBSERVE_OR_CONSOLIDATE';

export const EXPERIENCE_COMPOSITION_ROLES: readonly ExperienceCompositionRole[] = Object.freeze([
  'EXPLORE',
  'REVISIT',
  'VARY',
  'DEEPEN_OR_ADAPT',
  'OBSERVE_OR_CONSOLIDATE',
]);

/**
 * Structured progression metadata for a single experience in the proposed week.
 *
 * Internal/transient composition contract: NOT persisted to Firestore,
 * NOT printed, and NOT exposed as an institutional claim.
 */
export interface ExperienceProgressionMetadata {
  /**
   * Unique experience identifier within the weekly proposal (e.g. "exp-mon-1").
   */
  readonly experienceId: string;

  /**
   * Composition role of this experience within the week.
   */
  readonly role: ExperienceCompositionRole;

  /**
   * For intentional repetition/revisiting: identifier of an earlier experience within the same week.
   */
  readonly revisitsExperienceId?: string;

  /**
   * Pedagogical purpose for intentionally revisiting an earlier experience.
   * Required when revisitsExperienceId is set or role is 'REVISIT'.
   */
  readonly repetitionPurpose?: IntentionalRepetitionPurpose;

  /**
   * Meaningful pedagogical dimensions along which variation or observation occurs.
   * Required (min 1) when revisitsExperienceId is set or role is 'REVISIT'.
   */
  readonly variationDimensions?: readonly PedagogicalVariationDimension[];

  /**
   * Prospective observable child response target or adaptation condition.
   * Must describe what to observe ("observar si...") or when to adapt ("adaptar si...").
   * STRICTLY FORBIDDEN: completed past developmental claims ("el niño logró...", "ya domina...").
   */
  readonly observationTarget?: string;
}

/**
 * Weekly pedagogical progression plan representing the week-level pedagogical coherence.
 *
 * Internal/transient contract for weekly pedagogical progression.
 */
export interface WeeklyPedagogicalProgression {
  /**
   * Weekly pedagogical focus or horizon providing coherence across days.
   */
  readonly weeklyFocus: string;

  /**
   * Ordered sequence of experience progression metadata for the week.
   */
  readonly experiences: readonly ExperienceProgressionMetadata[];
}

/**
 * Forbidden governance properties that MUST NEVER appear in composition contracts.
 */
const FORBIDDEN_GOVERNANCE_KEYS = [
  'approval',
  'approved',
  'approvedBy',
  'approvalStatus',
  'isApproved',
  'status',
  'lifecycle',
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

const FORBIDDEN_COMPLETED_OUTCOME_REGEX =
  /(?:ya (?:domina|aprendi[oó]|logr[oó]|alcanz[oó])|(?:el|la) (?:niñ[oa]|lactante|bebé) (?:logr[oó]|adquiri[oó]|aprendi[oó]|mejor[oó]|domin[oó]|alcanz[oó])|cumpli[oó] con éxito|resultado:|se alcanz[oó] el objetivo)/i;

/**
 * Deterministically validates that a WeeklyPedagogicalProgression plan conforms
 * strictly to H1R12.5-D.4.1 weekly progression invariants.
 *
 * Invariants enforced:
 * 1. Root structure and non-empty weeklyFocus.
 * 2. Governance absence: zero approval, lifecycle, PDA, or evaluation properties.
 * 3. Material authority: progression metadata cannot define or authorize materials.
 * 4. Experience uniqueness: experienceId must be unique within the week.
 * 5. Bounded roles: composition role must be recognized (flexible arc, no fixed day mapping).
 * 6. Intentional repetition: revisits must reference earlier experience, declare purpose,
 *    and declare at least one meaningful variation dimension.
 * 7. Dangling / self-reference rejection: cannot revisit self or non-existent/future experiences.
 * 8. Prospective observation: cannot fabricate completed retrospective developmental outcomes.
 */
export function validateWeeklyPedagogicalProgression(
  progression: WeeklyPedagogicalProgression
): void {
  if (!progression || typeof progression !== 'object' || Array.isArray(progression)) {
    throw new InvalidWeeklyPlanningProposalError(
      'Weekly pedagogical progression must be a non-null object.',
      'PROGRESSION_MALFORMED'
    );
  }

  // Check forbidden governance keys at root (TEST 12, TEST 14)
  for (const forbidden of FORBIDDEN_GOVERNANCE_KEYS) {
    if (forbidden in progression) {
      throw new InvalidWeeklyPlanningProposalError(
        `Weekly pedagogical progression contains forbidden governance property '${forbidden}'.`,
        'FORBIDDEN_PROGRESSION_FIELD'
      );
    }
  }

  // Check strict root allowlist (TEST 16)
  const allowedProgressionRootKeys = new Set(['weeklyFocus', 'experiences']);
  for (const key of Object.keys(progression)) {
    if (!allowedProgressionRootKeys.has(key)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Weekly pedagogical progression contains unexpected or forbidden property '${key}'.`,
        'UNKNOWN_PROGRESSION_FIELD'
      );
    }
  }

  if (typeof progression.weeklyFocus !== 'string' || !progression.weeklyFocus.trim()) {
    throw new InvalidWeeklyPlanningProposalError(
      'Weekly pedagogical progression must specify a non-empty weeklyFocus.',
      'PROGRESSION_MALFORMED'
    );
  }

  if (!Array.isArray(progression.experiences)) {
    throw new InvalidWeeklyPlanningProposalError(
      'Weekly pedagogical progression must contain an experiences array.',
      'PROGRESSION_MALFORMED'
    );
  }

  if (progression.experiences.length === 0) {
    throw new InvalidWeeklyPlanningProposalError(
      'Weekly pedagogical progression experiences array cannot be empty.',
      'PROGRESSION_MALFORMED'
    );
  }

  const seenExperienceIds = new Map<string, number>();

  const allowedExperienceProgressionKeys = new Set([
    'experienceId',
    'role',
    'revisitsExperienceId',
    'repetitionPurpose',
    'variationDimensions',
    'observationTarget',
  ]);

  for (let i = 0; i < progression.experiences.length; i++) {
    const exp = progression.experiences[i];
    if (!exp || typeof exp !== 'object' || Array.isArray(exp)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Progression experience at index ${i} must be a non-null object.`,
        'PROGRESSION_MALFORMED'
      );
    }

    // Check forbidden governance keys on experience (TEST 12, TEST 14)
    for (const forbidden of FORBIDDEN_GOVERNANCE_KEYS) {
      if (forbidden in exp) {
        throw new InvalidWeeklyPlanningProposalError(
          `Progression experience '${(exp as any).experienceId ?? i}' contains forbidden governance property '${forbidden}'.`,
          'FORBIDDEN_PROGRESSION_FIELD'
        );
      }
    }

    // Material authority safeguard (TEST 13, TEST 15): progression cannot define/smuggle materials
    if ('materials' in exp || 'materialRefs' in exp) {
      throw new InvalidWeeklyPlanningProposalError(
        `Progression experience '${(exp as any).experienceId ?? i}' cannot define materials; materialRefs is the sole material authority.`,
        'MATERIAL_AUTHORITY_IN_PROGRESSION'
      );
    }

    // Check strict experience key allowlist (TEST 16)
    for (const key of Object.keys(exp)) {
      if (!allowedExperienceProgressionKeys.has(key)) {
        throw new InvalidWeeklyPlanningProposalError(
          `Progression experience '${(exp as any).experienceId ?? i}' contains unexpected or forbidden property '${key}'.`,
          'UNKNOWN_PROGRESSION_FIELD'
        );
      }
    }

    if (typeof exp.experienceId !== 'string' || !exp.experienceId.trim()) {
      throw new InvalidWeeklyPlanningProposalError(
        `Progression experience at index ${i} must specify a non-empty experienceId.`,
        'PROGRESSION_MALFORMED'
      );
    }

    const id = exp.experienceId.trim();
    if (seenExperienceIds.has(id)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Duplicate experienceId '${id}' at index ${i} in weekly pedagogical progression.`,
        'DUPLICATE_ACTIVITY_EXPERIENCE_ID'
      );
    }

    if (!EXPERIENCE_COMPOSITION_ROLES.includes(exp.role)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Unknown composition role '${exp.role}' for experience '${id}'. Must be one of: ${EXPERIENCE_COMPOSITION_ROLES.join(', ')}.`,
        'INVALID_PROGRESSION_ROLE'
      );
    }

    // Intentional repetition & revisit invariants (handle null / undefined safely)
    const rawRevisits = exp.revisitsExperienceId;
    const revisitsId =
      rawRevisits !== null && rawRevisits !== undefined
        ? (typeof rawRevisits === 'string' ? rawRevisits.trim() : String(rawRevisits).trim())
        : undefined;

    // 1. EXPLORE Semantics (Section 5)
    if (exp.role === 'EXPLORE') {
      if (revisitsId !== undefined && revisitsId !== '') {
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' has role 'EXPLORE' but declares a revisit relationship to '${revisitsId}'. EXPLORE must be an independent introductory experience without prior reference.`,
          'EXPLORE_HAS_RELATIONSHIP'
        );
      }

      if (exp.repetitionPurpose !== undefined && exp.repetitionPurpose !== null) {
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' has role 'EXPLORE' but declares repetitionPurpose '${exp.repetitionPurpose}'. Repetition purpose is only valid for experiences with prior relationships.`,
          'EXPLORE_HAS_REPETITION_PURPOSE'
        );
      }

      if (
        exp.variationDimensions !== undefined &&
        exp.variationDimensions !== null &&
        (!Array.isArray(exp.variationDimensions) || exp.variationDimensions.length > 0)
      ) {
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' has role 'EXPLORE' but declares variationDimensions. Variation dimensions represent changes relative to an earlier experience and cannot be applied to EXPLORE.`,
          'EXPLORE_HAS_VARIATION_DIMENSIONS'
        );
      }
    } else {
      // 2. Relationship-Bearing Roles: REVISIT, VARY, DEEPEN_OR_ADAPT, OBSERVE_OR_CONSOLIDATE (Section 10)
      if (revisitsId === undefined || !revisitsId) {
        const subtype =
          exp.role === 'REVISIT'
            ? 'REVISIT_REFERENCE_MISSING'
            : 'RELATIONSHIP_ROLE_MISSING_REFERENCE';
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' has relationship-bearing role '${exp.role}' but is missing required revisitsExperienceId pointing to an earlier experience.`,
          subtype
        );
      }

      // Self-reference check (TEST 7)
      if (revisitsId === id) {
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' cannot revisit itself.`,
          'REVISIT_SELF_REFERENCE'
        );
      }

      // Dangling / future reference check (TEST 8, TEST 9)
      if (!seenExperienceIds.has(revisitsId)) {
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' revisits unknown or future experience '${revisitsId}'. A relationship-bearing experience must reference an earlier experience in the same week.`,
          'REVISIT_FORWARD_OR_UNKNOWN_REFERENCE'
        );
      }

      // 3. Role-specific invariants for relationship-bearing roles
      if (exp.role === 'REVISIT') {
        // Repetition purpose check (TEST 10)
        if (
          !exp.repetitionPurpose ||
          !INTENTIONAL_REPETITION_PURPOSES.includes(exp.repetitionPurpose)
        ) {
          throw new InvalidWeeklyPlanningProposalError(
            `Experience '${id}' revisits '${revisitsId}' but lacks required repetitionPurpose. Must be one of: ${INTENTIONAL_REPETITION_PURPOSES.join(', ')}.`,
            'REPETITION_PURPOSE_MISSING_OR_INVALID'
          );
        }

        // Meaningful variation dimensions check (TEST 11)
        if (
          !Array.isArray(exp.variationDimensions) ||
          exp.variationDimensions.length === 0 ||
          !exp.variationDimensions.every(
            (d: unknown) =>
              PEDAGOGICAL_VARIATION_DIMENSIONS.includes(d as PedagogicalVariationDimension)
          )
        ) {
          throw new InvalidWeeklyPlanningProposalError(
            `Experience '${id}' revisits '${revisitsId}' but declares no meaningful variationDimensions. Must specify at least one of: ${PEDAGOGICAL_VARIATION_DIMENSIONS.join(', ')}.`,
            'VARIATION_DIMENSIONS_MISSING_OR_INVALID'
          );
        }
      } else if (exp.role === 'VARY') {
        // Variation dimensions check (TEST 14)
        if (
          !Array.isArray(exp.variationDimensions) ||
          exp.variationDimensions.length === 0 ||
          !exp.variationDimensions.every(
            (d: unknown) =>
              PEDAGOGICAL_VARIATION_DIMENSIONS.includes(d as PedagogicalVariationDimension)
          )
        ) {
          throw new InvalidWeeklyPlanningProposalError(
            `Experience '${id}' has role 'VARY' but declares no meaningful variationDimensions. Must specify at least one of: ${PEDAGOGICAL_VARIATION_DIMENSIONS.join(', ')}.`,
            'VARY_MISSING_VARIATION'
          );
        }

        // Optional repetition purpose validation if provided
        if (
          exp.repetitionPurpose !== undefined &&
          exp.repetitionPurpose !== null &&
          !INTENTIONAL_REPETITION_PURPOSES.includes(exp.repetitionPurpose)
        ) {
          throw new InvalidWeeklyPlanningProposalError(
            `Experience '${id}' has invalid repetitionPurpose '${exp.repetitionPurpose}'. Must be one of: ${INTENTIONAL_REPETITION_PURPOSES.join(', ')}.`,
            'REPETITION_PURPOSE_MISSING_OR_INVALID'
          );
        }
      } else {
        // DEEPEN_OR_ADAPT and OBSERVE_OR_CONSOLIDATE (Section 8, Section 9)
        if (
          exp.repetitionPurpose !== undefined &&
          exp.repetitionPurpose !== null &&
          !INTENTIONAL_REPETITION_PURPOSES.includes(exp.repetitionPurpose)
        ) {
          throw new InvalidWeeklyPlanningProposalError(
            `Experience '${id}' has invalid repetitionPurpose '${exp.repetitionPurpose}'. Must be one of: ${INTENTIONAL_REPETITION_PURPOSES.join(', ')}.`,
            'REPETITION_PURPOSE_MISSING_OR_INVALID'
          );
        }

        if (
          exp.variationDimensions !== undefined &&
          exp.variationDimensions !== null &&
          (!Array.isArray(exp.variationDimensions) ||
            !exp.variationDimensions.every((d: unknown) =>
              PEDAGOGICAL_VARIATION_DIMENSIONS.includes(d as PedagogicalVariationDimension)
            ))
        ) {
          throw new InvalidWeeklyPlanningProposalError(
            `Experience '${id}' has invalid variationDimensions. Must specify valid dimensions from: ${PEDAGOGICAL_VARIATION_DIMENSIONS.join(', ')}.`,
            'VARIATION_DIMENSIONS_MISSING_OR_INVALID'
          );
        }
      }
    }

    // Prospective observation target / no fabricated child outcome check (TEST 10, TEST 13)
    if (exp.observationTarget !== undefined && exp.observationTarget !== null) {
      if (typeof exp.observationTarget !== 'string' || !exp.observationTarget.trim()) {
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' observationTarget must be a non-empty string when provided.`,
          'INVALID_PROSPECTIVE_OBSERVATION'
        );
      }

      if (FORBIDDEN_COMPLETED_OUTCOME_REGEX.test(exp.observationTarget)) {
        throw new InvalidWeeklyPlanningProposalError(
          `Experience '${id}' observationTarget contains fabricated completed outcome: "${exp.observationTarget}". Progression metadata must describe prospective observations or adaptation conditions.`,
          'INVALID_PROSPECTIVE_OBSERVATION'
        );
      }
    }

    seenExperienceIds.set(id, i);
  }
}

/**
 * Deterministically validates complete bidirectional correspondence between
 * generated candidate activities and weekly pedagogical progression metadata.
 *
 * Invariants enforced (H1R12.5-D.4.2):
 * 1. Every generated activity has exactly one progression identity (experienceId).
 * 2. Every progression experience corresponds to exactly one generated activity.
 * 3. Zero duplicate experience IDs in activities or progression.
 * 4. Zero orphan progression entries (progression ID without activity).
 * 5. Zero activities without matching progression metadata.
 * 6. Progression experiences order matches the chronological sequence of activities across weekdays.
 */
export function validateActivityProgressionCorrespondence(
  days: readonly { readonly activities: readonly Record<string, unknown>[] }[],
  progression: WeeklyPedagogicalProgression
): void {
  const activityIds: string[] = [];
  const seenActivityIds = new Set<string>();

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx];
    if (!day || !Array.isArray(day.activities)) continue;

    for (let actIdx = 0; actIdx < day.activities.length; actIdx++) {
      const act = day.activities[actIdx];
      const rawId = act['experienceId'] ?? act['id'];
      if (typeof rawId !== 'string' || !rawId.trim()) {
        throw new InvalidWeeklyPlanningProposalError(
          `Activity at day index ${dayIdx}, activity index ${actIdx} is missing required experienceId matching progression metadata.`,
          'ACTIVITY_EXPERIENCE_ID_MISSING'
        );
      }
      const cleanId = rawId.trim();
      if (seenActivityIds.has(cleanId)) {
        throw new InvalidWeeklyPlanningProposalError(
          `Duplicate experienceId '${cleanId}' found in generated activities.`,
          'DUPLICATE_ACTIVITY_EXPERIENCE_ID'
        );
      }
      seenActivityIds.add(cleanId);
      activityIds.push(cleanId);
    }
  }

  const progressionIds = progression.experiences.map((e) => e.experienceId.trim());

  // Check count match
  if (activityIds.length !== progression.experiences.length) {
    throw new InvalidWeeklyPlanningProposalError(
      `Activity count (${activityIds.length}) does not match progression experiences count (${progression.experiences.length}). Every generated activity must have exactly one progression identity.`,
      'ACTIVITY_PROGRESSION_ENTRY_MISSING'
    );
  }

  // Check orphan progression experiences
  for (const exp of progression.experiences) {
    const expId = exp.experienceId.trim();
    if (!seenActivityIds.has(expId)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Progression experience '${expId}' is an orphan: no matching generated activity found.`,
        'ORPHAN_PROGRESSION_EXPERIENCE'
      );
    }
  }

  // Check activities without progression metadata
  const progressionIdSet = new Set(progressionIds);
  for (const actId of activityIds) {
    if (!progressionIdSet.has(actId)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Activity with experienceId '${actId}' has no matching progression metadata.`,
        'ACTIVITY_PROGRESSION_ENTRY_MISSING'
      );
    }
  }

  // Check chronological sequence correspondence
  for (let i = 0; i < activityIds.length; i++) {
    if (activityIds[i] !== progressionIds[i]) {
      throw new InvalidWeeklyPlanningProposalError(
        `Activity progression sequence mismatch at index ${i}: activity has '${activityIds[i]}' but progression has '${progressionIds[i]}'. Progression experiences order must match the chronological sequence of activities across weekdays.`,
        'ACTIVITY_PROGRESSION_ENTRY_MISSING'
      );
    }
  }
}

/**
 * Bounded weekly composition contract enabling AI reasoning at week-level.
 *
 * Replaces isolated daily activity generation with a coherent weekly pedagogical composition.
 */
export interface WeeklyCompositionContract {
  /**
   * Weekly coherence requirement: activities across Monday-Friday share
   * the same group context and weekly pedagogical horizon.
   */
  readonly weeklyCoherence: boolean;

  /**
   * Allowed dimensions of purposeful pedagogical variation across weekdays.
   */
  readonly allowedVariationDimensions: readonly PedagogicalVariationDimension[];

  /**
   * Recognized pedagogical purposes for intentional repetition across the week.
   */
  readonly intentionalRepetitionPurposes: readonly IntentionalRepetitionPurpose[];

  /**
   * Preferred adult mediation approaches for accompanying child experiences.
   */
  readonly adultMediationGuidance: readonly AdultMediationMode[];

  /**
   * Explicit requirement for child agency and non-coercive performance framing.
   */
  readonly nonCoerciveAgency: boolean;

  /**
   * Indicative duration policy: duration aids planning without rigid/coercive enforcement.
   */
  readonly durationIsIndicative: boolean;

  /**
   * Category classification policy: categories describe experiences and are not daily/weekly quotas.
   */
  readonly categoriesAreNotQuotas: boolean;

  /**
   * Optional weekly pedagogical progression plan.
   */
  readonly progression?: WeeklyPedagogicalProgression;
}

/**
 * User/caller intent overriding or customizing default weekly composition parameters.
 */
export interface WeeklyCompositionIntent {
  readonly weeklyCoherence?: boolean;
  readonly allowedVariationDimensions?: readonly PedagogicalVariationDimension[];
  readonly intentionalRepetitionPurposes?: readonly IntentionalRepetitionPurpose[];
  readonly adultMediationGuidance?: readonly AdultMediationMode[];
  readonly nonCoerciveAgency?: boolean;
  readonly durationIsIndicative?: boolean;
  readonly categoriesAreNotQuotas?: boolean;
  readonly progression?: WeeklyPedagogicalProgression;
}

/**
 * Canonical default weekly composition contract for TutorIA weekly planning.
 */
export const DEFAULT_WEEKLY_COMPOSITION_CONTRACT: WeeklyCompositionContract = Object.freeze({
  weeklyCoherence: true,
  allowedVariationDimensions: PEDAGOGICAL_VARIATION_DIMENSIONS,
  intentionalRepetitionPurposes: INTENTIONAL_REPETITION_PURPOSES,
  adultMediationGuidance: ADULT_MEDIATION_MODES,
  nonCoerciveAgency: true,
  durationIsIndicative: true,
  categoriesAreNotQuotas: true,
});

/**
 * Resolves a full, immutable WeeklyCompositionContract from an optional WeeklyCompositionIntent.
 */
export function resolveWeeklyCompositionContract(
  intent?: WeeklyCompositionIntent
): WeeklyCompositionContract {
  if (!intent) {
    return DEFAULT_WEEKLY_COMPOSITION_CONTRACT;
  }
  if (intent.progression) {
    validateWeeklyPedagogicalProgression(intent.progression);
  }
  return Object.freeze({
    weeklyCoherence: intent.weeklyCoherence ?? DEFAULT_WEEKLY_COMPOSITION_CONTRACT.weeklyCoherence,
    allowedVariationDimensions: intent.allowedVariationDimensions
      ? Object.freeze([...intent.allowedVariationDimensions])
      : DEFAULT_WEEKLY_COMPOSITION_CONTRACT.allowedVariationDimensions,
    intentionalRepetitionPurposes: intent.intentionalRepetitionPurposes
      ? Object.freeze([...intent.intentionalRepetitionPurposes])
      : DEFAULT_WEEKLY_COMPOSITION_CONTRACT.intentionalRepetitionPurposes,
    adultMediationGuidance: intent.adultMediationGuidance
      ? Object.freeze([...intent.adultMediationGuidance])
      : DEFAULT_WEEKLY_COMPOSITION_CONTRACT.adultMediationGuidance,
    nonCoerciveAgency: intent.nonCoerciveAgency ?? DEFAULT_WEEKLY_COMPOSITION_CONTRACT.nonCoerciveAgency,
    durationIsIndicative:
      intent.durationIsIndicative ?? DEFAULT_WEEKLY_COMPOSITION_CONTRACT.durationIsIndicative,
    categoriesAreNotQuotas:
      intent.categoriesAreNotQuotas ?? DEFAULT_WEEKLY_COMPOSITION_CONTRACT.categoriesAreNotQuotas,
    ...(intent.progression ? { progression: intent.progression } : {}),
  });
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
  readonly compositionIntent?: WeeklyCompositionIntent;
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
  readonly experienceId?: string;
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
  readonly progression?: WeeklyPedagogicalProgression;
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

  // 7. Validate compositionIntent if provided
  if (request.compositionIntent !== undefined && request.compositionIntent !== null) {
    if (typeof request.compositionIntent !== 'object') {
      throw new InvalidWeeklyPlanningProposalError('compositionIntent must be an object.');
    }

    const {
      weeklyCoherence,
      allowedVariationDimensions,
      intentionalRepetitionPurposes,
      adultMediationGuidance,
      nonCoerciveAgency,
      durationIsIndicative,
      categoriesAreNotQuotas,
    } = request.compositionIntent;

    if (weeklyCoherence !== undefined && typeof weeklyCoherence !== 'boolean') {
      throw new InvalidWeeklyPlanningProposalError('compositionIntent.weeklyCoherence must be a boolean.');
    }

    if (allowedVariationDimensions !== undefined) {
      if (!Array.isArray(allowedVariationDimensions)) {
        throw new InvalidWeeklyPlanningProposalError(
          'compositionIntent.allowedVariationDimensions must be an array.'
        );
      }
      for (const dim of allowedVariationDimensions) {
        if (!PEDAGOGICAL_VARIATION_DIMENSIONS.includes(dim)) {
          throw new InvalidWeeklyPlanningProposalError(
            `Invalid variation dimension '${String(dim)}' in compositionIntent.allowedVariationDimensions.`
          );
        }
      }
    }

    if (intentionalRepetitionPurposes !== undefined) {
      if (!Array.isArray(intentionalRepetitionPurposes)) {
        throw new InvalidWeeklyPlanningProposalError(
          'compositionIntent.intentionalRepetitionPurposes must be an array.'
        );
      }
      for (const purp of intentionalRepetitionPurposes) {
        if (!INTENTIONAL_REPETITION_PURPOSES.includes(purp)) {
          throw new InvalidWeeklyPlanningProposalError(
            `Invalid repetition purpose '${String(purp)}' in compositionIntent.intentionalRepetitionPurposes.`
          );
        }
      }
    }

    if (adultMediationGuidance !== undefined) {
      if (!Array.isArray(adultMediationGuidance)) {
        throw new InvalidWeeklyPlanningProposalError(
          'compositionIntent.adultMediationGuidance must be an array.'
        );
      }
      for (const mode of adultMediationGuidance) {
        if (!ADULT_MEDIATION_MODES.includes(mode)) {
          throw new InvalidWeeklyPlanningProposalError(
            `Invalid mediation mode '${String(mode)}' in compositionIntent.adultMediationGuidance.`
          );
        }
      }
    }

    if (nonCoerciveAgency !== undefined && typeof nonCoerciveAgency !== 'boolean') {
      throw new InvalidWeeklyPlanningProposalError('compositionIntent.nonCoerciveAgency must be a boolean.');
    }

    if (durationIsIndicative !== undefined && typeof durationIsIndicative !== 'boolean') {
      throw new InvalidWeeklyPlanningProposalError('compositionIntent.durationIsIndicative must be a boolean.');
    }

    if (categoriesAreNotQuotas !== undefined && typeof categoriesAreNotQuotas !== 'boolean') {
      throw new InvalidWeeklyPlanningProposalError('compositionIntent.categoriesAreNotQuotas must be a boolean.');
    }

    if (request.compositionIntent.progression !== undefined) {
      validateWeeklyPedagogicalProgression(request.compositionIntent.progression);
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
    ...(activity.experienceId ? { experienceId: activity.experienceId } : {}),
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
    throw new InvalidWeeklyPlanningProposalError(
      'Proposal response must be a valid non-null object.',
      'CANONICAL_DAY_STRUCTURE_INVALID'
    );
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
        `Proposal response cannot contain lifecycle or domain aggregate field '${field}'.`,
        'FORBIDDEN_PROGRESSION_FIELD'
      );
    }
  }

  if (!Array.isArray(response.days)) {
    throw new InvalidWeeklyPlanningProposalError(
      'Proposal response days must be an array.',
      'CANONICAL_DAY_STRUCTURE_INVALID'
    );
  }

  if (response.days.length !== 5) {
    throw new InvalidWeeklyPlanningProposalError(
      `Proposal response must contain exactly 5 days. Received ${response.days.length}.`,
      'CANONICAL_DAY_STRUCTURE_INVALID'
    );
  }

  const seenDays = new Set<WeeklyPlanningWeekday>();
  const validatedDays: ProposedPlanningDay[] = [];

  for (const day of response.days) {
    if (!day || typeof day !== 'object') {
      throw new InvalidWeeklyPlanningProposalError(
        'Each proposed planning day must be a valid non-null object.',
        'CANONICAL_DAY_STRUCTURE_INVALID'
      );
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
          `Proposed day cannot contain evaluation, review, or institutional program field '${field}'.`,
          'FORBIDDEN_PROGRESSION_FIELD'
        );
      }
    }

    if (!OFFICIAL_WEEKDAYS.includes(day.dayOfWeek)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Invalid weekday '${String(day.dayOfWeek)}'. Must be one of: ${OFFICIAL_WEEKDAYS.join(', ')}.`,
        'CANONICAL_DAY_STRUCTURE_INVALID'
      );
    }

    if (seenDays.has(day.dayOfWeek)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Duplicate proposed day for '${day.dayOfWeek}' is rejected.`,
        'CANONICAL_DAY_STRUCTURE_INVALID'
      );
    }
    seenDays.add(day.dayOfWeek);

    if (day.date !== undefined && day.date !== null) {
      if (typeof day.date !== 'string' || !isValidIsoDate(day.date)) {
        throw new InvalidWeeklyPlanningProposalError(
          `Invalid date '${String(day.date)}' in proposed day '${day.dayOfWeek}'. Must be ISO format (YYYY-MM-DD).`,
          'CANONICAL_DAY_STRUCTURE_INVALID'
        );
      }
    }

    if (!Array.isArray(day.activities)) {
      throw new InvalidWeeklyPlanningProposalError(
        `Proposed day '${day.dayOfWeek}' activities must be an array.`,
        'CANONICAL_DAY_STRUCTURE_INVALID'
      );
    }

    const minActivities = constraints?.minActivitiesPerDay ?? 1;
    if (day.activities.length < minActivities) {
      throw new InvalidWeeklyPlanningProposalError(
        `Proposed day '${day.dayOfWeek}' must contain at least ${minActivities} activity. Received ${day.activities.length}.`,
        'CANONICAL_DAY_STRUCTURE_INVALID'
      );
    }

    if (constraints?.maxActivitiesPerDay !== undefined && day.activities.length > constraints.maxActivitiesPerDay) {
      throw new InvalidWeeklyPlanningProposalError(
        `Proposed day '${day.dayOfWeek}' exceeds maximum of ${constraints.maxActivitiesPerDay} activities.`,
        'CANONICAL_DAY_STRUCTURE_INVALID'
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
      throw new InvalidWeeklyPlanningProposalError(
        `Proposal response missing required weekday: ${expectedDay}.`,
        'CANONICAL_DAY_STRUCTURE_INVALID'
      );
    }
  }

  return Object.freeze({
    days: Object.freeze(validatedDays),
    ...(response.progression ? { progression: response.progression } : {}),
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
