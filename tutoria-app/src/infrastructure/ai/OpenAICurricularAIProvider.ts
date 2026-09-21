import type { CurricularAIProvider } from '../../application/planning/CurricularAIProviderBoundary';
import type { CurricularRecommendationRequest } from '../../application/planning/CurricularRecommendationSource';
import {
  DIRECT_PDA_CATALOG,
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
} from '../../domain/planning/DirectCurricularCatalog';

/**
 * Base class for all curricular AI provider errors.
 */
export class CurricularAIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurricularAIProviderError';
  }
}

/**
 * Error thrown when required provider configuration (such as API key) is missing or invalid.
 */
export class CurricularAIProviderConfigurationError extends CurricularAIProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'CurricularAIProviderConfigurationError';
  }
}

/**
 * Error thrown when an HTTP transport failure or network error occurs.
 */
export class CurricularAIProviderNetworkError extends CurricularAIProviderError {
  public readonly status?: number | undefined;

  constructor(message: string, status?: number | undefined) {
    super(message);
    this.name = 'CurricularAIProviderNetworkError';
    this.status = status;
  }
}

/**
 * Error thrown when the AI provider returns unparseable or malformed output.
 */
export class CurricularAIProviderMalformedResponseError extends CurricularAIProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'CurricularAIProviderMalformedResponseError';
  }
}

/**
 * Configuration options for OpenAICurricularAIProvider.
 */
export interface OpenAICurricularAIProviderConfig {
  readonly apiKey?: string | undefined;
  readonly model?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly timeoutMs?: number | undefined;
  readonly fetchFn?: typeof fetch | undefined;
}

/**
 * Derived representation of a canonical PDA catalog entry for AI prompt context.
 * Strictly derived from DIRECT_PDA_CATALOG; never duplicated or hardcoded independently.
 */
export interface SimplifiedPDACatalogEntry {
  readonly id: string;
  readonly campoFormativo: string;
  readonly contenido: string;
  readonly pda: string;
}

/**
 * Derives simplified catalog context directly from the canonical DIRECT_PDA_CATALOG.
 * Preserves the canonical catalog revision and guarantees a single source of truth.
 */
export function deriveCanonicalCatalogContext(): readonly SimplifiedPDACatalogEntry[] {
  return DIRECT_PDA_CATALOG.map((entry) => ({
    id: entry.id,
    campoFormativo: entry.campoFormativo,
    contenido: entry.contenido.trim(),
    pda: entry.pda.trim(),
  }));
}

/**
 * Builds the system and user messages for the AI provider from canonical pedagogical context.
 */
export function buildPromptMessages(
  request: CurricularRecommendationRequest,
  catalog: readonly SimplifiedPDACatalogEntry[],
  revision: string
): { role: 'system' | 'user'; content: string }[] {
  const systemPrompt = [
    'You are TutorIA, an AI pedagogical assistant for early childhood education in Mexico (IMSS Guarderías, Prestación Directa).',
    'Your role is to propose curricular PDA (Procesos de Desarrollo de Aprendizaje) references for a planned pedagogical activity.',
    '',
    'STRICT PEDAGOGICAL & ARCHITECTURAL INVARIANTS:',
    `1. You must ONLY select PDA identifiers that exist in the canonical DIRECT catalog provided below (Revision: ${revision}).`,
    '2. Invented, extrapolated, or hallucinated PDA identifiers are strictly forbidden.',
    '3. Zero recommendations (an empty array) is valid and expected if no PDA directly aligns with the activity.',
    '4. Multiple recommendations are valid when each is distinctly and pedagogically justified.',
    '5. Every proposed recommendation MUST include a concise pedagogical rationale explaining why it applies.',
    '6. DO NOT provide confidence scores, probabilities, numeric rankings, or scores of any kind.',
    '7. DO NOT perform automatic curricular selection, assignment, or approval. Educator Anita is the sole human curricular authority.',
    '8. DO NOT generate complementary activities or prioritized practices.',
    '9. Your output must strictly be a JSON object with a single "recommendations" array containing objects with "pdaId" and "rationale".',
    '   Format: { "recommendations": [ { "pdaId": "TUTORIA-PDA-XXXX", "rationale": "..." } ] }',
    '   If no PDA applies: { "recommendations": [] }',
  ].join('\n');

  const contextSections: string[] = [
    `# PEDAGOGICAL ACTIVITY DETAILS`,
    `- Modality: ${request.modality}`,
    `- Catalog Revision: ${revision}`,
    `- Activity Title: ${request.activityTitle}`,
  ];

  if (request.objective) {
    contextSections.push(`- Objective / Purpose: ${request.objective}`);
  }
  if (request.description) {
    contextSections.push(`- Description: ${request.description}`);
  }
  if (request.category) {
    contextSections.push(`- Category / Type: ${request.category}`);
  }
  if (request.durationMinutes !== undefined) {
    contextSections.push(`- Duration: ${request.durationMinutes} minutes`);
  }
  if (request.materials && request.materials.length > 0) {
    contextSections.push(`- Materials: ${request.materials.join(', ')}`);
  }
  if (request.room) {
    contextSections.push(
      `- Room / Group: ${request.room.name} (ID: ${request.room.roomId}) - Age Range: ${request.room.minAgeMonths}-${request.room.maxAgeMonths} months`
    );
  }
  if (request.weeklyContext) {
    contextSections.push(
      `# WEEKLY PEDAGOGICAL CONTEXT`,
      `- Observations: ${request.weeklyContext.observations}`,
      `- Identified Needs: ${request.weeklyContext.identifiedNeeds}`,
      `- Special Situations: ${request.weeklyContext.specialSituations}`,
      `- Available Materials: ${request.weeklyContext.availableMaterials}`
    );
  }

  contextSections.push(
    '',
    `# CANONICAL DIRECT CURRICULAR CATALOG (Revision: ${revision})`,
    'Below are the valid canonical PDA entries you may reference:',
    JSON.stringify(catalog, null, 2)
  );

  const userPrompt = contextSections.join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Real AI provider adapter connecting to OpenAI (or compatible REST API)
 * to generate untrusted raw curricular recommendations.
 *
 * Implements CurricularAIProvider interface behind CurricularAIProviderBoundary.
 *
 * SECURITY INVARIANT:
 * Real provider secrets must be injected from a trusted server/runtime boundary
 * and must never be exposed through Vite client environment variables.
 */
export class OpenAICurricularAIProvider implements CurricularAIProvider {
  private readonly apiKey?: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: OpenAICurricularAIProviderConfig = {}) {
    this.apiKey = this.resolveApiKey(config.apiKey);
    this.model = config.model || this.resolveEnvVariable('VITE_OPENAI_MODEL') || this.resolveEnvVariable('OPENAI_MODEL') || 'gpt-4o-mini';
    this.baseUrl = config.baseUrl || this.resolveEnvVariable('VITE_OPENAI_BASE_URL') || 'https://api.openai.com/v1';
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
  }

  /**
   * Generates untrusted raw recommendations by transforming canonical request into
   * AI service prompt, executing HTTP completion, and returning parsed raw data.
   */
  public async generateRawRecommendations(
    request: CurricularRecommendationRequest
  ): Promise<unknown> {
    const apiKey = this.apiKey;
    if (!apiKey || !apiKey.trim()) {
      throw new CurricularAIProviderConfigurationError(
        'Missing OpenAI API key. Configure OPENAI_API_KEY in the server/runtime environment or provide an apiKey in provider configuration.'
      );
    }

    const revision = request.catalogRevision || TUTORIA_DIRECT_PDA_CATALOG_REVISION;
    const catalogContext = deriveCanonicalCatalogContext();
    const messages = buildPromptMessages(request, catalogContext, revision);

    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new CurricularAIProviderNetworkError(
          `Curricular AI provider request timed out after ${this.timeoutMs}ms.`
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new CurricularAIProviderNetworkError(
        `Curricular AI provider network failure: ${message}`
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text().catch(() => '');
      }
      throw new CurricularAIProviderNetworkError(
        `Curricular AI provider HTTP error (${response.status} ${response.statusText}): ${errorDetail || 'Unknown error'}`,
        response.status
      );
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new CurricularAIProviderMalformedResponseError(
        `Curricular AI provider returned invalid JSON response: ${message}`
      );
    }

    const rawContent = payload?.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      throw new CurricularAIProviderMalformedResponseError(
        'Curricular AI provider response missing message content in choices.'
      );
    }

    try {
      const parsedRawData = JSON.parse(rawContent);
      return parsedRawData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new CurricularAIProviderMalformedResponseError(
        `Failed to parse curricular AI output content as JSON: ${message}`
      );
    }
  }

  /**
   * Resolves the OpenAI API key strictly from safe server/runtime sources.
   *
   * Real provider secrets must be injected from a trusted server/runtime boundary
   * and must never be exposed through Vite client environment variables.
   */
  private resolveApiKey(explicitKey?: string | undefined): string | undefined {
    if (explicitKey && explicitKey.trim()) {
      return explicitKey.trim();
    }
    // Server/runtime environment resolution only (process.env.OPENAI_API_KEY)
    try {
      if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
        const val = process.env.OPENAI_API_KEY;
        if (typeof val === 'string' && val.trim()) {
          return val.trim();
        }
      }
    } catch {
      // Ignore
    }
    return undefined;
  }

  private resolveEnvVariable(key: string): string | undefined {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const val = (import.meta as any).env[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    } catch {
      // Ignore
    }
    try {
      if (typeof process !== 'undefined' && process.env) {
        const val = process.env[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    } catch {
      // Ignore
    }
    return undefined;
  }
}
