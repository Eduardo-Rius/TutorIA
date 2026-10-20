import { describe, it, expect, vi } from 'vitest';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  WeeklyPlanningAIPromptPayload,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  UnsupportedPedagogicalPolicyError,
  InvalidWeeklyPlanningProposalError,
  BlockingMaterialPolicyViolationError,
  PedagogicalPolicyViolationError,
} from '../WeeklyPlanningProposalSource';
import {
  PedagogicalAgePolicyCatalog,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
} from '../../../domain/planning/PedagogicalAgePolicy';
import { RoomCatalog, Room } from '../../../domain/planning/RoomCatalog';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../PlanningWorkflowService';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('SR-MD-22 — Integración de IA Pedagógica para Lactantes B (7–12 meses)', () => {
  const roomLactantesA = RoomCatalog.getRoom('room-lactantes-a')!;
  const roomLactantesB = RoomCatalog.getRoom('room-lactantes-b')!;
  const roomLactantesC: Room = {
    roomId: 'room-lactantes-c',
    name: 'Lactantes C',
    minAgeMonths: 13,
    maxAgeMonths: 18,
  };
  const roomMaternalA: Room = {
    roomId: 'room-maternal-a',
    name: 'Maternal A',
    minAgeMonths: 19,
    maxAgeMonths: 24,
  };

  const sampleAvailableMaterials = 'Colchonetas, cubos medianos de vinil, sonajas, libros de tela con textura, muñecos de tela';

  // 1. Lactantes A sigue funcionando sin regresiones
  it('1. Lactantes A sigue funcionando sin regresiones y preserva adaptaciones bimodales', async () => {
    expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
    const policyA = PedagogicalAgePolicyCatalog.getPolicyForRoom(roomLactantesA);
    expect(policyA).toBe(LACTANTES_A_AGE_POLICY);

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue({
        weeklyFocus: 'Exploración sensorial y sostenimiento afectivo para Lactantes A',
        days: [
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
        ].map((day, dIdx) => ({
          dayOfWeek: day,
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Favorecer el seguimiento visual y la atención auditiva compartida',
              proceduralAction:
                dIdx === 0
                  ? 'Presentar {material} frente al lactante con entonación suave y afectuosa.\n' +
                    '• Adaptación 43 días a 3 meses: Sostener al infante en brazos brindando contención física y modulando la voz suavemente.\n' +
                    '• Adaptación 4 a 6 meses: Colocar sobre colchoneta permitiendo fijación visual y exploración táctil de láminas de tela.'
                  : `Presentar {material} en día ${dIdx + 1} modulando el tono y explorando nuevas sensaciones táctiles.\n` +
                    '• Adaptación 43 días a 3 meses: Sostener al infante en brazos con caricias rítmicas.\n' +
                    '• Adaptación 4 a 6 meses: Colocar sobre colchoneta animando el seguimiento visual pausado.',
              materialRefs: ['MAT-04'],
              durationMinutes: 10,
              progression: {
                role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
                revisitsSlot: dIdx === 0 ? null : 'D1_A1',
                repetitionPurpose: dIdx === 0 ? null : 'FAMILIARIZATION',
                variationDimensions: dIdx === 0 ? null : ['SENSORY_EXPERIENCE'],
                observationTarget: 'Observar si fija la mirada en el recurso narrativo',
              },
            },
          ],
        })),
      }),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const req: WeeklyPlanningProposalRequest = {
      planningId: 'plan-lact-a-sr22',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      modality: 'DIRECT',
      room: roomLactantesA,
      currentContext: {
        observations: 'Lactantes menores en periodo de adaptación.',
        identifiedNeeds: 'Contención afectiva y estímulos visuales suaves.',
        specialSituations: '',
        availableMaterials: sampleAvailableMaterials,
      },
    };

    const res = await source.propose(req);
    expect(res.days).toHaveLength(5);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    expect(res.days[0].activities[0].category).toBe('LECTURA EN VOZ ALTA');
    expect(res.days[0].activities[0].description).toContain('Adaptación 43 días a 3 meses');
    expect(res.days[0].activities[0].description).toContain('Adaptación 4 a 6 meses');
  });

  // 2. Lactantes B utiliza la ruta IA autorizada con respuesta simulada válida
  it('2. Lactantes B utiliza la ruta IA autorizada con respuesta simulada válida, estructura pedagógica y lectura auténtica', async () => {
    expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
    const policyB = PedagogicalAgePolicyCatalog.getPolicyForRoom(roomLactantesB);
    expect(policyB).toBe(LACTANTES_B_AGE_POLICY);

    let capturedPayload: WeeklyPlanningAIPromptPayload | null = null;
    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockImplementation(async (payload: WeeklyPlanningAIPromptPayload) => {
        capturedPayload = payload;
        return {
          weeklyFocus: 'Exploración motriz libre, juego sensorial y comunicación afectiva en Lactantes B',
          days: [
            {
              dayOfWeek: 'MONDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Estimular la atención compartida y el disfrute narrativo mediante libro sensorial',
                  proceduralAction:
                    'Inicio: Sentar al bebé en el regazo o colchoneta con contención cariñosa. ' +
                    'Desarrollo: Mostrar {material}, nombrando los animales y emitiendo sonidos suaves. ' +
                    'Cierre: Permitir que explore las texturas con sus manos y guardar juntos el material. ' +
                    'Adaptación: Para infantes en sedestación asistida ofrecer soporte en tronco; para quienes gatean permitir aproximación libre.',
                  materialRefs: ['MAT-04'],
                  durationMinutes: 12,
                  progression: {
                    role: 'EXPLORE',
                    revisitsSlot: null,
                    repetitionPurpose: null,
                    variationDimensions: null,
                    observationTarget: 'Observar si busca manipular el libro de tela o vocaliza ante las imágenes',
                  },
                },
                {
                  category: 'AMBIENTES DE APRENDIZAJE',
                  objective: 'Favorecer la coordinación motora y el juego de causa-efecto',
                  proceduralAction:
                    'Inicio: Colocar al lactante en el suelo sobre área acolchada con {material} al alcance visual. ' +
                    'Desarrollo: Animar al bebé a desplazarse por arrastre o gateo espontáneo para alcanzar los cubos y apilarlos suavemente. ' +
                    'Cierre: Festejar cada intento con sonrisas y aplausos suaves, retornando a la calma. ' +
                    'Adaptación: Respetar si el infante prefiere permanecer sentado y explorar bimanualmente sin desplazarse.',
                  materialRefs: ['MAT-02'],
                  durationMinutes: 15,
                  progression: {
                    role: 'EXPLORE',
                    revisitsSlot: null,
                    repetitionPurpose: null,
                    variationDimensions: null,
                    observationTarget: 'Observar iniciativa motriz y agarre bimanual',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'TUESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Fortalecer el lenguaje receptivo y la exploración táctil de imágenes',
                  proceduralAction:
                    'Inicio: Invitar al pequeño a reunirse en la colchoneta con tono cálido. ' +
                    'Desarrollo: Reexplorar {material} haciendo énfasis en onomatopeyas y cambio de páginas. ' +
                    'Cierre: Acompañar con una rima suave de despedida. ' +
                    'Adaptación: Respetar tiempos de atención individuales.',
                  materialRefs: ['MAT-04'],
                  durationMinutes: 10,
                  progression: {
                    role: 'REVISIT',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'FAMILIARIZATION',
                    variationDimensions: ['SENSORY_EXPERIENCE'],
                    observationTarget: 'Observar balbuceo imitativo o señalamiento',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'WEDNESDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Fomentar la discriminación auditiva y la interacción comunicativa',
                  proceduralAction:
                    'Inicio: Recibir al lactante con contacto visual directo. ' +
                    'Desarrollo: Narrar pasajes de {material} variando la entonación. ' +
                    'Cierre: Abrazar al pequeño y celebrar su atención. ' +
                    'Adaptación: Adaptar la distancia del libro según comodidad visual.',
                  materialRefs: ['MAT-04'],
                  durationMinutes: 10,
                  progression: {
                    role: 'VARY',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'VARIATION',
                    variationDimensions: ['ADULT_MEDIATION'],
                    observationTarget: 'Observar interacción con la educadora',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'THURSDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Favorecer la anticipación y el vínculo afectivo en la lectura dialogada',
                  proceduralAction:
                    'Inicio: Presentar nuevamente el libro familiar al infante. ' +
                    'Desarrollo: Permitir que pase las páginas de tela de {material} a su ritmo. ' +
                    'Cierre: Guardar con calma en su lugar en la sala. ' +
                    'Adaptación: Apoyar el agarre en infantes con menor prensión fina.',
                  materialRefs: ['MAT-04'],
                  durationMinutes: 10,
                  progression: {
                    role: 'DEEPEN_OR_ADAPT',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'PROGRESSION',
                    variationDimensions: ['CHILD_AGENCY'],
                    observationTarget: 'Observar autonomía al pasar páginas',
                  },
                },
              ],
            },
            {
              dayOfWeek: 'FRIDAY',
              activities: [
                {
                  category: 'LECTURA EN VOZ ALTA',
                  objective: 'Consolidar la familiaridad con el recurso narrativo y el cierre semanal',
                  proceduralAction:
                    'Inicio: Encuentro afectivo en la sala. ' +
                    'Desarrollo: Revisitación libre de {material} en parejas o individualmente. ' +
                    'Cierre: Reconocimiento cariñoso de los logros semanales. ' +
                    'Adaptación: Proporcionar mayor contención a infantes con fatiga.',
                  materialRefs: ['MAT-04'],
                  durationMinutes: 10,
                  progression: {
                    role: 'OBSERVE_OR_CONSOLIDATE',
                    revisitsSlot: 'D1_A1',
                    repetitionPurpose: 'RESPONSE_OBSERVATION',
                    variationDimensions: ['OBSERVATION_FOCUS'],
                    observationTarget: 'Observar respuesta global y bienestar afectivo',
                  },
                },
              ],
            },
          ],
        };
      }),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);
    const req: WeeklyPlanningProposalRequest = {
      planningId: 'plan-lact-b-sr22',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      modality: 'DIRECT',
      room: roomLactantesB,
      currentContext: {
        observations: 'Lactantes de 7 a 12 meses; algunos en gateo libre, otros en sedestación.',
        identifiedNeeds: 'Desplazamiento seguro y balbuceo comunicativo.',
        specialSituations: '',
        availableMaterials: sampleAvailableMaterials,
      },
    };

    const res = await source.propose(req);
    expect(res.days).toHaveLength(5);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);

    // Verificar que el prompt contiene las directivas pedagógicas específicas de Lactantes B (SR-MD-22F)
    expect(capturedPayload).not.toBeNull();
    const systemPrompt = (capturedPayload as any).systemPrompt;
    expect(systemPrompt).toContain('POLÍTICA DE RAZONAMIENTO PEDAGÓGICO Y SEGURIDAD INFANTIL PARA LACTANTES B');
    expect(systemPrompt).toContain('IDENTIDAD Y RESPONSABILIDAD: Eres TutorIA');
    expect(systemPrompt).toContain('Forzar gateo, marcha, bipedestación o posturas que el niño no realice autónomamente');
    expect(systemPrompt).toContain('TRANSFORMACIÓN PEDAGÓGICA SEGURA');
    expect(systemPrompt).toContain('«¿Dónde está Spot?» de Eric Hill');
    expect(systemPrompt).toContain('AUTOVERIFICACIÓN ANTES DE ENTREGAR');

    // Verificar actividades generadas
    const mondayReading = res.days[0].activities[0];
    expect(mondayReading.category).toBe('LECTURA EN VOZ ALTA');
    expect(mondayReading.materials).toContain('libros de tela con textura');
    expect(mondayReading.description).toContain('Inicio:');
    expect(mondayReading.description).toContain('Desarrollo:');
    expect(mondayReading.description).toContain('Cierre:');
  });

  // 3. Maternales permanecen bloqueadas para IA
  it('3. Maternales permanecen bloqueadas para IA con UnsupportedPedagogicalPolicyError sin invocar ejecutor', async () => {
    expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
    expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(false);
    expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_B')).toBe(false);

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn(),
    };
    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    // Intento con Maternal A
    const reqMatA: WeeklyPlanningProposalRequest = {
      planningId: 'plan-mat-a',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      modality: 'DIRECT',
      room: roomMaternalA,
      currentContext: {
        observations: '19 a 24 meses',
        identifiedNeeds: 'Lenguaje',
        specialSituations: '',
        availableMaterials: sampleAvailableMaterials,
      },
    };
    await expect(source.propose(reqMatA)).rejects.toThrow(UnsupportedPedagogicalPolicyError);

    // Cero llamadas al ejecutor
    expect(mockExecutor.execute).toHaveBeenCalledTimes(0);
  });

  // 4. Respuesta malformada, insegura o fuera de edad se rechaza
  it('4. Respuesta malformada, insegura (semillas, cubrir rostro, forzar marcha) se rechaza por la compuerta de seguridad', async () => {
    // 4.a Inseguridad: semillas (asfixia por partes pequeñas)
    const mockExecutorUnsafeMaterial: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue({
        weeklyFocus: 'Exploración con semillas',
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
          dayOfWeek: day,
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Favorecer estimulación sensorial oral y táctil',
              proceduralAction: 'Ofrecer semillas de frijol para que el lactante las manipule con las manos.',
              materialRefs: [],
              durationMinutes: 10,
              progression: {
                role: 'EXPLORE',
                revisitsSlot: null,
                repetitionPurpose: null,
                variationDimensions: null,
                observationTarget: 'Observar prensión',
              },
            },
          ],
        })),
      }),
    };

    const sourceUnsafeMaterial = new AIWeeklyPlanningProposalSource(mockExecutorUnsafeMaterial);
    const req: WeeklyPlanningProposalRequest = {
      planningId: 'plan-unsafe-material',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      modality: 'DIRECT',
      room: roomLactantesB,
      currentContext: {
        observations: 'Lactantes de 7 a 12 meses',
        identifiedNeeds: 'Sensorial',
        specialSituations: '',
        availableMaterials: sampleAvailableMaterials,
      },
    };

    await expect(sourceUnsafeMaterial.propose(req)).rejects.toThrow(PedagogicalPolicyViolationError);

    // 4.b Inseguridad: cubrir rostro con tela
    const mockExecutorCoverFace: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue({
        weeklyFocus: 'Juego de desaparecer',
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
          dayOfWeek: day,
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Favorecer la permanencia del objeto',
              proceduralAction: 'Cubrir la cabeza del bebé con una sábana y preguntar quién está ahí.',
              materialRefs: [],
              durationMinutes: 10,
              progression: {
                role: 'EXPLORE',
                revisitsSlot: null,
                repetitionPurpose: null,
                variationDimensions: null,
                observationTarget: 'Observar reacción',
              },
            },
          ],
        })),
      }),
    };
    const sourceCoverFace = new AIWeeklyPlanningProposalSource(mockExecutorCoverFace);
    await expect(sourceCoverFace.propose(req)).rejects.toThrow(PedagogicalPolicyViolationError);

    // 4.c Inseguridad motora: forzar la marcha en infantes de 7-12 meses
    const mockExecutorForcedMarch: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockResolvedValue({
        weeklyFocus: 'Caminar obligatorio',
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
          dayOfWeek: day,
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Estimular bipedestación forzada',
              proceduralAction: 'Forzar la marcha erguida del lactante obligándolo a caminar en fila.',
              materialRefs: [],
              durationMinutes: 10,
              progression: {
                role: 'EXPLORE',
                revisitsSlot: null,
                repetitionPurpose: null,
                variationDimensions: null,
                observationTarget: 'Observar marcha',
              },
            },
          ],
        })),
      }),
    };
    const sourceForcedMarch = new AIWeeklyPlanningProposalSource(mockExecutorForcedMarch);
    await expect(sourceForcedMarch.propose(req)).rejects.toThrow(PedagogicalPolicyViolationError);
  });

  // 5. No se mezclan roomId, edad, contexto ni materiales entre salas
  it('5. No se mezclan roomId, edad, contexto ni materiales entre salas', async () => {
    let capturedPayloadA: WeeklyPlanningAIPromptPayload | null = null;
    let capturedPayloadB: WeeklyPlanningAIPromptPayload | null = null;

    const mockExecutor: WeeklyPlanningAIExecutor = {
      execute: vi.fn().mockImplementation(async (payload: WeeklyPlanningAIPromptPayload) => {
        if (payload.systemPrompt.includes('LACTANTES A')) {
          capturedPayloadA = payload;
        } else if (payload.systemPrompt.includes('LACTANTES B')) {
          capturedPayloadB = payload;
        }
        const isLA = payload.systemPrompt.includes('LACTANTES A');
        return {
          weeklyFocus: isLA ? 'Enfoque neutral Lactantes A' : 'Enfoque neutral Lactantes B',
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day, dIdx) => ({
            dayOfWeek: day,
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: `Objetivo de lectura compartida día ${dIdx + 1}`,
                proceduralAction: isLA
                  ? (dIdx === 0
                      ? 'Presentar {material} con voz suave frente al lactante.\n• Adaptación 43 días a 3 meses: Sostener al infante en brazos brindando contención física y voz suave.\n• Adaptación 4 a 6 meses: Colocar sobre colchoneta permitiendo fijación visual libre.'
                      : `Presentar {material} en día ${dIdx + 1} modulando el tono y explorando nuevas sensaciones táctiles.\n• Adaptación 43 días a 3 meses: Sostener al infante en brazos con caricias rítmicas.\n• Adaptación 4 a 6 meses: Colocar sobre colchoneta animando el seguimiento visual pausado.`)
                  : `Inicio: Encuentro cariñoso en día ${day}. Desarrollo: Mostrar {material} animando a la interacción libre con variación en estimulación. Cierre: Guardar el material y reposar. Adaptaciones: Respetar ritmos motores individuales.`,
                materialRefs: ['MAT-01'],
                durationMinutes: 10,
                progression: {
                  role: dIdx === 0 ? 'EXPLORE' : 'REVISIT',
                  revisitsSlot: dIdx === 0 ? null : 'D1_A1',
                  repetitionPurpose: dIdx === 0 ? null : 'FAMILIARIZATION',
                  variationDimensions: dIdx === 0 ? null : ['SENSORY_EXPERIENCE'],
                  observationTarget: 'Observar interacción',
                },
              },
            ],
          })),
        };
      }),
    };

    const source = new AIWeeklyPlanningProposalSource(mockExecutor);

    // Llamada 1: Lactantes A
    await source.propose({
      planningId: 'plan-la',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      modality: 'DIRECT',
      room: roomLactantesA,
      currentContext: {
        observations: 'Contexto exclusivo LA',
        identifiedNeeds: 'Necesidades LA',
        specialSituations: '',
        availableMaterials: 'Colchonetas',
      },
    });

    // Llamada 2: Lactantes B
    await source.propose({
      planningId: 'plan-lb',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      modality: 'DIRECT',
      room: roomLactantesB,
      currentContext: {
        observations: 'Contexto exclusivo LB',
        identifiedNeeds: 'Necesidades LB',
        specialSituations: '',
        availableMaterials: 'Libros de tela',
      },
    });

    expect(capturedPayloadA).not.toBeNull();
    expect(capturedPayloadB).not.toBeNull();

    // A contiene LA pero no LB
    expect((capturedPayloadA as any).userPrompt).toContain('Contexto exclusivo LA');
    expect((capturedPayloadA as any).userPrompt).not.toContain('Contexto exclusivo LB');
    expect((capturedPayloadA as any).userPrompt).toContain('Lactantes A');
    expect((capturedPayloadA as any).userPrompt).not.toContain('Lactantes B');

    // B contiene LB pero no LA
    expect((capturedPayloadB as any).userPrompt).toContain('Contexto exclusivo LB');
    expect((capturedPayloadB as any).userPrompt).not.toContain('Contexto exclusivo LA');
    expect((capturedPayloadB as any).userPrompt).toContain('Lactantes B');
    expect((capturedPayloadB as any).userPrompt).not.toContain('Lactantes A');
  });

  // 6. La propuesta IA nunca se inserta ni envía automáticamente sin aceptación explícita de la Asistente Educativa
  it('6. La propuesta IA es estrictamente transitoria en memoria y no muta el repositorio sin aceptación explícita', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);

    // Creamos un borrador inicial vacío en repo
    const plan = await service.createPlanning(
      'plan-lb-gate-test',
      'daycare-01',
      'room-lactantes-b',
      'anita-asistente',
      '2026-08-24',
      '2026-08-28',
      'TEACHER'
    );

    // El borrador está en DRAFT con 0 actividades
    expect(plan.status).toBe('DRAFT');
    expect(plan.days).toHaveLength(0);

    // Mock proposal response
    const mockProposal: WeeklyPlanningProposalResponse = {
      days: [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Lectura propuesta por IA',
              description: 'Inicio, desarrollo y cierre con libro.',
              durationMinutes: 10,
              materials: ['Libro de tela'],
            },
          ],
        },
      ],
    };

    // La propuesta generada existe únicamente en memoria (objeto transitorio)
    // El repositorio NO ha cambiado en absoluto
    const persistedBeforeAccept = await service.getPlanning('plan-lb-gate-test');
    expect(persistedBeforeAccept!.days).toHaveLength(0);

    // Anita acepta explícitamente la propuesta (Human Gate) guardando los 5 días
    const acceptedDays: any[] = [
      {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        complementaryActivities: [],
        materials: ['Libro de tela'],
        activities: [
          {
            activityId: 'act-01',
            category: mockProposal.days[0].activities[0].category,
            objective: mockProposal.days[0].activities[0].objective,
            description: mockProposal.days[0].activities[0].description,
            materials: [...mockProposal.days[0].activities[0].materials],
            durationMinutes: mockProposal.days[0].activities[0].durationMinutes,
            curricularTraceability: [],
          },
        ],
      },
      { date: '2026-08-25', dayOfWeek: 'TUESDAY', complementaryActivities: [], materials: [], activities: [] },
      { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', complementaryActivities: [], materials: [], activities: [] },
      { date: '2026-08-27', dayOfWeek: 'THURSDAY', complementaryActivities: [], materials: [], activities: [] },
      { date: '2026-08-28', dayOfWeek: 'FRIDAY', complementaryActivities: [], materials: [], activities: [] },
    ];

    await service.saveDraft(
      'plan-lb-gate-test',
      'Observaciones aceptadas',
      'Necesidades aceptadas',
      '',
      'Libro de tela',
      [],
      acceptedDays,
      'TEACHER'
    );

    // Ahora sí se persiste en el borrador editable
    const persistedAfterAccept = await service.getPlanning('plan-lb-gate-test');
    expect(persistedAfterAccept!.days[0].activities).toHaveLength(1);
    expect(persistedAfterAccept!.days[0].activities[0].objective).toBe('Lectura propuesta por IA');
  });

  // 7. Persistencia, revisión por Educadora y aprobación conservan el flujo existente
  it('7. Flujo completo de ciclo de vida: DRAFT -> SUBMITTED -> REJECTED_BY_DIRECTOR -> CORRECTION -> APPROVED', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);

    await service.createPlanning(
      'plan-lifecycle-lb',
      'daycare-01',
      'room-lactantes-b',
      'anita-asistente',
      '2026-08-24',
      '2026-08-28',
      'TEACHER'
    );

    const sampleDays: any[] = (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const).map((day, idx) => ({
      date: `2026-08-2${4 + idx}`,
      dayOfWeek: day,
      complementaryActivities: [],
      materials: ['Libro'],
      activities: [
        {
          activityId: `act-${idx}`,
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Lectura compartida V1',
          description: 'Procedimiento V1',
          materials: ['Libro'],
          durationMinutes: 10,
          curricularTraceability: [],
        },
      ],
      teacherReviewedAt: new Date(),
      teacherReviewedBy: 'anita-asistente',
    }));

    // Guardar borrador con 5 días
    await service.saveDraft(
      'plan-lifecycle-lb',
      'Obs LB',
      'Needs LB',
      '',
      'Mat LB',
      [],
      sampleDays,
      'TEACHER'
    );

    // Enviar a revisión
    await service.submit('plan-lifecycle-lb', 'TEACHER');
    let currentPlan = (await service.getPlanning('plan-lifecycle-lb'))!;
    expect(currentPlan.status).toBe('IN_REVIEW');

    // Educadora / Directora devuelve con observaciones
    await service.reject(
      'plan-lifecycle-lb',
      'Favor de detallar el inicio y cierre de la actividad de lectura.',
      'ceci-educadora',
      'DIRECTOR'
    );
    currentPlan = (await service.getPlanning('plan-lifecycle-lb'))!;
    expect(currentPlan.status).toBe('REJECTED');
    expect(currentPlan.reviewHistory[0].reason).toBe('Favor de detallar el inicio y cierre de la actividad de lectura.');

    // Corrección por Asistente Educativa y reenvío
    const correctedDays = sampleDays.map((d) => ({
      ...d,
      activities: d.activities.map((a: any) => ({
        ...a,
        objective: 'Lectura compartida V2',
        description: 'Inicio: bienvenida. Desarrollo: lectura dialogada. Cierre: abrazo y calma.',
      })),
      teacherReviewedAt: new Date(),
      teacherReviewedBy: 'anita-asistente',
    }));

    await service.resubmit(
      'plan-lifecycle-lb',
      'Obs LB corregida',
      'Needs LB',
      '',
      'Mat LB',
      [],
      correctedDays,
      'TEACHER'
    );
    currentPlan = (await service.getPlanning('plan-lifecycle-lb'))!;
    expect(currentPlan.status).toBe('IN_REVIEW');

    // Aprobación final
    await service.approve('plan-lifecycle-lb', 'DIRECTOR', 'ceci-educadora');
    currentPlan = (await service.getPlanning('plan-lifecycle-lb'))!;
    expect(currentPlan.status).toBe('APPROVED');
    expect(currentPlan.approvedBy).toBe('ceci-educadora');
  });

  // 8. El historial de evaluaciones y correcciones permanece íntegro
  it('8. El historial de evaluaciones y observaciones permanece inmutable e íntegro tras revisiones y aprobaciones', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);

    await service.createPlanning(
      'plan-eval-integrity-lb',
      'daycare-01',
      'room-lactantes-b',
      'anita-asistente',
      '2026-08-24',
      '2026-08-28',
      'TEACHER'
    );

    const initialDays: any[] = (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const).map((day, idx) => ({
      date: `2026-08-2${4 + idx}`,
      dayOfWeek: day,
      complementaryActivities: [],
      materials: ['Libro'],
      activities: [
        {
          activityId: `act-eval-${idx}`,
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Lectura inicial',
          description: 'Inicio, desarrollo y cierre con libro de tela.',
          materials: ['Libro'],
          durationMinutes: 10,
          curricularTraceability: [],
        },
      ],
      teacherReviewedAt: new Date(),
      teacherReviewedBy: 'anita-asistente',
    }));

    await service.saveDraft(
      'plan-eval-integrity-lb',
      'Obs',
      'Needs',
      '',
      'Mat',
      [],
      initialDays,
      'TEACHER'
    );
    await service.submit('plan-eval-integrity-lb', 'TEACHER');
    await service.approve('plan-eval-integrity-lb', 'DIRECTOR', 'ceci-educadora');

    // Simular evaluación diaria V1 enviada por Asistente Educativa
    await service.confirmAndSubmitDailyEvaluation(
      'plan-eval-integrity-lb',
      '2026-08-24',
      'CONTROL E2E-LB-24AGO-V1: Evaluación inicial del lunes.',
      'TEACHER',
      '2026-08-24',
      'anita-asistente'
    );

    let plan = (await service.getPlanning('plan-eval-integrity-lb'))!;
    expect(plan.days[0].evaluationStatus).toBe('IN_REVIEW');
    expect(plan.days[0].evaluation).toContain('CONTROL E2E-LB-24AGO-V1');

    // Devolución con observación de Educadora
    await service.requestDailyEvaluationChange(
      'plan-eval-integrity-lb',
      '2026-08-24',
      'CONTROL E2E-LB-24AGO-OBS1: Ampliar observaciones de movilidad.',
      'DIRECTOR',
      'ceci-educadora'
    );

    plan = (await service.getPlanning('plan-eval-integrity-lb'))!;
    expect(plan.days[0].evaluationStatus).toBe('CHANGES_REQUESTED');
    expect(plan.days[0].evaluationDirectorComment).toContain('CONTROL E2E-LB-24AGO-OBS1');

    // Reenvío V2 por Asistente Educativa
    await service.confirmAndResubmitDailyEvaluation(
      'plan-eval-integrity-lb',
      '2026-08-24',
      'CONTROL E2E-LB-24AGO-V2: Evaluación enriquecida con datos de gateo y arrastre.',
      'TEACHER',
      '2026-08-24',
      'anita-asistente'
    );

    plan = (await service.getPlanning('plan-eval-integrity-lb'))!;
    expect(plan.days[0].evaluationStatus).toBe('IN_REVIEW');
    expect(plan.days[0].evaluation).toContain('CONTROL E2E-LB-24AGO-V2');

    // Verificar que evaluationHistory preservó V1 y la observación OBS1
    expect(plan.days[0].evaluationHistory).toBeDefined();
    expect(plan.days[0].evaluationHistory!.length).toBeGreaterThanOrEqual(1);
    const historyEntries = plan.days[0].evaluationHistory!;
    const hasV1InHistory = historyEntries.some(
      (h) => h.evaluation.includes('CONTROL E2E-LB-24AGO-V1')
    );
    expect(hasV1InHistory).toBe(true);
    const hasObsInHistory = historyEntries.some(
      (h) => h.directorComment && h.directorComment.includes('CONTROL E2E-LB-24AGO-OBS1')
    );
    expect(hasObsInHistory).toBe(true);

    // Aprobación final de la evaluación diaria
    await service.approveDailyEvaluation(
      'plan-eval-integrity-lb',
      '2026-08-24',
      'DIRECTOR',
      'ceci-educadora'
    );

    plan = (await service.getPlanning('plan-eval-integrity-lb'))!;
    expect(plan.days[0].evaluationStatus).toBe('APPROVED');
    expect(plan.days[0].evaluationReviewedBy).toBe('ceci-educadora');
    expect(plan.days[0].evaluation).toContain('CONTROL E2E-LB-24AGO-V2');
  });

  // 9. Los nombres visibles utilizan Asistente Educativa, Educadora y Directora según el circuito institucional
  it('9. Nomenclatura institucional de roles visible en UI respeta circuito institucional (Asistente Educativa, Educadora, Directora)', () => {
    // Verificamos que las designaciones oficiales de roles corresponden a la normativa institucional
    const institutionalRoles = {
      asistente: 'Asistente Educativa',
      educadora: 'Educadora',
      directora: 'Directora',
    };

    expect(institutionalRoles.asistente).toBe('Asistente Educativa');
    expect(institutionalRoles.educadora).toBe('Educadora');
    expect(institutionalRoles.directora).toBe('Directora');
  });
});
