import { PedagogicalAction } from '../decision/Contracts';
import {
  PedagogicalPlanType,
  PedagogicalReasoningStepCode,
  OutputSectionCode,
  GenerationValidationCode,
  ExpectedOutcomeCode,
  TargetAudienceCode
} from './Contracts';

export const ActionToPlanTypeMap: Record<PedagogicalAction, PedagogicalPlanType> = {
  guidance: 'guidance_plan',
  strategy: 'strategy_plan',
  draft_recommendation: 'draft_recommendation_plan',
  approval_submission: 'approval_submission_plan'
};

export const ActionToExpectedOutcomeMap: Record<PedagogicalAction, ExpectedOutcomeCode> = {
  guidance: 'IMMEDIATE_ACTION',
  strategy: 'STRATEGIC_ALIGNMENT',
  draft_recommendation: 'FORMAL_PLANNING',
  approval_submission: 'EVALUATION_READY'
};

export const ActionToReasoningStepsMap: Record<PedagogicalAction, readonly PedagogicalReasoningStepCode[]> = {
  guidance: [
    'ESTABLISH_OBJECTIVE',
    'APPLY_PEDAGOGICAL_INTENT',
    'APPLY_DECISION_RESTRICTIONS',
    'SELECT_ALLOWED_KNOWLEDGE',
    'DEFINE_OUTPUT_STRUCTURE',
    'DEFINE_VALIDATION_CRITERIA'
  ],
  strategy: [
    'ESTABLISH_OBJECTIVE',
    'IDENTIFY_AUDIENCE',
    'APPLY_PEDAGOGICAL_INTENT',
    'APPLY_DECISION_RESTRICTIONS',
    'SELECT_ALLOWED_KNOWLEDGE',
    'DEFINE_OUTPUT_STRUCTURE',
    'DEFINE_VALIDATION_CRITERIA'
  ],
  draft_recommendation: [
    'ESTABLISH_OBJECTIVE',
    'IDENTIFY_AUDIENCE',
    'APPLY_PEDAGOGICAL_INTENT',
    'APPLY_INSTITUTIONAL_FRAMEWORK',
    'APPLY_DECISION_RESTRICTIONS',
    'SELECT_ALLOWED_KNOWLEDGE',
    'DEFINE_OUTPUT_STRUCTURE',
    'DEFINE_VALIDATION_CRITERIA'
  ],
  approval_submission: [
    'ESTABLISH_OBJECTIVE',
    'IDENTIFY_AUDIENCE',
    'APPLY_PEDAGOGICAL_INTENT',
    'APPLY_INSTITUTIONAL_FRAMEWORK',
    'APPLY_DECISION_RESTRICTIONS',
    'SELECT_ALLOWED_KNOWLEDGE',
    'DEFINE_OUTPUT_STRUCTURE',
    'DEFINE_VALIDATION_CRITERIA'
  ]
};

export const ActionToRequiredSectionsMap: Record<PedagogicalAction, readonly OutputSectionCode[]> = {
  guidance: ['objective', 'warnings'],
  strategy: ['objective', 'pedagogical_strategy', 'evaluation_criteria'],
  draft_recommendation: ['objective', 'pedagogical_strategy', 'materials', 'adaptations'],
  approval_submission: ['objective', 'pedagogical_strategy', 'materials', 'adaptations', 'evaluation_criteria', 'institutional_alignment']
};

export const ActionToOptionalSectionsMap: Record<PedagogicalAction, readonly OutputSectionCode[]> = {
  guidance: ['context_summary'],
  strategy: ['context_summary'],
  draft_recommendation: ['evaluation_criteria'],
  approval_submission: ['warnings']
};

export const ActionToForbiddenSectionsMap: Record<PedagogicalAction, readonly OutputSectionCode[]> = {
  guidance: ['materials', 'adaptations', 'evaluation_criteria', 'institutional_alignment'],
  strategy: ['institutional_alignment'],
  draft_recommendation: [],
  approval_submission: []
};

export const ActionToValidationCriteriaMap: Record<PedagogicalAction, readonly GenerationValidationCode[]> = {
  guidance: ['OBJECTIVE_PRESERVED', 'NO_UNSUPPORTED_FACTS', 'NO_UNAUTHORIZED_INFERENCE'],
  strategy: ['AGE_RANGE_RESPECTED', 'GROUP_CONTEXT_RESPECTED', 'REQUIRED_SECTIONS_PRESENT'],
  draft_recommendation: ['FORBIDDEN_SECTIONS_ABSENT', 'TRACEABILITY_PRESERVED'],
  approval_submission: ['INSTITUTIONAL_FRAMEWORK_RESPECTED', 'APPLICABLE_POLICIES_RESPECTED']
};

export const ReasoningStepSequenceMap: Record<PedagogicalReasoningStepCode, number> = {
  ESTABLISH_OBJECTIVE: 10,
  IDENTIFY_AUDIENCE: 20,
  APPLY_PEDAGOGICAL_INTENT: 30,
  APPLY_INSTITUTIONAL_FRAMEWORK: 40,
  APPLY_DECISION_RESTRICTIONS: 50,
  SELECT_ALLOWED_KNOWLEDGE: 60,
  DEFINE_OUTPUT_STRUCTURE: 70,
  DEFINE_VALIDATION_CRITERIA: 80
};

export const OutputSectionSequenceMap: Record<OutputSectionCode, number> = {
  objective: 10,
  context_summary: 20,
  pedagogical_strategy: 30,
  recommended_activities: 40,
  materials: 50,
  adaptations: 60,
  evaluation_criteria: 70,
  institutional_alignment: 80,
  warnings: 90
};
