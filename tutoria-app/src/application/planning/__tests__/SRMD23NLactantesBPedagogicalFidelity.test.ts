import { describe, it, expect, vi } from 'vitest';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  InvalidWeeklyPlanningProposalError,
} from '../WeeklyPlanningProposalSource';

describe('MASTER ARB — SR-MD-23N: Fidelidad Pedagógica Real de OpenAI en Lactantes B', () => {
  // Los 4 textos de control utilizados en LAB
  const labControlRequest: WeeklyPlanningProposalRequest = Object.freeze({
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
      observations:
        'Lactantes de 7 a 12 meses exploran con curiosidad su entorno, gatean sobre colchonetas y muestran interés por sonidos y texturas variadas.',
      identifiedNeeds:
        'Favorecer la coordinación motriz, la exploración sensorial activa, el balbuceo imitativo y el seguimiento visual en lectura compartida.',
      specialSituations:
        'Grupo estable. Dos lactantes inician transición hacia la bipedestación con apoyo; se respeta su ritmo libre sin forzarlos.',
      availableMaterials:
        'Libro "¿Dónde está Spot?", de Eric Hill, colchonetas de sala, pelotas sensoriales suaves, sonajas livianas, libros de tela con texturas, cubos de vinil, toallas desechables',
    },
    constraints: {
      minActivitiesPerDay: 5,
    },
  });

  const generateAuthenticOpenAI25Activities = (): any => {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const categories = [
      'AMBIENTES DE APRENDIZAJE',
      'EXPERIENCIAS ARTÍSTICAS',
      'PENSAMIENTO MATEMÁTICO',
      'ACTIVACIÓN FÍSICA',
      'LECTURA EN VOZ ALTA',
    ];

    // Duraciones variadas y pedagógicamente flexibles (no uniforme 15 min)
    const durations = [10, 12, 15, 20, 12];

    return {
      weeklyFocus:
        'Exploración sensoriomotora integral, vínculo afectivo y goce literario en Lactantes B',
      days: days.map((day, dIdx) => ({
        dayOfWeek: day,
        activities: categories.map((cat, aIdx) => {
          const slot = `D${dIdx + 1}_A${aIdx + 1}`;
          const isReading = cat === 'LECTURA EN VOZ ALTA';

          if (isReading) {
            return {
              category: cat,
              // Objetivo específico de OpenAI mencionando el libro de contexto
              objective: `Estimular la escucha atenta, la permanencia de objeto y la respuesta gestual con el cuento "¿Dónde está Spot?", de Eric Hill`,
              proceduralAction: `Inicio: Se acomoda a los lactantes en semicírculo cálido sobre las colchonetas de sala, mostrándoles la portada del libro "¿Dónde está Spot?", de Eric Hill, con entonación afectuosa y preguntas lúdicas.\nDesarrollo: La asistente abre las solapas del libro "¿Dónde está Spot?", de Eric Hill, permitiendo que cada bebé toque las páginas de tela o cartón, buscando a Spot y modulando la voz al descubrir los animales escondidos.\nCierre: Transición afectiva abrazando el cuento, acariciando suavemente a los bebés y cantando una melodía breve de despedida mientras se guarda el libro.\nAdaptaciones: Acompañamiento individualizado en regazo para quienes aún no se sientan sin apoyo, permitiendo exploración táctil libre.`,
              materialRefs: ['MAT-1', 'MAT-2'],
              durationMinutes: 12, // Duración flexible específica de lectura
              progression: {
                role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
                revisitsSlot: dIdx === 0 ? null : 'D1_A5',
                repetitionPurpose: dIdx === 0 ? null : 'FAMILIARIZATION',
                variationDimensions: dIdx === 0 ? null : ['INTERACTION_MODE'],
                observationTarget: `Fijación de la mirada e interés al abrir solapas de Spot en ${slot}`,
              },
            };
          }

          return {
            category: cat,
            // Objetivo auténtico y específico de OpenAI
            objective: `Favorecer la exploración motriz y táctil en el momento ${aIdx + 1} del día ${day}`,
            proceduralAction: `Inicio: Se acondiciona el área en colchonetas de sala disponiendo {material} a una distancia alcanzable.\nDesarrollo: Se motiva a los lactantes a desplazarse libremente gateando hacia {material}, explorando su textura y peso con manipulación espontánea.\nCierre: Acompañamiento sensible nombrando los objetos explorados e invitando a una transición tranquila hacia el reposo.\nAdaptaciones: Para lactantes en gateo inicial se acercan los objetos; para quienes ya se incorporan se colocan a la altura de su apoyo seguro.`,
            materialRefs: aIdx % 2 === 0 ? ['MAT-2', 'MAT-3'] : ['MAT-4'],
            durationMinutes: durations[aIdx], // Duraciones variadas: 10, 12, 15, 20 min
            progression: {
              role: 'EXPLORE',
              revisitsSlot: null,
              repetitionPurpose: null,
              variationDimensions: null,
              observationTarget: `Interés motor y sensorial en ${slot}`,
            },
          };
        }),
      })),
    };
  };

  it('CRITERIOS 1 A 10: Propuesta de OpenAI con 25 actividades, Spot Eric Hill, duraciones flexibles y CERO textos de normalización', async () => {
    const rawAiOutput = generateAuthenticOpenAI25Activities();

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(labControlRequest);

    // 1. Cinco días y mínimo 25 actividades
    expect(response).toBeDefined();
    expect(response.days).toHaveLength(5);
    const totalActivities = response.days.reduce((acc, d) => acc + d.activities.length, 0);
    expect(totalActivities).toBeGreaterThanOrEqual(25);

    // 2. Actividades específicas y utilizables
    // 3. Lectura diaria con referencia al libro «¿Dónde está Spot?», de Eric Hill
    for (let d = 0; d < 5; d++) {
      const day = response.days[d];
      const readingAct = day.activities.find((a) => a.category === 'LECTURA EN VOZ ALTA');
      expect(readingAct).toBeDefined();
      expect(readingAct!.objective).toContain('¿Dónde está Spot?');
      expect(readingAct!.description).toContain('¿Dónde está Spot?');
      expect(readingAct!.description).toContain('Eric Hill');
      expect(readingAct!.materials).toEqual(
        expect.arrayContaining([expect.stringContaining('¿Dónde está Spot?')])
      );
    }

    // 4. Inicio, Desarrollo, Cierre y Adaptaciones completos en todas las actividades
    for (const day of response.days) {
      for (const act of day.activities) {
        expect(act.description).toContain('Inicio:');
        expect(act.description).toContain('Desarrollo:');
        expect(act.description).toContain('Cierre:');
        expect(act.description).toContain('Adaptaciones:');
        expect(act.objective.length).toBeGreaterThan(15);
      }
    }

    // 5. Duraciones pedagógicamente flexibles (NO uniformes a 15 min)
    const distinctDurations = new Set<number>();
    for (const day of response.days) {
      for (const act of day.activities) {
        distinctDurations.add(act.durationMinutes);
      }
    }
    // Comprobar que existen duraciones distintas (ej. 10, 12, 15, 20)
    expect(distinctDurations.size).toBeGreaterThan(1);
    expect(distinctDurations).toContain(10);
    expect(distinctDurations).toContain(12);
    expect(distinctDurations).toContain(20);

    // 6. Materiales reales disponibles
    for (const day of response.days) {
      for (const act of day.activities) {
        for (const mat of act.materials) {
          expect(typeof mat).toBe('string');
          expect(mat.length).toBeGreaterThan(2);
        }
      }
    }

    // 7. CERO textos internos de normalización visibles para el usuario
    for (const day of response.days) {
      for (const act of day.activities) {
        // CERO [Propuesta IA normalizada]
        expect(act.objective).not.toContain('[Propuesta IA normalizada]');
        // CERO (Actividad normalizada determinísticamente)
        expect(act.description).not.toContain('(Actividad normalizada determinísticamente)');
        // CERO (Variación pedagógica sugerida...)
        expect(act.description).not.toContain('Variación pedagógica sugerida');
      }
    }

    // 8. Sin sustituciones silenciosas del contenido de OpenAI
    const mondayReading = response.days[0].activities[4];
    expect(mondayReading.objective).toBe(
      rawAiOutput.days[0].activities[4].objective
    );
    expect(mondayReading.description).toContain('abre las solapas');

    // 9. Conservación del circuito de revisión humana: la propuesta es entregada como propuesta AI utilizable
    expect(response.days[0].activities[0].objective).not.toContain(
      '[Propuesta IA sustituida por seguridad'
    );

    // 10. Sin Fallback
    expect(response.progression).toBeDefined();
    expect(response.progression?.weeklyFocus).toContain('Lactantes B');
  });

  it('PRESERVACIÓN DE CONTENIDO ANTE METADATOS AUXILIARES: OpenAI devuelve claves benignas (title, description, materials) sin causar rechazo', async () => {
    const rawAiOutput = generateAuthenticOpenAI25Activities();
    // Inyectar claves benignas en Tuesday Act 2
    rawAiOutput.days[1].activities[1].title = 'Exploración de texturas suaves';
    rawAiOutput.days[1].activities[1].name = 'Momento sensorial matutino';
    rawAiOutput.days[1].activities[1].materials = ['Colchonetas de sala'];

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(labControlRequest);

    expect(response).toBeDefined();
    const act = response.days[1].activities[1];
    expect(act.objective).not.toContain('[Propuesta IA normalizada]');
    expect(act.description).not.toContain('(Actividad normalizada determinísticamente)');
    expect(act.description).toContain('Inicio:');
  });

  it('DETECCIÓN DE RIESGOS REALES: Si hay riesgo infantil grave y evidente (semillas crudas), solo se sustituye preventivamente esa actividad', async () => {
    const rawAiOutput = generateAuthenticOpenAI25Activities();
    // Inyectar semillas sueltas / frijoles crudos en Thursday Act 1
    rawAiOutput.days[3].activities[0].proceduralAction =
      'Inicio: Sentar a los lactantes.\nDesarrollo: Ofrecer semillas crudas de frijol para que las manipulen con los dedos.\nCierre: Recoger las semillas.\nAdaptaciones: Supervisión estrecha.';

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const response: WeeklyPlanningProposalResponse = await source.propose(labControlRequest);

    // La actividad riesgosa es sustituida con reporte explícito del riesgo
    const unsafeAct = response.days[3].activities[0];
    expect(unsafeAct.objective).toContain('[Propuesta IA sustituida por seguridad');
    expect(unsafeAct.description).toContain('Sustitución preventiva automática por riesgo de seguridad');
    expect(unsafeAct.description).not.toContain('semillas crudas de frijol');

    // Las otras 24 actividades permanecen intactas como contenido auténtico de OpenAI
    const mondayReading = response.days[0].activities[4];
    expect(mondayReading.objective).toContain('¿Dónde está Spot?');
    expect(mondayReading.objective).not.toContain('[Propuesta IA sustituida por seguridad');
  });

  describe('MASTER ARB — SR-MD-24E: Corrección Quirúrgica MULTIPLE_DAILY_READING', () => {
    // 1. Una lectura diaria: PASS.
    it('1. Una lectura diaria: PASS', async () => {
      const rawAiOutput = generateAuthenticOpenAI25Activities();
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
      };
      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const response = await source.propose(labControlRequest);

      expect(response).toBeDefined();
      for (const day of response.days) {
        const readings = day.activities.filter((a) => a.category === 'LECTURA EN VOZ ALTA');
        expect(readings.length).toBe(1);
        expect(readings[0].durationMinutes).toBeGreaterThanOrEqual(1);
        expect(readings[0].durationMinutes).toBeLessThanOrEqual(60);
      }
    });

    // 2. Dos lecturas distintas en un día: PASS.
    it('2. Dos lecturas distintas en un día: PASS', async () => {
      const rawAiOutput = generateAuthenticOpenAI25Activities();
      // Agregar una segunda lectura en martes (TUESDAY)
      rawAiOutput.days[1].activities.push({
        category: 'LECTURA EN VOZ ALTA',
        objective: 'Propiciar la exploración táctil de páginas de tela con nanas suaves',
        proceduralAction:
          'Inicio: Acomodar a los lactantes en colchonetas en semicírculo cálido.\nDesarrollo: Compartir la lectura en voz alta de un libro de tela con texturas y modulación de voz afectuosa.\nCierre: Despedida afectiva y caricias suaves antes de la siesta.\nAdaptaciones: Atención individualizada en brazos para los más pequeños.',
        materialRefs: ['MAT-1'],
        durationMinutes: 10,
        progression: {
          role: 'EXPLORE',
          revisitsSlot: null,
          repetitionPurpose: null,
          variationDimensions: null,
          observationTarget: 'Exploración táctil en segunda lectura',
        },
      });

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
      };
      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const response = await source.propose(labControlRequest);

      expect(response).toBeDefined();
      const tuesday = response.days.find((d) => d.dayOfWeek === 'TUESDAY');
      expect(tuesday).toBeDefined();
      const tuesdayReadings = tuesday!.activities.filter(
        (a) => a.category === 'LECTURA EN VOZ ALTA'
      );
      expect(tuesdayReadings.length).toBe(2);
      expect(tuesdayReadings[0].durationMinutes).toBe(12);
      expect(tuesdayReadings[1].durationMinutes).toBe(10);
      expect(tuesdayReadings[0].objective).not.toEqual(tuesdayReadings[1].objective);
    });

    // 3. Cero lecturas en un día: rechazo controlado.
    it('3. Cero lecturas en un día: rechazo controlado con MISSING_DAILY_READING', async () => {
      const rawAiOutput = generateAuthenticOpenAI25Activities();
      // Quitar la lectura del miércoles (WEDNESDAY) y reemplazarla por ACTIVACIÓN FÍSICA
      rawAiOutput.days[2].activities[4] = {
        category: 'ACTIVACIÓN FÍSICA',
        objective: 'Movimiento libre en colchoneta',
        proceduralAction:
          'Inicio: Disponer área suave.\nDesarrollo: Estimular gateo hacia objetos llamativos.\nCierre: Respiración suave y descanso.\nAdaptaciones: Respetar ritmo de cada lactante.',
        materialRefs: ['MAT-2'],
        durationMinutes: 15,
        progression: {
          role: 'EXPLORE',
          revisitsSlot: null,
          repetitionPurpose: null,
          variationDimensions: null,
          observationTarget: 'Gateo libre',
        },
      };

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
      };
      const source = new AIWeeklyPlanningProposalSource(mockExecutor);

      await expect(source.propose(labControlRequest)).rejects.toThrow(
        /Day WEDNESDAY is missing the required daily reading activity/i
      );
    });

    // 4. Cinco actividades mínimas por día: requisito conservado.
    it('4. Cinco actividades mínimas por día: requisito conservado', async () => {
      const rawAiOutput = generateAuthenticOpenAI25Activities();
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
      };
      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const response = await source.propose(labControlRequest);

      expect(response.days).toHaveLength(5);
      for (const day of response.days) {
        expect(day.activities.length).toBeGreaterThanOrEqual(5);
      }
    });

    // 5. Validaciones esenciales de seguridad infantil: conservadas.
    it('5. Validaciones esenciales de seguridad infantil: conservadas', async () => {
      const rawAiOutput = generateAuthenticOpenAI25Activities();
      // Inyectar riesgo de semillas crudas
      rawAiOutput.days[0].activities[0].proceduralAction =
        'Inicio: Sentar a los lactantes en círculo.\nDesarrollo: Ofrecer semillas crudas de lenteja para manipular con los dedos.\nCierre: Recoger las semillas.\nAdaptaciones: Supervisión estrecha.';

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(JSON.stringify(rawAiOutput)),
      };
      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const response = await source.propose(labControlRequest);

      const modifiedAct = response.days[0].activities[0];
      expect(modifiedAct.objective).toContain('[Propuesta IA sustituida por seguridad');
      expect(modifiedAct.description).not.toContain('semillas crudas');
    });
  });
});
