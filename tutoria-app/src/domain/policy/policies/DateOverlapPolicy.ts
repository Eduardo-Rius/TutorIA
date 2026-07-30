import { SystemClock } from '../../../shared/kernel/Clock';
import { Policy } from '../Policy';
import { PolicySeverity } from '../PolicySeverity';
import { PolicyResult } from '../PolicyResult';
import { PolicyCode } from '../PolicyCode';
import { PlanningPolicyContext } from './PlanningPolicyContext';

export class DateOverlapPolicy implements Policy<PlanningPolicyContext> {
  public readonly id = 'date-overlap';
  public readonly name = 'Date Overlap Policy';
  public readonly description = 'Ensures the plan dates do not overlap with existing plans.';
  public readonly severity = PolicySeverity.BLOCKING;

  public evaluate(context: PlanningPolicyContext): PolicyResult {
    const startTime = new SystemClock().now().getTime();
    const { validFrom, validUntil, existingPlans } = context;
    const violations = [];

    // Normalize to start of day for accurate comparison (avoiding timezone edge cases if needed)
    const fromTime = validFrom.getTime();
    const untilTime = validUntil.getTime();

    if (fromTime > untilTime) {
      violations.push({
        code: PolicyCode.create('PLN-001'),
        severity: this.severity,
        field: 'validFrom',
        messageKey: 'planning.date.invalid_range',
        metadata: { validFrom, validUntil }
      });
    } else {
      for (const existing of existingPlans) {
        const extFrom = existing.validFrom.getTime();
        const extUntil = existing.validUntil.getTime();

        // Overlap condition: from1 <= until2 && from2 <= until1
        if (fromTime <= extUntil && extFrom <= untilTime) {
          violations.push({
            code: PolicyCode.create('PLN-001'),
            severity: this.severity,
            field: 'validFrom',
            messageKey: 'planning.date.overlap',
            metadata: { overlappingPlan: existing }
          });
          break; // One overlap is enough to fail
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings: [],
      executionTime: new SystemClock().now().getTime() - startTime,
      policyId: this.id
    };
  }
}
