import { describe, it, expect, vi } from 'vitest';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
} from '../WeeklyPlanningProposalSource';

describe('MASTER ARB — SR-MD-23J: Three-Tier Validation & Per-Activity Recovery (Lactantes B)', () => {
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
      weeklyFocus: 'Exploración psicomotora y sensorial sensible en Lactantes B',
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

  it('1. DIAGNÓSTICO EXACTO DEL FALLO ANTERIOR: Repetición literal entre martes y miércoles (NIVEL AMARILLO) ya NO causa Fallback de los 5 días', async () => {
    // Exact reproduction of Cloud Logging correlation dd0a9637-a036-4c00-be46-e0b2db6e771f:
    // Wednesday Activity 4 textually matched Tuesday Activity 4.
    const rawAiOutput = generate25SafeActivitiesRaw();

    // Force Wednesday activity 4 (index 3) to duplicate Tuesday activity 4 (index 3)
    rawAiOutput.days[2].activities[3].proceduralAction =
      rawAiOutput.days[1].activities[3].proceduralAction;
    rawAiOutput.days[2].activities[3].objective =
      rawAiOutput.days[1].activities[3].objective;

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    // Verifications:
    // 1. Proposal is delivered (NOT Fallback)
    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);

    // 2. All 5 days have 5 activities (total 25 activities delivered)
    for (const day of response.days) {
      expect(day.activities).toHaveLength(5);
    }

    // 3. Wednesday Activity 4 is preserved without internal text pollution (SR-MD-23N)
    const wednesdayAct4 = response.days[2].activities[3];
    expect(wednesdayAct4.description).not.toContain('Variación pedagógica sugerida');
    expect(wednesdayAct4.description).toContain('Inicio:');
  });

  it('2. RECUPERACIÓN PARCIAL POR ACTIVIDAD: Si 1 actividad tiene riesgo real (NIVEL ROJO), se aísla esa actividad y se conservan las otras 24 actividades auténticas de OpenAI', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();

    // Inject a real acute choking hazard (NIVEL ROJO) into Thursday Activity 2 (index 1)
    rawAiOutput.days[3].activities[1].proceduralAction =
      'Inicio: Se reúne al grupo.\nDesarrollo: Ofrecer canicas a los lactantes para que las rueden con sus manos.\nCierre: Transición suave.\nAdaptaciones: Cuidar que no se alejen.';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    // Verifications:
    // 1. The proposal is delivered (NOT dropped into 5-day Fallback)
    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);

    // 2. All days have 5 activities
    for (const day of response.days) {
      expect(day.activities).toHaveLength(5);
    }

    // 3. Thursday Activity 2 was ISOLATED and SUBSTITUTED for safety
    const thursdayAct2 = response.days[3].activities[1];
    expect(thursdayAct2.objective).toContain('[Propuesta IA sustituida por seguridad');
    expect(thursdayAct2.description).toContain('Sustitución preventiva automática por riesgo de seguridad');
    expect(thursdayAct2.description).not.toContain('Ofrecer canicas');

    // 4. All other 24 activities remain the AUTHENTIC activities generated by OpenAI
    const mondayAct1 = response.days[0].activities[0];
    expect(mondayAct1.objective).not.toContain('[Propuesta IA sustituida por seguridad');
    expect(mondayAct1.objective).toContain('Estimular la coordinación motriz');

    const fridayAct5 = response.days[4].activities[4];
    expect(fridayAct5.category).toBe('LECTURA EN VOZ ALTA');
    expect(fridayAct5.objective).not.toContain('[Propuesta IA sustituida por seguridad');
  });

  it('3. ELIMINACIÓN DE RESTRICCIONES ARBITRARIAS: Contenedores seguros (canastas, cajas) y superficies (colchonetas, tapetes) no son rechazados', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();

    // Monday Activity 1 mentions safe containers and mats without declaring them as focal materials
    rawAiOutput.days[0].activities[0].proceduralAction =
      'Inicio: Disponer la colchoneta y el tapete suave.\nDesarrollo: Colocar los cubos de vinil dentro de una canasta plástica para que el lactante los extraiga libremente.\nCierre: Transición afectiva suave nombrando los materiales.\nAdaptaciones: Respetar la postura espontánea.';

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

  it('4. FRASES PREVENTIVAS: "evitar piezas pequeñas" en adaptaciones es reconocido como directiva preventiva segura y no como infracción', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();

    // Tuesday Activity 2 includes explicit preventive warning in adaptaciones
    rawAiOutput.days[1].activities[1].proceduralAction =
      'Inicio: Espacio limpio y cálido en colchoneta.\nDesarrollo: Exploración de pelotas suaves con ambas manos.\nCierre: Transición tranquila.\nAdaptaciones: Verificar que el espacio esté despejado, cuidando de evitar piezas pequeñas o elementos desprendibles.';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    expect(response).toBeDefined();
    const tuesdayAct2 = response.days[1].activities[1];
    expect(tuesdayAct2.description).toContain('evitar piezas pequeñas');
    expect(tuesdayAct2.objective).not.toContain('[Propuesta IA sustituida por seguridad');
  });

  it('5. NIVEL ROJO (POSTURAS FORZADAS): Marcha erguida obligatoria es aislada y sustituida, preservando el resto de la semana', async () => {
    const rawAiOutput = generate25SafeActivitiesRaw();

    // Inject forced standing march into Friday Activity 1 (index 0)
    rawAiOutput.days[4].activities[0].proceduralAction =
      'Inicio: Se coloca al grupo en fila.\nDesarrollo: Obligar a caminar erguidos en marcha autónoma obligatoria sosteniéndose sólo de pie.\nCierre: Guardado de materiales.\nAdaptaciones: Ninguna.';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(baseRequest);

    expect(response).toBeDefined();
    const fridayAct1 = response.days[4].activities[0];
    expect(fridayAct1.objective).toContain('[Propuesta IA sustituida por seguridad');
    expect(fridayAct1.description).toContain('Sustitución preventiva automática por riesgo de seguridad');

    // Other activities on Friday are preserved
    const fridayReading = response.days[4].activities[4];
    expect(fridayReading.category).toBe('LECTURA EN VOZ ALTA');
    expect(fridayReading.objective).not.toContain('[Propuesta IA sustituida por seguridad');
  });
});
