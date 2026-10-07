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
  readonly id?: unknown;
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
 * Stable, machine-readable safe diagnostic codes for canonical boundary rejection.
 * Strict invariant: Never exposes pedagogical narrative, user data, or model responses.
 */
export type CanonicalValidationDiagnosticCode =
  | 'unexpected_root_type'
  | 'missing_recommendations_array'
  | 'invalid_recommendation_object'
  | 'missing_pda_id'
  | 'noncanonical_pda_id'
  | 'missing_rationale'
  | 'duplicate_pda'
  | 'forbidden_confidence'
  | 'other_canonical_validation';

/**
 * Safe structural metadata characterizing the model response shape without leaking content.
 */
export interface SafeStructuralMetadata {
  readonly rootType?: string;
  readonly topLevelKeys?: readonly string[];
  readonly recommendationCount?: number;
  readonly candidateKeys?: readonly string[];
  readonly identifierFieldPresent?: 'pdaId' | 'id' | 'neither';
  readonly canonicalIdMatch?: boolean;
  readonly rationalePresent?: boolean;
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
      'External AI provider returned null or undefined response.',
      {
        diagnosticCode: 'unexpected_root_type',
        safeStructuralMetadata: {
          rootType: rawResponse === null ? 'null' : 'undefined',
        },
      }
    );
  }

  let candidates: unknown[];
  let topLevelKeys: readonly string[] | undefined;

  if (Array.isArray(rawResponse)) {
    candidates = rawResponse;
  } else if (typeof rawResponse === 'object') {
    topLevelKeys = Object.keys(rawResponse as object).slice(0, 10);
    if ('recommendations' in (rawResponse as any)) {
      const recs = (rawResponse as any).recommendations;
      if (!Array.isArray(recs)) {
        throw new InvalidCurricularRecommendationError(
          'External AI provider recommendations property must be an array.',
          {
            diagnosticCode: 'missing_recommendations_array',
            safeStructuralMetadata: {
              rootType: 'object',
              topLevelKeys,
            },
          }
        );
      }
      candidates = recs;
    } else {
      throw new InvalidCurricularRecommendationError(
        'External AI provider response must be an array or an object containing a recommendations array.',
        {
          diagnosticCode: 'missing_recommendations_array',
          safeStructuralMetadata: {
            rootType: 'object',
            topLevelKeys,
          },
        }
      );
    }
  } else {
    throw new InvalidCurricularRecommendationError(
      'External AI provider response must be an array or an object containing a recommendations array.',
      {
        diagnosticCode: 'unexpected_root_type',
        safeStructuralMetadata: {
          rootType: typeof rawResponse,
        },
      }
    );
  }

  const recommendationCount = candidates.length;
  const rootType = Array.isArray(rawResponse) ? 'array' : 'object';

  const seenPdaIds = new Set<string>();
  const validated: CurricularRecommendation[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];

    if (!item || typeof item !== 'object') {
      throw new InvalidCurricularRecommendationError(
        `Recommendation candidate at index ${i} must be a valid object.`,
        {
          diagnosticCode: 'invalid_recommendation_object',
          safeStructuralMetadata: {
            rootType,
            topLevelKeys,
            recommendationCount,
          },
        }
      );
    }

    const candidate = item as Record<string, unknown>;
    const candidateKeys = Object.keys(candidate).slice(0, 10);

    // Strict boundary rule: confidence scores are forbidden
    if (
      'confidence' in candidate ||
      'confidenceScore' in candidate ||
      'probability' in candidate ||
      'rankingConfidence' in candidate ||
      'score' in candidate
    ) {
      throw new InvalidCurricularRecommendationError(
        `Confidence scores are strictly forbidden in curricular recommendations (candidate at index ${i}).`,
        {
          diagnosticCode: 'forbidden_confidence',
          safeStructuralMetadata: {
            rootType,
            topLevelKeys,
            recommendationCount,
            candidateKeys,
          },
        }
      );
    }

    // Resolve candidate identifier with strict canonical precedence:
    // candidate.pdaId has primary precedence.
    // candidate.id is tolerated solely as defensive backward compatibility when pdaId is absent.
    const identifierFieldPresent: 'pdaId' | 'id' | 'neither' =
      candidate.pdaId !== undefined
        ? 'pdaId'
        : candidate.id !== undefined
          ? 'id'
          : 'neither';

    let rawIdentifier: unknown;
    if (candidate.pdaId !== undefined) {
      rawIdentifier = candidate.pdaId;
    } else if (candidate.id !== undefined) {
      rawIdentifier = candidate.id;
    } else {
      throw new InvalidCurricularRecommendationError(
        `Recommendation candidate at index ${i} must contain a non-empty string pdaId.`,
        {
          diagnosticCode: 'missing_pda_id',
          safeStructuralMetadata: {
            rootType,
            topLevelKeys,
            recommendationCount,
            candidateKeys,
            identifierFieldPresent: 'neither',
          },
        }
      );
    }

    if (typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
      throw new InvalidCurricularRecommendationError(
        `Recommendation candidate at index ${i} must contain a non-empty string pdaId.`,
        {
          diagnosticCode: 'missing_pda_id',
          safeStructuralMetadata: {
            rootType,
            topLevelKeys,
            recommendationCount,
            candidateKeys,
            identifierFieldPresent,
          },
        }
      );
    }

    const trimmedPdaId = rawIdentifier.trim();

    // Canonical trust boundary: PDA MUST exist in canonical catalog
    if (!DIRECT_PDA_CATALOG_BY_ID.has(trimmedPdaId)) {
      throw new InvalidCurricularRecommendationError(
        `Untrusted AI provider proposed noncanonical PDA identifier '${trimmedPdaId}'. ` +
        `Only canonical PDA references from catalog revision '${expectedRevision}' are permitted.`,
        {
          diagnosticCode: 'noncanonical_pda_id',
          safeStructuralMetadata: {
            rootType,
            topLevelKeys,
            recommendationCount,
            candidateKeys,
            identifierFieldPresent,
            canonicalIdMatch: false,
          },
        }
      );
    }

    // Check rationale
    const rationale = candidate.rationale;
    const rationalePresent = typeof rationale === 'string' && rationale.trim().length > 0;
    if (!rationalePresent) {
      throw new InvalidCurricularRecommendationError(
        `Recommendation candidate at index ${i} must contain a non-empty string rationale.`,
        {
          diagnosticCode: 'missing_rationale',
          safeStructuralMetadata: {
            rootType,
            topLevelKeys,
            recommendationCount,
            candidateKeys,
            identifierFieldPresent,
            canonicalIdMatch: true,
            rationalePresent: false,
          },
        }
      );
    }

    // Reject duplicate suggestions
    if (seenPdaIds.has(trimmedPdaId)) {
      throw new InvalidCurricularRecommendationError(
        `Duplicate recommendation for PDA '${trimmedPdaId}' returned by external AI provider.`,
        {
          diagnosticCode: 'duplicate_pda',
          safeStructuralMetadata: {
            rootType,
            topLevelKeys,
            recommendationCount,
            candidateKeys,
            identifierFieldPresent,
            canonicalIdMatch: true,
            rationalePresent: true,
          },
        }
      );
    }
    seenPdaIds.add(trimmedPdaId);

    validated.push(
      Object.freeze({
        reference: Object.freeze({
          pdaId: trimmedPdaId,
          catalogRevision: expectedRevision,
        }),
        rationale: (rationale as string).trim(),
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
