import { PedagogicalReviewProvider } from '../../application/ports/PedagogicalReviewProvider';
import { PedagogicalPlan } from '../../domain/planning/PedagogicalPlan';
import { ReviewOutcome } from '../../domain/planning/ValueObjects';
import { Result } from '../../shared/result/Result';

export class MockPedagogicalReviewProvider implements PedagogicalReviewProvider {
  async reviewConsistency(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>> {
    const outcome = ReviewOutcome.create({
      score: 100,
      findings: ['Intents align well with activities.'],
      recommendations: [],
      blockingIssues: [],
      warnings: [],
      generatedAt: new Date(),
      reviewProvider: 'Mock-Deterministic-Provider'
    });
    return Result.ok(outcome);
  }

  async reviewSafety(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>> {
    const outcome = ReviewOutcome.create({
      score: 100,
      findings: ['No unsafe materials detected.'],
      recommendations: [],
      blockingIssues: [],
      warnings: [],
      generatedAt: new Date(),
      reviewProvider: 'Mock-Deterministic-Provider'
    });
    return Result.ok(outcome);
  }

  async reviewNormativeCompliance(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>> {
    const outcome = ReviewOutcome.create({
      score: 100,
      findings: ['Compliant with current template and standards.'],
      recommendations: [],
      blockingIssues: [],
      warnings: [],
      generatedAt: new Date(),
      reviewProvider: 'Mock-Deterministic-Provider'
    });
    return Result.ok(outcome);
  }

  async reviewInclusion(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>> {
    const outcome = ReviewOutcome.create({
      score: 95,
      findings: ['Good general inclusion.'],
      recommendations: ['Consider adding more sensory options.'],
      blockingIssues: [],
      warnings: [],
      generatedAt: new Date(),
      reviewProvider: 'Mock-Deterministic-Provider'
    });
    return Result.ok(outcome);
  }

  async reviewLanguage(plan: PedagogicalPlan): Promise<Result<ReviewOutcome>> {
    const outcome = ReviewOutcome.create({
      score: 100,
      findings: ['Tone is professional and clear.'],
      recommendations: [],
      blockingIssues: [],
      warnings: [],
      generatedAt: new Date(),
      reviewProvider: 'Mock-Deterministic-Provider'
    });
    return Result.ok(outcome);
  }

  async generateSuggestions(plan: PedagogicalPlan): Promise<Result<string[]>> {
    return Result.ok(['You could add a closing reflection activity.']);
  }
}
