import type { SanitizedEvaluationActivityContext } from '../../../src/application/planning/GovernedEvaluationAIContract';

declare module '../../../src/application/planning/GovernedEvaluationAIContract' {
  /**
   * Type bridge strictly for locked EvaluationAIContextAdapter.ts.
   *
   * Derivation:
   * Reuses sovereign SanitizedEvaluationActivityContext directly, adapting solely the pdaReference
   * property to accommodate the string representation produced by the locked adapter.
   *
   * Zero duplication of sovereign fields:
   * category, objective, description, durationMinutes, prospectiveObservationTarget
   * are all strictly inherited from SanitizedEvaluationActivityContext.
   */
  export type SanitizedEvaluationPlannedActivity = Omit<
    SanitizedEvaluationActivityContext,
    'pdaReference'
  > & {
    readonly pdaReference?: any;
  };
}
