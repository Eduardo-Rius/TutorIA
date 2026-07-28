import { ConfidenceScore } from './ConfidenceScore';
import { EvidenceSourceType } from './EvidenceSourceType';

export interface HypothesisEvidence {
  readonly sourceType: EvidenceSourceType;
  readonly sourceId: string;
  readonly relevance: number;
  readonly confidence: ConfidenceScore;
}
