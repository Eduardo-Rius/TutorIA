import { describe, it, expect, vi } from 'vitest';
import { RoomCatalog, Room } from '../RoomCatalog';
import {
  PedagogicalAgePolicyCatalog,
  MATERNAL_B1_AGE_POLICY,
  MATERNAL_A_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_C_AGE_POLICY,
  PedagogicalSafetyValidator,
  PedagogicalWeeklyPlanCandidate,
  MATERNAL_B1_APPROVED_ROOM_FIXTURES,
  MATERNAL_B1_DEVELOPMENTAL_RULE,
} from '../PedagogicalAgePolicy';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  WeeklyPlanningProposalRequest,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';
import { validateActivityProgressionCorrespondence } from '../../../application/planning/WeeklyPlanningProposalSource';

describe('SR-MD-29 — Política Pedagógica e Integración de IA para Maternal B1 (25–30 meses)', () => {
  const roomMaternalB1: Room = {
    roomId: 'room-maternal-b1',
    name: 'Maternal B1',
    minAgeMonths: 25,
    maxAgeMonths: 30,
  };

  const sampleAvailableMaterials =
    'Bloques grandes de plástico lavable, cuentos ilustrados infantiles, muñecos de tela, pelotas medianas de vinil, aros plásticos grandes, colchonetas limpias, masa casera para modelar no tóxica, crayones gruesos de cera, lavabo infantil con toallas limpias, cajas de cartón limpias';

  // =========================================================================
  // 1. CATÁLOGO DE SALAS Y RESOLUCIÓN CANÓNICA
  // =========================================================================
  describe('1. Catálogo de Salas y Resolución Canónica', () => {
    it('resuelve room-maternal-b1 en el catálogo canónico con rango etario 25 a 30 meses', () => {
      const room = RoomCatalog.getRoom('room-maternal-b1');
      expect(room).toBeDefined();
      expect(room?.roomId).toBe('room-maternal-b1');
      expect(room?.name).toBe('Maternal B1');
      expect(room?.minAgeMonths).toBe(25);
      expect(room?.maxAgeMonths).toBe(30);
    });

    it('resuelve alias maternal-b1 hacia room-maternal-b1 de forma transparente', () => {
      const roomFromAlias = RoomCatalog.getRoom('maternal-b1');
      expect(roomFromAlias).toBeDefined();
      expect(roomFromAlias?.roomId).toBe('room-maternal-b1');
      expect(roomFromAlias?.name).toBe('Maternal B1');
      expect(roomFromAlias?.minAgeMonths).toBe(25);
      expect(roomFromAlias?.maxAgeMonths).toBe(30);
    });

    it('el catálogo canónico contiene exactamente 5 salas autorizadas: Lactantes A, B, C, Maternal A y Maternal B1', () => {
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
  // 2. POLÍTICA PEDAGÓGICA Y GOBERNANZA DE IA
  // =========================================================================
  describe('2. Política Pedagógica y Gobernanza de IA', () => {
    it('resuelve MATERNAL_B1_AGE_POLICY por roomId, alias y por rango de edad (25–30m)', () => {
      const byRoom = PedagogicalAgePolicyCatalog.getPolicyForRoom(roomMaternalB1);
      expect(byRoom).toBe(MATERNAL_B1_AGE_POLICY);
      expect(byRoom?.roomType).toBe('MATERNAL_B1');
      expect(byRoom?.minAgeMonths).toBe(25);
      expect(byRoom?.maxAgeMonths).toBe(30);

      const byAlias = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'maternal-b1',
        name: 'Maternal B1',
        minAgeMonths: 25,
        maxAgeMonths: 30,
      });
      expect(byAlias).toBe(MATERNAL_B1_AGE_POLICY);

      const byRange = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 25,
        maxAgeMonths: 30,
      });
      expect(byRange).toBe(MATERNAL_B1_AGE_POLICY);
    });

    it('confirma autorización de IA para Maternal B1 y rechazo fail-closed para salas no autorizadas', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B1')).toBe(true);

      // Salas aún no autorizadas
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B2')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C1')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('PREESCOLAR_1')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('UNKNOWN')).toBe(false);
    });

    it('establece duración máxima recomendada de 25 minutos para Maternal B1', () => {
      expect(MATERNAL_B1_AGE_POLICY.recommendedMaxDurationMinutes).toBe(25);
    });
  });

  // =========================================================================
  // 3. REGLAS DE SEGURIDAD Y PREVENCIÓN DE RIESGOS (25–30 MESES)
  // =========================================================================
  describe('3. Reglas de Seguridad y Prevención de Riesgos en 25–30 meses', () => {
    it('rechaza piezas pequeñas, cuentas y semillas sueltas (riesgo de asfixia o atragantamiento)', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Favorecer la motricidad fina y la clasificación',
                description:
                  'Inicio: En mesa baja. Desarrollo: Clasifican semillas de frijol en recipientes pequeños. Cierre: Guardan materiales cantando. Adaptaciones: Guiar a quien lo necesite.',
                materials: ['semillas de frijol'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-choking-small-parts')).toBe(true);
    });

    it('rechaza bolsas de plástico o películas de polietileno', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Estimular la exploración sensorial y el juego',
                description:
                  'Inicio: Sentados en colchoneta. Desarrollo: Se infla una bolsa de plástico para jugar a atraparla. Cierre: Canto de despedida. Adaptaciones: Acompañar a los tímidos.',
                materials: ['bolsa de plástico'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-plastic-bags-balloons')).toBe(true);
    });

    it('rechaza tijeras punzocortantes no aptas para 25–30 meses', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Promover la coordinación visomotriz bimanual',
                description:
                  'Inicio: En mesa de trabajo. Desarrollo: Usar tijeras con filo para recortar papel periódico. Cierre: Guardar tijeras. Adaptaciones: Modelado con la educadora.',
                materials: ['tijeras'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-sharp-scissors')).toBe(true);
    });

    it('rechaza cubrir la cabeza o el rostro con telas o sábanas', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Promover la permanencia del objeto y el juego',
                description:
                  'Inicio: En colchoneta limpia. Desarrollo: Cubrir la cabeza con una manta gruesa y esperar a que el niño se la quite. Cierre: Risas y aplausos. Adaptaciones: Respetar tiempos.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-suffocation-head-covering')).toBe(true);
    });

    it('distingue advertencias preventivas con negación ("sin cubrir la cabeza", "sin tijeras")', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Explorar nociones corporales y espaciales en el espejo',
                description:
                  'Inicio: Frente al espejo de seguridad. Desarrollo: Colocan telas sobre sus hombros, sin cubrir la cabeza ni el rostro, observando su reflejo en el espejo. Cierre: Guardan telas en la canasta. Adaptaciones: Apoyo verbal sensible.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      const headViolations = result.blockingViolations.filter(
        (v) => v.ruleId === 'safe-maternal-b1-suffocation-head-covering'
      );
      expect(headViolations).toHaveLength(0);
    });

    it('rechaza exigencias de escolarización formal (planas, trazos rígidos o grafomotricidad formal)', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Iniciación a la escritura formal',
                description:
                  'Inicio: En mesas de trabajo. Desarrollo: Exigir trazar letras del abecedario y hacer planas en hojas de papel. Cierre: Calificar con estrellitas. Adaptaciones: Guiar la mano.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-b1-milestones')).toBe(true);
    });

    it('rechaza saltos desde alturas peligrosas (mesas, sillas o muebles altos)', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Desarrollar el valor y la coordinación motriz',
                description:
                  'Inicio: Subir a las sillas. Desarrollo: Saltar desde mesas y sillas hacia el suelo. Cierre: Celebrar el salto. Adaptaciones: Sostener a quienes tengan miedo.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-b1-milestones')).toBe(true);
    });

    it('admite desplazamientos motores, imitación de ranitas a nivel de piso sobre colchonetas', () => {
      const candidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Favorecer la coordinación motriz gruesa y el equilibrio dinámico',
                description:
                  'Inicio: Se despeja el área en colchonetas limpias. Desarrollo: Las niñas y niños imitan saltos de ranitas en el suelo sobre las colchonetas limpias, avanzando a su propio ritmo. Cierre: Transición tranquila cantando «Había una ranita». Adaptaciones: Apoyo sensible con la mano para quienes lo soliciten.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const result = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(result.isPedagogicallySafe).toBe(true);
      expect(result.blockingViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. INTEGRACIÓN CON EJECUTOR DE IA Y GENERACIÓN AUTÉNTICA
  // =========================================================================
  describe('4. Integración con Ejecutor de IA y Generación Auténtica', () => {
    it('construye el prompt especializado para Maternal B1 con directrices de la GT Económica y SR-MD-29', async () => {
      let capturedSystemPrompt = '';

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockImplementation(async (payload: any) => {
          capturedSystemPrompt = payload.systemPrompt || '';
          return {
            weeklyFocus: 'Consolidación del lenguaje expresivo, juego simbólico e inicio de autonomía',
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day, dIdx) => ({
              dayOfWeek: day,
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: `Fomentar la escucha activa y el lenguaje gestual en día ${dIdx + 1}`,
                  proceduralAction:
                    'Inicio: Sentados en círculo afectivo. Desarrollo: Leen y señalan ilustraciones en cuento infantil. Cierre: Canto suave. Adaptaciones: Acercar el cuento a quienes lo requieran.',
                  materialRefs: ['cuentos ilustrados infantiles'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Descubrimiento sensorial' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: `Favorecer la coordinación motriz gruesa en día ${dIdx + 1}`,
                  proceduralAction:
                    'Inicio: Despejar colchonetas. Desarrollo: Desplazamientos en colchonetas limpias rodando pelotas. Cierre: Respiración suave. Adaptaciones: Acompañamiento sensible.',
                  materialRefs: ['colchonetas limpias', 'pelotas medianas de vinil'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Exploración motriz' },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: `Desarrollar la clasificación elemental de objetos en día ${dIdx + 1}`,
                  proceduralAction:
                    'Inicio: Colocar bloques grandes. Desarrollo: Agrupan bloques grandes de plástico lavable por color evidente. Cierre: Guardar cantando. Adaptaciones: Modelado pausado.',
                  materialRefs: ['bloques grandes de plástico lavable'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Construcción cognitiva' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: `Promover la afectividad y el juego de roles en día ${dIdx + 1}`,
                  proceduralAction:
                    'Inicio: Presentar muñecos de tela. Desarrollo: Acunan y alimentan muñecos de tela afectuosamente. Cierre: Canción de cuna. Adaptaciones: Respetar preferencias.',
                  materialRefs: ['muñecos de tela'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Juego simbólico' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: `Fortalecer la autonomía en el lavado de manos en día ${dIdx + 1}`,
                  proceduralAction:
                    'Inicio: Acercarse al lavabo infantil. Desarrollo: Lavado guiado de manos en lavabo infantil secando con toalla. Cierre: Guardar toalla limpia en cesto. Adaptaciones: Apoyo mano a mano.',
                  materialRefs: ['lavabo infantil con toallas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Autonomía y hábitos' },
                },
              ],
            })),
          };
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);

      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Grupo activo de 25 a 30 meses con lenguaje expresivo en expansión y curiosidad motriz.',
          identifiedNeeds: 'Consolidar autonomía en hábitos de higiene, motricidad gruesa y clasificación de bloques.',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);

      expect(proposal).toBeDefined();
      expect(proposal.days).toHaveLength(5);
      const totalActivities = proposal.days.reduce((acc, d) => acc + d.activities.length, 0);
      expect(totalActivities).toBe(25);

      // Verificación de contención del prompt especializado para Maternal B1
      expect(capturedSystemPrompt).toContain('POLÍTICA DE RAZONAMIENTO PEDAGÓGICO Y SEGURIDAD INFANTIL PARA MATERNAL B1 (25 A 30 MESES) — SR-MD-29D:');
      expect(capturedSystemPrompt).toContain('Enfoque pedagógico centrado en la consolidación del lenguaje expresivo');
      expect(capturedSystemPrompt).toContain('PROHIBIDOS saltos obligatorios sobre aros o dentro de aros');
      expect(capturedSystemPrompt).toContain('Prohibidos objetos pequeños o desprendibles menores a 3 cm');
      expect(capturedSystemPrompt).toContain('Prohibidas tijeras punzocortantes');
      expect(capturedSystemPrompt).toContain('Prohibida la escolarización formal');
      expect(capturedSystemPrompt).toContain('LECTURA EN VOZ ALTA DIARIA CON EL CUENTO DEL CONTEXTO');
    });

    it('bloquea mediante compuerta de seguridad si la IA propone materiales no permitidos o tijeras peligrosas', async () => {
      const mockUnsafeExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Manualidades peligrosas con tijeras en Maternal B1',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [1, 2, 3, 4, 5].map((idx) => ({
              category: idx === 1 ? 'LECTURA EN VOZ ALTA' : 'EXPERIENCIAS ARTÍSTICAS',
              objective: `Recorte con herramienta ${idx}`,
              proceduralAction: `Inicio: En mesa baja. Desarrollo: Usar tijeras con filo para recortar papel periódico. Cierre: Guardar tijeras. Adaptaciones: Acompañar a los niños.`,
              materialRefs: ['tijeras'],
              durationMinutes: 15,
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
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Grupo activo de 25 a 30 meses.',
          availableMaterials: 'tijeras, papeles de periódico',
        },
      };

      await expect(source.propose(request)).rejects.toThrow(
        /Pedagogical proposal violates safety/i
      );
    });
  });

  // =========================================================================
  // 5. INVARIANTES DE NO REGRESIÓN PARA LACTANTES A, B, C Y MATERNAL A
  // =========================================================================
  describe('5. Invariantes de No Regresión para Lactantes A, B, C y Maternal A', () => {
    it('Lactantes A resuelve su política (0–6m) con prohibición de gateo y masas', () => {
      const policyLA = PedagogicalAgePolicyCatalog.getPolicyForRoom({ roomId: 'room-lactantes-a', minAgeMonths: 0, maxAgeMonths: 6 });
      expect(policyLA).toBe(LACTANTES_A_AGE_POLICY);
      expect(policyLA?.roomType).toBe('LACTANTES_A');
    });

    it('Lactantes B resuelve su política (7–12m) con Anti-Sofocación y Anti-Asfixia', () => {
      const policyLB = PedagogicalAgePolicyCatalog.getPolicyForRoom({ roomId: 'room-lactantes-b', minAgeMonths: 7, maxAgeMonths: 12 });
      expect(policyLB).toBe(LACTANTES_B_AGE_POLICY);
      expect(policyLB?.roomType).toBe('LACTANTES_B');
    });

    it('Lactantes C resuelve su política (13–18m) y alias lactantes-c', () => {
      const policyLC = PedagogicalAgePolicyCatalog.getPolicyForRoom({ roomId: 'lactantes-c', minAgeMonths: 13, maxAgeMonths: 18 });
      expect(policyLC).toBe(LACTANTES_C_AGE_POLICY);
      expect(policyLC?.roomType).toBe('LACTANTES_C');
    });

    it('Maternal A resuelve su política (19–24m) y alias maternal-a', () => {
      const policyMA = PedagogicalAgePolicyCatalog.getPolicyForRoom({ roomId: 'maternal-a', minAgeMonths: 19, maxAgeMonths: 24 });
      expect(policyMA).toBe(MATERNAL_A_AGE_POLICY);
      expect(policyMA?.roomType).toBe('MATERNAL_A');
    });
  });

  // =========================================================================
  // 6. CORRECCIÓN DE LOS CUATRO DEFECTOS PEDAGÓGICOS (SR-MD-29D)
  // =========================================================================
  describe('6. Corrección de los Cuatro Defectos Pedagógicos (SR-MD-29D)', () => {
    it('Defecto 1: sanitiza pintura dactilar y collage cuando no hay pintura ni pegamento declarados', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Exploración artística y motriz',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Lectura compartida',
                proceduralAction: 'Inicio: Presentar libro. Desarrollo: Leer el cuento. Cierre: Despedida. Adaptaciones: Respeto al ritmo.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Escucha' },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Estimular expresión plástica',
                proceduralAction: 'Inicio: Disponer mesas. Desarrollo: Pintar con los dedos usando pintura dactilar sobre papel. Cierre: Secar creaciones. Adaptaciones: Se respeta el ritmo de cada lactante.',
                materialRefs: ['crayones gruesos de cera'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Plástica' },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Fomentar la creatividad',
                proceduralAction: 'Inicio: Preparar materiales. Desarrollo: Elaborar un collage pegando recortes en cartulina. Cierre: Exponer trabajos. Adaptaciones: Se respeta el ritmo individual de exploración y movilidad de cada lactante.',
                materialRefs: ['crayones gruesos de cera'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Collage' },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Movimiento libre',
                proceduralAction: 'Inicio: Espacio despejado. Desarrollo: Caminar por colchonetas. Cierre: Calma. Adaptaciones: Apoyo cercano.',
                materialRefs: ['colchonetas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Movimiento' },
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificación',
                proceduralAction: 'Inicio: Mostrar bloques. Desarrollo: Apilar bloques grandes. Cierre: Guardar. Adaptaciones: Modelado.',
                materialRefs: ['bloques grandes de plástico lavable'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Grupo activo de 25 a 30 meses.',
          availableMaterials: 'cuentos ilustrados infantiles, crayones gruesos de cera, colchonetas limpias, bloques grandes de plástico lavable',
        },
      };

      const proposal = await source.propose(request);
      const allText = JSON.stringify(proposal);

      // Verificación Defecto 1: No debe existir pintura dactilar ni collage
      expect(allText).not.toMatch(/\bpintura\s+dactilar\b/i);
      expect(allText).not.toMatch(/\bun\s+collage\b/i);
      expect(allText).toMatch(/crayones gruesos/i);
    });

    it('Defecto 2: bloquea o sanitiza saltos obligatorios sobre aros y carreras competitivas', () => {
      // 1. Verificación de regla de seguridad bloqueante
      const dangerousPlan = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Saltos y velocidad motriz',
                description:
                  'Inicio: En el patio. Desarrollo: Exigir saltos obligatorios sobre aros colocados en el suelo y organizar carreras competitivas para ver quién llega primero. Cierre: Premiar al ganador. Adaptaciones: Apoyo.',
                materials: ['aros plásticos grandes'],
              },
            ],
          },
        ],
      };
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        dangerousPlan,
        MATERNAL_B1_AGE_POLICY,
        'aros plásticos grandes, colchonetas limpias'
      );
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(
        evalResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-forced-jumping-and-competition')
      ).toBe(true);
    });

    it('Defecto 3: erradica absolutamente el término «lactante» y genera adaptaciones específicas vinculadas', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Lenguaje y autonomía motriz',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Lectura con cada lactante',
                proceduralAction: 'Inicio: Presentar libro a cada lactante. Desarrollo: Leer el cuento al lactante. Cierre: Despedir a los lactantes. Adaptaciones: Se respeta el ritmo individual de exploración y movilidad de cada lactante.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Escucha' },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Movimiento motriz',
                proceduralAction: 'Inicio: Colchonetas para el lactante. Desarrollo: Circuito de marcha con los lactantes. Cierre: Relajación de cada lactante. Adaptaciones: Se respeta el ritmo de cada lactante.',
                materialRefs: ['colchonetas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Marcha' },
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificación con bloques',
                proceduralAction: 'Inicio: Mostrar bloques. Desarrollo: Clasificar bloques con los lactantes. Cierre: Guardar. Adaptaciones: Se respeta el ritmo individual de exploración y movilidad de cada lactante.',
                materialRefs: ['bloques grandes de plástico lavable'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Juego de roles',
                proceduralAction: 'Inicio: Presentar muñecos de tela. Desarrollo: Acunar muñecos de tela afectuosamente. Cierre: Canto. Adaptaciones: Se respeta el ritmo de cada lactante.',
                materialRefs: ['muñecos de tela'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Roles' },
              },
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Lavado de manos',
                proceduralAction: 'Inicio: Ir al lavabo infantil. Desarrollo: Lavado de manos de las niñas y niños. Cierre: Toalla. Adaptaciones: Se respeta el ritmo de cada lactante.',
                materialRefs: ['lavabo infantil con toallas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Grupo activo de 25 a 30 meses.',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);
      const allText = JSON.stringify(proposal);

      // Verificación Defecto 3: NINGUNA mención de «lactante» / «lactantes»
      expect(allText).not.toMatch(/\blactante(s)?\b/i);
      expect(allText).not.toMatch(/cada lactante/i);

      // Verificación de uso de término correcto
      expect(allText).toMatch(/niñas y niños de Maternal B1/i);

      // Verificación de adaptaciones específicas contextuales
      expect(allText).toMatch(/onomatopeyas|marcha|prensión|paralelo|toalla/i);
    });

    it('Defecto 4: enriquece la progresión semanal de actividades repetidas con variación observable', async () => {
      // Mock donde la IA repitió literalmente las mismas actividades lunes a viernes
      const mockDuplicateExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana de actividades repetitivas',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Lectura del cuento de Spot',
                proceduralAction: 'Inicio: Presentar el cuento de Spot. Desarrollo: Leer el cuento de Spot mostrando las imágenes. Cierre: Despedida suave. Adaptaciones: Respeto al ritmo.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificar bloques',
                proceduralAction: 'Inicio: Sacar bloques. Desarrollo: Agrupar bloques grandes de plástico lavable. Cierre: Guardar bloques. Adaptaciones: Acompañamiento.',
                materialRefs: ['bloques grandes de plástico lavable'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Modelado con masa',
                proceduralAction: 'Inicio: Presentar masa. Desarrollo: Crear figuras libres con masa casera para modelar no tóxica. Cierre: Guardar masa. Adaptaciones: Apoyo.',
                materialRefs: ['masa casera para modelar no tóxica'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Masa' },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Circuito de colchonetas',
                proceduralAction: 'Inicio: Preparar colchonetas. Desarrollo: Caminar por circuito en colchonetas limpias. Cierre: Respiración. Adaptaciones: De la mano.',
                materialRefs: ['colchonetas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Circuito' },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Juego con pelotas',
                proceduralAction: 'Inicio: Presentar pelotas. Desarrollo: Jugar con pelotas medianas de vinil en la colchoneta. Cierre: Guardar pelotas. Adaptaciones: Apoyo.',
                materialRefs: ['pelotas medianas de vinil', 'colchonetas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Pelotas' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockDuplicateExecutor);
      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Grupo activo de 25 a 30 meses.',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);

      // Verificación Defecto 4:
      // Las actividades de lectura en los 5 días NO son idénticas; muestran progresión pedagógica
      const readingActivities = proposal.days.map((d) => d.activities[0]);
      expect(readingActivities[0].description).not.toEqual(readingActivities[1].description);
      expect(readingActivities[1].description).not.toEqual(readingActivities[2].description);
      expect(readingActivities[2].description).not.toEqual(readingActivities[3].description);
      expect(readingActivities[3].description).not.toEqual(readingActivities[4].description);

      // Día 2 tiene búsqueda dialógica y solapas / preguntas
      expect(readingActivities[1].description).toMatch(/preguntas dialógicas|solapas|Dónde está/i);
      // Día 3 tiene onomatopeyas / imitación de sonidos
      expect(readingActivities[2].description).toMatch(/onomatopeyas|sonidos|animales/i);
      // Día 4 tiene dramatización / expresión corporal
      expect(readingActivities[3].description).toMatch(/dramatiz|corporal|imitan/i);
      // Día 5 tiene elección autónoma de página/pasaje
      expect(readingActivities[4].description).toMatch(/hojean|eligen de forma autónoma|pasaje preferido/i);

      // Las actividades de bloques en los 5 días muestran progresión observable
      const blocksActivities = proposal.days.map((d) => d.activities[1]);
      // Ocurrencia 2: clasificación cromática por color notorio
      expect(blocksActivities[1].description).toMatch(/color|amarillos|azules|bandejas/i);
      // Ocurrencia 3: correspondencia 1 a 1 en recipientes
      expect(blocksActivities[2].description).toMatch(/recipiente|uno a uno|uno aquí/i);
      // Ocurrencia 4: caminos o trenes lineales
      expect(blocksActivities[3].description).toMatch(/camino|trenecito|alineando|hilera/i);
    });
  });

  describe('SR-MD-29F: Ajustes Quirúrgicos Maternal B1', () => {
    it('Ajuste 1 (Coherencia materiales–acciones): clasificaciones físicas identifican objetos manipulables disponibles y rechazan «colores» como único material', async () => {
      const mockAiExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Exploración de clasificación',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Fomentar la clasificación elemental de colores.',
                proceduralAction: 'Inicio: Presentar la mesa de trabajo. Desarrollo: Invitar a las niñas y niños a clasificar los colores en recipientes. Cierre: Guardar juntos cantando. Adaptaciones: Acompañar a quienes lo requieran.',
                materialRefs: ['colores'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Clasificación' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Atención compartida con cuento.',
                proceduralAction: 'Inicio: Mostrar portada. Desarrollo: Leer el cuento de Spot con las niñas y niños. Cierre: Aplauso. Adaptaciones: Respeto.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Trazos libres con crayones.',
                proceduralAction: 'Inicio: Colocar papel. Desarrollo: Trazar libremente con crayones gruesos de cera sobre papel. Cierre: Limpiar. Adaptaciones: Apoyo.',
                materialRefs: ['crayones gruesos de cera', 'papel bond en pliegos'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Arte' },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Coordinación psicomotriz.',
                proceduralAction: 'Inicio: Sentarse en círculo. Desarrollo: Marcha tranquila al ritmo de palmas. Cierre: Respiración suave. Adaptaciones: Guiar.',
                materialRefs: [],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Movimiento' },
              },
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Higiene de manos.',
                proceduralAction: 'Inicio: Ir al lavabo infantil. Desarrollo: Lavar manos con agua y jabón. Cierre: Secar con toalla limpia. Adaptaciones: Apoyo.',
                materialRefs: ['lavabo infantil con toallas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockAiExecutor);
      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Maternal B1 clasificación manipulable',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);
      const classAct = proposal.days[0].activities[0];

      // Material manipulable real resuelto (bloques grandes) y 'colores' eliminado como único material
      expect(classAct.materials).toContain('bloques grandes de plástico lavable');
      expect(classAct.materials).not.toContain('colores');
      expect(classAct.description).toMatch(/clasificar bloques grandes de plástico lavable por color evidente/i);
      expect(classAct.objective).not.toMatch(/\bclasificar colores\b/i);
    });

    it('Ajuste 2 (Progresión del juego simbólico): evita repetición literal de cocinar/pasear muñecos de martes a viernes con progresión observable', async () => {
      const mockDollsExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Juego simbólico semanal con muñecos',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Cuidar y alimentar a los muñecos de tela.',
                proceduralAction: 'Inicio: Presentar los muñecos de tela. Desarrollo: Cocinar para los muñecos de tela y alimentarlos con cucharas de juguete. Cierre: Guardar cantando. Adaptaciones: Acompañar a quienes lo requieran.',
                materialRefs: ['muñecos de tela'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Roles' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Lectura compartida.',
                proceduralAction: 'Inicio: Mostrar portada. Desarrollo: Leer cuento de Spot. Cierre: Canto. Adaptaciones: Apoyo.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Explorar bloques.',
                proceduralAction: 'Inicio: Sacar bloques. Desarrollo: Apilar bloques grandes de plástico lavable. Cierre: Guardar. Adaptaciones: Apoyo.',
                materialRefs: ['bloques grandes de plástico lavable'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Movimiento seguro.',
                proceduralAction: 'Inicio: Círculo. Desarrollo: Caminar por la sala con música. Cierre: Respirar. Adaptaciones: Guiar.',
                materialRefs: [],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Motor' },
              },
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Secado de manos.',
                proceduralAction: 'Inicio: Lavabo. Desarrollo: Secar manos con toalla individual. Cierre: Cesto. Adaptaciones: Apoyo.',
                materialRefs: ['lavabo infantil con toallas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockDollsExecutor);
      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Maternal B1 juego simbólico',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);

      const dollActivities = proposal.days.map((d) => d.activities[0]);

      // Día 2 (Martes / Ocurrencia 2): vestir / arropar con telas suaves
      expect(dollActivities[1].description).toMatch(/telas suaves|vestir|abrigar|arropar/i);
      expect(dollActivities[1].description).not.toMatch(/cocinar para los muñecos/i);

      // Día 3 (Miércoles / Ocurrencia 3): paseo en cajas de cartón limpias como cochecitos
      expect(dollActivities[2].description).toMatch(/cajas de cartón limpias|cochecitos/i);

      // Día 4 (Jueves / Ocurrencia 4): acostar y mecer en colchonetas limpias con canción de cuna
      expect(dollActivities[3].description).toMatch(/colchonetas limpias|canción de cuna|mecer|siesta/i);

      // Día 5 (Viernes / Ocurrencia 5): merienda / reunión en círculo sobre el tapete
      expect(dollActivities[4].description).toMatch(/círculo|tapete|merienda imaginaria/i);

      // Ningún día de martes a viernes repite textualmente la acción inicial de cocinar
      expect(dollActivities[1].description).not.toEqual(dollActivities[2].description);
      expect(dollActivities[2].description).not.toEqual(dollActivities[3].description);
      expect(dollActivities[3].description).not.toEqual(dollActivities[4].description);
    });

    it('Ajuste 3 (Adaptaciones contextualizadas): sustituye adaptaciones genéricas por apoyos concretos según lenguaje, autonomía motriz y participación para 25–30 meses', async () => {
      const mockGenericAdaptExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana de prueba de adaptaciones',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Comprensión y vocabulario con cuento.',
                proceduralAction: 'Inicio: Mostrar el libro de Spot. Desarrollo: Leer pausadamente mostrando solapas. Cierre: Guardar libro. Adaptaciones: Se respeta el ritmo individual de cada niño.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Equilibrio en colchoneta.',
                proceduralAction: 'Inicio: Poner colchonetas limpias. Desarrollo: Caminar sobre colchonetas limpias sorteando desniveles. Cierre: Descanso. Adaptaciones: Se respeta el ritmo de cada uno.',
                materialRefs: ['colchonetas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Motor' },
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificar bloques por color.',
                proceduralAction: 'Inicio: Presentar recipientes. Desarrollo: Clasificar bloques grandes de plástico lavable en recipientes. Cierre: Guardar. Adaptaciones: Acompañar según necesidades.',
                materialRefs: ['bloques grandes de plástico lavable'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Matemática' },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Juego simbólico con muñecos.',
                proceduralAction: 'Inicio: Entregar muñecos de tela. Desarrollo: Abrazar y cuidar a los muñecos de tela. Cierre: Despedida. Adaptaciones: Apoyo individual.',
                materialRefs: ['muñecos de tela'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Roles' },
              },
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Lavado y secado autónomo.',
                proceduralAction: 'Inicio: Acudir al lavabo infantil. Desarrollo: Lavar y secar manos con toallas limpias. Cierre: Colocar toalla en cesto. Adaptaciones: Brindar apoyo.',
                materialRefs: ['lavabo infantil con toallas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockGenericAdaptExecutor);
      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Maternal B1 adaptaciones',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);
      const acts = proposal.days[0].activities;

      // Lectura: apoyos de lenguaje (onomatopeyas, señalamientos, preguntas sencillas)
      expect(acts[0].description).toMatch(/Adaptaciones:.*(?:onomatopeyas|señalamientos|opción binaria)/i);

      // Motor: apoyo motriz (mano, marcha vacilante, gateo, sin forzar saltos)
      expect(acts[1].description).toMatch(/Adaptaciones:.*(?:apoyo de la mano|marcha vacilante|desplazarse a gatas|sin forzar saltos)/i);

      // Bloques: prensión manual y cantidad de bloques
      expect(acts[2].description).toMatch(/Adaptaciones:.*(?:prensión manual|color notorio|cantidad de bloques)/i);

      // Muñecos: juego paralelo y elementos duplicados
      expect(acts[3].description).toMatch(/Adaptaciones:.*(?:juego paralelo|elementos duplicados)/i);

      // Higiene: autonomía en toallero bajo y toalla individual
      expect(acts[4].description).toMatch(/Adaptaciones:.*(?:toalla del toallero bajo|toalla del estante bajo|toallero bajo|enjabonado|autonomía)/i);
    });

    it('Ajuste 4 (Circuitos seguros): elimina obstáculos o implementos ausentes (conos, cuerdas, mesas) y garantiza participación voluntaria y supervisada a ras de suelo', async () => {
      const mockUnsafeCircuitExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana de movimiento',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Superar circuito de obstáculos.',
                proceduralAction: 'Inicio: Preparar circuito. Desarrollo: Sortear conos, trepar sobre mesas y saltar adentro de los aros en el circuito de obstáculos. Cierre: Aplausos. Adaptaciones: Apoyo.',
                materialRefs: ['colchonetas limpias'],
                durationMinutes: 20,
                progression: { role: 'EXPLORE', observationTarget: 'Motor' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Lectura compartida.',
                proceduralAction: 'Inicio: Mostrar portada. Desarrollo: Leer cuento de Spot. Cierre: Canto. Adaptaciones: Apoyo.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificar bloques.',
                proceduralAction: 'Inicio: Sacar bloques. Desarrollo: Clasificar bloques grandes de plástico lavable. Cierre: Guardar. Adaptaciones: Apoyo.',
                materialRefs: ['bloques grandes de plástico lavable'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Modelado con masa.',
                proceduralAction: 'Inicio: Presentar masa. Desarrollo: Modelar con masa casera para modelar no tóxica. Cierre: Guardar. Adaptaciones: Apoyo.',
                materialRefs: ['masa casera para modelar no tóxica'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Arte' },
              },
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Higiene de manos.',
                proceduralAction: 'Inicio: Lavabo. Desarrollo: Lavar y secar manos con toallas limpias. Cierre: Toallero. Adaptaciones: Apoyo.',
                materialRefs: ['lavabo infantil con toallas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockUnsafeCircuitExecutor);
      const request: WeeklyPlanningProposalRequest = {
        daycareId: 'guarderia-lab-001',
        room: roomMaternalB1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          observations: 'Maternal B1 circuito seguro',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);
      const circuitAct = proposal.days[0].activities[0];

      // Verificación de sanitización a ras de suelo sin implementos ausentes
      expect(circuitAct.description).not.toMatch(/\bconos\b/i);
      expect(circuitAct.description).not.toMatch(/trepar sobre mesas/i);
      expect(circuitAct.description).not.toMatch(/saltar adentro de los aros/i);
      expect(circuitAct.description).not.toMatch(/\bcircuito de obstáculos\b/i);

      // Verificación de participación voluntaria y supervisada a ras de suelo
      expect(circuitAct.description).toMatch(/voluntaria y supervisada a ras de suelo/i);
      expect(circuitAct.objective).toMatch(/circuito psicomotriz seguro en colchonetas/i);

      // Validación con el safety validator de dominio
      const candidate: WeeklyPlanningCandidate = {
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        days: proposal.days,
      };

      const safetyResult = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B1_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(safetyResult.isPedagogicallySafe).toBe(true);
      expect(safetyResult.blockingViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 7. MEJORA DE IA PEDAGÓGICA EN ORIGEN Y COHERENCIA TRANSVERSAL (SR-MD-29K)
  // =========================================================================
  describe('7. SR-MD-29K — Generación Pedagógica en Origen y Reducción de Correcciones Posteriores', () => {
    it('Caso A (Coherencia Objetivo-Materiales-Acciones): actividad gráfico-plástica con crayones no introduce masa ni pintura fantasma', async () => {
      const mockDrawingExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Expresión gráfico-plástica y motricidad fina en Maternal B1',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Favorecer el agarre palmar y la coordinación visomotriz mediante el trazo espontáneo.',
                  proceduralAction:
                    'Inicio: La Asistente dispone pliegos de papel en el suelo y coloca crayones gruesos de cera al alcance.\nDesarrollo: Las niñas y niños toman los crayones gruesos de cera y realizan trazos libres y garabatos amplios sobre el papel con entusiasmo.\nCierre: Guardan juntos los crayones en la cesta cantando una melodía de orden.\nAdaptaciones: Ofrecer hojas amplias y crayones gruesos adaptados a la prensión palmar de cada niña y niño.',
                  materialRefs: ['MAT-08', 'MAT-09'],
                  durationMinutes: 15,
                  progression: {
                    role: 'EXPLORE',
                    revisitsSlot: null,
                    repetitionPurpose: null,
                    variationDimensions: null,
                    observationTarget: 'Observar el trazo libre',
                  },
                },
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Estimular la atención compartida mediante la exploración del libro.',
                  proceduralAction: 'Inicio: Sentarse en círculo. Desarrollo: Miran el libro ilustrado. Cierre: Canto suave. Adaptaciones: Señalamientos.',
                  materialRefs: [],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Atención' },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Agrupar bloques grandes de plástico lavable por color notorio.',
                  proceduralAction: 'Inicio: Disponer tapete. Desarrollo: Clasifican bloques grandes de plástico lavable en recipientes. Cierre: Guardan cantando. Adaptaciones: Modelado guiado.',
                  materialRefs: ['MAT-01'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Agrupación' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'Fortalecer el equilibrio dinámico caminando sobre colchonetas limpias.',
                  proceduralAction: 'Inicio: Despejar área. Desarrollo: Desplazamiento voluntario a ras de suelo en colchonetas limpias. Cierre: Respiración calmada. Adaptaciones: Apoyo de la mano.',
                  materialRefs: ['MAT-06'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Equilibrio' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Consolidar la autonomía en el lavado y secado activo de manos.',
                  proceduralAction: 'Inicio: Acercarse al lavabo infantil. Desarrollo: Frotan sus manos con agua y se secan con toallas limpias. Cierre: Dejar toalla en cesto. Adaptaciones: Acompañamiento sensible.',
                  materialRefs: ['MAT-09'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Autonomía' },
                },
              ],
            },
            ...['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek) => ({
              dayOfWeek,
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Explorar las ilustraciones del libro con entusiasmo y atención compartida.',
                  proceduralAction: 'Inicio: En círculo. Desarrollo: Exploran páginas del libro. Cierre: Canción de despedida. Adaptaciones: Permitir señalamiento libre.',
                  materialRefs: [],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura' },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Introducir bloques en recipientes fortaleciendo la noción dentro y fuera.',
                  proceduralAction: 'Inicio: Tapete. Desarrollo: Meten bloques grandes en cajas limpias. Cierre: Aplauso grupal. Adaptaciones: Señalamiento.',
                  materialRefs: ['MAT-01'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Encaje' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Estimular la expresión creativa dibujando líneas de colores sobre papel.',
                  proceduralAction: 'Inicio: Mesa baja. Desarrollo: Trazan con crayones gruesos de cera sobre papel. Cierre: Limpiar mesa. Adaptaciones: Prensión palmar.',
                  materialRefs: ['MAT-08'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Trazo' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'Favorecer el paso firme y el desplazamiento seguro a nivel de suelo.',
                  proceduralAction: 'Inicio: Colchonetas limpias. Desarrollo: Caminan esquivando desniveles suaves en colchonetas. Cierre: Calma. Adaptaciones: De la mano.',
                  materialRefs: ['MAT-06'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Marcha' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Fomentar la higiene personal lavando manos en el lavabo infantil.',
                  proceduralAction: 'Inicio: Lavabo. Desarrollo: Lavado de manos con jabón y agua templada. Cierre: Toalla en cesto. Adaptaciones: Guía suave.',
                  materialRefs: ['MAT-09'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Higiene' },
                },
              ],
            })),
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockDrawingExecutor);
      const request: WeeklyPlanningProposalRequest = {
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 expresión gráfica con crayones y papel',
          availableMaterials:
            'Crayones gruesos de cera, pliegos de papel bond, bloques grandes de plástico lavable, cuentos ilustrados infantiles, colchonetas limpias, lavabo infantil con toallas limpias',
        },
      };

      const proposal = await source.propose(request);
      const artAct = proposal.days[0].activities[0];

      // Verificación estricta: NO debe introducirse masa ni plastilina cuando solo hay crayones y papel
      expect(artAct.description).not.toMatch(/\b(?:masa|plastilina|amasar|modelar)\b/i);
      expect(artAct.objective).not.toMatch(/\b(?:masa|plastilina|modelado)\b/i);
      expect(artAct.materials).not.toContain('masa casera para modelar no tóxica');
      expect(artAct.description).toMatch(/crayones/i);
      expect(artAct.description).toMatch(/papel/i);
    });

    it('Caso B (Preservación de Adaptaciones Auténticas): conserva adaptaciones contextualizadas no genéricas generadas por la IA', async () => {
      const authenticAdaptation =
        'Ofrecer acompañamiento cercano y palabras de aliento a la niña o niño que muestre timidez al hojear el cuento, permitiéndole observar a distancia antes de invitarlo a señalar a los animales.';

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Lenguaje y lectura en Maternal B1',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Fortalecer el vínculo afectivo y la atención compartida mediante la exploración del libro.',
                  proceduralAction: `Inicio: La Asistente dispone un tapete cálido y muestra la portada del libro infantil.\nDesarrollo: Hojean juntos las páginas reconociendo animales y señalando sus figuras con alegría.\nCierre: Guardan el libro en el estante bajo cantando una canción breve de orden.\nAdaptaciones: ${authenticAdaptation}`,
                  materialRefs: [],
                  durationMinutes: 15,
                  progression: {
                    role: 'EXPLORE',
                    revisitsSlot: null,
                    repetitionPurpose: null,
                    variationDimensions: null,
                    observationTarget: 'Atención visual y señalamiento',
                  },
                },
                { category: 'PENSAMIENTO MATEMÁTICO', objective: 'Agrupar bloques grandes de plástico lavable por color notorio.', proceduralAction: 'Inicio: Tapete. Desarrollo: Agrupan bloques grandes de plástico lavable. Cierre: Canción. Adaptaciones: Acompañar con señalamiento guiado.', materialRefs: ['MAT-01'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Agrupación' } },
                { category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'Estimular la prensión palmar trazando con crayones gruesos de cera sobre papel.', proceduralAction: 'Inicio: Mesa baja. Desarrollo: Trazan con crayones gruesos de cera sobre papel. Cierre: Limpiar mesa. Adaptaciones: Hojas amplias.', materialRefs: ['MAT-08'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Trazo' } },
                { category: 'ACTIVACIÓN FÍSICA', objective: 'Favorecer el equilibrio dinámico caminando sobre colchonetas limpias.', proceduralAction: 'Inicio: Despejar área. Desarrollo: Desplazamiento voluntario en colchonetas limpias. Cierre: Respiración suave. Adaptaciones: Apoyo de la mano.', materialRefs: ['MAT-06'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Equilibrio' } },
                { category: 'AMBIENTES DE APRENDIZAJE', objective: 'Consolidar la autonomía en el lavado activo de manos.', proceduralAction: 'Inicio: Lavabo. Desarrollo: Frotan manos con agua y jabón en lavabo infantil. Cierre: Toalla al cesto. Adaptaciones: Guía suave mano a mano.', materialRefs: ['MAT-09'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Higiene' } },
              ],
            },
            ...['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek) => ({
              dayOfWeek,
              activities: [
                { category: 'LECTURA EN VOZ ALTA', objective: 'Releer el cuento infantil atendiendo a las preferencias de los niños.', proceduralAction: 'Inicio: Círculo. Desarrollo: Relectura del libro. Cierre: Despedida. Adaptaciones: Señalamiento libre.', materialRefs: [], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura' } },
                { category: 'PENSAMIENTO MATEMÁTICO', objective: 'Introducir bloques en recipientes reforzando noción espacial.', proceduralAction: 'Inicio: Tapete. Desarrollo: Meten bloques grandes en cajas limpias. Cierre: Aplauso. Adaptaciones: Señalamiento.', materialRefs: ['MAT-01'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Encaje' } },
                { category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'Promover la expresión creativa mediante trazos de colores en papel.', proceduralAction: 'Inicio: Mesa baja. Desarrollo: Trazan con crayones gruesos de cera en papel. Cierre: Guardar. Adaptaciones: Prensión palmar.', materialRefs: ['MAT-08'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Trazo' } },
                { category: 'ACTIVACIÓN FÍSICA', objective: 'Favorecer el desplazamiento seguro sorteando desniveles a su paso.', proceduralAction: 'Inicio: Colchonetas. Desarrollo: Caminan en colchonetas limpias. Cierre: Calma. Adaptaciones: De la mano.', materialRefs: ['MAT-06'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Marcha' } },
                { category: 'AMBIENTES DE APRENDIZAJE', objective: 'Fomentar la higiene secando sus manos con toalla propia.', proceduralAction: 'Inicio: Lavabo. Desarrollo: Secado de manos en lavabo infantil. Cierre: Cesto. Adaptaciones: Guía suave.', materialRefs: ['MAT-09'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Higiene' } },
              ],
            })),
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 lectura interactiva',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);
      const readingAct = proposal.days[0].activities[0];

      // La adaptación auténtica de la IA NO debe ser sustituida por el fallback canned
      expect(readingAct.description).toContain(authenticAdaptation);
    });

    it('Caso C (Limpieza de Materiales): filtra determinadores "todos los" y descriptores no sustantivos', () => {
      const rawMaterialsString =
        'Todos los bloques grandes de plástico lavable, cada cuento ilustrado infantil, colchonetas limpias en buen estado, todos, limpios, materiales';

      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Agrupar bloques grandes de plástico lavable por color notorio.',
                description:
                  'Inicio: Se dispone el tapete. Desarrollo: Las niñas y niños agrupan bloques grandes de plástico lavable en bandejas amplias. Cierre: Guardan cantando una rima. Adaptaciones: Acompañar con señalamiento guiado.',
                durationMinutes: 15,
                materials: ['bloques grandes de plástico lavable'],
              },
            ],
          },
        ],
      };

      const safetyResult = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B1_AGE_POLICY,
        rawMaterialsString
      );

      // Los materiales en la tabla procesada no deben producir violaciones bloqueantes
      expect(safetyResult.blockingViolations).toHaveLength(0);
    });

    it('Caso D (Detección de Cierres Inadecuados): advierte sobre asambleas dialógicas y preguntas reflexivas en Maternal B1', () => {
      const candidateWithBadClosure: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Agrupar bloques grandes de plástico lavable por color notorio.',
                description:
                  'Inicio: Se dispone el tapete. Desarrollo: Las niñas y niños agrupan bloques grandes de plástico lavable en bandejas. Cierre: En asamblea grupal, conversar sobre lo que más les gustó y reflexionar sobre lo que aprendieron hoy. Adaptaciones: Acompañar con señalamiento guiado.',
                durationMinutes: 15,
                materials: ['bloques grandes de plástico lavable'],
              },
            ],
          },
        ],
      };

      const safetyResult = PedagogicalSafetyValidator.evaluatePlan(
        candidateWithBadClosure,
        MATERNAL_B1_AGE_POLICY,
        sampleAvailableMaterials,
        { requirePedagogicalStructure: true }
      );

      // Debe detectar el cierre dialógico inadecuado para 25-30 meses como DEVELOPMENTAL_MISMATCH
      const closureMismatch = safetyResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-maternal-b1-closure-mismatch'
      );
      expect(closureMismatch).toBeDefined();
      expect(closureMismatch?.message).toMatch(/diálogo reflexivo o asamblea/i);
      expect(safetyResult.isPedagogicallySafe).toBe(false);
    });

    it('Caso E (Preservación de Progresión Auténtica): si la IA genera 5 días diferenciados de lectura, no son sobreescritos', async () => {
      const dayThemes = [
        'Exploración visual de la portada y reconocimiento de animales del cuento',
        'Búsqueda de personajes escondidos detrás de las solapas de la historia',
        'Juego vocal imitando los sonidos y onomatopeyas de los personajes',
        'Dramatización corporal de las acciones de los animales del cuento',
        'Relectura compartida del pasaje favorito elegido por los niños',
      ];

      const mockProgressiveExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Progresión de lectura y expresión en Maternal B1',
          days: dayThemes.map((theme, i) => ({
            dayOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'][i],
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: `Objetivo diferenciado día ${i + 1}: ${theme}.`,
                proceduralAction: `Inicio: La Asistente dispone el libro. Desarrollo: Enfoque del día ${i + 1}: ${theme} con niñas y niños de Maternal B1 de manera activa. Cierre: Guardan libro cantando melodía suave. Adaptaciones: Permitir señalamiento a quien lo requiera.`,
                materialRefs: [],
                durationMinutes: 15,
                progression: {
                  role: i === 0 ? 'EXPLORE' : 'VARY',
                  revisitsSlot: i === 0 ? null : 1,
                  repetitionPurpose: i === 0 ? null : 'VARIATION',
                  variationDimensions: i === 0 ? null : ['PEDAGOGICAL_INTENT'],
                  observationTarget: `Observación día ${i + 1}`,
                },
              },
              { category: 'PENSAMIENTO MATEMÁTICO', objective: `Actividad pensamiento día ${i + 1}.`, proceduralAction: 'Inicio: Tapete. Desarrollo: Clasifican bloques grandes de plástico lavable. Cierre: Canto. Adaptaciones: Guía.', materialRefs: ['MAT-01'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Bloques' } },
              { category: 'EXPERIENCIAS ARTÍSTICAS', objective: `Actividad arte día ${i + 1}.`, proceduralAction: 'Inicio: Mesa. Desarrollo: Trazan con crayones gruesos de cera sobre papel. Cierre: Limpiar. Adaptaciones: Prensión.', materialRefs: ['MAT-08'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Crayones' } },
              { category: 'ACTIVACIÓN FÍSICA', objective: `Actividad motriz día ${i + 1}.`, proceduralAction: 'Inicio: Despejar. Desarrollo: Caminan en colchonetas limpias sorteando desniveles. Cierre: Calma. Adaptaciones: Mano.', materialRefs: ['MAT-06'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Marcha' } },
              { category: 'AMBIENTES DE APRENDIZAJE', objective: `Actividad higiene día ${i + 1}.`, proceduralAction: 'Inicio: Lavabo. Desarrollo: Lavado de manos en lavabo infantil con toallas limpias. Cierre: Cesto. Adaptaciones: Acompañar.', materialRefs: ['MAT-09'], durationMinutes: 15, progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lavado' } },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockProgressiveExecutor);
      const request: WeeklyPlanningProposalRequest = {
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 progresión de lectura',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      const proposal = await source.propose(request);

      // Verificamos que los 5 días conservan sus temas auténticos y NO fueron sobreescritos con el texto canned
      for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
        const readingAct = proposal.days[dayIdx].activities[0];
        expect(readingAct.description).toContain(`Enfoque del día ${dayIdx + 1}`);
        expect(readingAct.objective).toContain(`Objetivo diferenciado día ${dayIdx + 1}`);
      }
    });
  });

  // =========================================================================
  // 8. SR-MD-29M: CORRECCIÓN DE ORIGEN — MATERNAL B1 (CALIDAD PEDAGÓGICA Y SEGURIDAD)
  // =========================================================================
  describe('8. SR-MD-29M — Corrección de Origen, Seguridad Motriz y Adaptaciones Contextualizadas para Maternal B1', () => {
    // 1. Progresión auténtica (evitar actividades idénticas Mié, Jue, Vie y alinear pedagogicalProgression)
    it('Defecto 1: diversifica genuinamente actividades en Miércoles, Jueves y Viernes y alinea la progresión pedagógica', async () => {
      // Simulamos la respuesta de OpenAI donde Miércoles, Jueves y Viernes repiten la misma actividad de bloques y circuito
      const mockRepetitiveExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Exploración sensorial y psicomotricidad en Maternal B1',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day, dIdx) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Desarrollar la coordinación óculo-manual apilando bloques grandes.',
                proceduralAction:
                  'Inicio: La Asistente dispone bloques grandes en el suelo. Desarrollo: Las niñas y niños apilan bloques grandes intentando formar una torre alta. Cierre: Guardan los bloques cantando una canción. Adaptaciones: Acompañamiento cercano a quien lo requiera.',
                materialRefs: ['MAT-01'],
                durationMinutes: 15,
                progression: {
                  role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
                  revisitsSlot: dIdx === 0 ? null : 1,
                  repetitionPurpose: dIdx === 0 ? null : 'PROGRESSION',
                  variationDimensions: dIdx === 0 ? null : ['CHILD_AGENCY'],
                  observationTarget: 'Observar apilado de bloques',
                },
              },
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Favorecer el desplazamiento y la marcha sorteando desniveles en el piso.',
                proceduralAction:
                  'Inicio: Se delimita el área con colchonetas. Desarrollo: Las niñas y niños recorren un circuito motriz sobre colchonetas limpias. Cierre: Respiración suave sentados en círculo. Adaptaciones: Tomar de la mano a quien muestre marcha vacilante.',
                materialRefs: ['MAT-06'],
                durationMinutes: 20,
                progression: {
                  role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
                  revisitsSlot: dIdx === 0 ? null : 2,
                  repetitionPurpose: dIdx === 0 ? null : 'VARIATION',
                  variationDimensions: dIdx === 0 ? null : ['SENSORY_EXPERIENCE'],
                  observationTarget: 'Observar desplazamiento',
                },
              },
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Estimular la expresión gráfico-plástica mediante trazos libres.',
                proceduralAction:
                  'Inicio: Se disponen hojas de papel en el piso. Desarrollo: Con crayones gruesos de cera, las niñas y niños realizan trazos libres. Cierre: Recoger crayones en su caja. Adaptaciones: Facilitar prensión palmar.',
                materialRefs: ['MAT-08'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Trazos' },
              },
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Desarrollar la empatía y el afecto cuidando y acunando muñecos de tela.',
                proceduralAction:
                  'Inicio: Se entregan muñecos de tela a cada niño. Desarrollo: Las niñas y niños acunan a sus muñecos meciéndolos con afecto. Cierre: Colocan los muñecos en una canasta. Adaptaciones: Modelar la caricia.',
                materialRefs: ['MAT-03'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Muñecos' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Fomentar el interés literario y la atención compartida explorando cuentos.',
                proceduralAction:
                  'Inicio: La Asistente muestra el libro de Spot. Desarrollo: Lectura interactiva mostrando las ilustraciones. Cierre: Guardan el libro con cuidado. Adaptaciones: Permitir señalar.',
                materialRefs: ['MAT-02'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockRepetitiveExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1: niños en adaptación, lenguaje emergente, diversidad motriz y juego paralelo',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      // 1.1: Comprobar que Miércoles (día 2), Jueves (día 3) y Viernes (día 4) NO son idénticos en Bloques
      const wednesdayBlocks = proposal.days[2].activities[0];
      const thursdayBlocks = proposal.days[3].activities[0];
      const fridayBlocks = proposal.days[4].activities[0];

      expect(wednesdayBlocks.description).not.toBe(thursdayBlocks.description);
      expect(thursdayBlocks.description).not.toBe(fridayBlocks.description);
      expect(wednesdayBlocks.objective).not.toBe(thursdayBlocks.objective);
      expect(thursdayBlocks.objective).not.toBe(fridayBlocks.objective);

      // Miércoles: correspondencia uno a uno; Jueves: tren/camino horizontal; Viernes: discriminación grande/pequeño
      expect(wednesdayBlocks.objective).toMatch(/correspondencia uno a uno|continente/i);
      expect(thursdayBlocks.objective).toMatch(/alineando bloques|caminos o trenes/i);
      expect(fridayBlocks.objective).toMatch(/grande.*pequeño|tamaño/i);

      // 1.2: Comprobar que Circuito Motriz está diferenciado en Mié, Jue, Vie
      const wedCircuit = proposal.days[2].activities[1];
      const thuCircuit = proposal.days[3].activities[1];
      const friCircuit = proposal.days[4].activities[1];

      expect(wedCircuit.description).not.toBe(thuCircuit.description);
      expect(thuCircuit.description).not.toBe(friCircuit.description);

      // Miércoles: exploración descalzos en colchoneta; Jueves: imitación animalitos a ras de suelo; Viernes: retorno a la calma
      expect(wedCircuit.objective).toMatch(/propiocepci[oó]n|descalzos/i);
      expect(thuCircuit.objective).toMatch(/animalitos|imitativo/i);
      expect(friCircuit.objective).toMatch(/autorregulaci[oó]n|calma/i);

      // 1.3: Comprobar que pedagogicalProgression se alinea perfectamente con las 25 actividades
      expect(proposal.progression).toBeDefined();
      expect(proposal.progression?.experiences).toHaveLength(25);

      // Día 1 (Lunes): rol EXPLORE
      expect(proposal.progression?.experiences[0].role).toBe('EXPLORE');
      expect(proposal.progression?.experiences[0].revisitsExperienceId).toBeUndefined();

      // Día 2 (Martes): rol REVISIT con revisitsExperienceId apuntando a EXP-D1-A1
      expect(proposal.progression?.experiences[5].role).toBe('REVISIT');
      expect(proposal.progression?.experiences[5].revisitsExperienceId).toBe('EXP-D1-A1');

      // Día 3 (Miércoles): rol VARY con variación
      expect(proposal.progression?.experiences[10].role).toBe('VARY');
      expect(proposal.progression?.experiences[10].revisitsExperienceId).toBeDefined();
      expect(proposal.progression?.experiences[10].variationDimensions).toContain('CHILD_AGENCY');

      // Día 4 (Jueves): rol VARY con progresión
      expect(proposal.progression?.experiences[15].role).toBe('VARY');
      expect(proposal.progression?.experiences[15].revisitsExperienceId).toBeDefined();
      expect(proposal.progression?.experiences[15].repetitionPurpose).toBe('PROGRESSION');

      // Día 5 (Viernes): rol OBSERVE_OR_CONSOLIDATE
      expect(proposal.progression?.experiences[20].role).toBe('OBSERVE_OR_CONSOLIDATE');
      expect(proposal.progression?.experiences[20].revisitsExperienceId).toBeDefined();
      expect(proposal.progression?.experiences[20].repetitionPurpose).toBe('RESPONSE_OBSERVATION');

      // 1.4: La correspondencia estricta sin repetición literal pasa exitosamente
      expect(() => {
        validateActivityProgressionCorrespondence(proposal.days, proposal.progression!, {
          disallowLiteralRepetition: true,
        });
      }).not.toThrow();
    });

    // 2. Materiales y acciones (cero recursos inventados ni concatenaciones artificiales)
    it('Defecto 2: erradica cojines y objetos de colores inventados, y evita concatenaciones artificiales', async () => {
      const mockInventedMaterialsExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Exploración motriz y de color en Maternal B1',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Recorrer circuito motriz sorteando conos y cojines bajos.',
                proceduralAction:
                  'Inicio: Con cojines y colchonetas: Se prepara el aula. Desarrollo: Las niñas y niños sortean desniveles sobre cojines bajos y sortean conos plásticos a ras de suelo. Cierre: Guardan cojines cantando. Adaptaciones: Asistencia.',
                materialRefs: ['MAT-06'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Circuito' },
              },
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificar objetos de colores variados en recipientes.',
                proceduralAction:
                  'Inicio: Con objetos de colores: Se muestran en el tapete. Desarrollo: Clasifican objetos de colores azul y rojo en bandejas. Cierre: Canción de despedida. Adaptaciones: Modelado.',
                materialRefs: ['MAT-01'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Color' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Favorecer el interés literario explorando el cuento infantil.',
                proceduralAction:
                  'Inicio: La Asistente dispone el libro de cuentos. Desarrollo: Lectura interactiva mostrando las ilustraciones. Cierre: Guardan el libro con afecto. Adaptaciones: Señalamiento.',
                materialRefs: ['MAT-02'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockInventedMaterialsExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 materiales',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const allActivityTexts = proposal.days.flatMap((d) =>
        d.activities.map((a) => `${a.objective} ${a.description}`)
      ).join(' ');

      // Cero cojines, cero conos
      expect(allActivityTexts).not.toMatch(/\bcojines\b/i);
      expect(allActivityTexts).not.toMatch(/\bcoj[ií]n\b/i);
      expect(allActivityTexts).not.toMatch(/\bconos\b/i);

      // Cero concatenación artificial "Con <materiales>:"
      expect(allActivityTexts).not.toMatch(/Con\s+[a-záéíóú\s,]+:\s*Se\s+prepara/i);

      // Cojines bajos y conos se sanitizan a desplazamientos a ras de suelo sobre colchonetas limpias sin desniveles
      expect(proposal.days[0].activities[0].description).toMatch(/(?:colchonetas limpias|trayectorias)/i);
      expect(proposal.days[0].activities[0].description).not.toMatch(/desniveles/i);

      // Clasificación usa el manipulable disponible (bloques grandes de plástico lavable) en lugar de "objetos de colores"
      expect(proposal.days[0].activities[1].description).toMatch(/bloques grandes de plástico lavable/i);
    });

    // 3. Seguridad 25–30 meses (eliminar exigencias de salto y equilibrio)
    it('Defecto 3: rechaza y sanitiza exigencias de mantener el equilibrio o saltar obligatoriamente', async () => {
      // 3.1: PedagogicalSafetyValidator rechaza salto obligatorio y equilibrio
      const candidateJump = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                description: 'Desarrollo: Todos los niños deben saltar con ambos pies hacia adelante tres veces.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const jumpResult = PedagogicalSafetyValidator.evaluatePlan(candidateJump, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(jumpResult.isPedagogicallySafe).toBe(false);
      expect(jumpResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-forced-jumping-and-competition')).toBe(true);

      const candidateBalance = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                description: 'Desarrollo: La Asistente exige a los niños mantener el equilibrio en un solo pie durante diez segundos.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const balanceResult = PedagogicalSafetyValidator.evaluatePlan(candidateBalance, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(balanceResult.isPedagogicallySafe).toBe(false);
      expect(balanceResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-forced-jumping-and-competition')).toBe(true);

      // 3.2: Desplazamiento seguro a ras de suelo es admitido
      const candidateSafe = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                description: 'Desarrollo: Las niñas y niños caminan sobre colchonetas limpias a su propio paso, con apoyo de la mano si lo requieren.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const safeResult = PedagogicalSafetyValidator.evaluatePlan(candidateSafe, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(safeResult.isPedagogicallySafe).toBe(true);

      // 3.3: Sanitización en proposal source sustituye "mantener el equilibrio" por "desplazarse con seguridad y apoyo a ras de suelo"
      const mockUnsafeMotorExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Motricidad en colchoneta',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Favorecer el desplazamiento motriz en colchonetas.',
                proceduralAction:
                  'Inicio: Preparar tapete. Desarrollo: Caminan sobre colchonetas intentando mantener el equilibrio en un pie al avanzar. Cierre: Retorno a la calma. Adaptaciones: Apoyo verbal.',
                materialRefs: ['MAT-06'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Equilibrio' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Favorecer el interés lector con el cuento ilustrado.',
                proceduralAction:
                  'Inicio: Sentarse en semicírculo. Desarrollo: Lectura compartida con los niños. Cierre: Guardar libro. Adaptaciones: Señalamiento.',
                materialRefs: ['MAT-02'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockUnsafeMotorExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 motor',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const actDesc = proposal.days[0].activities[0].description;
      expect(actDesc).not.toMatch(/mantener el equilibrio/i);
      expect(actDesc).toMatch(/apoyar ambos pies firmemente|desplazarse a su paso a ras de suelo/i);
    });

    // 4. Adaptaciones contextualizadas (aprovechar las 4 observaciones reales)
    it('Defecto 4: genera adaptaciones concretas basadas en los 4 ejes observacionales reales en vez de frases genéricas', async () => {
      const mockGenericAdaptationExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Actividades varias en Maternal B1',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Estimular la exploración con bloques de plástico.',
                proceduralAction:
                  'Inicio: Tapete limpio. Desarrollo: Manipulan bloques grandes. Cierre: Guardan en canasto. Adaptaciones: Se respeta el ritmo del menor y se brinda apoyo si lo requiere.',
                materialRefs: ['MAT-01'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Bloques' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Favorecer el interés por la lectura con el cuento.',
                proceduralAction:
                  'Inicio: Sentarse en el tapete. Desarrollo: Lectura interactiva. Cierre: Guardar con cariño. Adaptaciones: Señalar imágenes.',
                materialRefs: ['MAT-02'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockGenericAdaptationExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1: proceso de adaptación, lenguaje incipiente con onomatopeyas, marcha heterogénea y dificultad para compartir',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const actAdaptation = proposal.days[0].activities[0].description;

      // Frase genérica erradicada
      expect(actAdaptation).not.toMatch(/se respeta el ritmo del menor/i);

      // Contiene adaptaciones contextualizadas para bloques: juego paralelo y posesión de materiales
      expect(actAdaptation).toMatch(/juego en paralelo|posesi[oó]n de materiales|duplicados/i);

      // En la actividad de lectura (actividad 1), contiene adaptaciones de adaptación y lenguaje emergente
      const readingAdaptation = proposal.days[0].activities[1].description;
      expect(readingAdaptation).toMatch(/adaptaci[oó]n|contenci[oó]n|acompañamiento cercano/i);
      expect(readingAdaptation).toMatch(/lenguaje|onomatopeya|palabra clave|señalamiento/i);
    });

    // 5. Coherencia pedagógica como unidad completa
    it('Defecto 5: concibe cada actividad como unidad pedagógica completa (Objetivo → Materiales → Inicio → Desarrollo → Cierre → Adaptaciones)', async () => {
      const mockCoherentExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Expresión gráfica y lenguaje en Maternal B1',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Estimular la prensión palmar y la coordinación visomotriz mediante trazos libres con crayones gruesos.',
                proceduralAction:
                  'Inicio: La Asistente dispone pliegos de papel bond limpios en el piso y entrega un crayón grueso a cada niña y niño. Desarrollo: Las niñas y niños realizan trazos libres y garabateos circulares sobre el papel experimentando con el color a su propio ritmo. Cierre: Guardan los crayones uno a uno dentro de su caja entonando una canción de orden. Adaptaciones: Ofrecer apoyo en la toma del crayón a quien lo requiera y permitir descansar si lo solicitan.',
                materialRefs: ['MAT-08'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Trazos' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Fortalecer el lenguaje y comprensión lectora con el cuento infantil.',
                proceduralAction:
                  'Inicio: Sentados en semicírculo en el tapete. Desarrollo: Lectura pausada mostrando las ilustraciones de Spot. Cierre: Canción suave de despedida. Adaptaciones: Señalamiento de animales.',
                materialRefs: ['MAT-02'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura' },
              },
            ],
          })),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockCoherentExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 trazos y expresión',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const act = proposal.days[0].activities[0];

      // 5.1: Objetivo observable y adecuado a 25-30 meses
      expect(act.objective).toMatch(/^(?:Estimular|Favorecer|Desarrollar|Promover)/i);
      expect(act.objective.split(' ').length).toBeGreaterThanOrEqual(6);

      // 5.2: Materiales declarados en el inventario disponible
      expect(act.materials.length).toBeGreaterThan(0);
      expect(act.materials[0]).toMatch(/crayones|papel/i);

      // 5.3: Estructura Inicio, Desarrollo, Cierre, Adaptaciones íntegra y sin concatenaciones artificiales
      expect(act.description).toMatch(/^Inicio:\s*/i);
      expect(act.description).toMatch(/\bDesarrollo:\s*/i);
      expect(act.description).toMatch(/\bCierre:\s*/i);
      expect(act.description).toMatch(/\bAdaptaci[oó]n(?:es)?:\s*/i);

      // Cero artefactos "{material}"
      expect(act.description).not.toContain('{material}');
      expect(act.description).not.toMatch(/Con crayones.*:/i);
    });
  });

  describe('9. SR-MD-29O — Corrección Focalizada de Coherencia Pedagógica para Maternal B1', () => {
    const create5DaysProposal = (overrides: Record<string, any[]>) => {
      const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      const readingActivity = {
        category: 'LECTURA EN VOZ ALTA',
        objective: 'Fortalecer el lenguaje y comprensión con el cuento infantil de Spot.',
        proceduralAction: 'Inicio: Mostrar el libro de Spot. Desarrollo: Leer pausadamente mostrando solapas. Cierre: Guardar libro cantando. Adaptaciones: Señalar personajes.',
        materialRefs: ['cuentos ilustrados infantiles'],
        durationMinutes: 15,
        progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura compartida' },
      };
      return weekdays.map((day) => {
        const custom = overrides[day] || [];
        const hasReading = custom.some((a) => a.category === 'LECTURA EN VOZ ALTA');
        const activities = hasReading ? custom : [...custom, readingActivity];
        return {
          dayOfWeek: day,
          activities,
        };
      });
    };

    it('Defecto 1: Materiales inexistentes — elimina módulos de espuma de fixtures fijos y sanitiza a colchonetas a ras de suelo', async () => {
      // 1.1: MATERNAL_B1_APPROVED_ROOM_FIXTURES no contiene módulos psicomotrices de espuma
      expect(MATERNAL_B1_APPROVED_ROOM_FIXTURES).not.toContain('módulos psicomotrices de espuma');
      expect(MATERNAL_B1_APPROVED_ROOM_FIXTURES).not.toContain('módulo de espuma');

      // 1.2: Propuesta con módulos no inventariados es sanitizada a colchonetas a ras de suelo
      const mockUninventoriedModulesExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana de psicomotricidad gruesa',
          days: create5DaysProposal({
            TUESDAY: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Desarrollar la motricidad gruesa subiendo a los módulos psicomotrices de espuma.',
                proceduralAction:
                  'Inicio: Invitar a las niñas y niños a colocarse frente a los módulos psicomotrices de espuma. ' +
                  'Desarrollo: Guiar a subir y bajar de los módulos psicomotrices de espuma con supervisión cercana. ' +
                  'Cierre: Guardar los módulos felicitando el esfuerzo. ' +
                  'Adaptaciones: Brindar apoyo de la mano a quienes muestren marcha vacilante en los módulos.',
                materialRefs: ['módulos psicomotrices de espuma'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Motricidad gruesa' },
              },
            ],
          }),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockUninventoriedModulesExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 activación física martes',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const act = proposal.days[1].activities[0];
      expect(act.objective).not.toMatch(/módulos\s+psicomotrices\s+de\s+espuma/i);
      expect(act.description).not.toMatch(/módulos\s+psicomotrices\s+de\s+espuma/i);
      expect(act.description).toMatch(/colchonetas\s+limpias\s+dispuestas\s+a\s+ras\s+de\s+suelo|colchonetas/i);
      expect(act.materials).not.toContain('módulos psicomotrices de espuma');
    });

    it('Defecto 2: Movimiento restringido — prohíbe todo comportamiento de salto («saltando suavemente», ranitas saltando, saltitos) en Maternal B1', async () => {
      // 2.1: Política rechaza explícitamente saltando suavemente
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                objective: 'Estimular la motricidad gruesa saltando suavemente como ranitas',
                description: 'La Asistente propone el juego de ranitas saltando suavemente por la sala.',
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(candidate, MATERNAL_B1_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b1-forced-jumping-and-competition')).toBe(true);

      // 2.2: Sanitización de comportamiento de salto a agacharse y caminar a ras de suelo sin saltos
      const mockJumpingExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana de imitación motriz',
          days: create5DaysProposal({
            THURSDAY: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Estimular la motricidad gruesa saltando suavemente como ranitas.',
                proceduralAction:
                  'Inicio: Sentados sobre las colchonetas limpias, la Asistente presenta la canción de las ranitas. ' +
                  'Desarrollo: La Asistente motiva al grupo a desplazarse imitando ranitas saltando suavemente por el espacio acolchado, dando saltitos alegres. ' +
                  'Cierre: Sentarse a descansar respirando suavemente. ' +
                  'Adaptaciones: Brindar apoyo cercano de la mano a quien lo requiera durante los saltitos.',
                materialRefs: ['colchonetas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Desplazamiento' },
              },
            ],
          }),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockJumpingExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 ranitas jueves',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const act = proposal.days[3].activities[0];
      expect(act.objective).not.toMatch(/saltando\s+suavemente|dar\s+saltitos|saltar/i);
      expect(act.description).not.toMatch(/saltando\s+suavemente|dar\s+saltitos/i);
      expect(act.description).toMatch(/caminando\s+a\s+paso\s+firme\s+a\s+ras\s+de\s+suelo|agacharse|desplaz/i);
    });

    it('Defecto 3: Contradicción interna — preserva actividad auténtica de esquema corporal en jueves y garantiza unidad armónica en enriquecimiento', async () => {
      // Caso 3A: Preservación de actividad auténtica de esquema corporal en jueves (no es sobreescrita por arrullo)
      const mockBodySchemaExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana de juego simbólico y conocimiento corporal',
          days: create5DaysProposal({
            WEDNESDAY: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Estimular la imitación y el cuidado alimentando a los muñecos de tela.',
                proceduralAction:
                  'Inicio: Presentar los muñecos de tela. ' +
                  'Desarrollo: Ofrecer comidita imaginaria a los muñecos de tela con cariño. ' +
                  'Cierre: Guardar cantando. ' +
                  'Adaptaciones: Facilitar muñecos duplicados.',
                materialRefs: ['muñecos de tela'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Alimentar' },
              },
            ],
            THURSDAY: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Favorecer el reconocimiento del esquema corporal identificando partes del cuerpo en el muñeco de tela.',
                proceduralAction:
                  'Inicio: Sentados en semicírculo sobre el tapete limpio, la Asistente presenta los muñecos de tela nombrando los ojos y nariz. ' +
                  'Desarrollo: La Asistente invita a señalar dónde están los ojos, nariz, boca y pies en su muñeco de tela y en sí mismos. ' +
                  'Cierre: Abrazar con ternura al muñeco felicitando los descubrimientos corporales. ' +
                  'Adaptaciones: Modular preguntas sencillas («¿dónde están los pies?») y validar señalamientos gestuales o miradas en niñas y niños con lenguaje verbal emergente.',
                materialRefs: ['muñecos de tela', 'tapete limpio'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Esquema corporal' },
              },
            ],
          }),
        }),
      };

      const sourceA = new AIWeeklyPlanningProposalSource(mockBodySchemaExecutor);
      const proposalA = await sourceA.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 esquema corporal jueves',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const thursdayAct = proposalA.days[3].activities[0];
      // El jueves auténtico conserva su foco de esquema corporal sin ser sustituido por arrullo de muñecos
      expect(thursdayAct.objective).toMatch(/esquema\s+corporal|partes\s+del\s+cuerpo/i);
      expect(thursdayAct.description).toMatch(/ojos|nariz|pies/i);
      expect(thursdayAct.description).not.toMatch(/canción\s+de\s+cuna|siesta|mecer\s+y\s+arropar/i);

      // Caso 3B: Si se enriquece por duplicación literal (5 días de cocinar), la actividad resultante es 100% armónica
      const mockDuplicateDollsExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana repetitiva de muñecos',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Estimular el juego simbólico cocinando para los muñecos.',
                proceduralAction:
                  'Inicio: Sentados en el tapete, repartir muñecos. ' +
                  'Desarrollo: Invitar a cocinar para los muñecos con cazuelitas imaginarias. ' +
                  'Cierre: Guardar muñecos. ' +
                  'Adaptaciones: Facilitar muñecos duplicados.',
                materialRefs: ['muñecos de tela'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Juego' },
              },
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Lectura compartida.',
                proceduralAction: 'Inicio: Portada. Desarrollo: Lectura pausada. Cierre: Guardar. Adaptaciones: Señalar.',
                materialRefs: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
              },
            ],
          })),
        }),
      };

      const sourceB = new AIWeeklyPlanningProposalSource(mockDuplicateDollsExecutor);
      const proposalB = await sourceB.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 muñecos repetitivos',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const thursdayEnriched = proposalB.days[3].activities[0];
      // Jueves enriquecido es una unidad pedagógica completa y sin contradicciones
      expect(thursdayEnriched.objective).toMatch(/arropando\s+y\s+meciendo\s+a\s+los\s+muñecos\s+en\s+colchonetas\s+limpias/i);
      expect(thursdayEnriched.description).toMatch(/Inicio:\s*Disponer\s+las\s+colchonetas\s+limpias/i);
      expect(thursdayEnriched.description).toMatch(/Desarrollo:.*canción\s+de\s+cuna.*mecer\s+y\s+arropar/i);
      expect(thursdayEnriched.description).toMatch(/Cierre:\s*Colocar\s+a\s+los\s+muñecos\s+a\s+descansar/i);
      expect(thursdayEnriched.description).toMatch(/Adaptaciones:\s*Acompañar\s+físicamente\s+el\s+arrullo/i);
      expect(thursdayEnriched.materials).toContain('colchonetas limpias');
      // No debe contener vestigios inconexos de reconocimiento corporal
      expect(thursdayEnriched.description).not.toMatch(/ojos,\s*nariz,\s*boca/i);
    });

    it('Defecto 4: Materiales omitidos — sanitiza bandejas, asegura objetos en correspondencia, erradica reproductores y murales en pared', async () => {
      const mockOmittedMaterialsExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana con materiales omitidos',
          days: create5DaysProposal({
            TUESDAY: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificar bloques por color en bandejas amplias.',
                proceduralAction:
                  'Inicio: Disponer bandejas de clasificación en el suelo. ' +
                  'Desarrollo: Colocar bloques amarillos en una bandeja y azules en otra bandeja. ' +
                  'Cierre: Guardar bloques. ' +
                  'Adaptaciones: Apoyar en la clasificación.',
                materialRefs: ['bandejas'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Clasificar' },
              },
            ],
            WEDNESDAY: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Estimular la correspondencia uno a uno introduciendo bloques en cajas de cartón limpias.',
                proceduralAction:
                  'Inicio: Sentados en el tapete frente a las cajas de cartón limpias. ' +
                  'Desarrollo: Colocar un bloque grande dentro de cada caja de cartón limpia diciendo «uno aquí, otro allá». ' +
                  'Cierre: Guardar materiales. ' +
                  'Adaptaciones: Modelar la correspondencia.',
                materialRefs: ['cajas de cartón limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Correspondencia' },
              },
            ],
            THURSDAY: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Moverse por el circuito con música suave de fondo guiados por el reproductor.',
                proceduralAction:
                  'Inicio: Encender el reproductor de música. ' +
                  'Desarrollo: Desplazarse sobre colchonetas limpias con música relajante emitida por la grabadora. ' +
                  'Cierre: Apagar el reproductor y guardar colchonetas. ' +
                  'Adaptaciones: Apoyar la marcha.',
                materialRefs: ['reproductor de música', 'colchonetas limpias'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Movimiento' },
              },
            ],
            FRIDAY: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Fijar el mural de papel bond en la pared con cinta adhesiva para dibujo colectivo.',
                proceduralAction:
                  'Inicio: Fijar el mural de papel bond en la pared con cinta adhesiva y chinchetas. ' +
                  'Desarrollo: Dibujar con crayones gruesos en el mural pegado en la pared. ' +
                  'Cierre: Desprender la cinta y admirar el mural. ' +
                  'Adaptaciones: Facilitar crayones gruesos.',
                materialRefs: ['papel bond', 'cinta adhesiva', 'crayones gruesos'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Mural' },
              },
            ],
          }),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockOmittedMaterialsExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 materiales',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      // Martes: bandejas eliminadas y sustituidas por cajas de cartón limpias o tapete
      const tuesdayAct = proposal.days[1].activities[0];
      expect(tuesdayAct.description).not.toMatch(/\bbandejas?\b/i);
      expect(tuesdayAct.materials).not.toContain('bandejas');
      expect(tuesdayAct.materials.some((m) => /cajas\s+de\s+cartón|tapete/i.test(m))).toBe(true);

      // Miércoles: correspondencia contiene tanto cajas como bloques
      const wednesdayAct = proposal.days[2].activities[0];
      expect(wednesdayAct.materials.some((m) => /cajas\s+de\s+cartón/i.test(m))).toBe(true);
      expect(wednesdayAct.materials.some((m) => /bloques/i.test(m))).toBe(true);

      // Jueves: reproductor / grabadora erradicado de materiales y sustituido por canto/palmadas
      const thursdayAct = proposal.days[3].activities[0];
      expect(thursdayAct.materials).not.toContain('reproductor de música');
      expect(thursdayAct.description).not.toMatch(/reproductor|grabadora/i);
      expect(thursdayAct.description).toMatch(/canto|palmadas|nana/i);

      // Viernes: mural en pared y cinta adhesiva erradicados; papel a ras de suelo en tapete
      const fridayAct = proposal.days[4].activities[0];
      expect(fridayAct.materials).not.toContain('cinta adhesiva');
      expect(fridayAct.description).not.toMatch(/pared|cinta\s+adhesiva|chinchetas?/i);
      expect(fridayAct.description).toMatch(/ras\s+de\s+suelo|tapete\s+limpio/i);
    });

    it('Defecto 5: Progresión inconsistente — sincroniza el observationTarget con la experiencia pedagógica real', async () => {
      const mockProgressionExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Semana de progresión sincronizada',
          days: create5DaysProposal({
            MONDAY: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Explorar autónomamente las imágenes y personajes del cuento infantil.',
                proceduralAction: 'Inicio: Sentados en semicírculo. Desarrollo: Mostrar libro y pasar páginas. Cierre: Guardar libro. Adaptaciones: Señalar ilustraciones.',
                materialRefs: ['MAT-02'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Lectura genérica' },
              },
            ],
            TUESDAY: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Realizar trazos continuos y cambio de colores sobre papel bond con crayones gruesos.',
                proceduralAction: 'Inicio: Disponer papel en el piso. Desarrollo: Trazar líneas libres con crayones. Cierre: Guardar crayones. Adaptaciones: Apoyo en prensión.',
                materialRefs: ['MAT-01', 'MAT-08'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Dibujo genérico' },
              },
            ],
            WEDNESDAY: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Clasificar y agrupar bloques por color notorio en cajas de cartón limpias.',
                proceduralAction: 'Inicio: Colocar cajas limpias. Desarrollo: Separar bloques amarillos y azules. Cierre: Guardar bloques. Adaptaciones: Señalar colores.',
                materialRefs: ['MAT-03', 'MAT-07'],
                durationMinutes: 15,
                progression: { role: 'EXPLORE', revisitsSlot: null, repetitionPurpose: null, variationDimensions: null, observationTarget: 'Matemáticas genéricas' },
              },
            ],
          }),
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockProgressionExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 progresión',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const prog = proposal.progression;
      expect(prog).toBeDefined();
      expect(prog!.experiences.length).toBeGreaterThanOrEqual(5);

      // Cada observación prospectiva en progresión corresponde efectivamente a la experiencia pedagógica planificada
      // Lunes: observación de lectura o exploración autónoma
      const expMonday = prog!.experiences[0];
      expect(expMonday.observationTarget).toMatch(/cuento|p[aá]ginas?|personajes?|ilustraciones?|atenci[oó]n|vocabulario|lectura/i);

      // Martes: observación de trazos y crayones
      const expTuesday = prog!.experiences[1];
      expect(expTuesday.observationTarget).toMatch(/trazos?|cray[oó]n|prensión|gr[aá]fico|color/i);

      // Miércoles: observación de bloques y clasificación
      const expWednesday = prog!.experiences.find((e) => /clasific|agrup|bloques?|color/i.test(e.observationTarget));
      expect(expWednesday).toBeDefined();
      expect(expWednesday!.observationTarget).toMatch(/clasific|agrup|bloques?|color/i);
    });
  });

  // 10. SR-MD-29Q — Corrección Final de Coherencia Pedagógica para Maternal B1
  describe('10. SR-MD-29Q — Corrección Final de Coherencia Pedagógica para Maternal B1', () => {
    const createDefaultDayActivities = (dayName: string) => [
      {
        category: 'LECTURA EN VOZ ALTA',
        objective: `Fortalecer la escucha activa explorando libros con figuras en ${dayName}.`,
        proceduralAction:
          'Inicio: Disponer tapete cálido. Desarrollo: Hojean cuentos ilustrados reconociendo animales. Cierre: Guardar cuentos en el canasto de libros a ras de suelo. Adaptaciones: Acompañamiento sensible.',
        materialRefs: ['cuentos ilustrados infantiles'],
        durationMinutes: 15,
        progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
      },
      {
        category: 'PENSAMIENTO MATEMÁTICO',
        objective: `Favorecer la exploración espacial manipulando bloques en ${dayName}.`,
        proceduralAction:
          'Inicio: Cajas con bloques. Desarrollo: Apilar bloques grandes de plástico lavable en tapete limpio. Cierre: Guardar en cajas de cartón limpias a ras de suelo. Adaptaciones: Respeto al juego paralelo.',
        materialRefs: ['bloques grandes de plástico lavable'],
        durationMinutes: 15,
        progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
      },
      {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: `Estimular la expresión gráfico-plástica con trazos libres en ${dayName}.`,
        proceduralAction:
          'Inicio: Papel en el piso. Desarrollo: Garabatear libremente con crayones gruesos de cera sobre pliegos de papel bond a ras de suelo. Cierre: Admirar trazos libres. Adaptaciones: Hojas amplias.',
        materialRefs: ['pliegos de papel bond', 'crayones gruesos de cera'],
        durationMinutes: 15,
        progression: { role: 'EXPLORE', observationTarget: 'Arte' },
      },
      {
        category: 'ACTIVACIÓN FÍSICA',
        objective: `Afianzar la marcha a ras de suelo sobre colchonetas limpias en ${dayName}.`,
        proceduralAction:
          'Inicio: Despejar colchonetas. Desarrollo: Caminar con soltura a ras de suelo sobre colchonetas limpias sin obstáculos. Cierre: Respiración serena acostados. Adaptaciones: Apoyo de la mano.',
        materialRefs: ['colchonetas limpias'],
        durationMinutes: 15,
        progression: { role: 'EXPLORE', observationTarget: 'Motor' },
      },
      {
        category: 'AMBIENTES DE APRENDIZAJE',
        objective: `Fortalecer la autonomía en el lavado de manos en ${dayName}.`,
        proceduralAction:
          'Inicio: Lavabo infantil. Desarrollo: Lavado y secado guiado de manos con toallas limpias individuales. Cierre: Colocar toalla en toallero bajo. Adaptaciones: Guía mano a mano.',
        materialRefs: ['lavabo infantil con toallas limpias'],
        durationMinutes: 15,
        progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
      },
    ];

    it('Problema 1: Erradica objetivos truncados («Estimular.») y garantiza intención pedagógica completa con acción, edad y materiales', async () => {
      const mockTruncatedObjExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Objetivos pedagógicos completos en Maternal B1',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Estimular.',
                  proceduralAction:
                    'Inicio: Disponer tapete. Desarrollo: Leer el cuento de Spot con las niñas y niños. Cierre: Despedir a los personajes. Adaptaciones: Apoyo cercano.',
                  materialRefs: ['cuentos ilustrados infantiles'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Estimular la exploración de bloques grandes de plástico lavable.',
                  proceduralAction:
                    'Inicio: Cajas con bloques. Desarrollo: Apilar y clasificar bloques por color notorio en cajas de cartón limpias. Cierre: Guardar en cajas. Adaptaciones: Respeto al juego paralelo.',
                  materialRefs: ['bloques grandes de plástico lavable'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Favorecer.',
                  proceduralAction:
                    'Inicio: Colocar papel en suelo. Desarrollo: Trazar garabatos libres con crayones gruesos de cera sobre el papel. Cierre: Admirar trazos. Adaptaciones: Hojas amplias.',
                  materialRefs: ['pliegos de papel bond', 'crayones gruesos de cera'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Arte' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'A través de.',
                  proceduralAction:
                    'Inicio: Colchonetas limpias. Desarrollo: Caminar con soltura a ras de suelo sobre colchonetas limpias siguiendo trayectorias libres. Cierre: Respiración suave. Adaptaciones: Apoyo de mano.',
                  materialRefs: ['colchonetas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Motor' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Promover.',
                  proceduralAction:
                    'Inicio: Acercarse al lavabo infantil. Desarrollo: Lavar y secar las manos con toallas limpias individuales con autonomía guiada. Cierre: Colocar toalla en toallero bajo. Adaptaciones: Modelado respetuoso.',
                  materialRefs: ['lavabo infantil con toallas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
                },
              ],
            },
            ...['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek) => ({
              dayOfWeek,
              activities: createDefaultDayActivities(dayOfWeek),
            })),
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockTruncatedObjExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 corrección de objetivos truncados',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const acts = proposal.days[0].activities;
      expect(acts).toHaveLength(5);

      for (const act of acts) {
        // Ningún objetivo debe ser una palabra aislada o estar truncado
        expect(act.objective).not.toBe('Estimular.');
        expect(act.objective).not.toBe('Favorecer.');
        expect(act.objective).not.toBe('Promover.');
        expect(act.objective).not.toMatch(/^(?:estimular|favorecer|promover|desarrollar|propiciar|afianzar)\.?$/i);
        expect(act.objective).not.toMatch(/\ba\s+trav[eé]s\s+de\.?$/i);

        // Cada objetivo debe ser una oración completa formulada en infinitivo con propósito concreto
        const wordCount = act.objective.split(/\s+/).length;
        expect(wordCount).toBeGreaterThanOrEqual(6);
        expect(act.objective).toMatch(/^(?:Estimular|Favorecer|Promover|Fortalecer|Afianzar|Desarrollar)/);
      }
    });

    it('Problema 2: Coherencia real entre inventario y acciones (clasificación con manipulables y contenedores, erradicación de estantes bajos y correspondencia de papel bond)', async () => {
      const mockInventoryCoherenceExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Coherencia estricta inventario-acciones',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: createDefaultDayActivities('MONDAY'),
            },
            {
              dayOfWeek: 'TUESDAY',
              activities: [
                createDefaultDayActivities('TUESDAY')[0],
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Estimular la discriminación visual clasificando por colores notorios.',
                  proceduralAction:
                    'Inicio: Se dispone el espacio. Desarrollo: Las niñas y niños juegan a clasificar por colores amarillo y azul. Cierre: Cantar rima de orden. Adaptaciones: Acompañar el ritmo.',
                  materialRefs: [],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Color' },
                },
                ...createDefaultDayActivities('TUESDAY').slice(2),
              ],
            },
            {
              dayOfWeek: 'WEDNESDAY',
              activities: createDefaultDayActivities('WEDNESDAY'),
            },
            {
              dayOfWeek: 'THURSDAY',
              activities: createDefaultDayActivities('THURSDAY'),
            },
            {
              dayOfWeek: 'FRIDAY',
              activities: [
                createDefaultDayActivities('FRIDAY')[0],
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Clasificar por tamaño grande y pequeño y ordenar en estantes bajos.',
                  proceduralAction:
                    'Inicio: Presentar elementos. Desarrollo: Comparar tamaños de los objetos y guardarlos en estantes bajos con orden. Cierre: Aplausos. Adaptaciones: Apoyo.',
                  materialRefs: [],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Tamaño' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Creación colectiva de mural con crayones gruesos sobre papel bond.',
                  proceduralAction:
                    'Inicio: Extender papel bond en el piso. Desarrollo: Dibujar un mural colectivo con crayones gruesos de cera sobre el papel bond a ras de suelo. Cierre: Admirar el mural. Adaptaciones: Apoyo.',
                  materialRefs: ['crayones gruesos de cera'],
                  durationMinutes: 20,
                  progression: { role: 'EXPLORE', observationTarget: 'Mural' },
                },
                ...createDefaultDayActivities('FRIDAY').slice(3),
              ],
            },
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockInventoryCoherenceExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 coherencia material',
          availableMaterials:
            'Bloques grandes de plástico lavable, pliegos de papel bond, crayones gruesos de cera, colchonetas limpias, lavabo infantil con toallas limpias',
        },
      });

      // 1. Martes (EXP-D2-A2): clasificación sin objetos físicos identificados resuelve al manipulable real
      const tuesdayClassAct = proposal.days[1].activities[1];
      expect(tuesdayClassAct.materials).toContain('bloques grandes de plástico lavable');
      expect(tuesdayClassAct.description).toMatch(/bloques grandes de plástico lavable/i);
      expect(tuesdayClassAct.description).toMatch(/cajas de cartón limpias|tapete limpio/i);

      // 2. Viernes (EXP-D5-A2): estante bajo erradicado y manipulables concretos
      const fridayClassAct = proposal.days[4].activities[1];
      expect(fridayClassAct.description).not.toMatch(/\bestantes?\s+bajos?\b/i);
      expect(fridayClassAct.objective).not.toMatch(/\bestantes?\s+bajos?\b/i);
      expect(fridayClassAct.materials).toContain('bloques grandes de plástico lavable');
      expect(fridayClassAct.description).toMatch(/cajas de cartón limpias/i);

      // 3. Viernes (EXP-D5-A3): correspondencia biunívoca con 'pliegos de papel bond'
      const fridayArtAct = proposal.days[4].activities[2];
      expect(fridayArtAct.materials).toContain('pliegos de papel bond');
      expect(fridayArtAct.materials).toContain('crayones gruesos de cera');
    });

    it('Problema 3: Cierres auténticos y variados — erradica la repetición sistemática de «Aplaudir y cantar una rima breve de orden para guardar»', async () => {
      const repetitiveClosure =
        'Inicio: Se preparan los materiales. Desarrollo: Las niñas y niños exploran con entusiasmo guiados por la Asistente. Cierre: Aplaudir y cantar una rima breve de orden para guardar. Adaptaciones: Acompañamiento sensible.';

      const mockRepetitiveClosureExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Cierres auténticos y variados en Maternal B1',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Fortalecer el lenguaje expresivo mediante la exploración del libro de cartón grueso.',
                  proceduralAction: repetitiveClosure.replace('materiales', 'el cuento ilustrado'),
                  materialRefs: ['cuentos ilustrados infantiles'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Lectura' },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Favorecer las relaciones espaciales manipulando y clasificando bloques grandes.',
                  proceduralAction: repetitiveClosure.replace('materiales', 'los bloques grandes de plástico lavable'),
                  materialRefs: ['bloques grandes de plástico lavable'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Bloques' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Estimular la expresión gráfico-plástica realizando trazos libres con crayones gruesos sobre papel.',
                  proceduralAction: repetitiveClosure.replace('materiales', 'los pliegos de papel bond y crayones'),
                  materialRefs: ['pliegos de papel bond', 'crayones gruesos de cera'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Arte' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'Afianzar la marcha autónoma y la coordinación motriz a ras de suelo.',
                  proceduralAction: repetitiveClosure.replace('materiales', 'las colchonetas limpias'),
                  materialRefs: ['colchonetas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Motor' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Fomentar la autonomía motriz en el lavado y secado activo de manos en lavabo infantil.',
                  proceduralAction: repetitiveClosure.replace('materiales', 'las toallas limpias individuales'),
                  materialRefs: ['lavabo infantil con toallas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Higiene' },
                },
              ],
            },
            ...['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek) => ({
              dayOfWeek,
              activities: createDefaultDayActivities(dayOfWeek),
            })),
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockRepetitiveClosureExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 diversificación de cierres',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const acts = proposal.days[0].activities;
      const closures = acts.map((act) => {
        const match = act.description.match(/Cierre:\s*([^\n]+)/i);
        return match ? match[1].trim() : '';
      });

      // Ninguna actividad conserva la fórmula repetitiva idéntica
      for (const closure of closures) {
        expect(closure).not.toMatch(/Aplaudir y cantar una rima breve de orden para guardar/i);
      }

      // Los cierres deben ser diversos entre sí
      const uniqueClosures = new Set(closures);
      expect(uniqueClosures.size).toBe(5);

      // Cierre de lectura menciona libro/personajes
      expect(closures[0]).toMatch(/libro|personajes|canasto/i);

      // Cierre de bloques menciona construcciones o cajas de cartón
      expect(closures[1]).toMatch(/construcciones|cajas de cartón/i);

      // Cierre de arte menciona trazos o crayones
      expect(closures[2]).toMatch(/trazos|crayones/i);

      // Cierre de activación física menciona respiraciones o calma en colchoneta
      expect(closures[3]).toMatch(/colchoneta|respiraciones|canto sereno/i);

      // Cierre de higiene menciona toalla o toallero
      expect(closures[4]).toMatch(/toalla|toallero|cesto|manitas/i);
    });

    it('Problema 4: Seguridad motriz — erradica «sortear desniveles» en EXP-D2-A4 y garantiza actividades a ras de suelo sin desniveles forzados', async () => {
      const mockDesnivelesExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Seguridad motriz a ras de suelo en Maternal B1',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: createDefaultDayActivities('MONDAY'),
            },
            {
              dayOfWeek: 'TUESDAY',
              activities: [
                createDefaultDayActivities('TUESDAY')[0],
                createDefaultDayActivities('TUESDAY')[1],
                createDefaultDayActivities('TUESDAY')[2],
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'Favorecer el desplazamiento seguro sorteando desniveles a su paso.',
                  proceduralAction:
                    'Inicio: Disponer colchonetas limpias en el área. Desarrollo: Las niñas y niños sortean desniveles sobre colchonetas limpias a ras de suelo caminando con entusiasmo. Cierre: Retorno a la calma. Adaptaciones: Apoyo de la mano.',
                  materialRefs: ['colchonetas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Motor' },
                },
                createDefaultDayActivities('TUESDAY')[4],
              ],
            },
            ...['WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek) => ({
              dayOfWeek,
              activities: createDefaultDayActivities(dayOfWeek),
            })),
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockDesnivelesExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 motricidad a ras de suelo',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const motorAct = proposal.days[1].activities[3];

      // Verificación estricta: 'desniveles' completamente erradicado de descripción y objetivo
      expect(motorAct.description).not.toMatch(/desniveles/i);
      expect(motorAct.description).not.toMatch(/sortear desniveles/i);
      expect(motorAct.objective).not.toMatch(/desniveles/i);
      expect(motorAct.objective).not.toMatch(/sorteando desniveles/i);

      // Afirma desplazamientos a ras de suelo sobre colchonetas limpias
      expect(motorAct.description).toMatch(/colchonetas limpias/i);
      expect(motorAct.description).toMatch(/a ras de suelo|trayectorias/i);

      // Validar contra regla de desarrollo MATERNAL_B1_DEVELOPMENTAL_RULE
      const hasExcludedPattern = MATERNAL_B1_DEVELOPMENTAL_RULE.excludedActionPatterns.some((pattern) =>
        pattern.test(motorAct.description)
      );
      expect(hasExcludedPattern).toBe(false);
    });

    it('Problema 5: Progresión semántica auténtica — revisitsExperienceId, role y variationDimensions corresponden auténticamente a cada experiencia y no vinculan dominios disjuntos', async () => {
      // Escenario crítico del MASTER ARB:
      // Lunes: A1=Lectura, A2=Garabateo (Arte).
      // Martes: A1=Lectura (Revisit), A2=Clasificación de bloques (NUEVA en la semana: debe ser EXPLORE, nunca vincularse al garabateo).
      // Miércoles: A1=Lectura (Vary), A2=Clasificación de bloques (Revisit de los bloques del martes).
      const mockProgressionSemanticsExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Progresión semántica auténtica por áreas',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Fortalecer el vínculo afectivo y la atención compartida mediante la exploración del cuento.',
                  proceduralAction:
                    'Inicio: Disponer tapete cálido. Desarrollo: Hojean el cuento de Spot señalando personajes. Cierre: Despedir a los personajes. Adaptaciones: Permitir observar sentados.',
                  materialRefs: ['cuentos ilustrados infantiles'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Lectura portada' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Estimular la prensión palmar realizando trazos libres y garabateo con crayones gruesos sobre papel.',
                  proceduralAction:
                    'Inicio: Colocar pliegos de papel bond en el piso. Desarrollo: Garabatear con crayones gruesos de cera libremente. Cierre: Guardar crayones. Adaptaciones: Prensión palmar.',
                  materialRefs: ['pliegos de papel bond', 'crayones gruesos de cera'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Garabateo inicial' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'Afianzar la marcha a ras de suelo sobre colchonetas limpias.',
                  proceduralAction:
                    'Inicio: Colchonetas limpias. Desarrollo: Caminar con soltura sobre colchonetas limpias. Cierre: Respiración serena. Adaptaciones: De la mano.',
                  materialRefs: ['colchonetas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Motor libre' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Favorecer el afecto y la expresión lúdica cuidando muñecos de tela suaves.',
                  proceduralAction:
                    'Inicio: Cesta de muñecos. Desarrollo: Acunar y mecer muñecos de tela suaves en el tapete limpio. Cierre: Arroparlos en canasto. Adaptaciones: Respeto.',
                  materialRefs: ['muñecos de tela'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Afecto muñecos' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Promover la autonomía lavando y secando las manos con toallas individuales.',
                  proceduralAction:
                    'Inicio: Lavabo infantil. Desarrollo: Lavado de manos con agua y jabón. Cierre: Colocar toalla en toallero bajo. Adaptaciones: Guía suave.',
                  materialRefs: ['lavabo infantil con toallas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Higiene autónoma' },
                },
              ],
            },
            {
              dayOfWeek: 'TUESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Estimular la anticipación interactiva mediante preguntas sencillas y solapas del cuento.',
                  proceduralAction:
                    'Inicio: Mostrar portada. Desarrollo: Relectura interactiva buscando a Spot y señalando solapas. Cierre: Cerrar libro. Adaptaciones: Preguntas sencillas.',
                  materialRefs: ['cuentos ilustrados infantiles'],
                  durationMinutes: 15,
                  progression: { role: 'REVISIT', revisitsSlot: 'D1_A1', observationTarget: 'Búsqueda de solapas' },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Favorecer la discriminación visual agrupando bloques grandes de plástico lavable por color notorio.',
                  proceduralAction:
                    'Inicio: Colocar bloques. Desarrollo: Clasificar bloques grandes por color notorio en cajas de cartón limpias a ras de suelo. Cierre: Guardar en cajas. Adaptaciones: Juego paralelo.',
                  materialRefs: ['bloques grandes de plástico lavable'],
                  durationMinutes: 15,
                  progression: { role: 'EXPLORE', observationTarget: 'Clasificación color' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'Afianzar la marcha a ras de suelo sobre colchonetas limpias en martes.',
                  proceduralAction:
                    'Inicio: Colchonetas limpias. Desarrollo: Caminar con soltura sobre colchonetas limpias. Cierre: Respiración serena. Adaptaciones: De la mano.',
                  materialRefs: ['colchonetas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'REVISIT', revisitsSlot: 'D1_A3', observationTarget: 'Motor ritmo' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Favorecer el afecto y la expresión lúdica acunando muñecos de tela suaves en martes.',
                  proceduralAction:
                    'Inicio: Cesta de muñecos. Desarrollo: Acunar y alimentar muñecos de tela suaves en el tapete limpio. Cierre: Arroparlos en canasto. Adaptaciones: Respeto.',
                  materialRefs: ['muñecos de tela'],
                  durationMinutes: 15,
                  progression: { role: 'REVISIT', revisitsSlot: 'D1_A4', observationTarget: 'Afecto muñecos martes' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Promover la autonomía lavando y secando las manos con toallas individuales en martes.',
                  proceduralAction:
                    'Inicio: Lavabo infantil. Desarrollo: Lavado de manos con agua y jabón. Cierre: Colocar toalla en toallero bajo. Adaptaciones: Guía suave.',
                  materialRefs: ['lavabo infantil con toallas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'REVISIT', revisitsSlot: 'D1_A5', observationTarget: 'Higiene autónoma martes' },
                },
              ],
            },
            {
              dayOfWeek: 'WEDNESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Favorecer la expresión oral imitando onomatopeyas de animales del cuento.',
                  proceduralAction:
                    'Inicio: Abrir cuento. Desarrollo: Imitar sonidos de animales al pasar las páginas. Cierre: Canción de cierre. Adaptaciones: Onomatopeyas.',
                  materialRefs: ['cuentos ilustrados infantiles'],
                  durationMinutes: 15,
                  progression: { role: 'VARY', revisitsSlot: 'D2_A1', observationTarget: 'Onomatopeyas' },
                },
                {
                  category: 'PENSAMIENTO MATEMÁTICO',
                  objective: 'Estimular la correspondencia uno a uno introduciendo bloques grandes individuales en cajas de cartón limpias.',
                  proceduralAction:
                    'Inicio: Disponer cajas. Desarrollo: Introducir bloques grandes en cajas de cartón limpias uno a uno. Cierre: Guardar cajas. Adaptaciones: Posesión de materiales.',
                  materialRefs: ['bloques grandes de plástico lavable'],
                  durationMinutes: 15,
                  progression: { role: 'REVISIT', revisitsSlot: 'D2_A2', observationTarget: 'Correspondencia uno a uno' },
                },
                {
                  category: 'ACTIVACIÓN FÍSICA',
                  objective: 'Afianzar la marcha a ras de suelo sobre colchonetas limpias en miércoles.',
                  proceduralAction:
                    'Inicio: Colchonetas limpias. Desarrollo: Caminar con soltura sobre colchonetas limpias. Cierre: Respiración serena. Adaptaciones: De la mano.',
                  materialRefs: ['colchonetas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'VARY', revisitsSlot: 'D2_A3', observationTarget: 'Motor curvas' },
                },
                {
                  category: 'EXPERIENCIAS ARTÍSTICAS',
                  objective: 'Favorecer el afecto y la expresión lúdica paseando muñecos de tela suaves en miércoles.',
                  proceduralAction:
                    'Inicio: Cesta de muñecos. Desarrollo: Pasear muñecos de tela suaves en el tapete limpio. Cierre: Arroparlos en canasto. Adaptaciones: Respeto.',
                  materialRefs: ['muñecos de tela'],
                  durationMinutes: 15,
                  progression: { role: 'VARY', revisitsSlot: 'D2_A4', observationTarget: 'Afecto muñecos miércoles' },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Promover la autonomía lavando y secando las manos con toallas individuales en miércoles.',
                  proceduralAction:
                    'Inicio: Lavabo infantil. Desarrollo: Lavado de manos con agua y jabón. Cierre: Colocar toalla en toallero bajo. Adaptaciones: Guía suave.',
                  materialRefs: ['lavabo infantil con toallas limpias'],
                  durationMinutes: 15,
                  progression: { role: 'VARY', revisitsSlot: 'D2_A5', observationTarget: 'Higiene autónoma miércoles' },
                },
              ],
            },
            ...['THURSDAY', 'FRIDAY'].map((dayOfWeek) => ({
              dayOfWeek,
              activities: createDefaultDayActivities(dayOfWeek),
            })),
          ],
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockProgressionSemanticsExecutor);
      const proposal = await source.propose({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        modality: 'DIRECT',
        room: roomMaternalB1,
        currentContext: {
          observations: 'Maternal B1 progresión semántica auténtica',
          availableMaterials: sampleAvailableMaterials,
        },
      });

      const prog = proposal.progression;
      expect(prog).toBeDefined();

      const experiences = prog!.experiences;
      // D1_A1: Lectura lunes
      const d1a1 = experiences.find((e) => e.experienceId === 'EXP-D1-A1');
      expect(d1a1?.role).toBe('EXPLORE');
      expect(d1a1?.revisitsExperienceId).toBeUndefined();

      // D1_A2: Garabateo lunes
      const d1a2 = experiences.find((e) => e.experienceId === 'EXP-D1-A2');
      expect(d1a2?.role).toBe('EXPLORE');
      expect(d1a2?.revisitsExperienceId).toBeUndefined();

      // D2_A1: Lectura martes (segunda ocurrencia de lectura) -> retoma EXP-D1-A1 como REVISIT
      const d2a1 = experiences.find((e) => e.experienceId === 'EXP-D2-A1');
      expect(d2a1?.role).toBe('REVISIT');
      expect(d2a1?.revisitsExperienceId).toBe('EXP-D1-A1');
      expect(d2a1?.variationDimensions).toContain('INTERACTION_MODE');

      // D2_A2: Clasificación martes (PRIMERA ocurrencia de bloques en la semana)
      // CRÍTICO: NO debe vincularse al garabateo de EXP-D1-A2! Debe ser EXPLORE y no tener revisitsExperienceId
      const d2a2 = experiences.find((e) => e.experienceId === 'EXP-D2-A2');
      expect(d2a2?.role).toBe('EXPLORE');
      expect(d2a2?.revisitsExperienceId).toBeUndefined();

      // D3_A1: Lectura miércoles (tercera ocurrencia de lectura) -> retoma EXP-D2-A1 como VARY
      const d3a1 = experiences.find((e) => e.experienceId === 'EXP-D3-A1');
      expect(d3a1?.role).toBe('VARY');
      expect(d3a1?.revisitsExperienceId).toBe('EXP-D2-A1');
      expect(d3a1?.variationDimensions).toContain('CHILD_AGENCY');

      // D3_A2: Bloques miércoles (SEGUNDA ocurrencia de bloques en la semana)
      // Debe vincularse a EXP-D2-A2 (bloques del martes) como REVISIT, NUNCA al garabateo ni a lectura
      const d3a2 = experiences.find((e) => e.experienceId === 'EXP-D3-A2');
      expect(d3a2?.role).toBe('REVISIT');
      expect(d3a2?.revisitsExperienceId).toBe('EXP-D2-A2');
      expect(d3a2?.variationDimensions).toContain('INTERACTION_MODE');
    });
  });
});



