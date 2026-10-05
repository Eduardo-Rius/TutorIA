import type { EvaluationAIProvider } from '../../application/planning/EvaluationAIProvider';
import {
  validateAssistDailyEvaluationResponse,
  type SanitizedEvaluationAIPayload,
  type AssistDailyEvaluationResponse,
} from '../../application/planning/GovernedEvaluationAIContract';

// ============================================================================
// PROVIDER ERROR MODEL
// ============================================================================

export class EvaluationAIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationAIProviderError';
    Object.setPrototypeOf(this, EvaluationAIProviderError.prototype);
  }
}

export class EvaluationAIProviderConfigurationError extends EvaluationAIProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationAIProviderConfigurationError';
    Object.setPrototypeOf(this, EvaluationAIProviderConfigurationError.prototype);
  }
}

export type EvaluationAIProviderFailureKind = 'http' | 'transport';

export interface EvaluationAIProviderNetworkErrorOptions {
  readonly failureKind?: EvaluationAIProviderFailureKind;
  readonly upstreamStatus?: number | undefined;
}

export class EvaluationAIProviderNetworkError extends EvaluationAIProviderError {
  public readonly failureKind: EvaluationAIProviderFailureKind;
  public readonly upstreamStatus?: number | undefined;

  constructor(message: string, options?: EvaluationAIProviderNetworkErrorOptions) {
    super(message);
    this.name = 'EvaluationAIProviderNetworkError';
    this.failureKind = options?.failureKind ?? (options?.upstreamStatus !== undefined ? 'http' : 'transport');
    this.upstreamStatus = options?.upstreamStatus;
    Object.setPrototypeOf(this, EvaluationAIProviderNetworkError.prototype);
  }
}

export class EvaluationAIProviderMalformedResponseError extends EvaluationAIProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationAIProviderMalformedResponseError';
    Object.setPrototypeOf(this, EvaluationAIProviderMalformedResponseError.prototype);
  }
}

// ============================================================================
// SAFE TELEMETRY INTERFACES
// ============================================================================

export interface EvaluationAIUsageTelemetry {
  readonly promptTokens: number | null;
  readonly completionTokens: number | null;
  readonly totalTokens: number | null;
}

export interface EvaluationAIProviderTelemetry {
  readonly model: string;
  readonly usage: EvaluationAIUsageTelemetry | null;
  readonly responseId?: string | null;
  readonly failureKind?: EvaluationAIProviderFailureKind;
  readonly upstreamStatus?: number;
  readonly latencyMs?: number;
}

export type EvaluationAITelemetryObserver = (
  telemetry: EvaluationAIProviderTelemetry
) => void;

function parseSafeTokenCount(value: unknown): number | null {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return value;
  }
  return null;
}

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

export const DEFAULT_EVALUATION_AI_MODEL = 'gpt-4o-mini';
export const DEFAULT_EVALUATION_AI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_EVALUATION_AI_TIMEOUT_MS = 30000;
export const DEFAULT_EVALUATION_AI_MAX_TOKENS = 800;

export interface OpenAIEvaluationAIProviderConfig {
  readonly apiKey?: string | undefined;
  readonly model?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly timeoutMs?: number | undefined;
  readonly fetchFn?: typeof fetch | undefined;
  readonly maxCompletionTokens?: number | undefined;
  readonly onTelemetry?: EvaluationAITelemetryObserver | undefined;
}

// ============================================================================
// PROMPT CONSTRUCTION & SAFETY FIREWALL
// ============================================================================

export const EVALUATION_AI_SYSTEM_INSTRUCTION = [
  'You are TutorIA, an AI writing assistant for early childhood educators in Mexico (IMSS Guarderías, Prestación Directa).',
  'Your sole role is to assist educator Anita in drafting a clear, professional daily pedagogical evaluation from her observed human evidence.',
  '',
  'CRITICAL GOVERNANCE & ARCHITECTURAL INVARIANTS:',
  '1. YOU ARE A WRITING ASSISTANT, NOT AN EVALUATOR OR ASSESSOR.',
  '2. FACTUAL SOURCE: Use "HUMAN EVIDENCE" as the sole factual source of what occurred in the classroom.',
  '3. PLANNED CONTEXT IS NOT OBSERVED FACT: The planned context provides only prospective pedagogical intent. Never convert planned intent into observed reality.',
  '4. NO EXECUTION INFERENCE: Never infer that an activity occurred merely because it was scheduled or planned.',
  '5. PROHIBITED LANGUAGE & OUTCOME CLAIMS:',
  '   - Never claim an objective was achieved (e.g., do NOT write "se logró el objetivo", "objetivo cumplido", etc.).',
  '   - Never claim a PDA was achieved, attained, or mastered (e.g., do NOT write "PDA logrado", "PDA alcanzado", "PDA dominado", "PDA completado", etc.).',
  '   - Never claim developmental mastery or developmental milestones achieved.',
  '   - Never assign numeric grades, scores, ratings, or percentage metrics of success.',
  '   - Never diagnose, assess clinical conditions, or introduce medical/clinical terminology.',
  '6. NO HALLUCINATION OF PEDAGOGICAL REALITY:',
  '   - Never invent child behaviors, reactions, or responses not described in human evidence.',
  '   - Never invent activity execution, adaptations, or continuity not described in human evidence.',
  '   - Never invent or mention individual children names or personal identifiers.',
  '7. TONE & STRUCTURE:',
  '   - Descriptive, qualitative, objective, group-level narrative in natural, professional Spanish (español).',
  '   - Respect educator autonomy: "ANITA OBSERVES. AI HELPS WRITE. ANITA DECIDES."',
  '   - The narrative must be concise and suitable for institutional review by Director/Pedagogue Ceci.',
  '8. OUTPUT FORMAT:',
  '   - Output strictly a valid JSON object with exactly one key: "suggestedEvaluation".',
  '   - Format: { "suggestedEvaluation": "..." }',
  '   - Do NOT include any additional fields, metadata, reasoning, or chain-of-thought.',
].join('\n');

export function buildEvaluationAIPrompt(payload: SanitizedEvaluationAIPayload): {
  systemPrompt: string;
  userPrompt: string;
} {
  const plannedSections: string[] = [
    `# PLANNED CONTEXT — NOT OBSERVED FACT`,
    `- Room Group: ${payload.roomProfile.name} (${payload.roomProfile.minAgeMonths}-${payload.roomProfile.maxAgeMonths} months)`,
    `- Day of Week: ${payload.dayOfWeek}`,
    `- Planned Activities:`,
  ];

  payload.plannedContext.activities.forEach((act, idx) => {
    plannedSections.push(`  ${idx + 1}. Activity:`);
    plannedSections.push(`     Category: ${act.category}`);
    plannedSections.push(`     Objective / Purpose: ${act.objective}`);
    plannedSections.push(`     Description: ${act.description}`);
    plannedSections.push(`     Duration: ${act.durationMinutes} min`);
    if (act.pdaReference) {
      if (typeof act.pdaReference === 'string') {
        plannedSections.push(`     PDA Context: ${act.pdaReference}`);
      } else if (typeof act.pdaReference === 'object') {
        plannedSections.push(
          `     PDA Context: ${act.pdaReference.field} - ${act.pdaReference.description}`
        );
      }
    }
    if (act.prospectiveObservationTarget) {
      plannedSections.push(
        `     Prospective Observation Target (Planned Intent Only): ${act.prospectiveObservationTarget}`
      );
    }
  });

  const humanSections: string[] = [
    '',
    `# HUMAN OBSERVATIONS — FACTUAL SOURCE FOR DRAFT`,
    `- Activities Development:`,
    `${payload.humanEvidence.activitiesDevelopment}`,
    '',
    `- Group Response:`,
    `${payload.humanEvidence.groupResponse}`,
  ];

  if (payload.humanEvidence.adaptations) {
    humanSections.push(
      '',
      `- Adaptations Made:`,
      `${payload.humanEvidence.adaptations}`
    );
  }

  if (payload.humanEvidence.continuity) {
    humanSections.push(
      '',
      `- Pedagogical Continuity:`,
      `${payload.humanEvidence.continuity}`
    );
  }

  humanSections.push(
    '',
    'Please draft a cohesive, descriptive daily evaluation narrative based strictly on the human observations above.'
  );

  const userPrompt = [...plannedSections, ...humanSections].join('\n');

  return {
    systemPrompt: EVALUATION_AI_SYSTEM_INSTRUCTION,
    userPrompt,
  };
}

// ============================================================================
// OPENAI EVALUATION AI PROVIDER IMPLEMENTATION
// ============================================================================

export class OpenAIEvaluationAIProvider implements EvaluationAIProvider {
  private readonly apiKey?: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly maxCompletionTokens: number;
  private readonly onTelemetry?: EvaluationAITelemetryObserver | undefined;

  constructor(config: OpenAIEvaluationAIProviderConfig = {}) {
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);
    this.model = config.model || (typeof process !== 'undefined' ? process.env.OPENAI_MODEL : undefined) || DEFAULT_EVALUATION_AI_MODEL;
    this.baseUrl = config.baseUrl || (typeof process !== 'undefined' ? process.env.OPENAI_BASE_URL : undefined) || DEFAULT_EVALUATION_AI_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_EVALUATION_AI_TIMEOUT_MS;
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
    this.maxCompletionTokens = config.maxCompletionTokens ?? DEFAULT_EVALUATION_AI_MAX_TOKENS;
    this.onTelemetry = config.onTelemetry;
  }

  public async assist(
    payload: SanitizedEvaluationAIPayload
  ): Promise<AssistDailyEvaluationResponse> {
    const apiKey = this.apiKey;
    if (!apiKey || !apiKey.trim()) {
      throw new EvaluationAIProviderConfigurationError(
        'Missing OpenAI API key. Configure OPENAI_API_KEY in the server runtime environment or provide an apiKey in provider configuration.'
      );
    }

    const { systemPrompt, userPrompt } = buildEvaluationAIPrompt(payload);

    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const startMs = performance.now();

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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
          max_completion_tokens: this.maxCompletionTokens,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const latencyMs = Math.max(0, Math.round(performance.now() - startMs));
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const failureKind: EvaluationAIProviderFailureKind = 'transport';

      if (this.onTelemetry) {
        try {
          this.onTelemetry({
            model: this.model,
            usage: null,
            failureKind,
            latencyMs,
          });
        } catch {
          // Telemetry callback failures must never disrupt provider execution
        }
      }

      if (isTimeout) {
        throw new EvaluationAIProviderNetworkError(
          `Evaluation AI provider request timed out after ${this.timeoutMs}ms.`,
          { failureKind }
        );
      }
      throw new EvaluationAIProviderNetworkError(
        'Evaluation AI provider transport failure during request dispatch.',
        { failureKind }
      );
    } finally {
      clearTimeout(timer);
    }

    const latencyMs = Math.max(0, Math.round(performance.now() - startMs));

    if (!response.ok) {
      // Consume body to free socket resources safely without logging raw response
      await response.text().catch(() => '');

      const failureKind: EvaluationAIProviderFailureKind = 'http';
      const upstreamStatus = response.status;

      if (this.onTelemetry) {
        try {
          this.onTelemetry({
            model: this.model,
            usage: null,
            failureKind,
            upstreamStatus,
            latencyMs,
          });
        } catch {
          // Telemetry non-fatal
        }
      }

      throw new EvaluationAIProviderNetworkError(
        `Evaluation AI provider responded with HTTP status ${upstreamStatus}.`,
        { failureKind, upstreamStatus }
      );
    }

    let json: any;
    try {
      json = await response.json();
    } catch {
      throw new EvaluationAIProviderMalformedResponseError(
        'Evaluation AI provider response could not be parsed as JSON.'
      );
    }

    // Extract safe usage telemetry
    if (this.onTelemetry) {
      try {
        const usageData = json?.usage;
        const usage: EvaluationAIUsageTelemetry | null = usageData
          ? {
              promptTokens: parseSafeTokenCount(usageData.prompt_tokens),
              completionTokens: parseSafeTokenCount(usageData.completion_tokens),
              totalTokens: parseSafeTokenCount(usageData.total_tokens),
            }
          : null;

        this.onTelemetry({
          model: this.model,
          usage,
          responseId: typeof json?.id === 'string' ? json.id : null,
          latencyMs,
        });
      } catch {
        // Telemetry non-fatal
      }
    }

    const rawContent = json?.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      throw new EvaluationAIProviderMalformedResponseError(
        'Evaluation AI provider returned empty completion content.'
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new EvaluationAIProviderMalformedResponseError(
        'Evaluation AI provider completion content is not valid JSON.'
      );
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new EvaluationAIProviderMalformedResponseError(
        'Evaluation AI provider completion is not a JSON object.'
      );
    }

    const keys = Object.keys(parsed);
    if (keys.length !== 1 || keys[0] !== 'suggestedEvaluation') {
      throw new EvaluationAIProviderMalformedResponseError(
        `Evaluation AI provider returned unexpected keys: ${keys.join(', ')}.`
      );
    }

    try {
      validateAssistDailyEvaluationResponse(parsed);
    } catch (contractErr) {
      throw new EvaluationAIProviderMalformedResponseError(
        `Evaluation AI provider output failed contract validation: ${(contractErr as Error).message}`
      );
    }

    return parsed as AssistDailyEvaluationResponse;
  }
}
