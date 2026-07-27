import { PedagogicalPlan } from '../../domain/planning/PedagogicalPlan';
import { ReviewOutcome } from '../../domain/planning/ValueObjects';
import { Result } from '../../shared/result/Result';

export interface PedagogicalReviewProvider {
  reviewConsistency(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>>;
  reviewSafety(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>>;
  reviewNormativeCompliance(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>>;
  reviewInclusion(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>>;
  reviewLanguage(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>>;
  generateSuggestions(plan: PedagogicalPlan): Promise<Result<string[]>>;
}
