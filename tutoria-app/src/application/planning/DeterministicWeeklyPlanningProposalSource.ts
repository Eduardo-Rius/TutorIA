import { IMSS_CATEGORIES, type ImssCategory } from '../../constants/imssCategories';
import {
  OFFICIAL_WEEKDAYS,
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  WeeklyPlanningProposalSource,
  ProposedPlanningDay,
  ProposedActivity,
  WeeklyPlanningWeekday,
  validateWeeklyPlanningProposalRequest,
  validateWeeklyPlanningProposalResponse,
  TECHNICAL_MIN_DURATION_MINUTES,
  TECHNICAL_MAX_DURATION_MINUTES,
} from './WeeklyPlanningProposalSource';

/**
 * Pedagogical activity template definition for deterministic baseline generation.
 *
 * NOTE: These templates are technical baseline scaffolding to prove contract mechanics,
 * NOT institutional pedagogical mandates.
 */
export interface PedagogicalActivityTemplate {
  readonly category: ImssCategory;
  readonly infantObjective: string;
  readonly infantDescription: string;
  readonly toddlerObjective: string;
  readonly toddlerDescription: string;
  readonly defaultMaterials: readonly string[];
}

/**
 * Standard baseline activity templates mapped to each canonical IMSS category.
 * Explicitly differentiated by age group (infants <= 18 months vs toddlers > 18 months).
 */
export const BASELINE_TEMPLATES: readonly PedagogicalActivityTemplate[] = Object.freeze([
  {
    category: 'EXPERIENCIAS ARTÍSTICAS',
    infantObjective: 'Explorar texturas y sonoridades suaves con sonajas y telas en sala',
    infantDescription:
      'Los lactantes manipulan sonajas livianas y telas suaves sobre la colchoneta para experimentar sonidos y sensaciones táctiles al compás de música suave.',
    toddlerObjective: 'Expresar creatividad mediante la exploración de trazos y formas libres',
    toddlerDescription:
      'Las niñas y niños realizan trazos libres con gises o crayones gruesos sobre pliegos de papel en suelo o mesa, favoreciendo la prensión y expresión visual.',
    defaultMaterials: ['Telas suaves de colores', 'Sonajas livianas'],
  },
  {
    category: 'AMBIENTES DE APRENDIZAJE',
    infantObjective: 'Fomentar la exploración libre y segura del entorno inmediato en colchoneta',
    infantDescription:
      'Se acondiciona el área con cojines y obstáculos suaves para motivar el gateo, el desplazamiento autónomo y la curiosidad espacial.',
    toddlerObjective: 'Construir estructuras sencillas fomentando la autonomía y cooperación en grupo',
    toddlerDescription:
      'Se organizan estaciones de ensamble con bloques grandes para que las niñas y niños colaboren en la creación de torres, caminos y figuras sencillas.',
    defaultMaterials: ['Colchonetas de sala', 'Cojines firmes'],
  },
  {
    category: 'ACTIVACIÓN FÍSICA',
    infantObjective: 'Estimular el tono muscular y la coordinación motriz gruesa mediante balanceo',
    infantDescription:
      'Juegos de balanceo suave y movimiento guiado de extremidades sobre colchoneta para fortalecer el control postural, cuello y fuerza corporal.',
    toddlerObjective: 'Desarrollar equilibrio y coordinación motriz en circuitos seguros en sala',
    toddlerDescription:
      'Circuito motriz con aros y marcas suaves en el suelo donde caminan, sortean obstáculos bajos y practican frenado voluntario y coordinación corporal.',
    defaultMaterials: ['Colchoneta acolchada'],
  },
  {
    category: 'LECTURA EN VOZ ALTA',
    infantObjective: 'Acercar al lenguaje oral mediante narraciones breves e ilustraciones contrastantes',
    infantDescription:
      'La educadora comparte un cuento con imágenes de contraste grande, modulando tonos de voz, onomatopeyas y realizando pausas de contacto visual.',
    toddlerObjective: 'Enriquecer vocabulario y comprensión mediante narraciones dialogadas con títeres',
    toddlerDescription:
      'Lectura comentada de una historia sencilla donde las y los niños señalan personajes, nombran objetos e imitan acciones clave de los protagonistas.',
    defaultMaterials: ['Cuento con imágenes grandes'],
  },
  {
    category: 'PENSAMIENTO MATEMÁTICO',
    infantObjective: 'Experimentar relaciones espaciales básicas y permanencia de objeto con pelotas',
    infantDescription:
      'Juegos de introducir y extraer pelotas suaves en recipientes amplios y seguros para descubrir de manera exploratoria nociones de dentro y fuera.',
    toddlerObjective: 'Clasificar objetos cotidianos del aula por color y tamaño relativo',
    toddlerDescription:
      'Actividad lúdica de agrupación donde colocan piezas en cajas según correspondencia básica de atributos (grande/pequeño, colores principales).',
    defaultMaterials: ['Recipiente amplio seguro', 'Pelotas suaves'],
  },
]);

/**
 * Deterministic baseline provider for Weekly Planning proposals.
 *
 * Implements WeeklyPlanningProposalSource contract from H1R11.1.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. PROPOSAL != PLANNING: Returns data only; zero repository authority, zero persistence.
 * 2. ZERO EXTERNAL DEPENDENCIES: Pure deterministic TypeScript; no OpenAI, Firebase, fetch, or network.
 * 3. CONTROL BASELINE: Used to compare and benchmark future real AI proposals.
 * 4. STRICTLY REPRODUCIBLE: Identical requests produce mathematically identical proposals every time.
 */
export class DeterministicWeeklyPlanningProposalSource implements WeeklyPlanningProposalSource {
  public async propose(
    request: WeeklyPlanningProposalRequest
  ): Promise<WeeklyPlanningProposalResponse> {
    // 1. Fail-closed request validation using canonical H1R11.1 contract validator
    validateWeeklyPlanningProposalRequest(request);

    const isInfant = request.room.maxAgeMonths <= 18;

    // 2. Resolve allowed categories constraint or default to canonical 5 IMSS categories
    const allowedCategories: readonly ImssCategory[] =
      request.constraints?.allowedCategories && request.constraints.allowedCategories.length > 0
        ? request.constraints.allowedCategories
        : IMSS_CATEGORIES;

    // Filter templates to only allowed categories
    const candidateTemplates = BASELINE_TEMPLATES.filter((tpl) =>
      allowedCategories.includes(tpl.category)
    );

    // Fallback if none matched (prevented by validator, but fail-safe defensively)
    const effectiveTemplates = candidateTemplates.length > 0 ? candidateTemplates : BASELINE_TEMPLATES;

    // 3. Resolve activity count per day (SR-MD-23: minimum 5 activities per day = 25 weekly activities)
    const minActs = request.constraints?.minActivitiesPerDay ?? 5;
    const maxActs = request.constraints?.maxActivitiesPerDay;
    let targetActsPerDay = minActs;
    if (maxActs !== undefined && targetActsPerDay > maxActs) {
      targetActsPerDay = maxActs;
    }

    // 4. Resolve durationMinutes bounded by technical and constraint ceilings
    const minDur = request.constraints?.minDurationMinutes ?? TECHNICAL_MIN_DURATION_MINUTES;
    const maxDur = request.constraints?.maxDurationMinutes ?? TECHNICAL_MAX_DURATION_MINUTES;
    let durationMinutes = 20; // Standard early childhood activity baseline duration
    if (durationMinutes < minDur) durationMinutes = minDur;
    if (durationMinutes > maxDur) durationMinutes = maxDur;

    // 5. Parse usable materials from currentContext without inventing specialized equipment
    const extractedMaterials = this.extractMaterialsFromContext(
      request.currentContext.availableMaterials
    );

    // 6. Deterministically calculate dates from weekStart
    const [y, m, d] = request.weekStart.split('-').map(Number);
    const computeDate = (offset: number): string => {
      const dt = new Date(Date.UTC(y, m - 1, d + offset));
      return dt.toISOString().slice(0, 10);
    };

    // 7. Generate exactly five weekdays MONDAY through FRIDAY
    const days: ProposedPlanningDay[] = OFFICIAL_WEEKDAYS.map((dayOfWeek, dayIndex) => {
      const date = computeDate(dayIndex);
      const activities: ProposedActivity[] = [];

      for (let actIndex = 0; actIndex < targetActsPerDay; actIndex++) {
        // Deterministic template rotation across days and activities within day
        const templateIndex = (dayIndex + actIndex) % effectiveTemplates.length;
        const template = effectiveTemplates[templateIndex]!;

        const objective = isInfant ? template.infantObjective : template.toddlerObjective;
        const centralAction = isInfant ? template.infantDescription : template.toddlerDescription;
        let description = this.buildStructuredDescription(centralAction, request.room);

        // Contextually reflect identifiedNeeds if present without claiming institutional authority
        if (
          request.currentContext.identifiedNeeds &&
          request.currentContext.identifiedNeeds.trim().length > 0
        ) {
          const focusSnippet = request.currentContext.identifiedNeeds.trim().slice(0, 120);
          description = `${description}\n[Enfoque de sala: ${focusSnippet}]`;
        }

        // Combine extracted materials with template defaults, avoiding duplicate items
        const materialsList: string[] = [];
        if (extractedMaterials.length > 0) {
          // Use material based on day and activity index
          const matIdx = (dayIndex + actIndex) % extractedMaterials.length;
          materialsList.push(extractedMaterials[matIdx]!);
        } else {
          materialsList.push(...template.defaultMaterials);
        }

        // Fallback safety to ensure at least one material string
        if (materialsList.length === 0) {
          materialsList.push('Espacio libre y seguro en sala');
        }

        activities.push({
          category: template.category,
          objective,
          description,
          durationMinutes,
          materials: Object.freeze(materialsList),
        });
      }

      return {
        dayOfWeek,
        date,
        activities: Object.freeze(activities),
      };
    });

    const candidateResponse: WeeklyPlanningProposalResponse = {
      days: Object.freeze(days),
    };

    // 8. Validate constructed proposal through canonical response validator ensuring zero domain leakage
    return validateWeeklyPlanningProposalResponse(candidateResponse, request.constraints);
  }

  /**
   * Deterministically parses clean material strings from free-text context.
   * Filters out whitespace, truncates to safe lengths, and prevents duplicate entries.
   */
  private extractMaterialsFromContext(rawMaterials?: string): readonly string[] {
    if (!rawMaterials || typeof rawMaterials !== 'string' || !rawMaterials.trim()) {
      return [];
    }

    const cleaned = rawMaterials
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 150);

    // Return unique items preserving order
    return Array.from(new Set(cleaned));
  }

  /**
   * Structures activity description with Inicio, Desarrollo, Cierre, and Adaptaciones (SR-MD-23).
   * For Lactantes A: preserves mandatory bimodal adaptations (43 días–3 meses and 4–6 meses).
   * For Lactantes B: provides 7–12 meses adaptations with concrete affective closing.
   * For other rooms: provides age-appropriate pedagogical structure and adaptations.
   */
  private buildStructuredDescription(
    centralAction: string,
    room: { minAgeMonths: number; maxAgeMonths: number; roomId?: string; name?: string }
  ): string {
    const isLactantesA = room.minAgeMonths === 0 && room.maxAgeMonths <= 6;
    const isLactantesB =
      (room.minAgeMonths >= 7 && room.maxAgeMonths <= 12) ||
      (room.roomId?.toLowerCase().includes('lactantes-b') ?? false) ||
      (room.name?.toLowerCase().includes('lactantes b') ?? false);

    if (isLactantesA) {
      return [
        'Inicio: Se recibe con afecto al lactante en colchoneta limpia, modulando la voz en tono cálido y manteniendo contacto visual sensible.',
        `Desarrollo: ${centralAction}`,
        'Cierre: Se realiza un cierre afectivo con caricias suaves en brazos y una melodía de cuna para una transición tranquila.',
        '• Adaptación 43 días a 3 meses: Interacción cercana en brazos con contención física amorosa, observando sus respuestas y respetando su ritmo.',
        '• Adaptación 4 a 6 meses: Exploración guiada sobre colchoneta limpia facilitando el movimiento libre de extremidades y seguimiento visual.',
      ].join('\n');
    }

    if (isLactantesB) {
      return [
        'Inicio: Se invita a los lactantes a reunirse sobre la colchoneta con música suave y contacto visual cariñoso.',
        `Desarrollo: ${centralAction}`,
        'Cierre: Se concluye la experiencia con una breve canción de despedida y reconocimiento gestual individual.',
        'Adaptaciones: Adecuación para 7 a 12 meses ofreciendo apoyo en postura cómoda y motivando el gateo seguro a su propio ritmo.',
      ].join('\n');
    }

    return [
      'Inicio: Se presenta la experiencia con entusiasmo invitando a las niñas y niños a explorar el espacio en sala.',
      `Desarrollo: ${centralAction}`,
      'Cierre: Recogida compartida de materiales y reconocimiento verbal del esfuerzo y logros individuales.',
      'Adaptaciones: Se ajusta la interacción según el nivel de desarrollo, motricidad y autonomía de cada niña o niño.',
    ].join('\n');
  }
}
