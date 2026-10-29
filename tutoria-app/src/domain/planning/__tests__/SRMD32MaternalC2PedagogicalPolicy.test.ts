import { describe, it, expect, vi } from 'vitest';
import { RoomCatalog, Room } from '../RoomCatalog';
import {
  PedagogicalAgePolicyCatalog,
  MATERNAL_C2_AGE_POLICY,
  MATERNAL_C1_AGE_POLICY,
  MATERNAL_B2_AGE_POLICY,
  MATERNAL_B1_AGE_POLICY,
  MATERNAL_A_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_C_AGE_POLICY,
  PedagogicalSafetyValidator,
  PedagogicalWeeklyPlanCandidate,
  MATERNAL_C2_APPROVED_ROOM_FIXTURES,
  MATERNAL_C2_DEVELOPMENTAL_RULE,
} from '../PedagogicalAgePolicy';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  WeeklyPlanningProposalRequest,
  normalizeLactantesBDescriptionStructure,
  sanitizeMaternalB1PedagogicalFidelity,
  enrichMaternalB1WeeklyProgression,
  buildWeeklyPlanningAISystemPrompt,
  buildWeeklyPlanningAIUserPrompt,
  projectPedagogicalGenerationPolicy,
  buildPrivacyMinimizedAIInput,
  cleanDuplicatePedagogicalPhrases,
  parseAndAllowlistUntrustedProposal,
  createRequestScopedMaterialTable,
  areActivitiesPedagogicallyRelated,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';
import { getAssistantRoleLabel, readPersistedSelectedRoom } from '../../../presentation/planning-ui/PlanningDemoApp';

describe('SR-MD-32 — Política Pedagógica e Integración de IA para Maternal C2 (43–48 meses)', () => {
  const roomMaternalC2: Room = {
    roomId: 'room-maternal-c2',
    name: 'Maternal C2',
    minAgeMonths: 43,
    maxAgeMonths: 48,
  };

  const sampleAvailableMaterials =
    'Bloques grandes de plástico lavable, cuentos ilustrados infantiles, muñecos de tela, pelotas medianas de vinil, aros plásticos grandes, colchonetas limpias, crayones gruesos de cera, lavabo infantil con toallas limpias, recipientes plásticos amplios, masa vegetal casera no tóxica, pliegos de papel bond con dibujos existentes';

  // =========================================================================
  // 1. CATÁLOGO DE SALAS Y RESOLUCIÓN CANÓNICA
  // =========================================================================
  describe('1. Catálogo de Salas y Resolución Canónica', () => {
    it('resuelve room-maternal-c2 en el catálogo canónico con rango etario oficial 43 a 48 meses (Norma IMSS 3D11-003-002, Anexo 2, p. 150)', () => {
      const room = RoomCatalog.getRoom('room-maternal-c2');
      expect(room).toBeDefined();
      expect(room?.roomId).toBe('room-maternal-c2');
      expect(room?.name).toBe('Maternal C2');
      expect(room?.minAgeMonths).toBe(43);
      expect(room?.maxAgeMonths).toBe(48);
    });

    it('resuelve alias maternal-c2 hacia room-maternal-c2 de forma transparente', () => {
      const roomFromAlias = RoomCatalog.getRoom('maternal-c2');
      expect(roomFromAlias).toBeDefined();
      expect(roomFromAlias?.roomId).toBe('room-maternal-c2');
      expect(roomFromAlias?.name).toBe('Maternal C2');
      expect(roomFromAlias?.minAgeMonths).toBe(43);
      expect(roomFromAlias?.maxAgeMonths).toBe(48);
    });

    it('el catálogo canónico contiene exactamente 8 salas autorizadas sin duplicados', () => {
      const allRooms = RoomCatalog.getAllRooms();
      expect(allRooms).toHaveLength(8);
      expect(allRooms.map((r) => r.roomId)).toEqual([
        'lactantes-c',
        'room-lactantes-a',
        'room-lactantes-b',
        'room-maternal-a',
        'room-maternal-b1',
        'room-maternal-b2',
        'room-maternal-c1',
        'room-maternal-c2',
      ]);
    });
  });

  // =========================================================================
  // 2. POLÍTICA PEDAGÓGICA Y GOBERNANZA DE IA
  // =========================================================================
  describe('2. Política Pedagógica y Gobernanza de IA', () => {
    it('resuelve MATERNAL_C2_AGE_POLICY por roomId, alias y por rango de edad (43–48m)', () => {
      const byRoom = PedagogicalAgePolicyCatalog.getPolicyForRoom(roomMaternalC2);
      expect(byRoom).toBe(MATERNAL_C2_AGE_POLICY);
      expect(byRoom?.roomType).toBe('MATERNAL_C2');
      expect(byRoom?.minAgeMonths).toBe(43);
      expect(byRoom?.maxAgeMonths).toBe(48);

      const byAlias = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'maternal-c2',
        name: 'Maternal C2',
        minAgeMonths: 43,
        maxAgeMonths: 48,
      });
      expect(byAlias).toBe(MATERNAL_C2_AGE_POLICY);

      const byAge = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 43,
        maxAgeMonths: 48,
      });
      expect(byAge).toBe(MATERNAL_C2_AGE_POLICY);
    });

    it('autoriza la generación de IA para las 8 salas canónicas institucionales', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B1')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B2')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C1')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C2')).toBe(true);
    });

    it('define política de densidad y duración recomendada para Maternal C2', () => {
      expect(MATERNAL_C2_AGE_POLICY.densityPolicy.isNormative).toBe(false);
      expect(MATERNAL_C2_AGE_POLICY.densityPolicy.minActivitiesPerDay).toBe(1);
      expect(MATERNAL_C2_AGE_POLICY.densityPolicy.maxActivitiesPerDay).toBe(10);
      expect(MATERNAL_C2_AGE_POLICY.recommendedMaxDurationMinutes).toBe(25);
    });

    it('reconoce fixtures aprobados de sala para Maternal C2 y excluye estrictamente tapetes', () => {
      expect(MATERNAL_C2_APPROVED_ROOM_FIXTURES).toContain('colchonetas limpias');
      expect(MATERNAL_C2_APPROVED_ROOM_FIXTURES).toContain('lavabo infantil');
      expect(MATERNAL_C2_APPROVED_ROOM_FIXTURES).toContain('recipientes plásticos amplios');
      expect(MATERNAL_C2_APPROVED_ROOM_FIXTURES).toContain('toallas limpias');
      expect(MATERNAL_C2_APPROVED_ROOM_FIXTURES).toContain('mesas y sillas infantiles');
      expect(MATERNAL_C2_APPROVED_ROOM_FIXTURES.some((f) => /tapete|alfombra/i.test(f))).toBe(false);
    });
  });

  // =========================================================================
  // 3. REGLAS DE SEGURIDAD ESTRICTA Y ENCLOSURE DE MATERIALES
  // =========================================================================
  describe('3. Reglas de Seguridad Estricta y Enclosure de Materiales', () => {
    it('bloquea piezas y objetos pequeños menores a 3 cm (canicas, botones, semillas sueltas)', () => {
      const planWithSmallItems: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Contar semillas pequeñas y canicas sueltas',
                description: 'Inicio: Se colocan semillas de frijol y canicas en la colchoneta. Desarrollo: Las niñas y niños manipulan las canicas y semillas pequeñas para contarlas. Cierre: Guardar. Adaptaciones: Respeto.',
                durationMinutes: 15,
                materials: ['canicas de vidrio'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithSmallItems,
        MATERNAL_C2_AGE_POLICY,
        'canicas de vidrio, colchonetas limpias'
      );

      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c2-choking-small-parts')).toBe(true);
    });

    it('bloquea herramientas punzocortantes y tijeras escolares aunque sean declaradas', () => {
      const planWithScissors: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'TUESDAY',
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Recortar papel con tijeras escolares con punta',
                description: 'Inicio: Se entregan tijeras escolares a cada niño. Desarrollo: Usar tijeras para cortar tiras de papel. Cierre: Recoger. Adaptaciones: Apoyo.',
                durationMinutes: 15,
                materials: ['tijeras'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithScissors,
        MATERNAL_C2_AGE_POLICY,
        'tijeras, papel bond, colchonetas limpias'
      );

      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c2-sharp-scissors')).toBe(true);
    });

    it('bloquea adhesivos químicos y pegamentos (resistol, silicón, pegamento líquido)', () => {
      const planWithGlue: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'WEDNESDAY',
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Pintar figuras con pintura acrílica tóxica',
                description: 'Inicio: Aplicar pintura acrílica en pliegos de papel. Desarrollo: Pintar figuras usando pintura acrílica y solvente. Cierre: Dejar secar. Adaptaciones: Ritmo.',
                durationMinutes: 15,
                materials: ['pintura acrílica'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithGlue,
        MATERNAL_C2_AGE_POLICY,
        'pintura acrílica, pliegos de papel, colchonetas limpias'
      );

      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c2-toxic-substances')).toBe(true);
    });

    it('bloquea saltos desde mobiliario, sillas o alturas y tracción de extremidades', () => {
      const planWithForcedMotor: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Saltar desde las sillas al suelo',
                description: 'Inicio: Subir a las sillas infantiles. Desarrollo: Saltar desde las sillas hacia la colchoneta para ver quién salta más lejos y jalar bruscamente del brazo para levantarse. Cierre: Descanso. Adaptaciones: Cuidado.',
                durationMinutes: 15,
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithForcedMotor,
        MATERNAL_C2_AGE_POLICY,
        'colchonetas limpias'
      );

      expect(
        result.blockingViolations.some(
          (v) =>
            v.ruleId === 'safe-maternal-c2-forced-jumping-and-competition' ||
            v.ruleId === 'safe-maternal-c2-forced-limb-traction'
        )
      ).toBe(true);
    });

    it('bloquea carreras competitivas con ganador o eliminación', () => {
      const planWithCompetition: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'FRIDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Carrera competitiva de velocidad con ganador',
                description: 'Inicio: Colocarse en la línea de salida. Desarrollo: Correr en carreras competitivas para ganar y ver quién llega primero a la meta. Cierre: Premiación. Adaptaciones: Consuelo.',
                durationMinutes: 15,
                materials: ['colchonetas limpias'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithCompetition,
        MATERNAL_C2_AGE_POLICY,
        'colchonetas limpias'
      );

      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c2-forced-jumping-and-competition')).toBe(true);
    });

    it('bloquea materiales inventados o fuera del inventario declarado (material-outside-supplied-set) en Maternal C2', () => {
      const planWithUndeclared: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Exploración con paracaídas de tela',
                description: 'Inicio: Sentarse en semicírculo en la colchoneta. Desarrollo: Mover el paracaídas de tela hacia arriba y abajo. Cierre: Doblar el paracaídas. Adaptaciones: Mediación afectiva.',
                durationMinutes: 15,
                materials: ['paracaídas de tela', 'bloques grandes de plástico lavable'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithUndeclared,
        MATERNAL_C2_AGE_POLICY,
        'bloques grandes de plástico lavable, colchonetas limpias'
      );

      expect(result.blockingViolations.some((v) => v.ruleId === 'material-outside-supplied-set')).toBe(true);
    });
  });

  // =========================================================================
  // 4. HITOS DEL DESARROLLO Y CAPACIDADES DE MATERNAL C2 (43–48 MESES)
  // =========================================================================
  describe('4. Hitos del Desarrollo y Capacidades de Maternal C2 (43–48 meses)', () => {
    it('verifica capacidades pedagógicas soportadas para 43–48 meses', () => {
      const rule = MATERNAL_C2_DEVELOPMENTAL_RULE;
      expect(rule.supportedCapabilities.some((c) => /lenguaje conversacional avanzado/i.test(c))).toBe(true);
      expect(rule.supportedCapabilities.some((c) => /clasificación combinada por dos atributos/i.test(c))).toBe(true);
      expect(rule.supportedCapabilities.some((c) => /conteo funcional uno a uno de 1 a 10/i.test(c))).toBe(true);
      expect(rule.supportedCapabilities.some((c) => /juego sociodramático estructurado/i.test(c))).toBe(true);
      expect(rule.supportedCapabilities.some((c) => /dibujo figurativo reconocible/i.test(c))).toBe(true);
      expect(rule.supportedCapabilities.some((c) => /autonomía consolidada en hábitos de higiene/i.test(c))).toBe(true);
    });

    it('excluye escolarización formal y exigencias prematuras (planas, grafomotricidad rígida, cálculo abstracto)', () => {
      const rule = MATERNAL_C2_DEVELOPMENTAL_RULE;
      expect(rule.excludedExpectations.some((e) => /escolarización formal prematura/i.test(e))).toBe(true);
      expect(rule.excludedExpectations.some((e) => /tijeras con filo/i.test(e))).toBe(true);
      expect(rule.excludedExpectations.some((e) => /saltos obligatorios desde alturas/i.test(e))).toBe(true);
      expect(rule.excludedExpectations.some((e) => /carreras de velocidad competitivas/i.test(e))).toBe(true);
    });

    it('valida estructura cuatripartita obligatoria (Inicio, Desarrollo, Cierre, Adaptaciones) en planes de Maternal C2', () => {
      const incompletePlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Juego sociodramático',
                description: 'Solo jugamos con muñecos de tela sin estructura formal.',
                durationMinutes: 15,
                materials: ['muñecos de tela'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        incompletePlan,
        MATERNAL_C2_AGE_POLICY,
        'muñecos de tela, colchonetas limpias',
        { requirePedagogicalStructure: true }
      );

      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-c2-pedagogical-structure')).toBe(true);
    });

    it('rechaza asambleas verbales reflexivas o debates filosóficos inaccesibles para 43–48 meses', () => {
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
        MATERNAL_C2_AGE_POLICY,
        'cuentos ilustrados infantiles, colchonetas limpias',
        { requirePedagogicalStructure: true }
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-c2-closure-mismatch')).toBe(true);
    });
  });

  // =========================================================================
  // 5. PROMPTS DE IA Y CONSTRUCCIÓN DE GENERACIÓN
  // =========================================================================
  describe('5. Prompts de IA y Construcción de Generación', () => {
    const baseRequest: WeeklyPlanningProposalRequest = {
      planningId: 'p-maternal-c2-01',
      room: roomMaternalC2,
      modality: 'DIRECT',
      weekStart: '2026-11-02',
      weekEnd: '2026-11-06',
      currentContext: {
        availableMaterials: sampleAvailableMaterials,
        observations: 'Grupo de 16 niñas y niños de Maternal C2 (43 a 48 meses).',
      },
      constraints: {
        targetActivitiesPerDay: 5,
        minDurationMinutes: 10,
        maxDurationMinutes: 25,
      },
    };

    const projection = projectPedagogicalGenerationPolicy(MATERNAL_C2_AGE_POLICY, baseRequest);
    const minimizedInput = buildPrivacyMinimizedAIInput(baseRequest, projection);

    it('construye system prompt con sección explícita para Maternal C2 (43 a 48 meses)', () => {
      const prompt = buildWeeklyPlanningAISystemPrompt(minimizedInput);
      expect(prompt).toContain('MATERNAL C2 (43 A 48 MESES)');
      expect(prompt).toContain('SR-MD-32');
      expect(prompt).toContain('clasificación combinada');
      expect(prompt).toContain('reparto equitativo inicial');
      expect(prompt).toContain('conteo funcional 1 a 1 de 1 a 10 objetos');
      expect(prompt).toContain('juego sociodramático estructurado con asunción de personajes');
      expect(prompt).toContain('CERO SALTOS DESDE ALTURAS O MUEBLES');
      expect(prompt).toContain('CERO COMPETENCIA');
    });

    it('construye user prompt con reglas de calidad, diversidad y lectura de Spot para Maternal C2', () => {
      const table = createRequestScopedMaterialTable(
        projection.allowedMaterials,
        projection.approvedRoomFixtures
      );
      const userPrompt = buildWeeklyPlanningAIUserPrompt(minimizedInput, table);

      expect(userPrompt).toContain('MANDATORY PEDAGOGICAL QUALITY & DIVERSITY RULES FOR MATERNAL C2');
      expect(userPrompt).toContain('43 TO 48 MONTHS — SR-MD-32');
      expect(userPrompt).toContain('¿Dónde está Spot?');
      expect(userPrompt).toContain('reparto equitativo inicial');
      expect(userPrompt).toContain('clasificación combinada por dos atributos');
      expect(userPrompt).toContain('mural colectivo a ras de suelo');
    });
  });

  // =========================================================================
  // 6. SANITIZACIÓN Y NORMALIZACIÓN DE ACTIVIDADES PARA MATERNAL C2
  // =========================================================================
  describe('6. Sanitización y Normalización de Actividades para Maternal C2', () => {
    const table = createRequestScopedMaterialTable(
      ['bloques grandes de plástico lavable', 'crayones gruesos de cera', 'muñecos de tela', 'recipientes plásticos amplios'],
      MATERNAL_C2_APPROVED_ROOM_FIXTURES
    );

    it('sustituye menciones de lactante por niñas y niños de Maternal C2 en normalización de descripción', () => {
      const rawDesc = 'Inicio: Sentar a cada lactante en la colchoneta limpia.\nDesarrollo: Los lactantes exploran bloques grandes.\nCierre: Acompañar al lactante.\nAdaptaciones: Se respeta el ritmo de cada lactante.';
      const normalized = normalizeLactantesBDescriptionStructure(rawDesc, 'MATERNAL_C2');
      expect(normalized).not.toContain('lactante');
      expect(normalized).toContain('Maternal C2');
    });

    it('sustituye cajas de cartón por recipientes plásticos amplios en actividades matemáticas de Maternal C2', () => {
      const rawActivity = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Clasificar bloques en sus cajas de cartón limpias',
        description: 'Inicio: Disponer los bloques en colchonetas limpias. Desarrollo: Agrupar bloques por color y forma en cajas de cartón limpias a ras de suelo. Cierre: Guardar en sus cajas correspondientes. Adaptaciones: Apoyo verbal.',
        durationMinutes: 15,
        materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(rawActivity, table, 'MATERNAL_C2');
      expect(sanitized.description).not.toContain('cajas de cartón');
      expect(sanitized.description).toContain('recipientes plásticos amplios');
      expect(sanitized.materials).not.toContain('cajas de cartón limpias');
      expect(sanitized.materials).toContain('recipientes plásticos amplios');
    });

    it('sustituye saltar como canguro por pasos firmes y seguros a ras de suelo', () => {
      const rawActivity = {
        category: 'ACTIVACIÓN FÍSICA' as const,
        objective: 'Desplazarse saltando como un canguro',
        description: 'Inicio: Disponer colchonetas limpias. Desarrollo: Desplazarse saltando como un canguro sobre las colchonetas. Cierre: Respiración suave. Adaptaciones: Acompañar.',
        durationMinutes: 15,
        materials: ['colchonetas limpias'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(rawActivity, table, 'MATERNAL_C2');
      expect(sanitized.description).not.toContain('como un canguro');
      expect(sanitized.description).toContain('pasos amplios, firmes y seguros a ras de suelo');
    });

    it('purga cualquier mención de «lactante» y adapta objetivos truncados en sanitizeMaternalB1PedagogicalFidelity para Maternal C2', () => {
      const act = {
        category: 'LECTURA EN VOZ ALTA' as const,
        objective: 'Estimular.',
        description: 'Inicio: Se sientan las niñas y niños en la colchoneta.\nDesarrollo: El lactante observa las ilustraciones del cuento y responde preguntas dialógicas sobre Spot.\nCierre: Aplaudir y cantar una rima breve de orden para guardar.\nAdaptaciones: Se respeta el ritmo individual de exploración y movilidad de cada lactante.',
        durationMinutes: 15,
        materials: ['cuentos ilustrados infantiles'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(act as any, table as any, 'MATERNAL_C2');

      expect(sanitized.description).not.toContain('lactante');
      expect(sanitized.description).not.toContain('cada lactante');
      expect(sanitized.description).toContain('Maternal C2');
      expect(sanitized.objective).not.toBe('Estimular.');
      expect(sanitized.objective.length).toBeGreaterThan(15);
      expect(sanitized.description).not.toContain('Aplaudir y cantar una rima breve de orden para guardar');
    });
  });

  // =========================================================================
  // 7. SIMULACIÓN DE PLAN SEMANAL COMPLETO DE MATERNAL C2 (25 ACTIVIDADES)
  // =========================================================================
  describe('7. Simulación de Plan Semanal Completo de Maternal C2 (25 Actividades)', () => {
    it('genera y valida un plan semanal de 25 actividades (5 por día, L-V) con lectura diaria de Spot y sin duplicados', async () => {
      const mockDays = [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Lectura interactiva y dialógica de «¿Dónde está Spot?» con entonación expresiva',
              proceduralAction: 'Inicio: Disponer las colchonetas limpias en semicírculo e invitar a las niñas y niños a tomar asiento. Desarrollo: La Asistente muestra la portada del libro ¿Dónde está Spot? de Eric Hill, realiza preguntas dialógicas sobre el perrito y modela la apertura de las solapas. Cierre: Cerrar el libro afectivamente agradeciendo la atención compartida. Adaptaciones: Acercar el cuento a quienes requieran mayor contacto visual.',
              durationMinutes: 12,
              materialRefs: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              progression: {
                role: 'EXPLORE',
                observationTarget: 'Observar la atención auditiva y anticipación gestual ante la búsqueda de Spot.',
              },
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Clasificación bivariada por color y forma con justificación verbal inicial',
              proceduralAction: 'Inicio: Disponer bloques grandes en la colchoneta limpia y presentar dos recipientes plásticos amplios. Desarrollo: Las niñas y niños separan los bloques rojos y redondos en un recipiente y los azules y cuadrados en otro, dialogando sobre su elección. Cierre: Revisar juntos los recipientes ordenados y colocar las piezas en su lugar. Adaptaciones: Modelar la comparación con dos piezas guía.',
              durationMinutes: 10,
              materialRefs: ['bloques grandes de plástico lavable', 'recipientes plásticos amplios', 'colchonetas limpias'],
              progression: {
                role: 'EXPLORE',
                observationTarget: 'Observar la capacidad de atender dos criterios simultáneos (color y forma).',
              },
            },
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Dibujo figurativo intencional de figuras humanas y rostros sobre papel bond',
              proceduralAction: 'Inicio: Disponer pliegos de papel bond y crayones gruesos de cera sobre colchonetas limpias a ras de suelo. Desarrollo: Las niñas y niños trazan figuras humanas reconocibles con cabeza, ojos, boca y extremidades con autonomía. Cierre: Mostrar respetuosamente sus producciones y reunir los crayones en la colchoneta. Adaptaciones: Guiar verbalmente las partes del rostro a quienes lo soliciten.',
              durationMinutes: 15,
              materialRefs: ['pliegos de papel bond con dibujos existentes', 'crayones gruesos de cera', 'colchonetas limpias'],
              progression: {
                role: 'EXPLORE',
                observationTarget: 'Observar la representación de rasgos faciales y detalles en el dibujo.',
              },
            },
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Recorrido motor coordinado a ras de suelo con marcha firme y giros amplios',
              proceduralAction: 'Inicio: Colocar colchonetas limpias alineadas en hilera a ras de suelo. Desarrollo: Las niñas y niños avanzan en marcha firme, realizan giros pausados manteniendo el equilibrio en el suelo y regresan caminando. Cierre: Respiración suave sentados en colchoneta limpia palmoteando los muslos. Adaptaciones: Acompañar de la mano con paso lento.',
              durationMinutes: 18,
              materialRefs: ['colchonetas limpias'],
              progression: {
                role: 'EXPLORE',
                observationTarget: 'Observar la seguridad en la marcha continua a ras de suelo.',
              },
            },
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Juego sociodramático estructurado con roles cotidianos de la familia y cuidado',
              proceduralAction: 'Inicio: Presentar los muñecos de tela en colchonetas limpias delimitando el espacio de juego. Desarrollo: Las niñas y niños asumen roles sociales de cuidado, alimentan y pasean a los muñecos dialogando entre pares y tomando turnos. Cierre: Colocar a descansar los muñecos ordenadamente sobre la colchoneta limpia. Adaptaciones: Estimular el intercambio verbal con preguntas abiertas.',
              durationMinutes: 20,
              materialRefs: ['muñecos de tela', 'colchonetas limpias'],
              progression: {
                role: 'EXPLORE',
                observationTarget: 'Observar la interacción dialógica y asunción de roles compartidos.',
              },
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Predicción interactiva de personajes ocultos tras las solapas en «¿Dónde está Spot?»',
              proceduralAction: 'Inicio: Disponer las colchonetas limpias en círculo y mostrar la portada de ¿Dónde está Spot?. Desarrollo: La Asistente pausa la lectura antes de abrir cada solapa para que las niñas y niños predigan qué animal encontrarán. Cierre: Aplausos suaves por descubrir a Spot en la cesta y guardado afectivo del cuento. Adaptaciones: Invitar a levantar la solapa con apoyo suave.',
              durationMinutes: 12,
              materialRefs: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              progression: {
                role: 'REVISIT',
                revisitsSlot: 'D1_A1',
                repetitionPurpose: 'FAMILIARIZATION',
                variationDimensions: ['CHILD_AGENCY'],
                observationTarget: 'Observar la verbalización espontánea de hipótesis sobre los animales ocultos.',
              },
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Reparto equitativo concreto de bloques entre pares con correspondencia uno a uno',
              proceduralAction: 'Inicio: Colocar bloques grandes en el centro sobre colchoneta limpia e invitar a dos pares de niñas y niños. Desarrollo: Siguiendo la mediación, distribuyen las piezas una a una de forma equitativa diciendo uno para ti y uno para mí. Cierre: Contar verbalmente del 1 al 10 las piezas reunidas en recipientes plásticos amplios. Adaptaciones: Acompañar el conteo con señalamiento guiado.',
              durationMinutes: 10,
              materialRefs: ['bloques grandes de plástico lavable', 'recipientes plásticos amplios', 'colchonetas limpias'],
              progression: {
                role: 'REVISIT',
                revisitsSlot: 'D1_A2',
                repetitionPurpose: 'FAMILIARIZATION',
                variationDimensions: ['INTERACTION_MODE'],
                observationTarget: 'Observar la comprensión inicial del reparto equitativo entre pares.',
              },
            },
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Modelado tridimensional con masa vegetal casera no tóxica y elaboración de esferas',
              proceduralAction: 'Inicio: Disponer masa vegetal casera no tóxica sobre colchonetas limpias. Desarrollo: Las niñas y niños amasan, ruedan esferas y forman pequeñas figuras con palmas y dedos con libertad creativa. Cierre: Reunir las masas en sus recipientes limpios e higienizar manos en lavabo infantil con toallas limpias. Adaptaciones: Ofrecer porciones adecuadas a la fuerza de prensión.',
              durationMinutes: 15,
              materialRefs: ['masa vegetal casera no tóxica', 'lavabo infantil', 'toallas limpias', 'colchonetas limpias'],
              progression: {
                role: 'REVISIT',
                revisitsSlot: 'D1_A3',
                repetitionPurpose: 'FAMILIARIZATION',
                variationDimensions: ['SENSORY_EXPERIENCE'],
                observationTarget: 'Observar el control motriz fino en el amasado y rotación palmar.',
              },
            },
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Marcha con cambio de dirección y paradas serenas sobre colchonetas limpias',
              proceduralAction: 'Inicio: Disponer colchonetas limpias a ras de suelo en forma de circuito rectangular. Desarrollo: Caminar con pasos seguros, detenerse a la señal del pandero y girar hacia el lado contrario sin correr. Cierre: Sentarse en colchonetas limpias, respirar profundo y relajar hombros. Adaptaciones: Permitir realizar el giro con apoyo de la mano.',
              durationMinutes: 18,
              materialRefs: ['colchonetas limpias'],
              progression: {
                role: 'REVISIT',
                revisitsSlot: 'D1_A4',
                repetitionPurpose: 'FAMILIARIZATION',
                variationDimensions: ['MOTOR_CHALLENGE'],
                observationTarget: 'Observar la detención voluntaria de la marcha ante estímulo auditivo.',
              },
            },
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Sociodrama de visita médica y cuidado afectivo con muñecos de tela',
              proceduralAction: 'Inicio: Invitar a las niñas y niños a tomar muñecos de tela en la colchoneta limpia. Desarrollo: Asumen el rol de cuidadoras y cuidadores, auscultan con ternura a los muñecos y dialogan sobre su bienestar. Cierre: Acomodar los muñecos en colchoneta limpia y despedirse afectuosamente. Adaptaciones: Proporcionar frases modelo para enriquecer el diálogo.',
              durationMinutes: 20,
              materialRefs: ['muñecos de tela', 'colchonetas limpias'],
              progression: {
                role: 'REVISIT',
                revisitsSlot: 'D1_A5',
                repetitionPurpose: 'FAMILIARIZATION',
                variationDimensions: ['SOCIAL_GROUPING'],
                observationTarget: 'Observar la empatía y riqueza narrativa en el juego con muñecos.',
              },
            },
          ],
        },
        {
          dayOfWeek: 'WEDNESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Expresión oral dialógica nombrando los animales y sonidos en «¿Dónde está Spot?»',
              proceduralAction: 'Inicio: Disponer las colchonetas limpias y mostrar el libro de Spot. Desarrollo: Al abrir cada solapa, las niñas y niños imitan las onomatopeyas y dialogan sobre si el oso o el león son Spot. Cierre: Celebrar el encuentro de Spot bajo la alfombra y guardar el libro con cuidado. Adaptaciones: Reforzar la articulación clara de cada sonido animal.',
              durationMinutes: 12,
              materialRefs: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D2_A1',
                repetitionPurpose: 'VARIATION',
                variationDimensions: ['CHILD_AGENCY'],
                observationTarget: 'Observar la producción onomatopéyica y riqueza de vocabulario descriptivo.',
              },
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Seriación y comparación de torres por altura con verbalización más alta y más baja',
              proceduralAction: 'Inicio: Colocar bloques grandes sobre colchonetas limpias. Desarrollo: Construir torres en parejas y comparar visual y verbalmente cuál torre es más alta y cuál es más baja. Cierre: Desmontar con serenidad y colocar las piezas en recipientes plásticos amplios. Adaptaciones: Construir torres de pocas piezas para facilitar la comparación.',
              durationMinutes: 10,
              materialRefs: ['bloques grandes de plástico lavable', 'recipientes plásticos amplios', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D2_A2',
                repetitionPurpose: 'VARIATION',
                variationDimensions: ['PEDAGOGICAL_INTENT'],
                observationTarget: 'Observar el uso apropiado de conceptos espaciales y de altura.',
              },
            },
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Dibujo figurativo de viviendas y casas con crayones gruesos de cera',
              proceduralAction: 'Inicio: Disponer pliegos de papel bond en colchonetas limpias. Desarrollo: Trazar figuras cerradas representando casas con techo, puertas y ventanas según su imaginación. Cierre: Admirar las producciones y reunir los crayones con cuidado sobre la colchoneta. Adaptaciones: Dialogar sobre los elementos de sus casas para motivar el trazo.',
              durationMinutes: 15,
              materialRefs: ['pliegos de papel bond con dibujos existentes', 'crayones gruesos de cera', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D2_A3',
                repetitionPurpose: 'VARIATION',
                variationDimensions: ['CHILD_AGENCY'],
                observationTarget: 'Observar la intencionalidad geométrica en la representación de casas.',
              },
            },
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Paso coordinado sorteando colchonetas a ras de suelo con ritmo musical',
              proceduralAction: 'Inicio: Disponer colchonetas limpias consecutivas a ras de suelo. Desarrollo: Desplazarse al ritmo de palmas lentas y rápidas sin correr ni saltar, manteniendo la estabilidad corporal. Cierre: Reposo en colchoneta limpia con respiraciones profundas. Adaptaciones: Marcar el compás con apoyo vocal individualizado.',
              durationMinutes: 18,
              materialRefs: ['colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D2_A4',
                repetitionPurpose: 'VARIATION',
                variationDimensions: ['MOTOR_CHALLENGE'],
                observationTarget: 'Observar la adaptación del paso motor a los cambios de ritmo sonoro.',
              },
            },
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Juego sociodramático de preparación de alimentos saludables con muñecos de tela',
              proceduralAction: 'Inicio: Disponer los muñecos de tela en círculo en colchonetas limpias. Desarrollo: Las niñas y niños simulan preparar meriendas y alimentar a los muñecos compartiendo recipientes plásticos limpios. Cierre: Lavar manos en lavabo infantil con toallas limpias y ordenar muñecos. Adaptaciones: Guiar la toma de turnos en el uso de los recipientes.',
              durationMinutes: 20,
              materialRefs: ['muñecos de tela', 'recipientes plásticos amplios', 'lavabo infantil', 'toallas limpias', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D2_A5',
                repetitionPurpose: 'VARIATION',
                variationDimensions: ['SOCIAL_GROUPING'],
                observationTarget: 'Observar la estructuración de secuencias simbólicas complejas.',
              },
            },
          ],
        },
        {
          dayOfWeek: 'THURSDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Dramatización y juego de roles recreando los escondites de «¿Dónde está Spot?»',
              proceduralAction: 'Inicio: Colocar colchonetas limpias e invitar al grupo con el libro de Spot. Desarrollo: Una niña o niño sostiene el cuento mientras los demás representan buscar a Spot detrás del reloj o bajo la mesa con respeto. Cierre: Abrazos afectivos al encontrar al muñeco de Spot y retorno a la calma. Adaptaciones: Acompañar la participación de quienes muestren timidez.',
              durationMinutes: 12,
              materialRefs: ['cuentos ilustrados infantiles', 'muñecos de tela', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D3_A1',
                repetitionPurpose: 'PROGRESSION',
                variationDimensions: ['CHILD_AGENCY'],
                observationTarget: 'Observar la expresión corporal y asunción lúdica de personajes.',
              },
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Conteo uno a uno del 1 al 10 agrupando colecciones de bloques grandes',
              proceduralAction: 'Inicio: Disponer bloques grandes en colchonetas limpias. Desarrollo: Guiar el conteo ordenado de 1 a 10 bloques tocando cada pieza y colocándola en recipientes plásticos amplios. Cierre: Felicitar el logro del conteo conjunto y tapar los recipientes. Adaptaciones: Apoyar el conteo con dedos hasta 5 antes de avanzar a 10.',
              durationMinutes: 10,
              materialRefs: ['bloques grandes de plástico lavable', 'recipientes plásticos amplios', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D3_A2',
                repetitionPurpose: 'PROGRESSION',
                variationDimensions: ['PEDAGOGICAL_INTENT'],
                observationTarget: 'Observar la correspondencia biunívoca entre numeral verbal y objeto.',
              },
            },
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Composición gráfica de trazos curvos y rectas continuas sobre papel bond',
              proceduralAction: 'Inicio: Presentar pliegos de papel bond y crayones gruesos en colchonetas limpias. Desarrollo: Trazar caminos sinuosos y líneas de diferentes colores explorando la presión y dirección del crayón. Cierre: Contemplar las producciones y reunir los crayones con serenidad. Adaptaciones: Apoyar la prensión del crayón respetando la lateralidad natural.',
              durationMinutes: 15,
              materialRefs: ['pliegos de papel bond con dibujos existentes', 'crayones gruesos de cera', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D3_A3',
                repetitionPurpose: 'PROGRESSION',
                variationDimensions: ['SENSORY_EXPERIENCE'],
                observationTarget: 'Observar la fluidez y autonomía en la variación de trazos.',
              },
            },
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Desplazamiento amplio con brazos extendidos imitando aves en colchoneta limpia',
              proceduralAction: 'Inicio: Disponer colchonetas limpias a ras de suelo. Desarrollo: Avanzar con pasos amplios y brazos extendidos balanceándose suavemente sin correr ni empujar. Cierre: Aterrizar suavemente sentándose en colchoneta limpia con respiración calma. Adaptaciones: Modelar el desplazamiento pausado junto al infante.',
              durationMinutes: 18,
              materialRefs: ['colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D3_A4',
                repetitionPurpose: 'PROGRESSION',
                variationDimensions: ['MOTOR_CHALLENGE'],
                observationTarget: 'Observar el control postural en movimientos dinámicos de brazos.',
              },
            },
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Juego sociodramático de tienda de juguetes con intercambio verbal y turnos',
              proceduralAction: 'Inicio: Disponer muñecos de tela y recipientes plásticos amplios en colchoneta limpia. Desarrollo: Las niñas y niños intercambian muñecos expresando por favor y gracias, practicando turnos de espera. Cierre: Recoger todos los muñecos en colchoneta limpia de forma colaborativa. Adaptaciones: Intervenir como mediadora para favorecer acuerdos amables.',
              durationMinutes: 20,
              materialRefs: ['muñecos de tela', 'recipientes plásticos amplios', 'colchonetas limpias'],
              progression: {
                role: 'VARY',
                revisitsSlot: 'D3_A5',
                repetitionPurpose: 'PROGRESSION',
                variationDimensions: ['SOCIAL_GROUPING'],
                observationTarget: 'Observar el uso de normas de cortesía y resolución dialógica.',
              },
            },
          ],
        },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Consolidación semanal de lectura y narración colectiva de «¿Dónde está Spot?»',
              proceduralAction: 'Inicio: Disponer las colchonetas limpias en círculo e invitar al cierre de lectura semanal. Desarrollo: Las niñas y niños hojean el libro en turnos y narran con sus palabras el desenlace donde Spot come su cena. Cierre: Aplauso afectivo grupal despidiendo a Spot hasta la próxima semana. Adaptaciones: Reforzar con preguntas afectivas la participación de todas y todos.',
              durationMinutes: 12,
              materialRefs: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              progression: {
                role: 'OBSERVE_OR_CONSOLIDATE',
                revisitsSlot: 'D4_A1',
                repetitionPurpose: 'RESPONSE_OBSERVATION',
                variationDimensions: ['OBSERVATION_FOCUS'],
                observationTarget: 'Observar la consolidación de la secuencia narrativa y reconstrucción oral del cuento.',
              },
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Consolidación semanal de conteo y clasificación bivariada en recipientes plásticos amplios',
              proceduralAction: 'Inicio: Disponer bloques grandes y recipientes plásticos amplios a ras de suelo en colchonetas limpias. Desarrollo: En el cierre semanal, agrupan las piezas por forma y color contando en voz alta hasta 10 con satisfacción. Cierre: Colocar los recipientes plásticos amplios ordenados en el área de guardado. Adaptaciones: Permitir clasificar a ritmo pausado con apoyo solidario entre pares.',
              durationMinutes: 10,
              materialRefs: ['bloques grandes de plástico lavable', 'recipientes plásticos amplios', 'colchonetas limpias'],
              progression: {
                role: 'OBSERVE_OR_CONSOLIDATE',
                revisitsSlot: 'D4_A2',
                repetitionPurpose: 'RESPONSE_OBSERVATION',
                variationDimensions: ['OBSERVATION_FOCUS'],
                observationTarget: 'Observar el grado de autonomía y precisión en el conteo y clasificación.',
              },
            },
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Observar la libre expresión gráfico-plástica y consolidar la convivencia grupal conformando un mural colectivo con los dibujos existentes a ras de suelo sobre colchonetas limpias.',
              proceduralAction: 'Inicio: Disponer las colchonetas limpias a ras de suelo e invitar a las niñas y niños a reunir y extender sobre ellas sus producciones y dibujos elaborados durante la semana. Desarrollo: En el cierre semanal, la Asistente guía a las niñas y niños para colocar juntos sus dibujos elaborados durante la semana a ras de suelo sobre colchonetas limpias, integrándolos de forma contigua para conformar un gran mural colectivo; con crayones gruesos agregan trazos de unión compartidos, admirando sus producciones apoyadas sobre las colchonetas sin requerir pegamento ni elementos de fijación. Cierre: Admirar colectivamente el mural y los trazos compartidos sobre colchonetas limpias, reuniendo con cuidado los crayones sobre la colchoneta limpia. Adaptaciones: Apoyar a quienes requieran asistencia para acomodar sus hojas contiguas sobre las colchonetas respetando su ritmo.',
              durationMinutes: 15,
              materialRefs: ['pliegos de papel bond con dibujos existentes', 'crayones gruesos de cera', 'colchonetas limpias'],
              progression: {
                role: 'OBSERVE_OR_CONSOLIDATE',
                revisitsSlot: 'D4_A3',
                repetitionPurpose: 'RESPONSE_OBSERVATION',
                variationDimensions: ['OBSERVATION_FOCUS'],
                observationTarget: 'Observar la satisfacción estética y sentido de pertenencia en el mural colectivo.',
              },
            },
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Afianzar la coordinación motriz global y la marcha autónoma mediante un recorrido continuo y sereno sobre colchonetas limpias dispuestas a ras de suelo.',
              proceduralAction: 'Inicio: La Asistente dispone las colchonetas limpias alineadas en forma de camino continuo a ras de suelo e invita a las niñas y niños a colocarse descalzos al inicio del recorrido. Desarrollo: En la sesión de cierre semanal, la Asistente guía un recorrido motor concreto a ras de suelo: las niñas y niños avanzan caminando a paso firme sobre la primera colchoneta, realizan un giro amplio hacia la colchoneta contigua, avanzan con pasos suaves y brazos abiertos para mantener la estabilidad, se detienen un instante a tocar la colchoneta con las palmas y continúan la marcha hasta el final del trayecto acolchado sin obstáculos ni desniveles, acompañados con apoyo de la mano si lo requieren. Cierre: Sentarse en colchonetas limpias en círculo, respirar serenamente con palmadas suaves en los muslos y relajarse al compás de un canto suave. Adaptaciones: Acompañar de la mano a quienes presenten marcha vacilante y permitir realizar el recorrido caminando lentamente a su propio ritmo.',
              durationMinutes: 18,
              materialRefs: ['colchonetas limpias'],
              progression: {
                role: 'OBSERVE_OR_CONSOLIDATE',
                revisitsSlot: 'D4_A4',
                repetitionPurpose: 'RESPONSE_OBSERVATION',
                variationDimensions: ['OBSERVATION_FOCUS'],
                observationTarget: 'Observar la fluidez y serenidad en la marcha sin pérdidas de estabilidad.',
              },
            },
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Consolidación del juego sociodramático colaborativo y hábitos de orden con muñecos de tela',
              proceduralAction: 'Inicio: Disponer los muñecos de tela en colchoneta limpia e invitar al cierre de juego semanal. Desarrollo: Las niñas y niños representan historias compartidas cuidando a los muñecos con armonía y diálogo espontáneo. Cierre: Acostar ordenadamente a los muñecos sobre la colchoneta limpia para su descanso y felicitación afectiva. Adaptaciones: Estimular la verbalización positiva entre pares.',
              durationMinutes: 20,
              materialRefs: ['muñecos de tela', 'colchonetas limpias'],
              progression: {
                role: 'OBSERVE_OR_CONSOLIDATE',
                revisitsSlot: 'D4_A5',
                repetitionPurpose: 'RESPONSE_OBSERVATION',
                variationDimensions: ['OBSERVATION_FOCUS'],
                observationTarget: 'Observar la convivencia armónica y colaboración en el orden de sala.',
              },
            },
          ],
        },
      ];

      const mockPayload = {
        weeklyFocus: 'Desarrollo del lenguaje conversacional reflexivo, juego sociodramático estructurado, autonomía e inicio del pensamiento lógico-matemático en Maternal C2',
        days: mockDays,
      };

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(JSON.stringify(mockPayload)),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        planningId: 'p-maternal-c2-full',
        room: roomMaternalC2,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          availableMaterials: sampleAvailableMaterials,
        },
        constraints: {
          targetActivitiesPerDay: 5,
          minDurationMinutes: 10,
          maxDurationMinutes: 25,
        },
      };

      const response = await source.propose(request);

      expect(response).toBeDefined();
      expect(response.days).toHaveLength(5);

      // Invariante de densidad: exactamente 5 actividades por día (25 totales)
      const totalActivities = response.days.reduce((acc, d) => acc + d.activities.length, 0);
      expect(totalActivities).toBe(25);
      response.days.forEach((day) => {
        expect(day.activities).toHaveLength(5);
      });

      // Invariante de lectura diaria: cada día tiene al menos una LECTURA EN VOZ ALTA de Spot
      response.days.forEach((day) => {
        const reading = day.activities.find((a) => a.category === 'LECTURA EN VOZ ALTA');
        expect(reading).toBeDefined();
        expect(reading?.description).toMatch(/Spot/i);
        expect(reading?.durationMinutes).toBeGreaterThanOrEqual(1);
        expect(reading?.durationMinutes).toBeLessThanOrEqual(60);
      });

      // Invariante de cero actividades idénticas
      const signatures = new Set<string>();
      response.days.forEach((day) => {
        day.activities.forEach((act) => {
          const sig = `${act.objective.trim()}|${act.description.trim()}`.toLowerCase();
          expect(signatures.has(sig)).toBe(false);
          signatures.add(sig);
        });
      });

      // Progresión pedagógica semanal válida
      expect(response.progression).toBeDefined();
      expect(response.progression?.experiences).toHaveLength(25);

      // Lunes: todas las experiencias son EXPLORE
      const mondayExps = response.progression?.experiences.slice(0, 5);
      mondayExps?.forEach((e) => {
        expect(e.role).toBe('EXPLORE');
        expect(e.revisitsExperienceId).toBeUndefined();
      });

      // Viernes: todas las experiencias son de consolidación observacional (OBSERVE_OR_CONSOLIDATE)
      const fridayExps = response.progression?.experiences.slice(20, 25);
      fridayExps?.forEach((e) => {
        expect(e.role).toBe('OBSERVE_OR_CONSOLIDATE');
        expect(e.repetitionPurpose).toBe('RESPONSE_OBSERVATION');
        expect(e.revisitsExperienceId).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 8. INTEGRACIÓN DE PRESENTACIÓN Y UI DE ASISTENTE EDUCATIVA MC2
  // =========================================================================
  describe('8. Integración de Presentación y UI de Asistente Educativa MC2', () => {
    it('resuelve getAssistantRoleLabel como Asistente Educativa MC2 para room-maternal-c2 y maternal-c2', () => {
      expect(getAssistantRoleLabel('room-maternal-c2')).toBe('Asistente Educativa MC2');
      expect(getAssistantRoleLabel('maternal-c2')).toBe('Asistente Educativa MC2');
    });

    it('resuelve y valida la sala persistida Maternal C2 cuando está autorizada', () => {
      const authorizedRooms = [
        RoomCatalog.getRoom('room-lactantes-a')!,
        RoomCatalog.getRoom('room-lactantes-b')!,
        RoomCatalog.getRoom('room-lactantes-c')!,
        RoomCatalog.getRoom('room-maternal-a')!,
        RoomCatalog.getRoom('room-maternal-b1')!,
        RoomCatalog.getRoom('room-maternal-b2')!,
        RoomCatalog.getRoom('room-maternal-c1')!,
        RoomCatalog.getRoom('room-maternal-c2')!,
      ];

      sessionStorage.setItem('tutoria_selected_room:default:test-user', 'maternal-c2');
      const resolved = readPersistedSelectedRoom('test-user', 'default', authorizedRooms);
      expect(resolved).toBe('room-maternal-c2');
      sessionStorage.clear();
    });

    it('lee y valida selección persistida directamente con ID canónico room-maternal-c2', () => {
      const authorizedRooms = [
        RoomCatalog.getRoom('room-maternal-c2')!,
      ];

      sessionStorage.setItem('tutoria_selected_room:default:test-user', 'room-maternal-c2');
      const resolved = readPersistedSelectedRoom('test-user', 'default', authorizedRooms);
      expect(resolved).toBe('room-maternal-c2');
      sessionStorage.clear();
    });
  });
});
