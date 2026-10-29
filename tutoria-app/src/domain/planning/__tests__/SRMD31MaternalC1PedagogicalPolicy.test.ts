import { describe, it, expect, vi } from 'vitest';
import { RoomCatalog, Room } from '../RoomCatalog';
import {
  PedagogicalAgePolicyCatalog,
  MATERNAL_C1_AGE_POLICY,
  MATERNAL_B2_AGE_POLICY,
  MATERNAL_B1_AGE_POLICY,
  MATERNAL_A_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_C_AGE_POLICY,
  PedagogicalSafetyValidator,
  PedagogicalWeeklyPlanCandidate,
  MATERNAL_C1_APPROVED_ROOM_FIXTURES,
  MATERNAL_C1_DEVELOPMENTAL_RULE,
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

describe('SR-MD-31 — Política Pedagógica e Integración de IA para Maternal C1 (37–42 meses)', () => {
  const roomMaternalC1: Room = {
    roomId: 'room-maternal-c1',
    name: 'Maternal C1',
    minAgeMonths: 37,
    maxAgeMonths: 42,
  };

  const sampleAvailableMaterials =
    'Bloques grandes de plástico lavable, cuentos ilustrados infantiles, muñecos de tela, pelotas medianas de vinil, aros plásticos grandes, colchonetas limpias, crayones gruesos de cera, lavabo infantil con toallas limpias, cajas de cartón limpias, peines y cepillos infantiles limpios, títeres de tela y guiñoles, masa vegetal casera no tóxica';

  // =========================================================================
  // 1. CATÁLOGO DE SALAS Y RESOLUCIÓN CANÓNICA
  // =========================================================================
  describe('1. Catálogo de Salas y Resolución Canónica', () => {
    it('resuelve room-maternal-c1 en el catálogo canónico con rango etario oficial 37 a 42 meses (GT Económica págs. 89-98)', () => {
      const room = RoomCatalog.getRoom('room-maternal-c1');
      expect(room).toBeDefined();
      expect(room?.roomId).toBe('room-maternal-c1');
      expect(room?.name).toBe('Maternal C1');
      expect(room?.minAgeMonths).toBe(37);
      expect(room?.maxAgeMonths).toBe(42);
    });

    it('resuelve alias maternal-c1 hacia room-maternal-c1 de forma transparente', () => {
      const roomFromAlias = RoomCatalog.getRoom('maternal-c1');
      expect(roomFromAlias).toBeDefined();
      expect(roomFromAlias?.roomId).toBe('room-maternal-c1');
      expect(roomFromAlias?.name).toBe('Maternal C1');
      expect(roomFromAlias?.minAgeMonths).toBe(37);
      expect(roomFromAlias?.maxAgeMonths).toBe(42);
    });

    it('el catálogo canónico contiene exactamente 7 salas autorizadas sin duplicados', () => {
      const allRooms = RoomCatalog.getAllRooms();
      expect(allRooms).toHaveLength(7);
      expect(allRooms.map((r) => r.roomId)).toEqual([
        'lactantes-c',
        'room-lactantes-a',
        'room-lactantes-b',
        'room-maternal-a',
        'room-maternal-b1',
        'room-maternal-b2',
        'room-maternal-c1',
      ]);
    });
  });

  // =========================================================================
  // 2. POLÍTICA PEDAGÓGICA Y GOBERNANZA DE IA
  // =========================================================================
  describe('2. Política Pedagógica y Gobernanza de IA', () => {
    it('resuelve MATERNAL_C1_AGE_POLICY por roomId, alias y por rango de edad (37–42m)', () => {
      const byRoom = PedagogicalAgePolicyCatalog.getPolicyForRoom(roomMaternalC1);
      expect(byRoom).toBe(MATERNAL_C1_AGE_POLICY);
      expect(byRoom?.roomType).toBe('MATERNAL_C1');
      expect(byRoom?.minAgeMonths).toBe(37);
      expect(byRoom?.maxAgeMonths).toBe(42);

      const byAlias = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        roomId: 'maternal-c1',
        name: 'Maternal C1',
        minAgeMonths: 37,
        maxAgeMonths: 42,
      });
      expect(byAlias).toBe(MATERNAL_C1_AGE_POLICY);

      const byRange = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 37,
        maxAgeMonths: 42,
      });
      expect(byRange).toBe(MATERNAL_C1_AGE_POLICY);
    });

    it('confirma autorización de IA para Maternal C1 y preserva todas las salas autorizadas previas', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B1')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B2')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C1')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_C2')).toBe(false);
    });

    it('define política de densidad y duración recomendada para Maternal C1', () => {
      expect(MATERNAL_C1_AGE_POLICY.densityPolicy.isNormative).toBe(false);
      expect(MATERNAL_C1_AGE_POLICY.densityPolicy.minActivitiesPerDay).toBe(1);
      expect(MATERNAL_C1_AGE_POLICY.densityPolicy.maxActivitiesPerDay).toBe(10);
      expect(MATERNAL_C1_AGE_POLICY.recommendedMaxDurationMinutes).toBe(25);
    });

    it('reconoce fixtures aprobados de sala para Maternal C1 y excluye estrictamente tapetes', () => {
      expect(MATERNAL_C1_APPROVED_ROOM_FIXTURES).toContain('colchonetas limpias');
      expect(MATERNAL_C1_APPROVED_ROOM_FIXTURES).toContain('lavabo infantil');
      expect(MATERNAL_C1_APPROVED_ROOM_FIXTURES).toContain('cajas de cartón limpias');
      expect(MATERNAL_C1_APPROVED_ROOM_FIXTURES).toContain('toallero bajo');
      expect(MATERNAL_C1_APPROVED_ROOM_FIXTURES).not.toContain('tapete');
      expect(MATERNAL_C1_APPROVED_ROOM_FIXTURES).not.toContain('tapete de actividades');
      expect(MATERNAL_C1_APPROVED_ROOM_FIXTURES).not.toContain('tapete limpio');
    });
  });

  // =========================================================================
  // 3. REGLAS DE SEGURIDAD INFANTIL PARA MATERNAL C1 (37 A 42 MESES)
  // =========================================================================
  describe('3. Reglas de Seguridad Infantil para Maternal C1', () => {
    it('detecta y bloquea objetos pequeños menores a 3 cm con riesgo de atragantamiento', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'PENSAMIENTO MATEMÁTICO',
                objective: 'Manipular semillas pequeñas para clasificación',
                description: 'Inicio: Se disponen semillas pequeñas y botones en el piso.\nDesarrollo: Las niñas y niños separan semillas pequeñas con sus dedos.\nCierre: Guardar materiales.\nAdaptaciones: Respeto al ritmo.',
                materials: ['semillas pequeñas'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_C1_AGE_POLICY,
        'semillas pequeñas, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-choking-small-parts')).toBe(true);
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
        MATERNAL_C1_AGE_POLICY,
        'globos de látex, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-plastic-bags-balloons')).toBe(true);
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
        MATERNAL_C1_AGE_POLICY,
        'tijeras, papel bond'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-sharp-scissors')).toBe(true);
    });

    it('detecta y bloquea sustancias o pinturas tóxicas', () => {
      const candidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Pintar figuras con pintura acrílica y solventes',
                description: 'Inicio: Se entrega pintura acrílica.\nDesarrollo: Pintar con pincel usando pintura acrílica y solvente.\nCierre: Lavar manos.\nAdaptaciones: Apoyo.',
                materials: ['pintura acrílica'],
                durationMinutes: 15,
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        candidate,
        MATERNAL_C1_AGE_POLICY,
        'pintura acrílica, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-toxic-substances')).toBe(true);
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
        MATERNAL_C1_AGE_POLICY,
        'manta, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-suffocation-head-covering')).toBe(true);
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
        MATERNAL_C1_AGE_POLICY,
        'colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-forced-limb-traction')).toBe(true);
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
        MATERNAL_C1_AGE_POLICY,
        'colchonetas limpias'
      );
      expect(jumpResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-forced-jumping-and-competition')).toBe(true);

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
        MATERNAL_C1_AGE_POLICY,
        'colchonetas limpias'
      );
      expect(raceResult.blockingViolations.some((v) => v.ruleId === 'safe-maternal-c1-forced-jumping-and-competition')).toBe(true);
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
        MATERNAL_C1_AGE_POLICY,
        'papel bond, colchonetas limpias'
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-c1-milestones')).toBe(true);
    });
  });

  // =========================================================================
  // 4. ESTRUCTURA DE 4 SECCIONES, CIERRES AUTÉNTICOS Y ADAPTACIONES
  // =========================================================================
  describe('4. Estructura de 4 Secciones, Cierres Auténticos y Adaptaciones', () => {
    it('valida que cada actividad en Maternal C1 contenga Inicio, Desarrollo, Cierre y Adaptaciones', () => {
      const incompleteCandidate: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                category: 'AMBIENTES DE APRENDIZAJE',
                objective: 'Manipular muñecos de tela con afecto',
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
        MATERNAL_C1_AGE_POLICY,
        'muñecos de tela, colchonetas limpias',
        { requirePedagogicalStructure: true }
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-c1-pedagogical-structure')).toBe(true);
    });

    it('rechaza asambleas verbales reflexivas o debates filosóficos inaccesibles para 37–42 meses', () => {
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
        MATERNAL_C1_AGE_POLICY,
        'cuentos ilustrados infantiles, colchonetas limpias',
        { requirePedagogicalStructure: true }
      );
      expect(result.blockingViolations.some((v) => v.ruleId === 'dev-maternal-c1-closure-mismatch')).toBe(true);
    });

    it('normaliza la estructura mediante normalizeLactantesBDescriptionStructure para Maternal C1', () => {
      const rawText = 'Exploración activa con bloques grandes clasificando por forma y color a ras de suelo.';
      const structured = normalizeLactantesBDescriptionStructure(rawText, 'MATERNAL_C1');

      expect(structured).toContain('Inicio:');
      expect(structured).toContain('Desarrollo:');
      expect(structured).toContain('Cierre:');
      expect(structured).toContain('Adaptaciones:');
      expect(structured).not.toContain('lactante');
      expect(structured).toContain('Maternal C1');
    });

    it('purga cualquier mención de «lactante» y adapta objetivos truncados en sanitizeMaternalB1PedagogicalFidelity para Maternal C1', () => {
      const act = {
        category: 'LECTURA EN VOZ ALTA' as const,
        objective: 'Estimular.',
        description: 'Inicio: Se sienta cada lactante en la colchoneta.\nDesarrollo: El lactante observa las ilustraciones del cuento y responde preguntas causales sencillas.\nCierre: Aplaudir y cantar una rima breve de orden para guardar.\nAdaptaciones: Se respeta el ritmo individual de exploración y movilidad de cada lactante.',
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

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(act as any, table as any, 'MATERNAL_C1');

      expect(sanitized.description).not.toContain('lactante');
      expect(sanitized.description).not.toContain('cada lactante');
      expect(sanitized.description).toContain('Maternal C1');
      expect(sanitized.objective).not.toBe('Estimular.');
      expect(sanitized.objective.length).toBeGreaterThan(15);
      expect(sanitized.description).not.toContain('Aplaudir y cantar una rima breve de orden para guardar');
    });

    it('elimina tapetes no autorizados y líneas marcadas en superficies inexistentes para Maternal C1', () => {
      const act = {
        category: 'ACTIVACIÓN FÍSICA' as const,
        objective: 'Desplazarse sobre el tapete limpio siguiendo líneas del tapete.',
        description: 'Inicio: Se ubican sobre el tapete limpio.\nDesarrollo: Desplazamientos siguiendo las líneas del tapete y líneas marcadas en el piso.\nCierre: Descanso en el tapete.\nAdaptaciones: Apoyo cercano.',
        durationMinutes: 20,
        materials: ['tapete de actividades', 'colchonetas limpias'],
      };

      const table = {
        entries: [
          { id: 'MAT-01', displayName: 'colchonetas limpias', category: 'MOBILIARIO' },
          { id: 'MAT-02', displayName: 'cajas de cartón limpias', category: 'MOBILIARIO' },
        ],
        refMap: new Map(),
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(act as any, table as any, 'MATERNAL_C1');

      expect(sanitized.materials).not.toContain('tapete de actividades');
      expect(sanitized.description).not.toContain('tapete');
      expect(sanitized.description).not.toContain('líneas del tapete');
      expect(sanitized.description).not.toContain('líneas marcadas');
      expect(sanitized.description).toContain('colchonetas limpias');
      expect(sanitized.objective).not.toContain('tapete');
      expect(sanitized.objective).toContain('colchonetas limpias');
    });

    it('identifica objetos manipulables concretos y los registra junto con recipientes al clasificar para Maternal C1', () => {
      const act = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Clasificar por color y forma los objetos disponibles.',
        description: 'Inicio: Se presentan los objetos para clasificar.\nDesarrollo: Las niñas y niños juegan a clasificar por colores y separar por tamaño en cajas.\nCierre: Guardado de materiales.\nAdaptaciones: Apoyo guiado.',
        durationMinutes: 20,
        materials: [],
      };

      const table = {
        entries: [
          { id: 'MAT-01', displayName: 'bloques grandes de plástico lavable', category: 'DIDÁCTICO' },
          { id: 'MAT-02', displayName: 'cajas de cartón limpias', category: 'MOBILIARIO' },
        ],
        refMap: new Map(),
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(act as any, table as any, 'MATERNAL_C1');

      expect(sanitized.materials).toContain('bloques grandes de plástico lavable');
      expect(sanitized.materials).toContain('cajas de cartón limpias');
      expect(sanitized.description).toContain('bloques grandes de plástico lavable');
      expect(sanitized.description).toContain('cajas de cartón limpias');
    });

    it('evita duplicaciones literales jueves-viernes dotando a la consolidación de intención observacional y ejecución diferenciada para Maternal C1', () => {
      const duplicateThursdayAct = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Promover las relaciones espaciales y seriación de 3 tamaños con bloques grandes.',
        description: 'Inicio: Disponer bloques grandes en cajas de cartón limpias.\nDesarrollo: Construir ordenando por grande, mediano y pequeño a ras de suelo.\nCierre: Guardar en cajas de cartón limpias.\nAdaptaciones: Juego asociativo.',
        durationMinutes: 20,
        materials: Object.freeze(['bloques grandes de plástico lavable', 'cajas de cartón limpias']),
      };

      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-11-02', activities: [{ ...duplicateThursdayAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-11-03', activities: [{ ...duplicateThursdayAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-11-04', activities: [{ ...duplicateThursdayAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-11-05', activities: [{ ...duplicateThursdayAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-11-06', activities: [{ ...duplicateThursdayAct }] },
      ];

      const enrichedDays = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const fridayAct = enrichedDays[4].activities[0];
      const thursdayAct = enrichedDays[3].activities[0];

      expect(fridayAct.objective).not.toEqual(thursdayAct.objective);
      expect(fridayAct.objective).toMatch(/\b(?:observar|consolidaci[oó]n)\b/i);
      expect(fridayAct.description).not.toEqual(thursdayAct.description);
      expect(fridayAct.description).toMatch(/consolidaci[oó]n\s+semanal/i);
    });

    it('corrige preposiciones huérfanas en objetivos y erradica «estructuras complejas» para Maternal C1', () => {
      const act = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Construcción de estructuras complejas a través de.',
        description: 'Inicio: Se presentan los bloques.\nDesarrollo: Las niñas y niños realizan la construcción de estructuras complejas.\nCierre: Guardar bloques.\nAdaptaciones: Apoyo.',
        durationMinutes: 20,
        materials: ['bloques grandes de plástico lavable'],
      };

      const table = {
        entries: [
          { id: 'MAT-01', displayName: 'bloques grandes de plástico lavable', category: 'DIDÁCTICO' },
          { id: 'MAT-02', displayName: 'cajas de cartón limpias', category: 'MOBILIARIO' },
        ],
        refMap: new Map(),
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(act as any, table as any, 'MATERNAL_C1');

      expect(sanitized.objective).not.toContain('estructuras complejas');
      expect(sanitized.objective).not.toMatch(/\ba\s+trav[eé]s(?:\s+de)?\.?$/i);
      expect(sanitized.description).not.toContain('estructuras complejas');
      expect(sanitized.description).toContain('caminos y puentes sencillos a ras de suelo');
    });
  });

  // =========================================================================
  // 5. PROMPTS DEL SISTEMA Y GOBERNANZA DE GENERACIÓN PARA MATERNAL C1
  // =========================================================================
  describe('5. Prompts del Sistema y Gobernanza de Generación para Maternal C1', () => {
    const baseRequest: WeeklyPlanningProposalRequest = {
      planningId: 'p-maternal-c1-01',
      room: roomMaternalC1,
      modality: 'DIRECT',
      weekStart: '2026-11-02',
      weekEnd: '2026-11-06',
      currentContext: {
        availableMaterials: sampleAvailableMaterials,
        observations: 'Grupo de 14 niñas y niños de Maternal C1 (37 a 42 meses).',
      },
      constraints: {
        targetActivitiesPerDay: 5,
        minDurationMinutes: 15,
        maxDurationMinutes: 25,
      },
    };

    const projection = projectPedagogicalGenerationPolicy(MATERNAL_C1_AGE_POLICY, baseRequest);
    const minimizedInput = buildPrivacyMinimizedAIInput(baseRequest, projection);

    it('construye system prompt especializado con la política oficial SR-MD-31 para Maternal C1', () => {
      const systemPrompt = buildWeeklyPlanningAISystemPrompt(minimizedInput);

      expect(systemPrompt).toContain('POLÍTICA DE RAZONAMIENTO PEDAGÓGICO Y SEGURIDAD INFANTIL PARA MATERNAL C1 (37 A 42 MESES) — SR-MD-31:');
      expect(systemPrompt).toContain('lenguaje conversacional');
      expect(systemPrompt).toContain('«¿Por qué?», «¿Cómo?»');
      expect(systemPrompt).toContain('«Mi dibujo es...»');
      expect(systemPrompt).toContain('seriación simple de 3 elementos (grande, mediano, pequeño)');
      expect(systemPrompt).toContain('clasificación combinada (forma + color)');
      expect(systemPrompt).toContain('conteo funcional inicial (1 a 5 objetos concretos)');
      expect(systemPrompt).toContain('juego simbólico y sociodramático con roles compartidos');
      expect(systemPrompt).toContain('«Guardar y ordenar»');
      expect(systemPrompt).toContain('CERO SALTOS DESDE ALTURAS O MUEBLES');
      expect(systemPrompt).toContain('CERO COMPETENCIA');
    });

    it('construye user prompt con lineamientos obligatorios de calidad y progresiones diarias para Maternal C1', () => {
      const userPrompt = buildWeeklyPlanningAIUserPrompt(minimizedInput as any);

      expect(userPrompt).toContain('MANDATORY PEDAGOGICAL QUALITY & DIVERSITY RULES FOR MATERNAL C1 (37 TO 42 MONTHS — SR-MD-31)');
      expect(userPrompt).toContain('CERO ACTIVIDADES IDÉNTICAS O CLÓNICAS');
      expect(userPrompt).toContain('PENSAMIENTO Y EXPLORACIÓN');
      expect(userPrompt).toContain('LENGUAJE CONVERSACIONAL Y JUEGO SIMBÓLICO');
      expect(userPrompt).toContain('EXPRESIÓN ARTÍSTICO-PLÁSTICA');
      expect(userPrompt).toContain('ACTIVACIÓN FÍSICA Y PSICOMOTRICIDAD');
      expect(userPrompt).toContain('HÁBITOS, HIGIENE Y AUTONOMÍA');
    });
  });

  // =========================================================================
  // 6. PIPELINE INTEGRAL DE PROPUESTA IA Y GOBERNANZA 3-TIER RECOVERY
  // =========================================================================
  describe('6. Pipeline Integral de Propuesta IA y Gobernanza 3-Tier Recovery', () => {
    it('procesa una propuesta sintética válida de 25 actividades para Maternal C1 con éxito total', async () => {
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek, dIdx) => ({
        dayOfWeek,
        date: `2026-11-0${dIdx + 2}`,
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Favorecer la comprensión auditiva y la expresión oral mediante narraciones interactivas.',
            proceduralAction: `Inicio: Se dispone el espacio en tapete limpio y se presenta el cuento infantil.\nDesarrollo: La Asistente muestra las láminas y motiva preguntas causales a las niñas y niños de Maternal C1 sobre los personajes («¿Por qué creen que pasó esto?»).\nCierre: Despedir a los personajes con un gesto y guardar el cuento en su canasto a ras de suelo.\nAdaptaciones: Brindar cercanía afectiva a quienes requieran mayor tiempo de respuesta en la sala Maternal C1.`,
            materialRefs: ['MAT-01'],
            durationMinutes: 15,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A1', repetitionPurpose: 'FAMILIARIZATION', variationDimensions: ['INTERACTION_MODE'] } : {}),
              observationTarget: 'Observar la formulación de preguntas y comprensión causal.',
            },
          },
          {
            category: 'PENSAMIENTO MATEMÁTICO',
            objective: 'Favorecer la seriación de 3 tamaños y la clasificación combinada de elementos.',
            proceduralAction: `Inicio: Se presentan los bloques grandes en cajas de cartón limpias a ras de suelo.\nDesarrollo: Construir torres y caminos ordenando bloques por tamaño grande, mediano y pequeño de forma colaborativa.\nCierre: Guardar los bloques en sus cajas de cartón limpias cantando una rima breve de orden.\nAdaptaciones: Disponer bloques de colores contrastantes para facilitar la discriminación visual.`,
            materialRefs: ['MAT-02', 'MAT-03'],
            durationMinutes: 20,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'VARY',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A2', repetitionPurpose: 'VARIATION', variationDimensions: ['CHILD_AGENCY'] } : {}),
              observationTarget: 'Observar la seriación espontánea en 3 tamaños y clasificación.',
            },
          },
          {
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Promover la coordinación motriz gruesa y saltos voluntarios con ambos pies a ras de suelo.',
            proceduralAction: `Inicio: Disponer colchonetas limpias en el piso sin desniveles ni obstáculos.\nDesarrollo: Desplazamientos variando ritmo lento y rápido, y saltos voluntarios con ambos pies sobre la colchoneta limpia sin forzar posturas.\nCierre: Sentarse en colchoneta limpia y realizar respiraciones suaves al compás de una melodía.\nAdaptaciones: Acompañar mano a mano a quienes lo requieran respetando su ritmo motor.`,
            materialRefs: ['MAT-04'],
            durationMinutes: 18,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'VARY',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A3', repetitionPurpose: 'VARIATION', variationDimensions: ['PEDAGOGICAL_INTENT'] } : {}),
              observationTarget: 'Observar la coordinación al alternar ritmos y salto voluntario.',
            },
          },
          {
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: 'Estimular la expresión gráfico-plástica y el modelado tridimensional libre.',
            proceduralAction: `Inicio: Extender pliegos de papel a ras de suelo sobre el tapete limpio y entregar crayones gruesos y masa vegetal casera no tóxica.\nDesarrollo: Niñas y niños realizan garabateos con nombre asignado diciendo «Mi dibujo es...» y modelan figuras sencillas.\nCierre: Admirar colectivamente las creaciones en la mesa baja y guardar materiales en su caja.\nAdaptaciones: Respetar la libre elección de color y la presión manual de cada participante.`,
            materialRefs: ['MAT-05'],
            durationMinutes: 15,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'VARY',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A4', repetitionPurpose: 'VARIATION', variationDimensions: ['CHILD_AGENCY'] } : {}),
              observationTarget: 'Observar el trazo intencionado con significado verbal asignado.',
            },
          },
          {
            category: 'AMBIENTES DE APRENDIZAJE',
            objective: 'Favorecer el juego sociodramático, asunción de roles y autonomía en hábitos higiénicos.',
            proceduralAction: `Inicio: Se dispone el espacio de juego con muñecos de tela, cepillos limpios y toallero bajo.\nDesarrollo: Niñas y niños asumen roles de cuidado (doctor o aseo), alimentan a los muñecos y practican lavado de manos en lavabo infantil.\nCierre: Acomodar los muñecos en su canasta entonando «Guardar y ordenar» con alegría.\nAdaptaciones: Ofrecer muñecos duplicados para facilitar la convivencia armónica y cooperación.`,
            materialRefs: ['MAT-06', 'MAT-07'],
            durationMinutes: 20,
            progression: {
              role: dIdx === 0 ? 'EXPLORE' : 'OBSERVE_OR_CONSOLIDATE',
              ...(dIdx > 0 ? { revisitsSlot: 'D1_A5', repetitionPurpose: 'RESPONSE_OBSERVATION', variationDimensions: ['OBSERVATION_FOCUS'] } : {}),
              observationTarget: 'Observar los acuerdos verbales espontáneos y autonomía higiénica.',
            },
          },
        ],
      }));

      const mockProposalJson = JSON.stringify({
        days,
        weeklyFocus: 'Desarrollo del lenguaje conversacional, seriación, clasificación, juego sociodramático y hábitos en Maternal C1',
      });

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(mockProposalJson),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);

      const request: WeeklyPlanningProposalRequest = {
        planningId: 'p-maternal-c1-01',
        room: roomMaternalC1,
        modality: 'DIRECT',
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
        currentContext: {
          availableMaterials: sampleAvailableMaterials,
          observations: 'Grupo de 14 niños en Maternal C1.',
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
          expect(act.description).not.toContain('tapete');
          expect(act.description).not.toContain('líneas del tapete');
          expect(act.description).not.toContain('líneas marcadas');
          expect(act.description).not.toContain('estructuras complejas');
          expect(act.materials).not.toContain('tapete');
          expect(act.materials).not.toContain('tapete limpio');
          expect(act.objective.length).toBeGreaterThan(15);
        }
      }
      expect(proposal.progression).toBeDefined();
      expect(proposal.progression?.weeklyFocus).toContain('Maternal C1');
    });
  });

  // =========================================================================
  // 7. INTEGRACIÓN DE UI Y RESOLUCIÓN DE SALA PARA MATERNAL C1
  // =========================================================================
  describe('7. Integración de UI y Selección de Sala para Maternal C1', () => {
    it('formatea el título de rol institucional para Maternal C1', () => {
      expect(getAssistantRoleLabel('room-maternal-c1')).toBe('Asistente Educativa MC1');
      expect(getAssistantRoleLabel('maternal-c1')).toBe('Asistente Educativa MC1');
    });

    it('resuelve y valida la sala persistida Maternal C1 cuando está autorizada', () => {
      const authorizedRooms = [
        RoomCatalog.getRoom('room-lactantes-a')!,
        RoomCatalog.getRoom('room-lactantes-b')!,
        RoomCatalog.getRoom('room-lactantes-c')!,
        RoomCatalog.getRoom('room-maternal-a')!,
        RoomCatalog.getRoom('room-maternal-b1')!,
        RoomCatalog.getRoom('room-maternal-b2')!,
        RoomCatalog.getRoom('room-maternal-c1')!,
      ];

      sessionStorage.setItem('tutoria_selected_room:default:test-user', 'maternal-c1');
      const resolved = readPersistedSelectedRoom('test-user', 'default', authorizedRooms);
      expect(resolved).toBe('room-maternal-c1');
      sessionStorage.clear();
    });
  });

  // =========================================================================
  // 8. CORRECCIÓN FOCALIZADA MATERNAL C1 (SR-MD-31C)
  // =========================================================================
  describe('8. Corrección Focalizada Maternal C1 (SR-MD-31C)', () => {
    // 1. Inventario: eliminar propuestas que requieran masa casera u otros materiales no declarados.
    it('inventario: elimina masa casera no inventariada y la sustituye por crayones gruesos y papel bond a ras de suelo', () => {
      const inventoryWithoutClay =
        'Bloques grandes de plástico lavable, cuentos ilustrados infantiles, crayones gruesos de cera, pliegos de papel bond, colchonetas limpias';
      const table = createRequestScopedMaterialTable(
        inventoryWithoutClay.split(',').map((s) => s.trim())
      );

      const rawAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Modelado tridimensional con masa casera no tóxica y estimulación táctil.',
        description:
          'Inicio: Se ofrece masa casera no tóxica sobre colchonetas limpias.\nDesarrollo: Niñas y niños se dedican a amasar y modelar figuras tridimensionales con masa vegetal no tóxica.\nCierre: Guardar la masa casera en sus cajas limpias a ras de suelo.\nAdaptaciones: Ofrecer porciones individuales de masa para evitar disputas.',
        materials: ['masa vegetal casera no tóxica'],
        durationMinutes: 15,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(
        rawAct,
        table,
        'Maternal C1',
        true
      );

      // Materiales
      expect(sanitized.materials.some((m) => /\b(?:masa|plastilina|arcilla)\b/i.test(m))).toBe(false);
      expect(sanitized.materials.some((m) => /\bcray[oó]n/i.test(m))).toBe(true);
      expect(sanitized.materials.some((m) => /\b(?:papel|pliegos?)\b/i.test(m))).toBe(true);

      // Descripción
      expect(/\b(?:masa|amasar|modelar)\b/i.test(sanitized.description)).toBe(false);
      expect(sanitized.description).toContain('crayones gruesos');
      expect(sanitized.description).toContain('papel bond');

      // Objetivo
      expect(/\b(?:masa|amasar)\b/i.test(sanitized.objective)).toBe(false);
      expect(sanitized.objective).toContain('trazos libres con crayones gruesos sobre papel');

      // Adaptaciones
      expect(/\b(?:masa|plastilina)\b/i.test(sanitized.description)).toBe(false);
    });

    // 1b. Inventario: no permitir actividades que mencionen materiales físicos mientras materials permanece vacío.
    it('inventario: auto-puebla materials desde el inventario disponible cuando materials está vacío', () => {
      const table = createRequestScopedMaterialTable([
        'Bloques grandes de plástico lavable',
        'Cajas de cartón limpias',
        'Colchonetas limpias',
      ]);

      const rawAct = {
        category: 'PENSAMIENTO MATEMÁTICO',
        objective: 'Favorecer la seriación y clasificación de bloques por tamaño.',
        description:
          'Inicio: Disponer bloques grandes en cajas de cartón limpias a ras de suelo.\nDesarrollo: Niñas y niños apilan bloques grandes y los clasifican dentro de cajas de cartón limpias.\nCierre: Guardar bloques grandes en cajas de cartón limpias.\nAdaptaciones: Disponer bloques duplicados.',
        materials: [] as string[],
        durationMinutes: 15,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(
        rawAct,
        table,
        'Maternal C1',
        true
      );

      expect(sanitized.materials.length).toBeGreaterThan(0);
      expect(sanitized.materials.some((m) => /\bbloques?\b/i.test(m))).toBe(true);
      expect(sanitized.materials.some((m) => /\bcajas?\b/i.test(m))).toBe(true);
    });

    // 2. Coherencia motriz: al normalizar saltos a desplazamientos seguros, corregir objetivo, desarrollo, cierre y adaptaciones sin contradicciones.
    it('coherencia motriz: erradica exhaustivamente referencias a saltar/saltos en objetivo, desarrollo, cierre y adaptaciones', () => {
      const table = createRequestScopedMaterialTable([
        'Colchonetas limpias',
        'Aros plásticos grandes',
      ]);

      const rawAct = {
        category: 'ACTIVACIÓN FÍSICA',
        objective: 'Promover saltos con ambos pies y coordinación motriz gruesa sobre colchonetas.',
        description:
          'Inicio: Disponer aros en colchonetas limpias sin desniveles.\nDesarrollo: Saltar adentro de los aros con ambos pies y brincar suavemente como ranitas.\nCierre: Felicitar los saltos logrados y respirar suavemente en colchonetas limpias.\nAdaptaciones: Acompañar mano a mano si prefieren no saltar o sin exigir saltos obligatorios.',
        materials: ['colchonetas limpias', 'aros plásticos grandes'],
        durationMinutes: 18,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(
        rawAct,
        table,
        'Maternal C1',
        true
      );

      // Objetivo sin saltos/brincos
      expect(/\b(?:salt(?:ar|os?|itos?)|brinc(?:ar|os?))\b/i.test(sanitized.objective)).toBe(false);
      expect(sanitized.objective).toContain('desplazarse de forma voluntaria sobre colchonetas limpias');

      // Desarrollo sin saltos/brincos
      expect(/\b(?:salt(?:ar|os?|itos?)|brinc(?:ar|os?))\b/i.test(sanitized.description)).toBe(false);
      expect(sanitized.description).toContain('pasar caminando');

      // Cierre sin saltos
      expect(sanitized.description).toContain('celebrar los desplazamientos y pasos firmes');

      // Adaptaciones sin contradicciones (cero mención de saltos, marcha segura con apoyo)
      expect(sanitized.description).toContain('Brindar apoyo cercano de la mano a quienes muestren marcha vacilante');
      expect(sanitized.description).not.toContain('sin exigir saltos');
      expect(sanitized.description).not.toContain('si prefieren no saltar');
    });

    // 3. Diversidad: evitar que jueves y viernes repitan literalmente el mural colectivo.
    it('diversidad: sustituye el mural colectivo en jueves por trazos rítmicos individuales guiados por canto, reservando el mural para el viernes', () => {
      const days = [
        { dayOfWeek: 'MONDAY', activities: [{ category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'Dibujo 1', description: 'Inicio: Papel.\nDesarrollo: Trazos.\nCierre: Fin.\nAdaptaciones: Ritmo.', materials: [] }] },
        { dayOfWeek: 'TUESDAY', activities: [{ category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'Dibujo 2', description: 'Inicio: Papel.\nDesarrollo: Trazos.\nCierre: Fin.\nAdaptaciones: Ritmo.', materials: [] }] },
        { dayOfWeek: 'WEDNESDAY', activities: [{ category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'Dibujo 3', description: 'Inicio: Papel.\nDesarrollo: Trazos.\nCierre: Fin.\nAdaptaciones: Ritmo.', materials: [] }] },
        {
          dayOfWeek: 'THURSDAY',
          activities: [
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Realizar un mural colectivo con crayones gruesos sobre papel bond extendido a ras de suelo.',
              description:
                'Inicio: Extender papel bond a ras de suelo sobre colchonetas limpias.\nDesarrollo: Realizar un mural colectivo de líneas y garabatos con crayones gruesos.\nCierre: Admirar colectivamente el mural colectivo en la sala.\nAdaptaciones: Respeto al ritmo individual.',
              materials: ['pliegos de papel bond', 'crayones gruesos de cera'],
            },
          ],
        },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Consolidar la expresión artística colaborativa en el mural colectivo semanal.',
              description:
                'Inicio: Extender papel bond a ras de suelo sobre colchonetas limpias.\nDesarrollo: Realizar el mural colectivo final de la semana con crayones gruesos.\nCierre: Admirar colectivamente el mural colectivo semanal.\nAdaptaciones: Respeto al ritmo individual.',
              materials: ['pliegos de papel bond', 'crayones gruesos de cera'],
            },
          ],
        },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(days as any, 'MATERNAL_C1');

      const thursdayAct = enriched[3].activities[0];
      const fridayAct = enriched[4].activities[0];

      // Jueves erradica mural colectivo y promueve trazos rítmicos individuales
      expect(thursdayAct.objective).not.toContain('mural colectivo');
      expect(thursdayAct.objective).toContain('trazos libres individuales');
      expect(thursdayAct.description).not.toContain('mural colectivo');
      expect(thursdayAct.description).toContain('trazos individuales');

      // Viernes preserva o consolida
      expect(fridayAct.description).toContain('mural colectivo');
    });

    // 3b. Diversidad: evitar que un mismo día incluya dos actividades prácticamente idénticas.
    it('diversidad: transforma la segunda actividad idéntica dentro del mismo día para garantizar diferenciación pedagógica', () => {
      const days = [
        {
          dayOfWeek: 'TUESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Lectura interactiva del cuento infantil.',
              description: 'Inicio: Mostrar cuento.\nDesarrollo: Preguntas y solapas.\nCierre: Guardar libro.\nAdaptaciones: Cercanía.',
              materials: ['cuentos ilustrados infantiles'],
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Clasificar bloques por tamaño.',
              description: 'Inicio: Bloques en piso.\nDesarrollo: Niñas y niños clasifican bloques grandes por tamaño.\nCierre: Guardar bloques.\nAdaptaciones: Apoyo.',
              materials: ['bloques grandes de plástico lavable'],
            },
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Desplazamientos a ras de suelo.',
              description: 'Inicio: Colchonetas limpias.\nDesarrollo: Caminar a ras de suelo.\nCierre: Respiración.\nAdaptaciones: Acompañamiento.',
              materials: ['colchonetas limpias'],
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Clasificar bloques por tamaño.',
              description: 'Inicio: Bloques en piso.\nDesarrollo: Niñas y niños clasifican bloques grandes por tamaño.\nCierre: Guardar bloques.\nAdaptaciones: Apoyo.',
              materials: ['bloques grandes de plástico lavable'],
            },
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Hábitos higiénicos en lavabo infantil.',
              description: 'Inicio: Lavabo.\nDesarrollo: Lavado de manos.\nCierre: Toalla.\nAdaptaciones: Autonomía.',
              materials: ['lavabo infantil con toallas limpias'],
            },
          ],
        },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(days as any, 'MATERNAL_C1');
      const act2 = enriched[0].activities[1];
      const act4 = enriched[0].activities[3];

      expect(act4.objective).not.toBe(act2.objective);
      expect(act4.objective).toContain('alineando bloques grandes para formar caminos y puentes continuos');
      expect(act4.description).toContain('caminos o puentes a ras de suelo');
    });

    // 4. Progresión: reservar el cierre observacional semanal para el viernes. El jueves debe ofrecer una variación pedagógica real.
    it('progresión: asigna VARY y variación pedagógica en jueves, y reserva OBSERVE_OR_CONSOLIDATE para el viernes', () => {
      const days = [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Lectura del cuento Spot.',
              proceduralAction: 'Inicio: Cuento.\nDesarrollo: Lectura.\nCierre: Guardar.\nAdaptaciones: Ritmo.',
              materials: ['cuentos ilustrados infantiles'],
              progression: { role: 'EXPLORE' },
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Relectura interactiva.',
              proceduralAction: 'Inicio: Cuento.\nDesarrollo: Relectura.\nCierre: Guardar.\nAdaptaciones: Ritmo.',
              materials: ['cuentos ilustrados infantiles'],
              progression: { role: 'REVISIT', revisitsSlot: 'D1_A1' },
            },
          ],
        },
        {
          dayOfWeek: 'WEDNESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Lectura con onomatopeyas.',
              proceduralAction: 'Inicio: Cuento.\nDesarrollo: Onomatopeyas.\nCierre: Guardar.\nAdaptaciones: Ritmo.',
              materials: ['cuentos ilustrados infantiles'],
              progression: { role: 'VARY', revisitsSlot: 'D1_A1' },
            },
          ],
        },
        {
          dayOfWeek: 'THURSDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Observar y consolidar la lectura dramatizada en el cierre semanal.',
              proceduralAction: 'Inicio: Cuento.\nDesarrollo: Como consolidación semanal, la Asistente observa con atención y registra.\nCierre: Guardar.\nAdaptaciones: Ritmo.',
              materials: ['cuentos ilustrados infantiles'],
              progression: { role: 'VARY', revisitsSlot: 'D1_A1' },
            },
          ],
        },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Relectura autónoma compartida.',
              proceduralAction: 'Inicio: Cuento.\nDesarrollo: Relectura autónoma.\nCierre: Guardar.\nAdaptaciones: Ritmo.',
              materials: ['cuentos ilustrados infantiles'],
              progression: { role: 'OBSERVE_OR_CONSOLIDATE', revisitsSlot: 'D1_A1' },
            },
          ],
        },
      ];

      const rawJson = {
        days,
        weeklyFocus: 'Progresión semanal de lectura y juego',
      };

      const result = parseAndAllowlistUntrustedProposal(rawJson, undefined, {
        requireProgression: true,
        roomType: 'MATERNAL_C1',
      });

      const expThursday = result.progression?.experiences.find((e) => e.experienceId === 'EXP-D4-A1');
      const expFriday = result.progression?.experiences.find((e) => e.experienceId === 'EXP-D5-A1');

      // Jueves es VARY con propósito PROGRESSION y dimensión PEDAGOGICAL_INTENT
      expect(expThursday?.role).toBe('VARY');
      expect(expThursday?.repetitionPurpose).toBe('PROGRESSION');
      expect(expThursday?.variationDimensions).toEqual(['PEDAGOGICAL_INTENT']);

      // Viernes es OBSERVE_OR_CONSOLIDATE con propósito RESPONSE_OBSERVATION y dimensión OBSERVATION_FOCUS
      expect(expFriday?.role).toBe('OBSERVE_OR_CONSOLIDATE');
      expect(expFriday?.repetitionPurpose).toBe('RESPONSE_OBSERVATION');
      expect(expFriday?.variationDimensions).toEqual(['OBSERVATION_FOCUS']);

      // Jueves no contiene texto de consolidación semanal prematuro
      const enriched = enrichMaternalB1WeeklyProgression(result.days, 'MATERNAL_C1');
      expect(enriched[3].activities[0].objective).not.toContain('cierre semanal');
      expect(enriched[3].activities[0].objective).not.toContain('observar y consolidar');
      expect(enriched[3].activities[0].description).not.toContain('Como consolidación semanal');
    });

    // 5. Redacción: eliminar duplicaciones como «a ras de suelo a ras de suelo».
    it('redacción: elimina duplicaciones consecutivas de locuciones como «a ras de suelo a ras de suelo» y «sobre colchonetas limpias»', () => {
      const input1 = 'Extender los pliegos de papel a ras de suelo a ras de suelo sobre colchonetas limpias.';
      const cleaned1 = cleanDuplicatePedagogicalPhrases(input1);
      expect(cleaned1).toBe('Extender los pliegos de papel a ras de suelo sobre colchonetas limpias.');

      const input2 = 'Disponer los materiales sobre colchonetas limpias sobre colchonetas limpias en la sala.';
      const cleaned2 = cleanDuplicatePedagogicalPhrases(input2);
      expect(cleaned2).toBe('Disponer los materiales sobre colchonetas limpias en la sala.');

      const input3 = 'Guardar los bloques en cajas de cartón limpias cajas de cartón limpias.';
      const cleaned3 = cleanDuplicatePedagogicalPhrases(input3);
      expect(cleaned3).toBe('Guardar los bloques en cajas de cartón limpias.');

      const input4 = 'Actividad sobre colchonetas limpias a ras de suelo sobre colchonetas limpias.';
      const cleaned4 = cleanDuplicatePedagogicalPhrases(input4);
      expect(cleaned4).toBe('Actividad a ras de suelo sobre colchonetas limpias.');
    });

    // 5b. Adaptaciones: asegurar que las adaptaciones correspondan a la acción descrita.
    it('redacción y adaptaciones: reemplaza adaptaciones incoherentes o cruzadas de otro dominio por adaptaciones específicas para Maternal C1', () => {
      const table = createRequestScopedMaterialTable([
        'Cuentos ilustrados infantiles',
        'Colchonetas limpias',
      ]);

      // Actividad de lectura que tenía una adaptación errónea de saltar y circuitos
      const rawReadingAct = {
        category: 'LECTURA EN VOZ ALTA',
        objective: 'Promover la escucha atenta y la formulación de preguntas causales con cuentos infantiles.',
        description:
          'Inicio: Sentarse en colchonetas limpias y mostrar el cuento.\nDesarrollo: La Asistente narra la historia y muestra ilustraciones.\nCierre: Guardar el cuento en el canasto a ras de suelo.\nAdaptaciones: Acompañar mano a mano en los saltos del circuito.',
        materials: ['cuentos ilustrados infantiles'],
        durationMinutes: 15,
      };

      const sanitizedReading = sanitizeMaternalB1PedagogicalFidelity(
        rawReadingAct,
        table,
        'Maternal C1',
        true
      );

      expect(sanitizedReading.description).not.toContain('saltos del circuito');
      expect(sanitizedReading.description).toContain('proceso de adaptación o con lenguaje emergente');
      expect(sanitizedReading.description).toContain('observar la lectura sentados junto a la Asistente');
    });
  });

  // =========================================================================
  // 9. CORRECCIÓN FINAL FOCALIZADA MATERNAL C1 (SR-MD-31E)
  // =========================================================================
  describe('9. Corrección Final Focalizada Maternal C1 (SR-MD-31E)', () => {
    const table = createRequestScopedMaterialTable([
      'Bloques grandes de plástico lavable',
      'Cuentos ilustrados infantiles',
      'Muñecos de tela',
      'Pelotas medianas de vinil',
      'Colchonetas limpias',
      'Crayones gruesos de cera',
      'Cajas de cartón limpias',
      'Pliegos de papel bond',
    ]);

    // 1. Eliminar la contradicción del jueves en activación física: «a ras de suelo, sin desplazamientos a ras de suelo».
    it('Item 1: elimina la contradicción «a ras de suelo, sin desplazamientos a ras de suelo» y cualquier fórmula «sin desplazamientos»', () => {
      const awkwardActivity = {
        category: 'ACTIVACIÓN FÍSICA',
        objective: 'Desarrollar la agilidad motriz a ras de suelo, sin desplazamientos a ras de suelo.',
        description:
          'Inicio: Sentarse en colchonetas limpias.\nDesarrollo: La Asistente propone desplazamientos a ras de suelo, sin desplazamientos a ras de suelo imitando animalitos.\nCierre: Retorno a la calma.\nAdaptaciones: Acompañar según ritmo.',
        materials: ['colchonetas limpias'],
        durationMinutes: 18,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(
        awkwardActivity,
        table,
        'Maternal C1',
        true
      );

      expect(sanitized.objective).not.toContain('sin desplazamientos a ras de suelo');
      expect(sanitized.objective).not.toContain('sin desplazamientos');
      expect(sanitized.description).not.toContain('sin desplazamientos a ras de suelo');
      expect(sanitized.description).not.toContain('sin desplazamientos');
      expect(sanitized.description).toContain('a ras de suelo');

      const cleanedText = cleanDuplicatePedagogicalPhrases(
        'Desplazamientos a ras de suelo, sin desplazamientos a ras de suelo sobre colchonetas limpias.'
      );
      expect(cleanedText).not.toContain('sin desplazamientos');
      expect(cleanedText).toBe('Desplazamientos a ras de suelo sobre colchonetas limpias.');
    });

    // 2. Mejorar la coherencia de la imitación de animales del lunes, sin introducir movimientos forzados.
    it('Item 2: mejora la coherencia de la imitación de animales del lunes, erradicando movimientos forzados o agachados', () => {
      const rawMondayDays = [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Desarrollar la agilidad motriz desplazándose como animalitos agachándose y caminando.',
              description:
                'Inicio: En colchoneta limpia.\nDesarrollo: La Asistente propone imitar animalitos agachándose y caminando a ras de suelo sobre colchonetas limpias.\nCierre: Respiración suave.\nAdaptaciones: Apoyo cercano.',
              materials: ['colchonetas limpias'],
              durationMinutes: 18,
            },
          ],
        },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        { dayOfWeek: 'FRIDAY', activities: [] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawMondayDays, 'MATERNAL_C1');
      const mondayAct = enriched[0].activities[0];

      expect(mondayAct.objective).not.toMatch(/agach[aá]ndose|en cuclillas/i);
      expect(mondayAct.description).not.toMatch(/agach[aá]ndose|en cuclillas/i);
      expect(mondayAct.description).toContain('caminando con pasos cómodos y seguros sobre colchonetas limpias');
    });

    // 3. Diferenciar realmente la exploración sensorial del martes y jueves, respetando los materiales disponibles.
    it('Item 3: diferencia genuinamente la exploración sensorial de martes y jueves respetando materiales disponibles', () => {
      const fiveDaysWithSensory = [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Explorar bloques grandes.',
              description: 'Inicio: Sentarse.\nDesarrollo: Bloques.\nCierre: Guardar.\nAdaptaciones: Apoyo.',
              materials: ['bloques grandes de plástico lavable'],
              durationMinutes: 15,
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY',
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Favorecer la exploración sensorial táctil de texturas y firmeza de bloques y cajas.',
              description:
                'Inicio: Sentarse en colchonetas limpias.\nDesarrollo: Las niñas y niños exploran texturas táctiles pasando sus palmas sobre bloques y cajas limpias.\nCierre: Guardar materiales.\nAdaptaciones: Modelar la caricia.',
              materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'],
              durationMinutes: 15,
            },
          ],
        },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        {
          dayOfWeek: 'THURSDAY',
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Favorecer la exploración sensorial de texturas con materiales.',
              description:
                'Inicio: En colchoneta.\nDesarrollo: Exploración de texturas sensoriales.\nCierre: Guardar.\nAdaptaciones: Apoyo.',
              materials: ['crayones gruesos de cera', 'pliegos de papel bond'],
              durationMinutes: 15,
            },
          ],
        },
        { dayOfWeek: 'FRIDAY', activities: [] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(fiveDaysWithSensory, 'MATERNAL_C1');
      const tuesdayAct = enriched[1].activities[0];
      const thursdayAct = enriched[3].activities[0];

      // Martes conserva su exploración sensorial táctil
      expect(tuesdayAct.objective).toContain('táctil');
      // Jueves es diferenciado a contrastes visuales y rítmicos sobre materiales declarados
      expect(thursdayAct.objective).toContain('discriminación sensorial visual y rítmica');
      expect(thursdayAct.description).toContain('contrastes sensoriales visuales y auditivos');
      expect(thursdayAct.description).toContain('crayones gruesos');
      expect(thursdayAct.description).not.toBe(tuesdayAct.description);
    });

    // 4. Dar al viernes una finalidad de observación o consolidación diferente de la actividad de láminas de animales del miércoles.
    it('Item 4: da al viernes una finalidad de consolidación comunicativa diferente de las láminas de animales del miércoles', () => {
      const fiveDaysWithAnimalCards = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        {
          dayOfWeek: 'WEDNESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Estimular el lenguaje oral identificando láminas de animales del cuento.',
              description:
                'Inicio: Mostrar láminas ilustradas de animales.\nDesarrollo: Las niñas y niños observan láminas de animales e imitan sus sonidos.\nCierre: Guardar láminas.\nAdaptaciones: Modelar gestos.',
              materials: ['cuentos ilustrados infantiles'],
              durationMinutes: 12,
            },
          ],
        },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Reconocer láminas de animales en el cierre.',
              description:
                'Inicio: Mostrar tarjetas de animales.\nDesarrollo: Las niñas y niños vuelven a mirar láminas de animales.\nCierre: Guardar tarjetas.\nAdaptaciones: Apoyo verbal.',
              materials: ['cuentos ilustrados infantiles'],
              durationMinutes: 12,
            },
          ],
        },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(fiveDaysWithAnimalCards, 'MATERNAL_C1');
      const wednesdayAct = enriched[2].activities[0];
      const fridayAct = enriched[4].activities[0];

      // Miércoles mantiene el trabajo con láminas/onomatopeyas
      expect(wednesdayAct.description).toContain('láminas de animales');
      // Viernes se transforma en consolidación comunicativa y círculo compartido
      expect(fridayAct.objective).toContain('Observar y consolidar la expresión oral y la comunicación afectiva');
      expect(fridayAct.description).toContain('consolidación semanal');
      expect(fridayAct.description).toContain('sin recurrir a láminas repetitivas');
      expect(fridayAct.description).not.toContain('tarjetas de animales');
    });

    // 5. Alinear el objetivo de observación matemática del viernes con la actividad efectivamente generada.
    it('Item 5: alinea dinámicamente el objetivo de observación matemática del viernes con la actividad generada (color, construcción, correspondencia, tamaño)', () => {
      // Caso 5A: Actividad generada enfocada en colores
      const fridayColor = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Observar y consolidar la discriminación perceptual por tamaño.', // Desalineado originalmente
              description:
                'Inicio: Disponer cajas limpias.\nDesarrollo: Las niñas y niños clasifican bloques grandes por color amarillo y azul en cajas limpias a ras de suelo.\nCierre: Guardar bloques.\nAdaptaciones: Permitir clasificar libremente.',
              materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'],
              durationMinutes: 12,
            },
          ],
        },
      ];

      const enrichedColor = enrichMaternalB1WeeklyProgression(fridayColor, 'MATERNAL_C1');
      expect(enrichedColor[4].activities[0].objective).toContain('clasificación cromática agrupando bloques grandes por color notorio');
      expect(enrichedColor[4].activities[0].objective).not.toContain('tamaño');

      // Caso 5B: Actividad generada enfocada en construcción de caminos/trenes
      const fridayRoads = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Observar y consolidar la discriminación perceptual por tamaño.', // Desalineado
              description:
                'Inicio: En colchoneta.\nDesarrollo: Las niñas y niños alinean bloques formando un tren o camino largo continuo en el piso.\nCierre: Guardar bloques.\nAdaptaciones: Acompañar.',
              materials: ['bloques grandes de plástico lavable'],
              durationMinutes: 12,
            },
          ],
        },
      ];

      const enrichedRoads = enrichMaternalB1WeeklyProgression(fridayRoads, 'MATERNAL_C1');
      expect(enrichedRoads[4].activities[0].objective).toContain('nociones espaciales al alinear y apilar bloques grandes');
      expect(enrichedRoads[4].activities[0].objective).not.toContain('tamaño');

      // Caso 5C: Actividad generada enfocada en correspondencia / conteo
      const fridayCorrespondence = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Observar y consolidar la discriminación perceptual por tamaño.', // Desalineado
              description:
                'Inicio: En colchoneta.\nDesarrollo: Las niñas y niños colocan bloques uno a uno dentro de recipientes limpios contando verbalmente.\nCierre: Guardar.\nAdaptaciones: Respetar ritmo.',
              materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'],
              durationMinutes: 12,
            },
          ],
        },
      ];

      const enrichedCorrespondence = enrichMaternalB1WeeklyProgression(fridayCorrespondence, 'MATERNAL_C1');
      expect(enrichedCorrespondence[4].activities[0].objective).toContain('correspondencia uno a uno y la noción de continente');
      expect(enrichedCorrespondence[4].activities[0].objective).not.toContain('tamaño');

      // Caso 5D: Actividad generada enfocada en tamaño (grande y pequeño)
      const fridaySize = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Favorecer el juego.',
              description:
                'Inicio: En colchoneta.\nDesarrollo: Las niñas y niños agrupan bloques por tamaño separando los grandes de los pequeños en sus cajas.\nCierre: Guardar.\nAdaptaciones: Apoyo visual.',
              materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'],
              durationMinutes: 12,
            },
          ],
        },
      ];

      const enrichedSize = enrichMaternalB1WeeklyProgression(fridaySize, 'MATERNAL_C1');
      expect(enrichedSize[4].activities[0].objective).toContain('discriminación perceptual por tamaño agrupando bloques grandes y pequeños');
    });

    // 6. Reducir cierres repetitivos y corregir construcciones gramaticales poco naturales.
    it('Item 6: reduce cierres repetitivos diversificando por categoría y corrige construcciones gramaticales poco naturales', () => {
      // 6.1 Correcciones gramaticales en cleanDuplicatePedagogicalPhrases
      const awkwardGrammar =
        'De forma voluntaria y supervisada a ras de suelo, La Asistente dispone los bloques en en las cajas de de cartón sobre sobre colchonetas limpias.';
      const cleanedGrammar = cleanDuplicatePedagogicalPhrases(awkwardGrammar);

      expect(cleanedGrammar).toContain(', la Asistente');
      expect(cleanedGrammar).not.toContain('La Asistente');
      expect(cleanedGrammar).not.toMatch(/\ben en\b/);
      expect(cleanedGrammar).not.toMatch(/\bde de\b/);
      expect(cleanedGrammar).not.toMatch(/\bsobre sobre\b/);

      // 6.2 Cierres diversificados en viernes (no todos iguales)
      const fridayWithRepetitiveClosures = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Consolidar lectura.',
              description:
                'Inicio: Mostrar cuento.\nDesarrollo: Lectura de cierre.\nCierre: Celebrar colectivamente los logros semanales con una ronda de aplausos afectuosos y guardar juntos los materiales en sus cajas limpias a ras de suelo.\nAdaptaciones: Acompañar.',
              materials: ['cuentos ilustrados infantiles'],
              durationMinutes: 12,
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Consolidar conteo.',
              description:
                'Inicio: Bloques.\nDesarrollo: Conteo de bloques.\nCierre: Celebrar colectivamente los logros semanales con una ronda de aplausos afectuosos y guardar juntos los materiales en sus cajas limpias a ras de suelo.\nAdaptaciones: Acompañar.',
              materials: ['bloques grandes de plástico lavable'],
              durationMinutes: 12,
            },
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Consolidar mural.',
              description:
                'Inicio: Papel bond.\nDesarrollo: Mural colectivo.\nCierre: Celebrar colectivamente los logros semanales con una ronda de aplausos afectuosos y guardar juntos los materiales en sus cajas limpias a ras de suelo.\nAdaptaciones: Acompañar.',
              materials: ['pliegos de papel bond', 'crayones gruesos de cera'],
              durationMinutes: 15,
            },
            {
              category: 'ACTIVACIÓN FÍSICA',
              objective: 'Consolidar marcha.',
              description:
                'Inicio: Colchonetas.\nDesarrollo: Circuito calmado.\nCierre: Celebrar colectivamente los logros semanales con una ronda de aplausos afectuosos y guardar juntos los materiales en sus cajas limpias a ras de suelo.\nAdaptaciones: Acompañar.',
              materials: ['colchonetas limpias'],
              durationMinutes: 18,
            },
          ],
        },
      ];

      const enrichedFriday = enrichMaternalB1WeeklyProgression(fridayWithRepetitiveClosures, 'MATERNAL_C1');
      const readingClosure = enrichedFriday[4].activities[0].description;
      const mathClosure = enrichedFriday[4].activities[1].description;
      const artClosure = enrichedFriday[4].activities[2].description;
      const motorClosure = enrichedFriday[4].activities[3].description;

      // Cada cierre debe ser distinto según su eje pedagógico
      expect(readingClosure).toContain('Cerrar el libro con cariño');
      expect(mathClosure).toContain('Admirar con alegría las figuras construidas o clasificadas');
      expect(artClosure).toContain('Admirar colectivamente el mural y los trazos compartidos');
      expect(motorClosure).toContain('Sentarse en colchonetas limpias en círculo, respirar serenamente');

      expect(readingClosure).not.toBe(mathClosure);
      expect(mathClosure).not.toBe(artClosure);
      expect(artClosure).not.toBe(motorClosure);
    });
  });

  // =========================================================================
  // 10. Corrección Puntual de Coherencia Maternal C1 (SR-MD-31G)
  // =========================================================================
  describe('10. Corrección Puntual de Coherencia Maternal C1 (SR-MD-31G)', () => {
    const table = createRequestScopedMaterialTable(
      sampleAvailableMaterials,
      MATERNAL_C1_APPROVED_ROOM_FIXTURES
    );

    // P0 — Coherencia categoría–objetivo–desarrollo–materiales en Viernes EXP-D5-A1
    it('P0: preserva la lectura en voz alta diaria en viernes EXP-D5-A1 sin sustituir su objetivo por correspondencia matemática ni bloques', () => {
      const fridayPlanWithReadingAndMath = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Consolidar el goce literario y la iniciativa lectora mediante la relectura dialogada de pasajes favoritos.',
              description:
                'Inicio: La Asistente agrupa a las niñas y niños sobre las colchonetas limpias en semicírculo para contar el cuento «¿Dónde está Spot?» de Eric Hill.\nDesarrollo: En la lectura dialogada, la Asistente hojea el cuento y los niños buscan a Spot que está adentro de la canasta, levantando las solapas con entusiasmo.\nCierre: Cerrar el libro con cariño, despedir a los personajes con un gesto de la mano y acomodarlo en el canasto a ras de suelo.\nAdaptaciones: Respetar pausas y modulaciones de voz afectuosas.',
              materials: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              durationMinutes: 15,
            },
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Consolidar conteo 1 a 1 de objetos.',
              description:
                'Inicio: Disponer bloques grandes y cajas de cartón limpias a ras de suelo.\nDesarrollo: Los niños colocan bloques uno a uno dentro de las cajas de cartón limpias verificando correspondencia uno a uno.\nCierre: Guardar bloques.\nAdaptaciones: Modelado con señalamiento guiado.',
              materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'],
              durationMinutes: 12,
            },
          ],
        },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(fridayPlanWithReadingAndMath, 'MATERNAL_C1');
      const readingAct = enriched[4].activities[0];
      const mathAct = enriched[4].activities[1];

      // Actividad 0: LECTURA EN VOZ ALTA debe conservar objetivo narrativo y CERO bloques/cajas de cartón
      expect(readingAct.category).toBe('LECTURA EN VOZ ALTA');
      expect(readingAct.objective).not.toContain('bloques');
      expect(readingAct.objective).not.toContain('correspondencia uno a uno');
      expect(readingAct.objective).not.toContain('noción de continente');
      expect(readingAct.objective).toMatch(/\b(?:goce\s+literario|comprensi[oó]n|lectora|cuento|narrativ)\b/i);
      expect(readingAct.materials).toContain('cuentos ilustrados infantiles');
      expect(readingAct.materials).not.toContain('bloques grandes de plástico lavable');

      // Actividad 1: PENSAMIENTO MATEMÁTICO sí recibe el objetivo de correspondencia
      expect(mathAct.category).toBe('PENSAMIENTO MATEMÁTICO');
      expect(mathAct.objective).toContain('correspondencia uno a uno');
    });

    it('P0: restaura el objetivo de lectura si llegó contaminado con términos matemáticos de bloques o correspondencia', () => {
      const contaminatedFridayReading = [
        { dayOfWeek: 'MONDAY', activities: [] },
        { dayOfWeek: 'TUESDAY', activities: [] },
        { dayOfWeek: 'WEDNESDAY', activities: [] },
        { dayOfWeek: 'THURSDAY', activities: [] },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              // Objetivo erróneamente asignado con correspondencia y bloques
              objective: 'Observar y consolidar la correspondencia uno a uno y la noción de continente colocando bloques dentro de cajas de cartón limpias.',
              description:
                'Inicio: Presentar el cuento «¿Dónde está Spot?» de Eric Hill a ras de suelo.\nDesarrollo: La Asistente relee los pasajes favoritos de Spot junto a las niñas y niños sobre colchonetas limpias.\nCierre: Guardar el cuento en el canasto.\nAdaptaciones: Apoyo cercano.',
              materials: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              durationMinutes: 15,
            },
          ],
        },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(contaminatedFridayReading, 'MATERNAL_C1');
      const restoredReadingAct = enriched[4].activities[0];

      expect(restoredReadingAct.category).toBe('LECTURA EN VOZ ALTA');
      expect(restoredReadingAct.objective).not.toContain('bloques');
      expect(restoredReadingAct.objective).not.toContain('correspondencia uno a uno');
      expect(restoredReadingAct.objective).toContain('comprensión narrativa, la escucha atenta y el interés lector compartiendo pasajes');
    });

    // P1.1 — Evitar materiales que no intervienen en la actividad
    it('P1.1: poda materiales no intervinientes (fantasmas) cuando materials lista recursos no utilizados', () => {
      const readingWithExtraneousMaterials = {
        category: 'LECTURA EN VOZ ALTA',
        objective: 'Fortalecer la comprensión narrativa mediante la lectura dialogada del cuento infantil.',
        description:
          'Inicio: La Asistente invita a sentarse sobre las colchonetas limpias a ras de suelo y muestra el cuento.\nDesarrollo: Se exploran las páginas del cuento «¿Dónde está Spot?» de Eric Hill dialogando sobre los personajes.\nCierre: Despedir al personaje y colocar el libro en el canasto a ras de suelo.\nAdaptaciones: Modelado con señalamiento guiado.',
        // pelotas y bloques NO intervienen en esta lectura
        materials: ['cuentos ilustrados infantiles', 'pelotas medianas de vinil', 'bloques grandes de plástico lavable', 'colchonetas limpias'],
        durationMinutes: 15,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(readingWithExtraneousMaterials, table, 'MATERNAL_C1');

      expect(sanitized.materials).toContain('cuentos ilustrados infantiles');
      expect(sanitized.materials).toContain('colchonetas limpias');
      expect(sanitized.materials).not.toContain('pelotas medianas de vinil');
      expect(sanitized.materials).not.toContain('bloques grandes de plástico lavable');
    });

    // P1.2 — Evitar fragmentar materiales en elementos artificiales («instrumentos musicales infantiles seguros» / «como tambores»)
    it('P1.2: erradica «instrumentos musicales infantiles seguros» y «como tambores» sustituyéndolos por palmadas suaves y cantos acapela', () => {
      const actWithArtificialInstruments = {
        category: 'ACTIVACIÓN FÍSICA',
        objective: 'Acompañar el ritmo utilizando las cajas de cartón como tambores e instrumentos musicales infantiles seguros.',
        description:
          'Inicio: Disponer cajas de cartón limpias sobre colchonetas limpias a ras de suelo.\nDesarrollo: Los niños cantan tocando las cajas de cartón como tambores al compás de instrumentos musicales infantiles seguros.\nCierre: Guardar los instrumentos musicales y aplaudir serenamente.\nAdaptaciones: Adecuar el ritmo.',
        materials: ['cajas de cartón limpias', 'instrumentos musicales infantiles seguros', 'colchonetas limpias'],
        durationMinutes: 15,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(actWithArtificialInstruments, table, 'MATERNAL_C1');

      // Materials no debe contener instrumentos inventados
      expect(sanitized.materials).not.toContain('instrumentos musicales infantiles seguros');

      // Description y objective deben estar limpios de fragmentaciones artificiales
      expect(sanitized.description).not.toMatch(/\bcomo\s+tambor(?:es)?\b/);
      expect(sanitized.description).not.toContain('instrumentos musicales');
      expect(sanitized.description).toMatch(/\bpalmadas\s+suaves\b/);

      expect(sanitized.objective).not.toMatch(/\bcomo\s+tambor(?:es)?\b/);
      expect(sanitized.objective).not.toContain('instrumentos musicales');
    });

    // P1.3 — Mantener variaciones pedagógicas observables entre días, sin prohibir repeticiones útiles
    it('P1.3: preserva la lectura diaria del mismo cuento («¿Dónde está Spot?») con variaciones observables sin generar duplicados', () => {
      const weeklyPlanWithDailySpot = [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Estimular la anticipación lectora explorando la portada y los personajes del cuento.',
              description:
                'Inicio: Presentación de la portada del cuento «¿Dónde está Spot?» de Eric Hill.\nDesarrollo: La Asistente muestra la portada y formula preguntas abiertas de anticipación hojear las páginas.\nCierre: Cerrar el libro con afecto.\nAdaptaciones: Pausas respetuosas.',
              materials: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              durationMinutes: 15,
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Fortalecer la búsqueda activa y la predicción levantando solapas del cuento.',
              description:
                'Inicio: Reencuentro con Spot sobre colchonetas limpias.\nDesarrollo: Relectura interactiva invitando a descubrir quién está detrás de cada puerta levantando solapas y haciendo predicciones.\nCierre: Guardar en el canasto.\nAdaptaciones: Señalamiento guiado.',
              materials: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              durationMinutes: 15,
            },
          ],
        },
        {
          dayOfWeek: 'WEDNESDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Estimular la expresión verbal y las emociones imitando onomatopeyas de los personajes.',
              description:
                'Inicio: Abrir el cuento de Spot en círculo sobre colchonetas limpias.\nDesarrollo: Durante la lectura, imitar onomatopeyas y sonidos de animales dialogando sobre qué siente cada personaje.\nCierre: Despedida afectuosa de los personajes.\nAdaptaciones: Validar sonidos guturales.',
              materials: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              durationMinutes: 15,
            },
          ],
        },
        {
          dayOfWeek: 'THURSDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Favorecer la dramatización gestual y la corporalidad recreando escenas del cuento a ras de suelo.',
              description:
                'Inicio: Preparar la lectura dramatizada sobre colchonetas limpias.\nDesarrollo: Dramatización gestual actuando e imitando a los personajes buscando a Spot con sigilo y alegría a ras de suelo sin saltos.\nCierre: Retorno a la calma.\nAdaptaciones: Apoyo cercano.',
              materials: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              durationMinutes: 15,
            },
          ],
        },
        {
          dayOfWeek: 'FRIDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Consolidar el recuento narrativo y la reconstrucción secuencial de pasajes favoritos.',
              description:
                'Inicio: Ronda de cierre semanal con el cuento de Spot.\nDesarrollo: Recuento compartido y reconstrucción secuencial donde las niñas y niños eligen sus pasajes favoritos para releerlos juntos.\nCierre: Cerrar el libro con cariño, despedir a los personajes con un gesto de la mano y acomodarlo en el canasto a ras de suelo.\nAdaptaciones: Preguntas abiertas.',
              materials: ['cuentos ilustrados infantiles', 'colchonetas limpias'],
              durationMinutes: 15,
            },
          ],
        },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(weeklyPlanWithDailySpot, 'MATERNAL_C1');

      // Las 5 lecturas deben mantenerse como LECTURA EN VOZ ALTA con objetivos y dinámicas observables diferentes
      const objectives = enriched.map((d) => d.activities[0].objective);
      const uniqueObjectives = new Set(objectives);
      expect(uniqueObjectives.size).toBe(5);

      // Ninguna lectura debe haberse convertido en matemáticas o bloques
      for (const day of enriched) {
        const readAct = day.activities[0];
        expect(readAct.category).toBe('LECTURA EN VOZ ALTA');
        expect(readAct.objective).not.toContain('bloques');
        expect(readAct.objective).not.toContain('correspondencia uno a uno');
      }
    });
  });

  // =========================================================================
  // 11. VERIFICACIÓN TÉCNICA SR-MD-31I — CIERRE PEDAGÓGICO FOCALIZADO DE MATERNAL C1
  // =========================================================================
  describe('11. Verificación Técnica SR-MD-31I — Cierre Pedagógico Focalizado de Maternal C1', () => {
    const table = createRequestScopedMaterialTable(
      'bloques grandes de plástico lavable, cuentos infantiles de Spot, muñecos de tela, pelotas de vinil, aros plásticos grandes, colchonetas limpias, crayones gruesos de cera, cajas de cartón limpias, pliegos de papel bond, títeres de tela'
    );

    it('Item 1: Martes EXP-D2-A4 — El cierre y materiales de clasificación con bloques deben referirse a bloques, no a aros', () => {
      const tuesdayMathAct = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Favorecer la discriminación visual agrupando bloques grandes de plástico lavable por color notorio en cajas de cartón limpias.',
        description:
          'Inicio: La Asistente dispone bloques grandes de colores sobre colchonetas limpias.\nDesarrollo: Las niñas y niños exploran y agrupan los bloques por color evidente colocándolos en cajas de cartón limpias a ras de suelo.\nCierre: Admirar los aros clasificados y guardar los aros en su canasto con alegría.\nAdaptaciones: Ofrecer bloques duplicados.',
        durationMinutes: 20,
        materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias', 'aros plásticos grandes'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(tuesdayMathAct as any, table, 'MATERNAL_C1');

      // Materiales: no debe contener aros
      expect(sanitized.materials).not.toContain('aros plásticos grandes');
      expect(sanitized.materials).toContain('bloques grandes de plástico lavable');
      expect(sanitized.materials).toContain('cajas de cartón limpias');

      // Descripción / Cierre: debe referirse a bloques, nunca a aros
      expect(sanitized.description).not.toContain('aros clasificados');
      expect(sanitized.description).not.toContain('guardar los aros');
      expect(sanitized.description).toContain('bloques clasificados');
      expect(sanitized.description).toContain('guardar los bloques');

      // Enriquecimiento de progresión en Martes
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-11-02', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-11-03', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-11-04', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-11-05', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-11-06', activities: [{ ...tuesdayMathAct }] },
      ];
      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedTuesday = enriched[1].activities[0];
      expect(enrichedTuesday.materials).not.toContain('aros plásticos grandes');
      expect(enrichedTuesday.description).not.toMatch(/\baros\b/i);
      expect(enrichedTuesday.description).toMatch(/bloques/i);
    });

    it('Item 2: Miércoles EXP-D3-A2 — Eliminar "colores" duplicado en materiales cuando se utilizan crayones gruesos', () => {
      const wednesdayArtAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS' as const,
        objective: 'Estimular la expresión gráfico-plástica y el control visomotriz realizando trazos libres con crayones gruesos sobre papel a ras de suelo.',
        description:
          'Inicio: La Asistente extiende pliegos de papel bond sobre colchonetas limpias a ras de suelo y ofrece crayones gruesos de cera.\nDesarrollo: Las niñas y niños realizan trazos libres y garabateo con crayones gruesos de diversos colores sobre el papel bond.\nCierre: Admirar colectivamente los trazos extendidos sobre colchonetas limpias y guardar los crayones en su caja limpia.\nAdaptaciones: Disponer pliegos amplios y crayones gruesos en cantidad suficiente.',
        durationMinutes: 20,
        materials: ['crayones gruesos de cera', 'pliegos de papel bond', 'colores'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(wednesdayArtAct as any, table, 'MATERNAL_C1');

      // "colores" no debe aparecer como elemento independiente duplicado
      expect(sanitized.materials).not.toContain('colores');
      expect(sanitized.materials).toContain('crayones gruesos de cera');
      expect(sanitized.materials).toContain('pliegos de papel bond');

      // Enriquecimiento de progresión en Miércoles
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-11-02', activities: [{ ...wednesdayArtAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-11-03', activities: [{ ...wednesdayArtAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-11-04', activities: [{ ...wednesdayArtAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-11-05', activities: [{ ...wednesdayArtAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-11-06', activities: [{ ...wednesdayArtAct }] },
      ];
      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedWed = enriched[2].activities[0];
      expect(enrichedWed.materials).not.toContain('colores');
      expect(enrichedWed.materials).toContain('crayones gruesos de cera');
    });

    it('Item 3: Viernes EXP-D5-A4 — Formular objetivo observable de clasificación por atributos (color y forma), sin fórmulas genéricas de autonomía motriz', () => {
      const fridayMathAct = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Observar y consolidar la autonomía y coordinación en el juego estructurado con bloques grandes y cajas de cartón limpias a ras de suelo.',
        description:
          'Inicio: La Asistente dispone bloques grandes de diversas formas geométricas y colores sobre colchonetas limpias a ras de suelo.\nDesarrollo: En la sesión de consolidación semanal, la Asistente observa cómo las niñas y niños clasifican bloques agrupando por color y forma en cajas de cartón limpias.\nCierre: Admirar con alegría las figuras construidas o clasificadas y guardar los bloques en sus cajas de cartón limpias a ras de suelo.\nAdaptaciones: Acompañar con señalamiento guiado.',
        durationMinutes: 20,
        materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'],
      };

      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-11-02', activities: [{ ...fridayMathAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-11-03', activities: [{ ...fridayMathAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-11-04', activities: [{ ...fridayMathAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-11-05', activities: [{ ...fridayMathAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-11-06', activities: [{ ...fridayMathAct }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedFriday = enriched[4].activities[0];

      // El objetivo debe ser de clasificación cognitiva y reconocimiento de atributos
      expect(enrichedFriday.objective).toContain('clasificación por atributos');
      expect(enrichedFriday.objective).toContain('color y forma');
      expect(enrichedFriday.objective).not.toContain('autonomía y coordinación en el juego estructurado');
    });

    it('Item 4: Miércoles EXP-D3-A5 — La relación pedagógica excluye activación física y vincula correctamente con antecedente de juego simbólico del martes', () => {
      const tuesdayMotorAct = {
        category: 'ACTIVACIÓN FÍSICA' as const,
        objective: 'Afianzar la autonomía motriz mediante desplazamientos lúdicos sobre colchonetas limpias a ras de suelo.',
        description:
          'Inicio: Reunirse en colchonetas limpias.\nDesarrollo: Circuito de marcha con pasos cómodos a ras de suelo sobre colchonetas limpias.\nCierre: Respiración suave sobre colchoneta limpia.\nAdaptaciones: Apoyo cercano.',
        materials: ['colchonetas limpias'],
      };

      const tuesdaySymbolicAct = {
        category: 'AMBIENTES DE APRENDIZAJE' as const,
        objective: 'Desarrollar la empatía y la imitación de roles afectivos cuidando a los muñecos de tela.',
        description:
          'Inicio: Disponer muñecos de tela sobre colchonetas limpias.\nDesarrollo: Juego simbólico cuidando, arrullando y alimentando a los muñecos de tela con ternura.\nCierre: Acomodar a los muñecos en su canasta.\nAdaptaciones: Elementos duplicados.',
        materials: ['muñecos de tela', 'colchonetas limpias'],
      };

      const wednesdaySymbolicAct = {
        category: 'AMBIENTES DE APRENDIZAJE' as const,
        objective: 'Fortalecer el juego simbólico y la interacción afectiva recreando roles cotidianos con muñecos de tela.',
        description:
          'Inicio: Presentar muñecos de tela sobre colchonetas limpias.\nDesarrollo: Las niñas y niños dramatizan roles cotidianos y cuidado familiar con los muñecos de tela a ras de suelo.\nCierre: Guardar los muñecos con cariño en su canasta.\nAdaptaciones: Contención afectiva.',
        materials: ['muñecos de tela', 'colchonetas limpias'],
      };

      // 1. areActivitiesPedagogicallyRelated no debe vincular juego simbólico con activación física (a pesar de compartir colchonetas)
      const matchesMotor = areActivitiesPedagogicallyRelated(tuesdayMotorAct, wednesdaySymbolicAct);
      expect(matchesMotor).toBe(false);

      // 2. areActivitiesPedagogicallyRelated debe vincular juego simbólico del miércoles con juego simbólico del martes
      const matchesSymbolic = areActivitiesPedagogicallyRelated(tuesdaySymbolicAct, wednesdaySymbolicAct);
      expect(matchesSymbolic).toBe(true);

      // 3. Verificación de normalización de progreso en propuesta semanal completa
      const untrustedProposal = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            date: '2026-11-02',
            activities: [
              { ...tuesdayMotorAct, progression: { role: 'EXPLORE' } },
              { ...tuesdaySymbolicAct, progression: { role: 'EXPLORE' } },
            ],
          },
          {
            dayOfWeek: 'TUESDAY',
            date: '2026-11-03',
            activities: [
              { ...tuesdayMotorAct, progression: { role: 'REVISIT', revisitsSlot: 'D1_A1' } }, // EXP-D2-A1 (motor)
              { ...tuesdaySymbolicAct, progression: { role: 'REVISIT', revisitsSlot: 'D1_A2' } }, // EXP-D2-A2 (simbólico)
            ],
          },
          {
            dayOfWeek: 'WEDNESDAY',
            date: '2026-11-04',
            activities: [
              { ...tuesdayMotorAct, progression: { role: 'REVISIT', revisitsSlot: 'D2_A1' } },
              {
                ...wednesdaySymbolicAct,
                progression: {
                  role: 'VARY',
                  revisitsSlot: 'D2_A1', // Erróneamente apuntaba a motor del martes
                  variationDimensions: ['SENSORY_EXPERIENCE'],
                },
              },
            ],
          },
          {
            dayOfWeek: 'THURSDAY',
            date: '2026-11-05',
            activities: [
              { ...tuesdayMotorAct, progression: { role: 'VARY', revisitsSlot: 'D3_A1' } },
              { ...tuesdaySymbolicAct, progression: { role: 'VARY', revisitsSlot: 'D3_A2' } },
            ],
          },
          {
            dayOfWeek: 'FRIDAY',
            date: '2026-11-06',
            activities: [
              { ...tuesdayMotorAct, progression: { role: 'OBSERVE_OR_CONSOLIDATE', revisitsSlot: 'D4_A1' } },
              { ...tuesdaySymbolicAct, progression: { role: 'OBSERVE_OR_CONSOLIDATE', revisitsSlot: 'D4_A2' } },
            ],
          },
        ],
        weeklyFocus: 'Progresión semanal de Maternal C1',
      };

      const normalized = parseAndAllowlistUntrustedProposal(untrustedProposal, table, {
        requireProgression: true,
        roomType: 'MATERNAL_C1',
        minActivitiesPerDay: 2,
        maxActivitiesPerDay: 5,
        targetActivitiesPerDay: 2,
      });

      // La experiencia simbólica de miércoles (EXP-D3-A2) debe corregir su revisitsExperienceId apuntando a EXP-D2-A2 (simbólico), no EXP-D2-A1 (motor)
      const wedSymbolicExp = normalized.progression?.experiences.find((e) => e.experienceId === 'EXP-D3-A2');
      expect(wedSymbolicExp?.revisitsExperienceId).toBe('EXP-D2-A2');
    });

    it('Item 5: Coherencia estricta de materiales — Elimina materiales listados que no intervienen en las actividades', () => {
      const actWithGhostMaterials = {
        category: 'LECTURA EN VOZ ALTA' as const,
        objective: 'Fortalecer el lenguaje expresivo y la comprensión compartida con el cuento de Spot.',
        description:
          'Inicio: La Asistente muestra el cuento sobre colchonetas limpias.\nDesarrollo: Lectura interactiva de ¿Dónde está Spot? compartiendo solapas.\nCierre: Cerrar el libro con cariño y guardarlo en el canasto.\nAdaptaciones: Preguntas sencillas.',
        durationMinutes: 15,
        materials: ['cuentos infantiles de Spot', 'colchonetas limpias', 'bloques grandes de plástico lavable', 'pelotas de vinil'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(actWithGhostMaterials as any, table, 'MATERNAL_C1');

      // No deben figurar bloques ni pelotas en la lectura
      expect(sanitized.materials).not.toContain('bloques grandes de plástico lavable');
      expect(sanitized.materials).not.toContain('pelotas de vinil');
      expect(sanitized.materials).toContain('cuentos infantiles de Spot');
      expect(sanitized.materials).toContain('colchonetas limpias');
    });
  });

  // =========================================================================
  // 12. VERIFICACIÓN TÉCNICA SR-MD-31K — CORRECCIÓN FOCALIZADA DE COHERENCIA MATERNAL C1
  // =========================================================================
  describe('12. Verificación Técnica SR-MD-31K — Corrección Focalizada de Coherencia Maternal C1', () => {
    const table = createRequestScopedMaterialTable(
      'bloques grandes de plástico lavable, cuentos infantiles de Spot, muñecos de tela, pelotas de vinil, aros plásticos grandes, colchonetas limpias, crayones gruesos de cera, cajas de cartón limpias, pliegos de papel bond, telas limpias con texturas variadas, títeres de tela'
    );

    it('Defecto 1: Jueves EXP-D4-A5 — Coherencia estricta en actividad sensorial con telas (objetivo, Inicio, Desarrollo, Cierre, Adaptaciones y materiales)', () => {
      const tuesdaySensoryAct = {
        category: 'AMBIENTES DE APRENDIZAJE' as const,
        objective: 'Favorecer la exploración táctil reconociendo diferentes texturas de telas limpias sobre colchonetas limpias.',
        description:
          'Inicio: La Asistente invita a sentarse sobre colchonetas limpias a ras de suelo y presenta lienzos con texturas suaves y rugosas.\nDesarrollo: Las niñas y niños exploran con manos y pies descalzos las diferentes texturas de tela a ras de suelo.\nCierre: Doblar las telas y guardarlas en su caja limpia.\nAdaptaciones: Acompañamiento afectivo.',
        durationMinutes: 15,
        materials: ['telas limpias con texturas variadas', 'colchonetas limpias'],
      };

      const thursdaySensoryAct = {
        category: 'AMBIENTES DE APRENDIZAJE' as const,
        objective: 'Favorecer la discriminación sensorial visual y rítmica explorando contrastes de color con crayones gruesos y ritmos suaves sobre colchonetas limpias.',
        description:
          'Inicio: La Asistente Educativa invita a las niñas y niños a descubrir telas limpias con texturas variadas sobre colchonetas limpias a ras de suelo.\nDesarrollo: Durante la sesión del jueves, la Asistente propone explorar contrastes sensoriales visuales y auditivos, combinando trazos suaves y enérgicos con crayones gruesos de distintos colores sobre pliegos de papel bond a ras de suelo al compás de rimas y palmadas pausadas.\nCierre: Admirar los contrastes de colores logrados sobre las colchonetas limpias y guardar los crayones en su caja limpia a ras de suelo.\nAdaptaciones: Acompañar el ritmo con suavidad para quienes muestren mayor sensibilidad sonora y ofrecer crayones ergonómicos.',
        durationMinutes: 15,
        materials: ['telas limpias con texturas variadas', 'colchonetas limpias'],
      };

      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...tuesdaySensoryAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...tuesdaySensoryAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...tuesdaySensoryAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...thursdaySensoryAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...tuesdaySensoryAct }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedThursday = enriched[3].activities[0];

      // 1. Objetivo: habla de telas, movimiento y brisa; NUNCA de crayones ni ritmos de trazo
      expect(enrichedThursday.objective).toMatch(/telas?|lienzos?|brisa/i);
      expect(enrichedThursday.objective).not.toMatch(/cray[oó]n|trazos?|color(?:es)?\s+con\s+crayones/i);

      // 2. Inicio: describe telas y colchonetas; NUNCA crayones ni papel
      expect(enrichedThursday.description).toMatch(/Inicio:[\s\S]*?(?:telas|lienzos)/i);
      expect(enrichedThursday.description).not.toMatch(/Inicio:[\s\S]*?(?:cray[oó]n|papel\s+bond)/i);

      // 3. Desarrollo: describe ondear telas, brisa suave y caída lenta; NUNCA trazos con crayones ni palmadas
      expect(enrichedThursday.description).toMatch(/Desarrollo:[\s\S]*?(?:ondear|telas|brisa|caída)/i);
      expect(enrichedThursday.description).not.toMatch(/Desarrollo:[\s\S]*?(?:cray[oó]n|trazos?|palmadas?|papel\s+bond)/i);

      // 4. Cierre: doblar telas y guardar en caja limpia; NUNCA guardar crayones
      expect(enrichedThursday.description).toMatch(/Cierre:[\s\S]*?(?:telas|lienzos)/i);
      expect(enrichedThursday.description).not.toMatch(/Cierre:[\s\S]*?(?:cray[oó]n|colores\s+logrados)/i);

      // 5. Adaptaciones: acompañamiento con telas; NUNCA crayones ergonómicos ni sensibilidad sonora
      expect(enrichedThursday.description).toMatch(/Adaptaci[oó]n(?:es)?:[\s\S]*?(?:tela|movimiento)/i);
      expect(enrichedThursday.description).not.toMatch(/Adaptaci[oó]n(?:es)?:[\s\S]*?(?:crayones\s+ergon[oó]micos|sensibilidad\s+sonora)/i);

      // 6. Materiales: exclusivamente telas y colchonetas; NUNCA crayones, papel bond ni cajas adicionales
      expect(enrichedThursday.materials).toContain('telas limpias con texturas variadas');
      expect(enrichedThursday.materials).toContain('colchonetas limpias');
      expect(enrichedThursday.materials).not.toContain('crayones gruesos de cera');
      expect(enrichedThursday.materials).not.toContain('pliegos de papel bond');
      expect(enrichedThursday.materials).not.toContain('cajas de cartón limpias');
    });

    it('Defecto 2: Miércoles EXP-D3-A2 — Eliminar cajas de cartón adicionales en actividades de dibujo', () => {
      const wednesdayDrawingAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS' as const,
        objective: 'Estimular la expresión gráfico-plástica y el control visomotriz realizando trazos libres con crayones gruesos sobre papel a ras de suelo.',
        description:
          'Inicio: La Asistente extiende pliegos de papel bond sobre colchonetas limpias a ras de suelo y ofrece crayones gruesos.\nDesarrollo: Las niñas y niños exploran trazos libres con crayones gruesos sobre papel bond.\nCierre: Admirar los trazos y guardar los crayones en cajas de cartón limpias a ras de suelo.\nAdaptaciones: Ofrecer crayones ergonómicos.',
        durationMinutes: 20,
        materials: ['crayones gruesos de cera', 'pliegos de papel bond', 'cajas de cartón limpias', 'colchonetas limpias'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(wednesdayDrawingAct as any, table, 'MATERNAL_C1');

      // Las cajas de cartón no deben figurar en materials
      expect(sanitized.materials).not.toContain('cajas de cartón limpias');
      expect(sanitized.materials).toContain('crayones gruesos de cera');
      expect(sanitized.materials).toContain('pliegos de papel bond');
      expect(sanitized.materials).toContain('colchonetas limpias');

      // El cierre se normaliza a "su caja limpia"
      expect(sanitized.description).not.toContain('cajas de cartón limpias');
      expect(sanitized.description).toContain('su caja limpia');

      // Verificación en enrichMaternalB1WeeklyProgression para el miércoles
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...wednesdayDrawingAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...wednesdayDrawingAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...wednesdayDrawingAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...wednesdayDrawingAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...wednesdayDrawingAct }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedWed = enriched[2].activities[0];
      expect(enrichedWed.materials).not.toContain('cajas de cartón limpias');
      expect(enrichedWed.materials).toContain('crayones gruesos de cera');
      expect(enrichedWed.materials).toContain('pliegos de papel bond');
      expect(enrichedWed.description).not.toContain('en cajas de cartón limpias');
    });

    it('Defecto 3: Martes EXP-D2-A4 — Asegurar que colchonetas efectivamente utilizadas en el procedimiento aparezcan en materiales', () => {
      const tuesdayMathAct = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Observar y consolidar la discriminación perceptual agrupando bloques grandes de plástico lavable por color en cajas de cartón limpias.',
        description:
          'Inicio: La Asistente invita a las niñas y niños a reunirse sobre colchonetas limpias a ras de suelo y presenta bloques grandes.\nDesarrollo: Cada niña y niño clasifica y coloca bloques grandes dentro de cajas de cartón limpias.\nCierre: Admirar los bloques clasificados y guardarlos con alegría.\nAdaptaciones: Acompañamiento cercano.',
        durationMinutes: 20,
        materials: ['bloques grandes de plástico lavable', 'cajas de cartón limpias'], // Falta colchonetas limpias
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(tuesdayMathAct as any, table, 'MATERNAL_C1');
      expect(sanitized.materials).toContain('colchonetas limpias');
      expect(sanitized.materials).toContain('bloques grandes de plástico lavable');
      expect(sanitized.materials).toContain('cajas de cartón limpias');

      // Verificación en enrichMaternalB1WeeklyProgression
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...tuesdayMathAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...tuesdayMathAct }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedTuesday = enriched[1].activities[0];
      expect(enrichedTuesday.materials).toContain('colchonetas limpias');
    });

    it('Defecto 4: Coherencia de dibujo transversal y variación sensorial observable Martes vs Jueves', () => {
      const tuesdaySensory = {
        category: 'AMBIENTES DE APRENDIZAJE' as const,
        objective: 'Favorecer la discriminación táctil explorando texturas suaves y rugosas de telas limpias.',
        description:
          'Inicio: Sentarse sobre colchonetas limpias a ras de suelo.\nDesarrollo: Sentir con manos y pies descalzos la textura suave y rugosa de las telas limpias extendidas sobre colchonetas limpias.\nCierre: Doblar las telas con calma.\nAdaptaciones: Respeto al ritmo.',
        materials: ['telas limpias con texturas variadas', 'colchonetas limpias'],
      };

      const thursdaySensory = {
        category: 'AMBIENTES DE APRENDIZAJE' as const,
        objective: 'Favorecer la exploración sensorial con telas limpias sobre colchonetas limpias.',
        description:
          'Inicio: Sentarse sobre colchonetas limpias.\nDesarrollo: Sentir telas limpias sobre colchonetas limpias.\nCierre: Guardar telas.\nAdaptaciones: Apoyo cercano.',
        materials: ['telas limpias con texturas variadas', 'colchonetas limpias'],
      };

      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...tuesdaySensory }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...tuesdaySensory }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...tuesdaySensory }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...thursdaySensory }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...tuesdaySensory }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const tuesdayAct = enriched[1].activities[0];
      const thursdayAct = enriched[3].activities[0];

      // Martes: táctil estático
      expect(tuesdayAct.objective).toMatch(/t[aá]ctil|texturas/i);
      expect(tuesdayAct.description).toMatch(/manos\s+y\s+pies|textura/i);

      // Jueves: dinámico (ondear, brisa suave, caída)
      expect(thursdayAct.objective).toMatch(/din[aá]mica|movimiento|brisa|ca[ií]da/i);
      expect(thursdayAct.description).toMatch(/ondear|brisa\s+suave|ca[ií]da\s+suave/i);

      // Ambos describen telas y colchonetas sin crayones parásitos
      expect(tuesdayAct.materials).toContain('telas limpias con texturas variadas');
      expect(tuesdayAct.materials).toContain('colchonetas limpias');
      expect(thursdayAct.materials).toContain('telas limpias con texturas variadas');
      expect(thursdayAct.materials).toContain('colchonetas limpias');
      expect(thursdayAct.materials).not.toContain('crayones gruesos de cera');
      expect(thursdayAct.materials).not.toContain('pliegos de papel bond');

      // Existe variación pedagógica observable entre ambos días
      expect(thursdayAct.description).not.toEqual(tuesdayAct.description);
      expect(thursdayAct.objective).not.toEqual(tuesdayAct.objective);
    });

    it('SR-MD-31L: Preserva cajas de cartón en experiencias artísticas cuando participan activamente como medio o soporte', () => {
      const activeBoxesArtAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS' as const,
        objective: 'Estimular la expresión plástico-creativa y la tridimensionalidad decorando cajas de cartón limpias a ras de suelo.',
        description:
          'Inicio: La Asistente dispone cajas de cartón limpias sobre colchonetas limpias y ofrece crayones gruesos de cera.\nDesarrollo: Cada niña y niño decora las caras exteriores de las cajas de cartón limpias con trazos libres y colores.\nCierre: Admirar las esculturas decoradas y acomodarlas en su espacio de exhibición.\nAdaptaciones: Acompañar el trazo sobre el cartón.',
        durationMinutes: 20,
        materials: ['cajas de cartón limpias', 'crayones gruesos de cera', 'colchonetas limpias'],
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(activeBoxesArtAct as any, table, 'MATERNAL_C1');

      // Las cajas de cartón SÍ participan activamente, por lo que se deben conservar
      expect(sanitized.materials).toContain('cajas de cartón limpias');
      expect(sanitized.materials).toContain('crayones gruesos de cera');
      expect(sanitized.materials).toContain('colchonetas limpias');
    });
  });

  // =========================================================================
  // 13. VERIFICACIÓN TÉCNICA SR-MD-31M — CIERRE FOCALIZADO DE MATERNAL C1
  // =========================================================================
  describe('13. Verificación Técnica SR-MD-31M — Cierre Focalizado de Maternal C1', () => {
    const table = createRequestScopedMaterialTable(
      'bloques grandes de plástico lavable, cuentos infantiles de Spot, muñecos de tela, pelotas de vinil, pelotas medianas de vinil, aros plásticos grandes, colchonetas limpias, crayones gruesos de cera, cajas de cartón limpias, pliegos de papel bond, recipientes limpios, telas limpias con texturas variadas, títeres de tela'
    );

    it('Defecto 1: EXP-D3-A4 — Elimina cajas de cartón si no participan en seriación y conserva recipientes utilizados', () => {
      const seriationAct = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Favorecer el pensamiento lógico y las relaciones de orden mediante seriación simple de 3 tamaños en recipientes limpios.',
        description:
          'Inicio: La Asistente coloca recipientes limpios sobre colchonetas limpias y ofrece bloques de 3 tamaños.\nDesarrollo: Cada niña y niño ordena bloques por tamaño (grande, mediano, pequeño) colocándolos en sus recipientes limpios.\nCierre: Admirar el orden de los recipientes y guardar con cuidado.\nAdaptaciones: Modelar la seriación.',
        materials: ['bloques grandes de plástico lavable', 'recipientes limpios', 'cajas de cartón limpias', 'colchonetas limpias'],
        durationMinutes: 20,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(seriationAct as any, table, 'MATERNAL_C1');
      expect(sanitized.materials).not.toContain('cajas de cartón limpias');
      expect(sanitized.materials).toContain('recipientes limpios');
      expect(sanitized.materials).toContain('bloques grandes de plástico lavable');
      expect(sanitized.materials).toContain('colchonetas limpias');

      // Verificación en enrichMaternalB1WeeklyProgression para Miércoles
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...seriationAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...seriationAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...seriationAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...seriationAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...seriationAct }] },
      ];
      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedWed = enriched[2].activities[0];
      expect(enrichedWed.materials).not.toContain('cajas de cartón limpias');
      expect(enrichedWed.materials).toContain('recipientes limpios');
    });

    it('Defecto 2: EXP-D4-A3 — Corrige objetivo incompleto «sobre limpias» describiendo desplazamientos voluntarios, seguros y a ras de suelo', () => {
      const truncatedThursdayAct = {
        category: 'ACTIVACIÓN FÍSICA' as const,
        objective: 'Promover la coordinación motriz y la autonomía corporal mediante desplazamientos sobre limpias.',
        description:
          'Inicio: Sentados en colchonetas.\nDesarrollo: Desplazamientos lúdicos sobre limpias a su propio paso.\nCierre: Respiración suave sobre colchonetas limpias.\nAdaptaciones: Acompañar.',
        materials: ['colchonetas limpias'],
        durationMinutes: 20,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(truncatedThursdayAct as any, table, 'MATERNAL_C1');
      expect(sanitized.objective).not.toContain('sobre limpias');
      expect(sanitized.objective).toContain('desplazamientos voluntarios, seguros y a ras de suelo sobre colchonetas limpias');
      expect(sanitized.description).not.toContain('sobre limpias');
      expect(sanitized.description).toContain('a ras de suelo sobre colchonetas limpias');

      // Verificación en enrichMaternalB1WeeklyProgression para Jueves
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...truncatedThursdayAct }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...truncatedThursdayAct }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...truncatedThursdayAct }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...truncatedThursdayAct }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...truncatedThursdayAct }] },
      ];
      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const enrichedThu = enriched[3].activities[0];
      expect(enrichedThu.objective).not.toContain('sobre limpias');
      expect(enrichedThu.objective).toContain('desplazamientos voluntarios, seguros y a ras de suelo sobre colchonetas limpias');
    });

    it('Defecto 3: EXP-D5-A2 — Precisa cómo se conforma el mural colectivo con los dibujos existentes con materiales efectivamente disponibles', () => {
      const fridayMuralRaw = {
        category: 'EXPERIENCIAS ARTÍSTICAS' as const,
        objective: 'Mural colectivo.',
        description:
          'Inicio: Pliegos.\nDesarrollo: Dibujar mural.\nCierre: Admirar.\nAdaptaciones: Apoyo.',
        materials: ['pliegos de papel bond', 'crayones gruesos de cera', 'pegamento', 'cinta adhesiva', 'cajas de cartón limpias'],
        durationMinutes: 20,
      };

      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...fridayMuralRaw }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const fridayArt = enriched[4].activities[0];

      // Describe cómo se conforma el mural colectivo con dibujos existentes
      expect(fridayArt.description).toMatch(/reunir\s+y\s+extender(?:\s+sobre\s+ellas)?\s+sus\s+producciones\s+y\s+dibujos\s+elaborados\s+durante\s+la\s+semana/i);
      expect(fridayArt.description).toMatch(/colocar\s+juntos\s+sus\s+dibujos\s+elaborados\s+durante\s+la\s+semana\s+a\s+ras\s+de\s+suelo\s+sobre\s+colchonetas\s+limpias/i);
      expect(fridayArt.description).toMatch(/sin\s+requerir\s+pegamento\s+ni\s+(?:elementos\s+de\s+)?fijaci[oó]n/i);

      // Materiales estrictamente autorizados y disponibles
      expect(fridayArt.materials).toContain('crayones gruesos de cera');
      expect(fridayArt.materials).toContain('colchonetas limpias');
      expect(fridayArt.materials.some((m) => /papel|dibujos\s+existentes/i.test(m))).toBe(true);
      expect(fridayArt.materials).not.toContain('pegamento');
      expect(fridayArt.materials).not.toContain('cinta adhesiva');
      expect(fridayArt.materials).not.toContain('cajas de cartón limpias');
    });

    it('Defecto 4: EXP-D5-A3 — Convierte el circuito en una experiencia concreta describiendo recorrido y acciones sin obstáculos', () => {
      const fridayCircuitRaw = {
        category: 'ACTIVACIÓN FÍSICA' as const,
        objective: 'Circuito sereno.',
        description:
          'Inicio: Colchonetas.\nDesarrollo: Caminar en circuito.\nCierre: Descanso.\nAdaptaciones: Ayudar.',
        materials: ['colchonetas limpias', 'conos plásticos', 'cajas de cartón limpias', 'obstáculos'],
        durationMinutes: 20,
      };

      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...fridayCircuitRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...fridayCircuitRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...fridayCircuitRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...fridayCircuitRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...fridayCircuitRaw }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const fridayMotor = enriched[4].activities[0];

      // Describe recorrido concreto y acciones motrices sin obstáculos
      expect(fridayMotor.objective).toContain('recorrido continuo y sereno sobre colchonetas limpias dispuestas a ras de suelo');
      expect(fridayMotor.description).toMatch(/camino\s+continuo\s+a\s+ras\s+de\s+suelo/i);
      expect(fridayMotor.description).toMatch(/avanzan\s+caminando\s+a\s+paso\s+firme/i);
      expect(fridayMotor.description).toMatch(/giro\s+amplio/i);
      expect(fridayMotor.description).toMatch(/brazos\s+abiertos\s+para\s+mantener\s+la\s+estabilidad/i);
      expect(fridayMotor.description).toMatch(/tocar\s+la\s+colchoneta\s+con\s+las\s+palmas/i);
      expect(fridayMotor.description).toMatch(/sin\s+obst[aá]culos\s+ni\s+desniveles/i);

      // Materiales: únicamente colchonetas limpias
      expect(fridayMotor.materials).toEqual(['colchonetas limpias']);
    });

    it('Defecto 5: EXP-D5-A5 — Elimina la referencia al canasto cuando no se declara en inventario ni materiales', () => {
      const dollsFridayRaw = {
        category: 'LENGUAJE CONVERSACIONAL Y JUEGO SIMBÓLICO' as const,
        objective: 'Juego simbólico con muñecos.',
        description:
          'Inicio: Sentados en círculo con los muñecos.\nDesarrollo: Compartir merienda imaginaria.\nCierre: Despedir la ronda de juego abrazando a los muñecos y guardándolos en el canasto de la sala.\nAdaptaciones: Apoyo cercano.',
        materials: ['muñecos de tela', 'colchonetas limpias'],
        durationMinutes: 20,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(dollsFridayRaw as any, table, 'MATERNAL_C1');
      expect(sanitized.description).not.toContain('canasto');
      expect(sanitized.materials).not.toContain('canasto');
      expect(sanitized.description).toContain('colchoneta limpia');

      // Verificación en enrichMaternalB1WeeklyProgression para Viernes
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...dollsFridayRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...dollsFridayRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...dollsFridayRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...dollsFridayRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...dollsFridayRaw }] },
      ];
      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const fridayDolls = enriched[4].activities[0];
      expect(fridayDolls.description).not.toContain('canasto');
      expect(fridayDolls.materials).not.toContain('canasto');
    });

    it('Revisión adicional: EXP-D3-A3 — Expresa un objetivo de aprendizaje motriz y no solamente una instrucción de lanzar y atrapar', () => {
      const rawBallInstruction = {
        category: 'ACTIVACIÓN FÍSICA' as const,
        objective: 'Lanzar y atrapar pelotas en parejas.',
        description:
          'Inicio: Sentarse en colchonetas.\nDesarrollo: Lanzar y atrapar la pelota entre parejas.\nCierre: Guardar pelotas.\nAdaptaciones: Acompañar.',
        materials: ['pelotas medianas de vinil', 'colchonetas limpias'],
        durationMinutes: 20,
      };

      const sanitized = sanitizeMaternalB1PedagogicalFidelity(rawBallInstruction as any, table, 'MATERNAL_C1');
      expect(sanitized.objective).not.toEqual('Lanzar y atrapar pelotas en parejas.');
      expect(sanitized.objective).toMatch(/Favorecer\s+la\s+coordinaci[oó]n\s+[oó]culo-manual,\s+el\s+control\s+postural/i);

      // Verificación en enrichMaternalB1WeeklyProgression para Miércoles
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...rawBallInstruction }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...rawBallInstruction }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...rawBallInstruction }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...rawBallInstruction }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...rawBallInstruction }] },
      ];
      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const wednesdayBall = enriched[2].activities[0];
      expect(wednesdayBall.objective).toMatch(/Favorecer\s+la\s+coordinaci[oó]n\s+[oó]culo-manual,\s+el\s+control\s+postural/i);
    });
  });

  // =========================================================================
  // 14. VERIFICACIÓN TÉCNICA SR-MD-31O — CORRECCIÓN FINAL FOCALIZADA DE MATERNAL C1
  // =========================================================================
  describe('14. Verificación Técnica SR-MD-31O — Corrección Final Focalizada de Maternal C1', () => {
    // Inventario real de Maternal C1 (sin títeres ni utensilios plásticos)
    const table = createRequestScopedMaterialTable(
      'bloques grandes de plástico lavable, cuentos infantiles de Spot con solapas, muñecos de tela, pelotas medianas de vinil, aros plásticos grandes, colchonetas limpias, crayones gruesos de cera, cajas de cartón limpias, pliegos de papel bond, recipientes plásticos amplios, telas limpias con texturas variadas'
    );

    it('Defecto 1: EXP-D3-A5 (miércoles) — Adapta títeres ausentes en inventario a muñecos de tela lavables con coherencia total', () => {
      const puppetWednesdayRaw = {
        category: 'LENGUAJE CONVERSACIONAL Y JUEGO SIMBÓLICO' as const,
        objective: 'Favorecer el lenguaje comprensivo y la empatía mediante interacción con títeres o guiñoles respondiendo a preguntas causales.',
        description:
          'Inicio: Disponer títeres para las niñas y niños.\nDesarrollo: La Asistente da vida a los títeres y hace preguntas de por qué.\nCierre: Guardar los títeres en su caja.\nAdaptaciones: Apoyo a lenguaje emergente.',
        materials: ['títeres de tela', 'colchonetas limpias'],
        durationMinutes: 20,
      };

      // 1. Sanitización focalizada de fidelidad pedagógica
      const sanitized = sanitizeMaternalB1PedagogicalFidelity(puppetWednesdayRaw as any, table, 'MATERNAL_C1');
      expect(sanitized.materials).not.toContain('títeres de tela');
      expect(sanitized.materials).toContain('muñecos de tela');
      expect(sanitized.description).not.toMatch(/\bt[ií]teres?\b/i);
      expect(sanitized.objective).not.toMatch(/\bt[ií]teres?\b/i);
      expect(sanitized.description).toContain('muñecos de tela');

      // 2. Progresión semanal de Miércoles con unidad pedagógica completa
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...puppetWednesdayRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...puppetWednesdayRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...puppetWednesdayRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...puppetWednesdayRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...puppetWednesdayRaw }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const wedAct = enriched[2].activities[0];

      // Objetivo
      expect(wedAct.objective).toContain('muñecos de tela lavables');
      expect(wedAct.objective).not.toMatch(/\bt[ií]teres?\b/i);

      // Inicio, Desarrollo, Cierre, Adaptaciones
      expect(wedAct.description).toMatch(/Inicio:\s*Disponer\s+colchonetas\s+limpias.*muñecos\s+de\s+tela\s+lavables/i);
      expect(wedAct.description).toMatch(/Desarrollo:\s*La\s+Asistente\s+da\s+vida\s+a\s+los\s+muñecos\s+de\s+tela\s+lavables/i);
      expect(wedAct.description).toMatch(/Cierre:\s*Despedir\s+la\s+narraci[oó]n\s+abrazando\s+a\s+los\s+muñecos\s+de\s+tela/i);
      expect(wedAct.description).toMatch(/Adaptaciones:\s*Formular\s+preguntas\s+con\s+opciones\s+sencillas/i);

      // Materiales
      expect(wedAct.materials).toContain('muñecos de tela');
      expect(wedAct.materials).toContain('colchonetas limpias');
      expect(wedAct.materials).not.toContain('títeres de tela');
      expect(wedAct.materials).not.toContain('títeres');
    });

    it('Defecto 2: EXP-D4-A5 (jueves) — Elimina utensilios plásticos inventados y mantiene juego simbólico con recursos declarados', () => {
      const feedingThursdayRaw = {
        category: 'LENGUAJE CONVERSACIONAL Y JUEGO SIMBÓLICO' as const,
        objective: 'Promover el juego simbólico usando cajas limpias y utensilios plásticos para alimentar a los muñecos.',
        description:
          'Inicio: La Asistente dispone muñecos y utensilios plásticos.\nDesarrollo: Dramatizar preparar comida usando vajilla y utensilios plásticos para dar de comer a los muñecos.\nCierre: Guardar utensilios y muñecos.\nAdaptaciones: Apoyo cercano.',
        materials: ['muñecos de tela', 'utensilios plásticos', 'colchonetas limpias'],
        durationMinutes: 20,
      };

      // 1. Sanitización de fidelidad
      const sanitized = sanitizeMaternalB1PedagogicalFidelity(feedingThursdayRaw as any, table, 'MATERNAL_C1');
      expect(sanitized.materials).not.toContain('utensilios plásticos');
      expect(sanitized.materials).toContain('muñecos de tela');
      expect(sanitized.description).not.toMatch(/utensilios\s+pl[aá]sticos/i);
      expect(sanitized.objective).not.toMatch(/utensilios\s+pl[aá]sticos/i);
      expect(sanitized.description).toContain('mímica afectuosa y gestos cariñosos de las manos');

      // 2. Progresión semanal de Jueves
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...feedingThursdayRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...feedingThursdayRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...feedingThursdayRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...feedingThursdayRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...feedingThursdayRaw }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const thuAct = enriched[3].activities[0];

      // Objetivo
      expect(thuAct.objective).toContain('cuidado de muñecos de tela con gestos cariñosos sobre colchonetas limpias');
      expect(thuAct.objective).not.toMatch(/utensilios/i);

      // Descripción
      expect(thuAct.description).toMatch(/Inicio:\s*La\s+Asistente\s+invita\s+al\s+grupo.*muñecos\s+de\s+tela.*expresar\s+cariño\s+y\s+cuidado\s+con\s+las\s+manos/i);
      expect(thuAct.description).toMatch(/Desarrollo:.*m[ií]mica\s+afectuosa\s+y\s+suaves\s+caricias\s+de\s+las\s+manos/i);
      expect(thuAct.description).toMatch(/Cierre:\s*Arropar\s+suavemente\s+a\s+los\s+muñecos\s+de\s+tela/i);
      expect(thuAct.description).not.toMatch(/\butensilios\s+pl[aá]sticos\b/i);

      // Materiales
      expect(thuAct.materials).toEqual(['muñecos de tela', 'colchonetas limpias']);
      expect(thuAct.materials).not.toContain('utensilios plásticos');
    });

    it('Defecto 3: EXP-D5-A2 (viernes) — Elimina referencia a guardar crayones en una caja en el cierre del mural colectivo', () => {
      const fridayMuralRaw = {
        category: 'EXPERIENCIAS ARTÍSTICAS' as const,
        objective: 'Observar la libre expresión gráfico-plástica y consolidar la convivencia grupal conformando un mural colectivo con los dibujos existentes a ras de suelo sobre colchonetas limpias.',
        description:
          'Inicio: Disponer las colchonetas limpias a ras de suelo e invitar a reunir dibujos.\nDesarrollo: Colocar juntos los dibujos sobre colchonetas limpias conformando un mural colectivo agregando trazos compartidos con crayones gruesos.\nCierre: Admirar colectivamente el mural y los trazos compartidos sobre colchonetas limpias y guardar los crayones en su caja limpia.\nAdaptaciones: Apoyo para acomodar hojas contiguas.',
        materials: ['pliegos de papel bond con dibujos existentes', 'crayones gruesos de cera', 'colchonetas limpias'],
        durationMinutes: 20,
      };

      // 1. Sanitización de fidelidad
      const sanitized = sanitizeMaternalB1PedagogicalFidelity(fridayMuralRaw as any, table, 'MATERNAL_C1');
      expect(sanitized.description).not.toMatch(/en\s+su\s+caja\s+limpia/i);
      expect(sanitized.description).not.toMatch(/en\s+cajas?\b/i);
      expect(sanitized.description).toContain('reuniendo con cuidado los crayones sobre la colchoneta limpia');
      expect(sanitized.materials).not.toContain('cajas de cartón limpias');
      expect(sanitized.materials).not.toContain('cajas limpias');

      // 2. Progresión semanal de Viernes
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...fridayMuralRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...fridayMuralRaw }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const friArt = enriched[4].activities[0];

      expect(friArt.description).not.toMatch(/en\s+su\s+caja\s+limpia/i);
      expect(friArt.description).not.toMatch(/en\s+cajas?\b/i);
      expect(friArt.description).toContain('reuniendo con cuidado los crayones sobre la colchoneta limpia');
      expect(friArt.materials).toContain('pliegos de papel bond con dibujos existentes');
      expect(friArt.materials).toContain('crayones gruesos de cera');
      expect(friArt.materials).toContain('colchonetas limpias');
      expect(friArt.materials).not.toContain('cajas de cartón limpias');
      expect(friArt.materials).not.toContain('cajas limpias');
    });

    it('Defecto 4: EXP-D5-A4 (viernes) — Unifica objetivo y desarrollo para utilizar recipientes plásticos amplios, no cajas, y erradica «colores» como material independiente', () => {
      const fridayMathRaw = {
        category: 'PENSAMIENTO MATEMÁTICO' as const,
        objective: 'Observar y consolidar la discriminación perceptual y la clasificación por atributos reconociendo color y forma al agrupar bloques grandes en cajas limpias.',
        description:
          'Inicio: Se colocan bloques grandes de diferentes colores y formas sobre colchonetas limpias.\nDesarrollo: En la sesión de consolidación, las niñas y niños clasifican por color y forma colocando los bloques en cajas de cartón limpias.\nCierre: Admirar con alegría las figuras construidas o clasificadas y guardar los bloques en sus cajas de cartón limpias a ras de suelo.\nAdaptaciones: Modelar la agrupación.',
        materials: ['bloques grandes de plástico lavable', 'colores', 'cajas de cartón limpias', 'colchonetas limpias'],
        durationMinutes: 20,
      };

      // 1. Sanitización de fidelidad pedagógica
      const sanitized = sanitizeMaternalB1PedagogicalFidelity(fridayMathRaw as any, table, 'MATERNAL_C1');
      expect(sanitized.materials).not.toContain('colores');
      expect(sanitized.materials).toContain('bloques grandes de plástico lavable');
      expect(sanitized.materials).toContain('recipientes plásticos amplios');

      // 2. Progresión semanal de Viernes
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...fridayMathRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...fridayMathRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...fridayMathRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...fridayMathRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...fridayMathRaw }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const friMath = enriched[4].activities[0];

      // Objetivo unificado con recipientes plásticos amplios
      expect(friMath.objective).toContain('recipientes plásticos amplios');
      expect(friMath.objective).not.toMatch(/\bcajas?\s+limpias?\b/i);
      expect(friMath.objective).not.toMatch(/\bcajas?\s+de\s+cart[oó]n\b/i);

      // Desarrollo unificado con recipientes plásticos amplios
      expect(friMath.description).toContain('recipientes plásticos amplios');
      expect(friMath.description).not.toMatch(/\ben\s+(?:sus\s+)?cajas?(?:\s+de\s+cart[oó]n)?(?:\s+limpias?)?\b/i);

      // Cierre adaptado a recipientes plásticos amplios
      expect(friMath.description).toMatch(/recipientes\s+pl[aá]sticos\s+amplios\s+a\s+ras\s+de\s+suelo/i);

      // Materiales: bloques, recipientes plásticos amplios, colchonetas; CERO cajas y CERO «colores»
      expect(friMath.materials).toContain('bloques grandes de plástico lavable');
      expect(friMath.materials).toContain('recipientes plásticos amplios');
      expect(friMath.materials).toContain('colchonetas limpias');
      expect(friMath.materials).not.toContain('cajas de cartón limpias');
      expect(friMath.materials).not.toContain('cajas limpias');
      expect(friMath.materials).not.toContain('colores');
    });

    it('Mejora menor: EXP-D1-A3 (lunes) — Sustituye la expresión «como un canguro» por una instrucción motriz natural y segura', () => {
      const mondayMotorRaw = {
        category: 'ACTIVACIÓN FÍSICA' as const,
        objective: 'Favorecer el desplazamiento y la coordinación motriz caminando como un canguro sobre colchonetas limpias.',
        description:
          'Inicio: La Asistente dispone colchonetas limpias alineadas.\nDesarrollo: Invitar a las niñas y niños a saltar como un canguro y avanzar como canguros sobre las colchonetas limpias con pasos amplios.\nCierre: Sentarse en círculo y relajarse.\nAdaptaciones: Acompañar de la mano si es necesario.',
        materials: ['colchonetas limpias'],
        durationMinutes: 20,
      };

      // 1. Sanitización de fidelidad pedagógica
      const sanitized = sanitizeMaternalB1PedagogicalFidelity(mondayMotorRaw as any, table, 'MATERNAL_C1');
      expect(sanitized.objective).not.toContain('canguro');
      expect(sanitized.description).not.toContain('canguro');
      expect(sanitized.description).toContain('caminar con pasos amplios, firmes y seguros a ras de suelo sobre colchonetas limpias');
      expect(sanitized.objective).toContain('desplazamientos con pasos amplios, firmes y seguros a ras de suelo sobre colchonetas limpias');

      // 2. Progresión semanal de Lunes
      const rawDays = [
        { dayOfWeek: 'MONDAY', date: '2026-08-24', activities: [{ ...mondayMotorRaw }] },
        { dayOfWeek: 'TUESDAY', date: '2026-08-25', activities: [{ ...mondayMotorRaw }] },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-26', activities: [{ ...mondayMotorRaw }] },
        { dayOfWeek: 'THURSDAY', date: '2026-08-27', activities: [{ ...mondayMotorRaw }] },
        { dayOfWeek: 'FRIDAY', date: '2026-08-28', activities: [{ ...mondayMotorRaw }] },
      ];

      const enriched = enrichMaternalB1WeeklyProgression(rawDays as any, 'MATERNAL_C1');
      const monMotor = enriched[0].activities[0];

      expect(monMotor.objective).not.toContain('canguro');
      expect(monMotor.description).not.toContain('canguro');
      expect(monMotor.description).toContain('caminar con pasos amplios, firmes y seguros a ras de suelo sobre colchonetas limpias');
    });
  });
});


