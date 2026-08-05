import { MissingContextRequirement, PedagogicalContext } from '../context/Contracts';
import { ClarificationRequest, PedagogicalAction } from './Contracts';

export class ClarificationEngine {
  private static readonly FIELD_CAPABILITY_MAP: Partial<Record<keyof PedagogicalContext, PedagogicalAction>> = {
    // Strategy dependencies
    pedagogicalIntent: 'strategy',
    groupId: 'strategy',
    ageRange: 'strategy',
    
    // Draft dependencies
    roomId: 'draft_recommendation',
    planningPeriod: 'draft_recommendation',
    
    // Approval dependencies
    institutionId: 'approval_submission',
    childcareCenterId: 'approval_submission',
    institutionalFrameworkIds: 'approval_submission',
    applicablePolicies: 'approval_submission',
  };

  public static generateRequests(
    missingRequirements: readonly MissingContextRequirement[],
    requestedAction: PedagogicalAction
  ): readonly ClarificationRequest[] {
    const relevantReqs: ClarificationRequest[] = [];

    for (const req of missingRequirements) {
      const fieldKey = req.field as keyof PedagogicalContext;
      const unlocks = this.FIELD_CAPABILITY_MAP[fieldKey];

      if (!unlocks) {
        continue; // Unmapped fields do not generate clarification requests
      }

      // Check if this unlocked capability is relevant to the requested action
      // A capability is relevant if it is the requested action or a prerequisite
      if (this.isRelevantToRequested(unlocks, requestedAction)) {
        const source = this.inferOptionsSource(req.field);
        const reqObj: ClarificationRequest = {
          missingField: req.field as keyof PedagogicalContext,
          pedagogicalReason: req.reason,
          severity: req.severity as 'critical' | 'high' | 'low',
          suggestedQuestion: this.inferQuestion(req.field),
          impactOfSkipping: req.remediation,
          unlocksCapability: unlocks,
          ...(source ? { optionsSource: source } : {})
        };

        relevantReqs.push(Object.freeze(reqObj));
      }
    }

    return Object.freeze(relevantReqs);
  }

  private static isRelevantToRequested(unlocks: PedagogicalAction, requested: PedagogicalAction): boolean {
    const hierarchy = ['guidance', 'strategy', 'draft_recommendation', 'approval_submission'];
    const unlockIdx = hierarchy.indexOf(unlocks);
    const reqIdx = hierarchy.indexOf(requested);
    
    // If the capability unlocked is at or below the requested capability in the hierarchy,
    // then it's a prerequisite and thus relevant to unlocking the requested action.
    return unlockIdx <= reqIdx;
  }

  private static inferQuestion(field: string): string {
    switch (field) {
      case 'pedagogicalIntent':
        return '¿Cuál es la intención pedagógica principal de esta actividad?';
      case 'groupId':
        return '¿Para qué grupo está diseñada esta planeación?';
      case 'ageRange':
        return '¿Cuál es el rango de edad de los niños involucrados?';
      case 'roomId':
        return '¿En qué sala o área se llevará a cabo?';
      case 'planningPeriod':
        return '¿A qué periodo de planeación corresponde?';
      default:
        return `Por favor proporciona más información sobre: ${field}.`;
    }
  }

  private static inferOptionsSource(field: string): 'institutional_catalog' | 'group_catalog' | 'policy_catalog' | undefined {
    if (field === 'groupId' || field === 'roomId' || field === 'ageRange') {
      return 'group_catalog';
    }
    if (field === 'institutionId' || field === 'childcareCenterId') {
      return 'institutional_catalog';
    }
    if (field === 'institutionalFrameworkIds' || field === 'applicablePolicies') {
      return 'policy_catalog';
    }
    return undefined;
  }
}
