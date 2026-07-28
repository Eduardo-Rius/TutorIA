import { GenerativeCapability } from './GenerativeCapability';
import { InferenceProfile } from './InferenceProfile';
import { GenerativeConstraint } from './GenerativeConstraint';

export interface InferenceRequest {
  readonly capability: GenerativeCapability;
  readonly profile: InferenceProfile;
  readonly expectedOutput: string;
  readonly constraints: readonly GenerativeConstraint[];
  readonly contextPayload: string; // The composed string representation of ContextSnapshot + Policies
}
