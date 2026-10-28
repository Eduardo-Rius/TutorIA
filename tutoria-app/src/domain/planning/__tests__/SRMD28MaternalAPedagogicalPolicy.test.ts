import { describe, it, expect, vi } from 'vitest';
import { RoomCatalog, Room } from '../RoomCatalog';
import {
  PedagogicalAgePolicyCatalog,
  MATERNAL_A_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_C_AGE_POLICY,
  PedagogicalSafetyValidator,
} from '../PedagogicalAgePolicy';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  WeeklyPlanningProposalRequest,
  normalizeObjectiveForMaterialAgnosticism,
  cleanDuplicatePedagogicalPhrases,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';

describe('SR-MD-28 — Política Pedagógica e Integración de IA para Maternal A (19–24 meses)', () => {
  const roomMaternalA: Room = {
    roomId: 'room-maternal-a',
    name: 'Maternal A',
    minAgeMonths: 19,
    maxAgeMonths: 24,
  };

  const sampleAvailableMaterials =
    'Bloques de construcción de plástico grande, cuentos ilustrados de cartón grueso, muñecos de tela, pelotas medianas de vinil, juguetes de arrastre con cordón corto y seguro, espejo irrompible de pared, cepillos dentales infantiles, cubetas y palas de plástico sin filos, colchonetas limpias';

  // =========================================================================
  // 1. CATÁLOGO DE SALAS Y RESOLUCIÓN DE ALIASES
  // =========================================================================
  describe('1. Catálogo de Salas y Resolución Canónica', () => {
    it('resuelve room-maternal-a en el catálogo canónico con rango etario 19 a 24 meses', () => {
      const room = RoomCatalog.getRoom('room-maternal-a');
      expect(room).toBeDefined();
      expect(room?.roomId).toBe('room-maternal-a');
      expect(room?.name).toBe('Maternal A');
      expect(room?.minAgeMonths).toBe(19);
      expect(room?.maxAgeMonths).toBe(24);
    });

    it('resuelve alias maternal-a hacia room-maternal-a de forma transparente', () => {
      const roomFromAlias = RoomCatalog.getRoom('maternal-a');
      expect(roomFromAlias).toBeDefined();
      expect(roomFromAlias?.roomId).toBe('room-maternal-a');
      expect(roomFromAlias?.name).toBe('Maternal A');
      expect(roomFromAlias?.minAgeMonths).toBe(19);
      expect(roomFromAlias?.maxAgeMonths).toBe(24);
    });

    it('el catálogo canónico contiene las salas autorizadas: Lactantes A, B, C, Maternal A y Maternal B1 (SR-MD-29)', () => {
      const allRooms = RoomCatalog.getAllRooms();
      expect(allRooms).toHaveLength(5);
      expect(allRooms.map((r) => r.roomId)).toEqual([
        'lactantes-c',
        'room-lactantes-a',
        'room-lactantes-b',
        'room-maternal-a',
        'room-maternal-b1',
      ]);
    });
  });

  // =========================================================================
  // 2. POLÍTICA PEDAGÓGICA Y AUTORIZACIÓN SOBERANA DE IA
  // =========================================================================
  describe('2. Política Pedagógica y Gobernanza de IA', () => {
    it('resuelve MATERNAL_A_AGE_POLICY por roomId, alias y por rango de edad (19–24m)', () => {
      const byRoom = PedagogicalAgePolicyCatalog.getPolicyForRoom(roomMaternalA);
      expect(byRoom).toBe(MATERNAL_A_AGE_POLICY);
      expect(byRoom?.roomType).toBe('MATERNAL_A');
      expect(byRoom?.minAgeMonths).toBe(19);
      expect(byRoom?.maxAgeMonths).toBe(24);

      const byAlias = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'maternal-a',
        name: 'Maternal A',
        minAgeMonths: 19,
        maxAgeMonths: 24,
      });
      expect(byAlias).toBe(MATERNAL_A_AGE_POLICY);

      const byRange = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 19,
        maxAgeMonths: 24,
      });
      expect(byRange).toBe(MATERNAL_A_AGE_POLICY);
    });

    it('confirma autorización de IA para Maternal A y rechazo fail-closed para salas no autorizadas', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(true);

      // Salas aún no autorizadas en SR-MD-28
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('PREESCOLAR_1')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('UNKNOWN')).toBe(false);
    });

    it('establece duración máxima recomendada de 25 minutos para Maternal A', () => {
      expect(MATERNAL_A_AGE_POLICY.recommendedMaxDurationMinutes).toBe(25);
    });
  });

  // =========================================================================
  // 3. REGLAS DE SEGURIDAD Y PREVENCIÓN DE RIESGOS (GT ECONÓMICA & 3D11-003-002)
  // =========================================================================
  describe('3. Reglas de Seguridad y Prevención de Riesgos en 19–24 meses', () => {
    it('rechaza piezas pequeñas, cuentas y semillas sueltas (riesgo de asfixia o broncoaspiración)', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Clasificar semillas',
                description:
                  'Inicio: Se sientan en el piso. Desarrollo: Clasifican semillas de frijol en vasos. Cierre: Guardan materiales.',
                materials: ['semillas de frijol'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-a-choking-small-parts')).toBe(true);
    });

    it('rechaza bolsas de plástico o películas de polietileno', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Globos sensoriales',
                description:
                  'Inicio: Sentados en círculo. Desarrollo: Se entrega una bolsa de plástico inflada para rebotar. Cierre: Canto.',
                materials: ['bolsa de plástico'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-a-plastic-bags-balloons')).toBe(true);
    });

    it('rechaza tijeras o navajas no aptas para 19–24 meses', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Recortado de papel',
                description:
                  'Inicio: En mesa de trabajo. Desarrollo: Usar tijeras para cortar tiras de periódico. Cierre: Limpieza.',
                materials: ['tijeras'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-a-sharp-scissors')).toBe(true);
    });

    it('rechaza cubrir el rostro o cabeza con sábanas/mantas', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: '¿Dónde está el niño?',
                description:
                  'Inicio: En colchonetas. Desarrollo: Cubrir la cabeza con una sábana y pedir que se destapen. Cierre: Aplausos.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-a-suffocation-head-covering')).toBe(true);
    });

    it('distingue advertencias preventivas con negación ("sin cubrir la cabeza", "sin usar tijeras")', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Juego del espejo y movimiento',
                description:
                  'Inicio: Frente al espejo irrompible. Desarrollo: Se colocan telas en los hombros, sin cubrir la cabeza ni el rostro, observando su imagen corporal. Cierre: Guardar telas en la canasta.',
                materials: ['espejo irrompible de pared'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      const headViolations = result.blockingViolations.filter(
        (v) => v.ruleId === 'safe-maternal-a-suffocation-head-covering'
      );
      expect(headViolations).toHaveLength(0);
    });

    it('rechaza exigencia de circuitos de obstáculos con saltos obligatorios para todo el grupo (desajuste evolutivo en 19–24m)', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Desarrollar coordinación motriz gruesa',
                description:
                  'Inicio: Se preparan colchonetas. Desarrollo: Invitar a los niños a realizar un circuito de obstáculos con saltos y agachamientos. Cierre: Momento de calma. Adaptaciones: Acompañar a quienes necesiten apoyo.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-a-milestones')).toBe(true);
    });

    it('rechaza actividades de equilibrio que incluyan saltos suaves o brincos en 19–24 meses (desajuste evolutivo SR-MD-28I)', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Favorecer el equilibrio corporal',
                description:
                  'Inicio: Se despeja el área en colchonetas. Desarrollo: Invitar a los niños a realizar saltos suaves sobre las colchonetas alternando ritmos. Cierre: Aplausos afectuosos. Adaptaciones: Sostener la mano de quienes lo requieran.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-a-milestones')).toBe(true);
    });

    it('admite desplazamientos autónomos, marcha libre y sorteo de desniveles bajos con acompañamiento sensible', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Favorecer el equilibrio y la marcha autónoma',
                description:
                  'Inicio: Se despeja el área en colchonetas. Desarrollo: Los niños caminan libremente sorteando cojines bajos en el suelo a su propio ritmo. Cierre: Transición tranquila cantando una melodía suave. Adaptaciones: Tomar de la mano a quienes aún caminan con cautela.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_A_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(true);
      expect(result.blockingViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. INTEGRACIÓN CON EJECUTOR DE IA (PROMPT & ESTRUCTURA DE 25 ACTIVIDADES)
  // =========================================================================
  describe('4. Integración con Ejecutor de IA y Generación Auténtica', () => {
    it('construye el prompt especializado para Maternal A con directrices de la GT Económica', async () => {
      let capturedSystemPrompt = '';

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockImplementation(async (payload: any) => {
          capturedSystemPrompt = payload.systemPrompt || '';
          return {
            weeklyFocus: 'Desarrollo de autonomía, lenguaje y esquema corporal',
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day, dIdx) => ({
              dayOfWeek: day,
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: `Lectura compartida del día ${dIdx + 1}`,
                  proceduralAction: `Inicio: Se invita al grupo al tapete y se muestra la portada. Desarrollo: Abrir el libro y nombrar ilustraciones señalando personajes con calidez. Cierre: Cerrar el libro con aplausos afectivos. Adaptaciones: Quienes caminan exploran de pie; apoyo en suelo a quienes descansan sentados.`,
                  materialRefs: ['cuentos ilustrados de cartón grueso'],
                  durationMinutes: 15,
                  progression: {
                    role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
                    observationTarget: 'Señalamiento y atención compartida.',
                  },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: `Juego de roles e imitación del día ${dIdx + 1}`,
                  proceduralAction: `Inicio: Se presentan los muñecos. Desarrollo: Arrollar a los muñecos y cantar una canción corta modelando palabras cotidianas. Cierre: Guardar en la cesta cantando rima. Adaptaciones: Modelado gestual individualizado.`,
                  materialRefs: ['muñecos de tela'],
                  durationMinutes: 20,
                  progression: {
                    role: 'EXPLORE',
                    observationTarget: 'Imitación de sonidos y palabras simples.',
                  },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: `Juegos de arrastre y desplazamiento del día ${dIdx + 1}`,
                  proceduralAction: `Inicio: Se despeja el área en colchonetas. Desarrollo: Los niños jalan sus juguetes de arrastre sorteando pequeños cojines con autonomía. Cierre: Colocar los juguetes en el estante bajo. Adaptaciones: Asistencia en la sujeción del cordón corto para mayor equilibrio.`,
                  materialRefs: ['juguetes de arrastre con cordón corto y seguro', 'colchonetas limpias'],
                  durationMinutes: 20,
                  progression: {
                    role: 'EXPLORE',
                    observationTarget: 'Coordinación motriz y equilibrio al caminar jalando el objeto.',
                  },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: `Construcción y apilamiento del día ${dIdx + 1}`,
                  proceduralAction: `Inicio: Se colocan bloques grandes en el piso. Desarrollo: Los niños apilan y derriban torres de bloques explorando causa-efecto con risas. Cierre: Guardar juntos los bloques en el contenedor. Adaptaciones: Ofrecer bloques ligeros de fácil agarre.`,
                  materialRefs: ['bloques de construcción de plástico grande'],
                  durationMinutes: 20,
                  progression: {
                    role: 'EXPLORE',
                    observationTarget: 'Coordinación bimanual y prensión.',
                  },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: `Esquema corporal y hábitos del día ${dIdx + 1}`,
                  proceduralAction: `Inicio: Se colocan frente al espejo irrompible. Desarrollo: Señalar ojos, nariz y boca frente al espejo y nombrar las partes del cuerpo. Cierre: Abrazo afectivo frente a su reflejo. Adaptaciones: Acompañamiento individual señalando suavemente en su propio reflejo.`,
                  materialRefs: ['espejo irrompible de pared'],
                  durationMinutes: 15,
                  progression: {
                    role: 'EXPLORE',
                    observationTarget: 'Auto-reconocimiento en el espejo y vocabulario corporal.',
                  },
                },
              ],
            })),
          };
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);

      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-maternal-a-2026-w35',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomMaternalA,
        currentContext: {
          observations: 'Maternal A en proceso de consolidación de marcha, hábitos y lenguaje.',
          identifiedNeeds: 'Control de esfínteres incipiente, turnos y hábitos de guardar.',
          specialSituations: 'Niña con timidez ante actividades grupales grandes.',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const result = await source.propose(request);

      expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
      expect(capturedSystemPrompt).toContain('MATERNAL A (19 A 24 MESES)');
      expect(capturedSystemPrompt).toContain('19 a 24 meses');
      expect(capturedSystemPrompt).toContain('GT ECONÓMICA');
      expect(capturedSystemPrompt).toContain('25 ACTIVIDADES ÚNICAS');
      expect(capturedSystemPrompt).toContain('INICIO, DESARROLLO, CIERRE, ADAPTACIONES');
      expect(capturedSystemPrompt).toContain('DIVERSIFICACIÓN DIARIA Y PROGRESIÓN SEMANAL OBSERVABLE');
      expect(capturedSystemPrompt).toContain('NO EXIGIR SALTOS NI CIRCUITOS UNIFORMES');
      expect(capturedSystemPrompt).toContain('ALINEACIÓN ESTRICTA DEL ENFOQUE SEMANAL');
      expect(capturedSystemPrompt).toContain('HÁBITOS DE HIGIENE Y AUTONOMÍA');
      expect(capturedSystemPrompt).toContain('TÍTULO Y AUTOR OBLIGATORIOS');
      expect(capturedSystemPrompt).toContain('IDENTIFICACIÓN EXPLÍCITA DE TÍTULO Y AUTOR');
      expect(capturedSystemPrompt).toContain('REGLA OBLIGATORIA DE TRANSFORMACIÓN CUANDO SE RETOMAN EXPERIENCIAS');
      expect(capturedSystemPrompt).toContain('PROHIBIDO usar fórmulas vagas como "ofrecer apoyo a los niños que lo necesiten"');
      expect(capturedSystemPrompt).toContain('PROHIBICIÓN ESTRICTA DE SALTOS Y BRINCOS (CERO SALTOS EN MATERNAL A)');
      expect(capturedSystemPrompt).toContain('COHERENCIA MATERIAL BIUNÍVOCA ENTRE DECLARACIÓN Y ACCIÓN');
      expect(capturedSystemPrompt).toContain('PROGRESIÓN SEMANAL OBSERVABLE EN LAS ACCIONES');
      expect(capturedSystemPrompt).toContain('PROHIBICIÓN DE MATERIALES FANTASMA O RECURSOS NO DECLARADOS EN LA DESCRIPCIÓN');

      // Verifica que el plan generado contiene 5 días y 5 actividades por día (25 totales)
      expect(result.days).toHaveLength(5);
      for (const day of result.days) {
        expect(day.activities).toHaveLength(5);
        for (const act of day.activities) {
          expect(act.description).toContain('Inicio:');
          expect(act.description).toContain('Desarrollo:');
          expect(act.description).toContain('Cierre:');
          expect(act.description).toContain('Adaptaciones:');
          expect(act.durationMinutes).toBeGreaterThanOrEqual(10);
          expect(act.durationMinutes).toBeLessThanOrEqual(25);
        }
      }
    });

    it('bloquea mediante compuerta de seguridad si la IA propone materiales no permitidos o tijeras peligrosas', async () => {
      const mockUnsafeExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Manualidades peligrosas',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [1, 2, 3, 4, 5].map((idx) => ({
              category: idx === 1 ? 'LECTURA EN VOZ ALTA' : 'EXPRESIÓN ARTÍSTICA',
              objective: `Recorte ${idx}`,
              proceduralAction: `Inicio: En la mesa. Desarrollo: Se dan tijeras afiladas para cortar papel periódico. Cierre: Guardar. Adaptaciones: Curricular: apoyo. Individual: supervisión.`,
              materialRefs: ['tijeras'],
              durationMinutes: 20,
              progression: {
                role: 'EXPLORE',
                observationTarget: 'Recorte.',
              },
            })),
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockUnsafeExecutor);

      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-maternal-unsafe',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomMaternalA,
        currentContext: {
          observations: 'Maternal A',
          identifiedNeeds: 'Arte',
          specialSituations: '',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      await expect(source.propose(request)).rejects.toThrow();
    });

    it('emite advertencia (NIVEL AMARILLO) si detecta repetición literal idéntica de descripciones entre días consecutivos', () => {
      const repetitivePlan = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Movimiento en colchonetas',
                description:
                  'Inicio: Preparar el espacio con colchonetas limpias. Desarrollo: Invitar a los niños a moverse libremente sobre colchonetas. Cierre: Reunir para momento de calma. Adaptaciones: Acompañar a quienes lo requieran.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
          {
            dayOfWeek: 'TUESDAY',
            activities: [
              {
                objective: 'Movimiento repetido exactamente',
                description:
                  'Inicio: Preparar el espacio con colchonetas limpias. Desarrollo: Invitar a los niños a moverse libremente sobre colchonetas. Cierre: Reunir para momento de calma. Adaptaciones: Acompañar a quienes lo requieran.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        repetitivePlan,
        MATERNAL_A_AGE_POLICY,
        sampleAvailableMaterials,
        { checkPedagogicalVariation: true }
      );

      expect(evalResult.warnings.some((w) => w.ruleId === 'progression-literal-repetition-without-variation')).toBe(true);
      expect(evalResult.isPedagogicallySafe).toBe(true); // Las advertencias de variación no bloquean fatalmente pero alertan al sistema
    });
  });

  // =========================================================================
  // 5. INVARIANTE DE NO REGRESIÓN: LACTANTES A, B Y C
  // =========================================================================
  describe('5. Invariantes de No Regresión para Lactantes A, B y C', () => {
    it('Lactantes A resuelve su política (0–6m) con prohibición de gateo y masas', () => {
      const polA = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'room-lactantes-a',
        name: 'Lactantes A',
        minAgeMonths: 0,
        maxAgeMonths: 6,
      });
      expect(polA).toBe(LACTANTES_A_AGE_POLICY);
      expect(polA?.roomType).toBe('LACTANTES_A');
    });

    it('Lactantes B resuelve su política (7–12m) con Anti-Sofocación y Anti-Asfixia', () => {
      const polB = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'room-lactantes-b',
        name: 'Lactantes B',
        minAgeMonths: 7,
        maxAgeMonths: 12,
      });
      expect(polB).toBe(LACTANTES_B_AGE_POLICY);
      expect(polB?.roomType).toBe('LACTANTES_B');
    });

    it('Lactantes C resuelve su política (13–18m) y alias lactantes-c', () => {
      const polC = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'lactantes-c',
        name: 'Lactantes C',
        minAgeMonths: 13,
        maxAgeMonths: 18,
      });
      expect(polC).toBe(LACTANTES_C_AGE_POLICY);
      expect(polC?.roomType).toBe('LACTANTES_C');
    });
  });

  // =========================================================================
  // 6. PRUEBAS DE REGRESIÓN: DEFECTOS AUDITADOS MASTER ARB SR-MD-28K
  // =========================================================================
  describe('6. Correcciones Focalizadas y Regresión SR-MD-28K (Maternal A)', () => {
    const fakeTable = {
      entries: [
        { refId: 'MAT-1', displayName: 'bloques grandes de plástico lavable', source: 'EDUCATOR_AVAILABLE' as const },
        { refId: 'MAT-2', displayName: 'cuentos infantiles de cartón grueso', source: 'EDUCATOR_AVAILABLE' as const },
        { refId: 'MAT-3', displayName: 'muñecos de tela', source: 'EDUCATOR_AVAILABLE' as const },
        { refId: 'MAT-4', displayName: 'pelotas medianas de textura suave', source: 'EDUCATOR_AVAILABLE' as const },
        { refId: 'MAT-5', displayName: 'espejo irrompible de pared', source: 'EDUCATOR_AVAILABLE' as const },
        { refId: 'MAT-6', displayName: 'colchonetas limpias', source: 'APPROVED_ROOM_FIXTURE' as const },
        { refId: 'MAT-7', displayName: 'lavabo y toallas limpias', source: 'APPROVED_ROOM_FIXTURE' as const },
      ],
      refMap: new Map(),
    };

    it('defecto 6: normalizeObjectiveForMaterialAgnosticism elimina conectores truncados («a través de.», «a través del juego.») y asegura punto final', () => {
      const truncated1 = 'Favorecer la coordinación visomotriz a través de bloques grandes de plástico lavable.';
      const cleaned1 = normalizeObjectiveForMaterialAgnosticism(truncated1, fakeTable);
      expect(cleaned1).toBe('Favorecer la coordinación visomotriz.');
      expect(cleaned1).not.toContain('a través de');
      expect(cleaned1.endsWith('.')).toBe(true);

      const truncated2 = 'Estimular el lenguaje y la imaginación mediante el uso de cuentos infantiles de cartón grueso.';
      const cleaned2 = normalizeObjectiveForMaterialAgnosticism(truncated2, fakeTable);
      expect(cleaned2).toBe('Estimular el lenguaje y la imaginación.');
      expect(cleaned2).not.toContain('mediante el uso de');
      expect(cleaned2.endsWith('.')).toBe(true);

      const truncated3 = 'Fortalecer el vínculo afectivo a través del juego con muñecos de tela.';
      const cleaned3 = normalizeObjectiveForMaterialAgnosticism(truncated3, fakeTable);
      expect(cleaned3).toBe('Fortalecer el vínculo afectivo.');
      expect(cleaned3).not.toContain('a través del juego');
      expect(cleaned3.endsWith('.')).toBe(true);
    });

    it('defecto 6: cleanDuplicatePedagogicalPhrases sustituye referencias a texturas no confirmadas en libros de cartón', () => {
      const text = 'Inicio: La asistente invita a explorar las texturas del libro de cartón. Desarrollo: Se hojea el cuento.';
      const cleaned = cleanDuplicatePedagogicalPhrases(text);
      expect(cleaned).not.toContain('texturas del libro');
      expect(cleaned).toContain('tocar y hojear las páginas del cuento');
    });

    it('defecto 5: preserva roles de progresión relacionales (REVISIT, VARY, OBSERVE_OR_CONSOLIDATE) en Maternal A', async () => {
      const mockProgressionExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Progresión motriz, hábitos y juego simbólico',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Presentar el cuento y el personaje principal.',
                  proceduralAction: 'Inicio: Sentados en colchoneta. Desarrollo: Presentar {material}. Cierre: Cantar melodía. Adaptaciones: Respetar ritmo.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: { role: 'EXPLORE', observationTarget: 'Observar atención inicial.' },
                },
              ],
            },
            {
              dayOfWeek: 'TUESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Estimular la imitación sonora y onomatopeyas.',
                  proceduralAction: 'Inicio: Mostrar portada. Desarrollo: Releer {material} haciendo sonidos. Cierre: Aplauso suave. Adaptaciones: Acompañar balbuceo.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'REVISIT',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'FAMILIARIZATION',
                    variationDimensions: ['INTERACTION_MODE'],
                    observationTarget: 'Observar imitación de sonidos.',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'WEDNESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Promover la participación motriz descubriendo personajes.',
                  proceduralAction: 'Inicio: Mostrar libro. Desarrollo: Abrir solapas de {material}. Cierre: Despedida. Adaptaciones: Apoyo en pinza.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'VARY',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'VARIATION',
                    variationDimensions: ['CHILD_AGENCY'],
                    observationTarget: 'Observar señalamiento activo.',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'THURSDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Favorecer la expresión gestual y corporal del relato.',
                  proceduralAction: 'Inicio: Disponer espacio. Desarrollo: Imitar a los personajes de {material}. Cierre: Respiración. Adaptaciones: Movilidad libre.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'VARY',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'PROGRESSION',
                    variationDimensions: ['PEDAGOGICAL_INTENT'],
                    observationTarget: 'Observar dramatización espontánea.',
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
                  proceduralAction: 'Inicio: Elegir páginas preferidas. Desarrollo: Releer pasajes favoritos de {material}. Cierre: Canción de cierre. Adaptaciones: Libre descanso.',
                  materialRefs: ['cuentos infantiles de cartón grueso'],
                  durationMinutes: 12,
                  progression: {
                    role: 'OBSERVE_OR_CONSOLIDATE',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'RESPONSE_OBSERVATION',
                    variationDimensions: ['OBSERVATION_FOCUS'],
                    observationTarget: 'Observar consolidación del disfrute literario.',
                  },
                },
              ],
            },
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockProgressionExecutor);
      const result = await source.propose({
        planningId: 'plan-maternal-progression',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomMaternalA,
        currentContext: {
          observations: 'Maternal A',
          identifiedNeeds: 'Lectura',
          specialSituations: '',
          availableMaterials: 'cuentos infantiles de cartón grueso, colchonetas limpias',
        },
      });

      expect(result.progression).toBeDefined();
      expect(result.progression?.experiences).toHaveLength(5);
      expect(result.progression?.experiences[0].role).toBe('EXPLORE');
      expect(result.progression?.experiences[1].role).toBe('REVISIT');
      expect(result.progression?.experiences[1].revisitsExperienceId).toBe('EXP-D1-A1');
      expect(result.progression?.experiences[2].role).toBe('VARY');
      expect(result.progression?.experiences[3].role).toBe('VARY');
      expect(result.progression?.experiences[4].role).toBe('OBSERVE_OR_CONSOLIDATE');
    });
  });
});
