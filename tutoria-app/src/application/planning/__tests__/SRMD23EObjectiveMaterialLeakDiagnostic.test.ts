import { describe, it, expect } from 'vitest';
import {
  createRequestScopedMaterialTable,
  normalizeObjectiveForMaterialAgnosticism,
  validateObjectiveForMaterialAgnosticism,
  buildWeeklyPlanningAIPromptPayload,
  buildPrivacyMinimizedAIInput,
  projectPedagogicalGenerationPolicy,
  parseAndAllowlistUntrustedProposal,
} from '../AIWeeklyPlanningProposalSource';
import {
  PedagogicalAgePolicyCatalog,
} from '../../../domain/planning/PedagogicalAgePolicy';
import { mapFirebaseCallableError } from '../../../infrastructure/ai/FirebaseWeeklyPlanningProposalSource';

describe('SR-MD-23E — Diagnóstico y Resolución de OBJECTIVE_MATERIAL_LEAK', () => {
  const sampleMaterials = [
    'colchonetas acolchadas',
    'tapetes sensoriales lavables',
    'sonajas plásticas selladas',
    'cubos de tela suave',
    'pelotas de texturas grandes',
    'libros de tela con textura',
    'muñecos de trapo',
    'cono de plástico',
  ];

  const table = createRequestScopedMaterialTable(sampleMaterials, ['colchonetas']);

  it('1. DIAGNÓSTICO: normalizeObjectiveForMaterialAgnosticism elimina menciones de materiales físicos en el objetivo', () => {
    const rawObjective = 'Favorecer la exploración táctil y la atención compartida con libros de tela con textura.';
    const normalized = normalizeObjectiveForMaterialAgnosticism(rawObjective, table);

    expect(normalized).toBe('Favorecer la exploración táctil y la atención compartida.');
    expect(() => validateObjectiveForMaterialAgnosticism(normalized, table)).not.toThrow();
  });

  it('2. DIAGNÓSTICO: normalizeObjectiveForMaterialAgnosticism elimina placeholders {material} y referencias MAT-XX', () => {
    const rawWithPlaceholder = 'Favorecer la prensión voluntaria y manipulación con {material}';
    const normalized1 = normalizeObjectiveForMaterialAgnosticism(rawWithPlaceholder, table);
    expect(normalized1).toBe('Favorecer la prensión voluntaria y manipulación');
    expect(() => validateObjectiveForMaterialAgnosticism(normalized1, table)).not.toThrow();

    const rawWithRef = 'Estimular el seguimiento visual usando MAT-03';
    const normalized2 = normalizeObjectiveForMaterialAgnosticism(rawWithRef, table);
    expect(normalized2).toBe('Estimular el seguimiento visual');
    expect(() => validateObjectiveForMaterialAgnosticism(normalized2, table)).not.toThrow();
  });

  it('3. DIAGNÓSTICO: validateObjectiveForMaterialAgnosticism NO produce falsos positivos por subcadenas (ej. reconocimiento vs cono)', () => {
    // "reconocimiento" contiene "cono", pero NO es el material físico "cono"
    const objectiveWithSubstring = 'Favorecer el reconocimiento visual de láminas y la interacción afectiva.';
    expect(() => validateObjectiveForMaterialAgnosticism(objectiveWithSubstring, table)).not.toThrow();

    // Mención real de "cono de plástico" debe ser detectada si no fue normalizada
    const objectiveWithActualMaterial = 'Favorecer la marcha exploratoria con cono de plástico.';
    expect(() => validateObjectiveForMaterialAgnosticism(objectiveWithActualMaterial, table)).toThrow(
      /Activity objective must be material-agnostic and cannot name physical materials/
    );
  });

  it('4. PREVENCIÓN: Lactantes B prompt del sistema no incluye la palabra "libro" en los propósitos pedagógicos diarios de lectura', () => {
    const policy = PedagogicalAgePolicyCatalog.getPolicyForRoomType('LACTANTES_B')!;
    const mockRequest: any = {
      room: { roomId: 'room-lb', name: 'Lactantes B', minAgeMonths: 7, maxAgeMonths: 12 },
      modality: 'DIRECT',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      currentContext: {
        availableMaterials: 'libros de tela con textura, sonajas plásticas selladas',
      },
    };
    const projection = projectPedagogicalGenerationPolicy(policy, mockRequest);
    const minimized = buildPrivacyMinimizedAIInput(mockRequest, projection);
    const payload = buildWeeklyPlanningAIPromptPayload(minimized, table);

    // Los propósitos pedagógicos diarios en el prompt no deben sugerir al modelo nombrar "libro" en los objetivos diarios
    expect(payload.systemPrompt).toContain('Fomentar la atención compartida, el contacto afectivo y la exploración sensorial de portadas y texturas');
    expect(payload.systemPrompt).toContain('REGLA CRÍTICA DE OBJETIVOS');
  });

  it('5. PIPELINE CANÓNICO: parseAndAllowlistUntrustedProposal normaliza el objetivo y aprueba propuesta con mención residual de material', () => {
    const rawProposal = {
      weeklyFocus: 'Exploración sensorial y motriz',
      days: [
        {
          dayOfWeek: 'MONDAY',
          activities: [
            {
              category: 'LECTURA EN VOZ ALTA',
              objective: 'Favorecer la atención compartida mediante libros de tela con textura.',
              proceduralAction:
                'Inicio: Presentar {material} con afecto.\nDesarrollo: Hoojear despacio {material}.\nCierre: Cantar canción breve.\nAdaptaciones: Libre movimiento.',
              materialRefs: ['MAT-06'],
              durationMinutes: 15,
              progression: {
                role: 'EXPLORE',
                revisitsSlot: null,
                repetitionPurpose: null,
                variationDimensions: [],
                observationTarget: 'Atención visual',
              },
            },
          ],
        },
      ],
    };

    const allowlisted = parseAndAllowlistUntrustedProposal(rawProposal, table, {
      roomType: 'LACTANTES_B',
    });

    const act = allowlisted.days[0].activities[0];
    // El objetivo debe haber sido normalizado a una capacidad pedagógica pura
    expect(act.objective).toBe('Favorecer la atención compartida.');
    expect(act.materials).toContain('libros de tela con textura');
  });

  it('6. OBSERVABILIDAD: mapFirebaseCallableError refleja detalles diagnósticos en LAB sin exponer secretos', () => {
    const mockCallableError = {
      code: 'functions/internal',
      message: 'Proposed weekly plan failed canonical validation.',
      details: {
        processingStage: 'MATERIAL_ENCLOSURE',
        failureCode: 'OBJECTIVE_MATERIAL_LEAK',
      },
    };

    const mapped = mapFirebaseCallableError(mockCallableError);
    expect(mapped.message).toContain('[LAB Diagnostic: MATERIAL_ENCLOSURE - OBJECTIVE_MATERIAL_LEAK]');
  });
});
