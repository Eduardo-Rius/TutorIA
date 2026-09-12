import {
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  DIRECT_PDA_CATALOG_BY_ID,
} from './DirectCurricularCatalog';

/**
 * Explicit domain representation of a canonical DIRECT PDA reference.
 *
 * pdaId references TutorIA's internal canonical identity (TUTORIA-PDA-0001 .. TUTORIA-PDA-0040).
 * catalogRevision guarantees strict binding to the active internal catalog revision.
 */
export interface CurricularPDAReference {
  readonly pdaId: string;
  readonly catalogRevision: string;
}

export class InvalidCurricularReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCurricularReferenceError';
  }
}

/**
 * Factory function to create a validated, immutable CurricularPDAReference.
 */
export function createCurricularPDAReference(
  pdaId: string,
  catalogRevision: string = TUTORIA_DIRECT_PDA_CATALOG_REVISION
): CurricularPDAReference {
  const ref = Object.freeze({ pdaId, catalogRevision });
  validateCurricularPDAReference(ref);
  return ref;
}

/**
 * Validates a single CurricularPDAReference against the canonical catalog.
 */
export function validateCurricularPDAReference(
  ref: CurricularPDAReference,
  expectedRevision: string = TUTORIA_DIRECT_PDA_CATALOG_REVISION
): void {
  if (!ref || typeof ref !== 'object') {
    throw new InvalidCurricularReferenceError('Curricular reference must be a valid object');
  }
  if (!ref.pdaId || typeof ref.pdaId !== 'string') {
    throw new InvalidCurricularReferenceError('Curricular reference must contain a non-empty string pdaId');
  }
  if (ref.catalogRevision !== expectedRevision) {
    throw new InvalidCurricularReferenceError(
      `Unknown catalog revision '${ref.catalogRevision}'. Expected '${expectedRevision}'.`
    );
  }
  if (!DIRECT_PDA_CATALOG_BY_ID.has(ref.pdaId)) {
    throw new InvalidCurricularReferenceError(
      `Unknown PDA ID '${ref.pdaId}'. Must exist in canonical catalog.`
    );
  }
}

/**
 * Validates an array of CurricularPDAReferences.
 * Rejects invalid entries, unknown IDs, unknown revisions, and duplicates.
 */
export function validateCurricularPDAReferences(
  refs: readonly CurricularPDAReference[],
  expectedRevision: string = TUTORIA_DIRECT_PDA_CATALOG_REVISION
): void {
  if (!Array.isArray(refs)) {
    throw new InvalidCurricularReferenceError('Curricular references collection must be an array');
  }
  const seenIds = new Set<string>();
  for (const ref of refs) {
    validateCurricularPDAReference(ref, expectedRevision);
    if (seenIds.has(ref.pdaId)) {
      throw new InvalidCurricularReferenceError(
        `Duplicate PDA ID '${ref.pdaId}' is not allowed in the same activity.`
      );
    }
    seenIds.add(ref.pdaId);
  }
}
