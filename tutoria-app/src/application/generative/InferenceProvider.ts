import { InferenceRequest, InferenceResult } from '../../domain/generative';

export interface InferenceProvider {
  /**
   * Resolver una solicitud de inferencia.
   */
  resolveInference(request: InferenceRequest): Promise<InferenceResult>;
}
