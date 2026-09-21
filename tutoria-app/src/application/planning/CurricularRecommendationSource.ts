import {
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
} from '../../domain/planning/DirectCurricularCatalog';
import type { CurricularPDAReference } from '../../domain/planning/CurricularPDAReference';
import { validateCurricularPDAReference } from '../../domain/planning/CurricularPDAReference';
import type { Room } from '../../domain/planning/RoomCatalog';
import type { WeeklyContextSnapshot } from '../../domain/planning/WeeklyPlanning';

/**
 * Custom error thrown when a curricular recommendation or request violates
 * canonical contract invariants.
 */
export class InvalidCurricularRecommendationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCurricularRecommendationError';
  }
}

/**
 * Application-level request contract for proposing curricular recommendations
 * for a single pedagogical activity in Prestación Directa.
 *
 * Enriched under H1R9-F.8.3.1 with canonical room/group and weekly context
 * to support rich contextual prompting by future AI providers.
 */
export interface CurricularRecommendationRequest {
  readonly activityId: string;
  readonly activityTitle: string;
  readonly description?: string;
  readonly category?: string;
  readonly modality: 'DIRECT';
  readonly catalogRevision?: string;
  readonly objective?: string;
  readonly room?: Room;
  readonly weeklyContext?: WeeklyContextSnapshot;
  readonly materials?: readonly string[];
  readonly durationMinutes?: number;
}

/**
 * Application-level recommendation result item.
 * Represents a transient recommendation proposed by TutorIA for Anita's human decision.
 *
 * CRITICAL:
 * - reference: canonical PDA reference (pdaId + catalogRevision)
 * - rationale: transient human-readable explanation (NOT persisted into domain curricularTraceability)
 * - NO confidence scores or probabilistic rankings are permitted.
 */
export interface CurricularRecommendation {
  readonly reference: CurricularPDAReference;
  readonly rationale: string;
}

/**
 * Validates a CurricularRecommendationRequest ensuring it satisfies all canonical invariants.
 */
export function validateCurricularRecommendationRequest(
  request: CurricularRecommendationRequest
): void {
  if (!request || typeof request !== 'object') {
    throw new InvalidCurricularRecommendationError('Recommendation request must be a valid object.');
  }

  if (!request.activityId || typeof request.activityId !== 'string' || !request.activityId.trim()) {
    throw new InvalidCurricularRecommendationError('Recommendation request must contain a non-empty string activityId.');
  }

  if (!request.activityTitle || typeof request.activityTitle !== 'string' || !request.activityTitle.trim()) {
    throw new InvalidCurricularRecommendationError('Recommendation request must contain a non-empty string activityTitle.');
  }

  if (request.modality !== 'DIRECT') {
    throw new InvalidCurricularRecommendationError(
      `Curricular recommendation contract strictly supports 'DIRECT' modality only. Received '${(request as any).modality}'.`
    );
  }

  if (
    request.catalogRevision !== undefined &&
    request.catalogRevision !== TUTORIA_DIRECT_PDA_CATALOG_REVISION
  ) {
    throw new InvalidCurricularRecommendationError(
      `Unknown catalog revision '${request.catalogRevision}'. Expected '${TUTORIA_DIRECT_PDA_CATALOG_REVISION}'.`
    );
  }

  if (request.room !== undefined) {
    if (!request.room || typeof request.room !== 'object' || typeof request.room.roomId !== 'string' || !request.room.roomId.trim()) {
      throw new InvalidCurricularRecommendationError('Invalid room context in recommendation request.');
    }
  }

  if (request.weeklyContext !== undefined) {
    if (!request.weeklyContext || typeof request.weeklyContext !== 'object') {
      throw new InvalidCurricularRecommendationError('Invalid weeklyContext in recommendation request.');
    }
  }

  if (request.durationMinutes !== undefined && (typeof request.durationMinutes !== 'number' || request.durationMinutes <= 0)) {
    throw new InvalidCurricularRecommendationError('Invalid durationMinutes in recommendation request.');
  }

  if (request.materials !== undefined && !Array.isArray(request.materials)) {
    throw new InvalidCurricularRecommendationError('Invalid materials collection in recommendation request.');
  }
}

/**
 * Validates a single CurricularRecommendation ensuring its reference resolves against the
 * canonical DIRECT catalog and no forbidden fields (such as confidence scores) are present.
 */
export function validateCurricularRecommendation(
  rec: CurricularRecommendation,
  expectedRevision: string = TUTORIA_DIRECT_PDA_CATALOG_REVISION
): void {
  if (!rec || typeof rec !== 'object') {
    throw new InvalidCurricularRecommendationError('Recommendation must be a valid object.');
  }

  // Strict check: confidence scores are forbidden
  if (
    'confidence' in rec ||
    'confidenceScore' in rec ||
    'probability' in rec ||
    'rankingConfidence' in rec ||
    'score' in rec
  ) {
    throw new InvalidCurricularRecommendationError(
      'Confidence scores are strictly forbidden in curricular recommendations.'
    );
  }

  if (!rec.reference || typeof rec.reference !== 'object') {
    throw new InvalidCurricularRecommendationError('Recommendation must contain a valid reference object.');
  }

  try {
    validateCurricularPDAReference(rec.reference, expectedRevision);
  } catch (err: any) {
    throw new InvalidCurricularRecommendationError(
      `Invalid canonical PDA reference in recommendation: ${err.message}`
    );
  }

  if (typeof rec.rationale !== 'string' || !rec.rationale.trim()) {
    throw new InvalidCurricularRecommendationError('Recommendation rationale must be a non-empty string.');
  }
}

/**
 * Validates a collection of CurricularRecommendations.
 * 0 recommendations is valid.
 * Multiple recommendations are valid.
 * Duplicates, unknown IDs, unknown revisions, and malformed entries are rejected.
 */
export function validateCurricularRecommendations(
  recommendations: readonly CurricularRecommendation[],
  expectedRevision: string = TUTORIA_DIRECT_PDA_CATALOG_REVISION
): readonly CurricularRecommendation[] {
  if (!Array.isArray(recommendations)) {
    throw new InvalidCurricularRecommendationError('Recommendations collection must be an array.');
  }

  const seenPdaIds = new Set<string>();
  const validated: CurricularRecommendation[] = [];

  for (const rec of recommendations) {
    validateCurricularRecommendation(rec, expectedRevision);

    if (seenPdaIds.has(rec.reference.pdaId)) {
      throw new InvalidCurricularRecommendationError(
        `Duplicate PDA recommendation for '${rec.reference.pdaId}' is rejected.`
      );
    }
    seenPdaIds.add(rec.reference.pdaId);

    validated.push(Object.freeze({
      reference: Object.freeze({
        pdaId: rec.reference.pdaId,
        catalogRevision: rec.reference.catalogRevision,
      }),
      rationale: rec.rationale.trim(),
    }));
  }

  return Object.freeze(validated);
}

/**
 * Port/Source abstraction for proposing curricular recommendations.
 * Allows future AI backends without coupling the domain/application to any specific LLM provider.
 */
export interface CurricularRecommendationSource {
  recommend(
    request: CurricularRecommendationRequest
  ): Promise<readonly CurricularRecommendation[]>;
}

/**
 * Application coordinating service that guarantees validation and invariant enforcement
 * across the recommendation boundary.
 */
export class CurricularRecommendationService {
  constructor(private readonly source: CurricularRecommendationSource) {}

  public async getRecommendations(
    request: CurricularRecommendationRequest
  ): Promise<readonly CurricularRecommendation[]> {
    validateCurricularRecommendationRequest(request);
    const rawRecommendations = await this.source.recommend(request);
    const expectedRevision = request.catalogRevision || TUTORIA_DIRECT_PDA_CATALOG_REVISION;
    return validateCurricularRecommendations(rawRecommendations, expectedRevision);
  }
}
