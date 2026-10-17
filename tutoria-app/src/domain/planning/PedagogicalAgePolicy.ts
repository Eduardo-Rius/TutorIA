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
  /** Optional legacy target; undefined in V1 flexible composition */
  readonly targetActivitiesPerDay?: number;
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
      'chícharos',
      'moneda',
      'monedas',
      'cordón',
      'cordones',
      'cuchara metálica',
      'cucharas metálicas'
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
  },
  {
    id: 'safe-lactantes-a-forced-limb-traction',
    name: 'Peligro de tracción o incorporación forzada de extremidades',
    description: 'Prohíbe jalar, tirar, traccionar o incorporar al lactante por brazos, manos, muñecas o piernas, así como forzar la flexión o extensión de sus extremidades.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedActionPatterns: [
      /\b(jal(ar|as|a|es|en|on|ón|ando)|tir(ar|as|a|es|en|on|ón|ando|ones))\b.*?\b(brazos?|manos?|mu[ñn]ecas?|piernas?|tobillos?|extremidades?)\b/i,
      /\btracci[oó]n\b/i,
      /\btraccion(ar|as|a|es|en|ando)\b/i,
      /\b(incorporar|sentar)(lo|la)?\b.*?\b(por|de|desde|tomando|sujetando|tirando|jalando)\b.*?\b(brazos?|manos?|mu[ñn]ecas?|pulgares?)\b/i,
      /\b(jal(ar|as|a|es|en|on|ón|ando)|tir(ar|as|a|es|en|on|ón|ando|ones))\b.*?\bpara\s+(incorporar|sentar)(lo|la)?\b/i,
      /\b(dar\s+)?tiron(es)?\b.*?\bpara\s+(incorporar|sentar|levantar)(lo|la)?\b/i,
      /\bforzar\b.*?\b(flexi[oó]n|extensi[oó]n|movimiento)\b.*?\b(piernas?|brazos?|extremidades?|articulaciones?)\b/i,
      /\bforzar\s+(la\s+)?(flexi[oó]n|extensi[oó]n)\b/i,
      /\blevant(ar|as|a|es|en|ando)(lo|la)?\b.*?\b(por|tirando\s+de|jalando\s+de)\s+(los\s+brazos|las\s+manos|las\s+mu[ñn]ecas)\b/i,
      /\bjalar\s+hacia\s+arriba\b/i
    ],
    riskRationale:
      'En lactantes de 0 a 6 meses el tono muscular cervical y la estabilidad articular están en desarrollo temprano. Jalar de manos o muñecas para incorporarlo, traccionar extremidades o forzar flexiones genera riesgo biomecánico grave de subluxación de la cabeza del radio (codo de niñera), luxación de hombro o hiperextensión cervical brusca.'
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
  minActivitiesPerDay: 1,
  maxActivitiesPerDay: 10,
  guidance:
    'TutorIA V1 adopta una composición pedagógica semanal flexible basada en observaciones, sin una cuota fija obligatoria de actividades por jornada. Se establecen límites técnicos de seguridad (mínimo 1, máximo 10 actividades por día hábil). Los formatos oficiales IMSS no prescriben un número fijo obligatorio.',
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
// CANONICAL POLICY DEFINITION: LACTANTES B (7–12 MONTHS)
// ============================================================================

export const LACTANTES_B_SAFETY_RULES: readonly PedagogicalSafetyRule[] = Object.freeze([
  {
    id: 'safe-lactantes-b-suffocation-head-covering',
    name: 'Peligro de sofocación por cubrir cabeza o rostro con telas',
    description: 'Prohíbe cubrir la cabeza, rostro o vías respiratorias del lactante con sábanas, telas o prendas.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'MASTER_ARB_TEMPORARY_SAFETY_RULE',
    prohibitedActionPatterns: [
      /\bcubr(ir|as|an|e|iendo)\b.*?\b(cabeza|rostro|cara)\b/i,
      /\btap(ar|as|an|e|ando)\b.*?\b(cabeza|rostro|cara)\b/i,
      /\bcabeza\s+de\s+un\s+beb[ée]\s+adentro\b/i
    ],
    riskRationale:
      'Cubrir la cabeza o vías respiratorias de un infante de 7 a 12 meses genera riesgo inminente de sofocación transitoria, hipoxia y angustia extrema.'
  },
  {
    id: 'safe-lactantes-b-forced-limb-traction',
    name: 'Peligro de tracción o levantamiento forzado de extremidades',
    description: 'Prohíbe jalar, traccionar o incorporar bruscamente al lactante por brazos o muñecas.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedActionPatterns: [
      /\bjal(ar|es|en|ón|ando)\b.*?\b(brazos?|manos?|muñecas?|extremidades?)\b/i,
      /\btracci[oó]n\s+forzada\b/i,
      /\blevant(ar|es|en|ando)\s+(al\s+beb[ée]|al\s+niño)?\s*(del\s+suelo|de\s+la\s+colchoneta)?\s*por\s+los\s+brazos\b/i,
      /\bjalar\s+hacia\s+arriba\b/i
    ],
    riskRationale:
      'La tracción intempestiva sobre extremidades superiores puede provocar subluxación de la cabeza del radio (pronación dolorosa o codo de niñera) o lesiones ligamentosas.'
  },
  {
    id: 'safe-lactantes-b-choking-small-parts',
    name: 'Peligro de asfixia o aspiración por objetos pequeños desprendibles',
    description: 'Prohíbe semillas, cuentas, canicas u objetos desprendibles menores que presenten peligro de asfixia en lactantes.',
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
      'botón',
      'botones',
      'moneda',
      'monedas',
      'globo',
      'globos',
      'lenteja',
      'lentejas',
      'chícharo',
      'chícharos',
      'cordón',
      'cordones',
      'cuerda',
      'cuerdas',
      'lazo',
      'lazos',
      'mecate',
      'mecates',
      'listón largo',
      'listones largos',
      'cuchara metálica',
      'cucharas metálicas'
    ],
    riskRationale:
      'Infantes de 7 a 12 meses exploran persistentemente por vía oral. Objetos pequeños o desprendibles presentan riesgo crítico de asfixia y obstrucción de la vía aérea.'
  },
  {
    id: 'safe-lactantes-b-unfiltered-bag-access',
    name: 'Acceso no supervisado a pañaleras o pertenencias externas',
    description: 'Prohíbe que el lactante explore pañaleras o maletas sin previa selección e inspección de seguridad por la educadora.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'MASTER_ARB_TEMPORARY_SAFETY_RULE',
    prohibitedActionPatterns: [
      /\b(explor(ar|e|en|ando)|revis(ar|e|en|ando))\s+(la\s+)?(pañalera|maleta|mochila)\s+sin\s+revis/i,
      /\bsaque\s+libremente\s+.*?\b(medicamento|pomada|llaves?|objetos?\s+pequeños?)\b/i,
      /\bpañalera\s+sin\s+(revisi[oó]n|filtrar|supervisi[oó]n)\b/i
    ],
    riskRationale:
      'Las pañaleras procedentes del hogar contienen frecuentemente medicamentos, pomadas, llaves, monedas o artículos no inocuos con riesgo de intoxicación o asfixia.'
  },
  {
    id: 'safe-lactantes-b-unsupported-standing-march',
    name: 'Exigencia motriz de marcha autónoma o bipedestación forzada',
    description: 'Prohíbe forzar la caminata erguida o bipedestación obligatoria respetando que el ritmo motor es individual y no uniforme.',
    severity: 'DEVELOPMENTAL_MISMATCH',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedActionPatterns: [
      /\bcaminar\s+en\s+fila\b/i,
      /\bmarcha\s+aut[oó]noma\s+obligatoria\b/i,
      /\bcorrer\s+hacia\b/i,
      /\bforzar\s+(la\s+)?(marcha|caminata|bipedestaci[oó]n)\b/i,
      /\boblig(ar|atorio|atoria)\s+(a\s+)?(caminar|gatear)\b/i
    ],
    riskRationale:
      'Entre los 7 y 12 meses el desarrollo motor es altamente individualizado. Gatear o caminar no son obligaciones universales a esta edad; forzar posturas lesiona la maduración física y la confianza.'
  }
]);

export const LACTANTES_B_DEVELOPMENTAL_RULE: PedagogicalDevelopmentalRule = Object.freeze({
  id: 'dev-lactantes-b-milestones-baseline',
  name: 'Hitos psicomotores y de comunicación (7 a 12 meses)',
  description: 'Orientaciones pedagógicas de adecuación para Lactantes B basadas en la individualidad del desarrollo.',
  severity: 'DEVELOPMENTAL_MISMATCH',
  provenance: 'CANONICAL_PRODUCT_RULE',
  supportedCapabilities: [
    'Sedestación con o sin apoyo sobre superficie acolchada o colchoneta',
    'Desplazamiento autónomo individual (arrastre, gateo espontáneo o giros según ritmo propio)',
    'Manipulación bimanual exploratoria (sujetar, golpear suavemente, sacar y meter juguetes en recipientes)',
    'Balbuceo imitativo, trompetillas, vocalizaciones y respuesta comunicativa ante el educador y el espejo',
    'Revisión y manipulación de cuentos plastificados o de tela y muñecos seguros',
    'Participación afectiva guiada en rutinas de aseo, cambio de ropa y guardado ordenado de materiales'
  ],
  excludedExpectations: [
    'Marcha erguida independiente obligatoria o en formación grupal',
    'Uso de herramientas de corte (tijeras) o manipulación de masas no ingeribles',
    'Control voluntario de esfínteres',
    'Comprensión o ejecución de consignas conceptuales o narrativas complejas'
  ],
  excludedActionPatterns: [
    /\btijeras?\b/i,
    /\bmold(ear|eado)\s+(plastilina|arcilla|masa)\b/i,
    /\bcontrol\s+de\s+esf[íi]nteres\b/i
  ],
  rationale:
    'La atención en Lactantes B estimula el movimiento libre y gradual, la interacción comunicativa y los hábitos formativos respetando el ritmo individual de cada infante.'
});

export const LACTANTES_B_MATERIAL_POLICY: PedagogicalMaterialPolicy = Object.freeze({
  strictEnclosure: true,
  // Educator-supplied materials remain authoritative; no unevidenced fixtures permit bypass
  approvedRoomFixtures: [],
  prohibitedMaterialCategories: [
    'semillas o partes pequeñas',
    'compuestos de modelado o plastilina',
    'tijeras',
    'objetos punzocortantes',
    'sábanas o telas sobre la cabeza',
    'globos de látex'
  ],
  provenance: 'CANONICAL_PRODUCT_RULE'
});

export const LACTANTES_B_DENSITY_POLICY: WeeklyPlanningDensityPolicy = LACTANTES_A_DENSITY_POLICY;

export const LACTANTES_B_AGE_POLICY: PedagogicalAgePolicy = Object.freeze({
  roomType: 'LACTANTES_B',
  label: 'Lactantes B (7 a 12 meses)',
  minAgeMonths: 7,
  maxAgeMonths: 12,
  recommendedMaxDurationMinutes: 20,
  safetyRules: LACTANTES_B_SAFETY_RULES,
  developmentalRule: LACTANTES_B_DEVELOPMENTAL_RULE,
  materialPolicy: LACTANTES_B_MATERIAL_POLICY,
  densityPolicy: LACTANTES_B_DENSITY_POLICY,
  provenance: 'CANONICAL_PRODUCT_RULE'
});

// ============================================================================
// POLICY CATALOG
// ============================================================================

export class PedagogicalAgePolicyCatalog {
  private static readonly policies: readonly PedagogicalAgePolicy[] = Object.freeze([
    LACTANTES_A_AGE_POLICY,
    LACTANTES_B_AGE_POLICY
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

    // Exact match for 7–12 months -> Lactantes B
    if (room.minAgeMonths >= 7 && room.maxAgeMonths <= 12) {
      return LACTANTES_B_AGE_POLICY;
    }

    // Fallback search by room name if bounds overlap
    if (room.name) {
      const normalizedName = room.name.toLowerCase().trim();
      if (normalizedName.includes('lactantes a') || normalizedName === 'lactantes-a') {
        return LACTANTES_A_AGE_POLICY;
      }
      if (normalizedName.includes('lactantes b') || normalizedName === 'lactantes-b') {
        return LACTANTES_B_AGE_POLICY;
      }
    }

    return undefined;
  }

  /**
   * Authoritative policy gate controlling AI proposal generation.
   * Only room profiles with formal institutional pedagogical approval are authorized for AI.
   * Lactantes A: Authorized (First Light LAB).
   * Lactantes B: Strictly NOT authorized pending institutional validation.
   */
  public static isAiGenerationAuthorized(roomType: string): boolean {
    return roomType === 'LACTANTES_A';
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
   * Clausal delimiters for segmentation.
   * Splits text into sentences and sub-clausal units based on punctuation
   * and adversative/coordinate/temporal clausal connectors.
   */
  public static splitIntoClauses(text: string): string[] {
    if (!text || !text.trim()) return [];

    // 1. Split by major sentence and list delimiters: . \n • ; ! ?
    const rawSentences = text.split(/[.\n•;!?\r]+/);
    const clauses: string[] = [];

    // Connectors that delineate distinct actions, transitions or adversative clauses
    const clausalSplitRegex = /\b(?:pero|sin embargo|aunque|despu[eé]s(?:\s+de)?|luego|mientras|y\s+(?:luego|despu[eé]s))\b/i;

    for (const s of rawSentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(clausalSplitRegex);
      for (const part of parts) {
        const cleanPart = part.trim();
        if (cleanPart) {
          clauses.push(cleanPart);
        }
      }
    }

    return clauses;
  }

  /**
   * Deterministically evaluates whether a clause mentioning a prohibited physical object
   * represents an unequivocal preventive directive (safe) or an affirmative/ambiguous instruction (unsafe).
   *
   * Fails closed (returns false) if:
   * - There is no explicit preventive/prohibition marker governing the clause.
   * - There is an affirmative action verb directed at using or providing the object.
   * - The statement is ambiguous.
   */
  public static isProhibitedMaterialClauseSafe(clause: string, prohibitedTerm: string): boolean {
    const normClause = this.normalizeText(clause);
    const normTerm = this.normalizeText(prohibitedTerm);

    // Verify the term is actually present in this clause as a word or word root
    const termRegex = new RegExp(`\\b${normTerm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`, 'i');
    if (!termRegex.test(normClause)) {
      return true; // Not present in this specific clause
    }

    // 1. Explicit preventive/prohibition directive patterns
    const PREVENTIVE_PATTERNS = [
      /\bno\s+(se\s+)?(use|usen|usar|utili[cz](ar|e|en)|emple(ar|e|en)|coloque|coloquen|colocar|ponga|pongan|poner|ofrezca|ofrezcan|ofrecer|entregue|entreguen|entregar|proporcione|proporcionen|proporcionar|acerque|acerquen|acercar|de|den|dar|introduzca|introduzcan|introducir|lleve|lleven|llevar|tocar|toque|toquen|manipular)\b/i,
      /\bevit(ar|ando|e|en|ese)\b/i,
      /\bprohib(ir|ido|ida|idos|idas|e|en|iendo)\b/i,
      /\bfuera\s+del\s+alcance\b/i,
      /\blejos\s+del\s+alcance\b/i,
      /\blibre\s+de\b/i,
      /\b(cuidar|asegurar|asegurarse|verificar|vigilar)\s+(de\s+)?que\s+no\b/i,
      /\bno\s+permitir\s+que\b/i,
      /\bsin\s+([a-z\s]{0,15})?(semillas?|monedas?|canicas?|botones?|cordones?|cuerdas?|lazos?|mecates?|listones?|ch[ií]charos?|cuentas?|granos?|frijoles?|lentejas?|piezas?|objetos?|materiales?)\b/i,
    ];

    const hasPreventiveMarker = PREVENTIVE_PATTERNS.some(p => p.test(normClause));
    if (!hasPreventiveMarker) {
      // No preventive marker present -> Affirmative or ambiguous -> FAIL CLOSED
      return false;
    }

    // 2. Affirmative action verbs applied to objects
    // Matches verbs like: usar, utilizar, colocar, poner, ofrecer, dar, acercar, introducir, rodar, balancear, etc.
    const AFFIRMATIVE_ACTION_REGEX =
      /\b(usar|usando|usa|usen|utili[cz](ar|ando|a|an|en)|emple(ar|ando|a|an|en)|coloc(ar|ando|a|an|en)|pon(er|iendo|ga|gan)|ofrec(er|iendo|e|en|za|zan)|proporcion(ar|ando|a|an|en)|acerc(ar|ando|a|an|en)|introduc(ir|iendo|e|en|zca|zcan)|balance(ar|ando|a|an|en)|rod(ar|ando|a|an|en)|desliz(ar|ando|a|an|en)|manipul(ar|ando|a|an|en)|sujet(ar|ando|a|an|en)|agarr(ar|ando|a|an|en)|apil(ar|ando|a|an|en)|golpe(ar|ando|a|an|en))\b/gi;

    let match: RegExpExecArray | null;
    while ((match = AFFIRMATIVE_ACTION_REGEX.exec(normClause)) !== null) {
      const verbIndex = match.index;
      // Check if this verb is directly negated by preceding "no "
      const precedingText = normClause.substring(Math.max(0, verbIndex - 12), verbIndex);
      const isNegatedVerb = /\bno\s+(se\s+)?$/i.test(precedingText);

      if (!isNegatedVerb) {
        // Unnegated affirmative action verb found in the same clause -> FAIL CLOSED
        return false;
      }
    }

    return true;
  }

  // ==========================================================================
  // SR-MD-15 FASE 1.8-E — ANAPHORIC HAZARD TRACKING (known prohibited objects only)
  //
  // NOT a universal semantic parser. It only follows pronominal references (-la/-las/-lo/-los)
  // back to objects already named in the policy's prohibitedMaterials list.
  // ==========================================================================

  /** Concrete delivery/contact/use verb forms (no open stems such as a bare "d"). */
  private static readonly ANAPHORA_NONFINITE_DELIVERY_FORMS =
    'colocar|colocando|coloca|coloque|coloquen|ofrecer|ofreciendo|ofrece|ofrezca|ofrezcan|' +
    'entregar|entregando|entrega|entregue|entreguen|poner|poniendo|pon|ponga|pongan|' +
    'acercar|acercando|acerca|acerque|acerquen|introducir|introduciendo|introduce|introduzca|introduzcan|' +
    'usar|usando|usa|use|usen|utilizar|utilizando|utiliza|utilice|utilicen|' +
    'emplear|empleando|emplea|emplee|empleen|suministrar|suministrando|suministra|' +
    'facilitar|facilitando|facilita|manipular|manipulando|manipula|sujetar|sujetando|sujeta|' +
    'agarrar|agarrando|agarra|rodar|rodando|balancear|balanceando|brindar|brindando|brinda|' +
    'pasar|pasando|alcanzar|alcanzando|alcanza|dar|dando|da|de|den';

  /** Finite conjugated delivery forms usable after a proclitic pronoun ("las ofrecen"). */
  private static readonly ANAPHORA_FINITE_DELIVERY_FORMS =
    'coloca|colocan|coloque|coloquen|ofrece|ofrecen|ofrezca|ofrezcan|entrega|entregan|entregue|entreguen|' +
    'pone|ponen|ponga|pongan|acerca|acercan|acerque|acerquen|introduce|introducen|introduzca|introduzcan|' +
    'usa|usan|use|usen|utiliza|utilizan|utilice|utilicen|emplea|emplean|emplee|empleen|' +
    'brinda|brindan|pasa|pasan|da|dan|den|doy';

  /**
   * Extracts the grammatical gender of every pronoun that is the object of an affirmative
   * delivery/contact/use action in a normalized clause. Pronouns whose action is directly
   * negated ("no ofrecerlas", "sin ponerlas", "evitar darlas") are ignored.
   * Custody/removal verbs (guardar, mantener, retirar, alejar...) are intentionally absent
   * from the verb lists, so they never count as delivery.
   */
  public static extractDeliveryPronouns(normClause: string): Array<'fem' | 'masc'> {
    const enclitic = new RegExp(`\\b(?:${this.ANAPHORA_NONFINITE_DELIVERY_FORMS})(?:se)?(las|los|la|lo)\\b`, 'gi');
    const proclitic = new RegExp(`\\b(?:se\\s+)?(las|los|la|lo)\\s+(?:${this.ANAPHORA_FINITE_DELIVERY_FORMS})\\b`, 'gi');
    const found: Array<'fem' | 'masc'> = [];

    for (const re of [enclitic, proclitic]) {
      for (const m of normClause.matchAll(re)) {
        const idx = m.index ?? 0;
        const preceding = normClause.substring(Math.max(0, idx - 14), idx);
        if (/\b(no|ni|sin|evitar|evite|evitando)\s+(se\s+)?$/.test(preceding)) {
          continue; // directly negated action
        }
        found.push(m[1] === 'las' || m[1] === 'la' ? 'fem' : 'masc');
      }
    }
    return found;
  }

  /** Heuristic gender of a prohibited term; 'unknown' is treated as compatible with any pronoun. */
  private static inferTermGender(normTerm: string): 'fem' | 'masc' | 'unknown' {
    const last = normTerm.split(' ').pop() ?? '';
    if (/(a|as)$/.test(last)) return 'fem';
    if (/(o|os|on|ones|ol|oles|oz)$/.test(last)) return 'masc';
    return 'unknown';
  }

  /**
   * Conservative anaphora check over the ordered clauses of one activity.
   *
   * - Every prohibited term named in any clause becomes an antecedent that is NEVER cleared
   *   (not by custody clauses, not by other objects, not by a new sentence).
   * - Any later (or same-clause, non-negated) delivery/contact/use action whose pronoun is
   *   gender-compatible with an antecedent is a hazard; number is ignored and ambiguity
   *   between a hazardous antecedent and a legitimate object resolves to BLOCK.
   * - Each clause is judged on its own, so a later precaution cannot cancel an earlier hazard.
   */
  public static findAnaphoricHazard(
    clauses: readonly string[],
    prohibitedMaterials: readonly (string | RegExp)[]
  ): { term: string; clause: string } | null {
    const antecedents: Array<{ term: string; gender: 'fem' | 'masc' | 'unknown' }> = [];

    for (const rawClause of clauses) {
      const normClause = this.normalizeText(rawClause);

      for (const prohibited of prohibitedMaterials) {
        const term = typeof prohibited === 'string' ? prohibited : prohibited.source;
        const normTerm = typeof prohibited === 'string' ? this.normalizeText(prohibited) : '';
        const present = typeof prohibited === 'string'
          ? new RegExp(`\\b${normTerm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`, 'i').test(normClause)
          : prohibited.test(normClause);
        if (present) {
          antecedents.push({ term, gender: this.inferTermGender(normTerm) });
        }
      }

      if (antecedents.length === 0) continue;

      for (const pronounGender of this.extractDeliveryPronouns(normClause)) {
        const hit = antecedents.find(a => a.gender === 'unknown' || a.gender === pronounGender);
        if (hit) {
          return { term: hit.term, clause: rawClause };
        }
      }
    }

    return null;
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
      } else if (policy.densityPolicy.maxActivitiesPerDay && actCount > policy.densityPolicy.maxActivitiesPerDay) {
        // Technical boundary: Day cannot exceed maximum payload bound
        violations.push({
          ruleId: 'density-exceeds-technical-bound',
          severity: 'BLOCKING_SAFETY',
          message: `El día ${day.dayOfWeek} contiene ${actCount} actividades, excediendo el límite técnico de ${policy.densityPolicy.maxActivitiesPerDay} actividades por jornada.`,
          provenance: 'CANONICAL_PRODUCT_RULE',
          dayOfWeek: day.dayOfWeek,
          contextField: 'density',
          offendingValue: actCount,
          riskRationale: 'Exceder el límite técnico representa una carga anómala.'
        });
      } else if (policy.densityPolicy.targetActivitiesPerDay !== undefined && actCount < policy.densityPolicy.targetActivitiesPerDay) {
        // Optional legacy product target guidance: Warning when below explicitly configured target
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

          // Check prohibited materials mentioned in full activity text (objective, description, adaptations)
          if (rule.prohibitedMaterials) {
            const fullActRaw = `${activity.objective || ''}\n${activity.description || ''}`;
            const clauses = this.splitIntoClauses(fullActRaw);

            for (const prohibited of rule.prohibitedMaterials) {
              const termDisplay = typeof prohibited === 'string' ? prohibited : prohibited.source;
              const normProhibited = typeof prohibited === 'string' ? this.normalizeText(prohibited) : prohibited;

              for (const clause of clauses) {
                const normClause = this.normalizeText(clause);
                const matchesTerm = typeof normProhibited === 'string'
                  ? new RegExp(`\\b${normProhibited.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`, 'i').test(normClause)
                  : normProhibited.test(normClause);

                if (matchesTerm) {
                  const isSafeContext = this.isProhibitedMaterialClauseSafe(normClause, termDisplay);
                  if (!isSafeContext) {
                    const alreadyViolated = violations.some(
                      v => v.dayOfWeek === day.dayOfWeek && v.activityIndex === actIdx && v.ruleId === rule.id
                    );
                    if (!alreadyViolated) {
                      violations.push({
                        ruleId: rule.id,
                        severity: rule.severity,
                        message: `Material u objeto no permitido detectado en texto: "${termDisplay}" en ${day.dayOfWeek} (actividad ${actIdx + 1}). ${rule.description}`,
                        provenance: rule.provenance,
                        dayOfWeek: day.dayOfWeek,
                        activityIndex: actIdx,
                        contextField: 'description',
                        offendingValue: termDisplay,
                        riskRationale: rule.riskRationale
                      });
                    }
                    break;
                  }
                }
              }
            }
          }

          // SR-MD-15 Fase 1.8-E: anaphoric references (-las/-los/...) to prohibited objects named earlier.
          // Violations are irreversible: a later custody clause never cancels them.
          if (rule.prohibitedMaterials) {
            const hazard = this.findAnaphoricHazard(
              this.splitIntoClauses(`${activity.objective || ''}\n${activity.description || ''}`),
              rule.prohibitedMaterials
            );
            if (hazard) {
              const alreadyViolated = violations.some(
                v => v.dayOfWeek === day.dayOfWeek && v.activityIndex === actIdx && v.ruleId === rule.id
              );
              if (!alreadyViolated) {
                violations.push({
                  ruleId: rule.id,
                  severity: rule.severity,
                  message: `Acción afirmativa con referencia anafórica a objeto no permitido ("${hazard.term}") en ${day.dayOfWeek} (actividad ${actIdx + 1}). ${rule.description}`,
                  provenance: rule.provenance,
                  dayOfWeek: day.dayOfWeek,
                  activityIndex: actIdx,
                  contextField: 'description',
                  offendingValue: `${hazard.term} (referencia anafórica)`,
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
