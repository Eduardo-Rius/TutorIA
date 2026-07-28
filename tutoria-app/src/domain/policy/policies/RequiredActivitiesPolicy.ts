import { SystemClock } from '../../../shared/kernel/Clock';
import { Policy } from '../Policy';
import { PolicySeverity } from '../PolicySeverity';
import { PolicyResult } from '../PolicyResult';
import { PolicyCode } from '../PolicyCode';
import { PlanningPolicyContext } from './PlanningPolicyContext';

export class RequiredActivitiesPolicy implements Policy<PlanningPolicyContext> {
  public readonly id = 'required-activities';
  public readonly name = 'Required Activities Policy';
  public readonly description = 'Ensures there is at least one activity.';
  public readonly severity = PolicySeverity.BLOCKING;

  public evaluate(context: PlanningPolicyContext): PolicyResult {
    const startTime = new SystemClock().now().getTime();
    const violations = [];

    if (!context.activities || context.activities.length === 0) {
      violations.push({
        code: PolicyCode.create('PLN-004'),
        severity: this.severity,
        field: 'activities',
        messageKey: 'planning.activity.empty',
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
