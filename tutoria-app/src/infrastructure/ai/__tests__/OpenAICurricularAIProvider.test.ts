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
    expect(userContent).toContain('Lactantes C (ID: lactantes-c)');
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
});
