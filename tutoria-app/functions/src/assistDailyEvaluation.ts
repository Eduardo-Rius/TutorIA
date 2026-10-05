import { randomUUID } from 'node:crypto';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { write as functionsWrite } from 'firebase-functions/logger';
import { openAIApiKey } from './recommendCurricularPDA';
import {
  createFirestoreAuthorizationContextReader,
  type PersistedAuthorizationContextDoc,
  type AuthorizationContextReader,
} from './FirestoreCurricularAIAuthorizer';
import { FirestoreWeeklyPlanningAdminRepository } from './FirestoreWeeklyPlanningAdminRepository';
import { OpenAIEvaluationAIProvider } from '../../src/infrastructure/ai/OpenAIEvaluationAIProvider';
import {
  GovernedEvaluationAIGateway,
  GovernedEvaluationAIGatewayError,
  type GovernedEvaluationAIGatewayErrorCode,
  type TrustedEvaluationExecutionContext,
} from '../../src/application/planning/GovernedEvaluationAIGateway';
import type {
  AssistDailyEvaluationGatewayRequest,
  AssistDailyEvaluationResponse,
} from '../../src/application/planning/GovernedEvaluationAIContract';
import type { WeeklyPlanningRepository } from '../../src/application/ports/WeeklyPlanningRepository';
import type { EvaluationAIProvider } from '../../src/application/planning/EvaluationAIProvider';
import type { Clock } from '../../src/application/planning/GovernedEvaluationAIGateway';
import type { Room } from '../../src/domain/planning/RoomCatalog';

// ============================================================================
// FORBIDDEN KEYS FIREWALL
// ============================================================================

const FORBIDDEN_GATEWAY_KEYS = Object.freeze([
  'uid',
  'authUid',
  'role',
  'institutionalRole',
  'teacherId',
  'daycareId',
  'authorizationContext',
  'currentDate',
  'timeZone',
  'timezone',
  'status',
  'approvedBy',
  'approvedAt',
  'submittedBy',
  'submittedAt',
  'closedBy',
  'closedAt',
  'evaluation',
  'evaluationStatus',
  'apiKey',
  'secret',
  'token',
  'model',
  'baseUrl',
  'systemPrompt',
  'activities',
  'room',
  'objectives',
  'pda',
]);

function scanForForbiddenKeys(obj: unknown, path = ''): void {
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

// ============================================================================
// SAFE TELEMETRY TYPES & INTERFACES
// ============================================================================

export interface AssistDailyEvaluationLogEntry {
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  readonly correlationId: string;
  readonly event: string;
  readonly model?: string;
  readonly latencyMs: number;
  readonly promptTokens?: number | null;
  readonly completionTokens?: number | null;
  readonly totalTokens?: number | null;
  readonly safeErrorCode?: string;
}

export interface AssistDailyEvaluationLogger {
  write: (entry: AssistDailyEvaluationLogEntry) => void;
}

export const defaultFunctionsLogger: AssistDailyEvaluationLogger = {
  write: (entry: AssistDailyEvaluationLogEntry) => {
    functionsWrite(entry);
  },
};

// ============================================================================
// HANDLER OPTIONS (FOR ZERO-CLOUD DETERMINISTIC UNIT TESTING)
// ============================================================================

export interface AssistDailyEvaluationHandlerOptions {
  readonly authorizer?: AuthorizationContextReader | undefined;
  readonly repository?: WeeklyPlanningRepository | undefined;
  readonly provider?: EvaluationAIProvider | undefined;
  readonly clock?: Clock | undefined;
  readonly roomResolver?: ((roomId: string) => Room | undefined) | undefined;
  readonly logger?: AssistDailyEvaluationLogger | undefined;
  readonly correlationIdProvider?: (() => string) | undefined;
}

// ============================================================================
// ERROR TRANSLATION (SAFE BOUNDED HTTPS ERRORS)
// ============================================================================

export function mapGatewayErrorToHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }

  if (error instanceof GovernedEvaluationAIGatewayError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return new HttpsError(
          'permission-denied',
          'Caller is not authorized to draft evaluations for this planning.'
        );
      case 'PLANNING_NOT_FOUND':
        return new HttpsError(
          'not-found',
          'Weekly planning record not found.'
        );
      case 'INVALID_PLANNING_STATUS':
        return new HttpsError(
          'failed-precondition',
          'Weekly planning is not in an approved execution state.'
        );
      case 'INVALID_EVALUATION_STATUS':
        return new HttpsError(
          'failed-precondition',
          'Daily evaluation is not in an eligible drafting state.'
        );
      case 'FUTURE_DAY':
        return new HttpsError(
          'failed-precondition',
          'Evaluation drafting is not available for future operational days.'
        );
      case 'INVALID_DAY':
        return new HttpsError(
          'invalid-argument',
          'Invalid planning day requested.'
        );
      case 'SENSITIVE_CONTENT_DETECTED':
        return new HttpsError(
          'invalid-argument',
          'Request contains sensitive or identifying information.'
        );
      case 'INVALID_REQUEST':
        return new HttpsError(
          'invalid-argument',
          'Invalid evaluation assistance request.'
        );
      case 'INVALID_PROVIDER_PAYLOAD':
      case 'INVALID_PROVIDER_RESPONSE':
      case 'PROHIBITED_EVALUATION_LANGUAGE':
        return new HttpsError(
          'internal',
          'AI assistance response failed governance validation.'
        );
      case 'PROVIDER_FAILURE':
        return new HttpsError(
          'unavailable',
          'Evaluation AI assistance provider is currently unavailable.'
        );
      default:
        return new HttpsError(
          'internal',
          'An internal evaluation governance error occurred.'
        );
    }
  }

  return new HttpsError(
    'internal',
    'An unexpected error occurred during evaluation assistance.'
  );
}

/**
 * Resolves the server-side OpenAI API key at execution time.
 * In Cloud Functions v2 runtime with SecretParam declared, attempts openAIApiKey.value().
 * In local/emulator or process-injected test environments, falls back safely to process.env.OPENAI_API_KEY.
 * Guaranteed never to read from client request payload.
 */
export function resolveServerOpenAIApiKey(): string | undefined {
  try {
    const val = openAIApiKey.value();
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  } catch {
    // SecretParam.value() throws outside Cloud Functions v2 runtime
  }

  try {
    if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
      const val = process.env.OPENAI_API_KEY;
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim();
      }
    }
  } catch {
    // Ignore
  }

  return undefined;
}

// ============================================================================
// CORE CALLABLE HANDLER
// ============================================================================

export async function handleAssistDailyEvaluation(
  request: CallableRequest<unknown>,
  options: AssistDailyEvaluationHandlerOptions = {}
): Promise<AssistDailyEvaluationResponse> {
  const correlationId = options.correlationIdProvider
    ? options.correlationIdProvider()
    : randomUUID();
  const startMs = performance.now();
  const logger = options.logger ?? defaultFunctionsLogger;

  // 1. Authenticated caller required
  if (!request.auth || !request.auth.uid) {
    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    logger.write({
      severity: 'ERROR',
      correlationId,
      event: 'assist_daily_evaluation.unauthenticated',
      latencyMs,
      safeErrorCode: 'unauthenticated',
    });
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to invoke assistDailyEvaluation.'
    );
  }

  const callerUid = request.auth.uid.trim();
  if (callerUid.length === 0) {
    throw new HttpsError(
      'unauthenticated',
      'Authenticated UID is empty or unresolved.'
    );
  }

  // 2. Validate request data presence and structure
  if (!request.data || typeof request.data !== 'object') {
    throw new HttpsError(
      'invalid-argument',
      'Request data must be a valid JSON object.'
    );
  }

  // 3. Scan for forbidden keys and authority injection attempts
  scanForForbiddenKeys(request.data);

  // 4. Resolve server-side authorization context (/authorizationContexts/{uid})
  const authorizer = options.authorizer ?? createFirestoreAuthorizationContextReader();
  let authDoc: PersistedAuthorizationContextDoc | null | undefined;
  try {
    authDoc = await authorizer(callerUid);
  } catch {
    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    logger.write({
      severity: 'ERROR',
      correlationId,
      event: 'assist_daily_evaluation.auth_lookup_failed',
      latencyMs,
      safeErrorCode: 'internal',
    });
    throw new HttpsError(
      'internal',
      'Failed to resolve server authorization context.'
    );
  }

  if (!authDoc) {
    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    logger.write({
      severity: 'ERROR',
      correlationId,
      event: 'assist_daily_evaluation.auth_context_missing',
      latencyMs,
      safeErrorCode: 'permission-denied',
    });
    throw new HttpsError(
      'permission-denied',
      'Server authorization context not found for authenticated caller.'
    );
  }

  if (authDoc.active !== true) {
    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    logger.write({
      severity: 'ERROR',
      correlationId,
      event: 'assist_daily_evaluation.auth_context_inactive',
      latencyMs,
      safeErrorCode: 'permission-denied',
    });
    throw new HttpsError(
      'permission-denied',
      'Caller authorization context is inactive.'
    );
  }

  // 5. Build trusted execution context for GovernedEvaluationAIGateway
  const trustedContext: TrustedEvaluationExecutionContext = {
    authUid: callerUid,
    institutionalRole: authDoc.institutionalRole ?? '',
    personId: authDoc.personId,
    assignmentId: authDoc.assignmentId,
    authorizedDaycareIds: authDoc.authorizedDaycareIds ?? [],
    roomIds: authDoc.roomIds ?? [],
    active: authDoc.active,
  };

  // 6. Setup request-scoped repository, provider, and gateway
  const repository = options.repository ?? new FirestoreWeeklyPlanningAdminRepository();
  const provider =
    options.provider ??
    new OpenAIEvaluationAIProvider({
      apiKey: resolveServerOpenAIApiKey(),
    });

  const gateway = new GovernedEvaluationAIGateway({
    repository,
    provider,
    clock: options.clock,
    roomResolver: options.roomResolver,
  });

  // 7. Invoke GovernedEvaluationAIGateway
  try {
    const result = await gateway.assistDailyEvaluation(
      request.data as AssistDailyEvaluationGatewayRequest,
      trustedContext
    );

    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
    logger.write({
      severity: 'INFO',
      correlationId,
      event: 'assist_daily_evaluation.completed',
      model: 'gpt-4o-mini',
      latencyMs,
    });

    // 8. Return transient suggestedEvaluation only
    return {
      suggestedEvaluation: result.suggestedEvaluation,
    };
  } catch (rawError: unknown) {
    const safeError = mapGatewayErrorToHttpsError(rawError);
    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));

    const errorCode =
      rawError instanceof GovernedEvaluationAIGatewayError
        ? rawError.code
        : safeError.code;

    logger.write({
      severity: 'ERROR',
      correlationId,
      event: 'assist_daily_evaluation.failed',
      model: 'gpt-4o-mini',
      latencyMs,
      safeErrorCode: errorCode,
    });

    throw safeError;
  }
}

// ============================================================================
// PRODUCTION FIREBASE CALLABLE EXPORT
// ============================================================================

export const assistDailyEvaluation = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
    secrets: [openAIApiKey],
  },
  async (request) => {
    return handleAssistDailyEvaluation(request);
  }
);
