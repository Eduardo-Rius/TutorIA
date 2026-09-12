import { describe, it, expect } from 'vitest';
import {
  CurricularPDAReference,
  InvalidCurricularReferenceError,
  createCurricularPDAReference,
  validateCurricularPDAReference,
  validateCurricularPDAReferences,
} from '../CurricularPDAReference';
import {
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  DIRECT_PDA_CATALOG,
} from '../DirectCurricularCatalog';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { PlanningActivity } from '../WeeklyPlanning';

describe('PlanningActivity -> Canonical PDA Reference Contract', () => {
  describe('CurricularPDAReference Shape and Creation', () => {
    it('should create an immutable reference with explicit pdaId and catalogRevision', () => {
      const ref = createCurricularPDAReference('TUTORIA-PDA-0001');
      expect(ref.pdaId).toBe('TUTORIA-PDA-0001');
      expect(ref.catalogRevision).toBe(TUTORIA_DIRECT_PDA_CATALOG_REVISION);
      expect(Object.isFrozen(ref)).toBe(true);
    });

    it('should accept all 40 valid canonical IDs from DIRECT_PDA_CATALOG', () => {
      DIRECT_PDA_CATALOG.forEach((entry) => {
        expect(() => {
          validateCurricularPDAReference({
            pdaId: entry.id,
            catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
          });
        }).not.toThrow();
      });
    });
  });

  describe('Validation Rules and Rejection Behaviors', () => {
    it('should reject unknown PDA IDs that do not exist in the canonical catalog', () => {
      const unknownIds = ['IMSS-LA-EA-01', 'TUTORIA-PDA-9999', 'INVALID-ID', 'PDA-01'];
      for (const unknownId of unknownIds) {
        expect(() => {
          validateCurricularPDAReference({
            pdaId: unknownId,
            catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
          });
        }).toThrow(InvalidCurricularReferenceError);
      }
    });

    it('should reject unknown or invalid catalog revisions', () => {
      const unknownRevisions = ['IMSS-2024', 'TUTORIA-CATALOG-V2', 'DEFAULT', ''];
      for (const badRev of unknownRevisions) {
        expect(() => {
          validateCurricularPDAReference({
            pdaId: 'TUTORIA-PDA-0001',
            catalogRevision: badRev,
          });
        }).toThrow(InvalidCurricularReferenceError);
      }
    });

    it('should accept an empty array of references (0 cardinality)', () => {
      expect(() => {
        validateCurricularPDAReferences([]);
      }).not.toThrow();
    });

    it('should accept multiple distinct valid PDA references', () => {
      const distinctRefs: CurricularPDAReference[] = [
        { pdaId: 'TUTORIA-PDA-0001', catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: 'TUTORIA-PDA-0015', catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: 'TUTORIA-PDA-0040', catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        validateCurricularPDAReferences(distinctRefs);
      }).not.toThrow();
    });

    it('should strictly reject duplicate PDA references in the same collection', () => {
      const duplicateRefs: CurricularPDAReference[] = [
        { pdaId: 'TUTORIA-PDA-0005', catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: 'TUTORIA-PDA-0005', catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        validateCurricularPDAReferences(duplicateRefs);
      }).toThrow(InvalidCurricularReferenceError);
    });
  });

  describe('PlanningActivity Integration & Generator Safety', () => {
    it('should satisfy strongly typed PlanningActivity structure with CurricularPDAReference[]', () => {
      const activity: PlanningActivity = {
        activityId: 'act-001',
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Objective text',
        description: 'Description text',
        materials: ['Mat1'],
        durationMinutes: 20,
        curricularTraceability: [
          { pdaId: 'TUTORIA-PDA-0002', catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        ],
      };

      expect(activity.curricularTraceability).toHaveLength(1);
      expect(activity.curricularTraceability[0].pdaId).toBe('TUTORIA-PDA-0002');
    });

    it('should prove deterministic generator returns empty curricularTraceability array for all 25 activities', async () => {
      const generator = new DeterministicPedagogicalRecommendationSource();
      const weeklyTemplate = await generator.generateRecommendation(null as any, '', '', '', '');

      expect(weeklyTemplate).toHaveLength(5);
      weeklyTemplate.forEach((day) => {
        expect(day.activities).toHaveLength(5);
        day.activities.forEach((activity) => {
          expect(activity.curricularTraceability).toEqual([]);
          expect(Array.isArray(activity.curricularTraceability)).toBe(true);
        });
      });
    });

    it('should prove synthetic legacy IMSS-LA-* strings are completely absent from generated output', async () => {
      const generator = new DeterministicPedagogicalRecommendationSource();
      const weeklyTemplate = await generator.generateRecommendation(null as any, '', '', '', '');
      const stringified = JSON.stringify(weeklyTemplate);

      expect(stringified).not.toContain('IMSS-LA-');
    });
  });
});
