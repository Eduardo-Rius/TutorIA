import type { FirebaseApp } from 'firebase/app';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  WeeklyPlanningProposalSource,
  WeeklyPlanningProposalConstraints,
  WeeklyPlanningModality,
  validateWeeklyPlanningProposalRequest,
  validateWeeklyPlanningProposalResponse,
} from '../../application/planning/WeeklyPlanningProposalSource';

/**
 * Standardized client transport error codes for Weekly Planning intelligence.
 * Enables clean UI categorization without leaking infrastructure details.
 */
export type FirebaseWeeklyPlanningErrorCode =
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'INVALID_REQUEST'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN';

/**
 * Safe human-readable Spanish messages for client error presentation.
 * Guaranteed never to expose server stacks, internal paths, or credentials.
 */
export const SAFE_ERROR_MESSAGES: Readonly<Record<FirebaseWeeklyPlanningErrorCode, string>> = Object.freeze({
  UNAUTHENTICATED: 'Sesión no autenticada. Inicie sesión para solicitar propuestas pedagógicas.',
  PERMISSION_DENIED: 'No tiene permisos para solicitar propuestas de planeación en esta sala o guardería.',
  INVALID_REQUEST: 'La solicitud de propuesta contiene datos inválidos o incompletos.',
  TEMPORARILY_UNAVAILABLE: 'El servicio de planeación inteligente no está disponible temporalmente. Intente más tarde.',
  RATE_LIMITED: 'Límite de solicitudes alcanzado. Por favor espere unos momentos antes de reintentar.',
  INVALID_RESPONSE: 'La respuesta del servidor no cumple con el formato de propuesta válido.',
  UNKNOWN: 'Ocurrió un error inesperado al procesar la propuesta de planeación.',
});

/**
 * Custom error thrown when the Firebase transport, authorization, or response validation fails.
 * Explicitly encapsulates errors with safe codes and sanitized human-facing messages.
 */
export class FirebaseWeeklyPlanningTransportError extends Error {
  public readonly code: FirebaseWeeklyPlanningErrorCode;

  constructor(
    code: FirebaseWeeklyPlanningErrorCode,
    message?: string,
    public readonly cause?: unknown
  ) {
    const safeMessage = message || SAFE_ERROR_MESSAGES[code] || SAFE_ERROR_MESSAGES.UNKNOWN;
    super(safeMessage);
    this.name = 'FirebaseWeeklyPlanningTransportError';
    this.code = code;
  }
}

/**
 * Operational authorization context required by the server gateway for authorization checks.
 *
 * CRITICAL PRIVACY & SEPARATION INVARIANT:
 * These identifiers exist purely at the transport/authorization envelope layer.
 * They are NEVER mixed into the pedagogical request prompt and are stripped by the
 * gateway prior to AI inference.
 */
export interface WeeklyPlanningOperationalContext {
  readonly daycareId?: string;
  readonly roomId?: string;
}

/**
 * Outbound wire request contract sent to the Firebase Callable function `proposeWeeklyPlanning`.
 * Strictly mirrors ProposeWeeklyPlanningGatewayRequest from the server gateway.
 */
export interface ProposeWeeklyPlanningGatewayRequest {
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly modality: WeeklyPlanningModality;
  readonly room: {
    readonly roomId: string;
    readonly name: string;
    readonly minAgeMonths: number;
    readonly maxAgeMonths: number;
  };
  readonly currentContext: {
    readonly observations?: string;
    readonly identifiedNeeds?: string;
    readonly specialSituations?: string;
    readonly availableMaterials?: string;
  };
  readonly constraints?: WeeklyPlanningProposalConstraints;
  // Operational fields (used for server-side authorization only, stripped before AI execution)
  readonly daycareId?: string;
  readonly planningId?: string;
}

/**
 * Inbound wire response contract received from the Firebase Callable function `proposeWeeklyPlanning`.
 */
export type ProposeWeeklyPlanningGatewayResponse =
  | WeeklyPlanningProposalResponse
  | { readonly proposal: WeeklyPlanningProposalResponse };

/**
 * Callable invoker function signature for transport injection (enabling zero-network unit tests).
 */
export type FirebaseCallableInvoker<
  TReq = ProposeWeeklyPlanningGatewayRequest,
  TRes = unknown
> = (payload: TReq) => Promise<{ data: TRes }>;

/**
 * Factory signature for creating a callable function (enabling factory injection for unit tests).
 */
export type FirebaseCallableFactory = (
  functions: Functions,
  name: string
) => (payload: ProposeWeeklyPlanningGatewayRequest) => Promise<{ data: unknown }>;

/**
 * Configuration options for FirebaseWeeklyPlanningProposalSource.
 */
export interface FirebaseWeeklyPlanningProposalSourceConfig {
  readonly app?: FirebaseApp;
  readonly functions?: Functions;
  readonly region?: string;
  readonly callableFn?: FirebaseCallableInvoker;
  readonly callableFactory?: FirebaseCallableFactory;
  readonly operationalContext?:
    | WeeklyPlanningOperationalContext
    | (() => WeeklyPlanningOperationalContext | undefined | Promise<WeeklyPlanningOperationalContext | undefined>);
}

/**
 * Forbidden keys that must never be present in a proposal response.
 * Any presence of lifecycle, governance, evaluation, or curricular traceability
 * causes the client adapter to FAIL CLOSED.
 */
const FORBIDDEN_RESPONSE_KEYS = Object.freeze([
  'status',
  'approvedBy',
  'approvedAt',
  'submittedBy',
  'submittedAt',
  'closedBy',
  'closedAt',
  'reviewHistory',
  'historicalRounds',
  'granularObservations',
  'planningId',
  'daycareId',
  'teacherId',
  'evaluation',
  'executionNotes',
  'evaluationStatus',
  'evaluationConfirmedAt',
  'evaluationConfirmedBy',
  'evaluationReviewedAt',
  'evaluationReviewedBy',
  'evaluationDirectorComment',
  'evaluationHistory',
  'directorReviewed',
  'teacherReviewedAt',
  'teacherReviewedBy',
  'curricularTraceability',
  'complementaryActivities',
  'prioritizedPractices',
  'pdaId',
  'catalogRevision',
]);

/**
 * Recursively scans an untrusted response object for forbidden governance/lifecycle keys.
 */
function scanForForbiddenResponseKeys(obj: unknown, path: string = ''): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      scanForForbiddenResponseKeys(obj[i], `${path}[${i}]`);
    }
    return;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_RESPONSE_KEYS.includes(key)) {
      throw new FirebaseWeeklyPlanningTransportError(
        'INVALID_RESPONSE',
        SAFE_ERROR_MESSAGES.INVALID_RESPONSE,
        new Error(`Response contains forbidden governance/lifecycle field: '${currentPath}'.`)
      );
    }
    scanForForbiddenResponseKeys(record[key], currentPath);
  }
}

/**
 * Maps a raw Firebase Callable error into a safe client error.
 * Strips raw error messages, stacks, and server implementation details.
 */
export function mapFirebaseCallableError(err: unknown): FirebaseWeeklyPlanningTransportError {
  if (err instanceof FirebaseWeeklyPlanningTransportError) {
    return err;
  }

  let code: FirebaseWeeklyPlanningErrorCode = 'UNKNOWN';

  if (err && typeof err === 'object') {
    const rawCode = String((err as Record<string, unknown>).code || '').toLowerCase();

    if (rawCode === 'unauthenticated' || rawCode === 'functions/unauthenticated') {
      code = 'UNAUTHENTICATED';
    } else if (rawCode === 'permission-denied' || rawCode === 'functions/permission-denied') {
      code = 'PERMISSION_DENIED';
    } else if (rawCode === 'invalid-argument' || rawCode === 'functions/invalid-argument') {
      code = 'INVALID_REQUEST';
    } else if (
      rawCode === 'unavailable' ||
      rawCode === 'functions/unavailable' ||
      rawCode === 'deadline-exceeded' ||
      rawCode === 'functions/deadline-exceeded'
    ) {
      code = 'TEMPORARILY_UNAVAILABLE';
    } else if (rawCode === 'resource-exhausted' || rawCode === 'functions/resource-exhausted') {
      code = 'RATE_LIMITED';
    } else {
      code = 'UNKNOWN';
    }
  }

  // Safe sanitized message - never contains raw server text or stack
  const safeMessage = SAFE_ERROR_MESSAGES[code] || SAFE_ERROR_MESSAGES.UNKNOWN;
  return new FirebaseWeeklyPlanningTransportError(code, safeMessage, err);
}

/**
 * Client infrastructure adapter connecting the TutorIA presentation layer to the
 * remote Firebase Callable function `proposeWeeklyPlanning`.
 *
 * Implements WeeklyPlanningProposalSource to integrate into the Planning UI.
 *
 * CRITICAL ARCHITECTURAL & GOVERNANCE INVARIANTS:
 * 1. TRANSPORT ONLY: Generates a transient proposal in memory. Does NOT persist, save draft,
 *    mutate WeeklyPlanning aggregate, submit, approve, evaluate, or select PDA.
 * 2. ZERO CLIENT OPENAI SECRETS: The client adapter never handles OpenAI API keys, endpoints, or prompts.
 * 3. AUTHENTICATION DELEGATION: Relies purely on ambient Firebase Authentication. Never manually
 *    attaches or serializes teacher UID, email, or auth tokens in the payload.
 * 4. UNTRUSTED DATA BOUNDARY: All responses from the remote gateway are treated as untrusted
 *    external data and strictly validated against canonical proposal invariants.
 * 5. SAFE ERROR MAPPING: Prevents raw internal infrastructure or upstream OpenAI errors from
 *    leaking to the pedagogical UI.
 */
export class FirebaseWeeklyPlanningProposalSource implements WeeklyPlanningProposalSource {
  private readonly config: FirebaseWeeklyPlanningProposalSourceConfig;
  private operationalContext?: WeeklyPlanningOperationalContext;

  constructor(config: FirebaseWeeklyPlanningProposalSourceConfig = {}) {
    this.config = config;
    if (typeof config.operationalContext === 'object' && config.operationalContext !== null) {
      this.operationalContext = config.operationalContext;
    }
  }

  /**
   * Sets or updates the operational authorization context (daycareId, roomId).
   */
  public setOperationalContext(context: WeeklyPlanningOperationalContext): void {
    this.operationalContext = context;
  }

  /**
   * Gets the currently active operational authorization context.
   */
  public getOperationalContext(): WeeklyPlanningOperationalContext | undefined {
    return this.operationalContext;
  }

  /**
   * Requests a 5-day weekly planning proposal from the remote Firebase Callable `proposeWeeklyPlanning`.
   *
   * Validates the request, attaches operational authorization metadata, invokes the callable,
   * enforces fail-closed untrusted response validation, and returns transient proposed days.
   */
  public async propose(
    request: WeeklyPlanningProposalRequest
  ): Promise<WeeklyPlanningProposalResponse> {
    // 1. Validate application request contract
    validateWeeklyPlanningProposalRequest(request);

    // 2. Resolve operational authorization context (daycareId, roomId)
    let opCtx = this.operationalContext;
    if (typeof this.config.operationalContext === 'function') {
      const resolved = await this.config.operationalContext();
      if (resolved) {
        opCtx = resolved;
      }
    }

    // 3. Map application request strictly to server gateway payload
    // PRIVACY & DATA MINIMIZATION: Omit UID, tokens, teacher email, and lifecycle fields.
    const payload: ProposeWeeklyPlanningGatewayRequest = {
      weekStart: request.weekStart,
      weekEnd: request.weekEnd,
      modality: request.modality,
      room: {
        roomId: opCtx?.roomId || request.room.roomId,
        name: request.room.name,
        minAgeMonths: request.room.minAgeMonths,
        maxAgeMonths: request.room.maxAgeMonths,
      },
      currentContext: {
        observations: request.currentContext.observations || '',
        identifiedNeeds: request.currentContext.identifiedNeeds || '',
        specialSituations: request.currentContext.specialSituations || '',
        availableMaterials: request.currentContext.availableMaterials || '',
      },
      ...(request.constraints ? { constraints: request.constraints } : {}),
      ...(opCtx?.daycareId ? { daycareId: opCtx.daycareId } : {}),
    };

    // 4. Invoke Firebase Callable through injected transport or live Functions SDK
    let rawResult: unknown;
    try {
      const response = await this.invokeCallable(payload);
      rawResult =
        response && typeof response === 'object' && 'data' in response
          ? (response as { data: unknown }).data
          : response;
    } catch (err: unknown) {
      throw mapFirebaseCallableError(err);
    }

    // 5. Treat remote response as UNTRUSTED and extract candidate proposal
    if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
      throw new FirebaseWeeklyPlanningTransportError(
        'INVALID_RESPONSE',
        SAFE_ERROR_MESSAGES.INVALID_RESPONSE,
        new Error('Remote callable returned non-object response.')
      );
    }

    const rawRecord = rawResult as Record<string, unknown>;
    let candidate: unknown;

    if ('proposal' in rawRecord) {
      candidate = rawRecord.proposal;
    } else if ('days' in rawRecord) {
      candidate = rawResult;
    } else {
      throw new FirebaseWeeklyPlanningTransportError(
        'INVALID_RESPONSE',
        SAFE_ERROR_MESSAGES.INVALID_RESPONSE,
        new Error("Remote response missing required 'proposal' or 'days' property.")
      );
    }

    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new FirebaseWeeklyPlanningTransportError(
        'INVALID_RESPONSE',
        SAFE_ERROR_MESSAGES.INVALID_RESPONSE,
        new Error('Extracted proposal candidate is not a valid non-null object.')
      );
    }

    // 6. Strict check for forbidden lifecycle, governance, evaluation, and traceability fields
    scanForForbiddenResponseKeys(rawResult);
    scanForForbiddenResponseKeys(candidate);

    // 7. Validate candidate using canonical WeeklyPlanningProposalResponse contract validator
    let validatedProposal: WeeklyPlanningProposalResponse;
    try {
      validatedProposal = validateWeeklyPlanningProposalResponse(
        candidate as WeeklyPlanningProposalResponse,
        request.constraints
      );
    } catch (validationErr: unknown) {
      throw new FirebaseWeeklyPlanningTransportError(
        'INVALID_RESPONSE',
        SAFE_ERROR_MESSAGES.INVALID_RESPONSE,
        validationErr
      );
    }

    // 8. Return transient validated proposal (never persisted, never mutated)
    return validatedProposal;
  }

  private async invokeCallable(
    payload: ProposeWeeklyPlanningGatewayRequest
  ): Promise<{ data: unknown }> {
    if (this.config.callableFn) {
      return this.config.callableFn(payload);
    }

    let functionsInstance = this.config.functions;
    if (!functionsInstance) {
      const appInstance = this.config.app ?? (await this.resolveDefaultApp());
      functionsInstance = getFunctions(appInstance, this.config.region || 'us-central1');
    }

    const callable = this.config.callableFactory
      ? this.config.callableFactory(functionsInstance, 'proposeWeeklyPlanning')
      : httpsCallable<ProposeWeeklyPlanningGatewayRequest, unknown>(
          functionsInstance,
          'proposeWeeklyPlanning'
        );

    return callable(payload);
  }

  private async resolveDefaultApp(): Promise<FirebaseApp> {
    const { app } = await import('../firebase/firebaseConfig');
    return app;
  }
}
