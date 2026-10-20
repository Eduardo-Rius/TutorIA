import { describe, it, expect } from 'vitest';
import {
  validateProposeWeeklyPlanningGatewayPayload,
} from '../../../../functions/src/proposeWeeklyPlanning';
import {
  mapFirebaseCallableError,
} from '../../../infrastructure/ai/FirebaseWeeklyPlanningProposalSource';
import { calculateWeekEnd } from '../PlanningDemoApp';

describe('SR-MD-23A — Diagnóstico del INVALID_ARGUMENT en generación IA', () => {
  const baseValidPayload = {
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    modality: 'DIRECT' as const,
    room: {
      roomId: 'room-lactantes-b',
      name: 'Lactantes B',
      minAgeMonths: 7,
      maxAgeMonths: 12,
    },
    currentContext: {
      observations:
        'Lactantes de 7 a 12 meses en proceso de consolidación de sedestación independiente, inicio de desplazamientos por gateo libre y arrastre, y creciente interés en la interacción comunicativa y balbuceo.',
      identifiedNeeds:
        'Favorecer el movimiento libre y la exploración postural sobre superficies acolchadas sin forzar hitos motores; estimular la prensión voluntaria y manipulación bimanual; incorporar lectura diaria en voz alta con acervo tangible.',
      specialSituations:
        'Grupo estable con asistencia regular. Tres lactantes consolidan gateo coordinado; dos exploran incorporarse con apoyo firme.',
      availableMaterials:
        'Colchonetas acolchadas, tapetes sensoriales lavables, sonajas plásticas selladas, cubos de tela suave, pelotas de texturas grandes, libros de tela con textura, muñecos de trapo',
    },
    constraints: {
      minActivitiesPerDay: 5,
    },
    daycareId: '00000000-0000-4000-8000-000000000001',
  };

  it('1. REPRODUCCIÓN DEL ERROR: Cuando weekStart (2026-08-24) > weekEnd (2026-08-14 MOCK_END), el gateway falla ANTES de llamar a OpenAI con invalid-argument', () => {
    // Exact payload constructed by PlanningDemoApp prior to fix:
    // weekStart was populated from existing plan (2026-08-24) while weekEnd remained hardcoded to MOCK_END (2026-08-14)
    const buggyPayload = {
      ...baseValidPayload,
      weekStart: '2026-08-24',
      weekEnd: '2026-08-14', // BUG: weekStart > weekEnd
    };

    let caughtError: any = null;
    try {
      validateProposeWeeklyPlanningGatewayPayload(buggyPayload);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.code).toBe('invalid-argument');
    expect(caughtError.message).toBe('weekStart must be less than or equal to weekEnd.');
  });

  it('2. REPRODUCCIÓN DEL MAPEO CLIENTE: invalid-argument se mapea a INVALID_REQUEST ("La solicitud de propuesta contiene datos inválidos o incompletos")', () => {
    const rawError = {
      code: 'functions/invalid-argument',
      message: 'weekStart must be less than or equal to weekEnd.',
    };

    const clientError = mapFirebaseCallableError(rawError);

    expect(clientError.code).toBe('INVALID_REQUEST');
    expect(clientError.message).toBe('La solicitud de propuesta contiene datos inválidos o incompletos.');
  });

  it('3. CORRECCIÓN DEMOSTRADA: calculateWeekEnd calcula correctamente el viernes de la semana dada', () => {
    expect(calculateWeekEnd('2026-08-24')).toBe('2026-08-28');
    expect(calculateWeekEnd('2026-08-10')).toBe('2026-08-14');
    expect(calculateWeekEnd('2026-08-17')).toBe('2026-08-21');
  });

  it('4. CONTRATO CORREGIDO: Con weekStart y weekEnd coherentes (2026-08-24 a 2026-08-28), la validación del gateway pasa limpiamente', () => {
    const validated = validateProposeWeeklyPlanningGatewayPayload(baseValidPayload);

    expect(validated.weekStart).toBe('2026-08-24');
    expect(validated.weekEnd).toBe('2026-08-28');
    expect(validated.room.roomId).toBe('room-lactantes-b');
    expect(validated.room.name).toBe('Lactantes B');
    expect(validated.room.minAgeMonths).toBe(7);
    expect(validated.room.maxAgeMonths).toBe(12);
    expect(validated.constraints?.minActivitiesPerDay).toBe(5);
  });

  it('5. RESOLUCIÓN DE SALA: FirebaseWeeklyPlanningProposalSource asigna correctamente room.roomId de Lactantes B en el payload del gateway', async () => {
    const { FirebaseWeeklyPlanningProposalSource } = await import(
      '../../../infrastructure/ai/FirebaseWeeklyPlanningProposalSource'
    );

    let capturedPayload: any = null;
    const mockCallable = async (payload: any) => {
      capturedPayload = payload;
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek) => ({
        dayOfWeek,
        activities: [
          {
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Movimiento libre y estimulación oportuna en colchoneta',
            description: 'Exploración en colchoneta acolchada',
            durationMinutes: 15,
            materials: ['Colchonetas acolchadas'],
          },
        ],
      }));
      return {
        data: {
          days,
        },
      };
    };

    const source = new FirebaseWeeklyPlanningProposalSource({
      callableFn: mockCallable,
      operationalContext: {
        roomId: 'room-lactantes-b',
        daycareId: '00000000-0000-4000-8000-000000000001',
      },
    });

    await source.propose({
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      modality: 'DIRECT',
      room: {
        roomId: 'room-lactantes-b',
        name: 'Lactantes B',
        minAgeMonths: 7,
        maxAgeMonths: 12,
      },
      currentContext: {
        observations: 'Obs',
        identifiedNeeds: 'Needs',
        specialSituations: 'Situations',
        availableMaterials: 'Materials',
      },
    });

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.room.roomId).toBe('room-lactantes-b');
  });

  it('6. DEFENSIVIDAD DE FECHAS EN FRONTEND: Si weekEnd es anterior a weekStart, calculateWeekEnd corrige automáticamente', () => {
    const weekStart = '2026-08-24';
    const staleWeekEnd = '2026-08-14'; // Uninitialized or older plan weekEnd

    const effectiveWeekStart = weekStart || '2026-08-10';
    const effectiveWeekEnd =
      staleWeekEnd && staleWeekEnd >= effectiveWeekStart
        ? staleWeekEnd
        : calculateWeekEnd(effectiveWeekStart);

    expect(effectiveWeekStart).toBe('2026-08-24');
    expect(effectiveWeekEnd).toBe('2026-08-28');
    expect(effectiveWeekStart <= effectiveWeekEnd).toBe(true);
  });
});

