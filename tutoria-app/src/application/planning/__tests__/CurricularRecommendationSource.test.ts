import { describe, it, expect } from 'vitest';
import {
  CurricularRecommendationRequest,
  CurricularRecommendation,
  CurricularRecommendationSource,
  CurricularRecommendationService,
  InvalidCurricularRecommendationError,
  validateCurricularRecommendationRequest,
  validateCurricularRecommendation,
  validateCurricularRecommendations,
} from '../CurricularRecommendationSource';
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from '../../../domain/planning/DirectCurricularCatalog';
import { PlanningActivity, WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';

/**
 * Deterministic test stub implementing CurricularRecommendationSource.
 * Strictly non-intelligent and isolated for contract verification.
 */
class StubCurricularRecommendationSource implements CurricularRecommendationSource {
  constructor(private recommendations: CurricularRecommendation[] = []) {}

  public setRecommendations(recs: CurricularRecommendation[]): void {
    this.recommendations = recs;
  }

  public async recommend(
    _request: CurricularRecommendationRequest
  ): Promise<readonly CurricularRecommendation[]> {
    return this.recommendations;
  }
}

describe('H1R9-F.8.1: Curricular AI Suggestion Contract (Direct Modality)', () => {
  const defaultRequest: CurricularRecommendationRequest = {
    activityId: 'act-music-1',
    activityTitle: 'Exploración sonora con instrumentos',
    description: 'Los lactantes exploran sonajas y panderos siguiendo ritmos sencillos.',
    category: 'EXPERIENCIAS ARTÍSTICAS',
    modality: 'DIRECT',
    catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  };

  // ============================================================
  // A. One canonical PDA recommendation is accepted
  // ============================================================
  it('A. One canonical PDA recommendation is accepted', async () => {
    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Favorece el desarrollo afectivo mediante expresiones musicales.',
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    const result = await service.getRecommendations(defaultRequest);

    expect(result).toHaveLength(1);
    expect(result[0]!.reference.pdaId).toBe('TUTORIA-PDA-0001');
    expect(result[0]!.reference.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
    expect(result[0]!.rationale).toBe('Favorece el desarrollo afectivo mediante expresiones musicales.');
  });

  // ============================================================
  // B. Multiple canonical PDA recommendations are accepted
  // ============================================================
  it('B. Multiple canonical PDA recommendations are accepted', async () => {
    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Alineación con expresión de necesidades y afectos.',
      },
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0002',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Estimula estructuras del lenguaje y juegos metalingüísticos.',
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    const result = await service.getRecommendations(defaultRequest);

    expect(result).toHaveLength(2);
    expect(result[0]!.reference.pdaId).toBe('TUTORIA-PDA-0001');
    expect(result[1]!.reference.pdaId).toBe('TUTORIA-PDA-0002');
  });

  // ============================================================
  // C. Zero recommendations is valid
  // ============================================================
  it('C. Zero recommendations is valid (empty list permitted)', async () => {
    const stub = new StubCurricularRecommendationSource([]);
    const service = new CurricularRecommendationService(stub);

    const result = await service.getRecommendations(defaultRequest);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  // ============================================================
  // D. Unknown pdaId is rejected
  // ============================================================
  it('D. Unknown pdaId is rejected', async () => {
    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-9999', // Non-existent PDA ID
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Invented PDA should fail canonical validation.',
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    await expect(service.getRecommendations(defaultRequest)).rejects.toThrow(
      InvalidCurricularRecommendationError
    );
  });

  // ============================================================
  // E. Unknown catalogRevision is rejected
  // ============================================================
  it('E. Unknown catalogRevision is rejected', async () => {
    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-INVALID-V2',
        },
        rationale: 'Invalid catalog revision should fail.',
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    await expect(service.getRecommendations(defaultRequest)).rejects.toThrow(
      InvalidCurricularRecommendationError
    );
  });

  // ============================================================
  // F. Duplicate PDA recommendations are rejected
  // ============================================================
  it('F. Duplicate PDA recommendations are rejected', async () => {
    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'First recommendation.',
      },
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001', // Duplicate PDA in same recommendation set
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Second recommendation with duplicate PDA.',
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    await expect(service.getRecommendations(defaultRequest)).rejects.toThrow(
      /Duplicate PDA recommendation/
    );
  });

  // ============================================================
  // G. Rationale survives as transient recommendation metadata
  // ============================================================
  it('G. Rationale survives as transient recommendation metadata without polluting reference', async () => {
    const expectedRationale = 'Refuerza la interacción y vínculo afectivo institucional.';
    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: expectedRationale,
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    const result = await service.getRecommendations(defaultRequest);

    expect(result[0]!.rationale).toBe(expectedRationale);
    // Reference contains ONLY canonical identity fields
    expect(result[0]!.reference).toEqual({
      pdaId: 'TUTORIA-PDA-0001',
      catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    });
    expect((result[0]!.reference as any).rationale).toBeUndefined();
  });

  // ============================================================
  // H. Recommendation operation does NOT mutate PlanningActivity.curricularTraceability
  // ============================================================
  it('H. Recommendation operation does NOT mutate PlanningActivity.curricularTraceability', async () => {
    const activity: PlanningActivity = {
      activityId: 'act-sample-01',
      category: 'EXPERIENCIAS ARTÍSTICAS',
      objective: 'Canto y juego con instrumentos',
      description: 'Actividad de coordinación auditivo-motriz',
      materials: ['Sonajas'],
      durationMinutes: 20,
      curricularTraceability: [],
    };

    const request: CurricularRecommendationRequest = {
      activityId: activity.activityId,
      activityTitle: activity.objective,
      description: activity.description,
      category: activity.category,
      modality: 'DIRECT',
      catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    };

    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Recomendación sugerida pero no aprobada.',
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    const recommendations = await service.getRecommendations(request);

    // Recommendations were returned
    expect(recommendations).toHaveLength(1);

    // CRITICAL: activity.curricularTraceability remains completely unmutated
    expect(activity.curricularTraceability).toEqual([]);
    expect(activity.curricularTraceability).toHaveLength(0);
  });

  // ============================================================
  // I. Recommendation operation does NOT mutate WeeklyPlanning / repository state
  // ============================================================
  it('I. Recommendation operation does NOT mutate WeeklyPlanning or repository state', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const planning = WeeklyPlanning.create(
      'plan-test-f81',
      'center-1',
      'lactantes-c',
      't1',
      '2026-08-24',
      '2026-08-28'
    );
    planning.days = [
      {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        activities: [
          {
            activityId: 'act-mon-1',
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Movimiento libre sobre tapete',
            description: 'Gateo y estiramiento',
            materials: ['Tapete'],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ['Tapete'],
      },
    ];
    await repo.save(planning);

    const request: CurricularRecommendationRequest = {
      activityId: 'act-mon-1',
      activityTitle: 'Movimiento libre sobre tapete',
      description: 'Gateo y estiramiento',
      category: 'ACTIVACIÓN FÍSICA',
      modality: 'DIRECT',
      catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    };

    const stub = new StubCurricularRecommendationSource([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0003',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Desarrollo motriz y esquema corporal.',
      },
    ]);
    const service = new CurricularRecommendationService(stub);

    await service.getRecommendations(request);

    // Verify planning stored in repository was NOT mutated
    const savedPlan = await repo.findById('plan-test-f81');
    expect(savedPlan).not.toBeNull();
    expect(savedPlan!.days[0]!.activities[0]!.curricularTraceability).toEqual([]);
    expect(savedPlan!.status).toBe('DRAFT');
  });

  // ============================================================
  // J. DIRECT boundary is explicit and no INDIRECT catalog is invented
  // ============================================================
  it('J. DIRECT boundary is explicit and rejects non-DIRECT modality', async () => {
    const invalidRequest = {
      ...defaultRequest,
      modality: 'INDIRECT' as any,
    };

    const stub = new StubCurricularRecommendationSource([]);
    const service = new CurricularRecommendationService(stub);

    await expect(service.getRecommendations(invalidRequest)).rejects.toThrow(
      /strictly supports 'DIRECT' modality only/
    );
  });

  // ============================================================
  // K. No confidence-score field exists in the recommendation contract
  // ============================================================
  it('K. No confidence-score field exists and forbidden ranking fields are rejected', () => {
    const invalidRec = {
      reference: {
        pdaId: 'TUTORIA-PDA-0001',
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
      rationale: 'Alineación válida.',
      confidence: 0.95, // Forbidden field
    } as any;

    expect(() => validateCurricularRecommendation(invalidRec)).toThrow(
      /Confidence scores are strictly forbidden/
    );

    const invalidRec2 = {
      reference: {
        pdaId: 'TUTORIA-PDA-0001',
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
      rationale: 'Alineación válida.',
      confidenceScore: 'HIGH', // Forbidden field
    } as any;

    expect(() => validateCurricularRecommendation(invalidRec2)).toThrow(
      /Confidence scores are strictly forbidden/
    );

    // Valid recommendation keys contain only reference and rationale
    const validRec: CurricularRecommendation = {
      reference: {
        pdaId: 'TUTORIA-PDA-0001',
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
      rationale: 'Alineación pedagógica válida.',
    };
    validateCurricularRecommendation(validRec);
    expect(Object.keys(validRec).sort()).toEqual(['rationale', 'reference']);
  });
});
