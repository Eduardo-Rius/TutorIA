import { HttpsError } from 'firebase-functions/v2/https';
import {
  CurricularRecommendation,
  CurricularRecommendationRequest,
  InvalidCurricularRecommendationError,
} from '../../src/application/planning/CurricularRecommendationSource';
import {
  CurricularAIProvider,
  CurricularAIProviderBoundary,
} from '../../src/application/planning/CurricularAIProviderBoundary';
import {
  OpenAICurricularAIProvider,
  OpenAICurricularAIProviderConfig,
  CurricularAIProviderConfigurationError,
  CurricularAIProviderNetworkError,
  CurricularAIProviderMalformedResponseError,
} from '../../src/infrastructure/ai/OpenAICurricularAIProvider';
import { CurricularRecommendationExecutor } from './recommendCurricularPDA';

/**
 * Configuration options for the OpenAI curricular recommendation executor.
 */
export interface OpenAICurricularRecommendationExecutorOptions {
  readonly provider?: CurricularAIProvider;
  readonly boundary?: CurricularAIProviderBoundary;
  readonly providerConfig?: OpenAICurricularAIProviderConfig;
}

/**
 * Server-side executor adapter connecting the Firebase Callable gateway
 * to the canonical CurricularAIProviderBoundary wrapping OpenAICurricularAIProvider.
 *
 * Responsibilities:
 * 1. Delegates recommendation execution to CurricularAIProviderBoundary.
 * 2. Guarantees OpenAI output NEVER flows directly to callable response without boundary validation.
 * 3. Maps provider/boundary infrastructure errors into safe, typed HttpsErrors with generic public messages.
 * 4. Ensures no secrets, tokens, raw upstream errors, or model internals leak in error responses.
 */
export class OpenAICurricularRecommendationExecutor {
  private readonly boundary: CurricularAIProviderBoundary;

  constructor(options: OpenAICurricularRecommendationExecutorOptions = {}) {
    const provider =
      options.provider ?? new OpenAICurricularAIProvider(options.providerConfig);
    this.boundary =
      options.boundary ?? new CurricularAIProviderBoundary(provider);
  }

  /**
   * Executes recommendation request through CurricularAIProviderBoundary.
   */
  public async execute(
    request: CurricularRecommendationRequest
  ): Promise<readonly CurricularRecommendation[]> {
    try {
      return await this.boundary.recommend(request);
    } catch (err: unknown) {
      if (err instanceof HttpsError) {
        throw err;
      }
      if (err instanceof CurricularAIProviderConfigurationError) {
        throw new HttpsError(
          'unavailable',
          'Curricular AI recommendation service is unavailable: provider configuration is missing or incomplete.'
        );
      }
      if (err instanceof CurricularAIProviderNetworkError) {
        throw new HttpsError(
          'unavailable',
          'Curricular AI recommendation service is temporarily unavailable due to an upstream network failure.'
        );
      }
      if (err instanceof CurricularAIProviderMalformedResponseError) {
        throw new HttpsError(
          'internal',
          'Curricular AI recommendation service received an invalid response from upstream provider.'
        );
      }
      if (err instanceof InvalidCurricularRecommendationError) {
        throw new HttpsError(
          'internal',
          'Curricular AI recommendation failed canonical boundary validation.'
        );
      }
      throw new HttpsError(
        'internal',
        'Curricular AI recommendation executor encountered an unexpected error.'
      );
    }
  }
}

/**
 * Factory function creating a CurricularRecommendationExecutor function instance.
 */
export function createOpenAICurricularRecommendationExecutor(
  options: OpenAICurricularRecommendationExecutorOptions = {}
): CurricularRecommendationExecutor {
  const executor = new OpenAICurricularRecommendationExecutor(options);
  return (request: CurricularRecommendationRequest) => executor.execute(request);
}
