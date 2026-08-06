import { PedagogicalContext } from '../context/Contracts';
import { PedagogicalDecisionResolution, PedagogicalAction, PedagogicalRestriction, DecisionRuleCode } from '../decision/Contracts';
import {
  PedagogicalGenerationObjective,
  TargetAudienceCode,
  PedagogicalReasoningStep,
  GenerationConstraint,
  GenerationConstraintType,
  KnowledgeRequirement,
  PlannedOutputSection,
  GenerationValidationCriterion,
  GenerationPlanEvidence,
  KnowledgeRequirementType,
  GenerationRuleCode
} from './Contracts';
import {
  ActionToExpectedOutcomeMap,
  ActionToReasoningStepsMap,
  ReasoningStepSequenceMap,
  ActionToRequiredSectionsMap,
  ActionToOptionalSectionsMap,
  OutputSectionSequenceMap,
  ActionToValidationCriteriaMap
} from './GenerationPlanPolicies';

export function buildObjective(
  action: PedagogicalAction,
  intent: string,
  ageRange?: string
): PedagogicalGenerationObjective {
  let audience: TargetAudienceCode = 'EDUCATOR';
  if (ageRange && ageRange.includes('teen')) audience = 'STUDENT';
  
  return Object.freeze({
    action,
    targetAudienceCode: audience,
    expectedOutcomeCode: ActionToExpectedOutcomeMap[action],
    derivedFromIntent: intent
  });
}

export function buildReasoningSteps(action: PedagogicalAction): readonly PedagogicalReasoningStep[] {
  const steps = ActionToReasoningStepsMap[action].map(stepCode => ({
    stepCode,
    sequence: ReasoningStepSequenceMap[stepCode],
    contextFieldsUsed: ['pedagogicalIntent'] as readonly (keyof PedagogicalContext)[],
    decisionRuleCodesUsed: ['REQUESTED_ACTION_ALLOWED'] as readonly DecisionRuleCode[],
    sourceReferences: [] as readonly string[]
  }));
  return Object.freeze([...steps].sort((a, b) => a.sequence - b.sequence));
}

export function convertConstraints(restrictions: readonly PedagogicalRestriction[]): readonly GenerationConstraint[] {
  const constraints = restrictions.map(r => {
    let constraintType: GenerationConstraintType;
    switch (r.restrictionType) {
      case 'role_limit':
        constraintType = 'must_preserve';
        break;
      case 'policy':
      case 'institutional_framework':
        constraintType = 'must_align_with';
        break;
      default:
        const exhaustiveCheck: never = r.restrictionType as never;
        constraintType = 'must_align_with';
        break;
    }
    
    return {
      constraintType,
      ruleCode: 'CONSTRAINT_CONVERTED' as GenerationRuleCode,
      sourceReferences: r.sourceIds
    };
  });
  
  return Object.freeze([...constraints].sort((a, b) => a.constraintType.localeCompare(b.constraintType)));
}

export function buildKnowledgeRequirements(
  frameworkIds: readonly string[],
  action: PedagogicalAction
): readonly KnowledgeRequirement[] {
  if (frameworkIds.length === 0) return Object.freeze([]);
  
  return Object.freeze([
    {
      requirementType: 'institutional_framework' as KnowledgeRequirementType,
      required: action === 'draft_recommendation' || action === 'approval_submission',
      sourceIds: frameworkIds,
      selectionRuleCode: 'KNOWLEDGE_REQUIREMENT_SELECTED' as GenerationRuleCode
    }
  ]);
}

export function buildOutputSchema(action: PedagogicalAction): readonly PlannedOutputSection[] {
  const required = ActionToRequiredSectionsMap[action].map(sectionCode => ({
    sectionCode,
    required: true,
    sequence: OutputSectionSequenceMap[sectionCode]
  }));
  
  const optional = ActionToOptionalSectionsMap[action].map(sectionCode => ({
    sectionCode,
    required: false,
    sequence: OutputSectionSequenceMap[sectionCode]
  }));
  
  const all = [...required, ...optional];
  return Object.freeze(all.sort((a, b) => a.sequence - b.sequence));
}

export function buildValidationCriteria(action: PedagogicalAction): readonly GenerationValidationCriterion[] {
  const criteria = ActionToValidationCriteriaMap[action].map(validationCode => ({
    validationCode,
    severity: 'error' as const,
    contextFieldsUsed: [] as readonly (keyof PedagogicalContext)[]
  }));
  
  return Object.freeze([...criteria].sort((a, b) => a.validationCode.localeCompare(b.validationCode)));
}

export function buildEvidence(decision: PedagogicalDecisionResolution): readonly GenerationPlanEvidence[] {
  const evidenceList = decision.evidence.map(e => ({
    ruleCode: 'TRACEABILITY_PRESERVED' as GenerationRuleCode,
    contextFieldsUsed: ['pedagogicalIntent'] as readonly (keyof PedagogicalContext)[],
    decisionEvidenceReferences: [e.ruleCode]
  }));
  
  if (evidenceList.length === 0) {
    return Object.freeze([]);
  }
  return Object.freeze(evidenceList);
}
