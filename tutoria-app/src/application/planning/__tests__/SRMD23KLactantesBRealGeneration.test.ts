import { describe, it, expect, vi } from 'vitest';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
} from '../WeeklyPlanningProposalSource';

describe('MASTER ARB — SR-MD-23K: Generación Real Lactantes B (Criterios de Aceptación)', () => {
  const baseRequest: WeeklyPlanningProposalRequest = Object.freeze({
    weekStart: '2026-10-19',
    weekEnd: '2026-10-23',
    modality: 'DIRECT',
    room: {
      roomId: 'room-lactantes-b',
      name: 'Lactantes B',
      minAgeMonths: 7,
      maxAgeMonths: 12,
    },
    currentContext: {
      observations: 'Lactantes exploran texturas y gatean libremente sobre tapetes y colchonetas.',
      identifiedNeeds: 'Estimular desplazamiento libre y balbuceo afectivo.',
      specialSituations: 'Ninguna situación anómala.',
      availableMaterials: 'Colchonetas, pelotas suaves, sonajas, libros de tela, cubos de vinil, toallas desechables',
    },
    constraints: {
      minActivitiesPerDay: 5,
    },
  });

  const generate25SafeActivitiesRaw = (): any => {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const categories = [
      'AMBIENTES DE APRENDIZAJE',
      'EXPERIENCIAS ARTÍSTICAS',
      'PENSAMIENTO MATEMÁTICO',
      'ACTIVACIÓN FÍSICA',
      'LECTURA EN VOZ ALTA',
    ];

    return {
      weeklyFocus: 'Exploración sensorial y psicomotora integral en Lactantes B',
      days: days.map((day, dIdx) => ({
        dayOfWeek: day,
        activities: categories.map((cat, aIdx) => {
          const slot = `D${dIdx + 1}_A${aIdx + 1}`;
          const isReading = cat === 'LECTURA EN VOZ ALTA';
          return {
            category: cat,
            objective: isReading
              ? 'Fomentar la escucha afectiva y el contacto visual con narraciones breves'
              : `Estimular la coordinación motriz y la interacción afectiva en momento ${aIdx + 1}`,
            proceduralAction: isReading
              ? 'Inicio: Se acomoda al lactante en el regazo o colchoneta de forma cálida.\nDesarrollo: Lectura en voz alta del libro con entonación afectiva.\nCierre: Transición afectiva suave nombrando los personajes.\nAdaptaciones: Se atiende la atención de cada lactante.'
              : `Inicio: Se dispone el espacio en colchoneta de forma cálida y segura.\nDesarrollo: Se ofrece al lactante {material} para su exploración táctil guiada.\nCierre: Transición afectiva suave nombrando los materiales explorados.\nAdaptaciones: Se respeta el ritmo individual y la movilidad espontánea de cada lactante.`,
            materialRefs: isReading ? ['MAT-4'] : ['MAT-2'],
            durationMinutes: 15,
            progression: {
              role: 'EXPLORE',
              revisitsSlot: null,
              repetitionPurpose: null,
              variationDimensions: null,
              observationTarget: `Respuesta motriz y afectiva del lactante en ${slot}`,
            },
          };
        }),
      })),
    };
  };

  it('1. CONSERVACIÓN DE 25 ACTIVIDADES CON REPETICIÓN ENTRE DÍAS: La propuesta se conserva íntegra y no se descarta a Fallback', async () => {
    // Escenario real del PO: OpenAI generó 25 actividades, y la actividad 4 del miércoles duplicó la del martes.
    const rawAiOutput = generate25SafeActivitiesRaw();
    rawAiOutput.days[2].activities[3].proceduralAction =
      rawAiOutput.days[1].activities[3].proceduralAction;
    rawAiOutput.days[2].activities[3].objective =
      rawAiOutput.days[1].activities[3].objective;

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    // Verificaciones:
    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);

    let totalActivities = 0;
    for (const day of response.days) {
      expect(day.activities.length).toBeGreaterThanOrEqual(5);
      totalActivities += day.activities.length;
    }
    expect(totalActivities).toBe(25);

    // Ambas actividades (martes y miércoles) se conservan auténticamente
    const tuesdayAct4 = response.days[1].activities[3];
    const wednesdayAct4 = response.days[2].activities[3];
    expect(tuesdayAct4.category).toBe('ACTIVACIÓN FÍSICA');
    expect(wednesdayAct4.category).toBe('ACTIVACIÓN FÍSICA');
    // Ninguna fue sustituida por plantilla determinista
    expect(tuesdayAct4.objective).not.toContain('[Propuesta IA sustituida por seguridad');
    expect(wednesdayAct4.objective).not.toContain('[Propuesta IA sustituida por seguridad');
  });

  it('2. REFERENCIAS A MOBILIARIO SEGURO: Colchonetas, tapetes y canastas seguras no provocan rechazo', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();
    rawAiOutput.days[0].activities[0].proceduralAction =
      'Inicio: Se colocan colchonetas y tapetes suaves en el suelo.\nDesarrollo: Se colocan pelotas en una canasta plástica para que los lactantes las tomen y rueden libremente.\nCierre: Transición afectiva guardando los materiales.\nAdaptaciones: Acompañar el ritmo motriz de cada bebé sin forzar posturas.';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    expect(response).toBeDefined();
    const mondayAct1 = response.days[0].activities[0];
    expect(mondayAct1.description).toContain('canasta');
    expect(mondayAct1.objective).not.toContain('[Propuesta IA sustituida por seguridad');
  });

  it('3. RIESGO CRÍTICO EN 1 ACTIVIDAD NO ELIMINA LAS OTRAS 24: Se aísla y sustituye preventivamente solo la riesgosa', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();
    // Inyectar riesgo de asfixia aguda (semillas sueltas / frijoles crudos) en Jueves Actividad 2
    rawAiOutput.days[3].activities[1].proceduralAction =
      'Inicio: Sentar a los lactantes en círculo.\nDesarrollo: Ofrecer frijoles crudos y semillas sueltas para manipulación táctil con dedos.\nCierre: Recoger las semillas.\nAdaptaciones: Supervisar constantemente.';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);

    // La actividad riesgosa fue identificada y sustituida preventivamente
    const thursdayAct2 = response.days[3].activities[1];
    expect(thursdayAct2.objective).toContain('[Propuesta IA sustituida por seguridad');
    expect(thursdayAct2.description).toContain('Sustitución preventiva automática por riesgo de seguridad');
    expect(thursdayAct2.description).not.toContain('frijoles crudos');

    // Las otras 24 actividades permanecen intactas como propuestas auténticas de OpenAI
    const mondayAct1 = response.days[0].activities[0];
    expect(mondayAct1.objective).not.toContain('[Propuesta IA sustituida por seguridad');
    expect(mondayAct1.objective).toContain('Estimular la coordinación motriz');

    const fridayReading = response.days[4].activities[4];
    expect(fridayReading.category).toBe('LECTURA EN VOZ ALTA');
    expect(fridayReading.objective).not.toContain('[Propuesta IA sustituida por seguridad');
  });

  it('4. PROPUESTA VÁLIDA SE ENTREGA COMO PROPUESTA OPENAI (NO FALLBACK)', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);

    // Todas las actividades contienen las secciones pedagógicas requeridas
    for (const day of response.days) {
      for (const act of day.activities) {
        expect(act.description).toContain('Inicio:');
        expect(act.description).toContain('Desarrollo:');
        expect(act.description).toContain('Cierre:');
        expect(act.description).toContain('Adaptaciones:');
        expect(act.objective.length).toBeGreaterThan(10);
        expect(act.durationMinutes).toBeGreaterThanOrEqual(1);
        expect(act.durationMinutes).toBeLessThanOrEqual(60);
      }
    }
  });

  it('5. EL CONTRATO ADMITE UN MÍNIMO DE 5 ACTIVIDADES POR DÍA Y CANTIDADES SUPERIORES (E.G. 6 POR DÍA = 30 SEMANALES)', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();
    // Añadir una sexta actividad a cada día (30 actividades semanales)
    for (let dIdx = 0; dIdx < rawAiOutput.days.length; dIdx++) {
      rawAiOutput.days[dIdx].activities.push({
        category: 'AMBIENTES DE APRENDIZAJE',
        objective: `Actividad complementaria de exploración táctil libre día ${dIdx + 1}`,
        proceduralAction: 'Inicio: Disponer tapetes cálidos.\nDesarrollo: Exploración de cubos sensoriales con texturas suaves.\nCierre: Transición tranquila.\nAdaptaciones: Respetar ritmo individual.',
        materialRefs: ['MAT-2'],
        durationMinutes: 10,
        progression: {
          role: 'EXPLORE',
          revisitsSlot: null,
          repetitionPurpose: null,
          variationDimensions: null,
          observationTarget: 'Interés espontáneo en texturas',
        },
      });
    }

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const requestWithMin5: WeeklyPlanningProposalRequest = {
      ...baseRequest,
      constraints: {
        minActivitiesPerDay: 5,
        maxActivitiesPerDay: 10,
      },
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(requestWithMin5);

    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);
    for (const day of response.days) {
      expect(day.activities).toHaveLength(6);
    }
    const totalWeekly = response.days.reduce((acc, d) => acc + d.activities.length, 0);
    expect(totalWeekly).toBe(30);
  });

  it('6. ERROR REAL SR-MD-23L: OpenAI genera rol REVISIT o VARY con variationDimensions vacías o nulas en Lactantes B: Se auto-recupera y no lanza VARIATION_DIMENSIONS_MISSING_OR_INVALID', async () => {
    // Escenario exacto del fallo en producción/LAB diagnosticado en SR-MD-23L:
    // latencyMs: 51335, processingStage: CANONICAL_VALIDATION, failureCode: INVALID_CANONICAL_PROPOSAL, diagnosticSubtype: VARIATION_DIMENSIONS_MISSING_OR_INVALID
    const rawAiOutput = generate25SafeActivitiesRaw();

    // En D2_A2 (martes actividad 2), OpenAI definió role: 'REVISIT', revisitsSlot: 'D1_A2', pero variationDimensions: [] y repetitionPurpose: null
    rawAiOutput.days[1].activities[1].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D1_A2',
      repetitionPurpose: null,
      variationDimensions: [],
      observationTarget: 'Observar cómo el lactante responde a la variación sensorial.',
    };

    // En D3_A3 (miércoles actividad 3), OpenAI definió role: 'VARY', revisitsSlot: 'D2_A3', pero variationDimensions: null
    rawAiOutput.days[2].activities[2].progression = {
      role: 'VARY',
      revisitsSlot: 'D2_A3',
      repetitionPurpose: 'VARIATION',
      variationDimensions: null,
      observationTarget: 'Mayor soltura motriz al interactuar con el entorno.',
    };

    // En D4_A1 (jueves actividad 1), OpenAI definió role: 'REVISIT', pero revisitsSlot fue inválido/desconocido
    rawAiOutput.days[3].activities[0].progression = {
      role: 'REVISIT',
      revisitsSlot: 'D9_A9', // slot inexistente
      repetitionPurpose: 'FAMILIARIZATION',
      variationDimensions: ['SENSORY_EXPERIENCE'],
      observationTarget: 'Reacción ante el juego.',
    };

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    // Verificaciones:
    // 1. La propuesta no se descarta a Fallback
    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);

    // 2. Las 25 actividades auténticas de OpenAI se entregan completas
    let totalActivities = 0;
    for (const day of response.days) {
      expect(day.activities.length).toBeGreaterThanOrEqual(5);
      totalActivities += day.activities.length;
    }
    expect(totalActivities).toBe(25);

    // 3. Ninguna de las actividades fue descartada ni reemplazada por fallo técnico
    const d2Act2 = response.days[1].activities[1];
    expect(d2Act2.category).toBe('EXPERIENCIAS ARTÍSTICAS');
    expect(d2Act2.objective).not.toContain('[Propuesta IA sustituida por seguridad');

    const d3Act3 = response.days[2].activities[2];
    expect(d3Act3.category).toBe('PENSAMIENTO MATEMÁTICO');
    expect(d3Act3.objective).not.toContain('[Propuesta IA sustituida por seguridad');

    const d4Act1 = response.days[3].activities[0];
    expect(d4Act1.category).toBe('AMBIENTES DE APRENDIZAJE');
    expect(d4Act1.objective).not.toContain('[Propuesta IA sustituida por seguridad');

    // 4. La progresión canónica resultante es válida
    if (response.progression) {
      expect(response.progression.experiences).toHaveLength(25);
    }
  });
});

