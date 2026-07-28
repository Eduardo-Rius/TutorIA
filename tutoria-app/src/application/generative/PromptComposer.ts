import { InferenceRequest, GenerativeCapability, InferenceProfile } from '../../domain/generative';
import { ContextSnapshot } from '../../domain/context';

export class PromptComposer {
  /**
   * Application Service that orchestrates the context and capability 
   * into a unified InferenceRequest.
   */
  public compose(
    capability: GenerativeCapability, 
    context: ContextSnapshot, 
    profile: InferenceProfile,
    expectedOutput: string
  ): InferenceRequest {
    
    // In a real implementation, this builds a structural payload string
    const contextPayload = JSON.stringify({
      fragments: context.fragments,
      score: context.score
    });

    return {
      capability,
      profile,
      expectedOutput,
      constraints: capability.getConstraints(),
      contextPayload
    };
  }
}
