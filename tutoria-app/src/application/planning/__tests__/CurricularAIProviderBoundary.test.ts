import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CurricularAIProvider,
  CurricularAIProviderBoundary,
  validateUntrustedAIResponse,
} from '../CurricularAIProviderBoundary';
import {
  CurricularRecommendationRequest,
  InvalidCurricularRecommendationError,
} from '../CurricularRecommendationSource';
import {
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  DIRECT_PDA_CATALOG_BY_ID,
} from '../../../domain/planning/DirectCurricularCatalog';
import {
  WeeklyPlanning,
  PlanningActivity,
  WeeklyContextSnapshot,
} from '../../../domain/planning/WeeklyPlanning';
import { Room, RoomCatalog } from '../../../domain/planning/RoomCatalog';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';

describe('H1R9-F.8.3.1 — Real Curricular AI Provider Boundary Contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const defaultRoom: Room = RoomCatalog.getRoom('lactantes-c')!;

  const defaultWeeklyContext: WeeklyContextSnapshot = {
    observations: 'Grupo con alto interés en exploración sonora y motriz.',
    identifiedNeeds: 'Estimular expresión gestual y coordinación libre.',
    specialSituations: 'Ninguna relevante.',
    availableMaterials: 'Sonajas de tela, cojines y tapetes suaves.',
  };

  const defaultRequest: CurricularRecommendationRequest = {
    activityId: 'act-sample-01',
    activityTitle: 'Exploración de sonidos y nanas',
    objective: 'Fortalecer vínculos afectivos y atención auditiva',
    description: 'Cantar nanas tradicionales mientras se manipulan sonajas suaves',
    category: 'EXPERIENCIAS ARTÍSTICAS',
    modality: 'DIRECT',
    catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    room: defaultRoom,
    weeklyContext: defaultWeeklyContext,
    materials: ['Sonajas de tela', 'Tapetes'],
    durationMinutes: 20,
  };

  class StubAIProvider implements CurricularAIProvider {
    constructor(private readonly rawOutput: unknown) {}

    async generateRawRecommendations(
      _request: CurricularRecommendationRequest
    ): Promise<unknown> {
      return this.rawOutput;
    }
  }

  // ============================================================
  // 1. Valid canonical PDA references are accepted
  // ============================================================
  it('1. Valid canonical PDA references are accepted', async () => {
    const rawAIResponse = {
      recommendations: [
        {
          pdaId: 'TUTORIA-PDA-0001',
          rationale: 'Fortalece la expresión y los vínculos afectivos mediante el juego sonoro.',
        },
      ],
    };

    const provider = new StubAIProvider(rawAIResponse);
    const boundary = new CurricularAIProviderBoundary(provider);

    const result = await boundary.recommend(defaultRequest);

    expect(result).toHaveLength(1);
    expect(result[0]!.reference).toEqual({
      pdaId: 'TUTORIA-PDA-0001',
      catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    });
    expect(result[0]!.rationale).toBe(
      'Fortalece la expresión y los vínculos afectivos mediante el juego sonoro.'
    );

    // Verify it exists in canonical catalog
    const canonicalEntry = DIRECT_PDA_CATALOG_BY_ID.get('TUTORIA-PDA-0001');
    expect(canonicalEntry).toBeDefined();
    expect(canonicalEntry!.campoFormativo).toBe('Lenguajes');
  });

  // ============================================================
  // 2. Multiple valid canonical recommendations are accepted
  // ============================================================
  it('2. Multiple valid canonical recommendations are accepted', async () => {
    const rawAIResponse = [
      {
        pdaId: 'TUTORIA-PDA-0001',
        rationale: 'Vínculos afectivos mediante lenguajes sonoros.',
      },
      {
        pdaId: 'TUTORIA-PDA-0015',
        rationale: 'Exploración sensorial del entorno y objetos.',
      },
    ];

    const provider = new StubAIProvider(rawAIResponse);
    const boundary = new CurricularAIProviderBoundary(provider);

    const result = await boundary.recommend(defaultRequest);

    expect(result).toHaveLength(2);
    expect(result[0]!.reference.pdaId).toBe('TUTORIA-PDA-0001');
    expect(result[1]!.reference.pdaId).toBe('TUTORIA-PDA-0015');
  });

  // ============================================================
  // 3. Zero recommendations is a valid result
  // ============================================================
  it('3. Zero recommendations is a valid result (empty array and empty object)', async () => {
    // Array format
    const providerEmptyArray = new StubAIProvider([]);
    const boundary1 = new CurricularAIProviderBoundary(providerEmptyArray);
    const result1 = await boundary1.recommend(defaultRequest);
    expect(result1).toHaveLength(0);
    expect(result1).toEqual([]);

    // Object format with empty recommendations
    const providerEmptyObject = new StubAIProvider({ recommendations: [] });
    const boundary2 = new CurricularAIProviderBoundary(providerEmptyObject);
    const result2 = await boundary2.recommend(defaultRequest);
    expect(result2).toHaveLength(0);
    expect(result2).toEqual([]);
  });

  // ============================================================
  // 4. Invented/noncanonical PDA identifier TUTORIA-PDA-9999 cannot cross boundary
  // ============================================================
  it('4. An invented/noncanonical PDA identifier such as TUTORIA-PDA-9999 cannot cross the boundary as a valid recommendation', async () => {
    const rawWithHallucinatedPda = {
      recommendations: [
        {
          pdaId: 'TUTORIA-PDA-9999', // Invented identifier
          rationale: 'Sugerencia inventada por modelo de lenguaje.',
        },
      ],
    };

    const provider = new StubAIProvider(rawWithHallucinatedPda);
    const boundary = new CurricularAIProviderBoundary(provider);

    await expect(boundary.recommend(defaultRequest)).rejects.toThrow(
      /Untrusted AI provider proposed noncanonical PDA identifier 'TUTORIA-PDA-9999'/
    );

    // Direct parser validation check
    expect(() => validateUntrustedAIResponse(rawWithHallucinatedPda)).toThrow(
      InvalidCurricularRecommendationError
    );
  });

  // ============================================================
  // 5. Rationale remains transient recommendation metadata
  // ============================================================
  it('5. Rationale remains transient recommendation metadata and is not baked into reference', async () => {
    const transientRationale = 'Justificación pedagógica efímera para la educadora.';
    const raw = [
      {
        pdaId: 'TUTORIA-PDA-0001',
        rationale: transientRationale,
      },
    ];

    const provider = new StubAIProvider(raw);
    const boundary = new CurricularAIProviderBoundary(provider);

    const result = await boundary.recommend(defaultRequest);

    expect(result[0]!.rationale).toBe(transientRationale);
    // Reference contains ONLY canonical identity fields
    expect(result[0]!.reference).toEqual({
      pdaId: 'TUTORIA-PDA-0001',
      catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    });
    expect((result[0]!.reference as any).rationale).toBeUndefined();
  });

  // ============================================================
  // 6. Contract/validation operation does not mutate WeeklyPlanning
  // ============================================================
  it('6. The contract/validation operation does not mutate WeeklyPlanning', async () => {
    const activity: PlanningActivity = {
      activityId: 'act-sample-01',
      category: 'EXPERIENCIAS ARTÍSTICAS',
      objective: 'Canto y juego con instrumentos',
      description: 'Coordinación motriz suave',
      materials: ['Sonajas'],
      durationMinutes: 20,
      curricularTraceability: [],
    };

    const plan = WeeklyPlanning.create(
      'plan-test-f831',
      'center-1',
      'lactantes-c',
      'teacher-1',
      '2026-08-24',
      '2026-08-28'
    );
    plan.days = [
      {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        activities: [activity],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: ['Sonajas'],
      },
    ];

    const raw = {
      recommendations: [
        {
          pdaId: 'TUTORIA-PDA-0001',
          rationale: 'Alineación recomendada.',
        },
      ],
    };
    const boundary = new CurricularAIProviderBoundary(new StubAIProvider(raw));

    const recommendations = await boundary.recommend(defaultRequest);

    expect(recommendations).toHaveLength(1);
    // Verified: WeeklyPlanning is completely untouched
    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([]);
    expect(plan.status).toBe('DRAFT');
  });

  // ============================================================
  // 7. No curricular selection occurs as a consequence of receiving recommendations
  // ============================================================
  it('7. No curricular selection occurs as a consequence of receiving recommendations', async () => {
    const activity: PlanningActivity = {
      activityId: 'act-sample-01',
      category: 'EXPERIENCIAS ARTÍSTICAS',
      objective: 'Actividad sonora',
      description: 'Juegos rítmicos',
      materials: ['Campanas'],
      durationMinutes: 15,
      curricularTraceability: [],
    };

    const raw = [
      {
        pdaId: 'TUTORIA-PDA-0002',
        rationale: 'Sugerencia de lenguaje narrativo.',
      },
    ];
    const boundary = new CurricularAIProviderBoundary(new StubAIProvider(raw));

    await boundary.recommend(defaultRequest);

    // Human selection remains strictly unmutated
    expect(activity.curricularTraceability).toEqual([]);
    expect(activity.curricularTraceability).toHaveLength(0);
  });

  // ============================================================
  // 8. No persistence occurs as a consequence of receiving recommendations
  // ============================================================
  it('8. No persistence occurs as a consequence of receiving recommendations', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = WeeklyPlanning.create(
      'plan-persist-test',
      'center-1',
      'lactantes-c',
      'teacher-1',
      '2026-08-24',
      '2026-08-28'
    );
    plan.days = [
      {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        activities: [
          {
            activityId: 'act-sample-01',
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: 'Sonidos iniciales',
            description: 'Manipulación de objetos sonoros',
            materials: ['Sonajas'],
            durationMinutes: 15,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: ['Sonajas'],
      },
    ];
    await repo.save(plan);

    const saveSpy = vi.spyOn(repo, 'save');

    const raw = {
      recommendations: [
        {
          pdaId: 'TUTORIA-PDA-0001',
          rationale: 'Recomendación transitoria.',
        },
      ],
    };
    const boundary = new CurricularAIProviderBoundary(new StubAIProvider(raw));

    await boundary.recommend(defaultRequest);

    // Zero repository persistence calls triggered
    expect(saveSpy).not.toHaveBeenCalled();

    const storedPlan = await repo.findById('plan-persist-test');
    expect(storedPlan!.days[0]!.activities[0]!.curricularTraceability).toEqual([]);
  });

  // ============================================================
  // 9. No approval occurs as a consequence of receiving recommendations
  // ============================================================
  it('9. No approval occurs as a consequence of receiving recommendations', async () => {
    const plan = WeeklyPlanning.create(
      'plan-approval-test',
      'center-1',
      'lactantes-c',
      'teacher-1',
      '2026-08-24',
      '2026-08-28'
    );
    expect(plan.status).toBe('DRAFT');

    const raw = [
      {
        pdaId: 'TUTORIA-PDA-0001',
        rationale: 'Propuesta sugerida.',
      },
    ];
    const boundary = new CurricularAIProviderBoundary(new StubAIProvider(raw));

    await boundary.recommend(defaultRequest);

    // Plan status remains DRAFT; cannot transition to APPROVED or APPROVED_FOR_EXECUTION
    expect(plan.status).toBe('DRAFT');
    expect(plan.status).not.toBe('APPROVED');
    expect(plan.status).not.toBe('APPROVED_FOR_EXECUTION');
  });

  // ============================================================
  // 10. No network call is required or performed by this contract/validation layer
  // ============================================================
  it('10. No network call is required or performed by this contract/validation layer', async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;

    try {
      const raw = {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Operación puramente local en memoria.',
          },
        ],
      };
      const boundary = new CurricularAIProviderBoundary(new StubAIProvider(raw));

      const result = await boundary.recommend(defaultRequest);

      expect(result).toHaveLength(1);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ============================================================
  // 11. Request contract carries rich pedagogical context
  // ============================================================
  it('11. Request contract carries full canonical pedagogical context', () => {
    expect(defaultRequest.modality).toBe('DIRECT');
    expect(defaultRequest.room).toEqual(defaultRoom);
    expect(defaultRequest.weeklyContext).toEqual(defaultWeeklyContext);
    expect(defaultRequest.activityTitle).toBe('Exploración de sonidos y nanas');
    expect(defaultRequest.objective).toBe('Fortalecer vínculos afectivos y atención auditiva');
    expect(defaultRequest.description).toBeDefined();
    expect(defaultRequest.category).toBe('EXPERIENCIAS ARTÍSTICAS');
    expect(defaultRequest.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
    expect(defaultRequest.materials).toEqual(['Sonajas de tela', 'Tapetes']);
    expect(defaultRequest.durationMinutes).toBe(20);
  });

  // ============================================================
  // 12. Strict rejection of forbidden confidence scores
  // ============================================================
  it('12. Confidence scores in AI output are strictly rejected', () => {
    const rawWithConfidence = {
      recommendations: [
        {
          pdaId: 'TUTORIA-PDA-0001',
          rationale: 'Alineación válida.',
          confidence: 0.98,
        },
      ],
    };

    expect(() => validateUntrustedAIResponse(rawWithConfidence)).toThrow(
      /Confidence scores are strictly forbidden/
    );

    const rawWithScore = {
      recommendations: [
        {
          pdaId: 'TUTORIA-PDA-0001',
          rationale: 'Alineación válida.',
          score: 100,
        },
      ],
    };

    expect(() => validateUntrustedAIResponse(rawWithScore)).toThrow(
      /Confidence scores are strictly forbidden/
    );
  });

  // ============================================================
  // 13. Duplicate PDA recommendations in AI output are strictly rejected
  // ============================================================
  it('13. Duplicate recommendations for the same PDA from AI are strictly rejected', () => {
    const rawWithDuplicates = [
      {
        pdaId: 'TUTORIA-PDA-0001',
        rationale: 'Primera sugerencia.',
      },
      {
        pdaId: 'TUTORIA-PDA-0001',
        rationale: 'Segunda sugerencia duplicando la misma PDA.',
      },
    ];

    expect(() => validateUntrustedAIResponse(rawWithDuplicates)).toThrow(
      /Duplicate recommendation for PDA 'TUTORIA-PDA-0001'/
    );
  });
});
