import type {
  SanitizedEvaluationAIPayload,
  AssistDailyEvaluationResponse,
} from './GovernedEvaluationAIContract';

/**
 * Abstract provider port for Governed Evaluation AI.
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Decoupled from transport, vendor SDKs, HTTP, and network dependencies.
 * 2. Receives ONLY the sanitized provider payload permitted by H1R13.3C.
 * 3. Returns an untrusted candidate response that MUST be validated before delivery.
 * 4. Strictly stateless and network-free at this boundary.
 */
export interface EvaluationAIProvider {
  assist(payload: SanitizedEvaluationAIPayload): Promise<AssistDailyEvaluationResponse>;
}
