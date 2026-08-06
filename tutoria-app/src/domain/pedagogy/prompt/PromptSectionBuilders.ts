import { 
  PedagogicalGenerationPlan,
  PedagogicalReasoningStep,
  GenerationConstraint,
  PlannedOutputSection,
  GenerationValidationCriterion,
  GenerationPlanEvidence
} from '../generation/Contracts';
import { 
  PromptSection,
  PromptDirective,
  PromptOutputInstruction,
  PromptTraceEntry
} from './Contracts';
import { getDirectiveTypeForConstraint, serializeSourceData } from './PromptCompilationPolicies';

export const buildReasoningDirectives = (steps: readonly PedagogicalReasoningStep[]): readonly PromptDirective[] => {
  return Object.freeze(steps.map(step => Object.freeze({
    directiveType: 'guidance',
    directiveCode: step.stepCode,
    sourceReferences: Object.freeze([...step.sourceReferences])
  })));
};

export const buildConstraintDirectives = (constraints: readonly GenerationConstraint[]): readonly PromptDirective[] => {
  return Object.freeze(constraints.map(constraint => Object.freeze({
    directiveType: getDirectiveTypeForConstraint(constraint.constraintType),
    directiveCode: constraint.constraintType,
    sourceReferences: Object.freeze([...constraint.sourceReferences])
  })));
};

export const buildValidationDirectives = (criteria: readonly GenerationValidationCriterion[]): readonly PromptDirective[] => {
  return Object.freeze(criteria.map(criterion => Object.freeze({
    directiveType: 'mandatory',
    directiveCode: criterion.validationCode,
    sourceReferences: Object.freeze([])
  })));
};

export const buildOutputInstructions = (schema: readonly PlannedOutputSection[], criteria: readonly GenerationValidationCriterion[]): readonly PromptOutputInstruction[] => {
  return Object.freeze(schema.map(section => Object.freeze({
    sectionCode: section.sectionCode,
    required: section.required,
    sequence: section.sequence,
    sourceValidationCodes: Object.freeze(criteria.map(c => c.validationCode))
  })));
};

export const buildEvidenceTrace = (evidence: readonly GenerationPlanEvidence[]): readonly PromptTraceEntry[] => {
  return Object.freeze(evidence.map(ev => Object.freeze({
    ruleCode: ev.ruleCode,
    sourceReferences: Object.freeze([...ev.decisionEvidenceReferences])
  })));
};

export const compileSystemRoleSection = (plan: PedagogicalGenerationPlan): PromptSection => {
  return Object.freeze({
    sectionCode: 'system_role',
    content: serializeSourceData(`ACTION:${plan.action}`),
    directives: Object.freeze([]),
    sequence: 1
  });
};

export const compilePedagogicalObjectiveSection = (plan: PedagogicalGenerationPlan): PromptSection => {
  const content = [
    `ACTION:${plan.objective.action}`,
    `AUDIENCE:${plan.objective.targetAudienceCode}`,
    `OUTCOME:${plan.objective.expectedOutcomeCode}`,
    `INTENT:${plan.objective.derivedFromIntent}`
  ].join('\n');
  return Object.freeze({
    sectionCode: 'pedagogical_objective',
    content: serializeSourceData(content),
    directives: Object.freeze([]),
    sequence: 2
  });
};

export const compileLearnerContextSection = (): PromptSection | undefined => {
  return undefined; // Context source data is absent in PER-3 generation resolution, omitted to prevent knowledge invention.
};

export const compileReasoningInstructionsSection = (plan: PedagogicalGenerationPlan): PromptSection => {
  return Object.freeze({
    sectionCode: 'reasoning_instructions',
    content: '',
    directives: buildReasoningDirectives(plan.reasoningSteps),
    sequence: 4
  });
};

export const compileInstitutionalConstraintsSection = (plan: PedagogicalGenerationPlan): PromptSection => {
  return Object.freeze({
    sectionCode: 'institutional_constraints',
    content: '',
    directives: buildConstraintDirectives(plan.constraints),
    sequence: 5
  });
};

export const compileKnowledgeBoundariesSection = (plan: PedagogicalGenerationPlan): PromptSection => {
  const directives: PromptDirective[] = plan.knowledgeRequirements.map(kr => Object.freeze({
    directiveType: 'mandatory',
    directiveCode: kr.selectionRuleCode,
    sourceReferences: Object.freeze([...kr.sourceIds])
  }));
  return Object.freeze({
    sectionCode: 'knowledge_boundaries',
    content: '',
    directives: Object.freeze(directives),
    sequence: 6
  });
};

export const compileValidationRequirementsSection = (plan: PedagogicalGenerationPlan): PromptSection => {
  return Object.freeze({
    sectionCode: 'validation_requirements',
    content: '',
    directives: buildValidationDirectives(plan.validationCriteria),
    sequence: 8
  });
};

export const buildAllSections = (plan: PedagogicalGenerationPlan): readonly PromptSection[] => {
  const sections: (PromptSection | undefined)[] = [
    compileSystemRoleSection(plan),
    compilePedagogicalObjectiveSection(plan),
    compileLearnerContextSection(),
    compileReasoningInstructionsSection(plan),
    compileInstitutionalConstraintsSection(plan),
    compileKnowledgeBoundariesSection(plan),
    Object.freeze({
      sectionCode: 'output_contract',
      content: '',
      directives: Object.freeze([]),
      sequence: 7
    }),
    compileValidationRequirementsSection(plan),
    Object.freeze({
      sectionCode: 'evidence_trace',
      content: '',
      directives: Object.freeze([]),
      sequence: 9
    })
  ];
  return Object.freeze(sections.filter((s): s is PromptSection => s !== undefined));
};
