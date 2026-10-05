import { randomUUID } from 'node:crypto';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { write as functionsWrite } from 'firebase-functions/logger';
import { openAIApiKey } from './recommendCurricularPDA';
import {
  createFirestoreWeeklyPlanningAuthorizer,
  type WeeklyPlanningAuthorizer,
  type WeeklyPlanningAuthorizationContext,
  type WeeklyPlanningAuthorizationResult,
} from './FirestoreWeeklyPlanningAuthorizer';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  WeeklyPlanningProposalConstraints,
  WeeklyPlanningModality,
  InvalidWeeklyPlanningProposalError,
  UnsupportedPedagogicalPolicyError,
  PedagogicalPolicyViolationError,
  BlockingMaterialPolicyViolationError,
  WeeklyPlanningDensityViolationError,
  type CanonicalProgressionDiagnosticSubtype,
} from '../../src/application/planning/WeeklyPlanningProposalSource';
import { AIWeeklyPlanningProposalSource } from '../../src/application/planning/AIWeeklyPlanningProposalSource';
import {
  OpenAIWeeklyPlanningExecutor,
  WeeklyPlanningAIExecutorConfigurationError,
  WeeklyPlanningAIExecutorTransportError,
  WeeklyPlanningAIExecutorHttpError,
  WeeklyPlanningAIExecutorInvalidResponseError,
  type WeeklyPlanningAITelemetryObserver,
} from '../../src/infrastructure/ai/OpenAIWeeklyPlanningExecutor';
import { IMSS_CATEGORIES } from '../../src/constants/imssCategories';

/**
 * Maximum allowed payload size in bytes (16 KB).
 */
export const MAX_WEEKLY_PLANNING_PAYLOAD_BYTES = 16384;

/**
 * Maximum allowed length for narrative pedagogical context strings.
 */
export const MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH = 1000;

/**
 * Maximum allowed length for short identifier and category strings.
 */
export const MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH = 200;

/**
 * Client -> Gateway request payload contract for proposeWeeklyPlanning.
 */
export interface ProposeWeeklyPlanningGatewayRequest {
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly modality: WeeklyPlanningModality;
  readonly room: {
    readonly roomId: string;
    readonly name: string;
    readonly minAgeMonths: number;
    readonly maxAgeMonths: number;
  };
  readonly currentContext: {
    readonly observations?: string;
    readonly identifiedNeeds?: string;
    readonly specialSituations?: string;
    readonly availableMaterials?: string;
  };
  readonly constraints?: WeeklyPlanningProposalConstraints;
  // Operational fields (used for authorization only, stripped before AI execution)
  readonly planningId?: string;
  readonly daycareId?: string;
}

/**
 * Gateway -> Client success response contract for proposeWeeklyPlanning.
 */
export type ProposeWeeklyPlanningGatewayResponse = WeeklyPlanningProposalResponse;

/**
 * Forbidden keys that must never be accepted at the gateway boundary.
 *
 * FAILS CLOSED on any attempt to pass lifecycle, approval, evaluation,
 * curricular selection, PII, medical, or credentials data.
 */
const FORBIDDEN_GATEWAY_KEYS = Object.freeze([
  'status',
  'approvedBy',
  'approvedAt',
  'submittedBy',
  'submittedAt',
  'closedBy',
  'closedAt',
  'reviewHistory',
  'evaluation',
  'evaluationStatus',
  'curricularTraceability',
  'pdaId',
  'catalogRevision',
  'complementaryActivities',
  'prioritizedPractices',
  'children',
  'childId',
  'childName',
  'family',
  'familyName',
  'medicalData',
  'diagnosis',
  'apiKey',
  'secret',
  'token',
  'model',
  'baseUrl',
  'systemPrompt',
  'correlationId',
]);

/**
 * Checks an object recursively for forbidden keys.
 */
function scanForForbiddenKeys(obj: unknown, path: string = ''): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      scanForForbiddenKeys(obj[i], `${path}[${i}]`);
    }
    return;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_GATEWAY_KEYS.includes(key)) {
      throw new HttpsError(
        'invalid-argument',
        `Request contains forbidden or authority-bearing field: '${currentPath}'.`
      );
    }
    scanForForbiddenKeys(record[key], currentPath);
  }
}

/**
 * Validates request data and enforces conservative schema & payload bounds.
 */
export function validateProposeWeeklyPlanningGatewayPayload(
  data: unknown
): ProposeWeeklyPlanningGatewayRequest {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Request payload must be a non-null JSON object.');
  }

  // 1. Enforce payload size limit
  let rawString: string;
  try {
    rawString = JSON.stringify(data);
  } catch {
    throw new HttpsError('invalid-argument', 'Payload could not be serialized for validation.');
  }

  if (Buffer.byteLength(rawString, 'utf8') > MAX_WEEKLY_PLANNING_PAYLOAD_BYTES) {
    throw new HttpsError(
      'invalid-argument',
      `Payload size exceeds the ${MAX_WEEKLY_PLANNING_PAYLOAD_BYTES} bytes limit.`
    );
  }

  // 2. Reject all forbidden authority, credential, and PII keys
  scanForForbiddenKeys(data);

  const raw = data as Record<string, unknown>;

  // 3. Modality validation: DIRECT or INDIRECT
  if (raw.modality !== 'DIRECT' && raw.modality !== 'INDIRECT') {
    throw new HttpsError(
      'invalid-argument',
      `Modality must be 'DIRECT' or 'INDIRECT'. Received: '${String(raw.modality)}'.`
    );
  }

  // 4. Week date boundary validation
  if (typeof raw.weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.weekStart.trim())) {
    throw new HttpsError(
      'invalid-argument',
      'weekStart must be a valid date string in YYYY-MM-DD format.'
    );
  }
  if (typeof raw.weekEnd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.weekEnd.trim())) {
    throw new HttpsError(
      'invalid-argument',
      'weekEnd must be a valid date string in YYYY-MM-DD format.'
    );
  }
  if (raw.weekStart.trim() > raw.weekEnd.trim()) {
    throw new HttpsError('invalid-argument', 'weekStart must be less than or equal to weekEnd.');
  }

  // 5. Room validation
  if (!raw.room || typeof raw.room !== 'object' || Array.isArray(raw.room)) {
    throw new HttpsError('invalid-argument', 'Missing required room developmental context.');
  }
  const room = raw.room as Record<string, unknown>;
  if (typeof room.roomId !== 'string' || !room.roomId.trim()) {
    throw new HttpsError('invalid-argument', 'room.roomId must be a non-empty string.');
  }
  if (room.roomId.trim().length > MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `room.roomId exceeds maximum length of ${MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH} characters.`
    );
  }
  if (typeof room.name !== 'string' || !room.name.trim()) {
    throw new HttpsError('invalid-argument', 'room.name must be a non-empty string.');
  }
  if (room.name.trim().length > MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `room.name exceeds maximum length of ${MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH} characters.`
    );
  }
  if (
    typeof room.minAgeMonths !== 'number' ||
    !Number.isInteger(room.minAgeMonths) ||
    room.minAgeMonths < 0
  ) {
    throw new HttpsError(
      'invalid-argument',
      'room.minAgeMonths must be a non-negative integer.'
    );
  }
  if (
    typeof room.maxAgeMonths !== 'number' ||
    !Number.isInteger(room.maxAgeMonths) ||
    room.maxAgeMonths < room.minAgeMonths
  ) {
    throw new HttpsError(
      'invalid-argument',
      'room.maxAgeMonths must be an integer greater than or equal to minAgeMonths.'
    );
  }

  // 6. Current Context validation
  if (
    !raw.currentContext ||
    typeof raw.currentContext !== 'object' ||
    Array.isArray(raw.currentContext)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'currentContext must be a non-null object.'
    );
  }
  const ctx = raw.currentContext as Record<string, unknown>;
  const allowedContextFields = [
    'observations',
    'identifiedNeeds',
    'specialSituations',
    'availableMaterials',
  ];
  for (const key of Object.keys(ctx)) {
    if (!allowedContextFields.includes(key)) {
      throw new HttpsError(
        'invalid-argument',
        `currentContext contains unexpected property '${key}'.`
      );
    }
    const val = ctx[key];
    if (val !== undefined && typeof val !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        `currentContext.${key} must be a string.`
      );
    }
    if (typeof val === 'string' && val.length > MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH) {
      throw new HttpsError(
        'invalid-argument',
        `currentContext.${key} exceeds maximum length of ${MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH} characters.`
      );
    }
  }

  // 7. Constraints validation (optional)
  if (raw.constraints !== undefined) {
    if (!raw.constraints || typeof raw.constraints !== 'object' || Array.isArray(raw.constraints)) {
      throw new HttpsError('invalid-argument', 'constraints must be an object if provided.');
    }
    const constraints = raw.constraints as Record<string, unknown>;
    const allowedConstraintKeys = [
      'allowedCategories',
      'minActivitiesPerDay',
      'maxActivitiesPerDay',
      'minDurationMinutes',
      'maxDurationMinutes',
    ];
    for (const key of Object.keys(constraints)) {
      if (!allowedConstraintKeys.includes(key)) {
        throw new HttpsError(
          'invalid-argument',
          `constraints contains unexpected property '${key}'.`
        );
      }
    }

    if (constraints.allowedCategories !== undefined) {
      if (!Array.isArray(constraints.allowedCategories)) {
        throw new HttpsError(
          'invalid-argument',
          'constraints.allowedCategories must be an array of strings.'
        );
      }
      for (const cat of constraints.allowedCategories) {
        if (typeof cat !== 'string' || !(IMSS_CATEGORIES as readonly string[]).includes(cat)) {
          throw new HttpsError(
            'invalid-argument',
            `Invalid constraint category '${String(cat)}'. Must be one of: ${IMSS_CATEGORIES.join(', ')}.`
          );
        }
      }
    }

    if (constraints.minActivitiesPerDay !== undefined) {
      if (
        typeof constraints.minActivitiesPerDay !== 'number' ||
        constraints.minActivitiesPerDay < 1
      ) {
        throw new HttpsError(
          'invalid-argument',
          'constraints.minActivitiesPerDay must be a positive integer.'
        );
      }
    }

    if (constraints.maxActivitiesPerDay !== undefined) {
      if (
        typeof constraints.maxActivitiesPerDay !== 'number' ||
        constraints.maxActivitiesPerDay < 1 ||
        (constraints.minActivitiesPerDay !== undefined &&
          constraints.maxActivitiesPerDay < (constraints.minActivitiesPerDay as number))
      ) {
        throw new HttpsError(
          'invalid-argument',
          'constraints.maxActivitiesPerDay must be >= minActivitiesPerDay.'
        );
      }
    }

    if (constraints.minDurationMinutes !== undefined) {
      if (
        typeof constraints.minDurationMinutes !== 'number' ||
        constraints.minDurationMinutes < 1
      ) {
        throw new HttpsError(
          'invalid-argument',
          'constraints.minDurationMinutes must be a positive number.'
        );
      }
    }

    if (constraints.maxDurationMinutes !== undefined) {
      if (
        typeof constraints.maxDurationMinutes !== 'number' ||
        constraints.maxDurationMinutes < 1 ||
        (constraints.minDurationMinutes !== undefined &&
          constraints.maxDurationMinutes < (constraints.minDurationMinutes as number))
      ) {
        throw new HttpsError(
          'invalid-argument',
          'constraints.maxDurationMinutes must be >= minDurationMinutes.'
        );
      }
    }
  }

  // 8. Optional operational fields
  if (raw.planningId !== undefined) {
    if (
      typeof raw.planningId !== 'string' ||
      raw.planningId.trim().length === 0 ||
      raw.planningId.length > MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH
    ) {
      throw new HttpsError(
        'invalid-argument',
        `planningId must be a non-empty string up to ${MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH} characters.`
      );
    }
  }

  if (raw.daycareId !== undefined) {
    if (
      typeof raw.daycareId !== 'string' ||
      raw.daycareId.trim().length === 0 ||
      raw.daycareId.length > MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH
    ) {
      throw new HttpsError(
        'invalid-argument',
        `daycareId must be a non-empty string up to ${MAX_WEEKLY_PLANNING_SHORT_FIELD_LENGTH} characters.`
      );
    }
  }

  return raw as unknown as ProposeWeeklyPlanningGatewayRequest;
}

/**
 * Closed enumeration of bounded processing stages for safe operational diagnostics.
 */
export type WeeklyPlanningProcessingStage =
  | 'REQUEST_VALIDATION'
  | 'AUTHORIZATION'
  | 'POLICY_RESOLUTION'
  | 'AI_DISPATCH'
  | 'PROVIDER_RESPONSE'
  | 'PROVIDER_PARSE'
  | 'INTERNAL_PROJECTION'
  | 'CANONICAL_VALIDATION'
  | 'TECHNICAL_BOUNDS'
  | 'DAILY_READING'
  | 'MATERIAL_ENCLOSURE'
  | 'AGE_SAFETY'
  | 'RESPONSE_ASSEMBLY'
  | 'UNEXPECTED_INTERNAL';

/**
 * Closed enumeration of deterministic failure codes for safe operational diagnostics.
 */
export type WeeklyPlanningFailureCode =
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INVALID_PROVIDER_JSON'
  | 'INVALID_CANONICAL_PROPOSAL'
  | 'TECHNICAL_BOUNDS_VIOLATION'
  | 'MISSING_DAILY_READING'
  | 'MULTIPLE_DAILY_READING'
  | 'INVALID_READING_DURATION'
  | 'OBJECTIVE_MATERIAL_LEAK'
  | 'INVALID_MATERIAL_REF'
  | 'UNDECLARED_MATERIAL'
  | 'PROCEDURAL_MATERIAL_LEAK'
  | 'PROCEDURAL_REF_SYNTAX_LEAK'
  | 'UNAUTHORIZED_MATERIAL_LEAK'
  | 'ZERO_MATERIAL_PLACEHOLDER_LEAK'
  | 'ZERO_MATERIAL_ACTION_VERB_LEAK'
  | 'BLOCKING_MATERIAL_POLICY'
  | 'BLOCKING_AGE_POLICY'
  | 'UNSUPPORTED_POLICY'
  | 'UNAUTHORIZED'
  | 'INVALID_REQUEST'
  | 'UNEXPECTED_INTERNAL';

/**
 * Safe, bounded diagnostic subtypes for refined operational telemetry.
 *
 * CRITICAL PRIVACY & GOVERNANCE BOUNDARY:
 * Fixed enum only. Never contains free text, matched tokens, phrases, or PII.
 */
export type WeeklyPlanningDiagnosticSubtype =
  | 'ZERO_MATERIAL_ACTION_VERB_GENERIC_ONLY'
  | 'ZERO_MATERIAL_ACTION_VERB_WITH_KNOWN_MATERIAL_TERM'
  | CanonicalProgressionDiagnosticSubtype;

/**
 * Structured log event for safe server-side Weekly Planning observability.
 */
export interface WeeklyPlanningGatewayLogEntry {
  readonly severity: 'INFO' | 'ERROR';
  readonly correlationId: string;
  readonly event:
    | 'weekly_planning_gateway.started'
    | 'weekly_planning_gateway.completed'
    | 'weekly_planning_gateway.failed';
  readonly model: string;
  readonly latencyMs?: number;
  readonly promptTokens?: number | null;
  readonly completionTokens?: number | null;
  readonly totalTokens?: number | null;
  readonly safeErrorCategory?: string;
  readonly processingStage?: WeeklyPlanningProcessingStage;
  readonly failureCode?: WeeklyPlanningFailureCode;
  readonly diagnosticSubtype?: WeeklyPlanningDiagnosticSubtype;
  readonly upstreamStatus?: number;
}

/**
 * Structured logger port for server-side Weekly Planning gateway events.
 */
export interface WeeklyPlanningGatewayLogger {
  write(entry: WeeklyPlanningGatewayLogEntry): void;
}

/**
 * Default production logger delegating to Google Cloud / Firebase Functions logging.
 */
export const defaultWeeklyPlanningGatewayLogger: WeeklyPlanningGatewayLogger = {
  write: (entry) => functionsWrite(entry as any),
};

/**
 * Proposal executor function port.
 */
export type WeeklyPlanningProposalExecutor = (
  request: WeeklyPlanningProposalRequest
) => Promise<WeeklyPlanningProposalResponse>;

/**
 * Options for creating a request-scoped proposal executor.
 */
export interface WeeklyPlanningProposalExecutorOptions {
  readonly onTelemetry?: WeeklyPlanningAITelemetryObserver;
  readonly apiKey?: string;
  readonly fetchFn?: typeof fetch;
}

/**
 * Factory for creating a request-scoped proposal executor.
 */
export function createWeeklyPlanningProposalExecutor(
  options: WeeklyPlanningProposalExecutorOptions = {}
): WeeklyPlanningProposalExecutor {
  const executor = new OpenAIWeeklyPlanningExecutor({
    apiKey: options.apiKey,
    fetchFn: options.fetchFn,
    onTelemetry: options.onTelemetry,
  });
  const source = new AIWeeklyPlanningProposalSource(executor);
  return (request: WeeklyPlanningProposalRequest) => source.propose(request);
}

/**
 * Default production weekly planning proposal executor.
 */
export const defaultProductionWeeklyPlanningExecutor: WeeklyPlanningProposalExecutor =
  createWeeklyPlanningProposalExecutor();

/**
 * Default production authorizer.
 */
export const defaultProductionWeeklyPlanningAuthorizer: WeeklyPlanningAuthorizer =
  createFirestoreWeeklyPlanningAuthorizer();

/**
 * Maps arbitrary runtime or upstream errors into safe, typed Firebase HttpsErrors.
 *
 * CRITICAL PRIVACY & SECURITY BOUNDARY:
 * Upstream response bodies, API keys, pedagogical free text, and internal stack traces
 * are NEVER returned to the browser/caller.
 */
export function mapToSafeWeeklyPlanningError(err: unknown): HttpsError {
  if (err instanceof HttpsError) {
    return err;
  }

  // Extract root cause if wrapped in an Error with cause
  const target =
    err && typeof err === 'object' && 'cause' in err && (err as any).cause
      ? (err as any).cause
      : err;

  if (target instanceof UnsupportedPedagogicalPolicyError) {
    return new HttpsError(
      'failed-precondition',
      'The requested room or age profile is not currently supported by pedagogical safety policy.'
    );
  }

  if (target instanceof BlockingMaterialPolicyViolationError) {
    return new HttpsError(
      'failed-precondition',
      'Proposed activities require materials outside the educator-supplied available materials set.'
    );
  }

  if (target instanceof WeeklyPlanningDensityViolationError) {
    return new HttpsError(
      'failed-precondition',
      'Proposed activities do not meet the required daily density target.'
    );
  }

  if (target instanceof PedagogicalPolicyViolationError) {
    return new HttpsError(
      'failed-precondition',
      'Proposed activities violate pedagogical safety or age-appropriate development policy.'
    );
  }

  if (target instanceof WeeklyPlanningAIExecutorConfigurationError) {
    return new HttpsError(
      'failed-precondition',
      'Weekly planning AI service is misconfigured or missing provider configuration.'
    );
  }

  if (target instanceof WeeklyPlanningAIExecutorTransportError) {
    return new HttpsError(
      'unavailable',
      'Weekly planning AI service is temporarily unavailable due to a network transport issue.'
    );
  }

  if (target instanceof WeeklyPlanningAIExecutorHttpError) {
    if (target.upstreamStatus === 429) {
      return new HttpsError(
        'resource-exhausted',
        'Weekly planning AI rate limit exceeded. Please try again later.'
      );
    }
    // 401, 403, 500, etc. map safely to unavailable without leaking credentials
    return new HttpsError(
      'unavailable',
      'Weekly planning AI service is temporarily unavailable.'
    );
  }

  if (target instanceof WeeklyPlanningAIExecutorInvalidResponseError) {
    return new HttpsError(
      'internal',
      'Weekly planning AI service received an invalid response from provider.'
    );
  }

  // Check message patterns for fail-safe classification
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('Missing OpenAI API key') || msg.includes('CONFIGURATION')) {
    return new HttpsError(
      'failed-precondition',
      'Weekly planning AI service is misconfigured or missing provider configuration.'
    );
  }

  if (
    msg.includes('timed out') ||
    msg.includes('transport failure') ||
    msg.includes('TRANSPORT')
  ) {
    return new HttpsError(
      'unavailable',
      'Weekly planning AI service is temporarily unavailable due to a network transport issue.'
    );
  }

  if (msg.includes('(429)')) {
    return new HttpsError(
      'resource-exhausted',
      'Weekly planning AI rate limit exceeded. Please try again later.'
    );
  }

  if (
    msg.includes('(401)') ||
    msg.includes('(403)') ||
    msg.includes('(500)') ||
    msg.includes('upstream HTTP error')
  ) {
    return new HttpsError(
      'unavailable',
      'Weekly planning AI service is temporarily unavailable.'
    );
  }

  if (
    msg.includes('not valid JSON') ||
    msg.includes('missing choices') ||
    msg.includes('INVALID_RESPONSE')
  ) {
    return new HttpsError(
      'internal',
      'Weekly planning AI service received an invalid response from provider.'
    );
  }

  if (err instanceof InvalidWeeklyPlanningProposalError) {
    return new HttpsError(
      'internal',
      'Proposed weekly plan failed canonical validation.'
    );
  }

  return new HttpsError(
    'internal',
    'An unexpected error occurred during weekly planning proposal generation.'
  );
}

/**
 * Safe classification result for server-side Weekly Planning failures.
 */
export interface WeeklyPlanningFailureClassification {
  readonly safeError: HttpsError;
  readonly processingStage: WeeklyPlanningProcessingStage;
  readonly failureCode: WeeklyPlanningFailureCode;
  readonly diagnosticSubtype?: WeeklyPlanningDiagnosticSubtype;
}

/**
 * Deterministically classifies runtime errors into bounded, privacy-safe failure telemetry.
 *
 * CRITICAL PRIVACY & SECURITY BOUNDARY:
 * Extracts ONLY closed stage and typed failure codes.
 * Prompts, pedagogical free text, user observations, PII, API keys, and raw exception messages
 * are NEVER included in the classification or telemetry.
 */
export function classifyWeeklyPlanningFailure(
  err: unknown,
  stageContext: WeeklyPlanningProcessingStage = 'UNEXPECTED_INTERNAL'
): WeeklyPlanningFailureClassification {
  const safeError = mapToSafeWeeklyPlanningError(err);

  // If already an HttpsError thrown at gateway boundaries
  if (err instanceof HttpsError) {
    if (err.code === 'unauthenticated') {
      return {
        safeError,
        processingStage: 'AUTHORIZATION',
        failureCode: 'UNAUTHORIZED',
      };
    }
    if (err.code === 'permission-denied') {
      return {
        safeError,
        processingStage: 'AUTHORIZATION',
        failureCode: 'UNAUTHORIZED',
      };
    }
    if (err.code === 'invalid-argument') {
      return {
        safeError,
        processingStage: 'REQUEST_VALIDATION',
        failureCode: 'INVALID_REQUEST',
      };
    }
  }

  // Extract root cause if wrapped in an Error with cause
  const target =
    err && typeof err === 'object' && 'cause' in err && (err as any).cause
      ? (err as any).cause
      : err;

  // Domain & Policy Typed Errors
  if (target instanceof UnsupportedPedagogicalPolicyError) {
    return {
      safeError,
      processingStage: 'POLICY_RESOLUTION',
      failureCode: 'UNSUPPORTED_POLICY',
    };
  }

  if (target instanceof BlockingMaterialPolicyViolationError) {
    return {
      safeError,
      processingStage: 'MATERIAL_ENCLOSURE',
      failureCode: 'BLOCKING_MATERIAL_POLICY',
    };
  }

  if (target instanceof PedagogicalPolicyViolationError) {
    return {
      safeError,
      processingStage: 'AGE_SAFETY',
      failureCode: 'BLOCKING_AGE_POLICY',
    };
  }

  if (target instanceof WeeklyPlanningDensityViolationError) {
    return {
      safeError,
      processingStage: 'TECHNICAL_BOUNDS',
      failureCode: 'TECHNICAL_BOUNDS_VIOLATION',
    };
  }

  // Executor Typed Errors
  if (target instanceof WeeklyPlanningAIExecutorConfigurationError) {
    return {
      safeError,
      processingStage: 'AI_DISPATCH',
      failureCode: 'UNEXPECTED_INTERNAL',
    };
  }

  if (target instanceof WeeklyPlanningAIExecutorTransportError) {
    return {
      safeError,
      processingStage: 'AI_DISPATCH',
      failureCode: 'INVALID_PROVIDER_RESPONSE',
    };
  }

  if (target instanceof WeeklyPlanningAIExecutorHttpError) {
    return {
      safeError,
      processingStage: 'PROVIDER_RESPONSE',
      failureCode: 'INVALID_PROVIDER_RESPONSE',
    };
  }

  if (target instanceof WeeklyPlanningAIExecutorInvalidResponseError) {
    const isJson = target.message.includes('not valid JSON');
    return {
      safeError,
      processingStage: 'PROVIDER_PARSE',
      failureCode: isJson ? 'INVALID_PROVIDER_JSON' : 'INVALID_PROVIDER_RESPONSE',
    };
  }

  // Proposal Validation Typed Errors
  if (target instanceof InvalidWeeklyPlanningProposalError) {
    const msg = target.message;

    // Technical bounds violations
    if (
      msg.startsWith('Proposed plan fails technical activity bounds') ||
      (msg.startsWith('Proposed non-reading activity') && msg.includes('has invalid duration'))
    ) {
      return {
        safeError,
        processingStage: 'TECHNICAL_BOUNDS',
        failureCode: 'TECHNICAL_BOUNDS_VIOLATION',
      };
    }

    // Daily reading invariant violations
    if (msg.startsWith('Proposed plan fails daily reading invariant')) {
      let code: WeeklyPlanningFailureCode = 'INVALID_CANONICAL_PROPOSAL';
      if (msg.includes('missing the required daily reading activity')) {
        code = 'MISSING_DAILY_READING';
      } else if (msg.includes('reading activity duration is')) {
        code = 'INVALID_READING_DURATION';
      } else if (msg.includes('contains') && msg.includes('reading activities')) {
        code = 'MULTIPLE_DAILY_READING';
      }
      return {
        safeError,
        processingStage: 'DAILY_READING',
        failureCode: code,
      };
    }

    // Objective material leak
    if (msg.includes('Activity objective must be material-agnostic')) {
      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'OBJECTIVE_MATERIAL_LEAK',
      };
    }

    // Material refs violations
    if (msg.includes('Unknown material ref')) {
      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'INVALID_MATERIAL_REF',
      };
    }

    // Undeclared material mention
    if (msg.includes('mentions material') && msg.includes('without declaring its ref in materialRefs')) {
      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'UNDECLARED_MATERIAL',
      };
    }

    // Procedural material leaks: distinguish 4 deterministic subconditions
    if (msg.includes('proceduralAction contains unprojected material ref syntax')) {
      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'PROCEDURAL_REF_SYNTAX_LEAK',
      };
    }

    if (msg.includes('proceduralAction introduces unauthorized material')) {
      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'UNAUTHORIZED_MATERIAL_LEAK',
      };
    }

    if (msg.includes('cannot reference {material}')) {
      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'ZERO_MATERIAL_PLACEHOLDER_LEAK',
      };
    }

    if (msg.includes('cannot use object-introducing action verb')) {
      const diagnosticSubtype: WeeklyPlanningDiagnosticSubtype = msg.includes('KNOWN_MATERIAL_TERM')
        ? 'ZERO_MATERIAL_ACTION_VERB_WITH_KNOWN_MATERIAL_TERM'
        : 'ZERO_MATERIAL_ACTION_VERB_GENERIC_ONLY';

      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'ZERO_MATERIAL_ACTION_VERB_LEAK',
        diagnosticSubtype,
      };
    }

    if (msg.includes('proceduralAction')) {
      return {
        safeError,
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'PROCEDURAL_MATERIAL_LEAK',
      };
    }

    // Provider JSON parse failure at proposal parsing stage
    if (msg.startsWith('Failed to parse AI output as JSON')) {
      return {
        safeError,
        processingStage: 'PROVIDER_PARSE',
        failureCode: 'INVALID_PROVIDER_JSON',
      };
    }

    // Default canonical validation failure
    const diagnosticSubtype: WeeklyPlanningDiagnosticSubtype =
      (target as any)?.diagnosticSubtype ??
      (err as any)?.diagnosticSubtype ??
      'OTHER_CANONICAL_VALIDATION';

    return {
      safeError,
      processingStage: 'CANONICAL_VALIDATION',
      failureCode: 'INVALID_CANONICAL_PROPOSAL',
      diagnosticSubtype,
    };
  }

  // Fallback if known gateway stage was active
  if (stageContext === 'REQUEST_VALIDATION') {
    return {
      safeError,
      processingStage: 'REQUEST_VALIDATION',
      failureCode: 'INVALID_REQUEST',
    };
  }

  if (stageContext === 'AUTHORIZATION') {
    return {
      safeError,
      processingStage: 'AUTHORIZATION',
      failureCode: 'UNAUTHORIZED',
    };
  }

  return {
    safeError,
    processingStage: 'UNEXPECTED_INTERNAL',
    failureCode: 'UNEXPECTED_INTERNAL',
  };
}

/**
 * Options for configuring handleProposeWeeklyPlanning.
 */
export interface ProposeWeeklyPlanningHandlerOptions {
  readonly authorizer?: WeeklyPlanningAuthorizer;
  readonly executor?: WeeklyPlanningProposalExecutor;
  readonly createExecutor?: (options: {
    onTelemetry: WeeklyPlanningAITelemetryObserver;
  }) => WeeklyPlanningProposalExecutor;
  readonly logger?: WeeklyPlanningGatewayLogger;
  readonly correlationIdProvider?: () => string;
}

/**
 * Pure handler logic for proposeWeeklyPlanning.
 * Separates transport execution from dependency injection for isolated testing.
 */
export async function handleProposeWeeklyPlanning(
  request: CallableRequest<unknown>,
  options: ProposeWeeklyPlanningHandlerOptions = {}
): Promise<ProposeWeeklyPlanningGatewayResponse> {
  const authorizer = options.authorizer ?? defaultProductionWeeklyPlanningAuthorizer;
  const logger = options.logger ?? defaultWeeklyPlanningGatewayLogger;
  const correlationId = options.correlationIdProvider
    ? options.correlationIdProvider()
    : randomUUID();

  const startMs = performance.now();
  let currentStage: WeeklyPlanningProcessingStage = 'AUTHORIZATION';
  let upstreamStatus: number | undefined;

  // Emit gateway started event
  logger.write({
    severity: 'INFO',
    correlationId,
    event: 'weekly_planning_gateway.started',
    model: 'gpt-4o-mini',
  });

  try {
    // 1. Authenticate caller: Reject unauthenticated callers
    if (!request.auth || !request.auth.uid || !request.auth.uid.trim()) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to request weekly planning proposals.'
      );
    }

    const authenticatedUid = request.auth.uid.trim();
    const tokenClaims = request.auth.token as Record<string, unknown> | undefined;

    // 2. Validate request schema & bounds (Fails closed on malformed or forbidden fields)
    currentStage = 'REQUEST_VALIDATION';
    const validatedPayload = validateProposeWeeklyPlanningGatewayPayload(request.data);

    // 3. Authorize caller via explicit authorization seam
    currentStage = 'AUTHORIZATION';
    const authDecision = await authorizer({
      uid: authenticatedUid,
      tokenClaims,
      daycareId: validatedPayload.daycareId,
      roomId: validatedPayload.room.roomId,
      planningId: validatedPayload.planningId,
    });

    if (!authDecision.authorized) {
      throw new HttpsError(
        'permission-denied',
        authDecision.reason || 'User is not authorized to request weekly planning proposals.'
      );
    }

    // 4. Map to application recommendation request
    // CRITICAL PRIVACY BOUNDARY:
    // planningId and daycareId are strictly operational and NEVER placed in appRequest
    currentStage = 'AI_DISPATCH';
    const appRequest: WeeklyPlanningProposalRequest = {
      weekStart: validatedPayload.weekStart,
      weekEnd: validatedPayload.weekEnd,
      modality: validatedPayload.modality,
      room: {
        roomId: validatedPayload.room.roomId,
        name: validatedPayload.room.name,
        minAgeMonths: validatedPayload.room.minAgeMonths,
        maxAgeMonths: validatedPayload.room.maxAgeMonths,
      },
      currentContext: {
        observations: validatedPayload.currentContext.observations || '',
        identifiedNeeds: validatedPayload.currentContext.identifiedNeeds || '',
        specialSituations: validatedPayload.currentContext.specialSituations || '',
        availableMaterials: validatedPayload.currentContext.availableMaterials || '',
      },
      ...(validatedPayload.constraints ? { constraints: validatedPayload.constraints } : {}),
    };

    // 5. Setup request-scoped telemetry state
    let promptTokens: number | null = null;
    let completionTokens: number | null = null;
    let totalTokens: number | null = null;

    const onTelemetry: WeeklyPlanningAITelemetryObserver = (event) => {
      if (event.event === 'weekly_planning_ai.completed') {
        if (event.usage) {
          promptTokens = event.usage.promptTokens;
          completionTokens = event.usage.completionTokens;
          totalTokens = event.usage.totalTokens;
        }
      } else if (event.event === 'weekly_planning_ai.failed') {
        if (event.upstreamStatus !== undefined) {
          upstreamStatus = event.upstreamStatus;
        }
      }
    };

    const executor =
      options.executor ??
      (options.createExecutor ??
        ((opts) => createWeeklyPlanningProposalExecutor({ onTelemetry: opts.onTelemetry })))({
        onTelemetry,
      });

    const proposal = await executor(appRequest);

    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    logger.write({
      severity: 'INFO',
      correlationId,
      event: 'weekly_planning_gateway.completed',
      model: 'gpt-4o-mini',
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
    });

    // 7. Return minimal safe transient proposal (strictly WeeklyPlanningProposalResponse)
    return proposal;
  } catch (rawErr: unknown) {
    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    const target =
      rawErr && typeof rawErr === 'object' && 'cause' in rawErr && (rawErr as any).cause
        ? (rawErr as any).cause
        : rawErr;

    if (upstreamStatus === undefined && target instanceof WeeklyPlanningAIExecutorHttpError) {
      upstreamStatus = target.upstreamStatus;
    }

    const classification = classifyWeeklyPlanningFailure(rawErr, currentStage);

    logger.write({
      severity: 'ERROR',
      correlationId,
      event: 'weekly_planning_gateway.failed',
      model: 'gpt-4o-mini',
      latencyMs,
      safeErrorCategory: classification.safeError.code,
      processingStage: classification.processingStage,
      failureCode: classification.failureCode,
      ...(classification.diagnosticSubtype ? { diagnosticSubtype: classification.diagnosticSubtype } : {}),
      ...(upstreamStatus !== undefined ? { upstreamStatus } : {}),
    });

    throw classification.safeError;
  }
}

/**
 * Production Firebase Callable Function: proposeWeeklyPlanning
 */
export const proposeWeeklyPlanning = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
    secrets: [openAIApiKey],
  },
  async (request) => {
    return handleProposeWeeklyPlanning(request);
  }
);
