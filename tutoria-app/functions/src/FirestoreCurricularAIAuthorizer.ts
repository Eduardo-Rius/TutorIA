import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import type {
  CurricularAIAuthorizationContext,
  CurricularAIAuthorizationResult,
  CurricularAIAuthorizer,
} from './recommendCurricularPDA';

/**
 * Persisted Firestore representation of /authorizationContexts/{authUid}.
 * Narrow structural server-side projection for curricular AI authorization.
 * Strict date representations accepted: JavaScript Date or Firestore Timestamp-like object.
 */
export interface PersistedAuthorizationContextDoc {
  readonly authUid?: string;
  readonly personId?: string;
  readonly assignmentId?: string;
  readonly institutionalRole?: string;
  readonly authorizedDaycareIds?: readonly string[];
  readonly roomIds?: readonly string[];
  readonly active?: boolean;
  readonly validFrom?: Date | { toMillis(): number } | { toDate(): Date } | null;
  readonly validTo?: Date | { toMillis(): number } | { toDate(): Date } | null;
}

/**
 * Narrow document-reader seam for Firestore authorization context lookup.
 * Returns null or undefined if document does not exist.
 */
export type AuthorizationContextReader = (
  uid: string
) => Promise<PersistedAuthorizationContextDoc | null | undefined>;

/**
 * Options for configuring FirestoreCurricularAIAuthorizer.
 */
export interface FirestoreCurricularAIAuthorizerOptions {
  readonly reader?: AuthorizationContextReader;
  readonly nowProvider?: () => Date;
}

/**
 * Lazy singleton for Firebase Admin Firestore.
 * Ensures zero remote network reads upon module import.
 * Relies on Firebase Functions runtime credentials in production.
 * Fails safely and immediately without network hangs if runtime environment is unconfigured.
 */
let adminApp: App | undefined;
let firestoreDb: Firestore | undefined;

export function getProductionFirestore(): Firestore {
  if (!firestoreDb) {
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
    } else {
      const hasFirebaseEnvironment = Boolean(
        process.env.GCLOUD_PROJECT ||
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.FIREBASE_CONFIG ||
          process.env.FIRESTORE_EMULATOR_HOST
      );
      if (!hasFirebaseEnvironment) {
        throw new Error(
          'Production authorization context is unresolved: Firebase environment is not configured.'
        );
      }
      adminApp = initializeApp();
    }
    firestoreDb = getFirestore(adminApp);
  }
  return firestoreDb;
}

/**
 * Default production document reader querying /authorizationContexts/{uid}.
 * Firestore is lazily obtained only when reader is invoked.
 */
export function createFirestoreAuthorizationContextReader(): AuthorizationContextReader {
  return async (uid: string): Promise<PersistedAuthorizationContextDoc | null> => {
    const db = getProductionFirestore();
    const docRef = db.collection('authorizationContexts').doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) {
      return null;
    }
    return snap.data() as PersistedAuthorizationContextDoc;
  };
}

/**
 * Normalizes supported Firestore date representations to epoch milliseconds.
 * Strictly accepts only:
 * 1. JavaScript Date instances with finite timestamp.
 * 2. Firestore Timestamp-like objects with toMillis() and/or toDate().
 *
 * All other types (string, number, boolean, array, plain object, etc.) are strictly rejected.
 * Any thrown exception from method calls is caught and yields null (fail-closed).
 */
export function parseDateToMillis(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return !isNaN(time) && Number.isFinite(time) ? time : null;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return null;
    }

    const candidate = value as Record<string, unknown>;

    if ('toMillis' in candidate && typeof candidate.toMillis === 'function') {
      try {
        const ms = (candidate.toMillis as () => unknown)();
        if (typeof ms === 'number' && !isNaN(ms) && Number.isFinite(ms)) {
          return ms;
        }
        return null;
      } catch {
        return null;
      }
    }

    if ('toDate' in candidate && typeof candidate.toDate === 'function') {
      try {
        const d = (candidate.toDate as () => unknown)();
        if (d instanceof Date) {
          const ms = d.getTime();
          if (!isNaN(ms) && Number.isFinite(ms)) {
            return ms;
          }
        }
        return null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Firestore-backed Curricular AI Authorizer.
 *
 * Enforces server-side authorization invariants:
 * - UID must be present and nonblank (derived from verified request.auth.uid).
 * - Authoritative document /authorizationContexts/{uid} must exist.
 * - active === true.
 * - institutionalRole === 'TEACHER'.
 * - authorizedDaycareIds must be an array of length exactly 1 with a nonblank ID.
 * - validFrom exists, is valid (Date or Timestamp), and validFrom <= authorization evaluation time.
 * - validTo is null/undefined or valid (Date or Timestamp) and >= authorization evaluation time.
 * - Fails closed on any discrepancy, clock error, or Firestore lookup failure without leaking details.
 */
export class FirestoreCurricularAIAuthorizer {
  private readonly reader: AuthorizationContextReader;
  private readonly nowProvider: () => Date;

  constructor(options: FirestoreCurricularAIAuthorizerOptions = {}) {
    this.reader = options.reader ?? createFirestoreAuthorizationContextReader();
    this.nowProvider = options.nowProvider ?? (() => new Date());
  }

  public authorize: CurricularAIAuthorizer = async (
    context: CurricularAIAuthorizationContext
  ): Promise<CurricularAIAuthorizationResult> => {
    // 1. UID present and nonblank
    if (!context || typeof context.uid !== 'string' || context.uid.trim().length === 0) {
      return {
        authorized: false,
        reason: 'Missing or blank caller UID: caller is unauthenticated or identity is unresolved.',
      };
    }

    const uid = context.uid.trim();

    // 2. Authoritative context document lookup via reader seam (fail-closed, sanitized)
    let doc: PersistedAuthorizationContextDoc | null | undefined;
    try {
      doc = await this.reader(uid);
    } catch {
      // Fail closed. Never leak internal/Firestore error details to client.
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

    // 4. institutionalRole === 'TEACHER'
    if (doc.institutionalRole !== 'TEACHER') {
      return {
        authorized: false,
        reason: `Role '${doc.institutionalRole ?? 'UNKNOWN'}' is not authorized for curricular AI recommendations. Only TEACHER is permitted.`,
      };
    }

    // 5 & 6. authorizedDaycareIds is an array with length === 1
    if (!Array.isArray(doc.authorizedDaycareIds) || doc.authorizedDaycareIds.length !== 1) {
      return {
        authorized: false,
        reason: 'TEACHER role must be assigned to exactly one authorized daycare center.',
      };
    }

    // 7. Its single daycare ID is a nonblank string
    const daycareId = doc.authorizedDaycareIds[0];
    if (typeof daycareId !== 'string' || daycareId.trim().length === 0) {
      return {
        authorized: false,
        reason: 'Authorized daycare ID must be a nonblank string.',
      };
    }

    // Time boundary evaluation: evaluate evaluation clock safely
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

    // 8 & 9. validFrom exists, is valid, and validFrom <= now
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

    // 10. validTo is null/undefined OR valid and >= now
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

    // All conditions satisfied: ALLOW
    return {
      authorized: true,
    };
  };
}

/**
 * Factory creating a CurricularAIAuthorizer function backed by FirestoreCurricularAIAuthorizer.
 */
export function createFirestoreCurricularAIAuthorizer(
  options: FirestoreCurricularAIAuthorizerOptions = {}
): CurricularAIAuthorizer {
  const instance = new FirestoreCurricularAIAuthorizer(options);
  return instance.authorize;
}
