import {
  CurricularRecommendationSource,
  CurricularRecommendationRequest,
  CurricularRecommendation,
} from './CurricularRecommendationSource';
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from '../../domain/planning/DirectCurricularCatalog';

/**
 * Deterministic local implementation of CurricularRecommendationSource for demo and testing.
 * Strictly non-intelligent, makes zero network calls, and uses only canonical PDA references.
 */
export class DeterministicCurricularRecommendationSource implements CurricularRecommendationSource {
  public async recommend(
    request: CurricularRecommendationRequest
  ): Promise<readonly CurricularRecommendation[]> {
    const category = request.category || '';

    if (category.includes('ARTÍSTICAS')) {
      return [
        {
          reference: {
            pdaId: 'TUTORIA-PDA-0001',
            catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
          },
          rationale: 'Fortalece la expresión de necesidades, emociones y afectos mediante experiencias sonoras y lúdicas.',
        },
      ];
    }

    if (category.includes('AMBIENTES')) {
      return [
        {
          reference: {
            pdaId: 'TUTORIA-PDA-0015',
            catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
          },
          rationale: 'Promueve la exploración autónoma del espacio y la interacción con objetos seguros.',
        },
      ];
    }

    if (category.includes('FÍSICA')) {
      return [
        {
          reference: {
            pdaId: 'TUTORIA-PDA-0038',
            catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
          },
          rationale: 'Estimula el desarrollo motor grueso, la tonicidad muscular y el desplazamiento libre.',
        },
      ];
    }

    if (category.includes('LECTURA')) {
      return [
        {
          reference: {
            pdaId: 'TUTORIA-PDA-0002',
            catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
          },
          rationale: 'Fomenta la atención conjunta, el balbuceo y la aproximación al lenguaje narrativo.',
        },
      ];
    }

    if (category.includes('MATEMÁTICO')) {
      return [
        {
          reference: {
            pdaId: 'TUTORIA-PDA-0016',
            catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
          },
          rationale: 'Favorece nociones tempranas de orden, clasificación y relaciones de causalidad espacial.',
        },
      ];
    }

    // Default canonical fallback
    return [
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
        },
        rationale: 'Alineación sugerida con procesos de desarrollo de lenguajes y vínculos afectivos.',
      },
    ];
  }
}
