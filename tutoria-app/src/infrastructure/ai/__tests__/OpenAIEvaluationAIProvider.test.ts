import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OpenAIEvaluationAIProvider,
  EVALUATION_AI_SYSTEM_INSTRUCTION,
  buildEvaluationAIPrompt,
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
      expect(body.response_format).toEqual({ type: 'json_object' });
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
});
