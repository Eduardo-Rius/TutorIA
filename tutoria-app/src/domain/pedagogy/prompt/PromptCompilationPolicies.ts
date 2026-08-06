import { PedagogicalPlanType } from '../generation/Contracts';
import { PromptSectionCode, PromptConstraintCode, PromptDirectiveType } from './Contracts';

export const CANONICAL_PROMPT_SECTION_ORDER: readonly PromptSectionCode[] = Object.freeze([
  'system_role',
  'pedagogical_objective',
  'learner_context',
  'reasoning_instructions',
  'institutional_constraints',
  'knowledge_boundaries',
  'output_contract',
  'validation_requirements',
  'evidence_trace'
] as const);

export const isValidISO8601 = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  const isoRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;
  const match = dateStr.match(isoRegex);
  if (!match) return false;
  
  const yearStr = match[1] || '';
  const monthStr = match[2] || '';
  const dayStr = match[3] || '';
  const hourStr = match[4] || '';
  const minStr = match[5] || '';
  const secStr = match[6] || '';
  
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const second = parseInt(secStr, 10);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  
  const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = daysInMonth[month - 1];
  if (maxDay === undefined || day > maxDay) return false;
  
  return true;
};

export const serializeSourceData = (source: string): string => {
  if (!source) return '';
  return source
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e')
    .replace(/`/g, '\\x60');
};

export interface PlanTypeMatrixEntry {
  readonly requiredSections: readonly PromptSectionCode[];
  readonly prohibitedSections: readonly PromptSectionCode[];
  readonly correspondingAction: import('../decision/Contracts').PedagogicalAction;
}

export const PLAN_TYPE_COMPILATION_MATRIX: Readonly<Record<PedagogicalPlanType, PlanTypeMatrixEntry>> = Object.freeze({
  guidance_plan: Object.freeze({
    requiredSections: Object.freeze<PromptSectionCode[]>(['system_role', 'pedagogical_objective', 'output_contract']),
    prohibitedSections: Object.freeze<PromptSectionCode[]>([]),
    correspondingAction: 'guidance'
  }),
  strategy_plan: Object.freeze({
    requiredSections: Object.freeze<PromptSectionCode[]>(['system_role', 'pedagogical_objective', 'reasoning_instructions', 'output_contract', 'evidence_trace']),
    prohibitedSections: Object.freeze<PromptSectionCode[]>([]),
    correspondingAction: 'strategy'
  }),
  draft_recommendation_plan: Object.freeze({
    requiredSections: Object.freeze<PromptSectionCode[]>(['system_role', 'pedagogical_objective', 'output_contract']),
    prohibitedSections: Object.freeze<PromptSectionCode[]>(['institutional_constraints']),
    correspondingAction: 'draft_recommendation'
  }),
  approval_submission_plan: Object.freeze({
    requiredSections: Object.freeze<PromptSectionCode[]>(['system_role', 'pedagogical_objective', 'output_contract']),
    prohibitedSections: Object.freeze<PromptSectionCode[]>(['learner_context']),
    correspondingAction: 'approval_submission'
  })
});

export const getDirectiveTypeForConstraint = (constraintType: PromptConstraintCode): PromptDirectiveType => {
  switch (constraintType) {
    case 'must_include':
    case 'must_align_with':
    case 'must_preserve':
      return 'mandatory';
    case 'must_avoid':
    case 'must_not_infer':
      return 'restriction';
  }
};

export const isMappedConstraint = (constraintType: string): constraintType is PromptConstraintCode => {
  return ['must_include', 'must_align_with', 'must_preserve', 'must_avoid', 'must_not_infer'].includes(constraintType);
};
