import { SystemClock } from '../../../shared/kernel/Clock';
import { Policy } from '../Policy';
import { PolicySeverity } from '../PolicySeverity';
import { PolicyResult } from '../PolicyResult';
import { PolicyCode } from '../PolicyCode';
import { PlanningPolicyContext } from './PlanningPolicyContext';

export class RequiredObservationPolicy implements Policy<PlanningPolicyContext> {
  public readonly id = 'required-observation';
  public readonly name = 'Required Observation Policy';
  public readonly description = 'Ensures activities that require observation have it.';
  public readonly severity = PolicySeverity.WARNING;

  public evaluate(context: PlanningPolicyContext): PolicyResult {
    const startTime = new SystemClock().now().getTime();
    const warnings = [];

    for (const activity of context.activities) {
      if (activity.requiresObservation && !activity.hasObservation) {
        warnings.push({
          code: PolicyCode.create('PLN-003'),
          severity: this.severity,
          field: 'activities',
          messageKey: 'planning.activity.missing_observation',
          metadata: { activityId: activity.id }
        });
      }
    }

    return {
      passed: true, // This is a WARNING policy, so it passes but returns warnings
      violations: [],
      warnings,
      executionTime: new SystemClock().now().getTime() - startTime,
      policyId: this.id
    };
  }
}
