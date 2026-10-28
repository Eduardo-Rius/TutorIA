import { describe, it, expect, vi } from 'vitest';
import { RoomCatalog, Room } from '../RoomCatalog';
import {
  PedagogicalAgePolicyCatalog,
  MATERNAL_B2_AGE_POLICY,
  MATERNAL_B1_AGE_POLICY,
  MATERNAL_A_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_C_AGE_POLICY,
  PedagogicalSafetyValidator,
  PedagogicalWeeklyPlanCandidate,
  MATERNAL_B2_APPROVED_ROOM_FIXTURES,
  MATERNAL_B2_DEVELOPMENTAL_RULE,
} from '../PedagogicalAgePolicy';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  WeeklyPlanningProposalRequest,
  normalizeLactantesBDescriptionStructure,
  sanitizeMaternalB1PedagogicalFidelity,
  buildWeeklyPlanningAISystemPrompt,
  buildWeeklyPlanningAIUserPrompt,
  projectPedagogicalGenerationPolicy,
  buildPrivacyMinimizedAIInput,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';

describe('SR-MD-30 — Política Pedagógica e Integración de IA para Maternal B2 (31–36 meses)', () => {
  const roomMaternalB2: Room = {
    roomId: 'room-maternal-b2',
    name: 'Maternal B2',
    minAgeMonths: 31,
    maxAgeMonths: 36,
  };

  const sampleAvailableMaterials =
    'Bloques grandes de plástico lavable, cuentos ilustrados infantiles, muñecos de tela, pelotas medianas de vinil, aros plásticos grandes, colchonetas limpias, crayones gruesos de cera, lavabo infantil con toallas limpias, cajas de cartón limpias, peines y cepillos infantiles limpios, títeres de tela';

  // =========================================================================
  // 1. CATÁLOGO DE SALAS Y RESOLUCIÓN CANÓNICA
  // =========================================================================
  describe('1. Catálogo de Salas y Resolución Canónica', () => {
    it('resuelve room-maternal-b2 en el catálogo canónico con rango etario oficial 31 a 36 meses (GT Económica págs. 78-88)', () => {
      const room = RoomCatalog.getRoom('room-maternal-b2');
      expect(room).toBeDefined();
      expect(room?.roomId).toBe('room-maternal-b2');
      expect(room?.name).toBe('Maternal B2');
      expect(room?.minAgeMonths).toBe(31);
      expect(room?.maxAgeMonths).toBe(36);
    });

    it('resuelve alias maternal-b2 hacia room-maternal-b2 de forma transparente', () => {
      const roomFromAlias = RoomCatalog.getRoom('maternal-b2');
      expect(roomFromAlias).toBeDefined();
      expect(roomFromAlias?.roomId).toBe('room-maternal-b2');
      expect(roomFromAlias?.name).toBe('Maternal B2');
      expect(roomFromAlias?.minAgeMonths).toBe(31);
      expect(roomFromAlias?.maxAgeMonths).toBe(36);
    });

    it('el catálogo canónico contiene exactamente 6 salas autorizadas sin duplicados', () => {
      const allRooms = RoomCatalog.getAllRooms();
      expect(allRooms).toHaveLength(6);
      expect(allRooms.map((r) => r.roomId)).toEqual([
        'lactantes-c',
        'room-lactantes-a',
        'room-lactantes-b',
        'room-maternal-a',
        'room-maternal-b1',
        'room-maternal-b2',
      ]);
    });
  });

  // =========================================================================
  // 2. POLÍTICA PEDAGÓGICA Y GOBERNANZA DE IA
  // =========================================================================
  describe('2. Política Pedagógica y Gobernanza de IA', () => {
    it('resuelve MATERNAL_B2_AGE_POLICY por roomId, alias y por rango de edad (31–36m)', () => {
      const byRoom = PedagogicalAgePolicyCatalog.getPolicyForRoom(roomMaternalB2);
      expect(byRoom).toBe(MATERNAL_B2_AGE_POLICY);
      expect(byRoom?.roomType).toBe('MATERNAL_B2');
      expect(byRoom?.minAgeMonths).toBe(31);
      expect(byRoom?.maxAgeMonths).toBe(36);

      const byAlias = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'maternal-b2',
        name: 'Maternal B2',
        minAgeMonths: 31,
        maxAgeMonths: 36,
      });
      expect(byAlias).toBe(MATERNAL_B2_AGE_POLICY);

      const byRange = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 31,
        maxAgeMonths: 36,
      });
      expect(byRange).toBe(MATERNAL_B2_AGE_POLICY);
    });

    it('confirma autorización de IA para Maternal B2 y preserva todas las salas autorizadas', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B1')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B2')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C1')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C2')).toBe(false);
    });

    it('define política de densidad y duración recomendada para Maternal B2', () => {
      expect(MATERNAL_B2_AGE_POLICY.densityPolicy.isNormative).toBe(false);
      expect(MATERNAL_B2_AGE_POLICY.densityPolicy.minActivitiesPerDay).toBe(1);
      expect(MATERNAL_B2_AGE_POLICY.densityPolicy.maxActivitiesPerDay).toBe(10);
      expect(MATERNAL_B2_AGE_POLICY.recommendedMaxDurationMinutes).toBe(25);
    });

    it('reconoce fixtures aprobados de sala para Maternal B2 incluyendo canastos, toalleros, lavabos y cajas', () => {
      expect(MATERNAL_B2_APPROVED_ROOM_FIXTURES).toContain('colchonetas limpias');
      expect(MATERNAL_B2_APPROVED_ROOM_FIXTURES).toContain('lavabo infantil');
      expect(MATERNAL_B2_APPROVED_ROOM_FIXTURES).toContain('cajas de cartón limpias');
      expect(MATERNAL_B2_APPROVED_ROOM_FIXTURES).toContain('toallero bajo');
    });
  });

  // =========================================================================
  // 3. REGLAS DE SEGURIDAD INFANTIL PARA MATERNAL B2 (31 A 36 MESES)
  // =========================================================================
  describe('3. Reglas de Seguridad Infantil para Maternal B2', () => {
    it('detecta y bloquea objetos pequeños menores a 3 cm con riesgo de atragantamiento', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Manipular semillas pequeñas para clasificación',
                description: 'Inicio: Se disponen semillas pequeñas y cuentas en el piso.\nDesarrollo: Las niñas y niños separan semillas pequeñas con sus dedos.\nCierre: Guardar materiales.\nAdaptaciones: Respeto al ritmo.',
                materials: ['semillas pequeñas'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B2_AGE_POLICY,
        'semillas pequeñas, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b2-choking-small-parts')).toBe(true);
    });

    it('detecta y bloquea bolsas plásticas y globos de látex por riesgo de asfixia', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'TUESDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Jugar con globos de látex en sala',
                description: 'Inicio: Se entregan globos de látex inflados.\nDesarrollo: Lanzar globos de látex al aire.\nCierre: Guardar globos.\nAdaptaciones: Acompañamiento cercano.',
                materials: ['globos de látex'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B2_AGE_POLICY,
        'globos de látex, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b2-plastic-bags-balloons')).toBe(true);
    });

    it('detecta y bloquea tijeras punzocortantes o cutters', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'WEDNESDAY',
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Recortar figuras con tijeras punzocortantes',
                description: 'Inicio: Entregar tijeras de punta afilada.\nDesarrollo: Cortar papel con tijeras punzocortantes.\nCierre: Ordenar mesa.\nAdaptaciones: Ayuda guiada.',
                materials: ['tijeras'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B2_AGE_POLICY,
        'tijeras, papel bond'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b2-sharp-scissors')).toBe(true);
    });

    it('detecta y bloquea cubrir la cabeza o el rostro de niñas o niños', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Jugar al escondite tapando el rostro',
                description: 'Inicio: Se entrega una manta.\nDesarrollo: Cubrir la cabeza completamente con una sábana para esconderse.\nCierre: Destapar y reír.\nAdaptaciones: Juego afectivo.',
                materials: ['manta'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B2_AGE_POLICY,
        'manta, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b2-suffocation-head-covering')).toBe(true);
    });

    it('detecta y bloquea tracción brusca de extremidades en rondas', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'FRIDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Realizar ronda jalando de los brazos fuertemente',
                description: 'Inicio: Formar ronda.\nDesarrollo: Jalar de los brazos con fuerza para girar rápido en la ronda.\nCierre: Respirar.\nAdaptaciones: Sin forzar.',
                materials: ['colchonetas limpias'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B2_AGE_POLICY,
        'colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b2-forced-limb-traction')).toBe(true);
    });

    it('detecta y bloquea saltos desde muebles o alturas, y carreras competitivas', () => {
      const jumpingCandidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Saltar desde una mesa baja',
                description: 'Inicio: Subir a una mesa baja.\nDesarrollo: Saltar desde la mesa al piso con fuerza.\nCierre: Descansar.\nAdaptaciones: Cuidado.',
                materials: ['colchonetas limpias'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const jumpResult = PedagogicalSafetyValidator.evaluatePlan(
        jumpingCandidate,
        MATERNAL_B2_AGE_POLICY,
        'colchonetas limpias'
      );
      expect(jumpResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b2-forced-jumping-and-competition')).toBe(true);

      const racingCandidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'TUESDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Competir en carrera de velocidad',
                description: 'Inicio: Línea de salida.\nDesarrollo: Carrera competitiva para ver quién llega primero a la meta.\nCierre: Premiar.\nAdaptaciones: Ninguna.',
                materials: ['colchonetas limpias'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const raceResult = PedagogicalSafetyValidator.evaluatePlan(
        racingCandidate,
        MATERNAL_B2_AGE_POLICY,
        'colchonetas limpias'
      );
      expect(raceResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-b2-forced-jumping-and-competition')).toBe(true);
    });

    it('detecta y bloquea escolarización formal (planas, trazos rígidos) o regaños por control de esfínteres', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'WEDNESDAY',
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Completar plana de trazos con lápiz',
                description: 'Inicio: Repartir planas de grafomotricidad formal con lápiz.\nDesarrollo: Niñas y niños llenan la plana de letras y números abstractos sin salirse de la línea.\nCierre: Calificar planas.\nAdaptaciones: Corregir agarre de lápiz.',
                materials: ['papel bond'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_B2_AGE_POLICY,
        'papel bond, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-b2-milestones')).toBe(true);
    });
  });

  // =========================================================================
  // 4. ESTRUCTURA DE 4 SECCIONES, CIERRES AUTÉNTICOS Y ADAPTACIONES
  // =========================================================================
  describe('4. Estructura de 4 Secciones, Cierres Auténticos y Adaptaciones', () => {
    it('valida que cada actividad en Maternal B2 contenga Inicio, Desarrollo, Cierre y Adaptaciones', () => {
      const incompleteCandidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Manipular muñecos de tela con ternura',
                description: 'Solo desarrollo de la actividad con muñecos de tela sin secciones.',
                materials: ['muñecos de tela'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        incompleteCandidate,
        MATERNAL_B2_AGE_POLICY,
        'muñecos de tela, colchonetas limpias',
        { requirePedagogicalStructure: true }
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-b2-pedagogical-structure')).toBe(true);
    });

    it('rechaza asambleas verbales reflexivas o debates filosóficos inaccesibles para 31–36 meses', () => {
      const assemblyCandidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'FRIDAY',
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Compartir lectura del cuento infantil',
                description: 'Inicio: Sentarse en círculo.\nDesarrollo: Leer el cuento.\nCierre: Realizar una asamblea verbal para reflexionar filosóficamente y debatir sobre la moraleja de la historia.\nAdaptaciones: Motivar participación.',
                materials: ['cuentos ilustrados infantiles'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        assemblyCandidate,
        MATERNAL_B2_AGE_POLICY,
        'cuentos ilustrados infantiles, colchonetas limpias',
        { requirePedagogicalStructure: true }
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-b2-closure-mismatch')).toBe(true);
    });

    it('normaliza la estructura mediante normalizeLactantesBDescriptionStructure para Maternal B2', () => {
      const rawText = 'Exploración activa con bloques grandes construyendo puentes a ras de suelo.';
      const structured = normalizeLactantesBDescriptionStructure(rawText, 'MATERNAL_B2');

      expect(structured).toContain('Inicio:');
      expect(structured).toContain('Desarrollo:');
      expect(structured).toContain('Cierre:');
      expect(structured).toContain('Adaptaciones:');
      expect(structured).not.toContain('lactante');
      expect(structured).toContain('Maternal B2');
    });

    it('purga cualquier mención de «lactante» y adapta objetivos truncados en sanitizeMaternalB1PedagogicalFidelity para Maternal B2', () => {
      const act = {
        category: 'LECTURA EN VOZ ALTA' as const,
        objective: 'Estimular.',
        description: 'Inicio: Se sienta cada lactante en la colchoneta.\nDesarrollo: El lactante observa las ilustraciones del cuento.\nCierre: Aplaudir y cantar una rima breve de orden para guardar.\nAdaptaciones: Se respeta el ritmo individual de exploración y movilidad de cada lactante.',
        durationMinutes: 15,
        materials: ['cuentos ilustrados infantiles'],
      };

      const table = {
        entries: [
          { id: 'MAT-01', displayName: 'cuentos ilustrados infantiles', category: 'LITERATURA' },
          { id: 'MAT-02', displayName: 'colchonetas limpias', category: 'MOBILIARIO' },
          { id: 'MAT-03', displayName: 'cajas de cartón limpias', category: 'MOBILIARIO' },
        ],
        refMap: new Map(),
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(act as any, table as any, 'MATERNAL_B2');

      expect(sanitized.description).not.toContain('lactante');
      expect(sanitized.description).not.toContain('cada lactante');
      expect(sanitized.description).toContain('Maternal B2');
      expect(sanitized.objective).not.toBe('Estimular.');
      expect(sanitized.objective.length).toBeGreaterThan(15);
      expect(sanitized.description).not.toContain('Aplaudir y cantar una rima breve de orden para guardar');
    });
  });

  // =========================================================================
  // 5. PROMPTS DEL SISTEMA Y GOBERNANZA DE GENERACIÓN PARA MATERNAL B2
  // =========================================================================
  describe('5. Prompts del Sistema y Gobernanza de Generación para Maternal B2', () => {
    const baseRequest: WeeklyPlanningProposalRequest = {
      planningId: 'p-maternal-b2-01',
      room: roomMaternalB2,
      modality: 'DIRECT',
      weekStart: '2026-11-02',
      weekEnd: '2026-11-06',
      currentContext: {
        availableMaterials: sampleAvailableMaterials,
        observations: 'Grupo de 12 niñas y niños de Maternal B2 (31 a 36 meses).',
      },
      constraints: {
        targetActivitiesPerDay: 5,
        minDurationMinutes: 15,
        maxDurationMinutes: 25,
      },
    };

    const projection = projectPedagogicalGenerationPolicy(MATERNAL_B2_AGE_POLICY, baseRequest);
    const minimizedInput = buildPrivacyMinimizedAIInput(baseRequest, projection);

    it('construye system prompt especializado con la política oficial SR-MD-30 para Maternal B2', () => {
      const systemPrompt = buildWeeklyPlanningAISystemPrompt(minimizedInput);

      expect(systemPrompt).toContain('POLÍTICA DE RAZONAMIENTO PEDAGÓGICO Y SEGURIDAD INFANTIL PARA MATERNAL B2 (31 A 36 MESES) — SR-MD-30:');
      expect(systemPrompt).toContain('esquema corporal');
      expect(systemPrompt).toContain('«¿Por qué?», «¿Qué es?», «Mi dibujo es...»');
      expect(systemPrompt).toContain('guiñoles');
      expect(systemPrompt).toContain('«Ordeno la sala»');
      expect(systemPrompt).toContain('CERO SALTOS DESDE ALTURAS O MUEBLES');
      expect(systemPrompt).toContain('CERO COMPETENCIA');
    });

    it('construye user prompt con lineamientos obligatorios de calidad y progresiones diarias para Maternal B2', () => {
      const userPrompt = buildWeeklyPlanningAIUserPrompt(minimizedInput as any);

      expect(userPrompt).toContain('MANDATORY PEDAGOGICAL QUALITY & DIVERSITY RULES FOR MATERNAL B2 (31 TO 36 MONTHS — SR-MD-30)');
      expect(userPrompt).toContain('CERO ACTIVIDADES IDÉNTICAS O CLÓNICAS');
      expect(userPrompt).toContain('ESQUEMA CORPORAL Y JUEGO SIMBÓLICO');
      expect(userPrompt).toContain('EXPRESIÓN GRÁFICO-PLÁSTICA');
      expect(userPrompt).toContain('HÁBITOS, HIGIENE Y AUTONOMÍA');
    });
  });

  // =========================================================================
  // 6. PIPELINE INTEGRAL DE PROPUESTA IA Y GOBERNANZA 3-TIER RECOVERY
  // =========================================================================
  describe('6. Pipeline Integral de Propuesta IA y Gobernanza 3-Tier Recovery', () => {
    it('procesa una propuesta sintética válida de 25 actividades para Maternal B2 con éxito total', async () => {
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek, dIdx) => ({
        dayOfWeek,
        date: `2026-11-0${dIdx + 2}`,
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Favorecer la comprensión auditiva y la expresión oral mediante narraciones breves.',
            proceduralAction: `Inicio: Se dispone el espacio en tapete limpio y se presenta el cuento infantil.\nDesarrollo: La Asistente muestra las láminas y motiva preguntas a las niñas y niños de Maternal B2 sobre los personajes.\nCierre: Despedir a los personajes con un gesto y guardar el cuento en su canasto a ras de suelo.\nAdaptaciones: Brindar cercanía afectiva a quienes están en periodo de adaptación de la sala Maternal B2.`,
            materialRefs: ['MAT-01'],
            durationMinutes: 15,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A1', repetitionPurpose: 'FAMILIARIZATION', variationDimensions: ['INTERACTION_MODE'] } : {}),
              observationTarget: 'Observar la expresión verbal y atención compartida.',
            },
          },
          {
            category: 'PENSAMIENTO MATEMÁTICO',
            objective: 'Favorecer las relaciones espaciales y la discriminación visual en construcciones lúdicas.',
            proceduralAction: `Inicio: Se presentan los bloques grandes en cajas de cartón limpias a ras de suelo.\nDesarrollo: Construir caminos y puentes a nivel de piso de forma colaborativa.\nCierre: Guardar los bloques en sus cajas de cartón limpias cantando una rima breve.\nAdaptaciones: Disponer bloques duplicados para fomentar el juego cooperativo y la toma de turnos.`,
            materialRefs: ['MAT-02', 'MAT-03'],
            durationMinutes: 20,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'VARY',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A2', repetitionPurpose: 'VARIATION', variationDimensions: ['CHILD_AGENCY'] } : {}),
              observationTarget: 'Observar el apilado y clasificación espontánea.',
            },
          },
          {
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Promover la coordinación visomotriz y el desplazamiento autónomo a ras de suelo.',
            proceduralAction: `Inicio: Disponer colchonetas limpias en el piso sin obstáculos.\nDesarrollo: Desplazamientos autónomos a paso firme siguiendo las líneas del tapete sin saltos ni desniveles.\nCierre: Sentarse en colchoneta limpia y realizar respiraciones suaves al compás de una melodía.\nAdaptaciones: Acompañar mano a mano a quienes presenten marcha vacilante sin forzar posturas.`,
            materialRefs: ['MAT-04'],
            durationMinutes: 18,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'VARY',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A3', repetitionPurpose: 'VARIATION', variationDimensions: ['PEDAGOGICAL_INTENT'] } : {}),
              observationTarget: 'Observar la soltura en desplazamientos a ras de suelo.',
            },
          },
          {
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: 'Estimular la expresión gráfico-plástica y el control motor fino con trazos libres.',
            proceduralAction: `Inicio: Extender pliegos de papel a ras de suelo sobre el tapete limpio y entregar crayones gruesos.\nDesarrollo: Niñas y niños realizan garabateos y trazos circulares diciendo «Mi dibujo es...» con entusiasmo.\nCierre: Admirar colectivamente los dibujos extendidos en el suelo y guardar crayones en su caja.\nAdaptaciones: Validar toda expresión gráfica espontánea respetando la fuerza digital de cada niña y niño.`,
            materialRefs: ['MAT-05'],
            durationMinutes: 15,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'VARY',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A4', repetitionPurpose: 'VARIATION', variationDimensions: ['CHILD_AGENCY'] } : {}),
              observationTarget: 'Observar el trazo intencionado y cambio de color.',
            },
          },
          {
            category: 'AMBIENTES DE APRENDIZAJE',
            objective: 'Consolidar el esquema corporal, el juego de roles y los hábitos de higiene personal.',
            proceduralAction: `Inicio: Se dispone el espacio afectivo con muñecos de tela y cepillos limpios.\nDesarrollo: Niñas y niños peinan con cuidado al muñeco y reconocen partes del cuerpo con apoyo de la Asistente.\nCierre: Acomodar los muñecos en su canasta y celebrar la colaboración compartida.\nAdaptaciones: Ofrecer muñecos duplicados para favorecer la convivencia pacífica sin disputas.`,
            materialRefs: ['MAT-06', 'MAT-07'],
            durationMinutes: 20,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'OBSERVE_OR_CONSOLIDATE',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A5', repetitionPurpose: 'RESPONSE_OBSERVATION', variationDimensions: ['OBSERVATION_FOCUS'] } : {}),
              observationTarget: 'Observar la identificación del esquema corporal y cuidado del muñeco.',
            },
          },
        ],
      }));

      const mockProposalJson = JSON.stringify({
        days,
        weeklyFocus: 'Desarrollo del lenguaje expresivo, esquema corporal, hábitos y juego simbólico en Maternal B2',
      });

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(mockProposalJson),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);

      const request: WeeklyPlanningProposalRequest = {
        planningId: 'p-maternal-b2-01',
        room: roomMaternalB2,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          availableMaterials: sampleAvailableMaterials,
          observations: 'Grupo de 12 niños en Maternal B2.',
        },
      };

      const proposal = await source.propose(request);

      expect(proposal).toBeDefined();
      expect(proposal.days).toHaveLength(5);
      for (const day of proposal.days) {
        expect(day.activities).toHaveLength(5);
        for (const act of day.activities) {
          expect(act.description).toContain('Inicio:');
          expect(act.description).toContain('Desarrollo:');
          expect(act.description).toContain('Cierre:');
          expect(act.description).toContain('Adaptaciones:');
          expect(act.description).not.toContain('lactante');
          expect(act.objective.length).toBeGreaterThan(15);
        }
      }
      expect(proposal.progression).toBeDefined();
      expect(proposal.progression?.weeklyFocus).toContain('Maternal B2');
    });
  });
});
