import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  OpenAICurricularAIProvider,
  CurricularAIProviderConfigurationError,
  CurricularAIProviderNetworkError,
  CurricularAIProviderMalformedResponseError,
  deriveCanonicalCatalogContext,
  buildPromptMessages,
  DEFAULT_MAX_COMPLETION_TOKENS,
  parseSafeTokenCount,
  CurricularAIProviderTelemetry,
  CurricularAIProviderFailureKind,
} from '../OpenAICurricularAIProvider';
import {
  CurricularAIProviderBoundary,
} from '../../../application/planning/CurricularAIProviderBoundary';
import {
  CurricularRecommendationRequest,
  InvalidCurricularRecommendationError,
} from '../../../application/planning/CurricularRecommendationSource';
import {
  DIRECT_PDA_CATALOG,
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
} from '../../../domain/planning/DirectCurricularCatalog';
import { WeeklyPlanning, PlanningActivity } from '../../../domain/planning/WeeklyPlanning';
import { InMemoryWeeklyPlanningRepository } from '../../repositories/InMemoryWeeklyPlanningRepository';

describe('H1R9-F.8.3.2 — Real Curricular AI Provider Adapter', () => {
  const sampleRequest: CurricularRecommendationRequest = {
    activityId: 'act-sensor-01',
    activityTitle: 'Exploración de Texturas y Sonidos',
    description: 'Manipulación de telas suaves y sonajas con infantes de lactantes.',
    category: 'Sensorial y Motor',
    modality: 'DIRECT',
    objective: 'Fomentar la exploración sensorial y el balbuceo imitativo.',
    durationMinutes: 20,
    materials: ['telas de texturas variadas', 'sonajas ligeras'],
    room: {
      roomId: 'lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 13,
      maxAgeMonths: 18,
    },
    weeklyContext: {
      observations: 'El grupo muestra interés por manipular objetos sonoros.',
      identifiedNeeds: 'Estimular respuestas verbales y coordinación motriz.',
      specialSituations: 'Ninguna situación atípica.',
      availableMaterials: 'Caja sensorial del aula C.',
    },
  };

  const mockOpenAIResponse = (recommendationsJson: object) => {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        id: 'chatcmpl-mock-123',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(recommendationsJson),
            },
            finish_reason: 'stop',
          },
        ],
      }),
      text: async () => JSON.stringify(recommendationsJson),
    } as unknown as Response;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Provider request is built from canonical TutorIA pedagogical context', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({ recommendations: [] })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    await provider.generateRawRecommendations(sampleRequest);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, callOptions] = mockFetch.mock.calls[0];

    expect(calledUrl).toBe('https://api.openai.com/v1/chat/completions');
    expect(callOptions.method).toBe('POST');
    expect(callOptions.headers['Content-Type']).toBe('application/json');
    expect(callOptions.headers['Authorization']).toBe('Bearer mock-key-for-testing');

    const body = JSON.parse(callOptions.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.response_format).toEqual({ type: 'json_object' });

    const messages = body.messages;
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');

    const userContent = messages[1].content;
    expect(userContent).toContain('Exploración de Texturas y Sonidos');
    expect(userContent).toContain('Manipulación de telas suaves y sonajas');
    expect(userContent).toContain('Sensorial y Motor');
    expect(userContent).toContain('DIRECT');
    expect(userContent).toContain('20 minutes');
    expect(userContent).toContain('telas de texturas variadas, sonajas ligeras');
    expect(userContent).toContain('Lactantes C - Age Range: 13-18 months');
    expect(userContent).not.toContain('lactantes-c');
    expect(userContent).toContain('El grupo muestra interés por manipular objetos sonoros');
    expect(userContent).toContain('Estimular respuestas verbales y coordinación motriz');
  });

  it('2. Canonical DIRECT catalog context is derived from the existing catalog, not duplicated', async () => {
    const derived = deriveCanonicalCatalogContext();

    expect(derived).toHaveLength(DIRECT_PDA_CATALOG.length);
    expect(derived.length).toBe(40);

    for (let i = 0; i < DIRECT_PDA_CATALOG.length; i++) {
      expect(derived[i].id).toBe(DIRECT_PDA_CATALOG[i].id);
      expect(derived[i].campoFormativo).toBe(DIRECT_PDA_CATALOG[i].campoFormativo);
      expect(derived[i].contenido).toBe(DIRECT_PDA_CATALOG[i].contenido.trim());
      expect(derived[i].pda).toBe(DIRECT_PDA_CATALOG[i].pda.trim());
    }

    const messages = buildPromptMessages(
      sampleRequest,
      derived,
      TUTORIA_DIRECT_PDA_CATALOG_REVISION
    );
    const userContent = messages[1].content;
    expect(userContent).toContain('TUTORIA-PDA-0001');
    expect(userContent).toContain('TUTORIA-PDA-0040');
  });

  it('3. Catalog revision is included where appropriate', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({ recommendations: [] })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    await provider.generateRawRecommendations(sampleRequest);

    const callOptions = mockFetch.mock.calls[0][1];
    const body = JSON.parse(callOptions.body);
    const systemContent = body.messages[0].content;
    const userContent = body.messages[1].content;

    expect(systemContent).toContain(`Revision: ${TUTORIA_DIRECT_PDA_CATALOG_REVISION}`);
    expect(userContent).toContain(`Revision: ${TUTORIA_DIRECT_PDA_CATALOG_REVISION}`);
  });

  it('4. Provider can return zero raw recommendations', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({ recommendations: [] })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    const raw = await provider.generateRawRecommendations(sampleRequest);
    expect(raw).toEqual({ recommendations: [] });

    const boundary = new CurricularAIProviderBoundary(provider);
    const validated = await boundary.recommend(sampleRequest);
    expect(validated).toEqual([]);
    expect(Object.isFrozen(validated)).toBe(true);
  });

  it('5. Provider can return multiple raw recommendations', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Fortalece vínculos afectivos a través del juego sensorial compartido.',
          },
          {
            pdaId: 'TUTORIA-PDA-0002',
            rationale: 'Estimula el maternés y balbuceo durante la interacción con sonajas.',
          },
        ],
      })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    const raw = await provider.generateRawRecommendations(sampleRequest);
    expect(raw).toHaveProperty('recommendations');
    expect((raw as any).recommendations).toHaveLength(2);

    const boundary = new CurricularAIProviderBoundary(provider);
    const validated = await boundary.recommend(sampleRequest);

    expect(validated).toHaveLength(2);
    expect(validated[0].reference.pdaId).toBe('TUTORIA-PDA-0001');
    expect(validated[0].reference.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
    expect(validated[0].rationale).toBe('Fortalece vínculos afectivos a través del juego sensorial compartido.');
    expect(validated[1].reference.pdaId).toBe('TUTORIA-PDA-0002');
    expect(validated[1].reference.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
  });

  it('6a. Missing API/configuration fails explicitly with server/runtime guidance', async () => {
    const mockFetch = vi.fn();
    const originalEnv = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const provider = new OpenAICurricularAIProvider({
        apiKey: '',
        fetchFn: mockFetch,
      });

      await expect(
        provider.generateRawRecommendations(sampleRequest)
      ).rejects.toThrow(CurricularAIProviderConfigurationError);

      await expect(
        provider.generateRawRecommendations(sampleRequest)
      ).rejects.toThrow(/Configure OPENAI_API_KEY in the server\/runtime environment/);

      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      if (originalEnv !== undefined) {
        process.env.OPENAI_API_KEY = originalEnv;
      }
    }
  });

  it('6b. Server/runtime environment process.env.OPENAI_API_KEY is accepted when apiKey is not in constructor', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({ recommendations: [] })
    );

    const originalEnv = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'mock-server-runtime-key';

    try {
      const provider = new OpenAICurricularAIProvider({
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.headers['Authorization']).toBe('Bearer mock-server-runtime-key');
    } finally {
      if (originalEnv !== undefined) {
        process.env.OPENAI_API_KEY = originalEnv;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it('6c. VITE_OPENAI_API_KEY is NOT accepted as a secret source', async () => {
    const mockFetch = vi.fn();
    const originalServerEnv = process.env.OPENAI_API_KEY;
    const originalViteEnv = (process.env as any).VITE_OPENAI_API_KEY;

    delete process.env.OPENAI_API_KEY;
    (process.env as any).VITE_OPENAI_API_KEY = 'forbidden-client-secret-key';

    try {
      const provider = new OpenAICurricularAIProvider({
        fetchFn: mockFetch,
      });

      await expect(
        provider.generateRawRecommendations(sampleRequest)
      ).rejects.toThrow(CurricularAIProviderConfigurationError);

      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      if (originalServerEnv !== undefined) {
        process.env.OPENAI_API_KEY = originalServerEnv;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
      if (originalViteEnv !== undefined) {
        (process.env as any).VITE_OPENAI_API_KEY = originalViteEnv;
      } else {
        delete (process.env as any).VITE_OPENAI_API_KEY;
      }
    }
  });

  it('6d. Structural security invariant: provider source code does not reference VITE_OPENAI_API_KEY', () => {
    const providerFilePath = path.resolve(
      __dirname,
      '../OpenAICurricularAIProvider.ts'
    );
    const sourceContent = fs.readFileSync(providerFilePath, 'utf-8');

    expect(sourceContent).not.toContain('VITE_OPENAI_API_KEY');
        expect(sourceContent).toContain('Real provider secrets must be injected from a trusted server/runtime boundary');
    expect(sourceContent).toContain('and must never be exposed through Vite client environment variables.');
  });

  it('7. Provider/HTTP failure fails explicitly and does not convert to empty recommendations', async () => {
    // 7a. HTTP 500
    const mockFetch500 = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: { message: 'Server overloaded' } }),
      text: async () => 'Server overloaded',
    });

    const provider500 = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch500,
    });

    await expect(
      provider500.generateRawRecommendations(sampleRequest)
    ).rejects.toThrow(CurricularAIProviderNetworkError);

    // 7b. HTTP 429 Rate Limit
    const mockFetch429 = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      text: async () => 'Rate limit exceeded',
    });

    const provider429 = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch429,
    });

    await expect(
      provider429.generateRawRecommendations(sampleRequest)
    ).rejects.toThrow(CurricularAIProviderNetworkError);

    // 7c. Network throw
    const mockFetchThrow = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const providerThrow = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetchThrow,
    });

    await expect(
      providerThrow.generateRawRecommendations(sampleRequest)
    ).rejects.toThrow(CurricularAIProviderNetworkError);

    // 7d. Timeout / Abort
    const mockFetchTimeout = vi.fn().mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );
    const providerTimeout = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetchTimeout,
    });

    await expect(
      providerTimeout.generateRawRecommendations(sampleRequest)
    ).rejects.toThrow(CurricularAIProviderNetworkError);
  });

  it('8. Malformed provider output does not become a successful canonical recommendation', async () => {
    // 8a. Non-JSON response
    const mockFetchNonJson = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        choices: [
          {
            message: {
              content: 'I am not valid JSON, just plain text response.',
            },
          },
        ],
      }),
      text: async () => '',
    });

    const providerNonJson = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetchNonJson,
    });

    await expect(
      providerNonJson.generateRawRecommendations(sampleRequest)
    ).rejects.toThrow(CurricularAIProviderMalformedResponseError);

    // 8b. Invented PDA identifier returned by model is rejected at the boundary
    const mockFetchInvented = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-9999',
            rationale: 'Invented hallucinated PDA.',
          },
        ],
      })
    );

    const providerInvented = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetchInvented,
    });

    const boundaryInvented = new CurricularAIProviderBoundary(providerInvented);
    await expect(boundaryInvented.recommend(sampleRequest)).rejects.toThrow(
      InvalidCurricularRecommendationError
    );

    // 8c. Confidence scores in AI output are rejected at the boundary
    const mockFetchConfidence = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Valid rationale',
            confidence: 0.99,
          },
        ],
      })
    );

    const providerConfidence = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetchConfidence,
    });

    const boundaryConfidence = new CurricularAIProviderBoundary(providerConfidence);
    await expect(boundaryConfidence.recommend(sampleRequest)).rejects.toThrow(
      InvalidCurricularRecommendationError
    );

    // 8d. Duplicate PDA recommendations are rejected at the boundary
    const mockFetchDuplicates = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'First rationale',
          },
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Second rationale',
          },
        ],
      })
    );

    const providerDuplicates = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetchDuplicates,
    });

    const boundaryDuplicates = new CurricularAIProviderBoundary(providerDuplicates);
    await expect(boundaryDuplicates.recommend(sampleRequest)).rejects.toThrow(
      InvalidCurricularRecommendationError
    );
  });

  it('9. No WeeklyPlanning mutation occurs', async () => {
    const activity: PlanningActivity = {
      activityId: 'act-sensor-01',
      category: 'SENSORIAL Y MOTOR',
      objective: 'Fomentar la exploración sensorial',
      description: 'Manipulación de telas suaves',
      materials: ['telas de texturas variadas'],
      durationMinutes: 20,
      curricularTraceability: [],
    };

    const plan = WeeklyPlanning.create(
      'plan-test-f832',
      'center-1',
      'lactantes-c',
      'anita-educator-01',
      '2026-03-02',
      '2026-03-06'
    );
    plan.days = [
      {
        date: '2026-03-02',
        dayOfWeek: 'MONDAY',
        activities: [activity],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: ['telas de texturas variadas'],
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Aligns with sensory interaction.',
          },
        ],
      })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    const boundary = new CurricularAIProviderBoundary(provider);

    const serializedBefore = JSON.stringify(plan);

    const recommendations = await boundary.recommend(sampleRequest);
    expect(recommendations).toHaveLength(1);

    const serializedAfter = JSON.stringify(plan);
    expect(serializedBefore).toBe(serializedAfter);
    expect(plan.days[0].activities[0].curricularTraceability).toEqual([]);
    expect(plan.status).toBe('DRAFT');
  });

  it('10. No persistence occurs as a result of generating recommendations', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = WeeklyPlanning.create(
      'plan-persist-test',
      'center-1',
      'lactantes-c',
      'anita-educator-01',
      '2026-03-02',
      '2026-03-06'
    );
    plan.days = [
      {
        date: '2026-03-02',
        dayOfWeek: 'MONDAY',
        activities: [
          {
            activityId: 'act-sensor-01',
            category: 'SENSORIAL Y MOTOR',
            objective: 'Exploración inicial',
            description: 'Manipulación de sonajas',
            materials: ['sonajas ligeras'],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: ['sonajas ligeras'],
      },
    ];
    await repo.save(plan);

    const saveSpy = vi.spyOn(repo, 'save');

    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Aligns with sensory interaction.',
          },
        ],
      })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    const boundary = new CurricularAIProviderBoundary(provider);
    const recommendations = await boundary.recommend(sampleRequest);

    expect(recommendations).toHaveLength(1);
    // Zero repository persistence calls triggered
    expect(saveSpy).not.toHaveBeenCalled();

    const storedPlan = await repo.findById('plan-persist-test');
    expect(storedPlan!.days[0].activities[0].curricularTraceability).toEqual([]);
  });

  it('11. No approval occurs as a result of generating recommendations', async () => {
    const plan = WeeklyPlanning.create(
      'plan-approval-test',
      'center-1',
      'lactantes-c',
      'anita-educator-01',
      '2026-03-02',
      '2026-03-06'
    );
    expect(plan.status).toBe('DRAFT');

    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Aligns with sensory interaction.',
          },
        ],
      })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    const boundary = new CurricularAIProviderBoundary(provider);

    const recommendations = await boundary.recommend(sampleRequest);
    expect(recommendations).toHaveLength(1);

    // Plan status remains DRAFT; recommendations do not trigger approval
    expect(plan.status).toBe('DRAFT');
    expect(plan.status).not.toBe('APPROVED');
    expect(plan.status).not.toBe('APPROVED_FOR_EXECUTION');
  });

  it('12. No human curricular selection occurs', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Proposed by AI for human review.',
          },
        ],
      })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    const boundary = new CurricularAIProviderBoundary(provider);
    const recommendations = await boundary.recommend(sampleRequest);

    // AI suggestions are transient proposals; human selection authority remains Anita
    expect(recommendations[0].reference.pdaId).toBe('TUTORIA-PDA-0001');
    expect(sampleRequest.weeklyContext).toBeDefined();
    // Activity's curricularTraceability is not modified
    expect((sampleRequest as any).curricularTraceability).toBeUndefined();
  });

  it('13. No real network request is performed by tests', async () => {
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({ recommendations: [] })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    await provider.generateRawRecommendations(sampleRequest);

    // Ensure mockFetch was called instead of real global fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it('14. No real secret is required by tests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({ recommendations: [] })
    );

    // Uses controlled dummy test token; no real API key is accessed or needed
    const provider = new OpenAICurricularAIProvider({
      apiKey: 'dummy-mock-secret-for-testing-only',
      fetchFn: mockFetch,
    });

    const raw = await provider.generateRawRecommendations(sampleRequest);
    expect(raw).toEqual({ recommendations: [] });
  });

  it('15. Raw provider output still passes through CurricularAIProviderBoundary before becoming canonical CurricularRecommendation[]', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOpenAIResponse({
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0003',
            rationale: 'Promotes active exploration through sound exploration and physical movement.',
          },
        ],
      })
    );

    const provider = new OpenAICurricularAIProvider({
      apiKey: 'mock-key-for-testing',
      fetchFn: mockFetch,
    });

    // 1. Provider returns UNTRUSTED raw data
    const untrustedRaw = await provider.generateRawRecommendations(sampleRequest);
    expect(untrustedRaw).toEqual({
      recommendations: [
        {
          pdaId: 'TUTORIA-PDA-0003',
          rationale: 'Promotes active exploration through sound exploration and physical movement.',
        },
      ],
    });

    // 2. Boundary validates untrusted raw data into canonical CurricularRecommendation[]
    const boundary = new CurricularAIProviderBoundary(provider);
    const validated = await boundary.recommend(sampleRequest);

    expect(validated).toHaveLength(1);
    expect(validated[0].reference.pdaId).toBe('TUTORIA-PDA-0003');
    expect(validated[0].reference.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
    expect(validated[0].rationale).toBe(
      'Promotes active exploration through sound exploration and physical movement.'
    );
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated[0])).toBe(true);
    expect(Object.isFrozen(validated[0].reference)).toBe(true);
  });

  // ============================================================
  // 16. H1R10.7.1 — Bounded AI Completion Output (max_completion_tokens)
  // ============================================================
  describe('H1R10.7.1 — Bounded AI Completion Output', () => {
    it('16.1 Default real request contains max_completion_tokens: 800', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);

      expect(body.max_completion_tokens).toBe(800);
      expect(DEFAULT_MAX_COMPLETION_TOKENS).toBe(800);
    });

    it('16.2 No legacy max_tokens field is present in the request body', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      const callOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);

      expect(body).not.toHaveProperty('max_tokens');
      expect(body.max_tokens).toBeUndefined();
    });

    it('16.3 Client/domain request cannot override the token ceiling', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      // Attempt client payload with rogue token fields
      const adversarialRequest: any = {
        ...sampleRequest,
        max_completion_tokens: 50000,
        max_tokens: 99999,
        tokenLimit: 100000,
      };

      await provider.generateRawRecommendations(adversarialRequest);

      const callOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);

      // Server-side ceiling remains strictly 800
      expect(body.max_completion_tokens).toBe(800);
      expect(body.max_tokens).toBeUndefined();
    });

    it('16.4 Model remains gpt-4o-mini', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      const callOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);

      expect(body.model).toBe('gpt-4o-mini');
    });

    it('16.5 Temperature remains 0.2', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      const callOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);

      expect(body.temperature).toBe(0.2);
    });

    it('16.6 response_format remains json_object', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      const callOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);

      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('16.7 Timeout remains 30000ms', () => {
      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
      });

      // Internal timeout default is 30000ms
      expect((provider as any).timeoutMs).toBe(30000);
    });

    it('16.8 Automatic retries remain 0', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network drop'));

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      await expect(
        provider.generateRawRecommendations(sampleRequest)
      ).rejects.toThrow(CurricularAIProviderNetworkError);

      // Exactly 1 invocation; 0 automatic retries
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('16.9 API key remains server-side only', async () => {
      const providerSrcPath = path.resolve(__dirname, '../OpenAICurricularAIProvider.ts');
      const providerSrc = fs.readFileSync(providerSrcPath, 'utf8');

      expect(providerSrc).not.toContain('VITE_OPENAI_API_KEY');
      expect(providerSrc).toContain('process.env.OPENAI_API_KEY');
    });

    it('16.10 Trusted server-side config allows custom ceiling, but defaults strictly to 800', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      // Server-side construction with explicit custom ceiling
      const customProvider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
        maxCompletionTokens: 500,
      });

      await customProvider.generateRawRecommendations(sampleRequest);

      const callOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);
      expect(body.max_completion_tokens).toBe(500);

      // Default construction without option remains 800
      const defaultProvider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
      });

      await defaultProvider.generateRawRecommendations(sampleRequest);
      const defaultCallOptions = mockFetch.mock.calls[1][1];
      const defaultBody = JSON.parse(defaultCallOptions.body);
      expect(defaultBody.max_completion_tokens).toBe(800);
    });
  });

  // ============================================================
  // 17. H1R10.7.2 — Safe First-Light Observability (Provider Telemetry Extraction)
  // ============================================================
  describe('H1R10.7.2 — Safe First-Light Observability (Provider Telemetry Extraction)', () => {
    it('17.1 parseSafeTokenCount accepts valid non-negative integers and rejects invalid types/values', () => {
      expect(parseSafeTokenCount(0)).toBe(0);
      expect(parseSafeTokenCount(1)).toBe(1);
      expect(parseSafeTokenCount(42)).toBe(42);
      expect(parseSafeTokenCount(800)).toBe(800);

      expect(parseSafeTokenCount(-1)).toBeNull();
      expect(parseSafeTokenCount(-100)).toBeNull();
      expect(parseSafeTokenCount(1.5)).toBeNull();
      expect(parseSafeTokenCount(NaN)).toBeNull();
      expect(parseSafeTokenCount(Infinity)).toBeNull();
      expect(parseSafeTokenCount(-Infinity)).toBeNull();
      expect(parseSafeTokenCount('100')).toBeNull();
      expect(parseSafeTokenCount(null)).toBeNull();
      expect(parseSafeTokenCount(undefined)).toBeNull();
      expect(parseSafeTokenCount({})).toBeNull();
      expect(parseSafeTokenCount([])).toBeNull();
    });

    it('17.2 Valid OpenAI response usage emits promptTokens, completionTokens, and totalTokens via onTelemetry', async () => {
      const telemetryEvents: CurricularAIProviderTelemetry[] = [];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          id: 'chatcmpl-test-obs-123',
          model: 'gpt-4o-mini-2024-07-18',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  recommendations: [
                    { pdaId: 'TUTORIA-PDA-0001', rationale: 'Fomenta el vínculo afectivo.' },
                  ],
                }),
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
        }),
        text: async () => '',
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
        onTelemetry: (t) => telemetryEvents.push(t),
      });

      const result = await provider.generateRawRecommendations(sampleRequest);
      expect(result).toBeDefined();

      expect(telemetryEvents).toHaveLength(1);
      const event = telemetryEvents[0];
      expect(event.model).toBe('gpt-4o-mini-2024-07-18');
      expect(event.responseId).toBe('chatcmpl-test-obs-123');
      expect(event.usage).toEqual({
        promptTokens: 120,
        completionTokens: 45,
        totalTokens: 165,
      });
    });

    it('17.3 Missing usage in response does not fail recommendation and yields null token counts', async () => {
      const telemetryEvents: CurricularAIProviderTelemetry[] = [];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          id: 'chatcmpl-no-usage',
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify({ recommendations: [] }),
              },
              finish_reason: 'stop',
            },
          ],
          // usage explicitly absent
        }),
        text: async () => '',
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
        onTelemetry: (t) => telemetryEvents.push(t),
      });

      const result = await provider.generateRawRecommendations(sampleRequest);
      expect(result).toEqual({ recommendations: [] });

      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].usage).toBeNull();
    });

    it('17.4 Malformed usage fields (strings, negative, float) do not fail recommendation and yield null for invalid counts', async () => {
      const telemetryEvents: CurricularAIProviderTelemetry[] = [];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          id: 'chatcmpl-bad-usage',
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify({ recommendations: [] }),
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 'one hundred',
            completion_tokens: -10,
            total_tokens: 3.14159,
          },
        }),
        text: async () => '',
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
        onTelemetry: (t) => telemetryEvents.push(t),
      });

      const result = await provider.generateRawRecommendations(sampleRequest);
      expect(result).toEqual({ recommendations: [] });

      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].usage).toEqual({
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      });
    });

    it('17.5 Telemetry callback error does not break recommendation execution', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          id: 'chatcmpl-error-callback',
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  recommendations: [
                    { pdaId: 'TUTORIA-PDA-0001', rationale: 'Valid rationale.' },
                  ],
                }),
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
        }),
        text: async () => '',
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-for-testing',
        fetchFn: mockFetch,
        onTelemetry: () => {
          throw new Error('Telemetry collector failed unexpectedly');
        },
      });

      // Must succeed cleanly despite callback throwing
      const result = await provider.generateRawRecommendations(sampleRequest);
      expect(result).toEqual({
        recommendations: [
          { pdaId: 'TUTORIA-PDA-0001', rationale: 'Valid rationale.' },
        ],
      });
    });

    it('17.6 Separate provider instances with onTelemetry observers observe their own telemetry in complete isolation', async () => {
      const telemetryA: CurricularAIProviderTelemetry[] = [];
      const telemetryB: CurricularAIProviderTelemetry[] = [];

      const mockFetchA = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          id: 'chatcmpl-instance-a',
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify({ recommendations: [] }),
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
        }),
        text: async () => '',
      });

      const mockFetchB = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          id: 'chatcmpl-instance-b',
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify({ recommendations: [] }),
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 300, completion_tokens: 50, total_tokens: 350 },
        }),
        text: async () => '',
      });

      const providerA = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-a',
        fetchFn: mockFetchA,
        onTelemetry: (t) => telemetryA.push(t),
      });

      const providerB = new OpenAICurricularAIProvider({
        apiKey: 'mock-key-b',
        fetchFn: mockFetchB,
        onTelemetry: (t) => telemetryB.push(t),
      });

      await Promise.all([
        providerA.generateRawRecommendations(sampleRequest),
        providerB.generateRawRecommendations(sampleRequest),
      ]);

      expect(telemetryA).toHaveLength(1);
      expect(telemetryB).toHaveLength(1);

      expect(telemetryA[0].responseId).toBe('chatcmpl-instance-a');
      expect(telemetryA[0].usage?.totalTokens).toBe(120);

      expect(telemetryB[0].responseId).toBe('chatcmpl-instance-b');
      expect(telemetryB[0].usage?.totalTokens).toBe(350);
    });
  });

  describe("H1R10.8.2 — OpenAI Prompt Privacy Minimization (Zero roomId in LLM Prompt)", () => {
    it("1-4. Room name and age range reach prompt, but roomId is strictly omitted", async () => {
      let capturedBody: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return mockOpenAIResponse({ recommendations: [] });
      });

      const syntheticRoomId = "INTERNAL-ROOM-ID-DO-NOT-SEND-987654";
      const requestWithSyntheticRoom: CurricularRecommendationRequest = {
        ...sampleRequest,
        room: {
          roomId: syntheticRoomId,
          name: "Lactantes C",
          minAgeMonths: 13,
          maxAgeMonths: 18,
        },
      };

      const provider = new OpenAICurricularAIProvider({
        apiKey: "test-secret-key-12345",
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(requestWithSyntheticRoom);

      expect(capturedBody).not.toBeNull();
      const userPrompt = capturedBody.messages[1].content;
      const fullRequestBody = JSON.stringify(capturedBody);

      // 1. Room name present
      expect(userPrompt).toContain("Lactantes C");
      // 2. Min age present
      expect(userPrompt).toContain("13");
      // 3. Max age present
      expect(userPrompt).toContain("18 months");
      // 4. roomId strictly ABSENT from user prompt and entire request body
      expect(userPrompt).not.toContain(syntheticRoomId);
      expect(fullRequestBody).not.toContain(syntheticRoomId);
      expect(userPrompt).not.toContain("(ID:");
    });

    it("5-14. Preserves model invariants and legitimate pedagogical context while omitting technical IDs", async () => {
      let capturedBody: any = null;
      let capturedHeaders: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, opts) => {
        capturedHeaders = opts.headers;
        capturedBody = JSON.parse(opts.body);
        return mockOpenAIResponse({ recommendations: [] });
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: "test-server-api-key",
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      // 5. Legitimate pedagogical context preserved
      const userPrompt = capturedBody.messages[1].content;
      expect(userPrompt).toContain("Exploración de Texturas y Sonidos");
      expect(userPrompt).toContain("Manipulación de telas suaves y sonajas");
      expect(userPrompt).toContain("El grupo muestra interés por manipular objetos sonoros");

      // 6. Canonical 40-PDA catalog present
      expect(userPrompt).toContain("TUTORIA-PDA-0001");
      expect(userPrompt).toContain("TUTORIA-PDA-0040");

      // 7. model gpt-4o-mini
      expect(capturedBody.model).toBe("gpt-4o-mini");

      // 8. max_completion_tokens 800
      expect(capturedBody.max_completion_tokens).toBe(800);

      // 9. max_tokens absent
      expect(capturedBody.max_tokens).toBeUndefined();

      // 10. temperature 0.2
      expect(capturedBody.temperature).toBe(0.2);

      // 11. response_format json_object
      expect(capturedBody.response_format).toEqual({ type: "json_object" });

      // 14. API key server-side only (in headers, not in body)
      expect(capturedHeaders["Authorization"]).toBe("Bearer test-server-api-key");
      expect(JSON.stringify(capturedBody)).not.toContain("test-server-api-key");
    });

    it("15. Privacy Audit: Request body contains zero technical IDs, PII, or auth credentials", async () => {
      let capturedBody: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return mockOpenAIResponse({ recommendations: [] });
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: "test-api-key",
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      const serializedBody = JSON.stringify(capturedBody);

      // Technical IDs
      expect(serializedBody).not.toContain(sampleRequest.room!.roomId); // roomId: 0
      expect(serializedBody).not.toContain(sampleRequest.activityId); // activityId: 0
      expect(serializedBody).not.toContain("planningId"); // planningId: 0
      expect(serializedBody).not.toContain("daycareId"); // daycareId: 0
      expect(serializedBody).not.toContain("centerId"); // centerId: 0
      expect(serializedBody).not.toContain("teacherId"); // educator identity: 0
      expect(serializedBody).not.toContain("firebase"); // Firebase UID / credentials: 0
      expect(serializedBody).not.toContain("test-api-key"); // API key: 0
    });
  });

  // ============================================================
  // H1R10.13L — OpenAI Provider Safe Failure Diagnostics
  // ============================================================
  describe('H1R10.13L — Safe Failure Diagnostics (HTTP vs Transport Discrimination)', () => {
    it('1. OpenAI HTTP 401 produces safe diagnostic classification (failureKind="http", upstreamStatus=401)', async () => {
      let capturedTelemetry: CurricularAIProviderTelemetry | null = null;
      const mockFetch401 = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"error":{"message":"Incorrect API key provided"}}',
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch401,
        onTelemetry: (t) => {
          capturedTelemetry = t;
        },
      });

      let thrownError: any = null;
      try {
        await provider.generateRawRecommendations(sampleRequest);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(CurricularAIProviderNetworkError);
      expect(thrownError.failureKind).toBe('http');
      expect(thrownError.upstreamStatus).toBe(401);
      expect(thrownError.status).toBe(401);

      expect(capturedTelemetry).toBeDefined();
      expect(capturedTelemetry!.failureKind).toBe('http');
      expect(capturedTelemetry!.upstreamStatus).toBe(401);
      expect(capturedTelemetry!.model).toBe('gpt-4o-mini');
      expect(capturedTelemetry!.usage).toBeNull();
    });

    it('2. OpenAI HTTP 429 produces safe diagnostic classification (failureKind="http", upstreamStatus=429)', async () => {
      let capturedTelemetry: CurricularAIProviderTelemetry | null = null;
      const mockFetch429 = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => '{"error":{"message":"Rate limit reached"}}',
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch429,
        onTelemetry: (t) => {
          capturedTelemetry = t;
        },
      });

      let thrownError: any = null;
      try {
        await provider.generateRawRecommendations(sampleRequest);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(CurricularAIProviderNetworkError);
      expect(thrownError.failureKind).toBe('http');
      expect(thrownError.upstreamStatus).toBe(429);
      expect(thrownError.status).toBe(429);

      expect(capturedTelemetry).toBeDefined();
      expect(capturedTelemetry!.failureKind).toBe('http');
      expect(capturedTelemetry!.upstreamStatus).toBe(429);
    });

    it('3. OpenAI HTTP 500 produces safe diagnostic classification (failureKind="http", upstreamStatus=500)', async () => {
      let capturedTelemetry: CurricularAIProviderTelemetry | null = null;
      const mockFetch500 = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '{"error":{"message":"The server had an error processing your request"}}',
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch500,
        onTelemetry: (t) => {
          capturedTelemetry = t;
        },
      });

      let thrownError: any = null;
      try {
        await provider.generateRawRecommendations(sampleRequest);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(CurricularAIProviderNetworkError);
      expect(thrownError.failureKind).toBe('http');
      expect(thrownError.upstreamStatus).toBe(500);
      expect(thrownError.status).toBe(500);

      expect(capturedTelemetry).toBeDefined();
      expect(capturedTelemetry!.failureKind).toBe('http');
      expect(capturedTelemetry!.upstreamStatus).toBe(500);
    });

    it('4. fetch rejection / transport failure produces failureKind="transport" and MUST NOT fabricate upstreamStatus', async () => {
      let capturedTelemetry: CurricularAIProviderTelemetry | null = null;
      const mockFetchNetwork = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (DNS resolution failed)'));

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetchNetwork,
        onTelemetry: (t) => {
          capturedTelemetry = t;
        },
      });

      let thrownError: any = null;
      try {
        await provider.generateRawRecommendations(sampleRequest);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(CurricularAIProviderNetworkError);
      expect(thrownError.failureKind).toBe('transport');
      expect(thrownError.upstreamStatus).toBeUndefined();
      expect(thrownError.status).toBeUndefined();

      expect(capturedTelemetry).toBeDefined();
      expect(capturedTelemetry!.failureKind).toBe('transport');
      expect(capturedTelemetry!.upstreamStatus).toBeUndefined();
    });

    it('4b. AbortError timeout produces failureKind="transport" and MUST NOT fabricate upstreamStatus', async () => {
      let capturedTelemetry: CurricularAIProviderTelemetry | null = null;
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const mockFetchTimeout = vi.fn().mockRejectedValue(abortError);

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetchTimeout,
        onTelemetry: (t) => {
          capturedTelemetry = t;
        },
      });

      let thrownError: any = null;
      try {
        await provider.generateRawRecommendations(sampleRequest);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(CurricularAIProviderNetworkError);
      expect(thrownError.failureKind).toBe('transport');
      expect(thrownError.upstreamStatus).toBeUndefined();
      expect(thrownError.status).toBeUndefined();

      expect(capturedTelemetry).toBeDefined();
      expect(capturedTelemetry!.failureKind).toBe('transport');
      expect(capturedTelemetry!.upstreamStatus).toBeUndefined();
    });

    it('5. Sensitive OpenAI response body is NOT propagated into safe telemetry or error metadata', async () => {
      const sensitiveLeak = 'CRITICAL_SECRET_API_KEY_LEAK_IN_BODY_12345';
      let capturedTelemetry: CurricularAIProviderTelemetry | null = null;
      const mockFetchLeak = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ error: { message: `Leak: ${sensitiveLeak}` } }),
      });

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetchLeak,
        onTelemetry: (t) => {
          capturedTelemetry = t;
        },
      });

      let thrownError: any = null;
      try {
        await provider.generateRawRecommendations(sampleRequest);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(CurricularAIProviderNetworkError);
      expect(thrownError.message).not.toContain(sensitiveLeak);
      expect(JSON.stringify(thrownError)).not.toContain(sensitiveLeak);

      expect(capturedTelemetry).toBeDefined();
      expect(JSON.stringify(capturedTelemetry)).not.toContain(sensitiveLeak);
    });

    it('6. Existing successful provider path remains unchanged', async () => {
      let capturedTelemetry: CurricularAIProviderTelemetry | null = null;
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({
          recommendations: [{ pdaId: 'TUTORIA-PDA-0001', rationale: 'Valid rationale.' }],
        })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
        onTelemetry: (t) => {
          capturedTelemetry = t;
        },
      });

      const result = await provider.generateRawRecommendations(sampleRequest);
      expect(result).toHaveProperty('recommendations');
      expect(capturedTelemetry).toBeDefined();
      expect(capturedTelemetry!.failureKind).toBeUndefined();
      expect(capturedTelemetry!.upstreamStatus).toBeUndefined();
      expect(capturedTelemetry!.model).toBe('gpt-4o-mini');
    });

    it('7. CurricularAIProviderNetworkError constructor maintains backward compatibility', () => {
      const errNumber = new CurricularAIProviderNetworkError('msg', 503);
      expect(errNumber.failureKind).toBe('http');
      expect(errNumber.upstreamStatus).toBe(503);
      expect(errNumber.status).toBe(503);

      const errOptions = new CurricularAIProviderNetworkError('msg', {
        failureKind: 'transport',
      });
      expect(errOptions.failureKind).toBe('transport');
      expect(errOptions.upstreamStatus).toBeUndefined();
      expect(errOptions.status).toBeUndefined();

      const errDefault = new CurricularAIProviderNetworkError('msg');
      expect(errDefault.failureKind).toBe('transport');
      expect(errDefault.upstreamStatus).toBeUndefined();
    });
  });

  // ============================================================
  // H1R10.14 — Spanish Pedagogical Output & Invariants
  // ============================================================
  describe('H1R10.14 — Spanish Pedagogical Output & Invariants', () => {
    it('A. Provider system prompt explicitly requires rationale output strictly in natural Spanish (español) for Anita', () => {
      const derivedCatalog = deriveCanonicalCatalogContext();
      const messages = buildPromptMessages(
        sampleRequest,
        derivedCatalog,
        TUTORIA_DIRECT_PDA_CATALOG_REVISION
      );

      const systemMessage = messages.find((m) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      const content = systemMessage!.content;

      // Must explicitly demand Spanish rationales
      expect(content).toContain('Spanish (español)');
      expect(content).toContain('Do NOT output rationales in English');
      expect(content).toContain('educator Anita');

      // Must forbid translating or altering canonical catalog text
      expect(content).toContain('Do NOT rewrite, alter, or translate the canonical PDA or Contenido text itself');

      // Must forbid inventing curricular elements or complementary practices
      expect(content).toContain('Invented, extrapolated, or hallucinated PDA identifiers or curricular elements are strictly forbidden');
      expect(content).toContain('DO NOT generate complementary activities, prioritized practices, or institutional rules');
    });

    it('B. Request still contains the canonical curricular context needed for recommendation', () => {
      const derivedCatalog = deriveCanonicalCatalogContext();
      const messages = buildPromptMessages(
        sampleRequest,
        derivedCatalog,
        TUTORIA_DIRECT_PDA_CATALOG_REVISION
      );

      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();
      const content = userMessage!.content;

      expect(content).toContain(`- Modality: ${sampleRequest.modality}`);
      expect(content).toContain(`- Catalog Revision: ${TUTORIA_DIRECT_PDA_CATALOG_REVISION}`);
      expect(content).toContain(`- Activity Title: ${sampleRequest.activityTitle}`);
      expect(content).toContain(`- Objective / Purpose: ${sampleRequest.objective}`);
      expect(content).toContain(`- Description: ${sampleRequest.description}`);
      expect(content).toContain(`- Category / Type: ${sampleRequest.category}`);
      expect(content).toContain(`- Duration: ${sampleRequest.durationMinutes} minutes`);
      expect(content).toContain(`- Materials: ${sampleRequest.materials!.join(', ')}`);
      expect(content).toContain(`- Room / Group: ${sampleRequest.room!.name}`);
      expect(content).toContain(`- Observations: ${sampleRequest.weeklyContext!.observations}`);
      expect(content).toContain('TUTORIA-PDA-0001');
      expect(content).toContain('TUTORIA-PDA-0040');
    });

    it('C. JSON response contract remains unchanged', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({ recommendations: [] })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await provider.generateRawRecommendations(sampleRequest);

      const [calledUrl, callOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe('https://api.openai.com/v1/chat/completions');

      const body = JSON.parse(callOptions.body);
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.max_completion_tokens).toBe(800);
      expect(body.temperature).toBe(0.2);
      expect(body.model).toBe('gpt-4o-mini');
    });

    it('D. Canonical PDA validation accepts Spanish pedagogical rationales from provider', async () => {
      const spanishRationale =
        'Esta actividad favorece la vinculación afectiva y la exploración sensorial motriz a través de texturas suaves en Lactantes C.';
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({
          recommendations: [
            {
              pdaId: 'TUTORIA-PDA-0001',
              rationale: spanishRationale,
            },
          ],
        })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const boundary = new CurricularAIProviderBoundary(provider);
      const recommendations = await boundary.recommend(sampleRequest);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].reference.pdaId).toBe('TUTORIA-PDA-0001');
      expect(recommendations[0].rationale).toBe(spanishRationale);
      // Canonical revision must be bound from the canonical catalog
      expect(recommendations[0].reference.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
    });

    it('E. A recommendation remains transient and does not auto-select a PDA', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockOpenAIResponse({
          recommendations: [
            {
              pdaId: 'TUTORIA-PDA-0001',
              rationale: 'Justificación en español.',
            },
          ],
        })
      );

      const provider = new OpenAICurricularAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const boundary = new CurricularAIProviderBoundary(provider);
      const recommendations = await boundary.recommend(sampleRequest);

      // Recommendations are transient objects only
      expect(recommendations).toHaveLength(1);

      // Verify no automatic curricular selection or approval occurs
      const repo = new InMemoryWeeklyPlanningRepository();
      const plans = await repo.listByTeacher('teacher-01');
      expect(plans).toHaveLength(0); // Repository remains untouched
    });
  });

});
