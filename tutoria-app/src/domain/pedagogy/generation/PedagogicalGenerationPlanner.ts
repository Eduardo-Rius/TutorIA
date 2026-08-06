import {
  PedagogicalGenerationPlanInput,
  PedagogicalGenerationPlanResolution,
  GenerationPlanDiagnostic,
  PedagogicalGenerationPlanNotCreated
} from './Contracts';
import { ActionToPlanTypeMap } from './GenerationPlanPolicies';
import {
  buildObjective,
  buildReasoningSteps,
  convertConstraints,
  buildKnowledgeRequirements,
  buildOutputSchema,
  buildValidationCriteria,
  buildEvidence
} from './GenerationPlanBuilders';

function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/.test(dateStr)) return false;
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(5, 7), 10);
  const day = parseInt(dateStr.substring(8, 10), 10);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let maxDays = typeof daysInMonth[month] === 'number' ? daysInMonth[month] : 0;

  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap) maxDays = 29;
  }

  if (day > maxDays) return false;

  const hour = parseInt(dateStr.substring(11, 13), 10);
  const minute = parseInt(dateStr.substring(14, 16), 10);
  const second = parseInt(dateStr.substring(17, 19), 10);

  if (hour > 23 || minute > 59 || second > 59) return false;

  return true;
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const val = obj[prop as keyof T];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  return obj;
}

export function buildPedagogicalGenerationPlan(input: PedagogicalGenerationPlanInput): PedagogicalGenerationPlanResolution {
  const diagnostics: GenerationPlanDiagnostic[] = [];

  // Return helper for not_created
  const reject = (reason: PedagogicalGenerationPlanNotCreated['reason'], extraDiagnostics: GenerationPlanDiagnostic[] = []): PedagogicalGenerationPlanResolution => {
    const res: PedagogicalGenerationPlanNotCreated = {
      status: 'not_created',
      reason,
      requestedAction: input?.decisionResolution?.requestedAction || 'guidance',
      plannedAt: input?.plannedAt || '',
      decisionDiagnostics: input?.decisionResolution?.diagnostics || [],
      generationDiagnostics: Object.freeze([...diagnostics, ...extraDiagnostics])
    };
    return deepFreeze(res);
  };

  // 1. Validate input structure and plannedAt strictly
  if (!input || !input.plannedAt || !isValidIsoDate(input.plannedAt)) {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'INVALID_PLANNED_AT',
      severity: 'error',
      field: 'plannedAt',
      receivedValue: input?.plannedAt ? String(input.plannedAt) : '',
      messageCode: 'INVALID_ISO_FORMAT'
    }]);
  }

  // Preserve timestamp
  const plannedAt = input.plannedAt;

  if (!input.decisionResolution || !input.contextResolution) {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'MISSING_REQUIRED_CONTEXT_SNAPSHOT',
      severity: 'error',
      field: 'contextResolution',
      receivedValue: null,
      messageCode: 'CONTEXT_MISSING'
    }]);
  }

  const { decisionResolution: decision, contextResolution: context } = input;

  // 3. Validate context-decision consistency
  if (
    decision.contextCapabilities?.completeness !== context.completeness ||
    decision.contextCapabilities?.canProvideGuidance !== context.canProvideGuidance ||
    decision.contextCapabilities?.canGenerateDraft !== context.canGenerateDraft ||
    decision.contextCapabilities?.canSubmitForApproval !== context.canSubmitForApproval
  ) {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'INCONSISTENT_CONTEXT_AND_DECISION',
      severity: 'error',
      field: 'contextCapabilities',
      receivedValue: decision.contextCapabilities ? {
        completeness: decision.contextCapabilities.completeness,
        canProvideGuidance: decision.contextCapabilities.canProvideGuidance,
        canGenerateDraft: decision.contextCapabilities.canGenerateDraft,
        canSubmitForApproval: decision.contextCapabilities.canSubmitForApproval
      } : {},
      messageCode: 'CAPABILITY_MISMATCH'
    }]);
  }

  const canonicalWarningKey = (w: import('../context/Contracts').PedagogicalWarning) => `${w.field}|${w.sourceType}|${w.message}`;
  const dWarnings = [...(decision.contextWarnings || [])].sort((a, b) => canonicalWarningKey(a).localeCompare(canonicalWarningKey(b)));
  const cWarnings = [...(context.warnings || [])].sort((a, b) => canonicalWarningKey(a).localeCompare(canonicalWarningKey(b)));

  if (dWarnings.length !== cWarnings.length || dWarnings.some((w, i) => { const cw = cWarnings[i]; return !cw || canonicalWarningKey(w) !== canonicalWarningKey(cw); })) {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'INCONSISTENT_CONTEXT_AND_DECISION',
      severity: 'error',
      field: 'contextCapabilities',
      receivedValue: decision.contextWarnings || [],
      messageCode: 'WARNING_MISMATCH'
    }]);
  }

  const decMissing = [...(decision.contextMissingRequirements || [])];
  const ctxMissing = [...(context.missingRequirements || [])];
  const canonicalReqKey = (r: import('../context/Contracts').MissingContextRequirement) => `${r.field}|${r.severity}|${r.reason}|${r.remediation}|${r.blocksRecommendation}`;
  decMissing.sort((a, b) => canonicalReqKey(a).localeCompare(canonicalReqKey(b)));
  ctxMissing.sort((a, b) => canonicalReqKey(a).localeCompare(canonicalReqKey(b)));

  if (decMissing.length !== ctxMissing.length || decMissing.some((r, i) => { const cr = ctxMissing[i]; return !cr || canonicalReqKey(r) !== canonicalReqKey(cr); })) {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'INCONSISTENT_CONTEXT_AND_DECISION',
      severity: 'error',
      field: 'contextCapabilities',
      receivedValue: decision.contextMissingRequirements || [],
      messageCode: 'WARNING_MISMATCH'
    }]);
  }

  // 4. Apply Authorization Gate
  if (decision.status === 'blocked') {
    return reject('DECISION_BLOCKED');
  }

  if (decision.status === 'clarification_required') {
    return reject('CLARIFICATION_REQUIRED');
  }

  if (decision.status !== 'ready') {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'INCONSISTENT_DECISION_STATUS',
      severity: 'error',
      field: 'status',
      receivedValue: decision.status,
      messageCode: 'UNEXPECTED_DECISION_STATUS'
    }]);
  }

  const action = decision.requestedAction;

  if (!decision.allowedActions || !decision.allowedActions.includes(action)) {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'REQUESTED_ACTION_NOT_ALLOWED',
      severity: 'error',
      field: 'allowedActions',
      receivedValue: decision.allowedActions || [],
      messageCode: 'ACTION_FORBIDDEN'
    }]);
  }



  // Build ready plan
  const planType = ActionToPlanTypeMap[action];

  const intent = context.context?.pedagogicalIntent;
  const ageRange = context.context?.ageRange;

  if (!intent || !ageRange) {
    return reject('INCONSISTENT_DECISION_INPUT', [{
      code: 'MISSING_REQUIRED_CONTEXT_SNAPSHOT',
      severity: 'error',
      field: 'contextResolution',
      receivedValue: null,
      messageCode: 'CONTEXT_MISSING'
    }]);
  }

  if (!decision.evidence || decision.evidence.length === 0) {
    return reject('MISSING_TRACEABILITY', [{
      code: 'MISSING_TRACEABILITY',
      severity: 'error',
      field: 'evidence',
      receivedValue: decision.evidence || [],
      messageCode: 'NO_EVIDENCE'
    }]);
  }

  const unsupported = (decision.restrictions || []).find(
    r => r.restrictionType !== 'institutional_framework' &&
         r.restrictionType !== 'policy' &&
         r.restrictionType !== 'role_limit'
  );
  if (unsupported) {
      return reject('UNSUPPORTED_RESTRICTION_TYPE', [{
          code: 'UNSUPPORTED_RESTRICTION_TYPE',
          severity: 'error',
          field: 'restrictions',
          receivedValue: unsupported.restrictionType,
          messageCode: 'UNSUPPORTED_RESTRICTION'
      }]);
  }

  const frameworks = context.context?.institutionalFrameworkIds || [];

  const objective = buildObjective(action, intent, ageRange);
  const reasoningSteps = buildReasoningSteps(action);
  const constraints = convertConstraints(decision.restrictions || []);
  const knowledgeRequirements = buildKnowledgeRequirements(frameworks, action);
  const outputSchema = buildOutputSchema(action);
  const validationCriteria = buildValidationCriteria(action);
  const evidence = buildEvidence(decision);

  const resolution: PedagogicalGenerationPlanResolution = {
    status: 'ready',
    requestedAction: action,
    plannedAt,
    decisionDiagnostics: Object.freeze([...(decision.diagnostics || [])]),
    generationDiagnostics: Object.freeze([...diagnostics]),
    plan: {
      planType,
      action,
      objective,
      reasoningSteps,
      constraints,
      knowledgeRequirements,
      outputSchema,
      validationCriteria,
      evidence
    }
  };

  return deepFreeze(resolution);
}
