import { describe, it, expect, vi } from 'vitest';
import { RoomCatalog } from '../RoomCatalog';
import {
  AIWeeklyPlanningProposalSource,
  areActivitiesPedagogicallyRelated,
  sanitizeMaternalAMaterialActionCoherence,
  enrichMaternalARepeatedRoutines,
  createRequestScopedMaterialTable,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';
import type {
  WeeklyPlanningAIExecutor,
  WeeklyPlanningProposalRequest,
  ProposedActivity,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import { MATERNAL_A_APPROVED_ROOM_FIXTURES } from '../PedagogicalAgePolicy';

describe('SR-MD-28O — Tuning Final de Maternal A y Cierre Operativo (19–24 meses)', () => {
  const roomMaternalA = RoomCatalog.getRoom('room-maternal-a')!;

  const sampleAvailableMaterials =
    'Bloques grandes de plástico lavable, cuentos infantiles de cartón grueso, muñecos de tela, pelotas medianas de textura suave, espejo irrompible de pared, cepillos dentales infantiles, colchonetas limpias';

  const materialTable = createRequestScopedMaterialTable(
    [
      'Bloques grandes de plástico lavable',
      'cuentos infantiles de cartón grueso',
      'muñecos de tela',
      'pelotas medianas de textura suave',
      'espejo irrompible de pared',
      'cepillos dentales infantiles',
      'colchonetas limpias',
    ],
    MATERNAL_A_APPROVED_ROOM_FIXTURES
  );

  describe('1. Coherencia entre materiales y actividades (Defecto 1)', () => {
    it('corrige la inconsistencia de una actividad de relajación que declara lavabo infantil', () => {
      const incoherentFridayActivity: ProposedActivity = {
        category: 'AMBIENTES DE APRENDIZAJE',
        objective: 'Fomentar los hábitos de higiene bucal y la limpieza.',
        description:
          'Inicio: Se dispone el espacio con música instrumental suave y colchonetas limpias.\nDesarrollo: La asistente invita a las niñas y niños a descalzarse con ayuda afectuosa y recostarse relajados sobre las colchonetas respirando con tranquilidad mientras escuchan la melodía.\nCierre: Transición pacífica al descanso con una caricia y guardado de zapatos.\nAdaptaciones: Acompañar con mayor cercanía a quienes requieren apoyo para relajarse.',
        durationMinutes: 20,
        materials: ['lavabo o tarja infantil para hábitos de higiene'],
      };

      const sanitized = sanitizeMaternalAMaterialActionCoherence(
        incoherentFridayActivity,
        materialTable
      );

      // El lavabo infantil debe ser removido y sustituido por colchonetas limpias de la sala
      expect(sanitized.materials).not.toContain('lavabo o tarja infantil para hábitos de higiene');
      expect(sanitized.materials).toContain('colchonetas limpias');
      // El objetivo debe alinearse con la relajación y autorregulación, no con la higiene bucal
      expect(sanitized.objective).toContain('autorregulación');
      expect(sanitized.objective).not.toContain('higiene');
      expect(sanitized.description).toContain('recostarse');
    });

    it('no agrega materiales que no estén disponibles en la tabla de materiales autorizados', () => {
      const emptyTable = createRequestScopedMaterialTable([], []);
      const relaxationActivity: ProposedActivity = {
        category: 'AMBIENTES DE APRENDIZAJE',
        objective: 'Promover la relajación corporal.',
        description:
          'Inicio: En el suelo.\nDesarrollo: Recostarse en relajación con música suave.\nCierre: Descanso.\nAdaptaciones: Individual.',
        durationMinutes: 15,
        materials: ['lavabo o tarja infantil para hábitos de higiene'],
      };

      const sanitized = sanitizeMaternalAMaterialActionCoherence(relaxationActivity, emptyTable);
      expect(sanitized.materials).toHaveLength(0);
    });
  });

  describe('2. Repeticiones pedagógicas con variación observable (Defecto 2)', () => {
    it('mantiene la repetición del lavado de manos el miércoles enriqueciéndola con autonomía infantil', () => {
      const days = [
        {
          dayOfWeek: 'MONDAY' as const,
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE' as const,
              objective: 'Favorecer el lavado de manos con apoyo sensible de la docente.',
              description:
                'Inicio: Acercar a los niños al lavabo.\nDesarrollo: La asistente guía el lavado de manos mano a mano con agua templada y jabón neutro.\nCierre: Secado cariñoso.\nAdaptaciones: Acompañamiento cercano.',
              durationMinutes: 15,
              materials: ['lavabo o tarja infantil para hábitos de higiene'],
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY' as const,
          activities: [],
        },
        {
          dayOfWeek: 'WEDNESDAY' as const,
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE' as const,
              objective: 'Favorecer el lavado de manos con apoyo sensible de la docente.',
              description:
                'Inicio: Acercar a los niños al lavabo.\nDesarrollo: La asistente guía el lavado de manos mano a mano con agua templada y jabón neutro.\nCierre: Secado cariñoso.\nAdaptaciones: Acompañamiento cercano.',
              durationMinutes: 15,
              materials: ['lavabo o tarja infantil para hábitos de higiene'],
            },
          ],
        },
      ];

      const enriched = enrichMaternalARepeatedRoutines(days, 'MATERNAL_A');

      // La repetición se mantiene como lavado de manos (NO se sustituye artificialmente)
      expect(enriched[2].activities[0].materials).toContain('lavabo o tarja infantil para hábitos de higiene');
      // El miércoles incorpora una variación observable de autonomía y agencia infantil
      expect(enriched[2].activities[0].description).toMatch(/autonomía|frotan activamente/i);
      expect(enriched[2].activities[0].objective).toMatch(/autonomía/i);
    });

    it('mantiene la repetición del secado de manos el jueves con incremento de iniciativa', () => {
      const days = [
        {
          dayOfWeek: 'TUESDAY' as const,
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE' as const,
              objective: 'Promover el secado guiado de manos.',
              description:
                'Inicio: Presentar toalla limpia.\nDesarrollo: Secado guiado de manos con toallas limpias individuales nombrando las palmas.\nCierre: Guardar toalla.\nAdaptaciones: Cuidado.',
              durationMinutes: 12,
              materials: ['lavabo o tarja infantil para hábitos de higiene'],
            },
          ],
        },
        {
          dayOfWeek: 'THURSDAY' as const,
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE' as const,
              objective: 'Promover el secado guiado de manos.',
              description:
                'Inicio: Presentar toalla limpia.\nDesarrollo: Secado guiado de manos con toallas limpias individuales nombrando las palmas.\nCierre: Guardar toalla.\nAdaptaciones: Cuidado.',
              durationMinutes: 12,
              materials: ['lavabo o tarja infantil para hábitos de higiene'],
            },
          ],
        },
      ];

      const enriched = enrichMaternalARepeatedRoutines(days, 'MATERNAL_A');

      expect(enriched[1].activities[0].description).toMatch(/autónoma|propia toalla/i);
      expect(enriched[1].activities[0].objective).toMatch(/autónomo/i);
    });
  });

  describe('3. Progresión semanal alineada con la experiencia real (Defecto 3)', () => {
    it('reconoce que bloques en martes no están pedagógicamente relacionados con telas en lunes', () => {
      const actTelasLunes = {
        category: 'AMBIENTES DE APRENDIZAJE',
        objective: 'Estimular la exploración sensorial táctil.',
        proceduralAction: 'Inicio: Disponer telas suaves. Desarrollo: Explorar texturas de tela con las manos. Cierre: Guardar. Adaptaciones: Respeto.',
        materials: ['telas suaves de texturas variadas'],
      };

      const actBloquesMartes = {
        category: 'PENSAMIENTO MATEMÁTICO',
        objective: 'Favorecer la coordinación motriz y la noción espacial.',
        proceduralAction: 'Inicio: Presentar bloques grandes. Desarrollo: Apilar torres de bloques grandes de plástico. Cierre: Derribe suave. Adaptaciones: Base baja.',
        materials: ['bloques grandes de plástico lavable'],
      };

      // No deben considerarse pedagógicamente relacionados
      expect(areActivitiesPedagogicallyRelated(actTelasLunes, actBloquesMartes)).toBe(false);
    });

    it('reconoce que lectura en martes sí está pedagógicamente relacionada con lectura en lunes', () => {
      const actLecturaLunes = {
        category: 'LECTURA EN VOZ ALTA',
        objective: 'Favorecer el vínculo afectivo y la atención compartida mediante la literatura.',
        proceduralAction: 'Inicio: Mostrar portada del cuento «¿Dónde está Spot?». Desarrollo: Lectura con entonación suave. Cierre: Respiración. Adaptaciones: Acercamiento.',
        materials: ['cuentos infantiles de cartón grueso'],
      };

      const actLecturaMartes = {
        category: 'LECTURA EN VOZ ALTA',
        objective: 'Estimular el lenguaje expresivo mediante la relectura con onomatopeyas.',
        proceduralAction: 'Inicio: Reencontrarse con Spot. Desarrollo: Releer con sonidos de animales («¡guau!»). Cierre: Canción. Adaptaciones: Repetición.',
        materials: ['cuentos infantiles de cartón grueso'],
      };

      expect(areActivitiesPedagogicallyRelated(actLecturaLunes, actLecturaMartes)).toBe(true);
    });

    it('impide declarar continuidad falsa cuando se introducen bloques el martes sin antecedente en lunes', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Exploración progresiva semanal',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Favorecer el vínculo con la literatura infantil.',
                  proceduralAction: 'Inicio: Portada de Spot. Desarrollo: Lectura pausada de {material}. Cierre: Guardado. Adaptaciones: Ritmo.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'EXPLORE',
                    observationTarget: 'Observar atención visual.',
                  },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Promover la exploración sensorial táctil.',
                  proceduralAction: 'Inicio: Disponer telas suaves. Desarrollo: Acariciar telas suaves de colores. Cierre: Canto. Adaptaciones: Libre.',
                  materialRefs: ['muñecos de tela'],
                  durationMinutes: 15,
                  progression: {
                    role: 'EXPLORE',
                    observationTarget: 'Observar prensión de telas.',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'TUESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Estimular el lenguaje con sonidos interactivos.',
                  proceduralAction: 'Inicio: Saludar a Spot. Desarrollo: Releer {material} modulando onomatopeyas. Cierre: Rima. Adaptaciones: Imitación.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'REVISIT',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'FAMILIARIZATION',
                    variationDimensions: ['INTERACTION_MODE'],
                    observationTarget: 'Observar imitación de ladridos.',
                  },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Promover la coordinación visomotriz mediante el apilado.',
                  proceduralAction: 'Inicio: Disponer bloques grandes en tapete. Desarrollo: Apilar torres de 2 a 3 bloques y derribar suavemente. Cierre: Orden. Adaptaciones: Base baja.',
                  materialRefs: ['bloques grandes de plástico lavable'],
                  durationMinutes: 10,
                  progression: {
                    // La IA declaró falsamente que los bloques del martes retoman la slot D1_A2 (que eran telas)
                    role: 'REVISIT',
                    revisitsSlot: 'D1_A2',
                    repetitionPurpose: 'VARIATION',
                    variationDimensions: ['INTERACTION_MODE'],
                    observationTarget: 'Observar apilado de bloques.',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'WEDNESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Fomentar la búsqueda activa y participación motriz.',
                  proceduralAction: 'Inicio: Mostrar solapas. Desarrollo: Buscar solapas en {material}. Cierre: Guardar. Adaptaciones: Señalamiento.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'VARY',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'VARIATION',
                    variationDimensions: ['CHILD_AGENCY'],
                    observationTarget: 'Observar levantamiento de solapas.',
                  },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Estimular la noción espacial mediante la alineación.',
                  proceduralAction: 'Inicio: Disponer bloques grandes en el suelo. Desarrollo: Alinear bloques formando un tren largo en el suelo. Cierre: Guardar. Adaptaciones: Apoyo.',
                  materialRefs: ['bloques grandes de plástico lavable'],
                  durationMinutes: 12,
                  progression: {
                    // Los bloques del miércoles SÍ retoman legítimamente los bloques del martes (D2_A2)
                    role: 'VARY',
                    revisitsSlot: 'D2_A2',
                    repetitionPurpose: 'PROGRESSION',
                    variationDimensions: ['INTERACTION_MODE'],
                    observationTarget: 'Observar alineación horizontal.',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'THURSDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Promover la expresión gestual mediante la narración.',
                  proceduralAction: 'Inicio: Abrir Spot. Desarrollo: Imitar gestos del cuento. Cierre: Respirar. Adaptaciones: Gestos.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'VARY',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'PROGRESSION',
                    variationDimensions: ['PEDAGOGICAL_INTENT'],
                    observationTarget: 'Observar gestos.',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'FRIDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Consolidar el goce por la lectura compartida.',
                  proceduralAction: 'Inicio: Portada. Desarrollo: Pasajes favoritos de Spot. Cierre: Canción. Adaptaciones: Pausas.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'OBSERVE_OR_CONSOLIDATE',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'RESPONSE_OBSERVATION',
                    variationDimensions: ['OBSERVATION_FOCUS'],
                    observationTarget: 'Observar disfrute.',
                  },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Promover la relajación corporal.',
                  proceduralAction: 'Inicio: Colchonetas. Desarrollo: Recostarse en colchonetas con música suave. Cierre: Descanso. Adaptaciones: Calma.',
                  materialRefs: ['colchonetas limpias'],
                  durationMinutes: 20,
                  progression: {
                    role: 'OBSERVE_OR_CONSOLIDATE',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'RESPONSE_OBSERVATION',
                    variationDimensions: ['OBSERVATION_FOCUS'],
                    observationTarget: 'Observar relajación.',
                  },
                },
              ],
            },
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const result = await source.propose({
        planningId: 'plan-maternal-continuity-test',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomMaternalA,
        currentContext: {
          observations: 'Maternal A',
          identifiedNeeds: 'Continuidad',
          specialSituations: '',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      expect(result.progression).toBeDefined();
      const exps = result.progression!.experiences;

      // Lectura del martes (D2_A1) sí retoma lectura del lunes (D1_A1)
      const lecturaMartes = exps.find((e) => e.experienceId === 'EXP-D2-A1');
      expect(lecturaMartes?.role).toBe('REVISIT');
      expect(lecturaMartes?.revisitsExperienceId).toBe('EXP-D1-A1');

      // Bloques del martes (D2_A2) NO retoman falsamente telas del lunes (D1_A2);
      // se normaliza a EXPLORE autónomo sin declarar continuidad inexistente
      const bloquesMartes = exps.find((e) => e.experienceId === 'EXP-D2-A2');
      expect(bloquesMartes?.role).toBe('EXPLORE');
      expect(bloquesMartes?.revisitsExperienceId).toBeUndefined();

      // Bloques del miércoles (D3_A2) sí retoma legítimamente bloques del martes (D2_A2)
      const bloquesMiercoles = exps.find((e) => e.experienceId === 'EXP-D3-A2');
      expect(bloquesMiercoles?.role).toBe('VARY');
      expect(bloquesMiercoles?.revisitsExperienceId).toBe('EXP-D2-A2');
    });
  });
});
