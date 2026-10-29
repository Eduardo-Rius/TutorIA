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
});
