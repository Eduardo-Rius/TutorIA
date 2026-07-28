export interface InferenceResult {
  readonly rawOutput: string;
  readonly executionTimeMs: number;
  readonly providerId: string;
}
