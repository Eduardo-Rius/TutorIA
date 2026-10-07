import type { FirebaseApp } from 'firebase/app';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import {
  type AssistDailyEvaluationGatewayRequest,
  type AssistDailyEvaluationResponse,
  validateAssistDailyEvaluationRequest,
  validateAssistDailyEvaluationResponse,
  GovernedEvaluationAIError,
} from '../../application/planning/GovernedEvaluationAIContract';

/**
 * Custom error thrown when the Firebase transport or callable invocation fails.
 */
export class FirebaseEvaluationRecommendationTransportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'FirebaseEvaluationRecommendationTransportError';
  }
}

/**
 * Callable invoker function signature for transport injection (enabling zero-network unit tests).
 */
export type FirebaseCallableInvoker<
  TReq = AssistDailyEvaluationGatewayRequest,
  TRes = unknown
> = (payload: TReq) => Promise<{ data: TRes }>;

/**
 * Factory signature for creating a callable function (enabling factory injection for unit tests).
 */
export type FirebaseCallableFactory = (
  functions: Functions,
  name: string
) => (payload: AssistDailyEvaluationGatewayRequest) => Promise<{ data: unknown }>;

/**
 * Configuration options for FirebaseEvaluationRecommendationSource.
 */
export interface FirebaseEvaluationRecommendationSourceConfig {
  readonly app?: FirebaseApp;
  readonly functions?: Functions;
  readonly region?: string;
  readonly callableFn?: FirebaseCallableInvoker;
  readonly callableFactory?: FirebaseCallableFactory;
}

/**
 * Public interface for Evaluation AI recommendation source.
 */
export interface EvaluationRecommendationSource {
  assistDailyEvaluation(
    request: AssistDailyEvaluationGatewayRequest
  ): Promise<AssistDailyEvaluationResponse>;
}

/**
 * Client infrastructure adapter connecting the TutorIA presentation layer to the
 * remote Firebase Callable function `assistDailyEvaluation`.
 *
 * Implements EvaluationRecommendationSource.
 *
 * CRITICAL SECURITY & GOVERNANCE INVARIANTS:
 * 1. ZERO OPENAI SECRETS: The client adapter never handles OpenAI API keys or endpoints.
 * 2. UNTRUSTED DATA BOUNDARY: All responses from the remote gateway are treated as untrusted
 *    external data and rigorously validated against GovernedEvaluationAIContract.
 * 3. NO AUTO-PERSISTENCE: Recommendations remain transient and are never saved or applied automatically.
 * 4. STRICT DATA MINIMIZATION: Only planningId, dayOfWeek, and humanEvidence are forwarded.
 *    No auth tokens, UIDs, teacher IDs, daycare IDs, planning activities, or models are ever passed.
 */
export class FirebaseEvaluationRecommendationSource implements EvaluationRecommendationSource {
  private readonly config: FirebaseEvaluationRecommendationSourceConfig;

  constructor(config: FirebaseEvaluationRecommendationSourceConfig = {}) {
    this.config = config;
  }

  public async assistDailyEvaluation(
    request: AssistDailyEvaluationGatewayRequest
  ): Promise<AssistDailyEvaluationResponse> {
    // 1. Validate application request contract
    validateAssistDailyEvaluationRequest(request);

    // 2. Map request strictly to wire payload (ensuring data minimization and zero leaked context)
    const payload: AssistDailyEvaluationGatewayRequest = {
      planningId: request.planningId,
      dayOfWeek: request.dayOfWeek,
      humanEvidence: {
        activitiesDevelopment: request.humanEvidence.activitiesDevelopment,
        groupResponse: request.humanEvidence.groupResponse,
        ...(request.humanEvidence.adaptations !== undefined
          ? { adaptations: request.humanEvidence.adaptations }
          : {}),
        ...(request.humanEvidence.continuity !== undefined
          ? { continuity: request.humanEvidence.continuity }
          : {}),
      },
    };

    // 3. Invoke Firebase Callable through injected transport or live Functions SDK
    let rawResult: unknown;
    try {
      const response = await this.invokeCallable(payload);
      rawResult =
        response && typeof response === 'object' && 'data' in response
          ? (response as { data: unknown }).data
          : response;
    } catch (err: unknown) {
      if (err instanceof GovernedEvaluationAIError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new FirebaseEvaluationRecommendationTransportError(
        `Firebase callable execution failed: ${message}`,
        err
      );
    }

    // 4. Validate untrusted response against locked canonical contract
    validateAssistDailyEvaluationResponse(rawResult);

    return rawResult;
  }

  private async invokeCallable(
    payload: AssistDailyEvaluationGatewayRequest
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
      ? this.config.callableFactory(functionsInstance, 'assistDailyEvaluation')
      : httpsCallable<AssistDailyEvaluationGatewayRequest, AssistDailyEvaluationResponse>(
          functionsInstance,
          'assistDailyEvaluation'
        );

    return callable(payload);
  }

  private async resolveDefaultApp(): Promise<FirebaseApp> {
    const { app } = await import('../firebase/firebaseConfig');
    return app;
  }
}
