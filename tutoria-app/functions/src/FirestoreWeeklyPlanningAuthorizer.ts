import {
  parseDateToMillis,
  createFirestoreAuthorizationContextReader,
  type PersistedAuthorizationContextDoc,
  type AuthorizationContextReader,
} from './FirestoreCurricularAIAuthorizer';

/**
 * Context passed to the Weekly Planning authorization seam.
 */
export interface WeeklyPlanningAuthorizationContext {
  readonly uid: string;
  readonly tokenClaims?: Record<string, unknown> | undefined;
  readonly daycareId?: string | undefined;
  readonly roomId?: string | undefined;
  readonly planningId?: string | undefined;
}

/**
 * Decision returned by the Weekly Planning authorization seam.
 */
export interface WeeklyPlanningAuthorizationResult {
  readonly authorized: boolean;
  readonly reason?: string | undefined;
}

/**
 * Weekly Planning Authorizer port.
 */
export type WeeklyPlanningAuthorizer = (
  context: WeeklyPlanningAuthorizationContext
) => Promise<WeeklyPlanningAuthorizationResult>;

/**
 * Options for configuring FirestoreWeeklyPlanningAuthorizer.
 */
export interface FirestoreWeeklyPlanningAuthorizerOptions {
  readonly reader?: AuthorizationContextReader;
  readonly nowProvider?: () => Date;
}

/**
 * Firestore-backed Authorizer for Weekly Planning AI Proposals.
 *
 * Verifies that the authenticated caller has active TEACHER authorization
 * within their valid date window and institutional scope (/authorizationContexts/{uid}).
 *
 * CRITICAL ARCHITECTURAL & SECURITY INVARIANTS:
 * 1. Caller UID must be present and non-blank.
 * 2. Document /authorizationContexts/{uid} must exist in Firestore.
 * 3. active === true.
 * 4. institutionalRole === 'TEACHER'. Roles like 'DIRECTOR' or 'SUPERVISOR' are denied.
 * 5. Daycare match: if daycareId is provided in context, teacher must be authorized for it.
 * 6. Room match: if roomId is provided and teacher has roomIds specified, roomId must be authorized.
 * 7. Date window: validFrom <= now <= validTo (if validTo exists).
 * 8. Fails closed on any error, document absence, or mismatch. Never leaks internal details.
 */
export class FirestoreWeeklyPlanningAuthorizer {
  private readonly reader: AuthorizationContextReader;
  private readonly nowProvider: () => Date;

  constructor(options: FirestoreWeeklyPlanningAuthorizerOptions = {}) {
    this.reader = options.reader ?? createFirestoreAuthorizationContextReader();
    this.nowProvider = options.nowProvider ?? (() => new Date());
  }

  public authorize: WeeklyPlanningAuthorizer = async (
    context: WeeklyPlanningAuthorizationContext
  ): Promise<WeeklyPlanningAuthorizationResult> => {
    // 1. UID present and non-blank
    if (!context || typeof context.uid !== 'string' || context.uid.trim().length === 0) {
      return {
        authorized: false,
        reason: 'Missing or blank caller UID: caller is unauthenticated or identity is unresolved.',
      };
    }

    const uid = context.uid.trim();

    // 2. Authoritative context document lookup via reader seam (fail-closed)
    let doc: PersistedAuthorizationContextDoc | null | undefined;
    try {
      doc = await this.reader(uid);
    } catch {
      return {
        authorized: false,
        reason: 'Production authorization context is unresolved: authorization service error.',
      };
    }

    if (!doc) {
      return {
        authorized: false,
        reason: 'Production authorization context is unresolved: authorization document not found.',
      };
    }

    // 3. active === true
    if (doc.active !== true) {
      return {
        authorized: false,
        reason: 'Authorization context is inactive.',
      };
    }

    // 4. institutionalRole === 'TEACHER' strictly
    if (doc.institutionalRole !== 'TEACHER') {
      return {
        authorized: false,
        reason: `Role '${doc.institutionalRole ?? 'UNKNOWN'}' is not authorized for weekly planning AI proposals. Only TEACHER is permitted.`,
      };
    }

    // 5. Authorized daycares check
    if (!Array.isArray(doc.authorizedDaycareIds) || doc.authorizedDaycareIds.length === 0) {
      return {
        authorized: false,
        reason: 'TEACHER role must be assigned to at least one authorized daycare center.',
      };
    }

    // If context specifies a daycareId, verify assignment
    if (context.daycareId && typeof context.daycareId === 'string' && context.daycareId.trim()) {
      const targetDaycare = context.daycareId.trim();
      if (!doc.authorizedDaycareIds.includes(targetDaycare)) {
        return {
          authorized: false,
          reason: 'Teacher is not authorized for the requested daycare center.',
        };
      }
    }

    // 6. Optional room restriction check
    if (context.roomId && typeof context.roomId === 'string' && context.roomId.trim()) {
      if (Array.isArray(doc.roomIds) && doc.roomIds.length > 0) {
        const targetRoom = context.roomId.trim();
        if (!doc.roomIds.includes(targetRoom)) {
          return {
            authorized: false,
            reason: 'Teacher is not authorized for the requested room.',
          };
        }
      }
    }

    // 7. Time boundary evaluation
    let nowMillis: number;
    try {
      const now = this.nowProvider();
      if (!(now instanceof Date)) {
        return {
          authorized: false,
          reason: 'Authorization evaluation clock is invalid.',
        };
      }
      nowMillis = now.getTime();
      if (isNaN(nowMillis) || !Number.isFinite(nowMillis)) {
        return {
          authorized: false,
          reason: 'Authorization evaluation clock is invalid.',
        };
      }
    } catch {
      return {
        authorized: false,
        reason: 'Authorization evaluation clock is unavailable.',
      };
    }

    // validFrom exists, is valid, and validFrom <= now
    if (doc.validFrom === null || doc.validFrom === undefined) {
      return {
        authorized: false,
        reason: 'Authorization context lacks validFrom timestamp.',
      };
    }
    const validFromMillis = parseDateToMillis(doc.validFrom);
    if (validFromMillis === null) {
      return {
        authorized: false,
        reason: 'Authorization context validFrom timestamp is malformed.',
      };
    }
    if (validFromMillis > nowMillis) {
      return {
        authorized: false,
        reason: 'Authorization context is not yet valid.',
      };
    }

    // validTo is null/undefined OR valid and >= now
    if (doc.validTo !== null && doc.validTo !== undefined) {
      const validToMillis = parseDateToMillis(doc.validTo);
      if (validToMillis === null) {
        return {
          authorized: false,
          reason: 'Authorization context validTo timestamp is malformed.',
        };
      }
      if (validToMillis < nowMillis) {
        return {
          authorized: false,
          reason: 'Authorization context has expired.',
        };
      }
    }

    return { authorized: true };
  };
}

/**
 * Creates an instance of FirestoreWeeklyPlanningAuthorizer.
 */
export function createFirestoreWeeklyPlanningAuthorizer(
  options: FirestoreWeeklyPlanningAuthorizerOptions = {}
): WeeklyPlanningAuthorizer {
  const authorizer = new FirestoreWeeklyPlanningAuthorizer(options);
  return (context: WeeklyPlanningAuthorizationContext) => authorizer.authorize(context);
}
