import { describe, it, expect } from 'vitest';
import {
  PedagogicalSafetyValidator,
  LACTANTES_B_AGE_POLICY,
  PedagogicalWeeklyPlanCandidate,
} from '../../../domain/planning/PedagogicalAgePolicy';
import {
  createRequestScopedMaterialTable,
  validateProceduralActionEnclosure,
} from '../AIWeeklyPlanningProposalSource';
import {
  PedagogicalPolicyViolationError,
  InvalidWeeklyPlanningProposalError,
} from '../WeeklyPlanningProposalSource';
import {
  classifyWeeklyPlanningFailure,
} from '../../../../functions/src/proposeWeeklyPlanning';

describe('SR-MD-23G Forensic & Regression Test Battery — Lactantes B AI Safety & Enclosure', () => {
  const evaluateSingleActivity = (description: string, materials: string[] = ['sonajas plásticas']) => {
    const plan: PedagogicalWeeklyPlanCandidate = {
      days: [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              objective: 'Favorecer el movimiento libre y la exploración sensorial segura',
              description,
              durationMinutes: 15,
              materials,
            },
          ],
        },
      ],
    };

    return PedagogicalSafetyValidator.evaluatePlan(
      plan,
      LACTANTES_B_AGE_POLICY,
      'colchonetas, tapetes, sonajas plásticas, cubos de tela, pelotas suaves, libros de tela, muñecos de tela',
      { requirePedagogicalStructure: true, checkPedagogicalVariation: true }
    );
  };

  describe('Battery 1: Preventive Negations (Safe — No False Positives)', () => {
    it('1.1 "cuidando que no haya semillas ni piezas sueltas" is accepted as safe', () => {
      const desc =
        'Inicio: Ofrecer las sonajas en la colchoneta cuidando que no haya semillas ni piezas sueltas.\n' +
        'Desarrollo: Los lactantes exploran las sonajas suavemente con ambas manos.\n' +
        'Cierre: Guardar los juguetes cantando una nana suave.\n' +
        'Adaptaciones: Permitir postura prona sobre la colchoneta acolchada.';

      const result = evaluateSingleActivity(desc);
      expect(result.violations.filter(v => v.ruleId === 'safe-lactantes-b-choking-small-parts')).toHaveLength(0);
      expect(result.isPedagogicallySafe).toBe(true);
    });

    it('1.2 "verificando que no tengan botones o cordones" is accepted as safe', () => {
      const desc =
        'Inicio: Presentar los muñecos de tela verificando que no tengan botones ni cordones desprendibles.\n' +
        'Desarrollo: Los lactantes manipulan la textura de la tela con suavidad.\n' +
        'Cierre: Despedir la actividad con un abrazo afectuoso.\n' +
        'Adaptaciones: Sostén en regazo si lo requieren.';

      const result = evaluateSingleActivity(desc, ['muñecos de tela']);
      expect(result.violations.filter(v => v.ruleId === 'safe-lactantes-b-choking-small-parts')).toHaveLength(0);
      expect(result.isPedagogicallySafe).toBe(true);
    });

    it('1.3 "sin botones ni cordones" preceded by action verb "colocar" is accepted as safe', () => {
      const desc =
        'Inicio: Colocar los juguetes en la colchoneta sin botones ni cordones para su seguridad.\n' +
        'Desarrollo: Exploración manual libre y manipulación sensorial.\n' +
        'Cierre: Guardar los materiales con afecto y calma.\n' +
        'Adaptaciones: Libre movimiento en el área.';

      const result = evaluateSingleActivity(desc);
      expect(result.violations.filter(v => v.ruleId === 'safe-lactantes-b-choking-small-parts')).toHaveLength(0);
      expect(result.isPedagogicallySafe).toBe(true);
    });

    it('1.4 "libre de cordones o listones" is accepted as safe', () => {
      const desc =
        'Inicio: Ofrecer libros de tela en la colchoneta verificando que estén libres de cordones o listones.\n' +
        'Desarrollo: Los lactantes exploran las texturas visuales y táctiles de las páginas.\n' +
        'Cierre: Guardar los libros con afecto.\n' +
        'Adaptaciones: Permitir manipulación sentado con apoyo.';

      const result = evaluateSingleActivity(desc, ['libros de tela']);
      expect(result.violations.filter(v => v.ruleId === 'safe-lactantes-b-choking-small-parts')).toHaveLength(0);
      expect(result.isPedagogicallySafe).toBe(true);
    });
  });

  describe('Battery 2: Motor Developmental Rules & Preventive Negations', () => {
    it('2.1 "no obligar a gatear" is recognized as preventive negation and accepted', () => {
      const desc =
        'Inicio: Disponer las sonajas sobre la colchoneta con tono cálido.\n' +
        'Desarrollo: Acompañar el alcance voluntario de los objetos.\n' +
        'Cierre: Guardar las sonajas cantando una melodía.\n' +
        'Adaptaciones: Respetar los ritmos individuales de movilidad, no obligar a gatear a quienes prefieren arrastrarse.';

      const result = evaluateSingleActivity(desc);
      expect(result.violations.filter(v => v.ruleId === 'safe-lactantes-b-motor-forced-posture')).toHaveLength(0);
    });

    it('2.2 "no forzar la posición sentada con apoyo" is recognized as preventive and accepted', () => {
      const desc =
        'Inicio: Disponer las sonajas sobre la colchoneta.\n' +
        'Desarrollo: Invitar a explorar el sonido del juguete.\n' +
        'Cierre: Guardar con calma en su canasta.\n' +
        'Adaptaciones: Respetar si el lactante prefiere estar acostado; no forzar la posición sentada con apoyo.';

      const result = evaluateSingleActivity(desc);
      expect(result.violations.filter(v => v.ruleId === 'dev-lactantes-b-milestones-baseline')).toHaveLength(0);
    });

    it('2.3 Affirmative forced milestone: "mantener la posición sentada con apoyo" is rejected', () => {
      const desc =
        'Inicio: Sentar a los lactantes en la colchoneta.\n' +
        'Desarrollo: Explorar los cubos de tela.\n' +
        'Cierre: Guardar los cubos.\n' +
        'Adaptaciones: Para los más pequeños, mantener la posición sentada con apoyo de cojines.';

      const result = evaluateSingleActivity(desc, ['cubos de tela']);
      expect(result.violations.some(v => v.ruleId === 'dev-lactantes-b-milestones-baseline')).toBe(true);
    });
  });

  describe('Battery 3: Dialogical closures in Lactantes B (Developmental Mismatches)', () => {
    it('3.1 Dialogical closure with "conversar sobre lo que han realizado" is rejected', () => {
      const desc =
        'Inicio: Presentar el libro infantil sobre la colchoneta.\n' +
        'Desarrollo: Mostrar las páginas con ritmo pausado.\n' +
        'Cierre: Conversar brevemente con los lactantes sobre lo que han realizado en la sesión.\n' +
        'Adaptaciones: Sostén en regazo.';

      const result = evaluateSingleActivity(desc, ['libros de tela']);
      expect(result.violations.some(v => v.ruleId === 'dev-lactantes-b-closure-mismatch')).toBe(true);
    });

    it('3.2 Dialogical closure with "platicar sobre lo que han visto" is rejected', () => {
      const desc =
        'Inicio: Presentar el libro infantil sobre la colchoneta.\n' +
        'Desarrollo: Mostrar las páginas con ritmo pausado.\n' +
        'Cierre: Platicar con ellos sobre lo que han visto y guardar el libro.\n' +
        'Adaptaciones: Sostén en regazo.';

      const result = evaluateSingleActivity(desc, ['libros de tela']);
      expect(result.violations.some(v => v.ruleId === 'dev-lactantes-b-closure-mismatch')).toBe(true);
    });
  });

  describe('Battery 4: Material Enclosure on Ambient Placement Surfaces (Prueba A Fix)', () => {
    it('4.1 Accepts proceduralAction mentioning ambient placement surfaces (Colchonetas acolchadas) without materialRef', () => {
      const table = createRequestScopedMaterialTable([
        'Colchonetas acolchadas',
        'tapetes sensoriales lavables',
        'sonajas plásticas selladas',
      ]);

      const proceduralAction =
        'Inicio: Acomodar al lactante sobre las colchonetas acolchadas.\n' +
        'Desarrollo: Ofrecer las sonajas plásticas selladas para su exploración libre.\n' +
        'Cierre: Guardar los materiales con calma.\n' +
        'Adaptaciones: Permitir postura prona.';

      const resolvedMaterials = ['sonajas plásticas selladas'];

      expect(() => {
        validateProceduralActionEnclosure(proceduralAction, resolvedMaterials, table, 0, 0);
      }).not.toThrow();
    });

    it('4.2 Rejects proceduralAction mentioning undeclared focal manipulative material', () => {
      const table = createRequestScopedMaterialTable([
        'Colchonetas acolchadas',
        'sonajas plásticas selladas',
        'bloques de madera grandes',
      ]);

      const proceduralAction =
        'Inicio: Colocar al lactante en la colchoneta.\n' +
        'Desarrollo: Ofrecer bloques de madera grandes junto con las sonajas.\n' +
        'Cierre: Guardar materiales.\n' +
        'Adaptaciones: Libre exploración.';

      const resolvedMaterials = ['sonajas plásticas selladas'];

      expect(() => {
        validateProceduralActionEnclosure(proceduralAction, resolvedMaterials, table, 0, 0);
      }).toThrow(/proceduralAction mentions material 'bloques de madera grandes' without declaring its ref in materialRefs/);
    });
  });

  describe('Battery 5: Preservation of True Choking & Safety Rules (Invariants Held)', () => {
    it('5.1 Affirmative use of prohibited choking material (semillas) is strictly rejected', () => {
      const desc =
        'Inicio: Ofrecer semillas de girasol para manipular con los dedos.\n' +
        'Desarrollo: Exploración táctil de las semillas sobre la colchoneta.\n' +
        'Cierre: Guardar el material.\n' +
        'Adaptaciones: Supervisión constante.';

      const result = evaluateSingleActivity(desc, ['semillas']);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.violations.some(v => v.ruleId === 'safe-lactantes-b-choking-small-parts')).toBe(true);
    });

    it('5.2 Affirmative use of loose buttons and cords is strictly rejected', () => {
      const desc =
        'Inicio: Disponer botones sueltos y cordones para practicar ensartado.\n' +
        'Desarrollo: Los lactantes manipulan los botones.\n' +
        'Cierre: Guardar todo.\n' +
        'Adaptaciones: Ninguna.';

      const result = evaluateSingleActivity(desc, ['botones sueltos']);
      expect(result.isPedagogicallySafe).toBe(false);
      expect(result.violations.some(v => v.ruleId === 'safe-lactantes-b-choking-small-parts')).toBe(true);
    });

    it('5.3 True anaphoric hazard with prohibited objects is detected and rejected', () => {
      const clauses = [
        'Inicio: Disponer cuentas pequeñas de plástico en el suelo',
        'Desarrollo: La asistente toma las cuentas para entregarlas con cuidado a los lactantes',
      ];

      const hazard = PedagogicalSafetyValidator.findAnaphoricHazard(clauses, ['cuentas']);
      expect(hazard).not.toBeNull();
      expect(hazard?.term).toBe('cuentas');
    });
  });

  describe('Battery 6: Safe Telemetry & Observability Hardening', () => {
    it('6.1 PedagogicalPolicyViolationError emits structured safe diagnostic fields', () => {
      const violation = {
        ruleId: 'safe-lactantes-b-choking-small-parts',
        severity: 'BLOCKING_SAFETY' as const,
        message: 'Material u objeto no permitido detectado en texto: "semillas" en MONDAY (actividad 1).',
        provenance: 'PEDAGOGICAL_SAFETY_BASELINE' as const,
        dayOfWeek: 'MONDAY',
        activityIndex: 0,
        contextField: 'description' as const,
        offendingValue: 'semillas',
        riskRationale: 'Riesgo de asfixia o aspiración en menores de 12 meses.',
      };

      const error = new PedagogicalPolicyViolationError('Age violation', [violation]);
      const classification = classifyWeeklyPlanningFailure(error);

      expect(classification.processingStage).toBe('AGE_SAFETY');
      expect(classification.failureCode).toBe('BLOCKING_AGE_POLICY');
      expect(classification.ruleId).toBe('safe-lactantes-b-choking-small-parts');
      expect(classification.dayOfWeek).toBe('MONDAY');
      expect(classification.activityIndex).toBe(0);
      expect(classification.contextField).toBe('description');
      expect(classification.offendingValue).toBe('semillas');
      expect(classification.validationReason).toBe(violation.message);
    });

    it('6.2 UNDECLARED_MATERIAL emits structured safe diagnostic fields', () => {
      const error = new InvalidWeeklyPlanningProposalError(
        "Activity at day index 0, activity index 1 proceduralAction mentions material 'bloques de madera' without declaring its ref in materialRefs."
      );
      const classification = classifyWeeklyPlanningFailure(error);

      expect(classification.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classification.failureCode).toBe('UNDECLARED_MATERIAL');
      expect(classification.activityIndex).toBe(1);
      expect(classification.contextField).toBe('proceduralAction');
      expect(classification.offendingValue).toBe('bloques de madera');
    });
  });
});
