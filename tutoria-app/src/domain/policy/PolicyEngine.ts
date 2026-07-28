import { SystemClock } from '../../shared/kernel/Clock';
import { PolicyContext } from './PolicyContext';
import { PolicyRegistry } from './PolicyRegistry';
import { PolicyReport } from './PolicyReport';
import { PolicySeverity } from './PolicySeverity';

export class PolicyEngine<TContext extends PolicyContext> {
  constructor(private readonly registry: PolicyRegistry<TContext>) {}

  public evaluate(context: TContext): PolicyReport {
    const startTime = new SystemClock().now().getTime();
    const policies = this.registry.getPolicies();
    
    let passedPolicies = 0;
    let failedPolicies = 0;
    const violations = [];
    const warnings = [];
    const blockingIssues = [];

    for (const policy of policies) {
      const result = policy.evaluate(context);
      
      if (result.passed) {
        passedPolicies++;
      } else {
        failedPolicies++;
      }
      
      violations.push(...result.violations);
      warnings.push(...result.warnings);
      
      for (const v of result.violations) {
        if (v.severity === PolicySeverity.BLOCKING) {
          blockingIssues.push(v);
        }
      }
    }

    const executionTime = new SystemClock().now().getTime() - startTime;
    const isPassed = blockingIssues.length === 0 && violations.length === 0;
    const evaluatedPolicies = policies.length;
    
    // Simple score calculation: 100 if passed, else subtract based on failures
    let score = 100;
    if (evaluatedPolicies > 0) {
      score = Math.max(0, 100 - ((failedPolicies / evaluatedPolicies) * 100));
    }

    return {
      passed: isPassed,
      score,
      violations,
      warnings,
      blockingIssues,
      executionTime,
      evaluatedPolicies,
      passedPolicies,
      failedPolicies
    };
  }
}
