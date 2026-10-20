import { describe, it, expect } from 'vitest';
import {
  PedagogicalSafetyValidator,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  PedagogicalWeeklyPlanCandidate,
} from '../../../domain/planning/PedagogicalAgePolicy';
import { validateActivityProgressionCorrespondence } from '../WeeklyPlanningProposalSource';

describe('ORDEN MASTER ARB — SR-MD-22J: Corrección Quirúrgica de Calidad Pedagógica (Lactantes B)', () => {
  // =========================================================================
  // J1. COHERENCIA ENTRE ACTIVIDADES Y MATERIALES
  // =========================================================================
  describe('J1. Coherencia entre actividades y materiales (no inventar recipientes o recursos)', () => {
    it('J1.1 Bloquea actividad que exige introducir/extraer cubos de recipientes cuando NO se declararon recipientes disponibles', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración de la permanencia del objeto mediante llenado y vaciado',
                description:
                  'Inicio: Sentar a los lactantes sobre la colchoneta acolchada.\n' +
                  'Desarrollo: Ofrecer cubos de tela suave e invitar al lactante a introducir y extraer los cubos de recipientes plásticos profundos.\n' +
                  'Cierre: Guardar los cubos entonando una canción afectiva.\n' +
                  'Adaptaciones: Permitir postura prona a quienes no se sienten solos.',
                durationMinutes: 15,
                materials: ['cubos de tela suave'],
              },
            ],
          },
        ],
      };

      // Solo colchonetas acolchadas y cubos de tela suave declarados (sin recipientes)
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas acolchadas, cubos de tela suave',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'material-undeclared-container-resource'
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('recipientes');
    });

    it('J1.2 Aprueba la actividad cuando los recipientes sí fueron declarados disponibles por la educadora', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración de la permanencia del objeto',
                description:
                  'Inicio: Presentar la actividad sobre la colchoneta con tono cálido.\n' +
                  'Desarrollo: Ofrecer cubos de tela suave e invitar a meter y sacar los cubos de recipientes plásticos seguros.\n' +
                  'Cierre: Guardar los materiales juntos con una despedida afectuosa.\n' +
                  'Adaptaciones: Permitir postura prona o sedestación espontánea.',
                durationMinutes: 15,
                materials: ['cubos de tela suave', 'recipientes plásticos seguros'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas acolchadas, cubos de tela suave, recipientes plásticos seguros',
        { requirePedagogicalStructure: true }
      );

      const undeclaredViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'material-undeclared-container-resource'
      );
      expect(undeclaredViolations).toHaveLength(0);
    });

    it('J1.3 Verificación contextual: no bloquea indiscriminadamente si la palabra recipiente aparece en otro contexto no exigente', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Manipulación libre y causa-efecto',
                description:
                  'Inicio: Disponer colchonetas limpias en el área de exploración.\n' +
                  'Desarrollo: Permitir que los lactantes manipulen los cubos de tela suave golpeándolos suavemente entre sí o pasándolos de mano a mano.\n' +
                  'Cierre: Recoger los cubos cantando una melodía tranquila.\n' +
                  'Adaptaciones: Permitir apoyo espontáneo en el suelo según el ritmo motor.',
                durationMinutes: 15,
                materials: ['cubos de tela suave', 'colchonetas'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, cubos de tela suave',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(true);
    });

    it('J1.4 Distingue advertencias preventivas sobre contenedores ("evitar meter en recipientes", "no introducir en cajas") sin bloquear', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Manipulación libre de cubos y exploración táctil',
                description:
                  'Inicio: Disponer colchonetas limpias en el área de exploración.\n' +
                  'Desarrollo: Permitir que los lactantes manipulen los cubos de tela suave; evitar meter en recipientes o cajas ajenas al aula para concentrarse en el contacto táctil.\n' +
                  'Cierre: Recoger los cubos cantando una melodía tranquila.\n' +
                  'Adaptaciones: Permitir apoyo espontáneo en el suelo según el ritmo motor.',
                durationMinutes: 15,
                materials: ['cubos de tela suave', 'colchonetas'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, cubos de tela suave',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('J1.5 Distingue advertencias preventivas sobre mobiliario ("sin colocar sobre mesas infantiles") sin bloquear', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Manipulación libre de cubos sobre superficie segura',
                description:
                  'Inicio: Disponer colchonetas limpias en el piso.\n' +
                  'Desarrollo: Ofrecer los cubos directamente en la colchoneta; sin colocar sobre mesas infantiles ni elevar superficies de exploración.\n' +
                  'Cierre: Guardar con calma en su lugar.\n' +
                  'Adaptaciones: Permitir libre movimiento en el suelo.',
                durationMinutes: 15,
                materials: ['cubos de tela suave', 'colchonetas'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, cubos de tela suave',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // J2. ADAPTACIONES POSTURALES SEGURAS
  // =========================================================================
  describe('J2. Adaptaciones posturales seguras (no forzar sedestación ni proponer cojines universales)', () => {
    it('J2.1 Bloquea instrucciones de "proporcionar apoyo para mantener la posición sentada"', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Lectura compartida y contacto visual',
                description:
                  'Inicio: Invitar al lactante a la lectura sobre la colchoneta.\n' +
                  'Desarrollo: Mostrar el libro de cartón ¿Dónde está Spot? hojeando despacio.\n' +
                  'Cierre: Guardar el libro con contacto cariñoso.\n' +
                  'Adaptaciones: Proporcionar apoyo para mantener la posición sentada durante toda la actividad.',
                durationMinutes: 15,
                materials: ['Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const devViolation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-milestones-baseline'
      );
      expect(devViolation).toBeDefined();
    });

    it('J2.2 Bloquea calzado artificial o forzamiento de sedestación con cojines', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración de texturas',
                description:
                  'Inicio: Acomodar al lactante en la colchoneta.\n' +
                  'Desarrollo: Presentar los cubos de tela.\n' +
                  'Cierre: Guardar con calma.\n' +
                  'Adaptaciones: Forzar la posición sentada con cojines para evitar que se acueste.',
                durationMinutes: 15,
                materials: ['cubos de tela suave'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'cubos de tela suave',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const devViolation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-milestones-baseline'
      );
      expect(devViolation).toBeDefined();
    });

    it('J2.3 Aprueba adaptaciones seguras basadas en movilidad libre y sostén sensible en brazos', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Lectura compartida y contacto afectivo',
                description:
                  'Inicio: Invitar al lactante sobre la colchoneta acolchada con voz afectuosa.\n' +
                  'Desarrollo: Mostrar el libro de cartón ¿Dónde está Spot? invitando a tocar la portada.\n' +
                  'Cierre: Cerrar el libro con caricias y guardar el material.\n' +
                  'Adaptaciones: Permitir la postura prona o arrastre espontáneo a quienes no se sientan solos; brindar sostén en regazo del adulto respetando sus descansos.',
                durationMinutes: 12,
                materials: ['Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill',
        { requirePedagogicalStructure: true }
      );

      const devViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'dev-lactantes-b-milestones-baseline'
      );
      expect(devViolations).toHaveLength(0);
      expect(evalResult.isPedagogicallySafe).toBe(true);
    });

    it('J2.4 Distingue advertencias preventivas ("sin forzar la posición sentada", "evitar mantener la posición sentada con cojines") sin bloquear', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Lectura compartida y contacto afectivo',
                description:
                  'Inicio: Invitar al lactante sobre la colchoneta acolchada con voz afectuosa.\n' +
                  'Desarrollo: Mostrar el libro de cartón ¿Dónde está Spot? con lectura pausada.\n' +
                  'Cierre: Cerrar el libro con caricias y guardar el material.\n' +
                  'Adaptaciones: Permitir la postura prona o arrastre libre, sin forzar la posición sentada ni usar cojines de soporte; respetar descansos.',
                durationMinutes: 12,
                materials: ['Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill',
        { requirePedagogicalStructure: true }
      );

      const devViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'dev-lactantes-b-milestones-baseline'
      );
      expect(devViolations).toHaveLength(0);
      expect(evalResult.isPedagogicallySafe).toBe(true);
    });
  });

  // =========================================================================
  // J3. CIERRES PEDAGÓGICOS SIGNIFICATIVOS
  // =========================================================================
  describe('J3. Cierres pedagógicos significativos (no asambleas verbales reflexivas para lactantes)', () => {
    it('J3.1 Bloquea Cierre genérico discursivo ("hablar sobre lo que han visto")', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración de la imagen',
                description:
                  'Inicio: Presentar las láminas sobre la colchoneta.\n' +
                  'Desarrollo: Señalar los dibujos animados con entonación suave.\n' +
                  'Cierre: Reunir a los lactantes para hablar sobre lo que han visto y preguntarles qué sintieron.\n' +
                  'Adaptaciones: Sostén en regazo según necesidad motriz.',
                durationMinutes: 15,
                materials: ['cuentos plastificados'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'cuentos plastificados',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const closureViolation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-closure-mismatch'
      );
      expect(closureViolation).toBeDefined();
      expect(closureViolation?.message).toContain('hablar sobre lo que han visto');
    });

    it('J3.2 Aprueba Cierre concreto, afectivo y adecuado a 7–12 meses (nombrar objetos, melodía, transición tranquila)', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración motriz y causa-efecto',
                description:
                  'Inicio: Presentar las pelotas suaves sobre la colchoneta limpia.\n' +
                  'Desarrollo: Rodar suavemente la pelota hacia las manos del lactante animando el agarre bimanual.\n' +
                  'Cierre: Nombrar la pelota con cariño («¡guardamos la pelota suave!») y entonar una breve nana de transición hacia el descanso.\n' +
                  'Adaptaciones: Permitir la postura prona o arrastre libre.',
                durationMinutes: 15,
                materials: ['pelotas suaves'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'pelotas suaves',
        { requirePedagogicalStructure: true }
      );

      const closureViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'dev-lactantes-b-closure-mismatch'
      );
      expect(closureViolations).toHaveLength(0);
      expect(evalResult.isPedagogicallySafe).toBe(true);
    });
  });

  // =========================================================================
  // J4. DURACIONES FLEXIBLES
  // =========================================================================
  describe('J4. Duraciones flexibles y no rígidas', () => {
    it('J4.1 Acepta duraciones variadas (10, 12, 15, 20 min) sin imponer 15 o 20 como límite rígido obligatorio', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Lectura breve y afectiva',
                description:
                  'Inicio: Acercar el libro de tela con sonrisa.\n' +
                  'Desarrollo: Mostrar láminas táctiles pausadamente.\n' +
                  'Cierre: Nombrar las texturas con afecto y guardar el libro.\n' +
                  'Adaptaciones: En regazo o superficie plana.',
                durationMinutes: 10, // 10 minutos flexible
                materials: ['libros de tela'],
              },
              {
                objective: 'Movimiento libre en colchoneta',
                description:
                  'Inicio: Disponer colchonetas en espacio despejado.\n' +
                  'Desarrollo: Estimular el gateo y desplazamiento voluntario.\n' +
                  'Cierre: Caricias suaves de retorno a la calma.\n' +
                  'Adaptaciones: Respetar pausas y descansos individuales.',
                durationMinutes: 18, // 18 minutos flexible
                materials: ['colchonetas'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'libros de tela, colchonetas',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(true);
      const durationViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'duration-exceeds-age-recommendation'
      );
      expect(durationViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // J5. PROGRESIÓN SEMANAL VERIFICABLE
  // =========================================================================
  describe('J5. Progresión semanal verificable y no decorativa', () => {
    it('J5.1 Bloquea repetición literal etiquetada como OBSERVE_OR_CONSOLIDATE o REVISIT', () => {
      const identicalDesc =
        'Inicio: Sentar a los lactantes con contención.\n' +
        'Desarrollo: Leer el libro pasando las hojas con lentitud.\n' +
        'Cierre: Guardar el libro con despedida afectuosa.\n' +
        'Adaptaciones: Sostén en regazo según necesidad.';

      const mockDays = [
        {
          activities: [
            {
              experienceId: 'EXP-D1-A1',
              description: identicalDesc,
            },
          ],
        },
        {
          activities: [
            {
              experienceId: 'EXP-D5-A1',
              description: identicalDesc, // Copia exacta
            },
          ],
        },
      ];

      const progression = {
        weeklyFocus: 'Lectura progresiva',
        experiences: [
          { experienceId: 'EXP-D1-A1', role: 'EXPLORE' as const },
          {
            experienceId: 'EXP-D5-A1',
            role: 'OBSERVE_OR_CONSOLIDATE' as const,
            revisitsExperienceId: 'EXP-D1-A1',
            repetitionPurpose: 'CONSOLIDATION' as const,
            variationDimensions: ['ADULT_MEDIATION' as const],
          },
        ],
      };

      expect(() =>
        validateActivityProgressionCorrespondence(mockDays as any, progression, {
          disallowLiteralRepetition: true,
        })
      ).toThrow(/identical literal description without observable pedagogical variation/i);
    });

    it('J5.2 Aprueba progresión con variación observable en mediación a lo largo de la semana', () => {
      const mockDays = [
        {
          activities: [
            {
              experienceId: 'EXP-D1-A1',
              description:
                'Inicio: Presentar la portada del libro ¿Dónde está Spot? permitiendo tocarla.\n' +
                'Desarrollo: Abrir despacio la primera página explorando la ilustración con voz cálida.\n' +
                'Cierre: Nombrar a Spot y guardar el libro.\n' +
                'Adaptaciones: Sostén en regazo.',
            },
          ],
        },
        {
          activities: [
            {
              experienceId: 'EXP-D3-A1',
              description:
                'Inicio: Retomar el libro recordando el juego de esconder a Spot.\n' +
                'Desarrollo: Invitar al lactante a descubrir la solapa con el oso oculto, acompañando con onomatopeyas.\n' +
                'Cierre: Aplaudiendo el descubrimiento antes de guardar el ejemplar.\n' +
                'Adaptaciones: Acercar el libro para infantes en decúbito prono.',
            },
          ],
        },
      ];

      const progression = {
        weeklyFocus: 'Lectura dialógica con Spot',
        experiences: [
          { experienceId: 'EXP-D1-A1', role: 'EXPLORE' as const },
          {
            experienceId: 'EXP-D3-A1',
            role: 'VARY' as const,
            revisitsExperienceId: 'EXP-D1-A1',
            repetitionPurpose: 'VARIATION' as const,
            variationDimensions: ['SENSORY_EXPERIENCE' as const],
          },
        ],
      };

      expect(() =>
        validateActivityProgressionCorrespondence(mockDays as any, progression, {
          disallowLiteralRepetition: true,
        })
      ).not.toThrow();
    });
  });

  // =========================================================================
  // J6. INVARIANZA DE LACTANTES A
  // =========================================================================
  describe('J6. Invarianza de Lactantes A', () => {
    it('Lactantes A conserva intactas sus adaptaciones bimodales', () => {
      const planA: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Vínculo y estimulación auditiva suave',
                description:
                  'Presentar sonaja suave con modulación cariñosa.\n' +
                  '• Adaptación 43 días a 3 meses: Sostén en brazos con contención física.\n' +
                  '• Adaptación 4 a 6 meses: En colchoneta animando el seguimiento visual.',
                durationMinutes: 10,
                materials: ['sonajas'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(planA, LACTANTES_A_AGE_POLICY, 'sonajas');
      expect(evalResult.isPedagogicallySafe).toBe(true);
    });
  });
});
