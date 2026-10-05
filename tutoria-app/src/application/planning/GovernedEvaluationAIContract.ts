/**
 * GOVERNED EVALUATION AI — CANONICAL CONTRACT & VALIDATION FOUNDATION
 *
 * Microbullet: H1R13.3C
 * Baseline: 2e684ab121a9a4b8057011ae354ad4a7f2d6a32a
 *
 * CANONICAL ARCHITECTURAL & PEDAGOGICAL PRINCIPLES:
 * 1. HUMAN OBSERVATION FIRST: TutorIA never evaluates children autonomously.
 *    Anita observes. TutorIA structures and may assist. Anita decides. Ceci reviews.
 * 2. SOVEREIGN HUMAN GATE: The Human Gate preserves human authority and accountability
 *    over the evaluation record. TutorIA cannot independently verify classroom reality.
 *    The Human Gate GOVERNS the record; it does NOT guarantee objective truth.
 * 3. PLANNED INTENT VS. OBSERVED OUTCOME:
 *    - Planned activities, objectives, PDAs, and prospectiveObservationTargets are PLANNED INTENT.
 *    - Human observation evidence supplied by Anita is OBSERVED OUTCOME.
 *    - The AI may connect observed evidence to planned intent, but can NEVER convert
 *      planned intent into an observed fact without human evidence.
 * 4. STRICT ZERO-MUTATION & PURE TYPESCRIPT:
 *    - Zero OpenAI dependencies, zero network dependencies, zero Firebase deployment.
 *    - Zero WeeklyPlanning / PlanningDay domain schema mutation.
 * 5. MINIMAL NARROW SCOPE:
 *    - No executionStatus enum.
 *    - No currentDate in public client request (server-authoritative time).
 *    - No pedagogicalReflection or connectedPdaIds in response.
 */

// ============================================================================
// CANONICAL CONSTANTS & BOUNDS
// ============================================================================

export const HUMAN_EVIDENCE_MIN_ACTIVITIES_DEVELOPMENT_LENGTH = 15;
export const HUMAN_EVIDENCE_MAX_ACTIVITIES_DEVELOPMENT_LENGTH = 600;

export const HUMAN_EVIDENCE_MIN_GROUP_RESPONSE_LENGTH = 15;
export const HUMAN_EVIDENCE_MAX_GROUP_RESPONSE_LENGTH = 600;

export const HUMAN_EVIDENCE_MAX_ADAPTATIONS_LENGTH = 400;
export const HUMAN_EVIDENCE_MAX_CONTINUITY_LENGTH = 400;

export const SUGGESTED_EVALUATION_MIN_LENGTH = 30;
export const SUGGESTED_EVALUATION_MAX_LENGTH = 1000;

export const MAX_PLANNING_ID_LENGTH = 128;
export const MIN_ACTIVITY_DURATION_MINUTES = 5;
export const MAX_ACTIVITY_DURATION_MINUTES = 180;

// Canonical 5-day school week
export type EvaluationWeekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
export const EVALUATION_WEEKDAYS: readonly EvaluationWeekday[] = Object.freeze([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
]);

// ============================================================================
// DIAGNOSTIC CODES & ERROR DEFINITIONS
// ============================================================================

export type EvaluationAIDiagnosticCode =
  | 'INVALID_REQUEST'
  | 'INVALID_PLANNING_ID'
  | 'INVALID_DAY'
  | 'HUMAN_EVIDENCE_REQUIRED'
  | 'HUMAN_EVIDENCE_TOO_SHORT'
  | 'HUMAN_EVIDENCE_TOO_LONG'
  | 'UNEXPECTED_FIELD'
  | 'SENSITIVE_CONTENT_DETECTED'
  | 'INVALID_PROVIDER_PAYLOAD'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'PROHIBITED_EVALUATION_LANGUAGE';

export class GovernedEvaluationAIError extends Error {
  readonly diagnosticCode: EvaluationAIDiagnosticCode;

  constructor(message: string, diagnosticCode: EvaluationAIDiagnosticCode) {
    super(message);
    this.name = 'GovernedEvaluationAIError';
    this.diagnosticCode = diagnosticCode;
  }
}

// ============================================================================
// CANONICAL CLIENT REQUEST CONTRACT
// ============================================================================

/**
 * Human observation evidence supplied exclusively by educator Anita.
 *
 * Specifically absent: executionStatus (removed in H1R13.3C; descriptive prose governs).
 */
export interface HumanObservationEvidence {
  /**
   * Factual narrative of how the day's experiences were executed.
   * Required. Minimum 15 characters, maximum 600 characters.
   */
  readonly activitiesDevelopment: string;

  /**
   * Factual narrative of how the group responded to the experiences.
   * Required. Minimum 15 characters, maximum 600 characters.
   */
  readonly groupResponse: string;

  /**
   * Optional narrative of adjustments made in adult mediation, materials, or environment.
   * Maximum 400 characters if present.
   */
  readonly adaptations?: string;

  /**
   * Optional narrative of aspects to continue or revisit in future planning.
   * Maximum 400 characters if present.
   */
  readonly continuity?: string;
}

/**
 * Public client request contract for assisting daily evaluation drafting.
 *
 * Specifically absent:
 * - currentDate (server-authoritative time)
 * - executionStatus
 * - activity objectives, descriptions, PDAs, materials, room profile, daycareId, teacherId, UID
 *   (all trusted context is retrieved server-authoritatively).
 */
export interface AssistDailyEvaluationGatewayRequest {
  readonly planningId: string;
  readonly dayOfWeek: EvaluationWeekday;
  readonly humanEvidence: HumanObservationEvidence;
}

// ============================================================================
// CANONICAL INTERNAL SANITIZED PROVIDER PAYLOAD CONTRACT
// ============================================================================

export interface SanitizedEvaluationRoomProfile {
  readonly name: string;
  readonly minAgeMonths: number;
  readonly maxAgeMonths: number;
}

export interface SanitizedEvaluationActivityContext {
  readonly category: string;
  readonly objective: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly pdaReference?: {
    readonly field: string;
    readonly description: string;
  };
  /**
   * Prospective observable child response target or adaptation condition from planning.
   *
   * CRITICAL PEDAGOGICAL INVARIANT:
   * This is PLANNED INTENT, NOT OBSERVED OUTCOME.
   * It may guide provider drafting only when connected to observed human evidence.
   * Its presence can NEVER by itself authorize provider text claiming the observation occurred.
   */
  readonly prospectiveObservationTarget?: string;
}

export interface SanitizedEvaluationAIPayload {
  readonly roomProfile: SanitizedEvaluationRoomProfile;
  readonly dayOfWeek: string;
  readonly plannedContext: {
    readonly activities: readonly SanitizedEvaluationActivityContext[];
  };
  readonly humanEvidence: {
    readonly activitiesDevelopment: string;
    readonly groupResponse: string;
    readonly adaptations?: string;
    readonly continuity?: string;
  };
}

// ============================================================================
// CANONICAL RESPONSE CONTRACT
// ============================================================================

/**
 * Minimum narrow response for daily evaluation drafting assistance.
 *
 * Specifically absent:
 * - pedagogicalReflection (rejected in H1R13.3B/C; single evaluation box in official format)
 * - connectedPdaIds (rejected in H1R13.3B/C; server already retains planned PDA governance)
 * - confidence / scores / objectiveAchieved / pdaAchieved / reasoning / chainOfThought
 */
export interface AssistDailyEvaluationResponse {
  readonly suggestedEvaluation: string;
}

// ============================================================================
// SENSITIVE INPUT DETECTION FOUNDATION
// ============================================================================

/**
 * Detects high-confidence sensitive content patterns in human observation evidence.
 *
 * PRIVACY & SAFETY PRINCIPLES:
 * 1. Data minimization and clear educator guidance are the primary defense.
 * 2. This detector catches high-confidence patterns (CURP, email, phone numbers,
 *    obvious credentials, explicit clinical diagnoses).
 * 3. It DOES NOT and CANNOT claim universal personal name detection or universal anonymization.
 *    Individual first names (e.g. "Ana", "Juan", "Sofía") cannot reliably be distinguished
 *    from ordinary Spanish prose using regex alone.
 */
export function detectSensitiveContent(text: string): {
  readonly hasSensitiveContent: boolean;
  readonly reason?: string;
} {
  if (!text || typeof text !== 'string') {
    return { hasSensitiveContent: false };
  }

  // 1. CURP pattern (18 characters: 4 letters, 6 digits, H/M, 5 letters, 1 alphanumeric, 1 digit)
  const curpPattern = /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/i;
  if (curpPattern.test(text)) {
    return { hasSensitiveContent: true, reason: 'CURP pattern detected' };
  }

  // 2. Email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  if (emailPattern.test(text)) {
    return { hasSensitiveContent: true, reason: 'Email address detected' };
  }

  // 3. High-confidence phone pattern (10 consecutive digits, or formatted with dashes/spaces/country code)
  const rawDigits = text.match(/\b(?:\+?52\s?)?(?:\(?\d{2,3}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/);
  if (rawDigits) {
    const digitsOnly = rawDigits[0].replace(/\D/g, '');
    if (digitsOnly.length === 10 || (digitsOnly.length === 12 && digitsOnly.startsWith('52'))) {
      return { hasSensitiveContent: true, reason: 'Phone number pattern detected' };
    }
  }

  // 4. Obvious credentials/tokens/secrets
  const credentialPattern = /\b(?:bearer\s+[a-zA-Z0-9_\-\.]{20,}|ghp_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35})\b/i;
  if (credentialPattern.test(text)) {
    return { hasSensitiveContent: true, reason: 'Credential/token pattern detected' };
  }

  // 5. Explicit high-risk clinical / medical diagnostic vocabulary
  const clinicalPattern = /\b(?:diagn[oó]stico\s+m[eé]dico|trastorno\s+del\s+espectro|medicamento\s+controlado|crisis\s+convulsiva)\b/i;
  if (clinicalPattern.test(text)) {
    return { hasSensitiveContent: true, reason: 'Clinical/medical diagnosis vocabulary detected' };
  }

  return { hasSensitiveContent: false };
}

// ============================================================================
// CONSERVATIVE ANTI-PLATITUDE CHECK
// ============================================================================

/**
 * Conservative deterministic anti-platitude check.
 * Rejects obvious padding or single character repetitions (e.g. "aaaaaaaaaaaaaaa")
 * or the exact same word repeated many times to cheat minimum length.
 *
 * CRITICAL DESIGN INVARIANT:
 * Does NOT score prose quality or reject legitimate concise educator observations.
 */
export function isPlatitudeOrPadding(text: string): boolean {
  const trimmed = text.trim();
  // 1. Single character repeated 8 or more times consecutively
  if (/(.)\1{7,}/.test(trimmed)) {
    return true;
  }
  // 2. Exactly the same short word repeated 4 or more times in a row
  if (/\b(\w{1,6})\s+\1\s+\1\s+\1\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

// ============================================================================
// PROHIBITED EVALUATION LANGUAGE SCANNER
// ============================================================================

/**
 * Scans text for prohibited evaluation language in early childhood education (Educación Inicial).
 *
 * PROHIBITED CATEGORIES:
 * 1. Objective achievement claims ("se logró el objetivo", "objetivo alcanzado", etc.)
 * 2. Curricular PDA mastery claims ("PDA logrado", "PDA alcanzado", "PDA dominado", etc.)
 * 3. Percentage-based achievement claims ("100% de logro", "80% de éxito", etc.)
 * 4. Numerical scores or grades ("calificación de 10", "escala numérica", etc.)
 * 5. Explicit clinical/deficit labeling ("presenta un déficit", "trastorno del desarrollo", etc.)
 *
 * Supports both accented and unaccented variants.
 */
export function scanForProhibitedEvaluationLanguage(text: string): {
  readonly hasProhibitedLanguage: boolean;
  readonly violation?: string;
} {
  if (!text || typeof text !== 'string') {
    return { hasProhibitedLanguage: false };
  }

  // 1. Objective achievement claims
  const objectivePatterns = [
    /\bse\s+logr[oó]\s+(?:el\s+)?objetivo\b/i,
    /\bse\s+cumpli[oó]\s+(?:el\s+)?objetivo\b/i,
    /\bobjetivo\s+(?:fue\s+)?(alcanzado|logrado|cumplido)\b/i,
    /\blogr[oó]\s+(?:el\s+)?100%/i,
    /\bcumplimiento\s+del\s+objetivo\s+al\s+100%/i,
  ];
  for (const pattern of objectivePatterns) {
    if (pattern.test(text)) {
      return {
        hasProhibitedLanguage: true,
        violation: `Prohibited objective achievement claim detected: ${pattern.source}`,
      };
    }
  }

  // 2. PDA achievement claims
  const pdaPatterns = [
    /\bpda\s+(?:fue\s+)?(logrado|alcanzado|dominado|completado|cumplido)\b/i,
    /\bproceso\s+de\s+desarrollo\s+(?:y\s+aprendizaje\s+)?(?:fue\s+)?(logrado|alcanzado|dominado|completado|cumplido)\b/i,
  ];
  for (const pattern of pdaPatterns) {
    if (pattern.test(text)) {
      return {
        hasProhibitedLanguage: true,
        violation: `Prohibited PDA achievement claim detected: ${pattern.source}`,
      };
    }
  }

  // 3. Percentage achievement claims
  const percentagePatterns = [
    /\b\d+%\s+de\s+(?:logro|[eé]xito|cumplimiento|avance|desarrollo)\b/i,
    /\balcanz[oó]\s+(?:el\s+)?\d+%/i,
    /\bcon\s+un\s+\d+%\s+de\s+efectividad\b/i,
  ];
  for (const pattern of percentagePatterns) {
    if (pattern.test(text)) {
      return {
        hasProhibitedLanguage: true,
        violation: `Prohibited percentage achievement claim detected: ${pattern.source}`,
      };
    }
  }

  // 4. Numerical scores or grades
  const scorePatterns = [
    /\bcalificaci[oó]n\s+(?:de\s+)?\d+\b/i,
    /\b\d+\s*de\s*10\s+en\s+evaluaci[oó]n\b/i,
    /\bescala\s+(?:num[eé]rica|estimativa\s+con\s+nota)\b/i,
    /\bpuntaje\s+(?:de\s+)?\d+\b/i,
  ];
  for (const pattern of scorePatterns) {
    if (pattern.test(text)) {
      return {
        hasProhibitedLanguage: true,
        violation: `Prohibited numeric scoring detected: ${pattern.source}`,
      };
    }
  }

  // 5. Explicit clinical diagnosis / deficit labeling
  const clinicalPatterns = [
    /\b(?:presenta\s+un\s+d[eé]ficit|trastorno\s+del\s+desarrollo|patolog[ií]a\s+cognitiva|retraso\s+mental|retraso\s+madurativo\s+severo)\b/i,
  ];
  for (const pattern of clinicalPatterns) {
    if (pattern.test(text)) {
      return {
        hasProhibitedLanguage: true,
        violation: `Prohibited clinical/diagnostic label detected: ${pattern.source}`,
      };
    }
  }

  return { hasProhibitedLanguage: false };
}

// ============================================================================
// CANONICAL VALIDATORS
// ============================================================================

const ALLOWED_REQUEST_KEYS = Object.freeze(new Set(['planningId', 'dayOfWeek', 'humanEvidence']));
const ALLOWED_HUMAN_EVIDENCE_KEYS = Object.freeze(
  new Set(['activitiesDevelopment', 'groupResponse', 'adaptations', 'continuity'])
);
const ALLOWED_RESPONSE_KEYS = Object.freeze(new Set(['suggestedEvaluation']));

const FORBIDDEN_PROVIDER_IDENTIFIER_KEYS = Object.freeze([
  'planningId',
  'daycareId',
  'teacherId',
  'uid',
  'token',
  'auth',
  'authorization',
  'reviewHistory',
  'historicalRounds',
  'granularObservations',
  'databasePath',
]);

/**
 * Validates a client AssistDailyEvaluationGatewayRequest enforcing all canonical bounds and invariants.
 */
export function validateAssistDailyEvaluationRequest(
  request: unknown
): asserts request is AssistDailyEvaluationGatewayRequest {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new GovernedEvaluationAIError(
      'Request must be a non-null object',
      'INVALID_REQUEST'
    );
  }

  const rawReq = request as Record<string, unknown>;

  // Strict check for unexpected top-level fields (including currentDate, executionStatus, room, etc.)
  for (const key of Object.keys(rawReq)) {
    if (!ALLOWED_REQUEST_KEYS.has(key)) {
      throw new GovernedEvaluationAIError(
        `Unexpected field in request: '${key}'`,
        'UNEXPECTED_FIELD'
      );
    }
  }

  // 1. planningId
  if (typeof rawReq.planningId !== 'string' || !rawReq.planningId.trim()) {
    throw new GovernedEvaluationAIError(
      'planningId is required and cannot be blank',
      'INVALID_PLANNING_ID'
    );
  }
  if (rawReq.planningId.trim().length > MAX_PLANNING_ID_LENGTH) {
    throw new GovernedEvaluationAIError(
      `planningId exceeds maximum length of ${MAX_PLANNING_ID_LENGTH} characters`,
      'INVALID_PLANNING_ID'
    );
  }

  // 2. dayOfWeek
  if (
    typeof rawReq.dayOfWeek !== 'string' ||
    !EVALUATION_WEEKDAYS.includes(rawReq.dayOfWeek as EvaluationWeekday)
  ) {
    throw new GovernedEvaluationAIError(
      `dayOfWeek must be one of: ${EVALUATION_WEEKDAYS.join(', ')}`,
      'INVALID_DAY'
    );
  }

  // 3. humanEvidence
  if (
    !rawReq.humanEvidence ||
    typeof rawReq.humanEvidence !== 'object' ||
    Array.isArray(rawReq.humanEvidence)
  ) {
    throw new GovernedEvaluationAIError(
      'humanEvidence is required and must be an object',
      'HUMAN_EVIDENCE_REQUIRED'
    );
  }

  const rawEvidence = rawReq.humanEvidence as Record<string, unknown>;

  // Strict check for unexpected humanEvidence fields (including executionStatus, currentDate, score, etc.)
  for (const key of Object.keys(rawEvidence)) {
    if (!ALLOWED_HUMAN_EVIDENCE_KEYS.has(key)) {
      throw new GovernedEvaluationAIError(
        `Unexpected field in humanEvidence: '${key}'`,
        'UNEXPECTED_FIELD'
      );
    }
  }

  // 3a. activitiesDevelopment
  if (typeof rawEvidence.activitiesDevelopment !== 'string') {
    throw new GovernedEvaluationAIError(
      'activitiesDevelopment is required and must be a string',
      'HUMAN_EVIDENCE_REQUIRED'
    );
  }
  const trimmedDev = rawEvidence.activitiesDevelopment.trim();
  if (trimmedDev.length < HUMAN_EVIDENCE_MIN_ACTIVITIES_DEVELOPMENT_LENGTH) {
    throw new GovernedEvaluationAIError(
      `activitiesDevelopment must be at least ${HUMAN_EVIDENCE_MIN_ACTIVITIES_DEVELOPMENT_LENGTH} characters`,
      'HUMAN_EVIDENCE_TOO_SHORT'
    );
  }
  if (trimmedDev.length > HUMAN_EVIDENCE_MAX_ACTIVITIES_DEVELOPMENT_LENGTH) {
    throw new GovernedEvaluationAIError(
      `activitiesDevelopment exceeds maximum length of ${HUMAN_EVIDENCE_MAX_ACTIVITIES_DEVELOPMENT_LENGTH} characters`,
      'HUMAN_EVIDENCE_TOO_LONG'
    );
  }
  if (isPlatitudeOrPadding(trimmedDev)) {
    throw new GovernedEvaluationAIError(
      'activitiesDevelopment contains repetitive characters or padding',
      'HUMAN_EVIDENCE_TOO_SHORT'
    );
  }
  const sensitiveDev = detectSensitiveContent(trimmedDev);
  if (sensitiveDev.hasSensitiveContent) {
    throw new GovernedEvaluationAIError(
      `Sensitive content detected in activitiesDevelopment: ${sensitiveDev.reason}`,
      'SENSITIVE_CONTENT_DETECTED'
    );
  }

  // 3b. groupResponse
  if (typeof rawEvidence.groupResponse !== 'string') {
    throw new GovernedEvaluationAIError(
      'groupResponse is required and must be a string',
      'HUMAN_EVIDENCE_REQUIRED'
    );
  }
  const trimmedResp = rawEvidence.groupResponse.trim();
  if (trimmedResp.length < HUMAN_EVIDENCE_MIN_GROUP_RESPONSE_LENGTH) {
    throw new GovernedEvaluationAIError(
      `groupResponse must be at least ${HUMAN_EVIDENCE_MIN_GROUP_RESPONSE_LENGTH} characters`,
      'HUMAN_EVIDENCE_TOO_SHORT'
    );
  }
  if (trimmedResp.length > HUMAN_EVIDENCE_MAX_GROUP_RESPONSE_LENGTH) {
    throw new GovernedEvaluationAIError(
      `groupResponse exceeds maximum length of ${HUMAN_EVIDENCE_MAX_GROUP_RESPONSE_LENGTH} characters`,
      'HUMAN_EVIDENCE_TOO_LONG'
    );
  }
  if (isPlatitudeOrPadding(trimmedResp)) {
    throw new GovernedEvaluationAIError(
      'groupResponse contains repetitive characters or padding',
      'HUMAN_EVIDENCE_TOO_SHORT'
    );
  }
  const sensitiveResp = detectSensitiveContent(trimmedResp);
  if (sensitiveResp.hasSensitiveContent) {
    throw new GovernedEvaluationAIError(
      `Sensitive content detected in groupResponse: ${sensitiveResp.reason}`,
      'SENSITIVE_CONTENT_DETECTED'
    );
  }

  // 3c. adaptations (optional)
  if (rawEvidence.adaptations !== undefined) {
    if (typeof rawEvidence.adaptations !== 'string') {
      throw new GovernedEvaluationAIError(
        'adaptations must be a string if provided',
        'INVALID_REQUEST'
      );
    }
    const trimmedAdap = rawEvidence.adaptations.trim();
    if (trimmedAdap.length > HUMAN_EVIDENCE_MAX_ADAPTATIONS_LENGTH) {
      throw new GovernedEvaluationAIError(
        `adaptations exceeds maximum length of ${HUMAN_EVIDENCE_MAX_ADAPTATIONS_LENGTH} characters`,
        'HUMAN_EVIDENCE_TOO_LONG'
      );
    }
    const sensitiveAdap = detectSensitiveContent(trimmedAdap);
    if (sensitiveAdap.hasSensitiveContent) {
      throw new GovernedEvaluationAIError(
        `Sensitive content detected in adaptations: ${sensitiveAdap.reason}`,
        'SENSITIVE_CONTENT_DETECTED'
      );
    }
  }

  // 3d. continuity (optional)
  if (rawEvidence.continuity !== undefined) {
    if (typeof rawEvidence.continuity !== 'string') {
      throw new GovernedEvaluationAIError(
        'continuity must be a string if provided',
        'INVALID_REQUEST'
      );
    }
    const trimmedCont = rawEvidence.continuity.trim();
    if (trimmedCont.length > HUMAN_EVIDENCE_MAX_CONTINUITY_LENGTH) {
      throw new GovernedEvaluationAIError(
        `continuity exceeds maximum length of ${HUMAN_EVIDENCE_MAX_CONTINUITY_LENGTH} characters`,
        'HUMAN_EVIDENCE_TOO_LONG'
      );
    }
    const sensitiveCont = detectSensitiveContent(trimmedCont);
    if (sensitiveCont.hasSensitiveContent) {
      throw new GovernedEvaluationAIError(
        `Sensitive content detected in continuity: ${sensitiveCont.reason}`,
        'SENSITIVE_CONTENT_DETECTED'
      );
    }
  }
}

/**
 * Validates an internal sanitized provider payload ensuring no technical identifiers leaked.
 */
export function validateSanitizedEvaluationAIPayload(
  payload: unknown
): asserts payload is SanitizedEvaluationAIPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new GovernedEvaluationAIError(
      'Provider payload must be a non-null object',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }

  const raw = payload as Record<string, unknown>;

  // Check for forbidden technical identifiers in payload
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_PROVIDER_IDENTIFIER_KEYS.includes(key)) {
      throw new GovernedEvaluationAIError(
        `Forbidden technical identifier in provider payload: '${key}'`,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }
  }

  const allowedPayloadKeys = new Set(['roomProfile', 'dayOfWeek', 'plannedContext', 'humanEvidence']);
  for (const key of Object.keys(raw)) {
    if (!allowedPayloadKeys.has(key)) {
      throw new GovernedEvaluationAIError(
        `Unexpected field in provider payload: '${key}'`,
        'UNEXPECTED_FIELD'
      );
    }
  }

  // 1. roomProfile
  if (!raw.roomProfile || typeof raw.roomProfile !== 'object' || Array.isArray(raw.roomProfile)) {
    throw new GovernedEvaluationAIError(
      'roomProfile is required and must be an object',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }
  const room = raw.roomProfile as Record<string, unknown>;
  if (typeof room.name !== 'string' || !room.name.trim()) {
    throw new GovernedEvaluationAIError(
      'roomProfile.name must be a non-empty string',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }
  if (typeof room.minAgeMonths !== 'number' || room.minAgeMonths < 0) {
    throw new GovernedEvaluationAIError(
      'roomProfile.minAgeMonths must be a non-negative number',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }
  if (typeof room.maxAgeMonths !== 'number' || room.maxAgeMonths < room.minAgeMonths) {
    throw new GovernedEvaluationAIError(
      'roomProfile.maxAgeMonths must be greater than or equal to minAgeMonths',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }

  // 2. dayOfWeek
  if (typeof raw.dayOfWeek !== 'string' || !raw.dayOfWeek.trim()) {
    throw new GovernedEvaluationAIError(
      'dayOfWeek must be a non-empty string',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }

  // 3. plannedContext
  if (!raw.plannedContext || typeof raw.plannedContext !== 'object' || Array.isArray(raw.plannedContext)) {
    throw new GovernedEvaluationAIError(
      'plannedContext is required and must be an object',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }
  const planned = raw.plannedContext as Record<string, unknown>;
  if (!Array.isArray(planned.activities) || planned.activities.length === 0) {
    throw new GovernedEvaluationAIError(
      'plannedContext.activities must be a non-empty array',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }
  for (let i = 0; i < planned.activities.length; i++) {
    const act = planned.activities[i];
    if (!act || typeof act !== 'object' || Array.isArray(act)) {
      throw new GovernedEvaluationAIError(
        `plannedContext.activities[${i}] must be an object`,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }
    if (typeof act.category !== 'string' || !act.category.trim()) {
      throw new GovernedEvaluationAIError(
        `plannedContext.activities[${i}].category must be a non-empty string`,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }
    if (typeof act.objective !== 'string' || !act.objective.trim()) {
      throw new GovernedEvaluationAIError(
        `plannedContext.activities[${i}].objective must be a non-empty string`,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }
    if (typeof act.description !== 'string' || !act.description.trim()) {
      throw new GovernedEvaluationAIError(
        `plannedContext.activities[${i}].description must be a non-empty string`,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }
    if (
      typeof act.durationMinutes !== 'number' ||
      act.durationMinutes < MIN_ACTIVITY_DURATION_MINUTES ||
      act.durationMinutes > MAX_ACTIVITY_DURATION_MINUTES
    ) {
      throw new GovernedEvaluationAIError(
        `plannedContext.activities[${i}].durationMinutes must be between ${MIN_ACTIVITY_DURATION_MINUTES} and ${MAX_ACTIVITY_DURATION_MINUTES}`,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }
    if (act.prospectiveObservationTarget !== undefined && typeof act.prospectiveObservationTarget !== 'string') {
      throw new GovernedEvaluationAIError(
        `plannedContext.activities[${i}].prospectiveObservationTarget must be a string`,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }
  }

  // 4. humanEvidence
  if (!raw.humanEvidence || typeof raw.humanEvidence !== 'object' || Array.isArray(raw.humanEvidence)) {
    throw new GovernedEvaluationAIError(
      'humanEvidence is required in provider payload',
      'INVALID_PROVIDER_PAYLOAD'
    );
  }
}

/**
 * Validates an AssistDailyEvaluationResponse from an AI provider enforcing single-property schema,
 * length bounds, and fail-closed prohibited language scanning.
 */
export function validateAssistDailyEvaluationResponse(
  response: unknown
): asserts response is AssistDailyEvaluationResponse {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new GovernedEvaluationAIError(
      'Response must be a non-null object',
      'INVALID_PROVIDER_RESPONSE'
    );
  }

  const raw = response as Record<string, unknown>;

  // Exact single-property check
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_RESPONSE_KEYS.has(key)) {
      throw new GovernedEvaluationAIError(
        `Unexpected field in provider response: '${key}'`,
        'UNEXPECTED_FIELD'
      );
    }
  }

  if (typeof raw.suggestedEvaluation !== 'string') {
    throw new GovernedEvaluationAIError(
      'suggestedEvaluation is required and must be a string',
      'INVALID_PROVIDER_RESPONSE'
    );
  }

  const trimmed = raw.suggestedEvaluation.trim();
  if (trimmed.length < SUGGESTED_EVALUATION_MIN_LENGTH) {
    throw new GovernedEvaluationAIError(
      `suggestedEvaluation must be at least ${SUGGESTED_EVALUATION_MIN_LENGTH} characters`,
      'INVALID_PROVIDER_RESPONSE'
    );
  }
  if (trimmed.length > SUGGESTED_EVALUATION_MAX_LENGTH) {
    throw new GovernedEvaluationAIError(
      `suggestedEvaluation exceeds maximum length of ${SUGGESTED_EVALUATION_MAX_LENGTH} characters`,
      'INVALID_PROVIDER_RESPONSE'
    );
  }

  // Prohibited language scan
  const prohibitedScan = scanForProhibitedEvaluationLanguage(trimmed);
  if (prohibitedScan.hasProhibitedLanguage) {
    throw new GovernedEvaluationAIError(
      `Provider response rejected due to prohibited evaluation language: ${prohibitedScan.violation}`,
      'PROHIBITED_EVALUATION_LANGUAGE'
    );
  }
}
