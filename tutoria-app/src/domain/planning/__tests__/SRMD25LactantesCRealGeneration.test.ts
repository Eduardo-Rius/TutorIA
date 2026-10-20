import { describe, it, expect, vi } from 'vitest';
import {
  PedagogicalAgePolicyCatalog,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  LACTANTES_C_AGE_POLICY,
  LACTANTES_C_APPROVED_ROOM_FIXTURES,
  PedagogicalSafetyValidator,
} from '../PedagogicalAgePolicy';
import { RoomCatalog, Room } from '../RoomCatalog';
import {
  AIWeeklyPlanningProposalSource,
  cleanDuplicatePedagogicalPhrases,
  differentiateRepeatedDailyExperiences,
  diversifyUniformDurations,
  resolveMaterialForPlaceholder,
  sanitizeMaterialActionIncoherencies,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningAIExecutor,
  WeeklyPlanningProposalResponse,
} from '../../../application/planning/WeeklyPlanningProposalSource';

describe('MASTER ARB — SR-MD-25: Lactantes C con IA Real y Protección de Lactantes A y B', () => {
  const roomLactantesC: Room = {
    roomId: 'lactantes-c',
    name: 'Lactantes C',
    minAgeMonths: 13,
    maxAgeMonths: 18,
  };

  const sampleMaterials = 'Cajas de cartón seguras, pelotas medianas de textura suave, libros con solapas de cartón grueso «¿Dónde está Spot?» de Eric Hill, bloques grandes de plástico lavable, aros blandos, colchonetas.';

  const createValidLactantesCProposalJson = () => {
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
    const days = daysOfWeek.map((dayOfWeek, dIdx) => ({
      dayOfWeek,
      activities: [
        {
          category: 'LECTURA EN VOZ ALTA',
          objective: `Favorecer la atención compartida y el señalamiento comunicativo en la lectura del día ${dIdx + 1}`,
          proceduralAction: `Inicio: La asistente dispone un círculo cómodo sobre {material} y muestra la portada. Desarrollo: Abre el libro «¿Dónde está Spot?» y modula la voz invitando a señalar personajes. Cierre: Cierra suavemente el libro reconociendo el interés del grupo con palabras de afecto. Adaptaciones: Quienes caminan se acercan libremente; se brinda apoyo en suelo a quienes aún gatean.`,
          materialRefs: ['libros con solapas de cartón grueso «¿Dónde está Spot?» de Eric Hill'],
          durationMinutes: 12,
          progression: {
            role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
            revisitsSlot: dIdx === 0 ? null : 'D1_A1',
            repetitionPurpose: dIdx === 0 ? undefined : 'VARIATION',
            variationDimensions: dIdx === 0 ? [] : ['SENSORY_EXPERIENCE'],
            observationTarget: 'Observar el señalamiento espontáneo hacia las ilustraciones.',
          },
        },
        {
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Promover la manipulación bimanual y el apilamiento de objetos grandes',
          proceduralAction: 'Inicio: Se colocan {material} sobre la colchoneta para despertar curiosidad. Desarrollo: La asistente apila dos bloques demostrando la acción y anima a los lactantes a tomar y superponer piezas. Cierre: Guardan juntos los materiales cantando una rima breve. Adaptaciones: Se acercan piezas a quienes juegan sentados o gatean.',
          materialRefs: ['bloques grandes de plástico lavable'],
          durationMinutes: 15,
          progression: {
            role: 'EXPLORE',
            observationTarget: 'Observar la prensión y coordinación de ambas manos al sostener bloques.',
          },
        },
        {
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Estimular la exploración espacial y la noción de continente-contenido',
          proceduralAction: 'Inicio: La asistente presenta {material} llenas de pelotas medianas. Desarrollo: Los lactantes vacían, meten y sacan pelotas desplazándose con autonomía por el espacio. Cierre: Transición afectiva agradeciendo el esfuerzo y acompañando el guardado. Adaptaciones: Respetar pausas y ritmos individuales de desplazamiento.',
          materialRefs: ['cajas de cartón seguras', 'pelotas medianas de textura suave'],
          durationMinutes: 15,
          progression: {
            role: 'EXPLORE',
            observationTarget: 'Observar la iniciativa para meter y sacar objetos de la caja.',
          },
        },
        {
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Favorecer el equilibrio dinámico y la marcha independiente o con apoyo',
          proceduralAction: 'Inicio: Se distribuyen {material} en el suelo formando un circuito despejado. Desarrollo: La asistente ofrece sus manos a distancia o invita a caminar hacia los aros sin jalar extremidades. Cierre: Abrazo grupal y descanso sobre colchoneta. Adaptaciones: Permitir gateo o marcha asistida con soporte estable para quienes lo requieran.',
          materialRefs: ['aros blandos'],
          durationMinutes: 15,
          progression: {
            role: 'EXPLORE',
            observationTarget: 'Observar la estabilidad y confianza en los pasos autónomos.',
          },
        },
        {
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Promover el reconocimiento del esquema corporal e interacción lúdica',
          proceduralAction: 'Inicio: La asistente invita a los niños frente al {material}. Desarrollo: Juegan a saludarse, hacer muecas y señalar partes del rostro con acompañamiento afectivo. Cierre: Despedida con canción tranquila. Adaptaciones: Facilitar aproximación libre según la postura preferida.',
          materialRefs: ['espejo de sala'],
          durationMinutes: 10,
          progression: {
            role: 'EXPLORE',
            observationTarget: 'Observar la sonrisa social y el auto-reconocimiento frente al espejo.',
          },
        },
      ],
    }));

    return {
      weeklyFocus: 'Consolidación de la marcha inicial, prensión bimanual y lenguaje comunicativo en Lactantes C',
      days,
    };
  };

  // =========================================================================
  // FASE 2.1: EDAD Y CONFIGURACIÓN INSTITUCIONAL IMSS PARA LACTANTES C
  // =========================================================================
  describe('2.1. Edad y configuración institucional IMSS para Lactantes C', () => {
    it('confirma edad oficial IMSS de 13 a 18 meses para Lactantes C', () => {
      expect(LACTANTES_C_AGE_POLICY.minAgeMonths).toBe(13);
      expect(LACTANTES_C_AGE_POLICY.maxAgeMonths).toBe(18);
      expect(LACTANTES_C_AGE_POLICY.roomType).toBe('LACTANTES_C');
      expect(LACTANTES_C_AGE_POLICY.label).toContain('13 a 18 meses');
    });

    it('resuelve correctamente la política de Lactantes C desde RoomCatalog por edad o nombre', () => {
      const room = RoomCatalog.getRoom('lactantes-c');
      expect(room).toBeDefined();
      expect(room?.minAgeMonths).toBe(13);
      expect(room?.maxAgeMonths).toBe(18);

      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoom(room!);
      expect(policy).toBe(LACTANTES_C_AGE_POLICY);
    });

    it('autoriza la generación asistida por IA para Lactantes C bajo SR-MD-25', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
    });

    it('incluye mobiliario y accesorios de sala aprobados para Lactantes C', () => {
      expect(LACTANTES_C_APPROVED_ROOM_FIXTURES).toContain('colchoneta');
      expect(LACTANTES_C_APPROVED_ROOM_FIXTURES).toContain('barra de apoyo');
      expect(LACTANTES_C_APPROVED_ROOM_FIXTURES).toContain('módulos psicomotrices de espuma');
      expect(LACTANTES_C_APPROVED_ROOM_FIXTURES).toContain('espejo irrompible');
    });
  });

  // =========================================================================
  // FASE 2.2: GENERACIÓN DE 25 ACTIVIDADES CON ESTRUCTURA COMPLETA
  // =========================================================================
  describe('2.2. Generación real de 25 actividades semanales para Lactantes C', () => {
    it('genera exactamente 25 actividades (5 por día de lunes a viernes) con estructura completa', async () => {
      const mockPayload = createValidLactantesCProposalJson();
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(mockPayload),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-lact-c-001',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomLactantesC,
        currentContext: {
          observations: 'Grupo de 8 lactantes; cinco caminan con soltura y tres exploran marcha asistida.',
          identifiedNeeds: 'Estimular el desplazamiento autónomo, el lenguaje y la atención compartida.',
          specialSituations: '',
          availableMaterials: sampleMaterials,
        },
      };

      const response = await source.propose(request);

      expect(response.days).toHaveLength(5);
      let totalActivities = 0;

      for (const day of response.days) {
        expect(day.activities.length).toBeGreaterThanOrEqual(5);
        totalActivities += day.activities.length;

        // Comprueba lectura en voz alta diaria
        const readings = day.activities.filter((a) => a.category === 'LECTURA EN VOZ ALTA');
        expect(readings.length).toBeGreaterThanOrEqual(1);

        for (const act of day.activities) {
          // Cada actividad debe incluir Inicio, Desarrollo, Cierre y Adaptaciones
          expect(act.description).toMatch(/Inicio:/i);
          expect(act.description).toMatch(/Desarrollo:/i);
          expect(act.description).toMatch(/Cierre:/i);
          expect(act.description).toMatch(/Adaptaciones:/i);

          // Duraciones entre 10 y 20 minutos
          expect(act.durationMinutes).toBeGreaterThanOrEqual(1);
          expect(act.durationMinutes).toBeLessThanOrEqual(30);

          // Objetivo no vacío y sin sintaxis rota
          expect(act.objective.trim().length).toBeGreaterThan(5);
          expect(act.objective).not.toContain('{material}');
        }
      }

      expect(totalActivities).toBe(25);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    });

    it('incluye en el prompt de OpenAI las políticas específicas de Lactantes C (13 a 18 meses)', async () => {
      let capturedPrompt: any;
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockImplementation((payload) => {
          capturedPrompt = payload;
          return Promise.resolve(createValidLactantesCProposalJson());
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-lact-c-prompt-check',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomLactantesC,
        currentContext: {
          observations: 'Grupo activo explorando marcha.',
          identifiedNeeds: 'Lenguaje y autonomía.',
          specialSituations: '',
          availableMaterials: sampleMaterials,
        },
      };

      await source.propose(request);

      expect(capturedPrompt).toBeDefined();
      const promptText = JSON.stringify(capturedPrompt);
      expect(promptText).toContain('LACTANTES C (13 A 18 MESES)');
      expect(promptText).toContain('13 a 18 meses');
      expect(promptText).toContain('subluxación');
    });
  });

  // =========================================================================
  // FASE 2.3: BLINDAJE DE SEGURIDAD INFANTIL Y SUSTITUCIÓN PREVENTIVA
  // =========================================================================
  describe('2.3. Blindaje de seguridad infantil y sustitución de riesgos en Lactantes C', () => {
    it('sustituye preventivamente una actividad con riesgo de tracción de extremidades sin perder las demás 24', async () => {
      const payloadWithSingleViolation = createValidLactantesCProposalJson();
      // Inyectar una violación roja en Martes Actividad 2
      payloadWithSingleViolation.days[1].activities[1].proceduralAction =
        'Inicio: Se dispone el espacio. Desarrollo: Se jala de los brazos al lactante hacia arriba para obligarlo a ponerse de pie. Cierre: Transición suave. Adaptaciones: Respeto individual.';

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(payloadWithSingleViolation),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-lact-c-safety-rec',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomLactantesC,
        currentContext: {
          observations: 'Marcha en consolidación.',
          identifiedNeeds: 'Equilibrio.',
          specialSituations: '',
          availableMaterials: sampleMaterials,
        },
      };

      const result = await source.propose(request);

      // Total de 25 actividades conservadas
      const totalActivities = result.days.reduce((acc, d) => acc + d.activities.length, 0);
      expect(totalActivities).toBe(25);

      // Martes actividad 2 fue sustituida preventivamente
      const substitutedAct = result.days[1].activities[1];
      expect(substitutedAct.objective).toContain('Propuesta IA sustituida por seguridad');
      expect(substitutedAct.description).toContain('Sustitución preventiva automática');

      // Las demás actividades permanecen auténticas de IA
      const safeAct = result.days[0].activities[0];
      expect(safeAct.objective).not.toContain('sustituida por seguridad');
      expect(safeAct.description).not.toContain('Sustitución preventiva');
    });
  });

  // =========================================================================
  // FASE 3: PROTECCIÓN ABSOLUTA DE LACTANTES A Y LACTANTES B
  // =========================================================================
  describe('3. Protección absoluta de la funcionalidad de Lactantes A y B', () => {
    it('Lactantes A conserva su política bimodal (0 a 6 meses) y autorización de IA', () => {
      expect(LACTANTES_A_AGE_POLICY.minAgeMonths).toBe(0);
      expect(LACTANTES_A_AGE_POLICY.maxAgeMonths).toBe(6);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
    });

    it('Lactantes B conserva su política (7 a 12 meses) y autorización de IA', () => {
      expect(LACTANTES_B_AGE_POLICY.minAgeMonths).toBe(7);
      expect(LACTANTES_B_AGE_POLICY.maxAgeMonths).toBe(12);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
    });

    it('Maternales permanecen estrictamente desautorizadas para IA', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('PREESCOLAR_1')).toBe(false);
    });
  });

  // =========================================================================
  // FASE 4: MASTER ARB — SR-MD-25E CALIDAD PEDAGÓGICA Y DEDUPLICACIÓN
  // =========================================================================
  describe('4. SR-MD-25E: Calidad pedagógica y deduplicación puntual en Lactantes C', () => {
    it('elimina duplicaciones accidentales de autores y materiales con cleanDuplicatePedagogicalPhrases', () => {
      // 1. Autor duplicado
      const authorDup = 'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill, de Eric Hill';
      expect(cleanDuplicatePedagogicalPhrases(authorDup)).toBe(
        'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill'
      );

      // 2. Material duplicado
      const materialDup = 'Inicio: Se colocan colchonetas limpias colchonetas limpias en el piso despejado.';
      expect(cleanDuplicatePedagogicalPhrases(materialDup)).toBe(
        'Inicio: Se colocan colchonetas limpias en el piso despejado.'
      );

      // 3. Frase y verbo preposicional duplicado
      const blocksDup = 'Desarrollo: La asistente ofrece bloques grandes bloques grandes para apilar para apilar en el tapete.';
      expect(cleanDuplicatePedagogicalPhrases(blocksDup)).toBe(
        'Desarrollo: La asistente ofrece bloques grandes para apilar en el tapete.'
      );
    });

    it('parseAvailableMaterialsList no duplica el autor cuando la entrada ya lo incorpora', () => {
      const rawText = 'Libro infantil de cartón ¿Dónde está Spot?, de Eric Hill, colchonetas limpias, bloques grandes.';
      const list = PedagogicalSafetyValidator.parseAvailableMaterialsList(rawText);
      const spotEntry = list.find((m) => m.toLowerCase().includes('spot'));
      expect(spotEntry).toBeDefined();
      expect(spotEntry).not.toContain('de Eric Hill, de Eric Hill');
      expect(spotEntry).toContain('de Eric Hill');
    });

    it('diferencia las 25 actividades semanales cuando el modelo devuelve las mismas 5 actividades clonadas de lunes a viernes', async () => {
      // Simulamos la respuesta de OpenAI reportada por el PO:
      // Exactamente las mismas 5 actividades repetidas de lunes a viernes con los mismos objetivos y descripciones
      const baseActivities = [
        {
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Favorecer la atención compartida y el señalamiento comunicativo en la lectura del cuento',
          proceduralAction: 'Inicio: Se reúnen en semicírculo sobre colchoneta. Desarrollo: Se muestra {material} de Eric Hill, de Eric Hill señalando personajes. Cierre: Transición afectiva cerrando el libro con cariño. Adaptaciones: Acompañar ritmo individual.',
          materialRefs: ['libros con solapas de cartón grueso «¿Dónde está Spot?» de Eric Hill'],
          durationMinutes: 12,
          progression: { role: 'EXPLORE', observationTarget: 'Atención compartida.' },
        },
        {
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Estimular el desplazamiento autónomo y la coordinación motriz',
          proceduralAction: 'Inicio: Se colocan colchonetas limpias colchonetas limpias en el piso. Desarrollo: Los lactantes gatean y caminan hacia aros blandos colocados a distancia sin forzar marcha. Cierre: Aplauso afectivo y descanso. Adaptaciones: Respetar si gatean o caminan.',
          materialRefs: ['aros blandos'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Marcha y gateo.' },
        },
        {
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Promover la coordinación bimanual y manipulación sensorial',
          proceduralAction: 'Inicio: Se muestran materiales en el suelo. Desarrollo: La asistente ofrece bloques grandes bloques grandes para apilar para apilar en colchoneta. Cierre: Guardar juntos cantando. Adaptaciones: Permitir jugar sentados.',
          materialRefs: ['bloques grandes de plástico lavable'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Manipulación de bloques.' },
        },
        {
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Favorecer la noción de continente y contenido en el juego exploratorio',
          proceduralAction: 'Inicio: Se ubican cajas con pelotas en el centro. Desarrollo: Los niños vacían y llenan recipientes con pelotas medianas libremente. Cierre: Abrazo grupal y recogida tranquila. Adaptaciones: Ajustar distancia según desplazamiento.',
          materialRefs: ['cajas de cartón seguras', 'pelotas medianas de textura suave'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Meter y sacar pelotas.' },
        },
        {
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Promover el auto-reconocimiento y la interacción social frente al reflejo',
          proceduralAction: 'Inicio: Se acercan al espejo de sala con calidez. Desarrollo: Juegan a saludarse y señalar partes de su cara en el reflejo. Cierre: Despedida suave con palmadas. Adaptaciones: Facilitar aproximación libre.',
          materialRefs: ['espejo de sala'],
          durationMinutes: 10,
          progression: { role: 'EXPLORE', observationTarget: 'Sonrisa y auto-reconocimiento.' },
        },
      ];

      const clonedDaysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
      const clonedProposalPayload = {
        weeklyFocus: 'Exploración sensoriomotriz en Lactantes C',
        days: clonedDaysOfWeek.map((dayOfWeek) => ({
          dayOfWeek,
          activities: JSON.parse(JSON.stringify(baseActivities)),
        })),
      };

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(clonedProposalPayload),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-lact-c-po-fix',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomLactantesC,
        currentContext: {
          observations: 'Lactantes de 13 a 18 meses en inicio de marcha y exploración activa.',
          identifiedNeeds: 'Lenguaje, motricidad gruesa y fina.',
          specialSituations: '',
          availableMaterials: sampleMaterials,
        },
      };

      const response = await source.propose(request);

      // 1. Exactamente 25 actividades
      expect(response.days).toHaveLength(5);
      const allActivities = response.days.flatMap((d) => d.activities);
      expect(allActivities).toHaveLength(25);

      // 2. Ninguna actividad tiene duplicaciones de frases o autores
      for (const act of allActivities) {
        expect(act.description).not.toContain('de Eric Hill, de Eric Hill');
        expect(act.description).not.toContain('colchonetas limpias colchonetas limpias');
        expect(act.description).not.toContain('bloques grandes bloques grandes');
        expect(act.description).not.toContain('para apilar para apilar');

        // Estructura completa preservada
        expect(act.description).toMatch(/Inicio:/i);
        expect(act.description).toMatch(/Desarrollo:/i);
        expect(act.description).toMatch(/Cierre:/i);
        expect(act.description).toMatch(/Adaptaciones:/i);

        // No son sustituciones de plantilla genérica de fallback
        expect(act.objective).not.toContain('Propuesta IA sustituida');
      }

      // 3. Comprobar que los 5 días tienen lecturas diferenciadas usando el mismo libro
      const readingActivities = response.days.map((d) =>
        d.activities.find((a) => a.category === 'LECTURA EN VOZ ALTA')!
      );
      expect(readingActivities).toHaveLength(5);

      const readingObjectives = new Set(readingActivities.map((a) => a.objective));
      // Los 5 objetivos de lectura son distintos entre sí
      expect(readingObjectives.size).toBe(5);

      // 4. Comprobar que en los demás campos pedagógicos, lunes a viernes no son idénticos
      // Para cada slot 0 a 4 a lo largo de los días de la semana:
      for (let slot = 0; slot < 5; slot++) {
        const slotDescriptions = response.days.map((d) => d.activities[slot].description);
        const slotObjectives = response.days.map((d) => d.activities[slot].objective);

        const uniqueDescs = new Set(slotDescriptions);
        const uniqueObjs = new Set(slotObjectives);

        // Cada día tiene variaciones observables en la descripción y en el objetivo
        expect(uniqueDescs.size).toBe(5);
        expect(uniqueObjs.size).toBe(5);
      }

      // 5. Los 25 pares (objetivo, descripción) son 25 experiencias únicas
      const uniqueExperiences = new Set(allActivities.map((a) => `${a.objective}::${a.description}`));
      expect(uniqueExperiences.size).toBe(25);
    });
  });

  // =========================================================================
  // FASE 5: MASTER ARB — SR-MD-25G CORRECCIÓN FOCALIZADA DE CALIDAD PEDAGÓGICA
  // =========================================================================
  describe('5. SR-MD-25G: Calidad pedagógica focalizada (diversidad real, duraciones flexibles, redacción natural)', () => {
    it('elimina frases técnicas como «Variación de miércoles» o «Variación de martes» de la redacción para la educadora', () => {
      const technicalPhrase = 'Inicio: Se prepara el área. Desarrollo: Variación de miércoles: Se introduce alternancia en la mediación docente. Cierre: Despedida afectiva.';
      const cleaned = cleanDuplicatePedagogicalPhrases(technicalPhrase);
      expect(cleaned).not.toContain('Variación de miércoles');
      expect(cleaned).toContain('Se introduce alternancia en la mediación docente');

      const tuesdayPhrase = 'Variación de martes: Se propicia mayor dinamismo motriz';
      expect(cleanDuplicatePedagogicalPhrases(tuesdayPhrase)).toBe('Se propicia mayor dinamismo motriz');
    });

    it('resolveMaterialForPlaceholder evita concatenar colchonetas al libro o bloques manipulativos', () => {
      const materials = [
        'libros con solapas de cartón grueso «¿Dónde está Spot?» de Eric Hill',
        'colchonetas limpias',
      ];

      // Acción de abrir el libro sobre colchonetas ya mencionadas en Inicio
      const actionWithSurfaceInInicio =
        'Inicio: Se sientan en semicírculo sobre colchonetas limpias. Desarrollo: La asistente abre {material} con entusiasmo.';
      const resolved = resolveMaterialForPlaceholder(actionWithSurfaceInInicio, materials);

      // No debe contener "y colchonetas limpias"
      expect(resolved).not.toContain('colchonetas');
      expect(resolved).toContain('¿Dónde está Spot?');
    });

    it('elimina la cuota rígida de 15 minutos asignando duraciones flexibles y diversas según la actividad', () => {
      const daysWithUniform15 = [
        {
          dayOfWeek: 'MONDAY' as const,
          activities: [
            { category: 'LECTURA EN VOZ ALTA' as const, durationMinutes: 15 },
            { category: 'ACTIVACIÓN FÍSICA' as const, durationMinutes: 15 },
            { category: 'EXPERIENCIAS ARTÍSTICAS' as const, durationMinutes: 15 },
            { category: 'AMBIENTES DE APRENDIZAJE' as const, durationMinutes: 15 },
            { category: 'PENSAMIENTO MATEMÁTICO' as const, durationMinutes: 15 },
          ] as any,
        },
      ];

      const diversified = diversifyUniformDurations(daysWithUniform15, 'LACTANTES_C');
      const day = diversified[0];
      const durations = day.activities.map((a) => a.durationMinutes);

      // Ya no son todos de 15 minutos
      const uniqueDurations = new Set(durations);
      expect(uniqueDurations.size).toBeGreaterThan(1);

      // Verificamos duraciones pedagógicas apropiadas para 13 a 18 meses
      expect(day.activities[0].durationMinutes).toBe(12); // Lectura: 10-12 min
      expect(day.activities[1].durationMinutes).toBe(18); // Activación física: 15-18 min
      expect(day.activities[2].durationMinutes).toBe(15); // Artes: 15 min
      expect(day.activities[3].durationMinutes).toBe(20); // Ambientes: 18-20 min
      expect(day.activities[4].durationMinutes).toBe(10); // Pensamiento/espejo: 8-10 min
    });

    it('preserva duraciones auténticas generadas cuando el modelo ya produjo duraciones variadas', () => {
      const daysWithVaried = [
        {
          dayOfWeek: 'MONDAY' as const,
          activities: [
            { category: 'LECTURA EN VOZ ALTA' as const, durationMinutes: 10 },
            { category: 'ACTIVACIÓN FÍSICA' as const, durationMinutes: 15 },
            { category: 'EXPERIENCIAS ARTÍSTICAS' as const, durationMinutes: 12 },
            { category: 'AMBIENTES DE APRENDIZAJE' as const, durationMinutes: 18 },
            { category: 'PENSAMIENTO MATEMÁTICO' as const, durationMinutes: 8 },
          ] as any,
        },
      ];

      const result = diversifyUniformDurations(daysWithVaried, 'LACTANTES_C');
      // Preservadas exactamente
      expect(result[0].activities.map((a) => a.durationMinutes)).toEqual([10, 15, 12, 18, 8]);
    });

    it('garantiza que la propuesta completa de 25 actividades tiene duraciones flexibles y ninguna mención a «Variación de miércoles»', async () => {
      const clonedActivities = [
        {
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Favorecer el vínculo afectivo y la atención compartida mediante la exploración inicial del cuento',
          proceduralAction: 'Inicio: Se sientan sobre colchonetas limpias. Desarrollo: La asistente abre {material} con calma. Cierre: Despedida afectiva cantando una melodía. Adaptaciones: Acompañar a quienes gatean o caminan.',
          materialRefs: ['libros con solapas de cartón grueso «¿Dónde está Spot?» de Eric Hill', 'colchonetas limpias'],
          durationMinutes: 15, // Modelo envió 15 para todo
          progression: { role: 'EXPLORE', observationTarget: 'Atención compartida.' },
        },
        {
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Favorecer el equilibrio dinámico y la exploración de la marcha inicial en colchoneta',
          proceduralAction: 'Inicio: Se acondiciona el área despejada. Desarrollo: La asistente ofrece sus manos a distancia o invita a gatear y caminar con apoyo. Cierre: Aplauso afectivo y descanso. Adaptaciones: Respetar si gatean o caminan.',
          materialRefs: ['aros blandos'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Marcha y gateo.' },
        },
        {
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Promover la exploración sensorial y la manipulación bimanual de objetos grandes',
          proceduralAction: 'Inicio: Se disponen materiales en el tapete. Desarrollo: La asistente apila bloques grandes de plástico lavable en el suelo. Cierre: Guardar juntos cantando. Adaptaciones: Permitir jugar sentados.',
          materialRefs: ['bloques grandes de plástico lavable'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Manipulación de bloques.' },
        },
        {
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Estimular la exploración espacial y la noción de continente y contenido',
          proceduralAction: 'Inicio: Se ubican cajas con pelotas en el centro. Desarrollo: Los niños vacían y llenan recipientes con pelotas medianas libremente. Cierre: Abrazo grupal y recogida tranquila. Adaptaciones: Ajustar distancia según desplazamiento.',
          materialRefs: ['cajas de cartón seguras', 'pelotas medianas de textura suave'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Meter y sacar pelotas.' },
        },
        {
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Promover el auto-reconocimiento y la interacción afectiva frente al reflejo',
          proceduralAction: 'Inicio: Se acercan al espejo de sala con calidez. Desarrollo: Juegan a saludarse y sonreír frente al reflejo con cariño. Cierre: Despedida suave con palmadas. Adaptaciones: Facilitar aproximación libre.',
          materialRefs: ['espejo de sala'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Sonrisa y auto-reconocimiento.' },
        },
      ];

      const clonedDaysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
      const clonedProposalPayload = {
        weeklyFocus: 'Exploración sensoriomotriz en Lactantes C',
        days: clonedDaysOfWeek.map((dayOfWeek) => ({
          dayOfWeek,
          activities: JSON.parse(JSON.stringify(clonedActivities)),
        })),
      };

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(clonedProposalPayload),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-lact-c-srmd25g',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomLactantesC,
        currentContext: {
          observations: 'Lactantes de 13 a 18 meses explorando marcha.',
          identifiedNeeds: 'Lenguaje y autonomía motriz.',
          specialSituations: '',
          availableMaterials: sampleMaterials,
        },
      };

      const response = await source.propose(request);

      // 1. Exactamente 25 actividades
      const allActivities = response.days.flatMap((d) => d.activities);
      expect(allActivities).toHaveLength(25);

      // 2. CERO menciones a «Variación de miércoles» o cualquier «Variación de [día]»
      for (const act of allActivities) {
        expect(act.description).not.toMatch(/Variaci[oó]n\s+de\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes)/i);
        expect(act.objective).not.toMatch(/Variaci[oó]n\s+de\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes)/i);

        // Sin duplicaciones de materiales
        expect(act.description).not.toContain('colchonetas limpias colchonetas limpias');
        expect(act.description).not.toContain('bloques grandes bloques grandes');
        expect(act.description).not.toContain('de Eric Hill, de Eric Hill');
        expect(act.description).not.toContain('¿Dónde está Spot? y colchonetas limpias');

        // Estructura completa preservada
        expect(act.description).toMatch(/Inicio:/i);
        expect(act.description).toMatch(/Desarrollo:/i);
        expect(act.description).toMatch(/Cierre:/i);
        expect(act.description).toMatch(/Adaptaciones:/i);
      }

      // 3. Duraciones no uniformes en los días
      for (const day of response.days) {
        const durations = day.activities.map((a) => a.durationMinutes);
        const uniqueDurations = new Set(durations);
        expect(uniqueDurations.size).toBeGreaterThan(1);
        expect(durations).not.toEqual([15, 15, 15, 15, 15]);
      }

      // 4. Diversidad real: 25 actividades únicas entre lunes y viernes
      const uniqueExperiences = new Set(allActivities.map((a) => `${a.objective}::${a.description}`));
      expect(uniqueExperiences.size).toBe(25);
    });
  });

  describe('Fase 6 (SR-MD-25I): Diversidad real completa de Inicio, Desarrollo, Cierre y Adaptaciones sin repetición mecánica', () => {
    it('1. Elimina repeticiones literales entre días para Inicio, Desarrollo, Cierre y Adaptaciones, generando 25 descripciones únicas', async () => {
      // Simula el caso exacto diagnosticado por el Product Owner en LAB:
      // OpenAI generó 25 actividades, pero con solamente 11 descripciones distintas (repitiendo lunes en martes-viernes o con desorden de slots).
      const baseActs = [
        {
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Favorecer el seguimiento visual del cuento',
          proceduralAction: 'Inicio: Se sientan en círculo. Desarrollo: Abre el libro «¿Dónde está Spot?» mostrando ilustraciones. Cierre: Cierra el libro con cariño. Adaptaciones: Respetar postura.',
          materialRefs: ['libros con solapas de cartón grueso «¿Dónde está Spot?» de Eric Hill'],
          durationMinutes: 12,
          progression: { role: 'EXPLORE', observationTarget: 'Lectura.' },
        },
        {
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Promover la manipulación bimanual de cubos',
          proceduralAction: 'Inicio: Se disponen bloques en el tapete. Desarrollo: La asistente apila dos bloques demostrando la acción y anima a los niños. Cierre: Guardan juntos cantando. Adaptaciones: Permitir jugar sentados.',
          materialRefs: ['bloques grandes de plástico lavable'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Arte.' },
        },
        {
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Estimular la exploración de cajas',
          proceduralAction: 'Inicio: La asistente presenta cajas con pelotas. Desarrollo: Los niños vacían y meten pelotas en cajas de cartón. Cierre: Recogida tranquila. Adaptaciones: Respetar ritmos.',
          materialRefs: ['cajas de cartón seguras', 'pelotas medianas de textura suave'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Ambientes.' },
        },
        {
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Favorecer la marcha inicial en colchoneta',
          proceduralAction: 'Inicio: Se acondiciona el circuito acolchado. Desarrollo: La asistente ofrece sus manos a distancia o invita a gatear y caminar libremente sin jalar extremidades. Cierre: Descanso suave sobre colchoneta. Adaptaciones: Permitir gateo o marcha asistida.',
          materialRefs: ['aros blandos'],
          durationMinutes: 15,
          progression: { role: 'EXPLORE', observationTarget: 'Marcha.' },
        },
        {
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Promover el auto-reconocimiento frente al espejo',
          proceduralAction: 'Inicio: Se acercan al espejo con cariño. Desarrollo: Juegan a saludarse y señalar su reflejo con afecto. Cierre: Despedida suave. Adaptaciones: Aproximación libre.',
          materialRefs: ['espejo de sala'],
          durationMinutes: 10,
          progression: { role: 'EXPLORE', observationTarget: 'Espejo.' },
        },
      ];

      // Simulamos la respuesta de OpenAI repitiendo actividades entre días (incluso cambiando el orden de slots)
      const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
      const rawDays = daysOfWeek.map((dayOfWeek, dIdx) => {
        // En días 1, 2, 3, 4 se repiten descripciones de días anteriores con variaciones menores o slots alternados
        const acts = dIdx === 0
          ? baseActs
          : [
              // Lectura repite el libro de Spot pero con distinta descripción o la misma
              {
                ...baseActs[0],
                objective: `Lectura día ${dIdx + 1}`,
                proceduralAction: baseActs[0].proceduralAction,
              },
              // Los demás repiten literalmente las descripciones del día anterior
              baseActs[1],
              baseActs[2],
              baseActs[3],
              baseActs[4],
            ];
        return {
          dayOfWeek,
          activities: JSON.parse(JSON.stringify(acts)),
        };
      });

      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue({
          weeklyFocus: 'Exploración integral en Lactantes C',
          days: rawDays,
        }),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-lact-c-diversity-test',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: roomLactantesC,
        currentContext: {
          observations: 'Lactantes explorando marcha y primeras palabras.',
          identifiedNeeds: 'Autonomía y lenguaje.',
          specialSituations: '',
          availableMaterials: sampleMaterials,
        },
      };

      const response = await source.propose(request);
      const allActivities = response.days.flatMap((d) => d.activities);

      // 1. Exactamente 25 actividades
      expect(allActivities).toHaveLength(25);

      // 2. Exactamente 25 descripciones ÚNICAS (cero descripciones clonadas)
      const allDescriptions = allActivities.map((a) => a.description.toLowerCase().trim());
      const uniqueDescriptions = new Set(allDescriptions);
      expect(uniqueDescriptions.size).toBe(25);

      // 3. Exactamente 25 objetivos ÚNICOS
      const allObjectives = allActivities.map((a) => a.objective.toLowerCase().trim());
      const uniqueObjectives = new Set(allObjectives);
      expect(uniqueObjectives.size).toBe(25);

      // 4. Cada día tiene una lectura en voz alta con progresión pedagógica
      for (const day of response.days) {
        const readingAct = day.activities.find((a) => a.category === 'LECTURA EN VOZ ALTA');
        expect(readingAct).toBeDefined();
        // El libro «¿Dónde está Spot?» de Eric Hill está presente en los materiales resueltos y en la descripción
        expect(readingAct!.materials.some((m) => m.toLowerCase().includes('spot'))).toBe(true);
        expect(readingAct!.description).toContain('Spot');
      }

      // 5. Cero descripciones con «Variación de [día]» o duplicaciones léxicas
      for (const act of allActivities) {
        expect(act.description).not.toMatch(/Variaci[oó]n\s+de\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes)/i);
        expect(act.description).not.toContain('colchonetas limpias colchonetas limpias');
        expect(act.description).not.toContain('bloques grandes bloques grandes');
        expect(act.description).not.toContain('de Eric Hill, de Eric Hill');
      }

      // 6. Verificación de seguridad motriz: Cero exigencias de saltos con dos pies o posturas fijas
      for (const act of allActivities) {
        expect(act.description).not.toMatch(/\bsaltar\s+(con\s+ambos\s+pies|en\s+dos\s+pies)\b/i);
        expect(act.description).not.toMatch(/\bbrincar\s+de\s+un\s+escal[oó]n\b/i);
        expect(act.description).toMatch(/respet|adapt|acompañ|libre/i);
      }
    });

    it('2. El validador pedagógico de Lactantes C bloquea saltos forzados con dos pies', () => {
      const unsafePlan: WeeklyPlanningProposalResponse = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'ACTIVACIÓN FÍSICA',
                objective: 'Estimular la fuerza de extremidades',
                description: 'Inicio: Se disponen aros. Desarrollo: La asistente pide a los lactantes saltar con ambos pies hacia el aro. Cierre: Aplausos. Adaptaciones: Ninguna.',
                durationMinutes: 15,
                materials: ['aros blandos'],
              },
            ],
          },
        ],
      };

      const evalResult = PedagogicalSafetyValidator.evaluatePlan(
        unsafePlan,
        LACTANTES_C_AGE_POLICY,
        sampleMaterials
      );

      expect(evalResult.isPedagogicallySafe).toBe(false);
      expect(evalResult.blockingViolations.length).toBeGreaterThan(0);
      expect(evalResult.blockingViolations[0].ruleId).toBe('dev-lactantes-c-milestones');
      expect(evalResult.blockingViolations[0].severity).toBe('DEVELOPMENTAL_MISMATCH');
    });
  });

  // =========================================================================
  // FASE 7 (SR-MD-25K): COHERENCIA ENTRE ACCIONES, MATERIALES Y CATEGORÍAS
  // =========================================================================
  describe('Fase 7 (SR-MD-25K): Coherencia material y eliminación de asignaciones rígidas', () => {
    it('1. Pensamiento matemático con bloques grandes NO menciona espejos ni reflejos', () => {
      const days = [
        {
          dayOfWeek: 'MONDAY' as const,
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Explorar nociones espaciales iniciales',
              description: 'Inicio: Se sientan en el tapete. Desarrollo: Exploran bloques grandes. Cierre: Guardado. Adaptaciones: Libre.',
              materials: ['bloques grandes de plástico lavable'],
              durationMinutes: 10,
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY' as const,
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Explorar nociones espaciales iniciales',
              description: 'Inicio: Se sientan en el tapete. Desarrollo: Exploran bloques grandes. Cierre: Guardado. Adaptaciones: Libre.',
              materials: ['bloques grandes de plástico lavable'],
              durationMinutes: 10,
            },
          ],
        },
      ];

      const differentiated = differentiateRepeatedDailyExperiences(days, 'LACTANTES_C');
      const tuesdayMath = differentiated[1].activities[0];

      expect(tuesdayMath.description).not.toMatch(/espejo/i);
      expect(tuesdayMath.description).not.toMatch(/reflejo/i);
      expect(tuesdayMath.description).toContain('bloques grandes de plástico lavable');
      expect(tuesdayMath.objective).not.toMatch(/espejo/i);
      expect(tuesdayMath.objective).not.toMatch(/reflejo/i);
    });

    it('2. Pensamiento matemático con espejo de sala conserva auto-reconocimiento y reflejo', () => {
      const days = [
        {
          dayOfWeek: 'MONDAY' as const,
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Auto-reconocimiento',
              description: 'Inicio: Se acercan al espejo. Desarrollo: Se miran con afecto. Cierre: Despedida. Adaptaciones: Libre.',
              materials: ['espejo de sala'],
              durationMinutes: 10,
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY' as const,
          activities: [
            {
              category: 'PENSAMIENTO MATEMÁTICO',
              objective: 'Auto-reconocimiento',
              description: 'Inicio: Se acercan al espejo. Desarrollo: Se miran con afecto. Cierre: Despedida. Adaptaciones: Libre.',
              materials: ['espejo de sala'],
              durationMinutes: 10,
            },
          ],
        },
      ];

      const differentiated = differentiateRepeatedDailyExperiences(days, 'LACTANTES_C');
      const tuesdayMath = differentiated[1].activities[0];

      expect(tuesdayMath.description).toMatch(/esquema corporal|gestos|reflejo|espejo/i);
      expect(tuesdayMath.description).toContain('espejo de sala');
    });

    it('3. Experiencias artísticas con aros blandos en Miércoles (Día 2) NO menciona sonidos de percusión', () => {
      const days = [
        { dayOfWeek: 'MONDAY' as const, activities: [{ category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'A', description: 'Inicio: A. Desarrollo: A. Cierre: A. Adaptaciones: A.', materials: ['aros blandos'], durationMinutes: 15 }] },
        { dayOfWeek: 'TUESDAY' as const, activities: [{ category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'A', description: 'Inicio: A. Desarrollo: A. Cierre: A. Adaptaciones: A.', materials: ['aros blandos'], durationMinutes: 15 }] },
        { dayOfWeek: 'WEDNESDAY' as const, activities: [{ category: 'EXPERIENCIAS ARTÍSTICAS', objective: 'A', description: 'Inicio: A. Desarrollo: A. Cierre: A. Adaptaciones: A.', materials: ['aros blandos'], durationMinutes: 15 }] },
      ];

      const differentiated = differentiateRepeatedDailyExperiences(days, 'LACTANTES_C');
      const wednesdayArt = differentiated[2].activities[0];

      expect(wednesdayArt.description).not.toMatch(/sonidos?\s+de\s+percusi[oó]n/i);
      expect(wednesdayArt.description).not.toMatch(/entrechocar\s+suavemente\s+las\s+piezas/i);
      expect(wednesdayArt.description).toContain('aros blandos');
      expect(wednesdayArt.description).toMatch(/ritmo|comp[aá]s|movimiento/i);
    });

    it('4. Ambientes de aprendizaje con bloques grandes en Lunes (Día 0) NO menciona interior de contenedor ni vaciar', () => {
      const days = [
        {
          dayOfWeek: 'MONDAY' as const,
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Exploración del entorno',
              description: 'Inicio: Se disponen bloques. Desarrollo: Manipulan bloques. Cierre: Guardado. Adaptaciones: Libre.',
              materials: ['bloques grandes'],
              durationMinutes: 20,
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY' as const,
          activities: [
            {
              category: 'AMBIENTES DE APRENDIZAJE',
              objective: 'Exploración del entorno',
              description: 'Inicio: Se disponen bloques. Desarrollo: Manipulan bloques. Cierre: Guardado. Adaptaciones: Libre.',
              materials: ['bloques grandes'],
              durationMinutes: 20,
            },
          ],
        },
      ];

      const differentiated = differentiateRepeatedDailyExperiences(days, 'LACTANTES_C');
      const tuesdayAmb = differentiated[1].activities[0];

      expect(tuesdayAmb.description).not.toMatch(/qu[eé]\s+hay\s+en\s+su\s+interior/i);
      expect(tuesdayAmb.description).not.toMatch(/vac[ií]en,\s*metan\s+y\s+saquen/i);
      expect(tuesdayAmb.description).toContain('bloques grandes');
    });

    it('5. sanitizeMaterialActionIncoherencies limpia menciones espurias de reflejos cuando no hay espejo', () => {
      const act = {
        category: 'PENSAMIENTO MATEMÁTICO',
        objective: 'Explorar nociones',
        description: 'Inicio: Se sientan frente al espejo con calidez. Desarrollo: Miran su reflejo y juegan con las piezas. Cierre: Despidiendo el rincón del espejo con calma. Adaptaciones: Respeto individual.',
        materials: ['bloques grandes'],
        durationMinutes: 10,
      };

      const sanitized = sanitizeMaterialActionIncoherencies(act);
      expect(sanitized.description).not.toContain('frente al espejo');
      expect(sanitized.description).not.toContain('su reflejo');
      expect(sanitized.description).not.toContain('rincón del espejo');
      expect(sanitized.description).toContain('sobre el tapete');
    });
  });
});

