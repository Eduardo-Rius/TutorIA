import { describe, it, expect, vi } from 'vitest';
import {
  PedagogicalAgePolicyCatalog,
  PedagogicalSafetyValidator,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_B_SAFETY_RULES,
  LACTANTES_B_DEVELOPMENTAL_RULE,
  LACTANTES_B_MATERIAL_POLICY,
  LACTANTES_B_DENSITY_POLICY,
  PedagogicalWeeklyPlanCandidate,
} from '../PedagogicalAgePolicy';
import { RoomCatalog, Room } from '../RoomCatalog';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  UnsupportedPedagogicalPolicyError,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';
import { WeeklyPlanningProposalRequest } from '../../../application/planning/WeeklyPlanningProposalSource';

describe('ORDEN SR-MD-14-H — FASE 1: Política Pedagógica Lactantes B (7–12 meses)', () => {
  const sampleAvailableMaterials =
    'Colchonetas, sonajas de diferentes formas, pelotas suaves, cubos medianos de vinil, toallas desechables.';

  const sampleLactantesBRoom: Room = Object.freeze({
    roomId: 'room-lactantes-b',
    name: 'Lactantes B',
    minAgeMonths: 7,
    maxAgeMonths: 12,
  });

  const createSafeTwoActivityPlan = (): PedagogicalWeeklyPlanCandidate => ({
    days: [
      {
        dayOfWeek: 'MONDAY',
        activities: [
          {
            objective: 'Exploración sonora mediante sonajas sobre colchoneta',
            description: 'El lactante manipula libremente las sonajas en posición sedente asistida.',
            durationMinutes: 15,
            materials: ['sonajas de diferentes formas', 'colchonetas'],
          },
          {
            objective: 'Estimulación del desplazamiento motriz libre',
            description: 'Colocar pelotas suaves sobre la colchoneta para motivar el gateo espontáneo según posibilidades.',
            durationMinutes: 15,
            materials: ['pelotas suaves', 'colchonetas'],
          },
        ],
      },
      {
        dayOfWeek: 'TUESDAY',
        activities: [
          {
            objective: 'Manipulación bimanual con cubos de vinil',
            description: 'Apilar y derribar cubos de vinil sobre colchoneta.',
            durationMinutes: 15,
            materials: ['cubos medianos de vinil', 'colchonetas'],
          },
          {
            objective: 'Juego vocal y balbuceo imitativo',
            description: 'Conversar con el lactante promoviendo la gesticulación y balbuceos afectivos.',
            durationMinutes: 10,
            materials: ['colchonetas'],
          },
        ],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        activities: [
          {
            objective: 'Exploración táctil y prensión',
            description: 'Ofrecer pelotas suaves y sonajas para ejercitar la transferencia de objetos mano a mano.',
            durationMinutes: 15,
            materials: ['pelotas suaves', 'sonajas de diferentes formas'],
          },
          {
            objective: 'Rutina higiénica y aseo facial asistido',
            description: 'Limpiar delicadamente el rostro del lactante con toalla desechable.',
            durationMinutes: 10,
            materials: ['toallas desechables'],
          },
        ],
      },
      {
        dayOfWeek: 'THURSDAY',
        activities: [
          {
            objective: 'Desplazamiento y gateo hacia estímulos',
            description: 'Llamar la atención del lactante con una sonaja sobre la colchoneta para desplazamiento libre.',
            durationMinutes: 15,
            materials: ['sonajas de diferentes formas', 'colchonetas'],
          },
          {
            objective: 'Guardado ordenado de juguetes con mediación',
            description: 'Invitar al lactante a colocar cubos de vinil en su contenedor sobre la colchoneta.',
            durationMinutes: 15,
            materials: ['cubos medianos de vinil', 'colchonetas'],
          },
        ],
      },
      {
        dayOfWeek: 'FRIDAY',
        activities: [
          {
            objective: 'Juego motriz y giros sobre colchoneta',
            description: 'Promover el rodamiento y cambio de postura libre respetando el ritmo individual.',
            durationMinutes: 15,
            materials: ['colchonetas'],
          },
          {
            objective: 'Interacción comunicativa y reforzamiento afectivo',
            description: 'Cantar nanas suaves manteniendo contacto visual cálido.',
            durationMinutes: 10,
            materials: ['colchonetas'],
          },
        ],
      },
    ],
  });

  // =========================================================================
  // 1. RESOLUCIÓN DE LACTANTES B EN EL CATÁLOGO DE POLÍTICAS
  // =========================================================================
  describe('1. Resolución determinista de Lactantes B', () => {
    it('resuelve LACTANTES_B_AGE_POLICY para el rango 7 a 12 meses', () => {
      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 7,
        maxAgeMonths: 12,
        name: 'Lactantes B',
      });

      expect(policy).toBeDefined();
      expect(policy?.roomType).toBe('LACTANTES_B');
      expect(policy?.label).toContain('Lactantes B (7 a 12 meses)');
      expect(policy?.minAgeMonths).toBe(7);
      expect(policy?.maxAgeMonths).toBe(12);
      expect(policy?.recommendedMaxDurationMinutes).toBe(20);
      expect(policy?.provenance).toBe('CANONICAL_PRODUCT_RULE');
    });

    it('resuelve LACTANTES_B_AGE_POLICY por identificador de roomType', () => {
      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoomType('LACTANTES_B');
      expect(policy).toBe(LACTANTES_B_AGE_POLICY);
    });

    it('resuelve LACTANTES_B_AGE_POLICY por nombre de sala cuando coincide', () => {
      const policyByName = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 8,
        maxAgeMonths: 11,
        name: 'Sala Lactantes B Matutina',
      });
      expect(policyByName).toBe(LACTANTES_B_AGE_POLICY);
    });

    it('el catálogo contiene exactamente las políticas autorizadas de Lactantes A, Lactantes B y Lactantes C', () => {
      const allPolicies = PedagogicalAgePolicyCatalog.getAllPolicies();
      expect(allPolicies).toHaveLength(3);
      expect(allPolicies.map(p => p.roomType)).toEqual(['LACTANTES_A', 'LACTANTES_B', 'LACTANTES_C']);
    });
  });

  // =========================================================================
  // 2. PREVENCIÓN DE RIESGOS Y REGLAS DE SEGURIDAD
  // =========================================================================
  describe('2. Prevención de riesgos específicos para Lactantes B', () => {
    it('rechaza cubrir la cabeza o el rostro con telas o sábanas (Anti-Sofocación)', () => {
      const dangerousPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Juego de ocultamiento',
                description: 'Cubrir con una sábana la cabeza del bebé y destapar diciendo quién está aquí.',
                durationMinutes: 10,
                materials: ['colchonetas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        dangerousPlan,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );

      expect(result.isPedagogicallySafe).toBe(false);
      const suffocationViolation = result.blockingViolations.find(
        v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
      );
      expect(suffocationViolation).toBeDefined();
      expect(suffocationViolation?.severity).toBe('BLOCKING_SAFETY');
    });

    it('rechaza variantes lingüísticas de cubrir rostro o cabeza', () => {
      const variants = [
        'Tapar la cara del lactante con una tela para sorprenderlo.',
        'Cubrir el rostro con una prenda suave.',
        'Dejar la cabeza de un bebé adentro de una sábana.',
      ];

      for (const variant of variants) {
        const plan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Actividad de interacción',
                  description: variant,
                  durationMinutes: 10,
                  materials: ['colchonetas'],
                },
              ],
            },
          ],
        };

        const result = PedagogicalSafetyValidator.evaluatePlan(
          plan,
          LACTANTES_B_AGE_POLICY,
          sampleAvailableMaterials
        );
        expect(
          result.blockingViolations.some(
            v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
          )
        ).toBe(true);
      }
    });

    it('rechaza tracción forzada o levantamiento brusco de extremidades', () => {
      const dangerousPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Incorporación del lactante',
                description: 'Jalar de los brazos para levantarlo de la colchoneta varias veces.',
                durationMinutes: 10,
                materials: ['colchonetas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        dangerousPlan,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );

      expect(result.isPedagogicallySafe).toBe(false);
      const tractionViolation = result.blockingViolations.find(
        v => v.ruleId === 'safe-lactantes-b-forced-limb-traction'
      );
      expect(tractionViolation).toBeDefined();
      expect(tractionViolation?.severity).toBe('BLOCKING_SAFETY');
    });

    it('rechaza semillas, cuentas y objetos pequeños desprendibles (Anti-Asfixia)', () => {
      const dangerousPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración sensorial táctil',
                description: 'Manipular semillas de frijol y cuentas plásticas sueltas.',
                durationMinutes: 10,
                materials: ['semillas', 'cuentas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        dangerousPlan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, semillas, cuentas'
      );

      expect(result.isPedagogicallySafe).toBe(false);
      const chokingViolation = result.blockingViolations.find(
        v => v.ruleId === 'safe-lactantes-b-choking-small-parts'
      );
      expect(chokingViolation).toBeDefined();
      expect(chokingViolation?.severity).toBe('BLOCKING_SAFETY');
    });

    it('rechaza acceso no filtrado ni supervisado a pañaleras familiares', () => {
      const dangerousPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración de pertenencias',
                description: 'Explorar la pañalera sin revisión previa y que el niño saque libremente medicamento y pomadas.',
                durationMinutes: 10,
                materials: ['colchonetas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        dangerousPlan,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );

      expect(result.isPedagogicallySafe).toBe(false);
      const bagViolation = result.blockingViolations.find(
        v => v.ruleId === 'safe-lactantes-b-unfiltered-bag-access'
      );
      expect(bagViolation).toBeDefined();
      expect(bagViolation?.severity).toBe('BLOCKING_SAFETY');
    });

    it('rechaza exigencia de marcha autónoma o bipedestación obligatoria', () => {
      const mismatchPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Marcha en fila obligatoria',
                description: 'Caminar en fila hacia la puerta sin apoyo de los educadores.',
                durationMinutes: 10,
                materials: ['colchonetas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        mismatchPlan,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );

      expect(result.isPedagogicallySafe).toBe(false);
      const marchViolation = result.blockingViolations.find(
        v => v.ruleId === 'safe-lactantes-b-unsupported-standing-march'
      );
      expect(marchViolation).toBeDefined();
      expect(marchViolation?.severity).toBe('DEVELOPMENTAL_MISMATCH');
    });

    it('respeta la individualidad motora: el gateo es válido pero NO obligatorio universal', () => {
      // Actividad con gateo estimulado libremente -> Válida
      const crawlingPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Desplazamiento motriz espontáneo',
                description: 'Estimular el gateo libre sobre colchoneta hacia sonajas según su ritmo personal.',
                durationMinutes: 15,
                materials: ['colchonetas', 'sonajas de diferentes formas'],
              },
            ],
          },
        ],
      };
      const crawlingResult = PedagogicalSafetyValidator.evaluatePlan(
        crawlingPlan,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(crawlingResult.isPedagogicallySafe).toBe(true);

      // Actividad en posición sentada sin gateo -> También Válida
      const sittingPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Manipulación de cubos sentado',
                description: 'Lactante sentado cómodamente sobre colchoneta explorando cubos medianos de vinil.',
                durationMinutes: 15,
                materials: ['colchonetas', 'cubos medianos de vinil'],
              },
            ],
          },
        ],
      };
      const sittingResult = PedagogicalSafetyValidator.evaluatePlan(
        sittingPlan,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );
      expect(sittingResult.isPedagogicallySafe).toBe(true);
    });

    // -----------------------------------------------------------------------
    // SR-MD-22F: RAZONAMIENTO PEDAGÓGICO Y DISTINCIÓN DE NEGACIONES / PRECAUCIONES
    // -----------------------------------------------------------------------
    describe('SR-MD-22F: Distinción de negaciones preventivas vs prohibiciones afirmativas', () => {
      it('aprueba actividades con advertencia preventiva "sin cubrir el rostro ni la cabeza"', () => {
        const safeNegationPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Permanencia del objeto con telas',
                  description:
                    'Ocultar parcialmente un juguete bajo la tela, mostrando al niño cómo aparece, cuidando de usar pañuelos de tela grandes sin cubrir el rostro ni la cabeza del lactante.',
                  durationMinutes: 15,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          safeNegationPlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(true);
        expect(result.blockingViolations).toHaveLength(0);
      });

      it('aprueba actividades con "evitando tapar la cara"', () => {
        const safePlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Aparición de objetos',
                  description:
                    'Mover suavemente el pañuelo en el aire invitando a seguir con la mirada, evitando tapar la cara del lactante.',
                  durationMinutes: 15,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          safePlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(true);
        expect(result.blockingViolations).toHaveLength(0);
      });

      it('bloquea cuando la acción de cubrir el rostro es afirmativa', () => {
        const unsafePlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Juego de desaparecer',
                  description:
                    'Se cubre el rostro del bebé con un pañuelo de tela para que intente quitárselo con las manos.',
                  durationMinutes: 10,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          unsafePlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
        );
        expect(violation).toBeDefined();
      });

      it('bloquea acción gobernada por modal afirmativo "vamos a cubrir la cara"', () => {
        const unsafePlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Juego sensorial',
                  description:
                    'Primero saludamos y luego vamos a cubrir la cara del niño brevemente con el pañuelo suave.',
                  durationMinutes: 10,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          unsafePlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
        );
        expect(violation).toBeDefined();
      });

      it('aprueba actividad con "sin forzar la marcha"', () => {
        const safePlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Movimiento en sala',
                  description:
                    'Colocar juguetes a corta distancia sobre colchoneta, sin forzar la marcha ni el gateo.',
                  durationMinutes: 15,
                  materials: ['sonajas de diferentes formas', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          safePlan,
          LACTANTES_B_AGE_POLICY,
          'sonajas de diferentes formas, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(true);
        expect(result.blockingViolations).toHaveLength(0);
      });

      it('bloquea cuando se exige afirmativamente forzar la marcha', () => {
        const unsafePlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Desplazamiento vertical',
                  description:
                    'La asistente debe forzar la marcha del lactante sosteniéndolo de los brazos para que dé pasos.',
                  durationMinutes: 10,
                  materials: ['colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          unsafePlan,
          LACTANTES_B_AGE_POLICY,
          'colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-unsupported-standing-march'
        );
        expect(violation).toBeDefined();
      });

      it('bloquea la negligencia en pañaleras "pañalera sin supervisión"', () => {
        const unsafePlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Exploración libre',
                  description:
                    'Dejar al niño con la pañalera sin supervisión para explorar objetos cotidianos.',
                  durationMinutes: 10,
                  materials: ['colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          unsafePlan,
          LACTANTES_B_AGE_POLICY,
          'colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-unfiltered-bag-access'
        );
        expect(violation).toBeDefined();
      });

      it('aprueba el caso del Product Owner con precauciones explícitas de seguridad', () => {
        const poScenarioPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Permanencia del objeto con pañuelos',
                  description:
                    'Para favorecer la permanencia del objeto se usan pañuelos de tela grandes para manipulación supervisada sin cubrir el rostro ni la cabeza del lactante, respetando el desarrollo motor individual sin forzar posturas, gateo ni marcha.',
                  durationMinutes: 15,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          poScenarioPlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(true);
        expect(result.blockingViolations).toHaveLength(0);
      });

      // ---------------------------------------------------------------------
      // SR-MD-22G: PRUEBAS ADVERSARIALES DE SEGURIDAD (ORACIONES MIXTAS Y LÍMITES CLAUSALES)
      // ---------------------------------------------------------------------
      it('bloquea oraciones mixtas con negación inicial seguida de acción peligrosa: "No cubrir el rostro...; después cubrir la cara..."', () => {
        const adversarialPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Actividad mixta adversarial',
                  description:
                    'No cubrir el rostro durante la preparación; después cubrir la cara del bebé con una tela.',
                  durationMinutes: 10,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          adversarialPlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
        );
        expect(violation).toBeDefined();
        expect(violation?.severity).toBe('BLOCKING_SAFETY');
      });

      it('bloquea oraciones mixtas con conector pero: "No cubrir el rostro al inicio pero después cubrir la cara del bebé"', () => {
        const adversarialPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Actividad con adversativo pero',
                  description:
                    'No cubrir el rostro al inicio pero después cubrir la cara del bebé con una tela suave.',
                  durationMinutes: 10,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          adversarialPlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
        );
        expect(violation).toBeDefined();
      });

      it('bloquea cuando una negación motriz no neutraliza acción facial peligrosa: "Sin forzar la marcha y cubrir la cara del niño"', () => {
        const adversarialPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Negación no extensible por conjunción copulativa',
                  description:
                    'Sin forzar la marcha y cubrir la cara del niño con un pañuelo.',
                  durationMinutes: 10,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          adversarialPlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
        );
        expect(violation).toBeDefined();
      });

      it('bloquea negación lejana separada por coma con acción afirmativa: "Sin materiales peligrosos, se procede a cubrir el rostro"', () => {
        const adversarialPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Negación en cláusula previa',
                  description:
                    'Sin materiales peligrosos, se procede a cubrir el rostro del lactante con la sábana.',
                  durationMinutes: 10,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          adversarialPlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
        );
        expect(violation).toBeDefined();
      });

      it('bloquea casos ambiguos condicionales ("cubrir la cara si el niño lo desea")', () => {
        const ambiguousPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Acción condicional ambigua',
                  description: 'Cubrir la cara del bebé si el niño lo desea para jugar.',
                  durationMinutes: 10,
                  materials: ['pañuelos de tela', 'colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          ambiguousPlan,
          LACTANTES_B_AGE_POLICY,
          'pañuelos de tela, colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const violation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-suffocation-head-covering'
        );
        expect(violation).toBeDefined();
      });

      it('garantiza que reglas ajenas al rostro (tracción de extremidades) siguen bloqueando aunque haya negación facial', () => {
        const multiRulePlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Cuidado facial pero tracción brusca',
                  description:
                    'Sin cubrir el rostro del lactante pero jalar los brazos fuertemente para levantarlo de la colchoneta.',
                  durationMinutes: 10,
                  materials: ['colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          multiRulePlan,
          LACTANTES_B_AGE_POLICY,
          'colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const tractionViolation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-forced-limb-traction'
        );
        expect(tractionViolation).toBeDefined();
        expect(tractionViolation?.severity).toBe('BLOCKING_SAFETY');
      });

      it('garantiza que reglas de pañaleras siguen bloqueando aunque haya negación facial', () => {
        const bagPlan: PedagogicalWeeklyPlanCandidate = {
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  objective: 'Cuidado facial pero pañalera no filtrada',
                  description:
                    'Sin cubrir el rostro ni la cabeza, dejar al lactante explorar la pañalera sin supervisión de la asistente.',
                  durationMinutes: 10,
                  materials: ['colchonetas'],
                },
              ],
            },
          ],
        };
        const result = PedagogicalSafetyValidator.evaluatePlan(
          bagPlan,
          LACTANTES_B_AGE_POLICY,
          'colchonetas'
        );
        expect(result.isPedagogicallySafe).toBe(false);
        const bagViolation = result.blockingViolations.find(
          v => v.ruleId === 'safe-lactantes-b-unfiltered-bag-access'
        );
        expect(bagViolation).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 3. MATERIAL ENCLOSURE Y GESTIÓN DE FIXTURES
  // =========================================================================
  describe('3. Enclosure estricto de materiales y fixtures vacíos', () => {
    it('garantiza que approvedRoomFixtures está estrictamente vacío por defecto', () => {
      expect(LACTANTES_B_MATERIAL_POLICY.approvedRoomFixtures).toHaveLength(0);
      expect(LACTANTES_B_MATERIAL_POLICY.approvedRoomFixtures).toEqual([]);
      expect(LACTANTES_B_MATERIAL_POLICY.strictEnclosure).toBe(true);
    });

    it('bloquea materiales no suministrados por la educadora (BLOCKING_MATERIAL)', () => {
      const planWithUnsupplied: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Dramatización con títeres',
                description: 'Mostrar títeres de animales al lactante.',
                durationMinutes: 15,
                materials: ['títeres de tela'],
              },
            ],
          },
        ],
      };

      // Educadora solo reporta colchonetas y sonajas
      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithUnsupplied,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, sonajas'
      );

      expect(result.isPedagogicallySafe).toBe(false);
      const matViolation = result.blockingViolations.find(
        v => v.ruleId === 'material-outside-supplied-set'
      );
      expect(matViolation).toBeDefined();
      expect(matViolation?.severity).toBe('BLOCKING_MATERIAL');
      expect(matViolation?.offendingValue).toBe('títeres de tela');
    });

    it('aprueba actividades cuando todos los materiales provienen de la lista reportada', () => {
      const compliantPlan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración con sonajas',
                description: 'Manipular sonajas sobre la colchoneta acolchada.',
                durationMinutes: 15,
                materials: ['colchonetas', 'sonajas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        compliantPlan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, sonajas'
      );

      expect(result.isPedagogicallySafe).toBe(true);
      expect(result.blockingViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. CONSERVACIÓN DE DENSIDAD (5 DÍAS × 2 ACTIVIDADES) Y ADVERTENCIA DE DURACIÓN
  // =========================================================================
  describe('4. Densidad de producto y recomendación orientativa de duración', () => {
    it('aprueba satisfactoriamente un plan completo de 5 días con 2 actividades por día', () => {
      const plan5x2 = createSafeTwoActivityPlan();
      const result = PedagogicalSafetyValidator.evaluatePlan(
        plan5x2,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );

      expect(result.isPedagogicallySafe).toBe(true);
      expect(result.blockingViolations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('emite un WARNING si una actividad excede recommendedMaxDurationMinutes (20 min) sin bloquear', () => {
      const planWithLongDuration: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Sesión prolongada de exploración',
                description: 'Manipular sonajas durante periodo extendido sobre colchoneta.',
                durationMinutes: 25, // excede 20 min
                materials: ['colchonetas', 'sonajas de diferentes formas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        planWithLongDuration,
        LACTANTES_B_AGE_POLICY,
        sampleAvailableMaterials
      );

      // Sigue siendo pedagogicallySafe porque duration es WARNING, no BLOCKING
      expect(result.isPedagogicallySafe).toBe(true);
      expect(result.blockingViolations).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].ruleId).toBe('duration-exceeds-age-recommendation');
      expect(result.warnings[0].severity).toBe('WARNING');
    });
  });

  // =========================================================================
  // 5. GOBERNANZA Y AUTORIZACIÓN SOBERANA DE IA (SR-MD-22)
  // =========================================================================
  describe('5. Gobernanza estricta: Autorización controlada de IA bajo SR-MD-22', () => {
    it('PedagogicalAgePolicyCatalog autoriza IA para LACTANTES_A, LACTANTES_B y LACTANTES_C, pero RECHAZA MATERNAL_A y UNKNOWN', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('UNKNOWN')).toBe(false);
    });

    it('AIWeeklyPlanningProposalSource bloquea salas no autorizadas (ej. Maternal A) con UnsupportedPedagogicalPolicyError ANTES del ejecutor', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn(),
      };
      const provider = new AIWeeklyPlanningProposalSource(mockExecutor);

      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-maternal-blocked-proposal',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: {
          roomId: 'room-maternal-a',
          name: 'Maternal A',
          minAgeMonths: 19,
          maxAgeMonths: 24,
        },
        currentContext: {
          observations: 'Maternales explorando.',
          identifiedNeeds: 'Estimulación motora.',
          specialSituations: '',
          availableMaterials: sampleAvailableMaterials,
        },
      };

      await expect(provider.propose(request)).rejects.toThrow(UnsupportedPedagogicalPolicyError);

      // INVARIANTE CRÍTICO: El ejecutor de IA NUNCA fue llamado
      expect(mockExecutor.execute).toHaveBeenCalledTimes(0);
    });
  });

  // =========================================================================
  // 6. INVARIANTE DE NO REGRESIÓN DE LACTANTES A (0–6 MESES)
  // =========================================================================
  describe('6. Invariante de no regresión para Lactantes A', () => {
    it('Lactantes A continúa resolviendo con 0 a 6 meses de forma idéntica', () => {
      const policyA = PedagogicalAgePolicyCatalog.getPolicyForRoom({
        minAgeMonths: 0,
        maxAgeMonths: 6,
        name: 'Lactantes A',
      });

      expect(policyA).toBe(LACTANTES_A_AGE_POLICY);
      expect(policyA?.minAgeMonths).toBe(0);
      expect(policyA?.maxAgeMonths).toBe(6);
    });

    it('Lactantes A continúa prohibiendo el gateo y las masas en 0–6 meses', () => {
      const crawlingPlanForA: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Gateo hacia sonajas',
                description: 'Estimular que gatee hacia los aros en la colchoneta.',
                durationMinutes: 10,
                materials: ['colchonetas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        crawlingPlanForA,
        LACTANTES_A_AGE_POLICY,
        'colchonetas'
      );

      expect(result.isPedagogicallySafe).toBe(false);
      expect(
        result.blockingViolations.some(
          v => v.ruleId === 'safe-lactantes-a-unsupported-crawling-target'
        )
      ).toBe(true);
    });
  });
});
