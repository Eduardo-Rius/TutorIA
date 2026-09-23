import { describe, it, expect, vi } from 'vitest';
import {
  FirebaseCurricularRecommendationSource,
  FirebaseCurricularRecommendationTransportError,
  FirebaseCurricularPDAGatewayRequest,
} from '../FirebaseCurricularRecommendationSource';
import {
  CurricularRecommendationRequest,
  InvalidCurricularRecommendationError,
} from '../../../application/planning/CurricularRecommendationSource';
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from '../../../domain/planning/DirectCurricularCatalog';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('H1R10.2 — FirebaseCurricularRecommendationSource Client Remote Adapter', () => {
  const sampleRequest: CurricularRecommendationRequest = {
    activityId: 'act-001',
    activityTitle: 'Exploración sensorial con texturas naturales',
    objective: 'Estimular la percepción táctil y la coordinación motriz',
    modality: 'DIRECT',
    catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
    description: 'Los niños exploran texturas suaves y rugosas con elementos del entorno',
    category: 'Sensorial',
    durationMinutes: 30,
    materials: ['Hojas secas', 'Telas de algodón'],
    room: {
      roomId: 'lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 12,
      maxAgeMonths: 18,
    },
    weeklyContext: {
      observations: 'El grupo muestra interés por manipular texturas',
      identifiedNeeds: 'Fortalecer agarre y discriminación sensorial',
      specialSituations: 'Ninguna',
      availableMaterials: 'Cestas sensoriales',
    },
  };

  it('1. Valid callable response returns canonical recommendations', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Fomenta la manipulación y exploración de texturas diversas.',
          },
          {
            pdaId: 'TUTORIA-PDA-0002',
            rationale: 'Apoya el desarrollo de la coordinación y agarre sensorial.',
          },
        ],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    const results = await source.recommend(sampleRequest);

    expect(results).toHaveLength(2);
    expect(results[0]?.reference.pdaId).toBe('TUTORIA-PDA-0001');
    expect(results[0]?.reference.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
    expect(results[0]?.rationale).toBe('Fomenta la manipulación y exploración de texturas diversas.');
    expect(results[1]?.reference.pdaId).toBe('TUTORIA-PDA-0002');
  });

  it('2. Valid empty [] response returns []', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    const results = await source.recommend(sampleRequest);

    expect(results).toEqual([]);
  });

  it('3. Request is mapped to callable contract correctly without leaking internal/auth details', async () => {
    let capturedPayload: FirebaseCurricularPDAGatewayRequest | undefined;

    const mockCallable = vi.fn().mockImplementation(async (payload) => {
      capturedPayload = payload;
      return {
        data: {
          recommendations: [],
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
      };
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await source.recommend(sampleRequest);

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload?.activityId).toBe('act-001');
    expect(capturedPayload?.activityTitle).toBe('Exploración sensorial con texturas naturales');
    expect(capturedPayload?.objective).toBe('Estimular la percepción táctil y la coordinación motriz');
    expect(capturedPayload?.modality).toBe('DIRECT');
    expect(capturedPayload?.room).toEqual({
      roomId: 'lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 12,
      maxAgeMonths: 18,
    });
    expect(capturedPayload?.description).toBe('Los niños exploran texturas suaves y rugosas con elementos del entorno');
    expect(capturedPayload?.category).toBe('Sensorial');
    expect(capturedPayload?.durationMinutes).toBe(30);
    expect(capturedPayload?.materials).toEqual(['Hojas secas', 'Telas de algodón']);
    expect(capturedPayload?.weeklyContext).toEqual({
      observations: 'El grupo muestra interés por manipular texturas',
      identifiedNeeds: 'Fortalecer agarre y discriminación sensorial',
      specialSituations: 'Ninguna',
      availableMaterials: 'Cestas sensoriales',
    });

    // Verify privacy invariants: NO auth tokens, NO credentials, NO child names injected into payload
    const rawRecord = capturedPayload as Record<string, unknown>;
    expect(rawRecord['token']).toBeUndefined();
    expect(rawRecord['apiKey']).toBeUndefined();
    expect(rawRecord['secret']).toBeUndefined();
    expect(rawRecord['childName']).toBeUndefined();
    expect(rawRecord['educatorId']).toBeUndefined();
  });

  it('4. Invented PDA ID is rejected by canonical boundary', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-9999', // Hallucinated/invented ID
            rationale: 'Razón pedagógica inventada',
          },
        ],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(sampleRequest)).rejects.toThrow(
      /noncanonical PDA identifier 'TUTORIA-PDA-9999'/i
    );
  });

  it('5. Wrong catalog revision is rejected by canonical boundary', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Válido pero con revisión obsoleta',
          },
        ],
        catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-OBSOLETE-V0',
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(sampleRequest)).rejects.toThrow(
      /Invalid catalog revision 'TUTORIA-DIRECT-PDA-CATALOG-OBSOLETE-V0'/i
    );
  });

  it('6. Duplicate PDA recommendation is rejected by boundary', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Primera sugerencia',
          },
          {
            pdaId: 'TUTORIA-PDA-0001', // Duplicate
            rationale: 'Segunda sugerencia duplicada',
          },
        ],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(sampleRequest)).rejects.toThrow(
      /Duplicate recommendation for PDA 'TUTORIA-PDA-0001'/i
    );
  });

  it('7. Empty or whitespace rationale is rejected by boundary', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: '   ', // Empty/whitespace rationale
          },
        ],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(sampleRequest)).rejects.toThrow(
      /must contain a non-empty string rationale/i
    );
  });

  it('8. Forbidden confidence/probability/ranking metadata is rejected by boundary', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Excelente alineación',
            confidence: 0.98, // FORBIDDEN
          },
        ],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(sampleRequest)).rejects.toThrow(
      /Confidence scores are strictly forbidden in curricular recommendations/i
    );
  });

  it('9. Malformed callable response is rejected by boundary', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: 'invalid-string-not-an-object',
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(sampleRequest)).rejects.toThrow(
      /External AI provider response must be an array or an object containing a recommendations array/i
    );
  });

  it('10. Callable transport error propagates safely without fallback to fake AI', async () => {
    const networkError = new Error('Network timeout / connection refused');
    const mockCallable = vi.fn().mockRejectedValue(networkError);

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(sampleRequest)).rejects.toThrow(
      FirebaseCurricularRecommendationTransportError
    );
  });

  it('11. Adapter does not mutate recommendation request object', async () => {
    const originalRequest = JSON.parse(JSON.stringify(sampleRequest));
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await source.recommend(sampleRequest);

    expect(sampleRequest).toEqual(originalRequest);
  });

  it('12. No domain mutation or persistence occurs during recommendation', async () => {
    const plan = WeeklyPlanning.create('plan-1', 'daycare-1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28');
    const initialDaysJson = JSON.stringify(plan.days);
    const initialStatus = plan.status;

    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Recomendación transitoria para revisión de Anita',
          },
        ],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    const recommendations = await source.recommend(sampleRequest);

    expect(recommendations).toHaveLength(1);
    // Domain plan remains completely unmutated
    expect(JSON.stringify(plan.days)).toBe(initialDaysJson);
    expect(plan.status).toBe(initialStatus);
  });

  it('13. Adapter rejects request missing required room context', async () => {
    const requestWithoutRoom: CurricularRecommendationRequest = {
      ...sampleRequest,
      room: undefined,
    };

    const mockCallable = vi.fn();
    const source = new FirebaseCurricularRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.recommend(requestWithoutRoom)).rejects.toThrow(
      InvalidCurricularRecommendationError
    );
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it('14. Factory injection creates callable targeting recommendCurricularPDA', async () => {
    const mockCallableInstance = vi.fn().mockResolvedValue({
      data: {
        recommendations: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            rationale: 'Factory-invoked recommendation',
          },
        ],
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    });

    const mockFactory = vi.fn().mockReturnValue(mockCallableInstance);
    const mockFunctions = { region: 'us-central1' } as any;

    const source = new FirebaseCurricularRecommendationSource({
      functions: mockFunctions,
      callableFactory: mockFactory,
    });

    const results = await source.recommend(sampleRequest);

    expect(results).toHaveLength(1);
    expect(results[0]?.reference.pdaId).toBe('TUTORIA-PDA-0001');
    expect(mockFactory).toHaveBeenCalledWith(mockFunctions, 'recommendCurricularPDA');
    expect(mockCallableInstance).toHaveBeenCalled();
  });
});
