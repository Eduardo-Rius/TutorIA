import { GenerativeCapability } from './GenerativeCapability';
import { ConfidenceScore } from './ConfidenceScore';
import { HypothesisEvidence } from './HypothesisEvidence';
import { HypothesisMetadata } from './HypothesisMetadata';

export class GenerativeHypothesis {
  constructor(
    public readonly id: string,
    public readonly capability: GenerativeCapability,
    public readonly createdAt: Date,
    public readonly hypothesis: string,
    public readonly confidence: ConfidenceScore,
    public readonly limitations: readonly string[],
    public readonly assumptions: readonly string[],
    public readonly alternatives: readonly string[],
    public readonly citations: readonly HypothesisEvidence[],
    public readonly warnings: readonly string[],
    public readonly metadata: HypothesisMetadata
  ) {
    Object.freeze(this.limitations);
    Object.freeze(this.assumptions);
    Object.freeze(this.alternatives);
    Object.freeze(this.citations);
    Object.freeze(this.warnings);
  }
}
