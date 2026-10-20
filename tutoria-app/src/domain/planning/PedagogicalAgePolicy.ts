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
      'cuentas de ensartar',
      'cuentas de collar',
      'cuentas plásticas',
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
      'cuentas de ensartar',
      'cuentas de collar',
      'cuentas plásticas',
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
      'lazo de atar',
      'lazos de atar',
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
    'Manipulación bimanual exploratoria (sujetar, golpear suavemente, soltar, pasar de mano a mano, explorar texturas)',
    'Balbuceo imitativo, trompetillas, vocalizaciones y respuesta comunicativa ante el educador y el espejo',
    'Revisión y manipulación de cuentos plastificados o de tela y muñecos seguros',
    'Participación afectiva guiada en rutinas de aseo, cambio de ropa y guardado ordenado de materiales',
    'Exploración y manipulación libre de cubos de tela o vinil (golpear suavemente entre sí, tirar, rodar o pasar de mano a mano, sin exigir apilamiento coordinado)',
    'Contacto visual e interacción afectiva con láminas de cuentos o libros infantiles (mirar, tocar la página, balbucear, sin exigir señalamiento intencional con dedo índice)'
  ],
  excludedExpectations: [
    'Marcha erguida independiente obligatoria o en formación grupal',
    'Uso de herramientas de corte (tijeras) o manipulación de masas no ingeribles',
    'Control voluntario de esfínteres',
    'Comprensión o ejecución de consignas conceptuales o narrativas complejas',
    'Exigencia motriz de apilamiento coordinado de cubos o torres',
    'Exigencia de señalamiento fino con dedo índice hacia ilustraciones como condición obligatoria de respuesta',
    'Permanecer sentados por lapsos prolongados sin cambio postural',
    'Imposición forzada de la postura sentada o uso artificial de apoyos/cojines para mantener la sedestación en lugar de permitir la movilidad espontánea y posturas libres (prono, supino o arrastre)',
    'Recomendación universal de cojines o aditamentos de soporte postural',
    'Asambleas verbales, diálogos reflexivos o cierres discursivos («hablar sobre lo que han visto») inadecuados para lactantes'
  ],
  excludedActionPatterns: [
    /\btijeras?\b/i,
    /\bmold(ear|eado)\s+(plastilina|arcilla|masa)\b/i,
    /\bcontrol\s+de\s+esf[íi]nteres\b/i,
    /\b(exigir|obligar|pedir\s+que|deben?).*?\b(apilar|hacer\s+torres?\b|construir\s+torres?\b|formar\s+torres?\b).*?\bcubos?\b/i,
    /\b(exigir|obligar|deben?|condici[oó]n\s+obligatoria).*?\b(se[ñn]al(ar|e|en)|apunt(ar|e|en))\b.*?\b(dedo\s+[íi]ndice|im[áa]genes?|ilustraciones?|figuras?|personajes?|l[áa]minas?)\b/i,
    /\b(apoyo|sost[eé]n|sujeci[oó]n|cojines?)\b.*?\bpara\s+mantener\s+(la\s+)?(posici[oó]n|postura)\s+sentada\b/i,
    /\bmantener\s+(la\s+)?(posici[oó]n|postura)\s+sentada\s+(con\s+apoyo|con\s+cojines|forzad(a|amente))\b/i,
    /\bforzar\s+(la\s+)?(sedestaci[oó]n|posici[oó]n\s+sentada)\b/i
  ],
  rationale:
    'La atención en Lactantes B estimula el movimiento libre y gradual, la interacción comunicativa y los hábitos formativos respetando el ritmo individual de cada infante, sin forzar apilamiento de objetos, señalamiento rígido ni marchas erguidas.'
});

/**
 * Approved safe daycare classroom fixtures and ambient containers/surfaces for Lactantes B.
 */
export const LACTANTES_B_APPROVED_ROOM_FIXTURES: readonly string[] = Object.freeze([
  'colchoneta',
  'colchonetas',
  'colchoneta firme',
  'colchonetas suaves',
  'tapete',
  'tapetes',
  'tapetes suaves',
  'tapete acolchado',
  'tapete de estimulación',
  'superficie acolchada',
  'suelo acolchado',
  'piso firme',
  'alfombra de estimulación',
  'suelo',
  'espejo seguro',
  'espejos seguros',
  'canasta',
  'canastas',
  'caja',
  'cajas',
  'cesto',
  'cestos',
  'recipiente',
  'recipientes',
  'tina',
  'tinas',
  'mesa baja',
  'mesa infantil',
  'silla infantil',
  'cojín',
  'cojines',
  'almohadón',
  'cuna',
  'banco bajo'
]);

export const LACTANTES_B_MATERIAL_POLICY: PedagogicalMaterialPolicy = Object.freeze({
  strictEnclosure: true,
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
// CANONICAL POLICY DEFINITION: LACTANTES C (13–18 MONTHS)
// ============================================================================

export const LACTANTES_C_SAFETY_RULES: readonly PedagogicalSafetyRule[] = Object.freeze([
  {
    id: 'safe-lactantes-c-suffocation-head-covering',
    name: 'Peligro de sofocación por cubrir cabeza o rostro con telas',
    description: 'Prohíbe cubrir la cabeza, rostro o vías respiratorias del lactante con sábanas, telas o prendas.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'MASTER_ARB_TEMPORARY_SAFETY_RULE',
    prohibitedActionPatterns: [
      /\bcubr(ir|as|an|e|iendo)\b.*?\b(cabeza|rostro|cara)\b/i,
      /\btap(ar|as|an|e|ando)\b.*?\b(cabeza|rostro|cara)\b/i,
      /\bcabeza\s+de\s+un\s+(beb[ée]|lactante|niño)\s+adentro\b/i
    ],
    riskRationale:
      'Cubrir la cabeza o vías respiratorias de un lactante de 13 a 18 meses genera riesgo inminente de sofocación transitoria, hipoxia y angustia extrema.'
  },
  {
    id: 'safe-lactantes-c-forced-limb-traction',
    name: 'Peligro de tracción o levantamiento forzado de extremidades',
    description: 'Prohíbe jalar, traccionar o incorporar bruscamente al lactante por brazos o muñecas.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedActionPatterns: [
      /\b(jal(ar|as|a|es|en|on|ón|ando)|tir(ar|as|a|es|en|on|ón|ando|ones))\b.*?\b(brazos?|manos?|mu[ñn]ecas?|piernas?|tobillos?|extremidades?)\b/i,
      /\btracci[oó]n\s+forzada\b/i,
      /\blevant(ar|es|en|ando)\s+(al\s+beb[ée]|al\s+lactante|al\s+niño)?\s*(del\s+suelo|de\s+la\s+colchoneta)?\s*por\s+los\s+brazos\b/i,
      /\b(jal(ar|as|a|es|en|on|ón|ando)|tir(ar|as|a|es|en|on|ón|ando))\s+hacia\s+arriba\b/i
    ],
    riskRationale:
      'La tracción intempestiva sobre extremidades superiores puede provocar subluxación de la cabeza del radio (pronación dolorosa o codo de niñera) o lesiones ligamentosas.'
  },
  {
    id: 'safe-lactantes-c-choking-small-parts',
    name: 'Peligro de asfixia o aspiración por objetos pequeños desprendibles',
    description: 'Prohíbe semillas, cuentas, canicas u objetos desprendibles menores que presenten peligro de asfixia en lactantes de 13 a 18 meses.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedMaterials: [
      'semilla',
      'semillas',
      'frijol',
      'frijoles',
      'arroz',
      'cuentas de ensartar',
      'cuentas de collar',
      'cuentas plásticas',
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
      'maíz',
      'maíces',
      'garbanzo',
      'garbanzos',
      'clip',
      'clips',
      'alfiler',
      'alfileres'
    ],
    riskRationale:
      'A los 13 a 18 meses persiste la conducta de exploración oral activa; objetos pequeños o desprendibles representan riesgo de asfixia por aspiración o atragantamiento.'
  },
  {
    id: 'safe-lactantes-c-plastic-bags-balloons',
    name: 'Peligro de asfixia por bolsas plásticas o globos',
    description: 'Prohíbe bolsas de plástico, globos de látex o membranas flexibles que puedan adherirse a la boca o nariz.',
    severity: 'BLOCKING_SAFETY',
    provenance: 'PEDAGOGICAL_SAFETY_BASELINE',
    prohibitedMaterials: [
      'bolsa de plástico',
      'bolsas de plástico',
      'bolsa plástica',
      'bolsas plásticas',
      'globo de látex',
      'globos de látex',
      'globo',
      'globos'
    ],
    riskRationale:
      'Las películas plásticas y globos de látex se adhieren con facilidad a la orofaringe y vías respiratorias, impidiendo la respiración de forma súbita.'
  }
]);

export const LACTANTES_C_DEVELOPMENTAL_RULE: PedagogicalDevelopmentalRule = Object.freeze({
  id: 'dev-lactantes-c-milestones',
  name: 'Hitos del desarrollo y capacidades para Lactantes C (13 a 18 meses)',
  description:
    'Establece las capacidades esperadas y expectativas excluidas para lactantes de 13 a 18 meses conforme a los lineamientos pedagógicos institucionales IMSS.',
  severity: 'DEVELOPMENTAL_MISMATCH',
  provenance: 'CANONICAL_PRODUCT_RULE',
  supportedCapabilities: [
    'marcha independiente inicial o con apoyo seguro',
    'desplazamiento activo por la sala y exploración de espacios',
    'agacharse y ponerse de pie con autonomía creciente',
    'empujar y jalar objetos grandes o cajas livianas',
    'prensión en pinza fina y manipulación bimanual',
    'apilamiento simple de 2 a 3 cubos o bloques',
    'meter, sacar, llenar y vaciar recipientes seguros',
    'hojear libros con páginas gruesas o de cartón',
    'primeras palabras con significado y jerga expresiva con entonación',
    'señalamiento con dedo índice para compartir atención o pedir objetos',
    'comprensión de indicaciones sencillas de una sola acción',
    'juego imitativo funcional y juego paralelo junto a pares',
    'escucha atenta de lectura en voz alta y rimas cantadas con gestos'
  ],
  excludedExpectations: [
    'marcha forzada o exigencia de caminar sin respetar pausas o gateo espontáneo',
    'saltos con ambos pies o brincos continuos, inadecuados para la etapa de marcha inicial (13 a 18 meses)',
    'imposición de posturas fijas o forzar la bipedestación cuando el niño prefiere descansar o gatear',
    'trazos, letras, números abstractos o escolarización temprana formal',
    'asambleas verbales reflexivas o preguntas metacognitivas discursivas',
    'sedestación prolongada o inmovilidad obligatoria',
    'inmovilización forzada o restricción del movimiento libre'
  ],
  excludedActionPatterns: [
    /\b(?:saltar|brincar)\s+(?:con\s+ambos\s+pies|en\s+dos\s+pies|de\s+(?:un\s+)?escal[oó]n|hacia\s+abajo)\b/i,
    /\b(?:pedir|pide|piden|animar|anima|animan|exigir|exige|exigen|invitar|invita|invitan|hacer|hace|hacen)\b.*?\b(?:saltar|brincar)\b/i,
    /\b(pedir|exigir|solicitar)\b.*?\b(trazar|escribir|colorear\s+sin\s+salirse|hacer\s+letras)\b/i,
    /\b(aprender|identificar)\b.*?\b(letras|abecedario|n[uú]meros\s+escritos)\b/i,
    /\b(asamblea|c[ií]rculo)\s+de\s+(discusi[oó]n|debate|reflexi[oó]n|conversaci[oó]n)\b/i
  ],
  rationale:
    'Lactantes de 13 a 18 meses consolidan la marcha y la exploración activa del entorno. No poseen lenguaje discursivo ni motricidad gráfica formal, por lo que las actividades deben centrarse en el juego libre, movimiento, exploración sensorial y sostenimiento afectivo.'
});

export const LACTANTES_C_APPROVED_ROOM_FIXTURES: readonly string[] = Object.freeze([
  'colchoneta de sala',
  'colchonetas de sala',
  'colchoneta',
  'colchonetas',
  'tapete',
  'tapete de gateo',
  'tapetes',
  'espejo fijo irrompible a nivel de suelo',
  'espejo irrompible',
  'espejo de sala',
  'barra de apoyo',
  'módulos psicomotrices de espuma',
  'módulo de espuma',
  'mueble bajo estable',
  'muebles bajos de sala'
]);

export const LACTANTES_C_MATERIAL_POLICY: PedagogicalMaterialPolicy = Object.freeze({
  strictEnclosure: true,
  approvedRoomFixtures: [],
  prohibitedMaterialCategories: [
    'semillas o partes pequeñas',
    'compuestos de modelado o plastilina no comestible',
    'tijeras',
    'objetos punzocortantes',
    'sábanas o telas sobre la cabeza',
    'globos de látex',
    'bolsas plásticas'
  ],
  provenance: 'CANONICAL_PRODUCT_RULE'
});

export const LACTANTES_C_DENSITY_POLICY: WeeklyPlanningDensityPolicy = LACTANTES_A_DENSITY_POLICY;

export const LACTANTES_C_AGE_POLICY: PedagogicalAgePolicy = Object.freeze({
  roomType: 'LACTANTES_C',
  label: 'Lactantes C (13 a 18 meses)',
  minAgeMonths: 13,
  maxAgeMonths: 18,
  recommendedMaxDurationMinutes: 20,
  safetyRules: LACTANTES_C_SAFETY_RULES,
  developmentalRule: LACTANTES_C_DEVELOPMENTAL_RULE,
  materialPolicy: LACTANTES_C_MATERIAL_POLICY,
  densityPolicy: LACTANTES_C_DENSITY_POLICY,
  provenance: 'CANONICAL_PRODUCT_RULE'
});

// ============================================================================
// POLICY CATALOG
// ============================================================================

export class PedagogicalAgePolicyCatalog {
  private static readonly policies: readonly PedagogicalAgePolicy[] = Object.freeze([
    LACTANTES_A_AGE_POLICY,
    LACTANTES_B_AGE_POLICY,
    LACTANTES_C_AGE_POLICY
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

    // Exact match for 13–18 months -> Lactantes C (SR-MD-25)
    if (room.minAgeMonths >= 13 && room.maxAgeMonths <= 18) {
      return LACTANTES_C_AGE_POLICY;
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
      if (normalizedName.includes('lactantes c') || normalizedName === 'lactantes-c') {
        return LACTANTES_C_AGE_POLICY;
      }
    }

    return undefined;
  }

  /**
   * Authoritative policy gate controlling AI proposal generation.
   * Only room profiles with formal institutional pedagogical approval are authorized for AI.
   * Lactantes A: Authorized (First Light LAB).
   * Lactantes B: Authorized under SR-MD-22 (7–12 months).
   * Lactantes C: Authorized under SR-MD-25 (13–18 months).
   * All other rooms: Strictly NOT authorized pending institutional validation.
   */
  public static isAiGenerationAuthorized(roomType: string): boolean {
    return (
      roomType === 'LACTANTES_A' ||
      roomType === 'LACTANTES_B' ||
      roomType === 'LACTANTES_C'
    );
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
   * Cleans and normalizes a single candidate material clause, preserving proper titles,
   * accents, and punctuation, while removing leading narrative markers, trailing instructional
   * fluff, and non-physical caregiver mediation.
   */
  public static cleanMaterialItem(raw: string): string | null {
    let s = raw.trim();
    if (!s) return null;

    // Check for Spot book specifically: preserve canonical IMSS title with author
    if (/donde\s+esta\s+spot|\bd[oó]nde\s+est[aá]\s+spot\b/i.test(s)) {
      return 'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill';
    }

    // Remove leading narrative markers / determiners
    s = s.replace(
      /^(?:(?:[yye]\s+)?(?:únicamente|unicamente|solo|solamente|materiales?\s*(?::)?|recursos?\s*(?::)?|se\s+dispone\s+de(?:l)?\s+|se\s+cuenta\s+con\s+|contamos\s+con\s+|disponemos\s+de\s+|tenemos\s+|el\s+|la\s+|los\s+|las\s+|un\s+|una\s+|unos\s+|unas\s+))\s*/i,
      ''
    );

    // Strip trailing descriptors/clauses that start with comma or preposition
    s = s.replace(/,\s*(?:con\s+im[áa]genes|manipulados?|seguras?|autorizadas?|[íi]ntegros?|apropiados?).*$/i, '');
    s = s.replace(
      /\s+(?:para\s+la\s+lectura\s+diaria(?:\s+se\s+dispone\s+del?)?|para\s+beb[ée]s(?:\s+menores\s+de\s+[^,;.]+)?|apropiados?\s+para\s+[^,;.]+|manipulados?\s+por\s+la\s+educadora|autorizadas?\s+para\s+actividades\s+supervisadas|seguras?\s+y\s+apropiadas?\s+para\s+la\s+edad|de\s+una\s+sola\s+pieza|[íi]ntegros?\s+y\s+sin\s+componentes\s+desprendibles|con\s+im[áa]genes\s+grandes\s+y\s+contrastantes|con\s+ilustraciones\s+sencillas|lavables\s+apropiados\s+para\s+[^,;.]+).*$/i,
      ''
    );

    // Filter out caregiver voice / non-physical mediation (songs, rhymes, vocal interaction)
    if (/^(?:(?:la\s+)?voz\s+de\s+la\s+(?:educadora|asistente)|narraciones|comunicaci[oó]n\s+afectiva|cuentos\s+breves|rimas)\b/i.test(s)) {
      return null;
    }

    // Filter out standalone descriptors that slipped through
    if (/^(?:con\s+im[áa]genes|manipulados?|seguras?|autorizadas?|[íi]ntegros?|apropiados?|de\s+una\s+sola)\b/i.test(s)) {
      return null;
    }

    // Filter out narrative safety/cleanliness statements or guidelines that slipped through as materials
    if (/^(?:todos\s+los\s+materiales|materiales\s+limpios|en\s+buen\s+estado|sin\s+piezas\s+pequeñas|sin\s+piezas\s+desprendibles|sin\s+objetos\s+pequeños|libres?\s+de\s+piezas|para\s+manipulaci[oó]n\s+supervisada|bajo\s+supervisi[oó]n)\b/i.test(s)) {
      return null;
    }

    s = s.trim();
    if (!s || s.length < 3) return null;
    return s.toLowerCase();
  }

  /**
   * Extracts individual normalized material names from educator-supplied text.
   * Strips narrative framing, splits coordinated materials, and preserves proper names/titles.
   */
  public static parseAvailableMaterialsList(rawContext?: string): string[] {
    if (!rawContext || !rawContext.trim()) return [];

    // First split by sentence end, semicolon, newline, bullets, or narrative transitions
    const majorSplit = /[\n•\r;]+|\.(?:\s+|$)|(?<=[^,;])\b(?:para\s+la\s+lectura\s+diaria(?:\s+se\s+dispone\s+del?|\s+contamos\s+con)?|se\s+dispone\s+del?|se\s+cuenta\s+(?:tambi[eé]n\s+)?con|adem[áa]s\s+de)\b/i;

    const rawSegments = rawContext.split(majorSplit);
    const result: string[] = [];
    const seen = new Set<string>();

    for (const seg of rawSegments) {
      if (!seg.trim()) continue;
      // Sub-split by commas or conjunctions 'y'/'e' when joining distinct material nouns
      const subSplitRegex = /,|\s+(?:y|e)\s+(?=(?:libros?|pelotas?|cubos?|sonajas?|telas?|colchonetas?|mu[ñn]ecos?|espejos?|tapetes?|juguetes?|cojines?|pa[ñn]uelos?|instrumentos?)\b)/i;
      const subParts = seg.split(subSplitRegex);
      for (const part of subParts) {
        // If part starts with author attribution (e.g. "de Eric Hill") and previous item was a book/title, join them
        if (/^\s*de\s+[A-Z]/i.test(part) && result.length > 0) {
          const prevIdx = result.length - 1;
          const cleanedAuthor = part.trim();
          if (!result[prevIdx].toLowerCase().includes(cleanedAuthor.toLowerCase())) {
            result[prevIdx] = `${result[prevIdx]}, ${cleanedAuthor}`;
          }
          continue;
        }
        const item = this.cleanMaterialItem(part);
        if (item) {
          const key = item.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
          }
        }
      }
    }

    return result;
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

    // Check direct or partial match with approved room fixtures and safe ambient surfaces/containers
    const allFixtures = [
      ...approvedFixtures,
      ...LACTANTES_B_APPROVED_ROOM_FIXTURES
    ];
    for (const fixture of allFixtures) {
      const normFix = this.normalizeText(fixture);
      if (normalized === normFix || normalized.includes(normFix) || normFix.includes(normalized)) {
        return true;
      }
    }

    // Check direct or partial match with educator-supplied materials
    for (const avail of availableMaterials) {
      if (!avail) continue;
      const normAvail = this.normalizeText(avail);
      if (normalized === normAvail || normalized.includes(normAvail) || normAvail.includes(normalized)) {
        return true;
      }
      // Lexical variation / head noun matching: (e.g. pelotas vs pelotas suaves, cubos vs cubos de tela)
      const normAvailTokens = normAvail.split(/\s+/).filter(t => t.length >= 3);
      const normalizedTokens = normalized.split(/\s+/).filter(t => t.length >= 3);
      const sharesKeyNoun = normAvailTokens.some(t =>
        normalizedTokens.some(nt => nt.startsWith(t) || t.startsWith(nt))
      );
      if (sharesKeyNoun) {
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
    const escapedTerm = normTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Verify the term is actually present in this clause as a distinct word or plural
    const termRegex = new RegExp(`\\b${escapedTerm}(?:s|es)?\\b`, 'i');
    if (!termRegex.test(normClause)) {
      return true; // Not present in this specific clause
    }

    // Common idiomatic pedagogical non-material phrases that use these words harmlessly
    if (
      /\b(?:lazos?\s+(?:afectivos?|de\s+afecto|de\s+apego|de\s+confianza|emocionales?))\b/i.test(normClause) ||
      /\b(?:tomar\s+en\s+cuenta|tomando\s+en\s+cuenta|toma\s+en\s+cuenta|en\s+cuenta|darse\s+cuenta|se\s+da\s+cuenta|se\s+cuenta\s+con|cuenta\s+un\s+cuento|cuenta\s+cuentos|cuenta\s+historias|cuenta\s+relatos)\b/i.test(normClause)
    ) {
      return true;
    }

    // 1. Direct explicit preventive/prohibition directive patterns governing this prohibited term
    const directPreventiveRegex = new RegExp(
      `(?:` +
        `\\b(?:sin|libres?\\s+de|evit(?:ar|ando|e|en|ese)(?:\\s+(?:el\\s+uso\\s+de|usar|utilizar))?|prohib(?:ir|ido|ida|idos|idas|e|en|iendo)|fuera\\s+del\\s+alcance|lejos\\s+del\\s+alcance)\\s+(?:[a-záéíóúñ]+\\s+){0,4}` +
        `|` +
        `\\b(?:cuidar|cuidando|cuide|cuiden|asegurar|asegurando|asegure|aseguren|verificar|verificando|verifique|verifiquen|vigilar|vigilando|vigile|vigilen)\\s+(?:de\\s+)?que\\s+no(?:\\s+(?:haya|tengan?|contengan?|existan?|se\\s+use[n]?|se\\s+utilice[n]?))?\\s+(?:[a-záéíóúñ]+\\s+){0,4}` +
        `|` +
        `\\bno\\s+(?:se\\s+)?(?:use|usen|usar|utilice|utilicen|utilizar|coloque|coloquen|colocar|ponga|pongan|poner|ofrezca|ofrezcan|ofrecer|entregue|entreguen|entregar|proporcione|proporcionen|proporcionar|acerque|acerquen|acercar|de|den|dar|introduzca|introduzcan|introducir|lleve|lleven|llevar|tocar|toque|toquen|manipular)\\s+(?:[a-záéíóúñ]+\\s+){0,4}` +
      `)\\b${escapedTerm}(?:s|es)?\\b`,
      'i'
    );

    if (directPreventiveRegex.test(normClause)) {
      return true;
    }

    // 2. Coordinate negative patterns: "sin X ni Y", "evitar X o Y", "cuidando que no haya X ni Y"
    const coordinatePreventiveRegex = new RegExp(
      `(?:` +
        `\\b(?:sin|libres?\\s+de|evit(?:ar|ando|e|en|ese)|prohib(?:ir|ido|ida|idos|idas|e|en|iendo)|fuera\\s+del\\s+alcance|lejos\\s+del\\s+alcance|(?:cuidar|cuidando|cuide|cuiden|asegurar|asegurando|asegure|aseguren|verificar|verificando|verifique|verifiquen|vigilar|vigilando|vigile|vigilen)\\s+(?:de\\s+)?que\\s+no(?:\\s+(?:haya|tengan?|contengan?|existan?))?)\\s+` +
        `[^.;:!?\\n]{1,60}` +
        `\\b(?:ni|o|tampoco)\\s+(?:[a-záéíóúñ]+\\s+){0,3}` +
      `)\\b${escapedTerm}(?:s|es)?\\b`,
      'i'
    );

    if (coordinatePreventiveRegex.test(normClause)) {
      return true;
    }

    // 3. If an affirmative delivery verb directly targets the prohibited term, FAIL CLOSED
    const directAffirmativeRegex = new RegExp(
      `\\b(?:usar|utili[cz](ar|ando|a|an|en)|emple(ar|ando|a|an|en)|coloc(ar|ando|a|an|en)|pon(er|iendo|ga|gan)|ofrec(er|iendo|e|en|za|zan)|proporcion(ar|ando|a|an|en)|acerc(ar|ando|a|an|en)|introduc(ir|iendo|e|en|zca|zcan)|dar|den|de|dando|entreg(ar|ando|a|an|en)|facilit(ar|ando|a|an|en)|suministr(ar|ando|a|an|en))\\s+(?:(?:algun[ao]s?|l[ao]s?|est[ao]s?|much[ao]s?)\\s+)?(?:[a-záéíóúñ]+\\s+){0,2}\\b${escapedTerm}(?:s|es)?\\b`,
      'i'
    );

    if (directAffirmativeRegex.test(normClause)) {
      return false;
    }

    // 4. Fallback check for general preventive directive in the clause
    const PREVENTIVE_PATTERNS = [
      /\bno\s+(se\s+)?(use|usen|usar|utili[cz](ar|e|en)|emple(ar|e|en)|coloque|coloquen|colocar|ponga|pongan|poner|ofrezca|ofrezcan|ofrecer|entregue|entreguen|entregar|proporcione|proporcionen|proporcionar|acerque|acerquen|acercar|de|den|dar|introduzca|introduzcan|introducir|lleve|lleven|llevar|tocar|toque|toquen|manipular)\b/i,
      /\bevit(ar|ando|e|en|ese)(\s+(el\s+uso\s+de|utilizar|usar))?\b/i,
      /\bprohib(ir|ido|ida|idos|idas|e|en|iendo)\b/i,
      /\bfuera\s+del\s+alcance\b/i,
      /\blejos\s+del\s+alcance\b/i,
      /\blibres?\s+de\b/i,
      /\b(?:cuidar|cuidando|cuide|cuiden|asegurar|asegurando|asegure|aseguren|verificar|verificando|verifique|verifiquen|vigilar|vigilando|vigile|vigilen)\s+(?:de\s+)?que\s+no\b/i,
      /\bno\s+permitir\s+que\b/i,
      /\bsin\s+([a-z\s]{0,25})?(semillas?|monedas?|canicas?|botones?|cordones?|cuerdas?|lazos?|mecates?|listones?|ch[ií]charos?|cuentas?|granos?|frijoles?|lentejas?|piezas?|partes?|objetos?|materiales?)\b/i,
      /\bevit(?:ar|ando|e|en|ese)\s+([a-z\s]{0,25})?(piezas?\s+(?:pequeñas?|diminutas?|desprendibles?)|objetos?\s+(?:pequeños?|desprendibles?)|semillas?|canicas?|botones?)\b/i,
    ];

    const hasPreventiveMarker = PREVENTIVE_PATTERNS.some(p => p.test(normClause));
    if (!hasPreventiveMarker) {
      // No preventive marker present -> Affirmative or ambiguous -> FAIL CLOSED
      return false;
    }

    return true;
  }

  /**
   * Deterministically evaluates whether a clause matching a prohibited action pattern
   * represents an unequivocal preventive/negative directive (safe) or an affirmative dangerous instruction (unsafe).
   *
   * MASTER ARB RULE (SR-MD-22F):
   * Prohibitions must apply to actions effectively proposed, NOT to the presence of words
   * inside explicit preventive warnings or negations (e.g. "sin cubrir el rostro", "evitando tapar la cara").
   *
   * FAILS CLOSED: Returns false (unsafe / violation) if:
   * - The pattern matches, and there is NO explicit preceding preventive/negative marker.
   * - The negative marker is distant or ambiguous.
   * - An affirmative modal or auxiliary verb indicates intentional execution ("vamos a cubrir...", "proceder a tapar...").
   */
  public static isProhibitedActionClauseSafe(clause: string, pattern: RegExp): boolean {
    if (!clause || !pattern) return true;

    // Construct a global regex instance to inspect EVERY occurrence within the clause
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const regex = new RegExp(pattern.source, flags);

    const PREVENTIVE_PATTERNS = [
      /\b(?:sin|no|no\s+se|no\s+debe|no\s+deben|no\s+permitir|no\s+permitir\s+que|evit(?:ar|ando|e|en|ese)|prohib(?:ir|ido|ida|idos|idas|e|en)|cuid(?:ar|ando|e|en)(?:\s+de)?\s+que\s+no|asegur(?:ar|ando|ese|arse)(?:\s+de)?\s+que\s+no|vigil(?:ar|ando|e|en)(?:\s+de)?\s+que\s+no|nunca|jam[aá]s)\b/i,
      /(?<![a-záéíóúñ])ni(?![a-záéíóúñ])/i
    ];

    let match: RegExpExecArray | null;

    while ((match = regex.exec(clause)) !== null) {
      const matchIndex = match.index;
      const windowStart = Math.max(0, matchIndex - 60);
      const rawPreceding = clause.substring(windowStart, matchIndex);

      // If an adversative or clause delimiter (comma, semicolon, colon, or ' y ', 'pero', 'después', 'luego')
      // separates a distant negative marker from our verb, the negation does not govern our verb.
      // (Note: 'ni' explicitly coordinates negative verbs, e.g. 'sin cubrir el rostro ni tapar...').
      const parts = rawPreceding.split(/[,;:|•\n]|\b(?:y|pero|luego|despu[eé]s)\b/i);
      const immediateWindow = parts[parts.length - 1];

      const hasPreventiveMarker = PREVENTIVE_PATTERNS.some(p => p.test(immediateWindow));
      if (!hasPreventiveMarker) {
        // Any match lacking an immediate preceding preventive marker is an affirmative violation -> FAIL CLOSED
        return false;
      }

      // Affirmative indicator check: Ensure the verb in the match is not governed by affirmative execution markers
      // e.g. "vamos a cubrir...", "se procede a tapar...", "debe cubrir..."
      if (
        /\b(?:vamos\s+a|se\s+procede\s+a|procede\s+a|proceder\s+a|invitar\s+a|debe|deben|procedemos\s+a)\s+$/i.test(
          immediateWindow.trim()
        )
      ) {
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
          ? new RegExp(`\\b${normTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(normClause)
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
    rawAvailableMaterials?: string,
    options?: {
      requirePedagogicalStructure?: boolean;
      checkPedagogicalVariation?: boolean;
    }
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
                  ? new RegExp(`\\b${normProhibited.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es)?\\b`, 'i').test(normClause)
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
            const fullActRaw = `${activity.objective || ''}\n${activity.description || ''}`;
            const clauses = this.splitIntoClauses(fullActRaw);

            for (const pattern of rule.prohibitedActionPatterns) {
              if (pattern.test(fullActRaw)) {
                let isClauseViolated = false;
                let matchingClauseCount = 0;

                for (const clause of clauses) {
                  if (pattern.test(clause)) {
                    matchingClauseCount++;
                    const isSafe = this.isProhibitedActionClauseSafe(clause, pattern);
                    if (!isSafe) {
                      isClauseViolated = true;
                      break;
                    }
                  }
                }

                if (isClauseViolated || (matchingClauseCount === 0 && !this.isProhibitedActionClauseSafe(fullActRaw, pattern))) {
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
        }

        // C. Developmental Rules Check
        if (policy.developmentalRule.excludedActionPatterns) {
          const fullActRaw = `${activity.objective || ''}\n${activity.description || ''}`;
          const clauses = this.splitIntoClauses(fullActRaw);

          for (const pattern of policy.developmentalRule.excludedActionPatterns) {
            if (pattern.test(fullActRaw)) {
              let isClauseViolated = false;
              let matchingClauseCount = 0;

              for (const clause of clauses) {
                if (pattern.test(clause)) {
                  matchingClauseCount++;
                  const isSafe = this.isProhibitedActionClauseSafe(clause, pattern);
                  if (!isSafe) {
                    isClauseViolated = true;
                    break;
                  }
                }
              }

              if (isClauseViolated || (matchingClauseCount === 0 && !this.isProhibitedActionClauseSafe(fullActRaw, pattern))) {
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
        }

        // D. Material Enclosure Check (against educator-supplied list + approved room fixtures)
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
                message: `El material "${mat}" en ${day.dayOfWeek} (actividad ${actIdx + 1}) no se encuentra en los materiales disponibles indicados por la educadora ni en el mobiliario autorizado.`,
                provenance: policy.materialPolicy.provenance,
                dayOfWeek: day.dayOfWeek,
                activityIndex: actIdx,
                contextField: 'materials',
                offendingValue: mat,
                riskRationale:
                  'La propuesta generada por IA debe ceñirse preferentemente a los recursos disponibles de la educadora para evitar necesidad de compra no prevista.'
              });
            }
          }
        }

        // D2. Contextual Material Demand Check (SR-MD-22J Requirement J1 & SR-MD-22K & SR-MD-23J)
        // Detects when an activity demands manipulative containers/apparatus or undeclared fixtures not available in context nor in activity materials
        // Distinguishes affirmative demands from preventive warnings or negations (e.g. "evitar meter en recipientes", "sin colocar sobre mesas")
        if (policy.materialPolicy.strictEnclosure) {
          const desc = activity.description || '';
          const clauses = this.splitIntoClauses(desc);
          const containerPattern = /\b(introducir|extraer|meter|sacar|depositar|colocar|poner|guardar)\b.*?\b(?:en|de|dentro\s+de)\b.*?\b(recipientes?|canastas?|cajas?|cestos?|tinas?|palanganas?|cubetas?)\b/i;

          for (const clause of clauses) {
            const containerMatch = clause.match(containerPattern);
            if (containerMatch) {
              const isPreventiveWarning = this.isProhibitedActionClauseSafe(clause, containerPattern);
              if (!isPreventiveWarning) {
                const containerNoun = containerMatch[2].toLowerCase();
                const normRoot = this.normalizeText(containerNoun).replace(/s$/, '');
                const isNounAvailable = parsedAvailable.some(avail =>
                  this.normalizeText(avail).includes(normRoot)
                ) || (activity.materials || []).some(m =>
                  this.normalizeText(m).includes(normRoot)
                ) || policy.materialPolicy.approvedRoomFixtures.some(fix =>
                  this.normalizeText(fix).includes(normRoot)
                );

                if (!isNounAvailable) {
                  violations.push({
                    ruleId: 'material-undeclared-container-resource',
                    severity: 'BLOCKING_MATERIAL',
                    message: `La actividad ${actIdx + 1} del ${day.dayOfWeek} menciona recipientes o contenedores ("${containerNoun}") que no se encuentran en los materiales disponibles indicados por la educadora ni en la lista de materiales de la actividad.`,
                    provenance: policy.materialPolicy.provenance,
                    dayOfWeek: day.dayOfWeek,
                    activityIndex: actIdx,
                    contextField: 'description',
                    offendingValue: containerNoun,
                    riskRationale: 'Proponer acciones con recursos no disponibles genera frustración e inviabilidad operativa en la sala.'
                  });
                  break;
                }
              }
            }
          }

          // Contextual check for undeclared furniture / support fixtures (e.g. mesa infantil, silla)
          const fixturePattern = /\b(ofrecer|colocar|poner|apoyar|subir|acomodar)\b.*?\b(?:sobre|en)\b.*?\b(mesas?\s+(?:infantil(?:es)?|bajas?|de\s+trabajo)?|sillas?|periqueras?|bancos?)\b/i;
          for (const clause of clauses) {
            const fixtureMatch = clause.match(fixturePattern);
            if (fixtureMatch) {
              const isPreventiveWarning = this.isProhibitedActionClauseSafe(clause, fixturePattern);
              if (!isPreventiveWarning) {
                const fixtureNoun = fixtureMatch[2].toLowerCase();
                const normRootFixture = this.normalizeText(fixtureNoun).replace(/s$/, '');
                const isFixtureAvailable = policy.materialPolicy.approvedRoomFixtures.some(fix =>
                  this.normalizeText(fix).includes(normRootFixture)
                ) || parsedAvailable.some(avail =>
                  this.normalizeText(avail).includes(normRootFixture)
                ) || (activity.materials || []).some(m =>
                  this.normalizeText(m).includes(normRootFixture)
                );

                if (!isFixtureAvailable) {
                  violations.push({
                    ruleId: 'material-undeclared-fixture-resource',
                    severity: 'BLOCKING_MATERIAL',
                    message: `La actividad ${actIdx + 1} del ${day.dayOfWeek} menciona mobiliario o soporte ("${fixtureNoun}") no incluido en el equipamiento autorizado de la sala ni en los materiales disponibles.`,
                    provenance: policy.materialPolicy.provenance,
                    dayOfWeek: day.dayOfWeek,
                    activityIndex: actIdx,
                    contextField: 'description',
                    offendingValue: fixtureNoun,
                    riskRationale: 'El uso de mobiliario o superficies no aprobadas para lactantes compromete la seguridad y la ergonomía del aula.'
                  });
                  break;
                }
              }
            }
          }
        }

        // E. Room-Specific Pedagogical Structure Check (SR-MD-22H Section 5 & SR-MD-22J & SR-MD-23J & SR-MD-25)
        // Missing sections or dialogical closures are classified as NIVEL AMARILLO (WARNING) for Lactantes B & C.
        if (options?.requirePedagogicalStructure && (policy.roomType === 'LACTANTES_B' || policy.roomType === 'LACTANTES_C')) {
          const desc = activity.description || '';
          const hasInicio = /\bInicio\b/i.test(desc);
          const hasDesarrollo = /\bDesarrollo\b/i.test(desc);
          const hasCierre = /\bCierre\b/i.test(desc);
          const hasAdaptaciones = /\b(?:Adaptaci[oó]n(?:es)?|Adecuaci[oó]n(?:es)?)\b/i.test(desc);

          if (!hasInicio || !hasDesarrollo || !hasCierre || !hasAdaptaciones) {
            const missing: string[] = [];
            if (!hasInicio) missing.push('Inicio');
            if (!hasDesarrollo) missing.push('Desarrollo');
            if (!hasCierre) missing.push('Cierre');
            if (!hasAdaptaciones) missing.push('Adaptaciones');

            violations.push({
              ruleId: `dev-${policy.roomType.toLowerCase().replace(/_/g, '-')}-pedagogical-structure`,
              severity: 'DEVELOPMENTAL_MISMATCH',
              message: `La actividad ${actIdx + 1} del ${day.dayOfWeek} para ${policy.label} carece de las secciones pedagógicas recomendadas: ${missing.join(', ')}. Toda actividad debe estructurarse preferentemente con Inicio, Desarrollo, Cierre y Adaptaciones.`,
              provenance: 'CANONICAL_PRODUCT_RULE',
              dayOfWeek: day.dayOfWeek,
              activityIndex: actIdx,
              contextField: 'description',
              riskRationale: 'La falta de secuencia pedagógica dificulta la ejecución estructurada por parte de la Asistente Educativa.'
            });
          }

          // Check meaningful closures for Lactantes B & C (avoid generic assemblies or dialogical reflection)
          const cierreMatch = desc.match(/\bCierre:\s*([^\n\r]+)/i);
          if (cierreMatch) {
            const cierreText = cierreMatch[1];
            const invalidClosurePattern = /\b(hablar|dialogar|conversar|platicar|preguntar(les)?|reflexionar|comentar)\b.*?\bsobre\s+lo\s+(que\s+)?(han\s+)?(visto|aprendido|realizado|experimentado|sentido)\b/i;
            const assemblyPattern = /\breunir\s+a\s+los\s+lactantes\s+para\s+(hablar|comentar|dialogar|reflexionar|conversar)\b/i;

            if (invalidClosurePattern.test(cierreText) || assemblyPattern.test(cierreText)) {
              violations.push({
                ruleId: `dev-${policy.roomType.toLowerCase().replace(/_/g, '-')}-closure-mismatch`,
                severity: 'DEVELOPMENTAL_MISMATCH',
                message: `El Cierre de la actividad ${actIdx + 1} del ${day.dayOfWeek} propone diálogo reflexivo o asamblea («hablar sobre lo que han visto»), lo cual no corresponde al hito evolutivo de ${policy.label}. Se sugiere una acción concreta, breve y afectiva (nombrar objetos, canción de transición, reconocimiento gestual).`,
                provenance: 'CANONICAL_PRODUCT_RULE',
                dayOfWeek: day.dayOfWeek,
                activityIndex: actIdx,
                contextField: 'description',
                riskRationale: 'Lactantes no poseen lenguaje discursivo ni capacidad de metacognición verbal.'
              });
            }
          }
        }
      });
    }

    // 3. Evaluate Cross-Day Variation (SR-MD-22H Section 6 & SR-MD-23J & SR-MD-25)
    // Under SR-MD-23J, repetition across days is classified as NIVEL AMARILLO (WARNING), NOT a blocking failure.
    if (options?.checkPedagogicalVariation && (policy.roomType === 'LACTANTES_B' || policy.roomType === 'LACTANTES_C')) {
      const seenActivities = new Map<string, { dayOfWeek: string; actIndex: number }>();
      for (const day of plan.days) {
        if (!day.activities) continue;
        day.activities.forEach((activity: PedagogicalActivityCandidate, actIdx: number) => {
          const textKey = (activity.description || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (textKey.length > 25) {
            const prior = seenActivities.get(textKey);
            if (prior) {
              violations.push({
                ruleId: 'progression-literal-repetition-without-variation',
                severity: 'WARNING',
                message: `La actividad ${actIdx + 1} del ${day.dayOfWeek} es una repetición de la actividad ${prior.actIndex + 1} del ${prior.dayOfWeek}. Se sugiere incorporar una variación observable en mediación, interacción o exploración.`,
                provenance: 'CANONICAL_PRODUCT_RULE',
                dayOfWeek: day.dayOfWeek,
                activityIndex: actIdx,
                contextField: 'description',
                riskRationale: 'La repetición con variación favorece el desarrollo infantil y enriquece la experiencia en el aula.'
              });
            } else {
              seenActivities.set(textKey, { dayOfWeek: day.dayOfWeek, actIndex: actIdx });
            }
          }
        });
      }
    }

    // 4. Classify Violations into Blocking vs Warnings
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
