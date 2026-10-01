import { describe, it, expect } from 'vitest';
import {
  PedagogicalAgePolicyCatalog,
  PedagogicalSafetyValidator,
  LACTANTES_A_AGE_POLICY,
  PedagogicalWeeklyPlanCandidate,
  PedagogicalActivityCandidate,
} from '../PedagogicalAgePolicy';
import { IMSS_CATEGORIES } from '../../../constants/imssCategories';

describe('H1R11.10A — Master ARB Policy Correction & Evidence Reconciliation', () => {
  // Synthetic materials supplied in First Light
  const sampleAvailableMaterials =
    'Pelotas suaves, telas de diferentes texturas, recipientes plásticos, hojas, crayones gruesos y música infantil.';

  // ==========================================================================
  // SECTION 1: POLICY LOOKUP & PROVENANCE
  // ==========================================================================
  describe('1. Policy Lookup & Provenance Invariants', () => {
    it('resolves Lactantes A policy deterministically for 0-6 months', () => {
      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 0,
        maxAgeMonths: 6,
        name: 'Lactantes A',
      });

      expect(policy).toBeDefined();
      expect(policy?.roomType).toBe('LACTANTES_A');
      expect(policy?.minAgeMonths).toBe(0);
      expect(policy?.maxAgeMonths).toBe(6);
      expect(policy?.label).toContain('Lactantes A');
      expect(policy?.provenance).toBe('CANONICAL_PRODUCT_RULE');
    });

    it('resolves Lactantes A policy by roomType key', () => {
      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoomType('LACTANTES_A');
      expect(policy).toBe(LACTANTES_A_AGE_POLICY);
    });

    it('fails conservatively (returns undefined) for unknown age ranges', () => {
      const unknown1 = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 24,
        maxAgeMonths: 36,
        name: 'Maternal B Desconocido',
      });
      expect(unknown1).toBeUndefined();

      const unknown2 = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: -1,
        maxAgeMonths: -1,
      });
      expect(unknown2).toBeUndefined();
    });

    it('declares explicit provenance on all safety and developmental rules', () => {
      expect(LACTANTES_A_AGE_POLICY.safetyRules.length).toBeGreaterThan(0);
      for (const rule of LACTANTES_A_AGE_POLICY.safetyRules) {
        expect([
          'INSTITUTIONAL_EVIDENCE',
          'CANONICAL_PRODUCT_RULE',
          'PEDAGOGICAL_SAFETY_BASELINE',
          'MASTER_ARB_TEMPORARY_SAFETY_RULE',
        ]).toContain(rule.provenance);
        expect(rule.riskRationale).toBeTruthy();
      }

      expect([
        'INSTITUTIONAL_EVIDENCE',
        'CANONICAL_PRODUCT_RULE',
        'PEDAGOGICAL_SAFETY_BASELINE',
        'MASTER_ARB_TEMPORARY_SAFETY_RULE',
      ]).toContain(LACTANTES_A_AGE_POLICY.developmentalRule.provenance);
    });

    it('distinguishes physical safety boundaries from developmental mismatches and material blocks', () => {
      const blockingSafety = LACTANTES_A_AGE_POLICY.safetyRules.filter(
        (r) => r.severity === 'BLOCKING_SAFETY'
      );
      const developmentalMismatches = LACTANTES_A_AGE_POLICY.safetyRules.filter(
        (r) => r.severity === 'DEVELOPMENTAL_MISMATCH'
      );

      expect(blockingSafety.length).toBeGreaterThanOrEqual(2); // Choking and modeling compounds
      expect(developmentalMismatches.length).toBeGreaterThanOrEqual(2); // Crawling and cognitive classification
    });
  });

  // ==========================================================================
  // SECTION 2: CATEGORY RECONCILIATION & DENSITY POLICY
  // ==========================================================================
  describe('2. Category Reconciliation & Daily Density Decision', () => {
    it('reconciles that IMSS_CATEGORIES contains exactly 5 daily pedagogical moments', () => {
      expect(IMSS_CATEGORIES).toHaveLength(5);
      expect(IMSS_CATEGORIES).toEqual([
        'EXPERIENCIAS ARTÍSTICAS',
        'AMBIENTES DE APRENDIZAJE',
        'ACTIVACIÓN FÍSICA',
        'LECTURA EN VOZ ALTA',
        'PENSAMIENTO MATEMÁTICO',
      ]);
    });

    it('strictly records that targetActivitiesPerDay = 5 is a product default, NOT an IMSS regulation', () => {
      expect(LACTANTES_A_AGE_POLICY.densityPolicy.isNormative).toBe(false);
      expect(LACTANTES_A_AGE_POLICY.densityPolicy.provenance).toBe('CANONICAL_PRODUCT_RULE');
      expect(LACTANTES_A_AGE_POLICY.densityPolicy.targetActivitiesPerDay).toBe(5);
      expect(LACTANTES_A_AGE_POLICY.densityPolicy.guidance).toContain('Los formatos oficiales IMSS no prescriben un número fijo obligatorio');
    });

    it('emits a WARNING when day activity density is below product target (5/day)', () => {
      const thinPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Seguimiento visual de sonaja suave',
                description: 'La educadora mueve lentamente una sonaja suave frente al lactante en colchoneta.',
                durationMinutes: 15,
                materials: ['Pelotas suaves'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        thinPlan,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      const densityWarning = result.warnings.find((w) => w.contextField === 'density');

      expect(densityWarning).toBeDefined();
      expect(densityWarning?.severity).toBe('WARNING');
      expect(densityWarning?.message).toContain('por debajo de la meta de producto de TutorIA');
    });

    it('emits BLOCKING_SAFETY if a day contains zero activities', () => {
      const emptyDayPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        emptyDayPlan,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      const emptyDayViolation = result.blockingViolations.find((v) => v.ruleId === 'density-empty-day');

      expect(emptyDayViolation).toBeDefined();
      expect(emptyDayViolation?.severity).toBe('BLOCKING_SAFETY');
    });
  });

  // ==========================================================================
  // SECTION 3: MATERIAL GOVERNANCE (MASTER ARB DECISION: STRICT BLOCKING)
  // ==========================================================================
  describe('3. Strict Material Enclosure Governance (MASTER ARB BLOCKING)', () => {
    it('accepts materials enclosed in educator-supplied set', () => {
      const safePlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Estimulación auditiva suave',
                description: 'Escuchar música infantil mientras descansan.',
                durationMinutes: 15,
                materials: ['música infantil'], // Supplied in sampleAvailableMaterials
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        safePlan,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      const materialViolations = result.violations.filter(
        (v) => v.ruleId === 'material-outside-supplied-set'
      );
      expect(materialViolations).toHaveLength(0);
    });

    it('MASTER ARB DECISION: Blocks AI proposal when material is outside supplied set (BLOCKING_MATERIAL)', () => {
      const planWithInventedMaterials: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración de cuentos ilustrados',
                description: 'Mostrar ilustraciones de animales grandes.',
                durationMinutes: 15,
                materials: ['libro de cuentos'], // NOT in sampleAvailableMaterials
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithInventedMaterials,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );

      // Must be classified as BLOCKING_MATERIAL and cause isPedagogicallySafe = false
      expect(result.isPedagogicallySafe).toBe(false);
      const materialBlock = result.blockingViolations.find(
        (v) => v.offendingValue === 'libro de cuentos'
      );
      expect(materialBlock).toBeDefined();
      expect(materialBlock?.severity).toBe('BLOCKING_MATERIAL');
      expect(materialBlock?.message).toContain('no se encuentra en los materiales disponibles');
    });

    it('educator-supplied materials are authoritative and unevidenced room fixtures are not approved by default', () => {
      expect(LACTANTES_A_AGE_POLICY.materialPolicy.approvedRoomFixtures).toHaveLength(0);
    });

    it('accepts materials matching an explicitly authorized room fixture when configured by policy', () => {
      const policyWithAuthorizedFixture = {
        ...LACTANTES_A_AGE_POLICY,
        materialPolicy: {
          ...LACTANTES_A_AGE_POLICY.materialPolicy,
          approvedRoomFixtures: ['colchoneta de estimulación'],
        },
      };

      const planWithFixture: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Descanso activo sobre colchoneta',
                description: 'Lactante descansa sobre la colchoneta.',
                durationMinutes: 15,
                materials: ['colchoneta de estimulación'], // NOT in sampleAvailableMaterials, but authorized in policy
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithFixture,
        policyWithAuthorizedFixture,
        sampleAvailableMaterials
      );

      const materialViolations = result.violations.filter(
        (v) => v.ruleId === 'material-outside-supplied-set'
      );
      expect(materialViolations).toHaveLength(0);
    });

    it('proves no silent substitution: unsupplied material is BLOCKED even if semantically adjacent', () => {
      const planWithSubstitution: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Pintura dactilar sustituida',
                description: 'Uso de acuarelas no listadas en lugar de crayones.',
                durationMinutes: 15,
                materials: ['acuarelas'], // Not supplied, cannot be silently substituted
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithSubstitution,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );

      expect(result.isPedagogicallySafe).toBe(false);
      const violation = result.blockingViolations.find((v) => v.offendingValue === 'acuarelas');
      expect(violation?.severity).toBe('BLOCKING_MATERIAL');
    });
  });

  // ==========================================================================
  // SECTION 4: FIRST LIGHT REGRESSION CASES (LACTANTES A DEFECTS)
  // ==========================================================================
  describe('4. First Light Regression Cases — Rejection of Observed Defects', () => {
    it('REGRESSION 1: Rejects plastilina / modeling compound manipulation as BLOCKING_SAFETY', () => {
      const planWithPlastilina: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Manipulación y moldeado de plastilina',
                description:
                  'Los niños amasan la plastilina con sus manos formando pequeñas bolitas y viboritas sobre la mesa.',
                durationMinutes: 20,
                materials: ['plastilina'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithPlastilina,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(result.isPedagogicallySafe).toBe(false);

      const plastilinaViolation = result.blockingViolations.find(
        (v) => v.ruleId === 'safe-lactantes-a-modeling-compounds'
      );
      expect(plastilinaViolation).toBeDefined();
      expect(plastilinaViolation?.severity).toBe('BLOCKING_SAFETY');
      expect(plastilinaViolation?.provenance).toBe('MASTER_ARB_TEMPORARY_SAFETY_RULE');
      expect(plastilinaViolation?.riskRationale).toContain('ingestión');
    });

    it('REGRESSION 2: Rejects loose seeds / small loose parts as BLOCKING_SAFETY choking hazard', () => {
      const planWithSeeds: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'WEDNESDAY',
            activities: [
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Exploración sensorial con semillas de diferentes texturas',
                description:
                  'Se colocan semillas y granos sueltos en el suelo para que los niños los toquen y manipulen.',
                durationMinutes: 20,
                materials: ['semillas', 'recipientes plásticos'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithSeeds,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(result.isPedagogicallySafe).toBe(false);

      const seedViolation = result.blockingViolations.find(
        (v) => v.ruleId === 'safe-lactantes-a-choking-small-parts'
      );
      expect(seedViolation).toBeDefined();
      expect(seedViolation?.severity).toBe('BLOCKING_SAFETY');
      expect(seedViolation?.riskRationale).toContain('asfixia');
    });

    it('REGRESSION 3: Rejects assumed crawling toward hoops as DEVELOPMENTAL_MISMATCH', () => {
      const planWithCrawling: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'TUESDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Desplazamiento motor hacia objetivos',
                description:
                  'Se colocan aros en el suelo para invitar a los niños a gatear hacia los aros.',
                durationMinutes: 15,
                materials: ['recipientes plásticos'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithCrawling,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(result.isPedagogicallySafe).toBe(false);

      const crawlingViolation = result.blockingViolations.find(
        (v) => v.ruleId === 'safe-lactantes-a-unsupported-crawling-target'
      );
      expect(crawlingViolation).toBeDefined();
      expect(crawlingViolation?.severity).toBe('DEVELOPMENTAL_MISMATCH');
      expect(crawlingViolation?.riskRationale).toContain('gateo');
    });

    it('REGRESSION 4: Rejects block sorting / classification by color or size as DEVELOPMENTAL_MISMATCH', () => {
      const planWithClassification: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificar bloques por color y tamaño',
                description:
                  'Los niños agrupan los bloques separando los grandes de los pequeños y los rojos de los azules.',
                durationMinutes: 20,
                materials: ['recipientes plásticos'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithClassification,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(result.isPedagogicallySafe).toBe(false);

      const classViolation = result.blockingViolations.find(
        (v) => v.ruleId === 'safe-lactantes-a-cognitive-classification'
      );
      expect(classViolation).toBeDefined();
      expect(classViolation?.severity).toBe('DEVELOPMENTAL_MISMATCH');
    });
  });

  // ==========================================================================
  // SECTION 5: ACCEPTANCE OF SAFE AGE-APPROPRIATE PRACTICES
  // ==========================================================================
  describe('5. Acceptance of Valid Age-Appropriate Practices for Lactantes A', () => {
    it('accepts a fully compliant plan designed for 0–6 months using supplied materials', () => {
      const fullyCompliantPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Estimulación auditiva y rítmica suave',
                description:
                  'La educadora canta nanas y reproduce música infantil suave mientras sostiene contacto visual afectivo.',
                durationMinutes: 15,
                materials: ['música infantil'],
              },
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Exploración táctil con telas suaves',
                description:
                  'Se deslizan telas de diferentes texturas suavemente sobre los brazos y manos del lactante.',
                durationMinutes: 15,
                materials: ['telas de diferentes texturas'],
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Fortalecimiento de extremidades mediante flexión suave',
                description:
                  'Movimiento guiado suave de piernas y pataleo rítmico sobre superficie acolchada.',
                durationMinutes: 10,
                materials: ['recipientes plásticos'],
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Vínculo afectivo a través de narración sonora',
                description:
                  'La educadora narra rimas breves con entonación dulce y cercana observando las reacciones del lactante.',
                durationMinutes: 10,
                materials: ['música infantil'],
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Seguimiento visual de contraste y permanencia simple',
                description:
                  'Desplazamiento lento de una pelota suave frente al campo visual del lactante para favorecer la fijación ocular.',
                durationMinutes: 10,
                materials: ['Pelotas suaves'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        fullyCompliantPlan,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );

      expect(result.isPedagogicallySafe).toBe(true);
      expect(result.blockingViolations).toHaveLength(0);
      expect(result.warnings.filter((w) => w.contextField === 'materials')).toHaveLength(0);
    });

    it('emits a warning if activity duration exceeds recommended max (20 min) for Lactantes A', () => {
      const longActivityPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'TUESDAY',
            activities: [
              {
                objective: 'Sesión prolongada de estimulación',
                description: 'Actividad extendida de observación.',
                durationMinutes: 35, // Exceeds 20 min limit for 0-6m
                materials: ['música infantil'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        longActivityPlan,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      const durationWarning = result.warnings.find((w) => w.contextField === 'duration');

      expect(durationWarning).toBeDefined();
      expect(durationWarning?.severity).toBe('WARNING');
      expect(durationWarning?.offendingValue).toBe(35);
    });
  });

  // ==========================================================================
  // SECTION 6: ZERO MUTATION & PURE FUNCTIONALITY
  // ==========================================================================
  describe('6. Zero Mutation, Pure Invariants & Modality Support', () => {
    it('evaluation does NOT mutate input plan object or days array', () => {
      const originalPlan: PedagogicalWeeklyPlanCandidate = Object.freeze({
        days: Object.freeze([
          Object.freeze({
            dayOfWeek: 'MONDAY',
            activities: Object.freeze([
              Object.freeze({
                objective: 'Actividad segura',
                description: 'Descripción segura con música',
                durationMinutes: 15,
                materials: Object.freeze(['música infantil']),
              }),
            ]),
          }),
        ]),
      });

      const result = PedagogicalSafetyValidator.evaluatePlan(
        originalPlan,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(result).toBeDefined();
      expect(originalPlan.days[0].activities[0].objective).toBe('Actividad segura');
    });

    it('supports evaluation regardless of DIRECT or INDIRECT modality context', () => {
      const directCandidates: PedagogicalActivityCandidate[] = [
        {
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Pataleo guiado',
          description: 'Pataleo suave guiado con música',
          durationMinutes: 15,
          materials: ['música infantil'],
        },
      ];

      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [{ dayOfWeek: 'FRIDAY', activities: directCandidates }],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_A_AGE_POLICY,
        sampleAvailableMaterials
      );
      // No safety blocking violations (only density warning for 1 activity vs target 5)
      expect(
        result.blockingViolations.filter((v) => v.severity === 'BLOCKING_SAFETY')
      ).toHaveLength(0);
    });
  });
});
