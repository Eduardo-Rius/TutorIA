import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import {
  CurricularRecommendation,
  CurricularRecommendationRequest,
} from '../../src/application/planning/CurricularRecommendationSource';
import {
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
} from '../../src/domain/planning/DirectCurricularCatalog';

/**
 * Maximum allowed payload size in bytes (10 KB).
 */
export const MAX_PAYLOAD_BYTES = 10240;

/**
 * Maximum allowed length for individual string fields.
 */
export const MAX_TEXT_FIELD_LENGTH = 500;

/**
 * Client -> Gateway request payload contract.
 */
export interface RecommendCurricularPDAGatewayRequest {
  readonly activityId: string;
  readonly activityTitle: string;
  readonly objective: string;
  readonly modality: 'DIRECT';
  readonly room: {
    readonly roomId: string;
    readonly name: string;
    readonly minAgeMonths: number;
    readonly maxAgeMonths: number;
  };
  readonly planningId?: string;
  readonly dayId?: string;
  readonly description?: string;
  readonly category?: string;
  readonly materials?: readonly string[];
  readonly durationMinutes?: number;
  readonly weeklyContext?: {
    readonly observations?: string;
    readonly identifiedNeeds?: string;
    readonly specialSituations?: string;
    readonly availableMaterials?: string;
  };
  // Explicitly disallow client-injected configuration/secrets/catalog
  readonly apiKey?: never;
  readonly model?: never;
  readonly baseUrl?: never;
  readonly systemPrompt?: never;
  readonly catalog?: never;
}

/**
 * Gateway -> Client success response contract.
 */
export interface RecommendCurricularPDAGatewayResponse {
  readonly recommendations: readonly {
    readonly pdaId: string;
    readonly rationale: string;
  }[];
  readonly catalogRevision: string;
}

/**
 * Context passed to the authorization seam.
 */
export interface CurricularAIAuthorizationContext {
  readonly uid: string;
  readonly tokenClaims?: Record<string, unknown> | undefined;
  readonly planningId?: string | undefined;
}

/**
 * Decision returned by the authorization seam.
 */
export interface CurricularAIAuthorizationResult {
  readonly authorized: boolean;
  readonly reason?: string | undefined;
}

/**
 * Authorization seam port.
 */
export type CurricularAIAuthorizer = (
  context: CurricularAIAuthorizationContext
) => Promise<CurricularAIAuthorizationResult>;

/**
 * Default production authorizer.
 * Invariant: Unresolved authorization defaults to DENY, never ALLOW.
 */
export const defaultProductionAuthorizer: CurricularAIAuthorizer = async () => {
  return {
    authorized: false,
    reason:
      'Production authorization seam is unresolved: Educator role and center authorization are not yet provisioned.',
  };
};

/**
 * Recommendation executor seam port.
 */
export type CurricularRecommendationExecutor = (
  request: CurricularRecommendationRequest
) => Promise<readonly CurricularRecommendation[]>;

/**
 * Default production recommendation executor.
 * Invariant: Never silently fall back to fake AI in production.
 */
export const defaultProductionExecutor: CurricularRecommendationExecutor = async () => {
  throw new HttpsError(
    'unavailable',
    'Curricular AI recommendation executor is not yet configured in production.'
  );
};

/**
 * Options for configuring the gateway handler.
 */
export interface RecommendCurricularPDAHandlerOptions {
  readonly authorizer?: CurricularAIAuthorizer;
  readonly executor?: CurricularRecommendationExecutor;
}

/**
 * Validates request data and enforces conservative schema & payload bounds.
 */
export function validateGatewayPayload(data: unknown): RecommendCurricularPDAGatewayRequest {
  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Request payload must be a non-null object.');
  }

  // 1. Enforce payload size limit (approx 10 KB)
  let rawString: string;
  try {
    rawString = JSON.stringify(data);
  } catch {
    throw new HttpsError('invalid-argument', 'Payload could not be serialized for validation.');
  }

  if (Buffer.byteLength(rawString, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new HttpsError('invalid-argument', `Payload size exceeds the ${MAX_PAYLOAD_BYTES} bytes limit.`);
  }

  const raw = data as Record<string, unknown>;

  // 2. Reject client-injected secrets, model configs, or catalog
  if ('apiKey' in raw || 'secret' in raw || 'token' in raw) {
    throw new HttpsError('invalid-argument', 'Provider credentials cannot be supplied in request payload.');
  }
  if ('model' in raw || 'baseUrl' in raw || 'systemPrompt' in raw) {
    throw new HttpsError('invalid-argument', 'AI model or prompt parameters cannot be supplied in request payload.');
  }
  if ('catalog' in raw || 'catalogEntries' in raw || 'pdaList' in raw) {
    throw new HttpsError('invalid-argument', 'Canonical curricular catalog cannot be supplied by client.');
  }

  // 3. Modality validation: Strictly DIRECT only
  if (!raw.modality || raw.modality !== 'DIRECT') {
    throw new HttpsError(
      'failed-precondition',
      `Curricular recommendations strictly support 'DIRECT' modality. Received: '${String(raw.modality)}'.`
    );
  }

  // 4. Required fields
  if (typeof raw.activityId !== 'string' || !raw.activityId.trim()) {
    throw new HttpsError('invalid-argument', 'Missing or empty required field: activityId.');
  }
  if (typeof raw.activityTitle !== 'string' || !raw.activityTitle.trim()) {
    throw new HttpsError('invalid-argument', 'Missing or empty required field: activityTitle.');
  }
  if (typeof raw.objective !== 'string' || !raw.objective.trim()) {
    throw new HttpsError('invalid-argument', 'Missing or empty required field: objective.');
  }

  // 5. Length limits on required text fields
  if (raw.activityTitle.trim().length > MAX_TEXT_FIELD_LENGTH) {
    throw new HttpsError('invalid-argument', `activityTitle exceeds maximum length of ${MAX_TEXT_FIELD_LENGTH} characters.`);
  }
  if (raw.objective.trim().length > MAX_TEXT_FIELD_LENGTH) {
    throw new HttpsError('invalid-argument', `objective exceeds maximum length of ${MAX_TEXT_FIELD_LENGTH} characters.`);
  }
  if (typeof raw.description === 'string' && raw.description.length > MAX_TEXT_FIELD_LENGTH) {
    throw new HttpsError('invalid-argument', `description exceeds maximum length of ${MAX_TEXT_FIELD_LENGTH} characters.`);
  }
  if (typeof raw.category === 'string' && raw.category.length > MAX_TEXT_FIELD_LENGTH) {
    throw new HttpsError('invalid-argument', `category exceeds maximum length of ${MAX_TEXT_FIELD_LENGTH} characters.`);
  }

  // 6. Room validation
  if (!raw.room || typeof raw.room !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing required room developmental context.');
  }
  const room = raw.room as Record<string, unknown>;
  if (typeof room.roomId !== 'string' || !room.roomId.trim()) {
    throw new HttpsError('invalid-argument', 'room.roomId must be a non-empty string.');
  }
  if (typeof room.name !== 'string' || !room.name.trim()) {
    throw new HttpsError('invalid-argument', 'room.name must be a non-empty string.');
  }
  if (typeof room.minAgeMonths !== 'number' || room.minAgeMonths < 0) {
    throw new HttpsError('invalid-argument', 'room.minAgeMonths must be a non-negative number.');
  }
  if (typeof room.maxAgeMonths !== 'number' || room.maxAgeMonths < (room.minAgeMonths as number)) {
    throw new HttpsError('invalid-argument', 'room.maxAgeMonths must be greater than or equal to minAgeMonths.');
  }

  // 7. Optional weeklyContext validation
  if (raw.weeklyContext !== undefined) {
    if (!raw.weeklyContext || typeof raw.weeklyContext !== 'object') {
      throw new HttpsError('invalid-argument', 'weeklyContext must be an object if provided.');
    }
    const wc = raw.weeklyContext as Record<string, unknown>;
    for (const [key, val] of Object.entries(wc)) {
      if (typeof val === 'string' && val.length > MAX_TEXT_FIELD_LENGTH) {
        throw new HttpsError('invalid-argument', `weeklyContext.${key} exceeds ${MAX_TEXT_FIELD_LENGTH} characters.`);
      }
    }
  }

  // 8. Optional duration validation
  if (raw.durationMinutes !== undefined) {
    if (typeof raw.durationMinutes !== 'number' || raw.durationMinutes <= 0 || raw.durationMinutes > 480) {
      throw new HttpsError('invalid-argument', 'durationMinutes must be a positive number up to 480 minutes.');
    }
  }

  // 9. Optional materials validation
  if (raw.materials !== undefined) {
    if (!Array.isArray(raw.materials)) {
      throw new HttpsError('invalid-argument', 'materials must be an array of strings.');
    }
    if (raw.materials.length > 50) {
      throw new HttpsError('invalid-argument', 'materials collection cannot exceed 50 items.');
    }
    for (const mat of raw.materials) {
      if (typeof mat !== 'string' || mat.length > 200) {
        throw new HttpsError('invalid-argument', 'Each material item must be a string of at most 200 characters.');
      }
    }
  }

  return raw as unknown as RecommendCurricularPDAGatewayRequest;
}

/**
 * Pure handler logic for recommendCurricularPDA.
 * Separates transport execution from dependency injection for isolated testing.
 */
export async function handleRecommendCurricularPDA(
  request: CallableRequest<unknown>,
  options: RecommendCurricularPDAHandlerOptions = {}
): Promise<RecommendCurricularPDAGatewayResponse> {
  const authorizer = options.authorizer ?? defaultProductionAuthorizer;
  const executor = options.executor ?? defaultProductionExecutor;

  // 1. Authenticate caller: Reject unauthenticated callers
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to request curricular recommendations.');
  }

  const authenticatedUid = request.auth.uid;
  const tokenClaims = request.auth.token as Record<string, unknown> | undefined;

  // 2. Validate request schema & bounds
  const validatedPayload = validateGatewayPayload(request.data);

  // 3. Authorize caller via explicit authorization seam
  const authDecision = await authorizer({
    uid: authenticatedUid,
    tokenClaims,
    planningId: validatedPayload.planningId,
  });

  if (!authDecision.authorized) {
    throw new HttpsError(
      'permission-denied',
      authDecision.reason || 'User is not authorized to request curricular recommendations.'
    );
  }

  // 4. Map to application recommendation request (Deriving canonical revision server-side)
  const appRequest: CurricularRecommendationRequest = {
    activityId: validatedPayload.activityId,
    activityTitle: validatedPayload.activityTitle,
    objective: validatedPayload.objective,
    modality: 'DIRECT',
    catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    description: validatedPayload.description,
    category: validatedPayload.category,
    materials: validatedPayload.materials,
    durationMinutes: validatedPayload.durationMinutes,
    room: validatedPayload.room,
    weeklyContext: validatedPayload.weeklyContext
      ? {
          observations: validatedPayload.weeklyContext.observations || '',
          identifiedNeeds: validatedPayload.weeklyContext.identifiedNeeds || '',
          specialSituations: validatedPayload.weeklyContext.specialSituations || '',
          availableMaterials: validatedPayload.weeklyContext.availableMaterials || '',
        }
      : undefined,
  };

  // 5. Execute recommendation through injected executor seam
  const recommendations = await executor(appRequest);

  // 6. Return minimal canonical safe response
  return {
    recommendations: recommendations.map((rec) => ({
      pdaId: rec.reference.pdaId,
      rationale: rec.rationale,
    })),
    catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  };
}

/**
 * Production Firebase Callable Function: recommendCurricularPDA
 */
export const recommendCurricularPDA = onCall(
  {
    enforceAppCheck: false, // Can be set to true when App Check is provisioned
    maxInstances: 10,
  },
  async (request) => {
    return handleRecommendCurricularPDA(request);
  }
);
