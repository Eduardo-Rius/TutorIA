import type {
  WeeklyPlanningAIExecutor,
  WeeklyPlanningAIPromptPayload,
} from '../../application/planning/AIWeeklyPlanningProposalSource';

/**
 * Safe classification of executor failure for operational diagnostics.
 */
export type WeeklyPlanningAISafeErrorCategory =
  | 'CONFIGURATION'
  | 'TRANSPORT'
  | 'HTTP'
  | 'INVALID_RESPONSE';

/**
 * Base class for all Weekly Planning AI Executor errors.
 */
export abstract class WeeklyPlanningAIExecutorError extends Error {
  public abstract readonly safeCategory: WeeklyPlanningAISafeErrorCategory;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when required configuration (such as API key) is missing or invalid.
 */
export class WeeklyPlanningAIExecutorConfigurationError extends WeeklyPlanningAIExecutorError {
  public readonly safeCategory = 'CONFIGURATION' as const;

  constructor(message: string) {
    super(message);
    this.name = 'WeeklyPlanningAIExecutorConfigurationError';
  }
}

/**
 * Error thrown when an underlying network transport or timeout failure occurs.
 */
export class WeeklyPlanningAIExecutorTransportError extends WeeklyPlanningAIExecutorError {
  public readonly safeCategory = 'TRANSPORT' as const;

  constructor(message: string) {
    super(message);
    this.name = 'WeeklyPlanningAIExecutorTransportError';
  }
}

/**
 * Error thrown when the upstream provider responds with a non-2xx HTTP status.
 *
 * CRITICAL PRIVACY & SECURITY BOUNDARY:
 * Preserves ONLY safe upstream metadata (status code).
 * NEVER propagates upstream response bodies, headers, or raw provider error payloads.
 */
export class WeeklyPlanningAIExecutorHttpError extends WeeklyPlanningAIExecutorError {
  public readonly safeCategory = 'HTTP' as const;
  public readonly upstreamStatus: number;

  constructor(message: string, upstreamStatus: number) {
    super(message);
    this.name = 'WeeklyPlanningAIExecutorHttpError';
    this.upstreamStatus = upstreamStatus;
  }
}

/**
 * Error thrown when the upstream provider returns malformed, unparseable, or non-JSON output.
 */
export class WeeklyPlanningAIExecutorInvalidResponseError extends WeeklyPlanningAIExecutorError {
  public readonly safeCategory = 'INVALID_RESPONSE' as const;

  constructor(message: string) {
    super(message);
    this.name = 'WeeklyPlanningAIExecutorInvalidResponseError';
  }
}

/**
 * Safe token usage metadata extracted from provider completion responses.
 */
export interface WeeklyPlanningAITokenUsage {
  readonly promptTokens: number | null;
  readonly completionTokens: number | null;
  readonly totalTokens: number | null;
}

/**
 * Safe telemetry event emitted when an AI generation request starts.
 */
export interface WeeklyPlanningAIStartedEvent {
  readonly event: 'weekly_planning_ai.started';
  readonly correlationId: string;
  readonly model: string;
}

/**
 * Safe telemetry event emitted when an AI generation request completes successfully.
 */
export interface WeeklyPlanningAICompletedEvent {
  readonly event: 'weekly_planning_ai.completed';
  readonly correlationId: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly usage: WeeklyPlanningAITokenUsage | null;
}

/**
 * Safe telemetry event emitted when an AI generation request fails.
 *
 * PRIVACY & SECURITY INVARIANT:
 * Strictly limited to safe diagnostic metadata.
 * Prompts, pedagogical free text, PII, API keys, and raw error bodies are NEVER included.
 */
export interface WeeklyPlanningAIFailedEvent {
  readonly event: 'weekly_planning_ai.failed';
  readonly correlationId: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly safeErrorCategory: WeeklyPlanningAISafeErrorCategory;
  readonly upstreamStatus?: number | undefined;
}

export type WeeklyPlanningAITelemetryEvent =
  | WeeklyPlanningAIStartedEvent
  | WeeklyPlanningAICompletedEvent
  | WeeklyPlanningAIFailedEvent;

/**
 * Callback observer for request-scoped telemetry events.
 */
export type WeeklyPlanningAITelemetryObserver = (
  event: WeeklyPlanningAITelemetryEvent
) => void;

/**
 * Default model locked for Weekly Planning AI proposal generation.
 */
export const DEFAULT_WEEKLY_PLANNING_AI_MODEL = 'gpt-4o-mini';

/**
 * Bounded completion budget for a 5-day weekly pedagogical proposal.
 *
 * Sizing rationale:
 * A 5-day proposal with 1-3 activities per day (each containing category, objective,
 * description, duration, and materials in professional Spanish) produces approximately
 * 1500-2500 tokens of strict JSON. 3000 tokens provides a safe bounded ceiling that
 * reliably avoids premature truncation while strictly preventing runaway token consumption.
 */
export const DEFAULT_WEEKLY_PLANNING_MAX_COMPLETION_TOKENS = 3000;

/**
 * Locked temperature for deterministic, bounded pedagogical generation.
 */
export const DEFAULT_WEEKLY_PLANNING_TEMPERATURE = 0.2;

/**
 * Explicit bounded request timeout (30 seconds).
 */
export const DEFAULT_WEEKLY_PLANNING_TIMEOUT_MS = 30000;

/**
 * Safely parses a non-negative integer token count.
 */
export function parseSafeTokenCount(value: unknown): number | null {
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

/**
 * Configuration options for OpenAIWeeklyPlanningExecutor.
 */
export interface OpenAIWeeklyPlanningExecutorConfig {
  readonly apiKey?: string | undefined;
  readonly model?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly timeoutMs?: number | undefined;
  readonly fetchFn?: typeof fetch | undefined;
  readonly maxCompletionTokens?: number | undefined;
  readonly temperature?: number | undefined;
  readonly onTelemetry?: WeeklyPlanningAITelemetryObserver | undefined;
}

/**
 * Server-side / local OpenAI execution foundation for Weekly Planning Proposals.
 *
 * Implements WeeklyPlanningAIExecutor interface behind AIWeeklyPlanningProposalSource.
 *
 * CRITICAL ARCHITECTURAL & SECURITY PRINCIPLES:
 * 1. SERVER-SIDE SECRET BOUNDARY:
 *    - The API key is an injected server-side concern.
 *    - NO client-facing environment variables are checked or exposed.
 *    - API keys never appear in prompts, errors, logs, or telemetry.
 * 2. BOUNDED EXECUTION PARAMETERS:
 *    - Model: gpt-4o-mini (locked).
 *    - Max completion tokens: 3000 (explicit bounded budget).
 *    - Temperature: 0.2 (low, bounded reproducibility).
 *    - Retries: 0 (zero hidden retries).
 *    - Timeout: explicit 30s with AbortController.
 * 3. STRICT STRUCTURED OUTPUT:
 *    - Enforces response_format: { type: 'json_object' }.
 *    - Returns raw parsed JSON as strictly UNTRUSTED / UNKNOWN.
 *    - NEVER casts output directly into WeeklyPlanningProposalResponse.
 * 4. PRIVACY & DATA MINIMIZATION:
 *    - Receives only privacy-minimized WeeklyPlanningAIPromptPayload.
 *    - Telemetry and errors strictly exclude prompts, free text, PII, and raw response bodies.
 * 5. ZERO DOMAIN / REPOSITORY MUTATION AUTHORITY:
 *    - The executor only transports candidate data.
 *    - Zero authority to persist, mutate, submit, approve, evaluate, close, or select curricular PDAs.
 */
export class OpenAIWeeklyPlanningExecutor implements WeeklyPlanningAIExecutor {
  private readonly apiKey?: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly maxCompletionTokens: number;
  private readonly temperature: number;
  private readonly onTelemetry?: WeeklyPlanningAITelemetryObserver | undefined;

  constructor(config: OpenAIWeeklyPlanningExecutorConfig = {}) {
    this.apiKey = this.resolveApiKey(config.apiKey);
    this.model = config.model || DEFAULT_WEEKLY_PLANNING_AI_MODEL;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.timeoutMs = config.timeoutMs ?? DEFAULT_WEEKLY_PLANNING_TIMEOUT_MS;
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
    this.maxCompletionTokens =
      config.maxCompletionTokens ?? DEFAULT_WEEKLY_PLANNING_MAX_COMPLETION_TOKENS;
    this.temperature =
      config.temperature ?? DEFAULT_WEEKLY_PLANNING_TEMPERATURE;
    this.onTelemetry = config.onTelemetry;
  }

  /**
   * Resolves the server-side API key from explicit config or server environment.
   * STRICT SECURITY: Never looks at client-facing frontend variables.
   */
  private resolveApiKey(explicitKey?: string): string | undefined {
    if (explicitKey !== undefined && explicitKey.trim().length > 0) {
      return explicitKey.trim();
    }
    if (typeof process !== 'undefined' && process?.env?.OPENAI_API_KEY) {
      const envKey = process.env.OPENAI_API_KEY.trim();
      if (envKey.length > 0) {
        return envKey;
      }
    }
    return undefined;
  }

  /**
   * Safely notifies the telemetry observer, swallowing any errors thrown by the observer.
   */
  private safeNotifyTelemetry(event: WeeklyPlanningAITelemetryEvent): void {
    if (!this.onTelemetry) return;
    try {
      this.onTelemetry(event);
    } catch {
      // Non-fatal: telemetry observer must never disrupt pedagogical planning
    }
  }

  /**
   * Generates a request-scoped correlation identifier.
   */
  private generateCorrelationId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `wp-ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Executes the prompt payload against the OpenAI chat completions endpoint.
   *
   * @param payload Privacy-minimized prompt payload from AIWeeklyPlanningProposalSource
   * @returns Untrusted parsed JSON object (strictly typed as unknown)
   */
  public async execute(payload: WeeklyPlanningAIPromptPayload): Promise<unknown> {
    const correlationId = this.generateCorrelationId();
    const startTime = Date.now();

    // 1. Enforce server-side API key presence
    if (!this.apiKey) {
      this.safeNotifyTelemetry({
        event: 'weekly_planning_ai.failed',
        correlationId,
        model: this.model,
        latencyMs: 0,
        safeErrorCategory: 'CONFIGURATION',
      });
      throw new WeeklyPlanningAIExecutorConfigurationError(
        'Missing OpenAI API key. Inject an apiKey in executor configuration or define OPENAI_API_KEY in the server environment.'
      );
    }

    // 2. Emit started telemetry event
    this.safeNotifyTelemetry({
      event: 'weekly_planning_ai.started',
      correlationId,
      model: this.model,
    });

    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const responseFormat = payload.responseSchema
      ? {
          type: 'json_schema' as const,
          json_schema: {
            name: 'weekly_planning_proposal',
            strict: true,
            schema: payload.responseSchema,
          },
        }
      : { type: 'json_object' as const };

    // 3. Dispatch HTTP request with explicit bounded parameters (exactly 1 call, 0 retries)
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: payload.systemPrompt },
            { role: 'user', content: payload.userPrompt },
          ],
          temperature: this.temperature,
          response_format: responseFormat,
          max_completion_tokens: this.maxCompletionTokens,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const isTimeout =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.toLowerCase().includes('abort'));

      this.safeNotifyTelemetry({
        event: 'weekly_planning_ai.failed',
        correlationId,
        model: this.model,
        latencyMs,
        safeErrorCategory: 'TRANSPORT',
      });

      if (isTimeout) {
        throw new WeeklyPlanningAIExecutorTransportError(
          `Weekly planning AI request timed out after ${this.timeoutMs}ms.`
        );
      }
      throw new WeeklyPlanningAIExecutorTransportError(
        'Weekly planning AI transport failure during request dispatch.'
      );
    } finally {
      clearTimeout(timer);
    }

    // 4. Handle non-2xx HTTP status codes
    if (!response.ok) {
      // Safe drainage: consume body to free socket resources safely without logging or exposing content
      await response.text().catch(() => '');

      const latencyMs = Date.now() - startTime;
      const upstreamStatus = response.status;

      this.safeNotifyTelemetry({
        event: 'weekly_planning_ai.failed',
        correlationId,
        model: this.model,
        latencyMs,
        safeErrorCategory: 'HTTP',
        upstreamStatus,
      });

      throw new WeeklyPlanningAIExecutorHttpError(
        `Weekly planning AI upstream HTTP error (${upstreamStatus}).`,
        upstreamStatus
      );
    }

    // 5. Parse response envelope as JSON
    let envelope: any;
    try {
      envelope = await response.json();
    } catch {
      const latencyMs = Date.now() - startTime;
      this.safeNotifyTelemetry({
        event: 'weekly_planning_ai.failed',
        correlationId,
        model: this.model,
        latencyMs,
        safeErrorCategory: 'INVALID_RESPONSE',
      });
      throw new WeeklyPlanningAIExecutorInvalidResponseError(
        'Weekly planning AI response envelope is not valid JSON.'
      );
    }

    // 6. Validate choices and message content
    const choices = envelope?.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      const latencyMs = Date.now() - startTime;
      this.safeNotifyTelemetry({
        event: 'weekly_planning_ai.failed',
        correlationId,
        model: this.model,
        latencyMs,
        safeErrorCategory: 'INVALID_RESPONSE',
      });
      throw new WeeklyPlanningAIExecutorInvalidResponseError(
        'Weekly planning AI response missing choices array.'
      );
    }

    const messageContent = choices[0]?.message?.content;
    if (typeof messageContent !== 'string' || !messageContent.trim()) {
      const latencyMs = Date.now() - startTime;
      this.safeNotifyTelemetry({
        event: 'weekly_planning_ai.failed',
        correlationId,
        model: this.model,
        latencyMs,
        safeErrorCategory: 'INVALID_RESPONSE',
      });
      throw new WeeklyPlanningAIExecutorInvalidResponseError(
        'Weekly planning AI response message content is empty or not a string.'
      );
    }

    // 7. Parse the inner model content as JSON
    let untrustedCandidateData: unknown;
    try {
      untrustedCandidateData = JSON.parse(messageContent);
    } catch {
      const latencyMs = Date.now() - startTime;
      this.safeNotifyTelemetry({
        event: 'weekly_planning_ai.failed',
        correlationId,
        model: this.model,
        latencyMs,
        safeErrorCategory: 'INVALID_RESPONSE',
      });
      throw new WeeklyPlanningAIExecutorInvalidResponseError(
        'Weekly planning AI model content is not valid JSON.'
      );
    }

    // 8. Safely extract token usage metadata
    let usage: WeeklyPlanningAITokenUsage | null = null;
    const rawUsage = envelope?.usage;
    if (rawUsage && typeof rawUsage === 'object') {
      usage = {
        promptTokens: parseSafeTokenCount(rawUsage.prompt_tokens),
        completionTokens: parseSafeTokenCount(rawUsage.completion_tokens),
        totalTokens: parseSafeTokenCount(rawUsage.total_tokens),
      };
    }

    const latencyMs = Date.now() - startTime;
    this.safeNotifyTelemetry({
      event: 'weekly_planning_ai.completed',
      correlationId,
      model: this.model,
      latencyMs,
      usage,
    });

    // 9. Return raw untrusted candidate data (never typecast to WeeklyPlanningProposalResponse)
    return untrustedCandidateData;
  }
}
