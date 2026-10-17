import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OpenAIEvaluationAIProvider,
  EVALUATION_AI_SYSTEM_INSTRUCTION,
  buildEvaluationAIPrompt,
  buildCanonicalDailyEvaluationResponseFormat,
  DAILY_EVALUATION_AI_RESPONSE_SCHEMA,
  EvaluationAIProviderConfigurationError,
  EvaluationAIProviderNetworkError,
  EvaluationAIProviderMalformedResponseError,
  type EvaluationAIProviderTelemetry,
} from '../OpenAIEvaluationAIProvider';
import type { SanitizedEvaluationAIPayload } from '../../../application/planning/GovernedEvaluationAIContract';

describe('H1R13.3E — OpenAIEvaluationAIProvider', () => {
  const validPayload: SanitizedEvaluationAIPayload = {
    roomProfile: {
      name: 'Lactantes A',
      minAgeMonths: 6,
      maxAgeMonths: 12,
    },
    dayOfWeek: 'MONDAY',
    plannedContext: {
      activities: [
        {
          category: 'JUEGO LIBRE',
          objective: 'Estimular la coordinación motriz gruesa mediante gateo libre',
          description: 'Se disponen tapetes y rodillos para el desplazamiento activo',
          durationMinutes: 30,
          pdaReference: {
            field: 'LENGUAJES',
            description: 'Experimenta con su cuerpo y el espacio inmediato',
          },
          prospectiveObservationTarget: 'Interés en alcanzar objetos llamativos mediante desplazamiento',
        },
      ],
    },
    humanEvidence: {
      activitiesDevelopment:
        'Los lactantes se desplazaron libremente sobre los tapetes explorando los rodillos.',
      groupResponse:
        'La mayoría mostró curiosidad y entusiasmo al aproximarse a los materiales colocados.',
      adaptations: 'Se agregaron cojines suaves como apoyos adicionales para gateo.',
      continuity: 'Continuar estimulando el apoyo en cuatro puntos en la siguiente sesión.',
    },
  };

  const validModelResponseText =
    'Durante la jornada del lunes en Lactantes A, los lactantes se desplazaron sobre los tapetes explorando los rodillos disponibles. El grupo interactuó con entusiasmo ante los materiales y se apoyó con cojines suaves para favorecer su movimiento libre.';

  function createMockFetch(status = 200, responseJson: unknown = null) {
    const defaultBody = {
      id: 'chatcmpl-test-123',
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestedEvaluation: validModelResponseText,
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 65,
        total_tokens: 215,
      },
    };

    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseJson ?? defaultBody,
      text: async () => JSON.stringify(responseJson ?? defaultBody),
    } as unknown as Response);
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // CONFIGURATION & SECRETS
  // ==========================================================================
  describe('Configuration & Secret Management', () => {
    it('throws EvaluationAIProviderConfigurationError when API key is missing', async () => {
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: '',
        fetchFn: createMockFetch(),
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderConfigurationError
      );
    });

    it('resolves API key passed in constructor config', async () => {
      const mockFetch = createMockFetch();
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-secret-key-123',
        fetchFn: mockFetch,
      });

      const result = await provider.assist(validPayload);
      expect(result.suggestedEvaluation).toBe(validModelResponseText);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const fetchArgs = mockFetch.mock.calls[0];
      expect(fetchArgs[1]?.headers?.Authorization).toBe('Bearer test-secret-key-123');
    });

    it('defaults to model gpt-4o-mini and standard OpenAI baseUrl', async () => {
      const mockFetch = createMockFetch();
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await provider.assist(validPayload);

      const url = mockFetch.mock.calls[0][0];
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);

      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.temperature).toBe(0.2);
      expect(body.response_format).toEqual(buildCanonicalDailyEvaluationResponseFormat());
    });
  });

  // ==========================================================================
  // PROMPT FIREWALL & PEDAGOGICAL BOUNDARY
  // ==========================================================================
  describe('Prompt Firewall & Safety Directives', () => {
    it('26. humanEvidence is clearly marked as factual source for the draft', () => {
      const { userPrompt } = buildEvaluationAIPrompt(validPayload);

      expect(userPrompt).toContain('# HUMAN OBSERVATIONS — FACTUAL SOURCE FOR DRAFT');
      expect(userPrompt).toContain(validPayload.humanEvidence.activitiesDevelopment);
      expect(userPrompt).toContain(validPayload.humanEvidence.groupResponse);
      expect(userPrompt).toContain(validPayload.humanEvidence.adaptations!);
      expect(userPrompt).toContain(validPayload.humanEvidence.continuity!);
    });

    it('27. planned context is explicitly marked as NOT OBSERVED FACT', () => {
      const { userPrompt } = buildEvaluationAIPrompt(validPayload);

      expect(userPrompt).toContain('# PLANNED CONTEXT — NOT OBSERVED FACT');
      expect(userPrompt).toContain('Lactantes A');
      expect(userPrompt).toContain('Prospective Observation Target (Planned Intent Only)');
    });

    it('28-35. system instruction enforces all strict safety prohibitions', () => {
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('YOU ARE A WRITING ASSISTANT, NOT AN EVALUATOR OR ASSESSOR');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never claim an objective was achieved');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never claim a PDA was achieved');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never claim developmental mastery');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never assign numeric grades, scores, ratings, or percentage');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never diagnose, assess clinical conditions');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never invent activity execution, adaptations, or continuity');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never invent child behaviors');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Never invent or mention individual children names');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('ANITA OBSERVES. AI HELPS WRITE. ANITA DECIDES.');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('Do NOT include any additional fields, metadata, reasoning, or chain-of-thought');
    });

    it('20-25. provider prompt receives zero technical identifiers or auth tokens', () => {
      const { systemPrompt, userPrompt } = buildEvaluationAIPrompt(validPayload);
      const combined = `${systemPrompt}\n${userPrompt}`;

      expect(combined).not.toContain('planningId');
      expect(combined).not.toContain('daycareId');
      expect(combined).not.toContain('teacherId');
      expect(combined).not.toContain('authUid');
      expect(combined).not.toContain('currentDate');
      expect(combined).not.toContain('America/Mexico_City');
    });
  });

  // ==========================================================================
  // RESPONSE PARSING & VALIDATION
  // ==========================================================================
  describe('Provider Response Parsing & Contract Validation', () => {
    it('36. valid structured response is accepted and returned as suggestedEvaluation', async () => {
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(),
      });

      const result = await provider.assist(validPayload);
      expect(result).toEqual({ suggestedEvaluation: validModelResponseText });
    });

    it('37. malformed JSON completion content is rejected with EvaluationAIProviderMalformedResponseError', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [{ message: { content: 'not-json-content' } }],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });

    it('38. unexpected fields in completion object are rejected', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: validModelResponseText,
                reasoning: 'I thought this was good',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });

    it('39. empty suggestedEvaluation is rejected', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: '',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });

    it('40. oversized suggestedEvaluation (> 1000 chars) is rejected', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'A'.repeat(1001),
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });

    it('41. objective achievement claim in response is rejected by contract validation', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'Durante la jornada se logró el objetivo en su totalidad.',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });

    it('42. PDA achievement claim in response is rejected by contract validation', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'En la actividad el PDA logrado por los niños fue evidente.',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });

    it('43. numerical scoring in response is rejected by contract validation', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'La sesión tuvo una calificación de 9 con un 85% de logro.',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });

    it('44. clinical diagnostic claim in response is rejected by contract validation', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'El grupo presenta un déficit de atención y patología cognitiva.',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderMalformedResponseError
      );
    });
  });

  // ==========================================================================
  // TRANSPORT & ERROR SAFETY
  // ==========================================================================
  describe('Network Failures & Safe Telemetry', () => {
    it('handles upstream HTTP error without leaking response body or secret', async () => {
      const mockFetch = createMockFetch(500, { error: 'Internal OpenAI Error' });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderNetworkError
      );
    });

    it('handles transport timeout safely', async () => {
      const mockFetch = vi.fn().mockImplementation(() => {
        const err = new Error('AbortError');
        err.name = 'AbortError';
        throw err;
      });

      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        timeoutMs: 100,
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderNetworkError
      );
    });

    it('emits safe telemetry with token usage and zero pedagogical text', async () => {
      const telemetryEvents: EvaluationAIProviderTelemetry[] = [];
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(),
        onTelemetry: (t) => telemetryEvents.push(t),
      });

      await provider.assist(validPayload);

      expect(telemetryEvents).toHaveLength(1);
      const event = telemetryEvents[0];
      expect(event.model).toBe('gpt-4o-mini');
      expect(event.usage).toEqual({
        promptTokens: 150,
        completionTokens: 65,
        totalTokens: 215,
      });
      expect(event.responseId).toBe('chatcmpl-test-123');

      // Verify ZERO pedagogical text or prompt in telemetry
      const serialized = JSON.stringify(event);
      expect(serialized).not.toContain(validPayload.humanEvidence.activitiesDevelopment);
      expect(serialized).not.toContain(validModelResponseText);
    });
  });

  // ==========================================================================
  // SR-MD-18-Y — STRICT STRUCTURED OUTPUTS REGRESSION SUITE
  // ==========================================================================
  describe('SR-MD-18-Y — Strict Structured Outputs & Resilient Error Handling', () => {
    it('1. schema enforces strict: true, additionalProperties: false, and required suggestedEvaluation', () => {
      const format = buildCanonicalDailyEvaluationResponseFormat();
      expect(format.type).toBe('json_schema');
      expect(format.json_schema.strict).toBe(true);
      expect(format.json_schema.name).toBe('daily_evaluation_suggestion');
      expect(DAILY_EVALUATION_AI_RESPONSE_SCHEMA.additionalProperties).toBe(false);
      expect(DAILY_EVALUATION_AI_RESPONSE_SCHEMA.required).toEqual(['suggestedEvaluation']);
      expect(DAILY_EVALUATION_AI_RESPONSE_SCHEMA.properties.suggestedEvaluation.type).toBe('string');
    });

    it('2. accepts valid response with canonical single property suggestedEvaluation', async () => {
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suggestedEvaluation: validModelResponseText,
                }),
              },
            },
          ],
        }),
      });

      const res = await provider.assist(validPayload);
      expect(res.suggestedEvaluation).toBe(validModelResponseText);
    });

    it('3. rejects response with additional fields even if suggestedEvaluation is present', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: validModelResponseText,
                extraneousKey: 'not-allowed',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        /unexpected keys: suggestedEvaluation, extraneousKey/
      );
    });

    it('4. rejects response with incorrect key (e.g. evaluation instead of suggestedEvaluation)', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluation: validModelResponseText,
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        /unexpected keys: evaluation/
      );
    });

    it('5. rejects model refusal explicitly with refusal reason', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              refusal: 'I cannot evaluate children performance.',
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        /Evaluation AI provider refused generation: I cannot evaluate children performance/
      );
    });

    it('6. rejects truncated response when finish_reason is length', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            finish_reason: 'length',
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'Incomplete...',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        /Evaluation AI provider response was truncated due to token limit/
      );
    });

    it('7. rejects empty choices array', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        /Evaluation AI provider returned empty choices array/
      );
    });

    it('8. rejects response shorter than 30 characters and attaches cause', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'Muy corto',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      let caught: any;
      try {
        await provider.assist(validPayload);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(caught.cause).toBeDefined();
    });

    it('9. rejects prohibited pedagogical language and attaches cause with violation', async () => {
      const mockFetch = createMockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestedEvaluation: 'Durante la jornada se logró el objetivo al 100%.',
              }),
            },
          },
        ],
      });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      let caught: any;
      try {
        await provider.assist(validPayload);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(caught.cause?.diagnosticCode).toBe('PROHIBITED_EVALUATION_LANGUAGE');
    });

    it('10. throws EvaluationAIProviderNetworkError on upstream HTTP 500 error', async () => {
      const mockFetch = createMockFetch(500, { error: 'Upstream server error' });
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await expect(provider.assist(validPayload)).rejects.toThrow(
        EvaluationAIProviderNetworkError
      );
    });
  });

  // ==========================================================================
  // SR-MD-18-AB — PRECISE TECHNICAL REJECTION DIAGNOSTICS SUITE
  // ==========================================================================
  describe('SR-MD-18-AB — Safe Observable Rejection Diagnostics', () => {
    it('1. HTTP_PAYLOAD_PARSE_ERROR when response body cannot be parsed as JSON', async () => {
      const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('Invalid HTTP JSON')),
      } as unknown as Response);

      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'HTTP_PAYLOAD_PARSE_ERROR',
        finishReason: null,
        hasValidStructure: false,
      });
    });

    it('2. MODEL_REFUSAL when choice contains explicit refusal', async () => {
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              message: { refusal: 'I refuse to evaluate pedagogical records.' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'MODEL_REFUSAL',
        finishReason: 'stop',
        hasValidStructure: false,
      });
    });

    it('3. TOKEN_LIMIT_TRUNCATION when finish_reason is length', async () => {
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'length',
              message: { content: '{"suggestedEvaluation": "Truncated content...' },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'TOKEN_LIMIT_TRUNCATION',
        finishReason: 'length',
        hasValidStructure: false,
      });
    });

    it('4. EMPTY_COMPLETION when completion content is whitespace', async () => {
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: { content: '   ' },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'EMPTY_COMPLETION',
        finishReason: 'stop',
        responseLengthChars: 0,
        hasValidStructure: false,
      });
    });

    it('5. JSON_SYNTAX_ERROR when message content is not parseable JSON', async () => {
      const rawInvalid = 'This is raw prose, not a JSON object';
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: { content: rawInvalid },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'JSON_SYNTAX_ERROR',
        finishReason: 'stop',
        responseLengthChars: rawInvalid.length,
        hasValidStructure: false,
      });
    });

    it('6. SCHEMA_KEY_MISMATCH when keys differ or unexpected keys present', async () => {
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  wrongProperty: 'text',
                }),
              },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'SCHEMA_KEY_MISMATCH',
        finishReason: 'stop',
        hasValidStructure: false,
      });
    });

    it('7. BELOW_MIN_LENGTH when evaluation is shorter than 30 characters', async () => {
      const shortText = 'Demasiado breve.';
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  suggestedEvaluation: shortText,
                }),
              },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'BELOW_MIN_LENGTH',
        finishReason: 'stop',
        responseLengthChars: shortText.trim().length,
        limitChars: 30,
        hasValidStructure: true,
      });
    });

    it('8. EXCEEDS_MAX_LENGTH when evaluation exceeds 1,000 characters', async () => {
      const longText = 'Durante la jornada pedagógica, '.repeat(40); // > 1200 chars
      expect(longText.length).toBeGreaterThan(1000);

      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  suggestedEvaluation: longText,
                }),
              },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'EXCEEDS_MAX_LENGTH',
        finishReason: 'stop',
        responseLengthChars: longText.trim().length,
        limitChars: 1000,
        hasValidStructure: true,
      });
    });

    it('9. PROHIBITED_LANGUAGE_VIOLATION when response contains prohibited language', async () => {
      const prohibitedText = 'Durante la jornada, se logró el objetivo planteado para todos los lactantes presentes.';
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  suggestedEvaluation: prohibitedText,
                }),
              },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'PROHIBITED_LANGUAGE_VIOLATION',
        finishReason: 'stop',
        responseLengthChars: prohibitedText.trim().length,
        limitChars: undefined,
        hasValidStructure: true,
      });
    });
  });

  // ==========================================================================
  // SR-MD-18-AD — PROMPT LENGTH DIRECTIVES & CANONICAL CONTRACT REGRESSION
  // ==========================================================================
  describe('SR-MD-18-AD — Prompt Length Directives & Strict Canonical Contract', () => {
    it('1. system instruction explicitly specifies maximum 1,000 characters limit', () => {
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('1,000 caracteres');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('STRICT LENGTH INVARIANT');
    });

    it('2. system instruction explicitly guides towards 600–800 characters target range', () => {
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('600 y 800 caracteres');
      expect(EVALUATION_AI_SYSTEM_INSTRUCTION).toContain('600 to 800 characters');
    });

    it('3. model receives all 4 observation fields as factual context for synthesis', () => {
      const fullContextPayload: SanitizedEvaluationAIPayload = {
        ...validPayload,
        humanEvidence: {
          activitiesDevelopment: 'A'.repeat(313),
          groupResponse: 'B'.repeat(360),
          adaptations: 'C'.repeat(292),
          continuity: 'D'.repeat(267),
        },
      };
      const { userPrompt } = buildEvaluationAIPrompt(fullContextPayload);
      expect(userPrompt).toContain('- Activities Development:\n' + 'A'.repeat(313));
      expect(userPrompt).toContain('- Group Response:\n' + 'B'.repeat(360));
      expect(userPrompt).toContain('- Adaptations Made:\n' + 'C'.repeat(292));
      expect(userPrompt).toContain('- Pedagogical Continuity:\n' + 'D'.repeat(267));
    });

    it('4. simulated response of 800 characters within target range is accepted', async () => {
      const text800 = 'Durante la jornada pedagógica institucional, '.repeat(18).slice(0, 800);
      expect(text800.length).toBe(800);

      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({ suggestedEvaluation: text800 }),
              },
            },
          ],
        }),
      });

      const res = await provider.assist(validPayload);
      expect(res.suggestedEvaluation).toBe(text800);
    });

    it('5. simulated response of exactly 1,000 characters is accepted', async () => {
      const text1000 = 'Durante la jornada pedagógica institucional, '.repeat(23).slice(0, 1000);
      expect(text1000.length).toBe(1000);

      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({ suggestedEvaluation: text1000 }),
              },
            },
          ],
        }),
      });

      const res = await provider.assist(validPayload);
      expect(res.suggestedEvaluation).toBe(text1000);
    });

    it('6. simulated response of 1,001 characters is rejected with EXCEEDS_MAX_LENGTH', async () => {
      const text1001 = 'Durante la jornada pedagógica institucional, '.repeat(22) + 'A'.repeat(11);
      expect(text1001.length).toBe(1001);
      expect(text1001.trim().length).toBe(1001);

      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({ suggestedEvaluation: text1001 }),
              },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'EXCEEDS_MAX_LENGTH',
        finishReason: 'stop',
        responseLengthChars: 1001,
        limitChars: 1000,
        hasValidStructure: true,
      });
    });

    it('6b. simulated response of exactly 1,447 characters (TutorIA 138 real size) is rejected with EXCEEDS_MAX_LENGTH', async () => {
      const text1447 = 'Durante la jornada pedagógica institucional, '.repeat(34).slice(0, 1447);
      expect(text1447.length).toBe(1447);

      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({ suggestedEvaluation: text1447 }),
              },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics).toEqual({
        rejectionStage: 'EXCEEDS_MAX_LENGTH',
        finishReason: 'stop',
        responseLengthChars: 1447,
        limitChars: 1000,
        hasValidStructure: true,
      });
    });

    it('7. prohibited content rules remain strictly active and fail closed', async () => {
      const prohibitedText = 'Durante la actividad se logró el objetivo al 100% en todos los niños.';
      const provider = new OpenAIEvaluationAIProvider({
        apiKey: 'test-key',
        fetchFn: createMockFetch(200, {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({ suggestedEvaluation: prohibitedText }),
              },
            },
          ],
        }),
      });

      let err: any;
      try {
        await provider.assist(validPayload);
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(EvaluationAIProviderMalformedResponseError);
      expect(err.diagnostics?.rejectionStage).toBe('PROHIBITED_LANGUAGE_VIOLATION');
    });
  });
});
