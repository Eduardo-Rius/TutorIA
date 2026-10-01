/**
 * Pedagogical Safety & Age Policy Domain Foundation
 *
 * Implements deterministic domain rules governing developmental appropriateness,
 * infant safety, material enclosure, and daily planning density across IMSS rooms.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * 1. PURE DETERMINISTIC DOMAIN: Zero external network, zero OpenAI, zero Firebase dependencies.
 * 2. EXPLICIT PROVENANCE: Every rule must declare its authoritative origin.
 * 3. CAPABILITY VS SAFETY SEPARATION: Distinguishes developmental mismatches from acute physical hazards.
 * 4. HUMAN GOVERNANCE: Policy informs and protects; Anita remains the sole decision authority.
 * 5. CONSERVATIVE FAIL-CLOSED: Unrecognized rooms or age profiles trigger fail-closed diagnostics.
 * 6. STRICT MATERIAL ENCLOSURE: AI-generated proposals cannot silently assume or invent unsupplied materials.
 */

export type PedagogicalRuleProvenance =
  | 'INSTITUTIONAL_EVIDENCE'
  | 'CANONICAL_PRODUCT_RULE'
  | 'PEDAGOGICAL_SAFETY_BASELINE'
  | 'MASTER_ARB_TEMPORARY_SAFETY_RULE';

export type PedagogicalPolicySeverity =
  | 'BLOCKING_SAFETY'
  | 'DEVELOPMENTAL_MISMATCH'
  | 'BLOCKING_MATERIAL'
  | 'WARNING';

/**
 * Candidate activity representation for policy evaluation.
 * Pure domain interface decoupled from transport/application envelopes.
 */
export interface PedagogicalActivityCandidate {
  readonly category?: string;
  readonly objective: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly materials: readonly string[];
}

/**
 * Candidate day representation for policy evaluation.
 */
export interface PedagogicalDayCandidate {
  readonly dayOfWeek: string;
  readonly date?: string;
  readonly activities: readonly PedagogicalActivityCandidate[];
}

/**
 * Candidate weekly plan representation for policy evaluation.
 */
export interface PedagogicalWeeklyPlanCandidate {
  readonly days: readonly PedagogicalDayCandidate[];
}

/**
 * Explicit rule representing an acute physical safety boundary (choking, ingestion, toxicity, trauma).
 */
export interface PedagogicalSafetyRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: PedagogicalPolicySeverity;
  readonly provenance: PedagogicalRuleProvenance;
  /** Normalized lowercase strings or regex patterns identifying prohibited materials */
  readonly prohibitedMaterials?: readonly (string | RegExp)[];
  /** Action patterns in description/objective representing unsafe infant actions */
  readonly prohibitedActionPatterns?: readonly RegExp[];
  /** Authoritative or pedagogical justification */
  readonly riskRationale: string;
}

/**
 * Explicit rule representing age-appropriate motor and cognitive developmental milestones.
 */
export interface PedagogicalDevelopmentalRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: PedagogicalPolicySeverity;
  readonly provenance: PedagogicalRuleProvenance;
  /** Capabilities developmentally expected for this age band */
  readonly supportedCapabilities: readonly string[];
  /** Actions or cognitive expectations that are developmentally inappropriate */
  readonly excludedExpectations: readonly string[];
  /** Action patterns in description/objective representing excluded expectations */
  readonly excludedActionPatterns?: readonly RegExp[];
  /** Pedagogical rationale */
  readonly rationale: string;
}

/**
 * Governs the material boundary: activities must use educator-supplied materials
 * plus explicitly authorized room fixtures.
 */
export interface PedagogicalMaterialPolicy {
  readonly strictEnclosure: boolean;
  /** Approved standard fixtures inherent to the physical room (empty by default if unevidenced) */
  readonly approvedRoomFixtures: readonly string[];
  /** Material categories explicitly prohibited for this age band */
  readonly prohibitedMaterialCategories: readonly string[];
  readonly provenance: PedagogicalRuleProvenance;
}

/**
 * Daily planning density guidance.
 * Explicitly distinguishes non-normative product defaults from institutional mandates.
 */
export interface WeeklyPlanningDensityPolicy {
  /** The official IMSS format does NOT mandate an exact numeric activity count */
  readonly isNormative: false;
  /** TutorIA product default target to structure the daily pedagogical categories */
  readonly targetActivitiesPerDay: number;
  /** Technical lower bound to prevent empty days (default: 1) */
  readonly minActivitiesPerDay?: number;
  /** Technical upper bound to prevent runaway payload (default: 10) */
  readonly maxActivitiesPerDay?: number;
  readonly guidance: string;
  readonly provenance: PedagogicalRuleProvenance;
}

/**
 * Comprehensive age policy for a specific developmental room profile.
 */
export interface PedagogicalAgePolicy {
  readonly roomType: string;
  readonly label: string;
  readonly minAgeMonths: number;
  readonly maxAgeMonths: number;
  readonly recommendedMaxDurationMinutes: number;
  readonly safetyRules: readonly PedagogicalSafetyRule[];
  readonly developmentalRule: PedagogicalDevelopmentalRule;
  readonly materialPolicy: PedagogicalMaterialPolicy;
  readonly densityPolicy: WeeklyPlanningDensityPolicy;
  readonly provenance: PedagogicalRuleProvenance;
}

/**
 * Violation report emitted when a proposed plan conflicts with pedagogical policy.
 */
export interface PedagogicalPolicyViolation {
  readonly ruleId: string;
  readonly severity: PedagogicalPolicySeverity;
  readonly message: string;
  readonly provenance: PedagogicalRuleProvenance;
  readonly dayOfWeek?: string;
  readonly activityIndex?: number;
  readonly contextField?: 'materials' | 'description' | 'objective' | 'duration' | 'density';
  readonly offendingValue?: string | number;
  readonly riskRationale?: string;
}

/**
 * Result of a deterministic policy evaluation.
 */
export interface PedagogicalPolicyEvaluationResult {
  readonly isPedagogicallySafe: boolean;
  readonly violations: readonly PedagogicalPolicyViolation[];
  readonly blockingViolations: readonly PedagogicalPolicyViolation[];
  readonly warnings: readonly PedagogicalPolicyViolation[];
}

// ============================================================================
// CANONICAL POLICY DEFINITION: LACTANTES A (0–6 MONTHS)
// ============================================================================

export const LACTANTES_A_SAFETY_RULES: readonly PedagogicalSafetyRule[] = Object.freeze([
  {
    id: 'safe-lactantes-a-choking-small-parts',
    name: 'Peligro de asfixia o aspiración por semillas o piezas pequeñas',
    description: 'Prohíbe semillas, cuentas, granos sueltos u objetos menores a 3 cm en sala de lactantes menores.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedMaterials: [
      'semilla',
      'semillas',
      'frijol',
      'frijoles',
      'arroz',
      'cuenta',
      'cuentas',
      'canica',
      'canicas',
      'grano',
      'granos',
      'lenteja',
      'lentejas',
      'botón',
      'botones',
      'chícharo',
      'chícharos'
    ],
    riskRationale:
      'Infantes de 0–6 meses exploran el entorno mediante vía oral obligada. Semillas o partes pequeñas presentan riesgo inminente de asfixia y aspiración traqueobronquial.'
  },
  {
    id: 'safe-lactantes-a-modeling-compounds',
    name: 'Materiales no ingeribles de modelado o masa plástica',
    description: 'Prohíbe plastilina, arcilla o masas para moldear en sala de lactantes menores.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'MASTER_ARB_TEMPORARY_SAFETY_RULE',
    prohibitedMaterials: [
      'plastilina',
      'plastilinas',
      'masa para moldear',
      'masas para moldear',
      'arcilla',
      'yeso',
      'pasta de modelar',
      'play-doh'
    ],
    riskRationale:
      'La plastilina y compuestos de modelado conllevan riesgo de ingestión tóxica u obstrucción oral en lactantes de 0–6 meses y demandan motricidad fina aún no desarrollada.'
  },
  {
    id: 'safe-lactantes-a-unsupported-crawling-target',
    name: 'Suposición de gateo o locomoción voluntaria hacia obstáculos',
    description: 'Prohíbe asumir gateo o desplazamiento voluntario hacia aros u objetos en suelo para 0–6 meses.',
    severity: 'DEVELOPMENTAL_MISMATCH',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedActionPatterns: [
      /\bgate(ar|en|an|o)\b/i,
      /\barrastr(ar|en|an|ándose|arse)\s+(hacia|hasta)\b/i,
      /\bdesplaz(arse|amiento)\s+gateando\b/i,
      /\bhacia\s+los\s+aros\b/i
    ],
    riskRationale:
      'El gateo cuadrúpedo coordinado típicamente se alcanza entre los 7 y 10 meses. Exigir gateo a lactantes de 0–6 meses es fisiológicamente imposible y desorienta la intervención pedagógica.'
  },
  {
    id: 'safe-lactantes-a-cognitive-classification',
    name: 'Exigencia cognitiva de clasificación o seriación prematura',
    description: 'Prohíbe tareas de clasificar, agrupar o seriar bloques u objetos por color o tamaño en 0–6 meses.',
    severity: 'DEVELOPMENTAL_MISMATCH',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedActionPatterns: [
      /\bclasific(ar|an|en|ación)\b.*?\b(color|tamaño|forma)\b/i,
      /\bagrup(ar|an|en|ación)\b.*?\b(color|tamaño|forma)\b/i,
      /\borden(ar|an|en|amiento)\b.*?\b(tamaño|color|forma)\b/i,
      /\bidentific(ar|an|en)\s+(colores|tamaños)\b/i
    ],
    riskRationale:
      'La clasificación lógica por atributos discretos (color, tamaño) corresponde a estadios preoperatorios posteriores. En 0–6 meses la cognición opera mediante exploración sensoriomotriz refleja y circular primaria.'
  }
]);

export const LACTANTES_A_DEVELOPMENTAL_RULE: PedagogicalDevelopmentalRule = Object.freeze({
  id: 'dev-lactantes-a-sensoriomotor-baseline',
  name: 'Hitos sensoriomotores y de contacto afectivo (0 a 6 meses)',
  description: 'Lineamientos de adecuación funcional para la sala de atención Lactantes A.',
  severity: 'DEVELOPMENTAL_MISMATCH',
  provenance: 'CANONICAL_PRODUCT_RULE',
  supportedCapabilities: [
    'Seguimiento visual de estímulos contrastantes en movimiento lento',
    'Respuesta y orientación auditiva a la voz humana, nanas y sonajas suaves',
    'Exploración táctil pasiva y activa con textiles seguros de distintas texturas',
    'Pataleo libre y flexión-extensión guiada de extremidades sobre superficie acolchada',
    'Sostén cefálico gradual en posición boca abajo (tummy time) con supervisión estrecha 1 a 1'
  ],
  excludedExpectations: [
    'Gateo autónomo coordinado hacia objetivos o aros',
    'Modelado y prensión fina de plastilinas o masas',
    'Clasificación conceptual por color o tamaño',
    'Bipedestación o marcha asistida',
    'Comprensión verbal de consignas narrativas complejas'
  ],
  excludedActionPatterns: [
    /\bgate(ar|en|an|o)\b/i,
    /\bclasific(ar|an|en|ación)\b/i,
    /\bmold(ear|eado)\b/i
  ],
  rationale:
    'La atención en Lactantes A privilegia el vínculo afectivo, la contención física, la estimulación sensorial respetuosa y el movimiento libre sobre colchoneta.'
});

export const LACTANTES_A_MATERIAL_POLICY: PedagogicalMaterialPolicy = Object.freeze({
  strictEnclosure: true,
  // Educator-supplied materials remain authoritative; no unevidenced fixtures permit bypass
  approvedRoomFixtures: [],
  prohibitedMaterialCategories: [
    'semillas o partes pequeñas',
    'compuestos de modelado o plastilina',
    'tijeras',
    'objetos punzocortantes',
    'aros rígidos para gateo'
  ],
  provenance: 'CANONICAL_PRODUCT_RULE'
});

export const LACTANTES_A_DENSITY_POLICY: WeeklyPlanningDensityPolicy = Object.freeze({
  isNormative: false,
  targetActivitiesPerDay: 5,
  minActivitiesPerDay: 1,
  maxActivitiesPerDay: 10,
  guidance:
    'TutorIA establece como meta de producto (no normativa) 5 actividades por jornada para estructurar los momentos pedagógicos cotidianos de la guardería (experiencias artísticas, ambientes de aprendizaje, activación física, lectura en voz alta y pensamiento matemático). Los formatos oficiales IMSS no prescriben un número fijo obligatorio.',
  provenance: 'CANONICAL_PRODUCT_RULE'
});

export const LACTANTES_A_AGE_POLICY: PedagogicalAgePolicy = Object.freeze({
  roomType: 'LACTANTES_A',
  label: 'Lactantes A (0 a 6 meses)',
  minAgeMonths: 0,
  maxAgeMonths: 6,
  recommendedMaxDurationMinutes: 20,
  safetyRules: LACTANTES_A_SAFETY_RULES,
  developmentalRule: LACTANTES_A_DEVELOPMENTAL_RULE,
  materialPolicy: LACTANTES_A_MATERIAL_POLICY,
  densityPolicy: LACTANTES_A_DENSITY_POLICY,
  provenance: 'CANONICAL_PRODUCT_RULE'
});

// ============================================================================
// POLICY CATALOG
// ============================================================================

export class PedagogicalAgePolicyCatalog {
  private static readonly policies: readonly PedagogicalAgePolicy[] = Object.freeze([
    LACTANTES_A_AGE_POLICY
  ]);

  /**
   * Resolves policy by room age boundary or roomType identifier.
   */
  public static getPolicyForRoom(room: {
    minAgeMonths: number;
    maxAgeMonths: number;
    name?: string;
  }): PedagogicalAgePolicy | undefined {
    if (typeof room.minAgeMonths !== 'number' || typeof room.maxAgeMonths !== 'number') {
      return undefined;
    }

    // Exact match for 0–6 months -> Lactantes A
    if (room.minAgeMonths === 0 && room.maxAgeMonths <= 6) {
      return LACTANTES_A_AGE_POLICY;
    }

    // Fallback search by room name if bounds overlap
    if (room.name) {
      const normalizedName = room.name.toLowerCase().trim();
      if (normalizedName.includes('lactantes a') || normalizedName === 'lactantes-a') {
        return LACTANTES_A_AGE_POLICY;
      }
    }

    return undefined;
  }

  /**
   * Resolves policy by canonical roomType key.
   */
  public static getPolicyForRoomType(roomType: string): PedagogicalAgePolicy | undefined {
    return this.policies.find(p => p.roomType === roomType);
  }

  /**
   * Returns all registered policies.
   */
  public static getAllPolicies(): readonly PedagogicalAgePolicy[] {
    return this.policies;
  }
}

// ============================================================================
// DETERMINISTIC PEDAGOGICAL SAFETY VALIDATOR
// ============================================================================

export class PedagogicalSafetyValidator {
  /**
   * Normalizes a text string for resilient matching (lowercase, trims, removes punctuation and diacritics).
   */
  public static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics for resilient comparison
      .replace(/[.,;:/\\()\[\]{}"'?!¡¿]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts individual material keywords or phrases from educator-supplied text.
   */
  public static parseAvailableMaterialsList(rawContext?: string): string[] {
    if (!rawContext || !rawContext.trim()) return [];
    return rawContext
      .split(/[,;\n•\r]+/)
      .map(s => this.normalizeText(s))
      .filter(s => s.length > 0);
  }

  /**
   * Validates whether a candidate material is enclosed by available materials or approved room fixtures.
   */
  public static isMaterialEnclosed(
    materialName: string,
    availableMaterials: readonly string[],
    approvedFixtures: readonly string[]
  ): boolean {
    const normalized = this.normalizeText(materialName);
    if (!normalized) return true;

    // Check direct or partial match with approved room fixtures
    for (const fixture of approvedFixtures) {
      const normFix = this.normalizeText(fixture);
      if (normalized === normFix || normalized.includes(normFix) || normFix.includes(normalized)) {
        return true;
      }
    }

    // Check direct or partial match with educator-supplied materials
    for (const avail of availableMaterials) {
      if (!avail) continue;
      if (normalized === avail || normalized.includes(avail) || avail.includes(normalized)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluates a weekly plan candidate against an active PedagogicalAgePolicy.
   *
   * @param plan Candidate weekly plan with days and activities
   * @param policy The room age policy to evaluate against
   * @param rawAvailableMaterials The educator-supplied available materials string
   */
  public static evaluatePlan(
    plan: PedagogicalWeeklyPlanCandidate,
    policy: PedagogicalAgePolicy,
    rawAvailableMaterials?: string
  ): PedagogicalPolicyEvaluationResult {
    const violations: PedagogicalPolicyViolation[] = [];
    const parsedAvailable = this.parseAvailableMaterialsList(rawAvailableMaterials);

    if (!plan || !Array.isArray(plan.days)) {
      violations.push({
        ruleId: 'structural-invalid-plan',
        severity: 'BLOCKING_SAFETY',
        message: 'Plan de planeación inválido o sin días definidos.',
        provenance: 'CANONICAL_PRODUCT_RULE'
      });
      return {
        isPedagogicallySafe: false,
        violations: Object.freeze(violations),
        blockingViolations: Object.freeze(violations),
        warnings: Object.freeze([])
      };
    }

    // 1. Evaluate Daily Density Policy
    for (const day of plan.days) {
      const actCount = day.activities ? day.activities.length : 0;

      // Technical boundary: Day cannot be empty
      if (actCount < (policy.densityPolicy.minActivitiesPerDay ?? 1)) {
        violations.push({
          ruleId: 'density-empty-day',
          severity: 'BLOCKING_SAFETY',
          message: `El día ${day.dayOfWeek} no contiene actividades. Se requiere al menos 1 actividad por día hábil.`,
          provenance: 'CANONICAL_PRODUCT_RULE',
          dayOfWeek: day.dayOfWeek,
          contextField: 'density',
          offendingValue: actCount,
          riskRationale: 'Un día sin actividades deja desestructurada la jornada educativa.'
        });
      } else if (actCount < policy.densityPolicy.targetActivitiesPerDay) {
        // Product target guidance: Warning when below target (e.g. 1 activity/day instead of 5)
        violations.push({
          ruleId: 'density-below-product-target',
          severity: 'WARNING',
          message: `El día ${day.dayOfWeek} contiene solo ${actCount} actividad(es), por debajo de la meta de producto de TutorIA para ${policy.label} (${policy.densityPolicy.targetActivitiesPerDay} actividades por jornada) para cubrir los momentos pedagógicos cotidianos.`,
          provenance: policy.densityPolicy.provenance,
          dayOfWeek: day.dayOfWeek,
          contextField: 'density',
          offendingValue: actCount,
          riskRationale: policy.densityPolicy.guidance
        });
      }
    }

    // 2. Evaluate Activities: Safety, Developmental Mismatch, Duration, and Material Enclosure
    for (const day of plan.days) {
      if (!day.activities) continue;

      day.activities.forEach((activity: PedagogicalActivityCandidate, actIdx: number) => {
        const normObjective = this.normalizeText(activity.objective || '');
        const normDescription = this.normalizeText(activity.description || '');
        const fullActText = `${normObjective} ${normDescription}`;

        // A. Duration Check
        if (activity.durationMinutes > policy.recommendedMaxDurationMinutes) {
          violations.push({
            ruleId: 'duration-exceeds-age-recommendation',
            severity: 'WARNING',
            message: `La actividad ${actIdx + 1} del ${day.dayOfWeek} tiene una duración de ${activity.durationMinutes} minutos, que excede el máximo recomendado de ${policy.recommendedMaxDurationMinutes} min para ${policy.label}.`,
            provenance: policy.provenance,
            dayOfWeek: day.dayOfWeek,
            activityIndex: actIdx,
            contextField: 'duration',
            offendingValue: activity.durationMinutes,
            riskRationale: 'Lactantes menores tienen periodos de atención focalizada muy breves.'
          });
        }

        // B. Safety Rules Check (Choking, Prohibited Materials, Unsafe Actions)
        for (const rule of policy.safetyRules) {
          // Check materials list against prohibited materials
          if (rule.prohibitedMaterials && Array.isArray(activity.materials)) {
            for (const mat of activity.materials) {
              const normMat = this.normalizeText(mat);
              const isMatch = rule.prohibitedMaterials.some(prohibited => {
                if (typeof prohibited === 'string') {
                  const normProh = this.normalizeText(prohibited);
                  return normMat === normProh || normMat.includes(normProh);
                }
                return prohibited.test(mat) || prohibited.test(normMat);
              });

              if (isMatch) {
                violations.push({
                  ruleId: rule.id,
                  severity: rule.severity,
                  message: `Material no permitido detectado: "${mat}" en ${day.dayOfWeek} (actividad ${actIdx + 1}). ${rule.description}`,
                  provenance: rule.provenance,
                  dayOfWeek: day.dayOfWeek,
                  activityIndex: actIdx,
                  contextField: 'materials',
                  offendingValue: mat,
                  riskRationale: rule.riskRationale
                });
              }
            }
          }

          // Check action patterns in objective and description
          if (rule.prohibitedActionPatterns) {
            for (const pattern of rule.prohibitedActionPatterns) {
              if (pattern.test(activity.objective) || pattern.test(activity.description) || pattern.test(fullActText)) {
                violations.push({
                  ruleId: rule.id,
                  severity: rule.severity,
                  message: `Acción pedagógica no permitida detectada en ${day.dayOfWeek} (actividad ${actIdx + 1}): regla "${rule.name}".`,
                  provenance: rule.provenance,
                  dayOfWeek: day.dayOfWeek,
                  activityIndex: actIdx,
                  contextField: 'description',
                  riskRationale: rule.riskRationale
                });
                break;
              }
            }
          }
        }

        // C. Developmental Rules Check
        if (policy.developmentalRule.excludedActionPatterns) {
          for (const pattern of policy.developmentalRule.excludedActionPatterns) {
            if (pattern.test(activity.objective) || pattern.test(activity.description) || pattern.test(fullActText)) {
              // Avoid duplicate violation if already caught by safety rule
              const alreadyViolated = violations.some(
                v => v.dayOfWeek === day.dayOfWeek && v.activityIndex === actIdx && v.ruleId.includes(policy.developmentalRule.id)
              );
              if (!alreadyViolated) {
                violations.push({
                  ruleId: policy.developmentalRule.id,
                  severity: policy.developmentalRule.severity,
                  message: `Incompatibilidad con hito del desarrollo para ${policy.label} en ${day.dayOfWeek} (actividad ${actIdx + 1}): "${activity.objective}".`,
                  provenance: policy.developmentalRule.provenance,
                  dayOfWeek: day.dayOfWeek,
                  activityIndex: actIdx,
                  contextField: 'objective',
                  riskRationale: policy.developmentalRule.rationale
                });
              }
              break;
            }
          }
        }

        // D. Material Enclosure Check (against educator-supplied list + approved room fixtures)
        // MASTER ARB DECISION: Unsupplied materials are strictly BLOCKING_MATERIAL for AI proposals
        if (policy.materialPolicy.strictEnclosure && Array.isArray(activity.materials)) {
          for (const mat of activity.materials) {
            const isEnclosed = this.isMaterialEnclosed(
              mat,
              parsedAvailable,
              policy.materialPolicy.approvedRoomFixtures
            );

            if (!isEnclosed) {
              violations.push({
                ruleId: 'material-outside-supplied-set',
                severity: 'BLOCKING_MATERIAL',
                message: `El material "${mat}" en ${day.dayOfWeek} (actividad ${actIdx + 1}) no se encuentra en los materiales disponibles indicados por la educadora ni en el mobiliario autorizado. La propuesta de IA no puede inventar materiales fuera del conjunto disponible.`,
                provenance: policy.materialPolicy.provenance,
                dayOfWeek: day.dayOfWeek,
                activityIndex: actIdx,
                contextField: 'materials',
                offendingValue: mat,
                riskRationale:
                  'La propuesta generada por IA debe ceñirse estrictamente a los recursos disponibles de la educadora para evitar frustración operativa o necesidad de compra no prevista.'
              });
            }
          }
        }
      });
    }

    const blockingViolations = violations.filter(
      v =>
        v.severity === 'BLOCKING_SAFETY' ||
        v.severity === 'DEVELOPMENTAL_MISMATCH' ||
        v.severity === 'BLOCKING_MATERIAL'
    );
    const warnings = violations.filter(v => v.severity === 'WARNING');

    return {
      isPedagogicallySafe: blockingViolations.length === 0,
      violations: Object.freeze(violations),
      blockingViolations: Object.freeze(blockingViolations),
      warnings: Object.freeze(warnings)
    };
  }
}
