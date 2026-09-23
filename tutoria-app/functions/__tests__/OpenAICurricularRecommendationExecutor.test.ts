import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import {
  handleRecommendCurricularPDA,
  RecommendCurricularPDAGatewayRequest,
  CurricularAIAuthorizer,
  defaultProductionAuthorizer,
} from '../src/recommendCurricularPDA';
import {
  OpenAICurricularRecommendationExecutor,
  createOpenAICurricularRecommendationExecutor,
} from '../src/OpenAICurricularRecommendationExecutor';
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from '../../src/domain/planning/DirectCurricularCatalog';
import { WeeklyPlanning } from '../../src/domain/planning/WeeklyPlanning';
import { InMemoryWeeklyPlanningRepository } from '../../src/infrastructure/repositories/InMemoryWeeklyPlanningRepository';

describe('H1R10.3 — OpenAICurricularRecommendationExecutor Server Integration', () => {
  const TEST_API_KEY = 'sk-test-secret-never-expose-in-responses-12345';

  const validPayload: RecommendCurricularPDAGatewayRequest = {
    activityId: 'act-tactile-01',
    activityTitle: 'Exploración con texturas sensoriales',
    objective: 'Favorecer el desarrollo sensorial y la coordinación motriz fina en lactantes',
    modality: 'DIRECT',
    room: {
      roomId: 'lactantes-c-room',
      name: 'Lactantes C',
      minAgeMonths: 6,
      maxAgeMonths: 12,
    },
    description: 'Se presentan telas de diferentes texturas para que los bebés las exploren.',
    category: 'SENSORIAL Y MOTOR',
    durationMinutes: 20,
    materials: ['telas suaves', 'esponjas', 'fieltro'],
    weeklyContext: {
      observations: 'Grupo muestra interés en texturas suaves.',
      identifiedNeeds: 'Estimulación del tacto.',
      specialSituations: 'Ninguna relevante.',
      availableMaterials: 'Caja sensorial con telas variadas.',
    },
  };

  function createCallableRequest(
    data: unknown,
    auth?: { uid: string; token?: Record<string, unknown> }
  ): CallableRequest<unknown> {
    return {
      data,
      rawRequest: {} as any,
      auth: auth ? { uid: auth.uid, token: (auth.token || {}) as any } : undefined,
    } as CallableRequest<unknown>;
  }

  const stubAuthorizedAuthorizer: CurricularAIAuthorizer = async () => ({
    authorized: true,
  });

  function createOpenAIResponseBody(contentPayload: unknown) {
    return {
      id: 'chatcmpl-test-123',
      object: 'chat.completion',
      created: 1710000000,
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              typeof contentPayload === 'string'
                ? contentPayload
                : JSON.stringify(contentPayload),
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    };
  }

  let globalFetchSpy: any;

  beforeEach(() => {
    globalFetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // 1. Valid authenticated + authorized request reaches injected executor/provider path
  // ============================================================
  it('1. Valid authenticated + authorized request reaches injected executor/provider path', async () => {
    let fakeFetchCalled = false;
    const fakeFetch: typeof fetch = async () => {
      fakeFetchCalled = true;
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Fomenta el sosten afectivo y la seguridad emocional.',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    const response = await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    expect(fakeFetchCalled).toBe(true);
    expect(response).toBeDefined();
    expect(response.recommendations).toHaveLength(1);
  });

  // ============================================================
  // 2. Valid fake OpenAI response produces expected canonical gateway response
  // ============================================================
  it('2. Valid fake OpenAI response produces expected canonical gateway response', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Propicia vínculos afectivos seguros y favorece la autonomía.',
              },
              {
                pdaId: 'TUTORIA-PDA-0002',
                rationale: 'Estimula la exploración sensorial táctil.',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    const response = await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    expect(response.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
    expect(response.recommendations).toEqual([
      {
        pdaId: 'TUTORIA-PDA-0001',
        rationale: 'Propicia vínculos afectivos seguros y favorece la autonomía.',
      },
      {
        pdaId: 'TUTORIA-PDA-0002',
        rationale: 'Estimula la exploración sensorial táctil.',
      },
    ]);
  });

  // ============================================================
  // 3. Zero recommendations returns valid empty recommendations
  // ============================================================
  it('3. Zero recommendations returns valid empty recommendations', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    const response = await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    expect(response.recommendations).toEqual([]);
    expect(response.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
  });

  // ============================================================
  // 4. Invented PDA from fake AI is rejected
  // ============================================================
  it('4. Invented PDA from fake AI is rejected by boundary validation with generic message', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-9999', // Hallucinated/invented ID
                rationale: 'PDA no canónico inventado.',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('internal');
      expect(err.message).toBe('Curricular AI recommendation failed canonical boundary validation.');
      expect(err.message).not.toContain('TUTORIA-PDA-9999');
    }
  });

  // ============================================================
  // 5. Wrong/noncanonical response is rejected
  // ============================================================
  it('5. Wrong/noncanonical response is rejected safely with generic message', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: '', // Invalid empty pdaId
                rationale: 'Rationale sin PDA',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('internal');
      expect(err.message).toBe('Curricular AI recommendation failed canonical boundary validation.');
    }
  });

  // ============================================================
  // 6. Duplicate PDA is rejected
  // ============================================================
  it('6. Duplicate PDA is rejected by boundary validation', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Primera sugerencia.',
              },
              {
                pdaId: 'TUTORIA-PDA-0001', // Duplicate
                rationale: 'Segunda sugerencia duplicada.',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('internal');
      expect(err.message).toBe('Curricular AI recommendation failed canonical boundary validation.');
    }
  });

  // ============================================================
  // 7. Forbidden confidence/ranking metadata is rejected
  // ============================================================
  it('7. Forbidden confidence/ranking metadata is rejected by boundary validation', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Intento de clasificacion probabilistica.',
                confidence: 0.98, // FORBIDDEN
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('internal');
      expect(err.message).toBe('Curricular AI recommendation failed canonical boundary validation.');
    }
  });

  // ============================================================
  // 8. Malformed OpenAI response fails safely
  // ============================================================
  it('8. Malformed OpenAI response fails safely with generic message', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'NOT JSON AT ALL' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('internal');
      expect(err.message).toBe('Curricular AI recommendation service received an invalid response from upstream provider.');
    }
  });

  // ============================================================
  // 9. Simulated provider network failure fails safely
  // ============================================================
  it('9. Simulated provider network failure fails safely with generic unavailable message', async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:443');
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('unavailable');
      expect(err.message).toBe('Curricular AI recommendation service is temporarily unavailable due to an upstream network failure.');
      expect(err.message).not.toContain('ECONNREFUSED');
    }
  });

  // ============================================================
  // 10. Simulated timeout fails safely
  // ============================================================
  it('10. Simulated timeout fails safely with generic unavailable message', async () => {
    const fakeFetch: typeof fetch = async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('unavailable');
      expect(err.message).toBe('Curricular AI recommendation service is temporarily unavailable due to an upstream network failure.');
      expect(err.message).not.toContain('aborted');
    }
  });

  // ============================================================
  // 11. Gateway does not persist anything
  // ============================================================
  it('11. Gateway does not persist anything to repository', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const saveSpy = vi.spyOn(repo, 'save');

    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Fomenta el sosten afectivo.',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  // ============================================================
  // 12. Gateway does not select anything for Anita
  // ============================================================
  it('12. Gateway does not select anything for Anita (remains transient proposals)', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Sugerencia pedagógica.',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    const response = await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    // Recommendations returned to caller are candidate proposals only
    expect(response.recommendations).toHaveLength(1);
    expect(response.recommendations[0].pdaId).toBe('TUTORIA-PDA-0001');
    // Payload and request object remain completely unmutated
    expect((validPayload as any).curricularTraceability).toBeUndefined();
  });

  // ============================================================
  // 13. Gateway does not mutate WeeklyPlanning
  // ============================================================
  it('13. Gateway does not mutate WeeklyPlanning', async () => {
    const plan = WeeklyPlanning.create(
      'plan-exec-test-01',
      'center-1',
      'lactantes-c',
      'educator-anita-01',
      '2026-03-02',
      '2026-03-06'
    );
    const beforeSerialized = JSON.stringify(plan);

    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Recomendacion.',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    const afterSerialized = JSON.stringify(plan);
    expect(beforeSerialized).toBe(afterSerialized);
    expect(plan.status).toBe('DRAFT');
  });

  // ============================================================
  // 14. Production authorization still fails closed
  // ============================================================
  it('14. Production authorization still fails closed (DENY)', async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: 'TUTORIA-PDA-0001',
                rationale: 'Should not reach this point',
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });

    await expect(
      handleRecommendCurricularPDA(req, { executor })
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });

    const decision = await defaultProductionAuthorizer({ uid: 'educator-anita-01' });
    expect(decision.authorized).toBe(false);
  });

  // ============================================================
  // 15. Production executor path does not expose OpenAI secret
  // ============================================================
  it('15. Production executor path does not expose OpenAI secret in error messages', async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error(`Unauthorized: Invalid API key ${TEST_API_KEY}`);
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err.message).not.toContain(TEST_API_KEY);
      expect(JSON.stringify(err)).not.toContain(TEST_API_KEY);
    }
  });

  // ============================================================
  // 16. No real fetch occurs during tests
  // ============================================================
  it('16. No real fetch occurs during tests', async () => {
    const fakeFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    // Injected mock fetch was invoked exactly once
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    // Global fetch was NEVER touched
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  // ============================================================
  // 17. Privacy: Prompt does not leak sensitive identifiers
  // ============================================================
  it('17. Privacy: Prompt sent to provider does not contain sensitive identifiers', async () => {
    let capturedBody: any = null;
    const fakeFetch: typeof fetch = async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const sensitiveUid = 'firebase-uid-sensitive-12345';
    const req = createCallableRequest(validPayload, { uid: sensitiveUid });
    await handleRecommendCurricularPDA(req, {
      authorizer: stubAuthorizedAuthorizer,
      executor,
    });

    expect(capturedBody).toBeDefined();
    const promptText = JSON.stringify(capturedBody.messages);

    // Strict privacy checks
    expect(promptText).not.toContain(sensitiveUid);
    expect(promptText).not.toContain('educator-anita-01');
    expect(promptText).not.toContain('center-1');
    expect(promptText).not.toContain('auth token');
  });

  // ============================================================
  // H1R10.3.1 HARDENING: Focused Synthetic Secret Leakage Tests
  // ============================================================

  it('18. Error Sanitization: SUPER_SECRET_API_KEY_DO_NOT_EXPOSE in network error is not leaked', async () => {
    const sensitiveSecret = 'SUPER_SECRET_API_KEY_DO_NOT_EXPOSE';
    const fakeFetch: typeof fetch = async () => {
      throw new Error(`Failed to connect with credentials: ${sensitiveSecret}`);
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('unavailable');
      expect(err.message).toBe(
        'Curricular AI recommendation service is temporarily unavailable due to an upstream network failure.'
      );
      expect(err.message).not.toContain(sensitiveSecret);
      expect(JSON.stringify(err)).not.toContain(sensitiveSecret);
    }
  });

  it('19. Error Sanitization: Bearer VERY_PRIVATE_TOKEN in upstream provider body is not leaked', async () => {
    const sensitiveBearer = 'Bearer VERY_PRIVATE_TOKEN';
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: `Authentication failed for authorization header: ${sensitiveBearer}`,
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('unavailable');
      expect(err.message).toBe(
        'Curricular AI recommendation service is temporarily unavailable due to an upstream network failure.'
      );
      expect(err.message).not.toContain(sensitiveBearer);
      expect(JSON.stringify(err)).not.toContain(sensitiveBearer);
    }
  });

  it('20. Error Sanitization: child-name-sensitive-value in boundary rejection is not leaked', async () => {
    const sensitiveChildName = 'child-name-sensitive-value';
    const fakeFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify(
          createOpenAIResponseBody({
            recommendations: [
              {
                pdaId: `TUTORIA-PDA-${sensitiveChildName}`, // Hallucinated/invalid PDA embedding sensitive child data
                rationale: `Actividad adaptada para ${sensitiveChildName}`,
              },
            ],
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      providerConfig: {
        apiKey: TEST_API_KEY,
        fetchFn: fakeFetch,
      },
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('internal');
      expect(err.message).toBe('Curricular AI recommendation failed canonical boundary validation.');
      expect(err.message).not.toContain(sensitiveChildName);
      expect(JSON.stringify(err)).not.toContain(sensitiveChildName);
    }
  });

  it('21. Error Sanitization: firebase-uid-sensitive-12345 in generic unexpected Error is not leaked', async () => {
    const sensitiveUid = 'firebase-uid-sensitive-12345';
    // Custom injected boundary throwing an unexpected runtime exception containing sensitive UID
    const crashProvider = {
      generateRawRecommendations: async () => {
        throw new Error(`Unexpected fatal runtime crash with user context ${sensitiveUid}`);
      },
    };

    const executor = createOpenAICurricularRecommendationExecutor({
      provider: crashProvider,
    });

    const req = createCallableRequest(validPayload, { uid: 'educator-anita-01' });
    try {
      await handleRecommendCurricularPDA(req, {
        authorizer: stubAuthorizedAuthorizer,
        executor,
      });
      expect.unreachable('Should have thrown HttpsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpsError);
      expect(err.code).toBe('internal');
      expect(err.message).toBe('Curricular AI recommendation executor encountered an unexpected error.');
      expect(err.message).not.toContain(sensitiveUid);
      expect(JSON.stringify(err)).not.toContain(sensitiveUid);
    }
  });
});
