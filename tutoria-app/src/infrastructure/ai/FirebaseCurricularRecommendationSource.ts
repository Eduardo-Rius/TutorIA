import type { FirebaseApp } from 'firebase/app';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import {
  CurricularRecommendation,
  CurricularRecommendationRequest,
  CurricularRecommendationSource,
  InvalidCurricularRecommendationError,
  validateCurricularRecommendationRequest,
} from '../../application/planning/CurricularRecommendationSource';
import { validateUntrustedAIResponse } from '../../application/planning/CurricularAIProviderBoundary';
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from '../../domain/planning/DirectCurricularCatalog';

/**
 * Custom error thrown when the Firebase transport or callable invocation fails.
 * Explicitly separates network/transport failures from semantic curricular validation errors.
 */
export class FirebaseCurricularRecommendationTransportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'FirebaseCurricularRecommendationTransportError';
  }
}

/**
 * Wire request contract sent to the Firebase Callable function `recommendCurricularPDA`.
 * Strictly mirrors RecommendCurricularPDAGatewayRequest from the server gateway.
 */
export interface FirebaseCurricularPDAGatewayRequest {
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
}

/**
 * Wire response contract received from the Firebase Callable function `recommendCurricularPDA`.
 */
export interface FirebaseCurricularPDAGatewayResponse {
  readonly recommendations: readonly {
    readonly pdaId: string;
    readonly rationale: string;
  }[];
  readonly catalogRevision: string;
}

/**
 * Callable invoker function signature for transport injection (enabling zero-network unit tests).
 */
export type FirebaseCallableInvoker<TReq = FirebaseCurricularPDAGatewayRequest, TRes = unknown> = (
  payload: TReq
) => Promise<{ data: TRes }>;

/**
 * Factory signature for creating a callable function (enabling factory injection for unit tests).
 */
export type FirebaseCallableFactory = (
  functions: Functions,
  name: string
) => (payload: FirebaseCurricularPDAGatewayRequest) => Promise<{ data: unknown }>;

/**
 * Configuration options for FirebaseCurricularRecommendationSource.
 */
export interface FirebaseCurricularRecommendationSourceConfig {
  readonly app?: FirebaseApp;
  readonly functions?: Functions;
  readonly region?: string;
  readonly callableFn?: FirebaseCallableInvoker;
  readonly callableFactory?: FirebaseCallableFactory;
  readonly expectedRevision?: string;
}

/**
 * Client infrastructure adapter connecting the TutorIA presentation layer to the
 * remote Firebase Callable function `recommendCurricularPDA`.
 *
 * Implements CurricularRecommendationSource to integrate into CurricularRecommendationService.
 *
 * CRITICAL SECURITY & GOVERNANCE INVARIANTS:
 * 1. ZERO OPENAI SECRETS: The client adapter never handles OpenAI API keys or endpoints.
 * 2. UNTRUSTED DATA BOUNDARY: All responses from the remote gateway are treated as untrusted
 *    external data and rigorously validated against the canonical catalog.
 * 3. NO AUTO-PERSISTENCE: Recommendations remain transient and are never saved or applied automatically.
 * 4. NO FABRICATION: A remote transport or callable failure will never silently fall back
 *    to deterministic or simulated AI recommendations.
 */
export class FirebaseCurricularRecommendationSource implements CurricularRecommendationSource {
  private readonly config: FirebaseCurricularRecommendationSourceConfig;
  private readonly expectedRevision: string;

  constructor(config: FirebaseCurricularRecommendationSourceConfig = {}) {
    this.config = config;
    this.expectedRevision = config.expectedRevision || TUTORIA_DIRECT_PDA_CATALOG_REVISION;
  }

  public async recommend(
    request: CurricularRecommendationRequest
  ): Promise<readonly CurricularRecommendation[]> {
    // 1. Validate application request contract
    validateCurricularRecommendationRequest(request);

    // 2. Validate required room context for remote gateway
    if (!request.room || typeof request.room !== 'object' || !request.room.roomId || !request.room.roomId.trim()) {
      throw new InvalidCurricularRecommendationError(
        'Recommendation request missing required room context for remote gateway.'
      );
    }

    // 3. Map application request strictly to server gateway payload (ensuring data minimization)
    const payload: FirebaseCurricularPDAGatewayRequest = {
      activityId: request.activityId,
      activityTitle: request.activityTitle,
      objective: request.objective?.trim() || request.activityTitle.trim(),
      modality: 'DIRECT',
      room: {
        roomId: request.room.roomId,
        name: request.room.name,
        minAgeMonths: request.room.minAgeMonths,
        maxAgeMonths: request.room.maxAgeMonths,
      },
      description: request.description,
      category: request.category,
      materials: request.materials ? [...request.materials] : undefined,
      durationMinutes: request.durationMinutes,
      weeklyContext: request.weeklyContext
        ? {
            observations: request.weeklyContext.observations || '',
            identifiedNeeds: request.weeklyContext.identifiedNeeds || '',
            specialSituations: request.weeklyContext.specialSituations || '',
            availableMaterials: request.weeklyContext.availableMaterials || '',
          }
        : undefined,
    };

    // 4. Invoke Firebase Callable through injected transport or live Functions SDK
    let rawResult: unknown;
    try {
      const response = await this.invokeCallable(payload);
      rawResult = response && typeof response === 'object' && 'data' in response ? response.data : response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new FirebaseCurricularRecommendationTransportError(
        `Firebase callable execution failed: ${message}`,
        err
      );
    }

    // 5. Treat remote response as UNTRUSTED and enforce revision validation
    if (rawResult !== null && typeof rawResult === 'object' && 'catalogRevision' in rawResult) {
      const remoteRevision = (rawResult as Record<string, unknown>).catalogRevision;
      if (remoteRevision !== this.expectedRevision) {
        throw new InvalidCurricularRecommendationError(
          `Invalid catalog revision '${String(remoteRevision)}'. Expected '${this.expectedRevision}'.`
        );
      }
    }

    // 6. Validate untrusted candidates against canonical DIRECT catalog
    return validateUntrustedAIResponse(rawResult, this.expectedRevision);
  }

  private async invokeCallable(
    payload: FirebaseCurricularPDAGatewayRequest
  ): Promise<{ data: unknown }> {
    if (this.config.callableFn) {
      return this.config.callableFn(payload);
    }

    let functionsInstance = this.config.functions;
    if (!functionsInstance) {
      const appInstance = this.config.app ?? (await this.resolveDefaultApp());
      functionsInstance = getFunctions(appInstance, this.config.region);
    }

    const callable = this.config.callableFactory
      ? this.config.callableFactory(functionsInstance, 'recommendCurricularPDA')
      : httpsCallable<FirebaseCurricularPDAGatewayRequest, unknown>(
          functionsInstance,
          'recommendCurricularPDA'
        );

    return callable(payload);
  }

  private async resolveDefaultApp(): Promise<FirebaseApp> {
    const { app } = await import('../firebase/firebaseConfig');
    return app;
  }
}
