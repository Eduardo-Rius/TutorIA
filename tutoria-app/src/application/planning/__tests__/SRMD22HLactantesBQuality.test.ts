import { describe, it, expect } from 'vitest';
import {
  PedagogicalAgePolicyCatalog,
  PedagogicalSafetyValidator,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  PedagogicalWeeklyPlanCandidate,
} from '../../../domain/planning/PedagogicalAgePolicy';
import {
  projectInternalActivityToCanonical,
  createRequestScopedMaterialTable,
} from '../AIWeeklyPlanningProposalSource';
import { validateActivityProgressionCorrespondence } from '../WeeklyPlanningProposalSource';
import fs from 'node:fs';

const REAL_FIXTURE_PATH =
  '/Users/rius/.gemini/antigravity-ide/brain/46adcc80-a4a5-44b5-af9f-5016d4eaea30/scratch/real_openai_lactantes_b_proposal.json';
const realBaselineJson = JSON.parse(fs.readFileSync(REAL_FIXTURE_PATH, 'utf8'));

describe('ORDEN MASTER ARB — SR-MD-22H: Calidad Pedagógica de la IA para Lactantes B', () => {
  // =========================================================================
  // 1. NORMALIZACIÓN DE MATERIALES Y ELIMINACIÓN DE CONTAMINACIÓN NARRATIVA
  // =========================================================================
  describe('1. Normalización de materiales y eliminación de contaminación narrativa', () => {
    it('1.1 Ejemplo exacto de MASTER ARB: extrae objetos concretos y título de Spot sin fragmentos narrativos', () => {
      const rawMaterials =
        'libros de tela lavables y libros de cartón rígido para bebés para la lectura diaria se dispone del libro infantil de cartón ¿Dónde está Spot?';

      const parsed = PedagogicalSafetyValidator.parseAvailableMaterialsList(rawMaterials);

      // Debe extraer objetos físicos concretos
      expect(parsed).toContain('libros de tela lavables');
      expect(parsed).toContain('libros de cartón rígido');
      // Debe conservar título canónico con autor
      expect(parsed).toContain('Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill');

      // No debe contener fragmentos narrativos
      parsed.forEach((mat) => {
        expect(mat).not.toMatch(/para la lectura diaria se dispone/i);
        expect(mat).not.toMatch(/para bebés/i);
      });
    });

    it('1.2 Desglosa conjunciones "y" / "e" que conectan materiales distintos sin romper títulos', () => {
      const rawMaterials = 'pelotas suaves y cubos de tela lavables e instrumentos sonoros tipo sonaja';
      const parsed = PedagogicalSafetyValidator.parseAvailableMaterialsList(rawMaterials);

      expect(parsed).toContain('pelotas suaves');
      expect(parsed).toContain('cubos de tela lavables');
      expect(parsed).toContain('instrumentos sonoros tipo sonaja');
    });

    it('1.3 Filtra mediación verbal del adulto o expresiones no físicas (voz, nanas, rimas)', () => {
      const rawMaterials =
        'colchonetas, la voz de la educadora, sonajas de aro, narraciones afectivas, títeres de tela';
      const parsed = PedagogicalSafetyValidator.parseAvailableMaterialsList(rawMaterials);

      expect(parsed).toContain('colchonetas');
      expect(parsed).toContain('sonajas de aro');
      expect(parsed).toContain('títeres de tela');
      expect(parsed).not.toContain('la voz de la educadora');
      expect(parsed).not.toContain('narraciones afectivas');
    });

    it('1.4 Enclosure estricto: isMaterialEnclosed reconoce los materiales normalizados con acentuación y diacríticos', () => {
      const available = 'Colchonetas acolchadas, sonajas de vinil, muñecos de tela';
      const parsed = PedagogicalSafetyValidator.parseAvailableMaterialsList(available);

      expect(PedagogicalSafetyValidator.isMaterialEnclosed('muñecos de tela', parsed, [])).toBe(true);
      expect(PedagogicalSafetyValidator.isMaterialEnclosed('munecos de tela', parsed, [])).toBe(true);
      expect(PedagogicalSafetyValidator.isMaterialEnclosed('colchonetas acolchadas', parsed, [])).toBe(true);
      expect(PedagogicalSafetyValidator.isMaterialEnclosed('plastilina', parsed, [])).toBe(false);
    });
  });

  // =========================================================================
  // 2. ELIMINACIÓN DEL PREFIJO ARTIFICIAL "CON <MATERIAL>:"
  // =========================================================================
  describe('2. Composición fluida sin prefijo artificial "Con <material>:"', () => {
    const table = createRequestScopedMaterialTable([
      'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill',
      'colchonetas',
    ]);

    it('2.1 Cuando la actividad tiene secciones pedagógicas (Inicio:), NO antepone "Con <material>:"', () => {
      const rawAct = {
        category: 'LECTURA EN VOZ ALTA',
        objective: 'Fomentar la atención compartida y el contacto afectivo',
        proceduralAction:
          'Inicio: Acomodar al lactante en la colchoneta con postura cómoda.\n' +
          'Desarrollo: Mostrar {material} y abrir despacio la portada para observar su reacción.\n' +
          'Cierre: Guardar el libro cantando una nana suave.\n' +
          'Adaptaciones: Brindar contención física a quienes aún requieren apoyo al sentarse.',
        materialRefs: ['MAT-01'],
        durationMinutes: 15,
      };

      const canonical = projectInternalActivityToCanonical(rawAct, table, 0, 0, 'LACTANTES_B');

      expect(canonical.description).not.toMatch(/^Con\s+/i);
      expect(canonical.description).toContain('Inicio: Acomodar al lactante');
      expect(canonical.description).toContain('Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill');
    });

    it('2.2 Cuando se usa {material} en el cuerpo del texto, sustituye naturalmente el nombre sin prefijos artificiales', () => {
      const rawAct = {
        category: 'ACTIVACIÓN FÍSICA',
        objective: 'Favorecer el movimiento espontáneo sobre colchoneta',
        proceduralAction:
          'Inicio: Preparar {material} en el área despejada.\n' +
          'Desarrollo: Estimular el gateo y la exploración libre de posturas.\n' +
          'Cierre: Retorno a la calma con respiración pausada.\n' +
          'Adaptaciones: Permitir la postura prona o sedestación asistida según el ritmo individual.',
        materialRefs: ['MAT-02'],
        durationMinutes: 15,
      };

      const canonical = projectInternalActivityToCanonical(rawAct, table, 0, 1, 'LACTANTES_B');

      expect(canonical.description).not.toMatch(/^Con\s+/i);
      expect(canonical.description).toContain('Inicio: Preparar colchonetas en el área despejada.');
    });
  });

  // =========================================================================
  // 3. ESTRUCTURA PEDAGÓGICA OBLIGATORIA (INICIO, DESARROLLO, CIERRE, ADAPTACIONES)
  // =========================================================================
  describe('3. Estructura pedagógica obligatoria (Inicio, Desarrollo, Cierre, Adaptaciones)', () => {
    const makePlanWithDescription = (desc: string): PedagogicalWeeklyPlanCandidate => ({
      days: [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              objective: 'Lectura compartida del libro',
              description: desc,
              durationMinutes: 15,
              materials: ['Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill'],
            },
            {
              objective: 'Exploración motriz libre',
              description:
                'Inicio: Disponer colchonetas limpias.\n' +
                'Desarrollo: Animar el desplazamiento.\n' +
                'Cierre: Recoger y reposar.\n' +
                'Adaptaciones: Sostén sensible en regazo para quienes no se sientan solos.',
              durationMinutes: 15,
              materials: ['colchonetas'],
            },
          ],
        },
      ],
    });

    it('3.1 Rechaza actividades que carecen de "Inicio:"', () => {
      const plan = makePlanWithDescription(
        'Desarrollo: Mostrar el libro pasando las hojas con lentitud.\n' +
        'Cierre: Guardar con despedida afectuosa.\n' +
        'Adaptaciones: Facilitar agarre según posibilidades.'
      );

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill, colchonetas',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('Inicio');
    });

    it('3.2 Rechaza actividades que carecen de "Desarrollo:"', () => {
      const plan = makePlanWithDescription(
        'Inicio: Invitar al lactante a sentarse con contención.\n' +
        'Cierre: Guardar con despedida afectuosa.\n' +
        'Adaptaciones: Facilitar agarre según posibilidades.'
      );

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill, colchonetas',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('Desarrollo');
    });

    it('3.3 Rechaza actividades que carecen de "Cierre:"', () => {
      const plan = makePlanWithDescription(
        'Inicio: Invitar al lactante a sentarse con contención.\n' +
        'Desarrollo: Mostrar el libro pasando las hojas con lentitud.\n' +
        'Adaptaciones: Facilitar agarre según posibilidades.'
      );

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill, colchonetas',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('Cierre');
    });

    it('3.4 Rechaza actividades que carecen de "Adaptaciones:"', () => {
      const plan = makePlanWithDescription(
        'Inicio: Invitar al lactante a sentarse con contención.\n' +
        'Desarrollo: Mostrar el libro pasando las hojas con lentitud.\n' +
        'Cierre: Guardar con despedida afectuosa.'
      );

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill, colchonetas',
        { requirePedagogicalStructure: true }
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('Adaptaciones');
    });

    it('3.5 Aprueba actividades completas con las 4 secciones pedagógicas estructuradas', () => {
      const plan = makePlanWithDescription(
        'Inicio: Invitar al lactante a sentarse con contención sobre la colchoneta.\n' +
        'Desarrollo: Mostrar el libro infantil ¿Dónde está Spot? pasando las hojas con lentitud e imitando onomatopeyas.\n' +
        'Cierre: Guardar el libro con despedida afectuosa y realizar un cierre tranquilo con contacto afectivo.\n' +
        'Adaptaciones: Ofrecer sostén en regazo del adulto para quienes no se sientan aún; respetar a quienes gatean libremente.'
      );

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill, colchonetas',
        { requirePedagogicalStructure: true }
      );

      const structureViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(structureViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. DETECCIÓN DE REPETICIONES LITERALES SIN VARIACIÓN PEDAGÓGICA
  // =========================================================================
  describe('4. Detección de repeticiones literales sin variación pedagógica entre días', () => {
    it('4.1 Detecta y bloquea repetición literal idéntica entre días distintos', () => {
      const identicalActivityDesc =
        'Inicio: Sentar a los bebés en círculo sobre colchoneta.\n' +
        'Desarrollo: Mostrar la pelota suave y hacerla rodar suavemente hacia cada uno.\n' +
        'Cierre: Guardar la pelota con canción de despedida suave.\n' +
        'Adaptaciones: Permitir postura prona o supina a quienes no se sientan aún.';

      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Estimulación del seguimiento visual con pelota',
                description: identicalActivityDesc,
                durationMinutes: 15,
                materials: ['pelotas suaves'],
              },
            ],
          },
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                objective: 'Estimulación del seguimiento visual con pelota',
                description: identicalActivityDesc, // Copia exacta
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
        { checkPedagogicalVariation: true }
      );

      // Under SR-MD-23J Three-Tier Validation, repetition is classified as NIVEL AMARILLO (WARNING)
      const repViolation = evalResult.violations.find(
        (v) => v.ruleId === 'progression-literal-repetition-without-variation'
      );
      expect(repViolation).toBeDefined();
      expect(repViolation?.severity).toBe('WARNING');
      expect(repViolation?.message).toContain('repetición');
    });

    it('4.2 Aprueba repetición intencional con variación observable en mediación y autonomía', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración sensorial inicial de la pelota',
                description:
                  'Inicio: Presentar la pelota grande y permitir que el lactante la toque.\n' +
                  'Desarrollo: Rodar la pelota despacio hacia sus manos en colchoneta.\n' +
                  'Cierre: Acompañar el guardado del material con tono sereno.\n' +
                  'Adaptaciones: En posición prona o sedente según capacidad individual.',
                durationMinutes: 15,
                materials: ['pelotas suaves'],
              },
            ],
          },
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                objective: 'Juego de causa y efecto con intercambio de la pelota',
                description:
                  'Inicio: Recordar el juego con la pelota mostrándola a mayor distancia.\n' +
                  'Desarrollo: Invitar al lactante a empujar la pelota de vuelta hacia la asistente, estimulando la prensión bimanual.\n' +
                  'Cierre: Festejar con aplausos suaves el intercambio logrado y reposar.\n' +
                  'Adaptaciones: Para quienes gatean, alejar ligeramente la pelota para motivar el desplazamiento voluntario.',
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
        { checkPedagogicalVariation: true }
      );

      const repViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'progression-literal-repetition-without-variation'
      );
      expect(repViolations).toHaveLength(0);
    });

    it('4.3 Validador estructural validateActivityProgressionCorrespondence con flag disallowLiteralRepetition', () => {
      const mockDays = [
        {
          activities: [
            {
              experienceId: 'EXP-D1-A1',
              description: 'Actividad idéntica de lectura compartida',
            },
          ],
        },
        {
          activities: [
            {
              experienceId: 'EXP-D2-A1',
              description: 'Actividad idéntica de lectura compartida',
            },
          ],
        },
      ];

      const progression = {
        weeklyFocus: 'Lectura',
        experiences: [
          { experienceId: 'EXP-D1-A1', role: 'EXPLORE' as const },
          {
            experienceId: 'EXP-D2-A1',
            role: 'REVISIT' as const,
            revisitsExperienceId: 'EXP-D1-A1',
            repetitionPurpose: 'FAMILIARIZATION' as const,
            variationDimensions: ['SENSORY_EXPERIENCE' as const],
          },
        ],
      };

      // Sin flag: no lanza por compatibilidad histórica
      expect(() =>
        validateActivityProgressionCorrespondence(mockDays as any, progression)
      ).not.toThrow();

      // Con flag activo: detecta y bloquea la repetición literal
      expect(() =>
        validateActivityProgressionCorrespondence(mockDays as any, progression, {
          disallowLiteralRepetition: true,
        })
      ).toThrow(/identical literal description without observable pedagogical variation/i);
    });
  });

  // =========================================================================
  // 5. REGRESIÓN CONTRA EL FIXTURE REAL DE EVIDENCIA DEL PO
  // =========================================================================
  describe('5. Fixture de regresión real del Product Owner (10 al 14 de agosto de 2026)', () => {
    it('5.1 Confirma que la propuesta real del PO es detectada como insuficiente por falta de estructura pedagógica y repeticiones literales', () => {
      const proposal = (realBaselineJson as any).proposal;
      expect(proposal).toBeDefined();
      expect(proposal.days).toHaveLength(5);

      // Evaluar la propuesta real mediante la política institucional de Lactantes B
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        proposal,
        LACTANTES_B_AGE_POLICY,
        'libros de tela con textura, colchonetas acolchadas, cubos de tela suave, tapetes sensoriales lavables, munecos de trapo',
        { requirePedagogicalStructure: true, checkPedagogicalVariation: true }
      );

      // Debe ser rechazada pedagógicamente
      expect(evalResult.isPedagogicallySafe).toBe(false);

      // Hallazgo 1: Falta de estructura Inicio/Desarrollo/Cierre/Adaptaciones en las actividades
      const structureViolations = evalResult.blockingViolations.filter(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(structureViolations.length).toBeGreaterThan(0);

      // Hallazgo 2: Viernes (D5-A1) repite literalmente a Miércoles (D3-A1)
      const wednesdayReading = proposal.days[2].activities[0].description;
      const fridayReading = proposal.days[4].activities[0].description;
      expect(wednesdayReading).toBe(fridayReading);

      const repViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'progression-literal-repetition-without-variation'
      );
      expect(repViolations.length).toBeGreaterThan(0);
      expect(repViolations[0].severity).toBe('WARNING');
    });

    it('5.2 Confirma telemetría del fixture sin datos personales (PII)', () => {
      const telemetry = (realBaselineJson as any).telemetry;
      expect(telemetry.model).toBe('gpt-4o-mini');
      expect(telemetry.usage.totalTokens).toBeGreaterThan(5000);

      // Validar que no hay datos sensibles de niños en el fixture
      const fixtureStr = JSON.stringify(realBaselineJson);
      expect(fixtureStr).not.toMatch(/CURP/i);
      expect(fixtureStr).not.toMatch(/matr[íi]cula/i);
      expect(fixtureStr).not.toMatch(/expediente/i);
    });
  });

  // =========================================================================
  // 6. HITOS DEL DESARROLLO (NO APILAMIENTO DE CUBOS, NO SEÑALAMIENTO FORZADO)
  // =========================================================================
  describe('6. Respeto a los hitos del desarrollo para 7 a 12 meses', () => {
    it('6.1 Bloquea exigencia de apilar cubos en torre (incompatible a 7-12 meses)', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Construcción vertical de cubos',
                description:
                  'Inicio: Presentar cubos de madera.\n' +
                  'Desarrollo: Exigir al lactante apilar 4 cubos formando una torre vertical sin tirarla.\n' +
                  'Cierre: Guardar los cubos.\n' +
                  'Adaptaciones: Apoyo postural.',
                durationMinutes: 15,
                materials: ['cubos medianos de vinil'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'cubos medianos de vinil'
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const devViolation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-milestones-baseline'
      );
      expect(devViolation).toBeDefined();
    });

    it('6.2 Bloquea exigencia obligatoria de señalamiento fino con dedo índice', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Identificación de imágenes',
                description:
                  'Inicio: Abrir el libro frente al niño.\n' +
                  'Desarrollo: Exigir al lactante que señale con su dedo índice a cada personaje de la lámina.\n' +
                  'Cierre: Cerrar el libro con calma.\n' +
                  'Adaptaciones: Repetir varias veces si no señala.',
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
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill'
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      const devViolation = evalResult.blockingViolations.find(
        (v) => v.ruleId === 'dev-lactantes-b-milestones-baseline'
      );
      expect(devViolation).toBeDefined();
    });

    it('6.3 Aprueba exploración libre apropiada: golpear, tirar, meter y sacar cubos', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración bimanual y causa-efecto con cubos de vinil',
                description:
                  'Inicio: Disponer los cubos de vinil sobre la colchoneta.\n' +
                  'Desarrollo: Permitir que el lactante saque los cubos, los golpee suavemente entre sí y explore las texturas con libertad.\n' +
                  'Cierre: Invitar a guardar los cubos juntos al ritmo de una melodía tranquila.\n' +
                  'Adaptaciones: Facilitar el alcance para infantes en sedestación asistida o arrastre.',
                durationMinutes: 15,
                materials: ['cubos medianos de vinil', 'colchonetas'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'cubos medianos de vinil, colchonetas'
      );

      const devViolations = evalResult.violations.filter(
        (v) => v.ruleId === 'dev-lactantes-b-milestones-baseline'
      );
      expect(devViolations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 7. INVARIANZA Y NO REGRESIÓN DE LACTANTES A
  // =========================================================================
  describe('7. Invarianza y no regresión de Lactantes A', () => {
    it('7.1 Lactantes A sigue exigiendo adaptaciones bimodales (43 días a 3 meses y 4 a 6 meses)', () => {
      const policyA = LACTANTES_A_AGE_POLICY;
      expect(policyA.roomType).toBe('LACTANTES_A');
      expect(policyA.minAgeMonths).toBe(0);
      expect(policyA.maxAgeMonths).toBe(6);

      const planA: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Vínculo y contacto afectivo',
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

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(planA, policyA, 'sonajas');
      expect(evalResult.isPedagogicallySafe).toBe(true);
    });
  });
});
