import { PromptCompilationNotCreatedReason } from './Contracts';
import { 
  PromptCompilationInput, 
  PromptCompilationResolution, 
  PromptCompilationNotCreated,
  PromptCompilationDiagnostic,
  PromptCompilationReady,
  PromptSection
} from './Contracts';
import { PedagogicalPlanType } from '../generation/Contracts';
import { isValidISO8601, PLAN_TYPE_COMPILATION_MATRIX, CANONICAL_PROMPT_SECTION_ORDER, isMappedConstraint } from './PromptCompilationPolicies';
import { buildAllSections, buildOutputInstructions, buildEvidenceTrace } from './PromptSectionBuilders';

const createNotCreated = (
  input: PromptCompilationInput,
  reason: PromptCompilationNotCreatedReason,
  compilationDiagnostics: readonly PromptCompilationDiagnostic[]
): PromptCompilationNotCreated => {
  const base: Omit<PromptCompilationNotCreated, 'planType'> & { planType?: PedagogicalPlanType } = {
    status: 'not_created',
    reason,
    requestedAction: input.generationResolution.requestedAction,
    plannedAt: input.generationResolution.plannedAt,
    compiledAt: input.compiledAt,
    decisionDiagnostics: Object.freeze([...input.generationResolution.decisionDiagnostics]),
    generationDiagnostics: Object.freeze([...input.generationResolution.generationDiagnostics]),
    compilationDiagnostics: Object.freeze([...compilationDiagnostics])
  };

  if (input.generationResolution.status === 'ready' && input.generationResolution.plan) {
    return Object.freeze({
      ...base,
      planType: input.generationResolution.plan.planType
    });
  }

  return Object.freeze({ ...base });
};

export const compilePrompt = (input: PromptCompilationInput): PromptCompilationResolution => {
  const genRes = input.generationResolution;
  const diagnostics: PromptCompilationDiagnostic[] = [];

  if (genRes.status === 'not_created') {
    return createNotCreated(input, 'GENERATION_PLAN_NOT_READY', Object.freeze([]));
  }

  if (!isValidISO8601(input.compiledAt)) {
    return createNotCreated(input, 'INVALID_COMPILED_AT', Object.freeze([{
      code: 'INVALID_TIMESTAMP',
      severity: 'error',
      field: 'compiledAt',
      message: 'compiledAt is not a valid ISO-8601 timestamp'
    }]));
  }

  const plan = genRes.plan;
  if (!plan) {
    return createNotCreated(input, 'INCONSISTENT_GENERATION_PLAN', Object.freeze([{
      code: 'INCONSISTENT_PLAN',
      severity: 'error',
      field: 'plan',
      message: 'Plan is missing on a ready resolution'
    }]));
  }

  const matrixEntry = PLAN_TYPE_COMPILATION_MATRIX[plan.planType];
  if (!matrixEntry) {
    return createNotCreated(input, 'UNSUPPORTED_PLAN_TYPE', Object.freeze([{
      code: 'UNSUPPORTED_PLAN',
      severity: 'error',
      field: 'planType',
      message: `Unsupported planType: ${plan.planType}`
    }]));
  }

  if (plan.action !== input.generationResolution.requestedAction) {
    return createNotCreated(input, 'INCONSISTENT_GENERATION_PLAN', Object.freeze([{
      code: 'INCONSISTENT_PLAN',
      severity: 'error',
      field: 'plan.action',
      message: `Plan action '${plan.action}' does not match requested action '${input.generationResolution.requestedAction}'`
    }]));
  }

  if (matrixEntry.correspondingAction !== plan.action) {
    return createNotCreated(input, 'INCONSISTENT_GENERATION_PLAN', Object.freeze([{
      code: 'INCONSISTENT_PLAN',
      severity: 'error',
      field: 'planType',
      message: `Plan type '${plan.planType}' does not correspond to action '${plan.action}'`
    }]));
  }

  if (!plan.evidence || plan.evidence.length === 0) {
    return createNotCreated(input, 'MISSING_TRACEABILITY', Object.freeze([{
      code: 'MISSING_TRACEABILITY',
      severity: 'error',
      field: 'evidence',
      message: 'Plan evidence is empty'
    }]));
  }

  if (!plan.outputSchema || plan.outputSchema.length === 0) {
    return createNotCreated(input, 'EMPTY_OUTPUT_SCHEMA', Object.freeze([{
      code: 'MISSING_SCHEMA',
      severity: 'error',
      field: 'outputSchema',
      message: 'Output schema is empty'
    }]));
  }

  for (const constraint of plan.constraints) {
    if (!isMappedConstraint(constraint.constraintType as string)) {
      return createNotCreated(input, 'UNMAPPED_GENERATION_RULE', Object.freeze([{
        code: 'UNMAPPED_CONSTRAINT',
        severity: 'error',
        field: 'constraints',
        message: `Constraint type '${constraint.constraintType}' is not mapped to a directive type`
      }]));
    }
  }

  const allSections = buildAllSections(plan);
  const compiledSections: PromptSection[] = [];
  
  for (const requiredSection of matrixEntry.requiredSections) {
    const s = allSections.find(x => x.sectionCode === requiredSection);
    if (!s) {
       return createNotCreated(input, 'INCONSISTENT_GENERATION_PLAN', Object.freeze([{
          code: 'INCONSISTENT_PLAN',
          severity: 'error',
          field: 'requiredSections',
          message: `Required section missing: ${requiredSection}`
        }]));
    }
    compiledSections.push(s);
  }

  for (const prohibitedSection of matrixEntry.prohibitedSections) {
    if (compiledSections.some(x => x.sectionCode === prohibitedSection)) {
      return createNotCreated(input, 'INCONSISTENT_GENERATION_PLAN', Object.freeze([{
        code: 'INCONSISTENT_PLAN',
        severity: 'error',
        field: 'prohibitedSections',
        message: `Prohibited section included: ${prohibitedSection}`
      }]));
    }
  }

  compiledSections.sort((a, b) => CANONICAL_PROMPT_SECTION_ORDER.indexOf(a.sectionCode) - CANONICAL_PROMPT_SECTION_ORDER.indexOf(b.sectionCode));
  
  const outputContract = buildOutputInstructions(plan.outputSchema, plan.validationCriteria);
  const evidenceTrace = buildEvidenceTrace(plan.evidence);

  const promptPlan = Object.freeze({
    sections: Object.freeze(compiledSections),
    outputContract,
    evidenceTrace
  });

  const readyRes: PromptCompilationReady = Object.freeze({
    status: 'ready',
    requestedAction: genRes.requestedAction,
    planType: plan.planType,
    plannedAt: genRes.plannedAt,
    compiledAt: input.compiledAt,
    decisionDiagnostics: Object.freeze([...genRes.decisionDiagnostics]),
    generationDiagnostics: Object.freeze([...genRes.generationDiagnostics]),
    compilationDiagnostics: Object.freeze([...diagnostics]),
    promptPlan
  });

  return readyRes;
};
