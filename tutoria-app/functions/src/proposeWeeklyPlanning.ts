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
  const validatedPayload = validateProposeWeeklyPlanningGatewayPayload(request.data);

  // 3. Authorize caller via explicit authorization seam
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
  let upstreamStatus: number | undefined;

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

  // 6. Emit gateway started event
  logger.write({
    severity: 'INFO',
    correlationId,
    event: 'weekly_planning_gateway.started',
    model: 'gpt-4o-mini',
  });

  const startMs = performance.now();
  let proposal: WeeklyPlanningProposalResponse;

  try {
    proposal = await executor(appRequest);
  } catch (rawErr: unknown) {
    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    const safeError = mapToSafeWeeklyPlanningError(rawErr);

    logger.write({
      severity: 'ERROR',
      correlationId,
      event: 'weekly_planning_gateway.failed',
      model: 'gpt-4o-mini',
      latencyMs,
      safeErrorCategory: safeError.code,
      ...(upstreamStatus !== undefined ? { upstreamStatus } : {}),
    });

    throw safeError;
  }

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
