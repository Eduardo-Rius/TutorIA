import { describe, it, expect } from 'vitest';
import {
  validateProposeWeeklyPlanningGatewayPayload,
  MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH,
} from '../../../../functions/src/proposeWeeklyPlanning';
import {
  mapFirebaseCallableError,
} from '../../../infrastructure/ai/FirebaseWeeklyPlanningProposalSource';
import { calculateWeekEnd, getMondayOfWeek } from '../PlanningDemoApp';

describe('SR-MD-23D — Diagnóstico Quirúrgico del Fallback Instantáneo (INVALID_REQUEST)', () => {
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

  it('1. DIAGNÓSTICO: Texto de contexto > 1000 caracteres provoca rechazo inmediato por el gateway (invalid-argument)', () => {
    // Current server constant is MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH = 1000
    const payloadWithLongText = {
      ...baseValidPayload,
      currentContext: {
        ...baseValidPayload.currentContext,
        observations: 'A'.repeat(MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH + 1),
      },
    };

    let caughtError: any = null;
    try {
      validateProposeWeeklyPlanningGatewayPayload(payloadWithLongText);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.code).toBe('invalid-argument');
    expect(caughtError.message).toContain('currentContext.observations exceeds maximum length of 1000 characters.');
  });

  it('2. DIAGNÓSTICO: Asimetría de contrato cliente (5000) vs gateway (1000) permite al frontend enviar payloads que el gateway rechaza', async () => {
    const { TECHNICAL_MAX_CONTEXT_FIELD_LENGTH } = await import(
      '../../../application/planning/WeeklyPlanningProposalSource'
    );
    expect(TECHNICAL_MAX_CONTEXT_FIELD_LENGTH).toBe(5000);
    expect(MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH).toBe(1000);
    expect(TECHNICAL_MAX_CONTEXT_FIELD_LENGTH).toBeGreaterThan(MAX_WEEKLY_PLANNING_TEXT_FIELD_LENGTH);
  });

  it('3. DIAGNÓSTICO: Mapeo cliente de invalid-argument mapea estrictamente a INVALID_REQUEST con mensaje canónico seguro', () => {
    const serverError = {
      code: 'functions/invalid-argument',
      message: 'currentContext.observations exceeds maximum length of 1000 characters.',
    };

    const clientError = mapFirebaseCallableError(serverError);

    expect(clientError.code).toBe('INVALID_REQUEST');
    expect(clientError.message).toBe('La solicitud de propuesta contiene datos inválidos o incompletos.');
  });

  it('4. CORRECCIÓN FECHAS: getMondayOfWeek calcula el lunes correspondiente para cualquier fecha simulada', () => {
    // Monday August 24, 2026
    expect(getMondayOfWeek('2026-08-24')).toBe('2026-08-24');
    // Tuesday August 25, 2026 -> Monday is August 24
    expect(getMondayOfWeek('2026-08-25')).toBe('2026-08-24');
    // Friday August 28, 2026 -> Monday is August 24
    expect(getMondayOfWeek('2026-08-28')).toBe('2026-08-24');
    // Sunday August 23, 2026 -> Monday is August 17
    expect(getMondayOfWeek('2026-08-23')).toBe('2026-08-17');
  });

  it('5. CORRECCIÓN FECHAS: calculateWeekEnd calcula el viernes (+4 días) a partir del lunes de inicio', () => {
    expect(calculateWeekEnd('2026-08-24')).toBe('2026-08-28');
    expect(calculateWeekEnd('2026-08-10')).toBe('2026-08-14');
  });

  it('6. CONTRATO COMPLETO VÁLIDO: Payload con fechas coherentes y textos <= 1000 caracteres pasa gateway limpiamente', () => {
    const result = validateProposeWeeklyPlanningGatewayPayload(baseValidPayload);

    expect(result.weekStart).toBe('2026-08-24');
    expect(result.weekEnd).toBe('2026-08-28');
    expect(result.room.roomId).toBe('room-lactantes-b');
    expect(result.currentContext.observations.length).toBeLessThanOrEqual(1000);
    expect(result.currentContext.identifiedNeeds.length).toBeLessThanOrEqual(1000);
    expect(result.currentContext.specialSituations.length).toBeLessThanOrEqual(1000);
    expect(result.currentContext.availableMaterials.length).toBeLessThanOrEqual(1000);
    expect(result.constraints?.minActivitiesPerDay).toBe(5);
  });
});
