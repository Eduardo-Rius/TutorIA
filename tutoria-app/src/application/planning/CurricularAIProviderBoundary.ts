import {
  CurricularRecommendation,
  CurricularRecommendationRequest,
  CurricularRecommendationSource,
  InvalidCurricularRecommendationError,
  validateCurricularRecommendationRequest,
} from './CurricularRecommendationSource';
import {
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  DIRECT_PDA_CATALOG_BY_ID,
} from '../../domain/planning/DirectCurricularCatalog';

/**
 * Untrusted candidate item as returned by an external AI provider.
 * All fields are typed as unknown to force rigorous boundary validation.
 */
export interface UntrustedAICurricularCandidate {
  readonly pdaId?: unknown;
  readonly rationale?: unknown;
  readonly [key: string]: unknown;
}

/**
 * Port representing an external real AI provider (e.g. OpenAI, Gemini, Azure, Anthropic).
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * 1. The provider is passed the rich pedagogical context from CurricularRecommendationRequest.
 * 2. Its output is considered 100% UNTRUSTED INPUT.
 * 3. It cannot become a second curricular catalog.
 * 4. Any noncanonical, hallucinated, or malformed item is intercepted and rejected
 *    before reaching application or domain layers.
 */
export interface CurricularAIProvider {
  generateRawRecommendations(
    request: CurricularRecommendationRequest
  ): Promise<unknown>;
}

/**
 * Validates untrusted raw output from an external AI provider against the canonical DIRECT PDA catalog.
 *
 * ENFORCEMENT RULES:
 * 1. Output must be a valid array or object containing a `recommendations` array.
 * 2. Every candidate must specify a canonical pdaId present in DIRECT_PDA_CATALOG_BY_ID.
 * 3. Invented/hallucinated identifiers (such as TUTORIA-PDA-9999) are strictly rejected.
 * 4. Confidence scores, probabilities, and numeric rankings are strictly forbidden.
 * 5. Pedagogical rationale must be a non-empty string.
 * 6. Duplicate recommendations for the same PDA are strictly rejected.
 */
export function validateUntrustedAIResponse(
  rawResponse: unknown,
  expectedRevision: string = TUTORIA_DIRECT_PDA_CATALOG_REVISION
): readonly CurricularRecommendation[] {
  if (rawResponse === null || rawResponse === undefined) {
    throw new InvalidCurricularRecommendationError(
      'External AI provider returned null or undefined response.'
    );
  }

  let candidates: unknown[];

  if (Array.isArray(rawResponse)) {
    candidates = rawResponse;
  } else if (typeof rawResponse === 'object' && 'recommendations' in (rawResponse as any)) {
    const recs = (rawResponse as any).recommendations;
    if (!Array.isArray(recs)) {
      throw new InvalidCurricularRecommendationError(
        'External AI provider recommendations property must be an array.'
      );
    }
    candidates = recs;
  } else {
    throw new InvalidCurricularRecommendationError(
      'External AI provider response must be an array or an object containing a recommendations array.'
    );
  }

  const seenPdaIds = new Set<string>();
  const validated: CurricularRecommendation[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];

    if (!item || typeof item !== 'object') {
      throw new InvalidCurricularRecommendationError(
        `Recommendation candidate at index ${i} must be a valid object.`
      );
    }

    const candidate = item as Record<string, unknown>;

    // Strict boundary rule: confidence scores are forbidden
    if (
      'confidence' in candidate ||
      'confidenceScore' in candidate ||
      'probability' in candidate ||
      'rankingConfidence' in candidate ||
      'score' in candidate
    ) {
      throw new InvalidCurricularRecommendationError(
        `Confidence scores are strictly forbidden in curricular recommendations (candidate at index ${i}).`
      );
    }

    // Check pdaId
    const pdaId = candidate.pdaId;
    if (typeof pdaId !== 'string' || !pdaId.trim()) {
      throw new InvalidCurricularRecommendationError(
        `Recommendation candidate at index ${i} must contain a non-empty string pdaId.`
      );
    }

    const trimmedPdaId = pdaId.trim();

    // Canonical trust boundary: PDA MUST exist in canonical catalog
    if (!DIRECT_PDA_CATALOG_BY_ID.has(trimmedPdaId)) {
      throw new InvalidCurricularRecommendationError(
        `Untrusted AI provider proposed noncanonical PDA identifier '${trimmedPdaId}'. ` +
        `Only canonical PDA references from catalog revision '${expectedRevision}' are permitted.`
      );
    }

    // Check rationale
    const rationale = candidate.rationale;
    if (typeof rationale !== 'string' || !rationale.trim()) {
      throw new InvalidCurricularRecommendationError(
        `Recommendation candidate at index ${i} must contain a non-empty string rationale.`
      );
    }

    // Reject duplicate suggestions
    if (seenPdaIds.has(trimmedPdaId)) {
      throw new InvalidCurricularRecommendationError(
        `Duplicate recommendation for PDA '${trimmedPdaId}' returned by external AI provider.`
      );
    }
    seenPdaIds.add(trimmedPdaId);

    validated.push(
      Object.freeze({
        reference: Object.freeze({
          pdaId: trimmedPdaId,
          catalogRevision: expectedRevision,
        }),
        rationale: rationale.trim(),
      })
    );
  }

  return Object.freeze(validated);
}

/**
 * Boundary adapter wrapping any CurricularAIProvider.
 * Implements CurricularRecommendationSource to integrate seamlessly into
 * CurricularRecommendationService while enforcing untrusted input boundaries.
 */
export class CurricularAIProviderBoundary implements CurricularRecommendationSource {
  constructor(
    private readonly provider: CurricularAIProvider,
    private readonly defaultRevision: string = TUTORIA_DIRECT_PDA_CATALOG_REVISION
  ) {}

  public async recommend(
    request: CurricularRecommendationRequest
  ): Promise<readonly CurricularRecommendation[]> {
    validateCurricularRecommendationRequest(request);

    const revision = request.catalogRevision || this.defaultRevision;
    const raw = await this.provider.generateRawRecommendations(request);

    return validateUntrustedAIResponse(raw, revision);
  }
}
