import type {
  AssistDailyEvaluationGatewayRequest,
  AssistDailyEvaluationResponse,
  SanitizedEvaluationAIPayload,
} from './GovernedEvaluationAIContract';
import {
  validateAssistDailyEvaluationRequest,
  validateSanitizedEvaluationAIPayload,
  validateAssistDailyEvaluationResponse,
  GovernedEvaluationAIError,
} from './GovernedEvaluationAIContract';
import type { WeeklyPlanningRepository } from '../ports/WeeklyPlanningRepository';
import type { EvaluationAIProvider } from './EvaluationAIProvider';
import { adaptPlanningToSanitizedPayload } from './EvaluationAIContextAdapter';
import type { Room } from '../../domain/planning/RoomCatalog';
import type { InstitutionalRole } from '../../domain/identity/assignment/Assignment';

// ============================================================================
// TRUSTED CLOCK & OPERATIONAL TIMEZONE POLICY
// ============================================================================

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

/**
 * Authoritative operational timezone for TutorIA V1 Mexico deployment.
 * Evaluates operational calendar dates independent of UTC and host machine timezones.
 */
export const TUTORIA_OPERATIONAL_TIMEZONE = 'America/Mexico_City' as const;

/**
 * Derives the operational calendar date (YYYY-MM-DD) from an absolute instant
 * within the authoritative operational timezone (America/Mexico_City).
 *
 * Guarantees that future-day evaluation eligibility is determined by the
 * operational classroom calendar date, NOT UTC or host machine local time.
 */
export function getOperationalCalendarDate(
  instant: Date,
  timeZone: string = TUTORIA_OPERATIONAL_TIMEZONE
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(instant);
}

// ============================================================================
// TRUSTED EXECUTION CONTEXT
// ============================================================================

/**
 * Server-authoritative trusted execution context.
 *
 * CRITICAL SAFETY RULES:
 * 1. Established by server authentication / session verification.
 * 2. NEVER accepted from untrusted client pedagogical request parameters.
 * 3. NEVER forwarded to the external AI provider payload.
 */
export interface TrustedEvaluationExecutionContext {
  readonly authUid: string;
  readonly institutionalRole: InstitutionalRole | string;
  readonly personId?: string;
  readonly assignmentId?: string;
  readonly authorizedDaycareIds?: readonly string[];
  readonly roomIds?: readonly string[];
  readonly active?: boolean;
}

// ============================================================================
// APPLICATION FAILURE MODEL
// ============================================================================

export type GovernedEvaluationAIGatewayErrorCode =
  | 'INVALID_REQUEST'
  | 'PLANNING_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INVALID_PLANNING_STATUS'
  | 'INVALID_DAY'
  | 'FUTURE_DAY'
  | 'INVALID_EVALUATION_STATUS'
  | 'INVALID_PROVIDER_PAYLOAD'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'SENSITIVE_CONTENT_DETECTED'
  | 'PROHIBITED_EVALUATION_LANGUAGE'
  | 'PROVIDER_FAILURE';

export class GovernedEvaluationAIGatewayError extends Error {
  public readonly code: GovernedEvaluationAIGatewayErrorCode;

  constructor(message: string, code: GovernedEvaluationAIGatewayErrorCode) {
    super(message);
    this.name = 'GovernedEvaluationAIGatewayError';
    this.code = code;
    Object.setPrototypeOf(this, GovernedEvaluationAIGatewayError.prototype);
  }
}


// ============================================================================
// SAFE TELEMETRY BOUNDARY
// ============================================================================

/**
 * Strict telemetry interface defining permitted technical observability metadata.
 *
 * FORBIDDEN TELEMETRY (FAIL AUDIT IF PRESENT):
 * - humanEvidence text
 * - suggestedEvaluation text
 * - planning narratives / activity text / PDA text / observationTarget text
 * - authUid / teacherId / daycareId / planningId / tokens / secrets
 */
export interface SafeEvaluationTelemetryEvent {
  readonly contractVersion: '1.0';
  readonly success: boolean;
  readonly errorCode?: GovernedEvaluationAIGatewayErrorCode;
  readonly durationMs?: number;
  readonly providerId?: string;
}

// ============================================================================
// GATEWAY DEPENDENCIES & IMPLEMENTATION
// ============================================================================

export interface GovernedEvaluationAIGatewayDependencies {
  readonly repository: WeeklyPlanningRepository;
  readonly provider: EvaluationAIProvider;
  readonly clock?: Clock;
  readonly roomResolver?: (roomId: string) => Room | undefined;
}

/**
 * Server-Authoritative Gateway for Governed Evaluation AI.
 *
 * OPERATIONAL PRINCIPLE:
 * ANITA OBSERVES.
 * TUTORIA STRUCTURES AND MAY ASSIST.
 * ANITA DECIDES.
 * CECI REVIEWS.
 * THE SYSTEM PRESERVES TRACEABILITY.
 *
 * INVARIANTS:
 * 1. Minimal public client request (planningId, dayOfWeek, humanEvidence).
 * 2. Server-authoritative WeeklyPlanning retrieval from repository.
 * 3. Owning teacher authorization only; Director / Supervisor strictly denied drafting assistance.
 * 4. Planning status must be APPROVED_FOR_EXECUTION; DRAFT, IN_REVIEW, REJECTED, READY_FOR_CLOSURE, CLOSED denied.
 * 5. Temporal eligibility enforced via trusted clock; future days strictly denied.
 * 6. Daily evaluation status must be DRAFT or CHANGES_REQUESTED; IN_REVIEW and APPROVED strictly denied.
 * 7. Provider payload strictly sanitized and validated; technical IDs and auth data excluded.
 * 8. Provider response strictly validated against prohibited vocabulary and length bounds.
 * 9. ZERO evaluation persistence; repository.save is NEVER invoked.
 * 10. Output is transient drafting suggestion only; zero Human-Gate bypass.
 */
export class GovernedEvaluationAIGateway {
  private readonly repository: WeeklyPlanningRepository;
  private readonly provider: EvaluationAIProvider;
  private readonly clock: Clock;
  private readonly roomResolver?: (roomId: string) => Room | undefined;

  constructor(deps: GovernedEvaluationAIGatewayDependencies) {
    if (!deps.repository) {
      throw new Error('WeeklyPlanningRepository is required');
    }
    if (!deps.provider) {
      throw new Error('EvaluationAIProvider is required');
    }
    this.repository = deps.repository;
    this.provider = deps.provider;
    this.clock = deps.clock ?? new SystemClock();
    this.roomResolver = deps.roomResolver;
  }

  public async assistDailyEvaluation(
    request: AssistDailyEvaluationGatewayRequest,
    context: TrustedEvaluationExecutionContext
  ): Promise<AssistDailyEvaluationResponse> {
    // 1. Validate public client request (schema, bounds, sensitive input detection)
    try {
      validateAssistDailyEvaluationRequest(request);
    } catch (error) {
      if (error instanceof GovernedEvaluationAIError) {
        if (error.diagnosticCode === 'SENSITIVE_CONTENT_DETECTED') {
          throw new GovernedEvaluationAIGatewayError(
            error.message,
            'SENSITIVE_CONTENT_DETECTED'
          );
        }
        throw new GovernedEvaluationAIGatewayError(
          error.message,
          'INVALID_REQUEST'
        );
      }
      throw new GovernedEvaluationAIGatewayError(
        (error as Error).message,
        'INVALID_REQUEST'
      );
    }

    // 2. Validate trusted execution context (server-established identity)
    if (!context || typeof context !== 'object') {
      throw new GovernedEvaluationAIGatewayError(
        'Trusted execution context is required',
        'UNAUTHORIZED'
      );
    }
    if (!context.authUid || typeof context.authUid !== 'string' || !context.authUid.trim()) {
      throw new GovernedEvaluationAIGatewayError(
        'Valid authUid is required in execution context',
        'UNAUTHORIZED'
      );
    }
    if (context.active === false) {
      throw new GovernedEvaluationAIGatewayError(
        'Inactive execution context is unauthorized',
        'UNAUTHORIZED'
      );
    }
    if (context.institutionalRole !== 'TEACHER') {
      throw new GovernedEvaluationAIGatewayError(
        `Only TEACHER role is authorized for drafting assistance (received ${context.institutionalRole})`,
        'UNAUTHORIZED'
      );
    }

    // 3. Server-side authoritative retrieval of WeeklyPlanning
    const planning = await this.repository.findById(request.planningId);
    if (!planning) {
      throw new GovernedEvaluationAIGatewayError(
        `Planning not found: ${request.planningId}`,
        'PLANNING_NOT_FOUND'
      );
    }

    // 4. Verify caller authority over retrieved planning
    const isOwner =
      planning.teacherId === context.authUid ||
      (context.personId !== undefined && context.personId === planning.teacherId);

    if (!isOwner) {
      throw new GovernedEvaluationAIGatewayError(
        'Caller is not the authorized educator for this planning',
        'UNAUTHORIZED'
      );
    }

    if (context.authorizedDaycareIds && context.authorizedDaycareIds.length > 0) {
      if (!context.authorizedDaycareIds.includes(planning.daycareId)) {
        throw new GovernedEvaluationAIGatewayError(
          'Caller is not authorized for planning daycare',
          'UNAUTHORIZED'
        );
      }
    }

    // 5. Verify planning lifecycle permits evaluation assistance
    if (planning.status === 'CLOSED' || planning.isClosed()) {
      throw new GovernedEvaluationAIGatewayError(
        'Closed planning is not eligible for evaluation assistance',
        'INVALID_PLANNING_STATUS'
      );
    }
    if (planning.isReadyForClosure) {
      throw new GovernedEvaluationAIGatewayError(
        'Planning ready for closure is not eligible for evaluation assistance',
        'INVALID_PLANNING_STATUS'
      );
    }
    if (!planning.isApprovedForExecution()) {
      throw new GovernedEvaluationAIGatewayError(
        `Planning status '${planning.status}' is not eligible for evaluation assistance. Must be APPROVED_FOR_EXECUTION.`,
        'INVALID_PLANNING_STATUS'
      );
    }

    // 6. Verify requested day exists
    const targetDay = planning.days.find((d) => d.dayOfWeek === request.dayOfWeek);
    if (!targetDay) {
      throw new GovernedEvaluationAIGatewayError(
        `Day '${request.dayOfWeek}' not found in planning`,
        'INVALID_DAY'
      );
    }

    // 7. Temporal eligibility verification via trusted clock & operational timezone
    const dayDate = planning.getDayDate(targetDay) || targetDay.date;
    if (!dayDate) {
      throw new GovernedEvaluationAIGatewayError(
        `Cannot resolve date for day '${request.dayOfWeek}'`,
        'INVALID_DAY'
      );
    }

    const operationalToday = getOperationalCalendarDate(this.clock.now());
    if (dayDate > operationalToday) {
      throw new GovernedEvaluationAIGatewayError(
        `Cannot evaluate future day (${dayDate}) when operational date is ${operationalToday}`,
        'FUTURE_DAY'
      );
    }

    // 8. Daily evaluation status eligibility
    const dailyStatus = targetDay.evaluationStatus ?? 'DRAFT';
    if (dailyStatus === 'IN_REVIEW') {
      throw new GovernedEvaluationAIGatewayError(
        'Cannot assist evaluation while daily evaluation is IN_REVIEW by director',
        'INVALID_EVALUATION_STATUS'
      );
    }
    if (dailyStatus === 'APPROVED') {
      throw new GovernedEvaluationAIGatewayError(
        'Cannot assist evaluation for an already APPROVED daily evaluation',
        'INVALID_EVALUATION_STATUS'
      );
    }
    if (dailyStatus === 'REJECTED') {
      throw new GovernedEvaluationAIGatewayError(
        'Cannot assist evaluation for REJECTED daily evaluation status',
        'INVALID_EVALUATION_STATUS'
      );
    }
    if (dailyStatus !== 'DRAFT' && dailyStatus !== 'CHANGES_REQUESTED') {
      throw new GovernedEvaluationAIGatewayError(
        `Daily evaluation status '${dailyStatus}' is not eligible for evaluation assistance`,
        'INVALID_EVALUATION_STATUS'
      );
    }

    // 9. Construct and validate sanitized provider payload
    let payload: SanitizedEvaluationAIPayload;
    try {
      payload = adaptPlanningToSanitizedPayload(
        planning,
        targetDay,
        request.humanEvidence,
        { roomResolver: this.roomResolver }
      );
      validateSanitizedEvaluationAIPayload(payload);
    } catch (error) {
      if (error instanceof GovernedEvaluationAIGatewayError) {
        throw error;
      }
      if (error instanceof GovernedEvaluationAIError) {
        throw new GovernedEvaluationAIGatewayError(
          error.message,
          'INVALID_PROVIDER_PAYLOAD'
        );
      }
      throw new GovernedEvaluationAIGatewayError(
        (error as Error).message,
        'INVALID_PROVIDER_PAYLOAD'
      );
    }

    // 10. Invoke abstract provider port
    let providerResponse: AssistDailyEvaluationResponse;
    try {
      providerResponse = await this.provider.assist(payload);
    } catch (error) {
      throw new GovernedEvaluationAIGatewayError(
        `Provider execution failed: ${(error as Error).message}`,
        'PROVIDER_FAILURE'
      );
    }

    // 11. Validate provider response using locked H1R13.3C validator
    try {
      validateAssistDailyEvaluationResponse(providerResponse);
    } catch (error) {
      if (error instanceof GovernedEvaluationAIError) {
        if (error.diagnosticCode === 'PROHIBITED_EVALUATION_LANGUAGE') {
          throw new GovernedEvaluationAIGatewayError(
            error.message,
            'PROHIBITED_EVALUATION_LANGUAGE'
          );
        }
        throw new GovernedEvaluationAIGatewayError(
          error.message,
          'INVALID_PROVIDER_RESPONSE'
        );
      }
      throw new GovernedEvaluationAIGatewayError(
        (error as Error).message,
        'INVALID_PROVIDER_RESPONSE'
      );
    }

    // 12. Return transient drafting suggestion (ZERO PERSISTENCE, ZERO HUMAN-GATE BYPASS)
    return {
      suggestedEvaluation: providerResponse.suggestedEvaluation,
    };
  }
}
