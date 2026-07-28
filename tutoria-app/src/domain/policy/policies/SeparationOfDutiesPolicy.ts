import { SystemClock } from '../../../shared/kernel/Clock';
import { Policy } from '../Policy';
import { PolicySeverity } from '../PolicySeverity';
import { PolicyResult } from '../PolicyResult';
import { PolicyCode } from '../PolicyCode';
import { PlanningPolicyContext } from './PlanningPolicyContext';

export class SeparationOfDutiesPolicy implements Policy<PlanningPolicyContext> {
  public readonly id = 'separation-of-duties';
  public readonly name = 'Separation of Duties Policy';
  public readonly description = 'Ensures author and approver are not the same entity.';
  public readonly severity = PolicySeverity.BLOCKING;

  public evaluate(context: PlanningPolicyContext): PolicyResult {
    const startTime = new SystemClock().now().getTime();
    const violations = [];

    if (context.approverId && context.authorId === context.approverId) {
      violations.push({
        code: PolicyCode.create('PLN-005'),
        severity: this.severity,
        field: 'approverId',
        messageKey: 'planning.approval.sod_violation',
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
