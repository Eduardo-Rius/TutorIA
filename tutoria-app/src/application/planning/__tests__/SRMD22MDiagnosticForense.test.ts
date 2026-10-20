import { describe, it, expect } from 'vitest';
import {
  PedagogicalSafetyValidator,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_A_AGE_POLICY,
  PedagogicalWeeklyPlanCandidate,
} from '../../../domain/planning/PedagogicalAgePolicy';

describe('ORDEN MASTER ARB — SR-MD-22N-R: Verificación de Simplificación y Desbloqueo de IA (Lactantes B)', () => {
  // =========================================================================
  // CAUSA 1: DESBLOQUEO DE POLISEMIA ("CUENTA" / "LAZOS AFECTIVOS")
  // =========================================================================
  describe('Causa 1: Eliminación de falsos positivos por polisemia («cuenta», «lazos afectivos»)', () => {
    it('1.1 "cuenta un cuento" se aprueba sin falso positivo de asfixia', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Estimulación del lenguaje y atención compartida',
                description:
                  'Inicio: Presentar el libro infantil sobre la colchoneta.\n' +
                  'Desarrollo: La asistente cuenta un cuento breve a los lactantes modulando su voz.\n' +
                  'Cierre: Guardar el libro cantando una canción.\n' +
                  'Adaptaciones: Permitir postura libre en colchoneta.',
                durationMinutes: 15,
                materials: ['libro infantil'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, libro infantil',
        { requirePedagogicalStructure: true }
      );

      const cuentaViolation = result.violations.find((v) => v.offendingValue === 'cuenta');
      expect(cuentaViolation).toBeUndefined();
      expect(result.isPedagogicallySafe).toBe(true);
    });

    it('1.2 "tomando en cuenta el ritmo" se aprueba sin falso positivo', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración motriz y sensorial',
                description:
                  'Inicio: Acondicionar las colchonetas limpias en el área.\n' +
                  'Desarrollo: Invitar a explorar los cubos suaves tomando en cuenta el ritmo individual de cada lactante.\n' +
                  'Cierre: Guardar los cubos con una caricia afectuosa.\n' +
                  'Adaptaciones: Permitir arrastre o gateo espontáneo.',
                durationMinutes: 15,
                materials: ['cubos suaves'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, cubos suaves',
        { requirePedagogicalStructure: true }
      );

      const cuentaViolation = result.violations.find((v) => v.offendingValue === 'cuenta');
      expect(cuentaViolation).toBeUndefined();
      expect(result.isPedagogicallySafe).toBe(true);
    });

    it('1.3 "lazos afectivos" se aprueba sin falso positivo de asfixia/cuerda', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Vínculo afectivo y seguridad emocional',
                description:
                  'Inicio: Recibir a los lactantes con afecto y cercanía.\n' +
                  'Desarrollo: Fortalecer los lazos afectivos mediante canciones de cuna y miradas cálidas.\n' +
                  'Cierre: Despedir la actividad con un abrazo suave.\n' +
                  'Adaptaciones: Contención en brazos o colchoneta.',
                durationMinutes: 15,
                materials: ['colchonetas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas',
        { requirePedagogicalStructure: true }
      );

      const lazoViolation = result.violations.find(
        (v) => v.offendingValue === 'lazos' || v.offendingValue === 'lazo'
      );
      expect(lazoViolation).toBeUndefined();
      expect(result.isPedagogicallySafe).toBe(true);
    });
  });

  // =========================================================================
  // CAUSA 2: VERBOS PREVENTIVOS ("evitar usar semillas", "sin usar semillas")
  // =========================================================================
  describe('Causa 2: Verbos gobernados por marcadores preventivos son seguros', () => {
    it('2.1 Reconoce como seguros "evitar usar semillas" y "sin usar semillas"', () => {
      const safeEvitarUsar = PedagogicalSafetyValidator.isProhibitedMaterialClauseSafe(
        'evitar usar semillas o piezas pequeñas',
        'semillas'
      );
      const safeSinUsar = PedagogicalSafetyValidator.isProhibitedMaterialClauseSafe(
        'sin usar semillas en la actividad',
        'semillas'
      );

      expect(safeEvitarUsar).toBe(true);
      expect(safeSinUsar).toBe(true);
    });

    it('2.2 Mantiene el bloqueo estricto ante uso afirmativo y peligroso de semillas', () => {
      const unsafeUso = PedagogicalSafetyValidator.isProhibitedMaterialClauseSafe(
        'colocar semillas en las manos del lactante para su manipulación',
        'semillas'
      );
      expect(unsafeUso).toBe(false);
    });
  });

  // =========================================================================
  // CAUSA 3: FLEXIBILIDAD EN ESTRUCTURA PEDAGÓGICA (Lactantes B)
  // =========================================================================
  describe('Causa 3: Flexibilidad en subtítulos y adaptaciones de Lactantes B', () => {
    it('3.1 Aprueba actividades con subtítulos etarios ("• Adaptación 7 a 9 meses:")', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración sensorial bimanual',
                description:
                  'Inicio: Presentar sonajas selladas sobre la colchoneta.\n' +
                  'Desarrollo: Los lactantes agitan las sonajas descubriendo sonidos rítmicos.\n' +
                  'Cierre: Guardar con calma en su sitio.\n' +
                  '• Adaptación 7 a 9 meses: Sostén en regazo y exploración asistida.\n' +
                  '• Adaptación 10 a 12 meses: Desplazamiento libre y alcance autónomo.',
                durationMinutes: 15,
                materials: ['sonajas selladas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, sonajas selladas',
        { requirePedagogicalStructure: true }
      );

      const structViolation = result.violations.find(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(structViolation).toBeUndefined();
      expect(result.isPedagogicallySafe).toBe(true);
    });

    it('3.2 Continúa detectando cuando una actividad carece completamente de una sección obligatoria', () => {
      const plan: PedagogicalWeeklyPlanCandidate = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                objective: 'Exploración sensorial bimanual',
                description:
                  'Presentar sonajas selladas sobre la colchoneta sin estructura alguna.',
                durationMinutes: 15,
                materials: ['sonajas selladas'],
              },
            ],
          },
        ],
      };

      const result = PedagogicalSafetyValidator.evaluatePlan(
        plan,
        LACTANTES_B_AGE_POLICY,
        'colchonetas, sonajas selladas',
        { requirePedagogicalStructure: true }
      );

      const structViolation = result.violations.find(
        (v) => v.ruleId === 'dev-lactantes-b-pedagogical-structure'
      );
      expect(structViolation).toBeDefined();
      expect(result.isPedagogicallySafe).toBe(false);
    });
  });

  // =========================================================================
  // CAUSA 4: SANITIZACIÓN DE MATERIALES DISPONIBLES EN CONTEXTO
  // =========================================================================
  describe('Causa 4: Sanitización de narrativas en materiales disponibles', () => {
    it('4.1 No convierte frases de limpieza o advertencia en pseudo-materiales', () => {
      const context = 'Colchonetas, cubos suaves. Todos los materiales están limpios y en buen estado. Sin piezas pequeñas.';
      const parsed = PedagogicalSafetyValidator.parseAvailableMaterialsList(context);

      expect(parsed).toContain('colchonetas');
      expect(parsed).toContain('cubos suaves');
      expect(parsed.some((m) => m.includes('todos los materiales'))).toBe(false);
      expect(parsed.some((m) => m.includes('sin piezas'))).toBe(false);
    });
  });
});
