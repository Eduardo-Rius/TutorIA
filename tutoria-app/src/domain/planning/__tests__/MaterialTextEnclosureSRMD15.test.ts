import { describe, it, expect } from 'vitest';
import {
  PedagogicalSafetyValidator,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  type PedagogicalWeeklyPlanCandidate,
} from '../PedagogicalAgePolicy';

/**
 * ORDEN SR-MD-15 — FASE 1.8
 * CORRECCIÓN CONTROLADA P0 — OBJETOS PELIGROSOS EN TEXTO LIBRE
 *
 * Misión: Validar el rechazo determinista de instrucciones operativas con
 * objetos físicos expresamente prohibidos en la propuesta pedagógica de Lactantes A,
 * tanto en desarrollo central como en adaptaciones etarias (43d–3m y 4–6m),
 * preservando advertencias preventivas legítimas, actividades corporales/vocales
 * y materiales autorizados.
 */
describe('SR-MD-15 Fase 1.8 — Corrección Controlada P0 en Material Enclosure Textual', () => {
  const sampleAvailableMaterials = 'colchoneta, música suave, telas de diferentes texturas';

  const createCandidatePlan = (
    description: string,
    materials: string[] = ['colchoneta'],
    objective = 'Favorecer el movimiento libre y la coordinación visual'
  ): PedagogicalWeeklyPlanCandidate => ({
    days: [
      {
        dayOfWeek: 'MONDAY',
        activities: [
          {
            category: 'AMBIENTES DE APRENDIZAJE',
            objective,
            description,
            durationMinutes: 15,
            materials,
          },
        ],
      },
    ],
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 1 Y 2: RECHAZO EFECTIVO DE LOS 6 OBJETOS EN DESARROLLO CENTRAL
  // ==========================================================================
  describe('Prueba Obligatoria 1 y 2 — Rechazo Efectivo de los Seis Objetos en Desarrollo Central', () => {
    it('Caso A: "Colocar monedas sobre la manta" es RECHAZADO como BLOCKING_SAFETY', () => {
      const text = 'Colocar monedas sobre la manta para que el bebé intente alcanzarlas.';
      const plan = createCandidatePlan(text);

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.contextField).toBe('description');
      expect(violation?.offendingValue).toBe('moneda');
    });

    it('Caso B: "Ofrecer canicas al bebé" es RECHAZADO como BLOCKING_SAFETY', () => {
      const text = 'Ofrecer canicas al bebé para estimular el agarre palmar y rodarlas frente a él.';
      const plan = createCandidatePlan(text);

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('canica');
    });

    it('Caso C: "Utilizar botones desprendibles" es RECHAZADO como BLOCKING_SAFETY', () => {
      const text = 'Utilizar botones desprendibles de colores para captar la atención visual del lactante.';
      const plan = createCandidatePlan(text);

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('botón');
    });

    it('Caso D: "Colocar semillas en sus manos" es RECHAZADO como BLOCKING_SAFETY', () => {
      const text = 'Colocar semillas en sus manos para que sienta texturas rugosas y pequeñas.';
      const plan = createCandidatePlan(text);

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('semilla');
    });

    it('Caso E: "Usar una cuchara metálica no autorizada" es RECHAZADO como BLOCKING_SAFETY', () => {
      const text = 'Usar una cuchara metálica no autorizada para golpear suavemente la superficie y producir sonidos.';
      const plan = createCandidatePlan(text);

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('cuchara metálica');
    });

    it('Caso F: "Introducir cordones en la actividad" es RECHAZADO como BLOCKING_SAFETY', () => {
      const text = 'Introducir cordones en la actividad para que el lactante intente tirar de ellos.';
      const plan = createCandidatePlan(text);

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('cordón');
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 3: VERIFICAR OBJETOS PELIGROSOS EN AMBAS ADAPTACIONES
  // ==========================================================================
  describe('Prueba Obligatoria 3 — Verificación en Ambas Adaptaciones Etarias', () => {
    describe('3.1 — Peligros en Adaptación 43 días a 3 meses', () => {
      it('Detecta y bloquea "monedas" en adaptación temprana', () => {
        const text =
          'Interacción visual y auditiva sobre colchoneta.\n' +
          '• Adaptación 43 días a 3 meses: Colocar monedas sobre la manta cerca de su campo visual para observar si fija la mirada.\n' +
          '• Adaptación 4 a 6 meses: Favorecer giros corporales asistidos con acompañamiento constante.';

        const plan = createCandidatePlan(text);
        const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
        expect(evalResult.isPedagogicallySafe).toBe(false);
        expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
      });

      it('Detecta y bloquea "canicas" en adaptación temprana', () => {
        const text =
          'Estimulación multisensorial en espacio seguro.\n' +
          '• Adaptación 43 días a 3 meses: Ofrecer canicas al bebé para que las sienta en la palma mientras se le sostiene en brazos.\n' +
          '• Adaptación 4 a 6 meses: Exploración en colchoneta boca abajo.';

        const plan = createCandidatePlan(text);
        const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
        expect(evalResult.isPedagogicallySafe).toBe(false);
        expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
      });

      it('Detecta y bloquea "semillas" en adaptación temprana', () => {
        const text =
          'Momento de relajación y acompañamiento afectivo.\n' +
          '• Adaptación 43 días a 3 meses: Colocar semillas en sus manos abiertas para brindar sensaciones táctiles.\n' +
          '• Adaptación 4 a 6 meses: Permitir exploración motriz en tapete acolchado.';

        const plan = createCandidatePlan(text);
        const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
        expect(evalResult.isPedagogicallySafe).toBe(false);
        expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
      });

      it('Detecta y bloquea "cordones" en adaptación temprana', () => {
        const text =
          'Seguimiento visual y vocalización sensible.\n' +
          '• Adaptación 43 días a 3 meses: Introducir cordones en la actividad balanceándolos sobre su pecho.\n' +
          '• Adaptación 4 a 6 meses: Acompañamiento verbal con contacto cara a cara.';

        const plan = createCandidatePlan(text);
        const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
        expect(evalResult.isPedagogicallySafe).toBe(false);
        expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
      });
    });

    describe('3.2 — Peligros en Adaptación 4 a 6 meses', () => {
      it('Detecta y bloquea "botones desprendibles" en adaptación de 4 a 6 meses', () => {
        const text =
          'Acompañamiento pedagógico en colchoneta.\n' +
          '• Adaptación 43 días a 3 meses: Acostar al lactante boca arriba brindando contención física y caricias.\n' +
          '• Adaptación 4 a 6 meses: Utilizar botones desprendibles sobre la superficie para que intente sujetarlos con prensión.';

        const plan = createCandidatePlan(text);
        const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
        expect(evalResult.isPedagogicallySafe).toBe(false);
        expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
      });

      it('Detecta y bloquea "cuchara metálica" en adaptación de 4 a 6 meses', () => {
        const text =
          'Exploración rítmica y percepción sonora.\n' +
          '• Adaptación 43 días a 3 meses: Cantar melodías suaves manteniendo contacto visual continuo.\n' +
          '• Adaptación 4 a 6 meses: Usar una cuchara metálica no autorizada para que el lactante la tome y golpee el suelo.';

        const plan = createCandidatePlan(text);
        const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
        expect(evalResult.isPedagogicallySafe).toBe(false);
        expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
      });
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 4: PRESERVAR CONTROLES PREVENTIVOS LEGÍTIMOS
  // ==========================================================================
  describe('Prueba Obligatoria 4 — Preservar Controles Preventivos Legítimos (Cero Falsos Positivos)', () => {
    it('Control 1: "No utilizar monedas" describe una precaución docente válida y es APROBADO', () => {
      const text =
        'Exploración táctil en colchoneta. No utilizar monedas ni piezas pequeñas durante la interacción pedagógica.\n' +
        '• Adaptación 43 días a 3 meses: Contención corporal cariñosa.\n' +
        '• Adaptación 4 a 6 meses: Libertad de movimiento sobre el tapete.';

      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('Control 2: "Evitar objetos pequeños" es una instrucción de seguridad positiva y es APROBADO', () => {
      const text =
        'Acompañar los movimientos libres del lactante. Evitar objetos pequeños en el suelo.\n' +
        '• Adaptación 43 días a 3 meses: Interacción afectiva en brazos.\n' +
        '• Adaptación 4 a 6 meses: Apoyo postural con cojines seguros.';

      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('Control 3: "Mantener los botones fuera del alcance de los bebés" es una directiva de prevención válida y es APROBADO', () => {
      const text =
        'Juego sonoro con palmadas suaves. Mantener los botones fuera del alcance de los bebés en todo momento.\n' +
        '• Adaptación 43 días a 3 meses: Cantar canciones de cuna con modulación suave.\n' +
        '• Adaptación 4 a 6 meses: Invitar al balbuceo con respuestas vocales contingentes.';

      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 5: CASOS ADVERSARIALES
  // ==========================================================================
  describe('Prueba Obligatoria 5 — Casos Adversariales y Evasión Retórica', () => {
    it('Adversarial 1: "No utilizar monedas, pero ofrecer canicas" es RECHAZADO por canicas', () => {
      const text =
        'Actividad sensorial en tapete. No utilizar monedas, pero ofrecer canicas al bebé para que las observe rodar.\n' +
        '• Adaptación 43 días a 3 meses: Contención afectiva amorosa.\n' +
        '• Adaptación 4 a 6 meses: Seguimiento visual de movimientos.';

      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('canica');
    });

    it('Adversarial 2: "Evitar botones. Después, colocar semillas en sus manos" es RECHAZADO por semillas', () => {
      const text =
        'Exploración en colchoneta. Evitar botones. Después, colocar semillas en sus manos para que experimente rugosidades.\n' +
        '• Adaptación 43 días a 3 meses: Contacto suave con las manos.\n' +
        '• Adaptación 4 a 6 meses: Estimulación táctil asistida.';

      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('semilla');
    });

    it('Adversarial 3: "Usar monedas sin permitir que el bebé las toque" es RECHAZADO (fallo seguro ante ambigüedad/uso afirmativo)', () => {
      const text =
        'Demostración visual frente al lactante. Usar monedas sin permitir que el bebé las toque directamente.\n' +
        '• Adaptación 43 días a 3 meses: Mirada atenta en brazos del educador.\n' +
        '• Adaptación 4 a 6 meses: Observación guiada en tapete.';

      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('moneda');
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 6 Y 7: ACTIVIDADES CORPORALES/VOCALES Y MATERIALES LEGÍTIMOS
  // ==========================================================================
  describe('Pruebas Obligatorias 6 y 7 — Actividades Corporales/Vocales y Materiales Legítimos', () => {
    it('Prueba 6: Actividades corporales y vocales sin materiales siguen siendo VÁLIDAS', () => {
      const text =
        'Cantar melodías suaves frente al bebé con contacto visual, respondiendo a sus balbuceos con modulaciones de voz afectuosas y sonrisas cálidas.\n' +
        '• Adaptación 43 días a 3 meses: Sostener al lactante en brazos con contención física amorosa mientras se modula la voz.\n' +
        '• Adaptación 4 a 6 meses: Acostar al bebé boca arriba en tapete y cantar realizando suaves juegos vocales y caricias.';

      const plan = createCandidatePlan(text, [], 'Favorecer el vínculo afectivo y la comunicación vocal contingente');
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('Prueba 7: Materiales legítimos autorizados continúan FUNCIONANDO normalmente', () => {
      const text =
        'Ofrecer telas de diferentes texturas para que el lactante las toque suavemente sobre la colchoneta acolchada.\n' +
        '• Adaptación 43 días a 3 meses: Acariciar suavemente los dorsos de las manos del bebé con la tela de textura suave.\n' +
        '• Adaptación 4 a 6 meses: Permitir que el lactante extienda sus brazos para palpar las distintas telas en la colchoneta.';

      const plan = createCandidatePlan(
        text,
        ['colchoneta', 'telas de diferentes texturas'],
        'Estimular la percepción táctil con texturas seguras'
      );
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });
  });

  // ==========================================================================
  // CIERRE DE ASIMETRÍA DE CANAL: CANAL ESTRUCTURADO Y TEXTUAL PROTEGIDOS
  // ==========================================================================
  describe('Cierre de Asimetría — Tanto materials[] como description quedan protegidos', () => {
    it('Bloquea "semillas" cuando se declara en materials[]', () => {
      const planStructured = createCandidatePlan(
        'Actividad sensorial en colchoneta',
        ['semillas', 'colchoneta']
      );

      const evalStructured = PedagogicalSafetyValidator.evaluatePlan(planStructured, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalStructured.isPedagogicallySafe).toBe(false);
      expect(evalStructured.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
    });

    it('Bloquea "semillas" cuando se omite de materials[] y se escribe en description (Cierre de Brecha P0)', () => {
      const planTextual = createCandidatePlan(
        'Colocar semillas en sus manos para que experimente texturas rugosas.',
        ['colchoneta']
      );

      const evalTextual = PedagogicalSafetyValidator.evaluatePlan(planTextual, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalTextual.isPedagogicallySafe).toBe(false);
      expect(evalTextual.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
    });
  });

  // ==========================================================================
  // FASE 1.8-A: VERIFICACIÓN ADVERSARIAL DE CONTEXTO
  // ==========================================================================
  describe('SR-MD-15 — Fase 1.8-A: Verificación Adversarial de Contexto', () => {
    it('Caso 1: "No utilizar monedas para jugar y después ofrecer canicas" -> BLOCKING_SAFETY', () => {
      const text =
        'No utilizar monedas para jugar y después ofrecer canicas.\n' +
        '• Adaptación 43 días a 3 meses: Interacción afectiva en brazos.\n' +
        '• Adaptación 4 a 6 meses: Acompañamiento en tapete acolchado.';
      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
    });

    it('Caso 2: "No usar monedas; utilizar únicamente la colchoneta autorizada" -> SIN BLOQUEO por materiales peligrosos', () => {
      const text =
        'No usar monedas; utilizar únicamente la colchoneta autorizada.\n' +
        '• Adaptación 43 días a 3 meses: Contención corporal cariñosa.\n' +
        '• Adaptación 4 a 6 meses: Libertad de movimiento sobre el tapete.';
      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('Caso 3: "Evitar botones, aunque se pueden ofrecer semillas" -> BLOCKING_SAFETY', () => {
      const text =
        'Evitar botones, aunque se pueden ofrecer semillas.\n' +
        '• Adaptación 43 días a 3 meses: Estimulación afectiva.\n' +
        '• Adaptación 4 a 6 meses: Contacto visual continuo.';
      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
    });

    it('Caso 4: "No utilizar canicas ni monedas durante la actividad" -> SIN BLOQUEO por materiales peligrosos', () => {
      const text =
        'No utilizar canicas ni monedas durante la actividad.\n' +
        '• Adaptación 43 días a 3 meses: Sostén sensible del lactante.\n' +
        '• Adaptación 4 a 6 meses: Exploración libre en espacio seguro.';
      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('Caso 5: "Mantener los cordones fuera del alcance; después ofrecer la tela autorizada" -> SIN BLOQUEO por materiales peligrosos', () => {
      const text =
        'Mantener los cordones fuera del alcance; después ofrecer la tela autorizada.\n' +
        '• Adaptación 43 días a 3 meses: Acompañamiento verbal y físico.\n' +
        '• Adaptación 4 a 6 meses: Palpación de telas en colchoneta.';
      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('Caso 6: "No utilizar semillas para observarlas; colocarlas en las manos del bebé" -> BLOCKING_SAFETY', () => {
      const text =
        'No utilizar semillas para observarlas; colocarlas en las manos del bebé.\n' +
        '• Adaptación 43 días a 3 meses: Contacto táctil asistido.\n' +
        '• Adaptación 4 a 6 meses: Exploración sensorial en tapete.';
      const plan = createCandidatePlan(text);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.some(v => v.ruleId === 'safe-lactantes-a-choking-small-parts')).toBe(true);
    });
  });

  // ==========================================================================
  // FASE 1.8-D: VERIFICACIÓN MORFOLÓGICA PREVIA (SOLO PRUEBAS; SIN CAMBIO PRODUCTIVO)
  // ==========================================================================
  const ANAPHORA_CASES: ReadonlyArray<{
    n: number;
    text: string;
    expected: 'BLOCK' | 'ALLOW';
  }> = [
    { n: 1, text: 'No usar semillas; colocarlas en las manos del bebé.', expected: 'BLOCK' },
    { n: 2, text: 'No usar monedas; ponerlas sobre la colchoneta.', expected: 'BLOCK' },
    { n: 3, text: 'No usar canicas; dárselas al bebé.', expected: 'BLOCK' },
    { n: 4, text: 'Evitar botones; retirarlos del área de juego.', expected: 'ALLOW' },
    { n: 5, text: 'No usar semillas; mantenerlas fuera del alcance.', expected: 'ALLOW' },
    { n: 6, text: 'No usar semillas; guardarlas fuera del alcance.', expected: 'ALLOW' },
    { n: 7, text: 'No utilizar monedas.', expected: 'ALLOW' },
    { n: 8, text: 'No usar monedas; ofrecerlas al bebé y después guardarlas.', expected: 'BLOCK' },
    { n: 9, text: 'No usar semillas; mostrar una tela; después colocarlas en las manos del bebé.', expected: 'BLOCK' },
    { n: 10, text: 'No usar semillas; ofrecer una tela autorizada.', expected: 'ALLOW' },
  ];

  const buildAnaphoraText = (core: string): string =>
    `${core}\n` +
    '• Adaptación 43 días a 3 meses: Contención corporal cariñosa.\n' +
    '• Adaptación 4 a 6 meses: Libertad de movimiento sobre el tapete.';

  describe('SR-MD-15 — Fase 1.8-D (E1): Diez casos anafóricos contra el VALIDADOR ACTUAL', () => {
    for (const c of ANAPHORA_CASES) {
      it(`Caso ${c.n}: "${c.text}" -> ${c.expected === 'BLOCK' ? 'BLOCKING_SAFETY' : 'SIN BLOQUEO'}`, () => {
        const plan = createCandidatePlan(buildAnaphoraText(c.text));
        const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
        const hazardBlock = evalResult.blockingViolations.some(
          v => v.ruleId === 'safe-lactantes-a-choking-small-parts' && v.severity === 'BLOCKING_SAFETY'
        );
        if (c.expected === 'BLOCK') {
          expect(evalResult.isPedagogicallySafe).toBe(false);
          expect(hazardBlock).toBe(true);
        } else {
          expect(hazardBlock).toBe(false);
          expect(evalResult.isPedagogicallySafe).toBe(true);
          expect(evalResult.blockingViolations).toHaveLength(0);
        }
      });
    }
  });

  // Patrones EXACTOS propuestos en el diseño Fase 1.8-C (copiados a la prueba, NO a producción).
  const P18C_AFFIRMATIVE_ENCLITIC =
    /\b(coloc|ofrec|entreg|pon|acerc|introduc|us|utili[cz]|emple|d|suministr|facilit|manipul|sujet|agarr|rod|balance)(?:ar|er|ir|ando|iendo|e|en|a|an)?(las|los|la|lo|les|selas|selos|sela|selo)\b/i;
  const P18C_AFFIRMATIVE_PROCLITIC =
    /\b(?:se\s+)?(las|los|la|lo)\s+(?:coloc|ofrec|entreg|pon|acerc|introduc|usa|usen|utili[cz]|emple)\w*\b/i;
  const P18C_CUSTODY_ENCLITIC =
    /\b(manten|guard|retir|alej|desech|ocult)(?:ar|er|ir|ando|iendo|e|en|a|an)?(las|los|la|lo)\b/i;
  const P18C_CUSTODY_MARKER = /\b(fuera|lejos)\s+del\s+alcance\b/i;

  /** Clasifica cada cláusula usando splitIntoClauses/normalizeText reales y los patrones 1.8-C. */
  const classifyWithP18C = (text: string) => {
    const clauses = PedagogicalSafetyValidator.splitIntoClauses(text).map(c =>
      PedagogicalSafetyValidator.normalizeText(c)
    );
    const perClause = clauses.map(c => ({
      clause: c,
      affirmative: P18C_AFFIRMATIVE_ENCLITIC.test(c) || P18C_AFFIRMATIVE_PROCLITIC.test(c),
      custody: P18C_CUSTODY_ENCLITIC.test(c) || P18C_CUSTODY_MARKER.test(c),
    }));
    return { perClause, anyAffirmative: perClause.some(p => p.affirmative), anyCustody: perClause.some(p => p.custody) };
  };

  describe('SR-MD-15 — Fase 1.8-D (E2): Patrones morfológicos propuestos en Fase 1.8-C (evaluación aislada)', () => {
    for (const c of ANAPHORA_CASES) {
      it(`Patrones 1.8-C, Caso ${c.n}: "${c.text}" -> ${c.expected === 'BLOCK' ? 'acción afirmativa detectada' : 'sin acción afirmativa'}`, () => {
        const r = classifyWithP18C(c.text);
        if (c.expected === 'BLOCK') {
          expect(r.anyAffirmative, JSON.stringify(r.perClause)).toBe(true);
        } else {
          expect(r.anyAffirmative, JSON.stringify(r.perClause)).toBe(false);
        }
      });
    }

    it('Patrones 1.8-C: acciones de custodia (casos 4, 5, 6) se reconocen como custodia', () => {
      for (const n of [4, 5, 6]) {
        const c = ANAPHORA_CASES.find(x => x.n === n)!;
        const r = classifyWithP18C(c.text);
        expect(r.anyCustody, `Caso ${n}: ${JSON.stringify(r.perClause)}`).toBe(true);
      }
    });

    it('Patrones 1.8-C: "ofrecer las telas autorizadas" (artículo + sustantivo) NO se confunde con enclítico', () => {
      const r = classifyWithP18C('No usar semillas; ofrecer las telas autorizadas.');
      expect(r.anyAffirmative, JSON.stringify(r.perClause)).toBe(false);
    });

    it('Patrones 1.8-C: "ofrecerlas ... y después guardarlas" conserva la acción afirmativa (caso 8) aunque exista custodia posterior', () => {
      const r = classifyWithP18C('No usar monedas; ofrecerlas al bebé y después guardarlas.');
      expect(r.perClause.some(p => p.affirmative), JSON.stringify(r.perClause)).toBe(true);
      expect(r.anyCustody, JSON.stringify(r.perClause)).toBe(true);
    });
  });

  // ==========================================================================
  // FASE 1.8-E: IMPLEMENTACIÓN CONTROLADA DE ANÁFORAS (casos A–J + guardas de falsos positivos)
  // ==========================================================================
  describe('SR-MD-15 — Fase 1.8-E: Control de anáforas peligrosas (objetos prohibidos conocidos)', () => {
    const E_CASES: ReadonlyArray<{ id: string; text: string; expected: 'BLOCK' | 'ALLOW' }> = [
      { id: 'A', text: 'No usar monedas; ofrecerlas al bebé y después mantenerlas fuera del alcance.', expected: 'BLOCK' },
      { id: 'B', text: 'No usar semillas; mostrar una tela; después colocarlas en las manos del bebé.', expected: 'BLOCK' },
      { id: 'C', text: 'No usar semillas; guardarlas fuera del alcance.', expected: 'ALLOW' },
      { id: 'D', text: 'No usar monedas; ofrecer una tela autorizada.', expected: 'ALLOW' },
      { id: 'E', text: 'Evitar botones; retirarlos del área de juego.', expected: 'ALLOW' },
      { id: 'F', text: 'No usar canicas; mantenerlas fuera del alcance y ofrecer una tela autorizada.', expected: 'ALLOW' },
      { id: 'G', text: 'No usar monedas; ofrecerlas al bebé para exploración.', expected: 'BLOCK' },
      { id: 'H', text: 'No usar semillas; mostrar una tela; guardarlas fuera del alcance del bebé.', expected: 'ALLOW' },
      { id: 'I', text: 'No usar semillas; mostrar telas autorizadas; después colocarlas en las manos del bebé.', expected: 'BLOCK' },
      { id: 'J', text: 'No usar monedas; ofrecerlas al bebé; luego guardarlas.', expected: 'BLOCK' },
    ];

    const hazardOf = (text: string) => {
      const plan = createCandidatePlan(buildAnaphoraText(text));
      const r = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      return {
        r,
        blocked: r.blockingViolations.some(
          v => v.ruleId === 'safe-lactantes-a-choking-small-parts' && v.severity === 'BLOCKING_SAFETY'
        ),
      };
    };

    for (const c of E_CASES) {
      it(`Caso ${c.id}: "${c.text}" -> ${c.expected === 'BLOCK' ? 'BLOCKING_SAFETY' : 'SIN BLOQUEO'}`, () => {
        const { r, blocked } = hazardOf(c.text);
        if (c.expected === 'BLOCK') {
          expect(blocked).toBe(true);
          expect(r.isPedagogicallySafe).toBe(false);
        } else {
          expect(blocked).toBe(false);
          expect(r.isPedagogicallySafe).toBe(true);
          expect(r.blockingViolations).toHaveLength(0);
        }
      });
    }

    it('Irreversibilidad: la custodia posterior (caso A) no cancela la violación; el referente se reporta como anafórico', () => {
      const { r } = hazardOf(E_CASES[0]!.text);
      const v = r.blockingViolations.find(x => x.ruleId === 'safe-lactantes-a-choking-small-parts');
      expect(v?.offendingValue).toContain('referencia anafórica');
    });

    it('Guardas de falsos positivos: instrucciones preventivas y acciones independientes siguen pasando', () => {
      const allowed = [
        'No utilizar monedas.',
        'Guardar semillas fuera del alcance.',
        'Ofrecer una tela autorizada.',
        'No usar semillas; ofrecer las telas autorizadas.',
        'No usar canicas; dar una tela autorizada.',
        'No usar monedas ni ofrecerlas al bebé.',
        'No usar semillas; no colocarlas cerca del bebé.',
        'No usar cordones; decorar la colchoneta con música suave.',
      ];
      for (const text of allowed) {
        const { r, blocked } = hazardOf(text);
        expect(blocked, text).toBe(false);
        expect(r.blockingViolations, text).toHaveLength(0);
      }
    });

    it('Formas concretas de "dar" (sin raíz abierta "d"): "dárselas", "darlas", "dalas" bloquean; "decorar", "dedicar" no', () => {
      for (const text of [
        'No usar canicas; dárselas al bebé.',
        'No usar canicas; darlas al bebé.',
        'No usar canicas; dalas al bebé.',
      ]) {
        expect(hazardOf(text).blocked, text).toBe(true);
      }
      for (const text of ['No usar canicas; decorar el espacio.', 'No usar canicas; dedicar tiempo al canto.']) {
        expect(hazardOf(text).blocked, text).toBe(false);
      }
    });

    it('Proclíticos: "No usar monedas; las ofrecen al bebé" y "se las entregan" bloquean', () => {
      expect(hazardOf('No usar monedas; las ofrecen al bebé.').blocked).toBe(true);
      expect(hazardOf('No usar monedas; se las entregan al bebé.').blocked).toBe(true);
    });

    it('Sin antecedente prohibido no hay bloqueo: "Ofrecerlas" sobre materiales autorizados no se bloquea', () => {
      const { r, blocked } = hazardOf('Mostrar telas autorizadas; después ofrecerlas suavemente sobre la colchoneta.');
      expect(blocked).toBe(false);
      expect(r.isPedagogicallySafe).toBe(true);
    });

    it('Preserva la validación de activity.materials (canal estructurado intacto)', () => {
      const plan = createCandidatePlan('Actividad sensorial en colchoneta', ['monedas', 'colchoneta']);
      const r = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_A_AGE_POLICY, sampleAvailableMaterials);
      expect(r.isPedagogicallySafe).toBe(false);
      expect(r.blockingViolations.some(v => v.contextField === 'materials')).toBe(true);
    });
  });

  // ==========================================================================
  // SR-MD-17-G.4: CARACTERIZACIÓN ADVERSARIAL MATERIAL ENCLOSURE — LACTANTES B
  // ==========================================================================
  describe('SR-MD-17-G.4 — Caracterización Adversarial de Material Enclosure en Lactantes B (7 a 12 meses)', () => {
    const availableLactantesBMaterials = 'cubo de vinil';

    it('Escenario A: Cubo autorizado + caja de cartón no autorizada en texto libre', () => {
      const text = 'Colocar el cubo dentro de una caja de cartón para que el lactante lo busque.';
      const plan = createCandidatePlan(text, ['cubo de vinil']);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_B_AGE_POLICY, availableLactantesBMaterials);

      // Requisito de política: Debería bloquear por introducir material físico no autorizado (caja de cartón)
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
    });

    it('Escenario B: Cubo autorizado + cuerda no autorizada en texto libre', () => {
      const text = 'Utilizar una cuerda para acercar el cubo hacia el lactante.';
      const plan = createCandidatePlan(text, ['cubo de vinil']);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_B_AGE_POLICY, availableLactantesBMaterials);

      // Requisito de política: Debería bloquear por peligro de estrangulamiento y objeto no autorizado
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
      const violation = evalResult.blockingViolations.find(v => v.ruleId === 'safe-lactantes-b-choking-small-parts');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('BLOCKING_SAFETY');
      expect(violation?.offendingValue).toBe('cuerda');
    });

    it('Escenario B (Preventivo): "No utilizar cuerdas" no se bloquea indebidamente', () => {
      const text = 'No utilizar cuerdas; acercar el cubo al alcance del bebé.';
      const plan = createCandidatePlan(text, ['cubo de vinil']);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_B_AGE_POLICY, availableLactantesBMaterials);

      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });

    it('Escenario C: Cubo autorizado + mesa infantil no declarada en texto libre', () => {
      const text = 'Ofrecer el cubo sobre una mesa infantil para que intente alcanzarlo.';
      const plan = createCandidatePlan(text, ['cubo de vinil']);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_B_AGE_POLICY, availableLactantesBMaterials);

      // Requisito de política: approvedRoomFixtures está vacío; debería detectar soporte/mobiliario no declarado
      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThanOrEqual(1);
    });

    it('Escenario D: Cubo autorizado + mediación directa del adulto sin objetos extra', () => {
      const text = 'Acercar el cubo al alcance del bebé y observar cómo lo sujeta con ambas manos.';
      const plan = createCandidatePlan(text, ['cubo de vinil']);
      const evalResult = PedagogicalSafetyValidator.evaluatePlan(plan, LACTANTES_B_AGE_POLICY, availableLactantesBMaterials);

      // Requisito de política: Seguro; mediación directa sobre material autorizado sin objetos extra
      expect(evalResult.isPedagogicallySafe).toBe(true);
      expect(evalResult.blockingViolations).toHaveLength(0);
    });
  });
});


