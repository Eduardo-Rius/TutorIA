import { SystemClock } from '../../../shared/kernel/Clock';
import { Policy } from '../Policy';
import { PolicySeverity } from '../PolicySeverity';
import { PolicyResult } from '../PolicyResult';
import { PolicyCode } from '../PolicyCode';
import { PlanningPolicyContext } from './PlanningPolicyContext';

export class PlanningPeriodPolicy implements Policy<PlanningPolicyContext> {
  public readonly id = 'planning-period';
  public readonly name = 'Planning Period Policy';
  public readonly description = 'Ensures the plan falls within the valid school period.';
  public readonly severity = PolicySeverity.ERROR;

  public evaluate(context: PlanningPolicyContext): PolicyResult {
    const startTime = new SystemClock().now().getTime();
    const { validFrom, validUntil, schoolPeriodStart, schoolPeriodEnd } = context;
    const violations = [];

    if (validFrom.getTime() < schoolPeriodStart.getTime() || validUntil.getTime() > schoolPeriodEnd.getTime()) {
      violations.push({
        code: PolicyCode.create('PLN-002'),
        severity: this.severity,
        field: 'validFrom',
        messageKey: 'planning.date.outside_period',
        metadata: { schoolPeriodStart, schoolPeriodEnd }
      });
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
