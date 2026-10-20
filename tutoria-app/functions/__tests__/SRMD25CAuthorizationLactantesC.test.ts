import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import {
  handleProposeWeeklyPlanning,
  ProposeWeeklyPlanningGatewayRequest,
} from '../src/proposeWeeklyPlanning';
import {
  createFirestoreWeeklyPlanningAuthorizer,
} from '../src/FirestoreWeeklyPlanningAuthorizer';

describe('MASTER ARB — SR-MD-25C: Autorización Quirúrgica de Lactantes C', () => {
  const FAKE_TEACHER_UID = 'lab-teacher-anita';
  const FAKE_DAYCARE_ID = '00000000-0000-4000-8000-000000000001';

  const createMockAuthorizerDoc = (roomIds: string[] = ['room-lactantes-a', 'room-lactantes-b', 'room-lactantes-c']) => ({
    authUid: FAKE_TEACHER_UID,
    active: true,
    institutionalRole: 'TEACHER',
    authorizedDaycareIds: [FAKE_DAYCARE_ID],
    roomIds,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T23:59:59Z'),
  });

  const createGatewayPayload = (roomId: string, roomName: string, minAge: number, maxAge: number): ProposeWeeklyPlanningGatewayRequest => ({
    weekStart: '2026-10-05',
    weekEnd: '2026-10-09',
    modality: 'DIRECT',
    room: {
      roomId,
      name: roomName,
      minAgeMonths: minAge,
      maxAgeMonths: maxAge,
    },
    currentContext: {
      observations: 'Observaciones para validación de autorización.',
      identifiedNeeds: 'Necesidades pedagógicas del grupo.',
      specialSituations: '',
      availableMaterials: 'Materiales autorizados de sala.',
    },
    constraints: {
      minActivitiesPerDay: 5,
    },
    planningId: 'operational-plan-auth-test',
    daycareId: FAKE_DAYCARE_ID,
  });

  const createMockRequest = (payload: ProposeWeeklyPlanningGatewayRequest): CallableRequest<unknown> => ({
    data: payload,
    auth: { uid: FAKE_TEACHER_UID },
    rawRequest: {} as any,
    acceptsPushNotifications: false,
  } as unknown as CallableRequest<unknown>);

  const createMockExecutor = () => vi.fn().mockResolvedValue({
    days: [
      {
        dayOfWeek: 'MONDAY',
        activities: Array(5).fill({
          category: 'Actividades de Exploración y Movimiento',
          objective: 'Desarrollo motriz integral',
          description: 'Actividad motriz segura',
          durationMinutes: 15,
          materials: ['Colchoneta'],
        }),
      },
    ],
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Lactantes A conserva su autorización intacta', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-10-05T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    const payload = createGatewayPayload('room-lactantes-a', 'Lactantes A', 0, 6);
    const request = createMockRequest(payload);

    const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
    expect(response).toBeDefined();
    expect(mockExecutor).toHaveBeenCalledTimes(1);
    expect(mockReader).toHaveBeenCalledWith(FAKE_TEACHER_UID);
  });

  it('2. Lactantes B conserva su autorización intacta', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-10-05T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    const payload = createGatewayPayload('room-lactantes-b', 'Lactantes B', 7, 12);
    const request = createMockRequest(payload);

    const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
    expect(response).toBeDefined();
    expect(mockExecutor).toHaveBeenCalledTimes(1);
  });

  it('3. Lactantes C (room-lactantes-c) se autoriza correctamente cuando está asignada en el documento', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(['room-lactantes-a', 'room-lactantes-b', 'room-lactantes-c']));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-10-05T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    const payload = createGatewayPayload('room-lactantes-c', 'Lactantes C', 13, 18);
    const request = createMockRequest(payload);

    const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
    expect(response).toBeDefined();
    expect(mockExecutor).toHaveBeenCalledTimes(1);
  });

  it('4. Lactantes C resuelve correctamente compatibilidad por alias (lactantes-c <-> room-lactantes-c)', async () => {
    // Si el documento en Firestore tiene el identificador histórico 'lactantes-c'
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(['room-lactantes-a', 'room-lactantes-b', 'lactantes-c']));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-10-05T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    // Y el frontend envía 'room-lactantes-c'
    const payload = createGatewayPayload('room-lactantes-c', 'Lactantes C', 13, 18);
    const request = createMockRequest(payload);

    const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
    expect(response).toBeDefined();
    expect(mockExecutor).toHaveBeenCalledTimes(1);
  });

  it('5. Una sala no autorizada (ej. room-maternal-a) sigue siendo estrictamente rechazada fail-closed', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(['room-lactantes-a', 'room-lactantes-b', 'room-lactantes-c']));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-10-05T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    const payload = createGatewayPayload('room-maternal-a', 'Maternal A', 19, 24);
    const request = createMockRequest(payload);

    await expect(
      handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor })
    ).rejects.toThrow(
      new HttpsError('permission-denied', 'Teacher is not authorized for the requested room.')
    );

    // Seguridad: el ejecutor de IA NUNCA se invoca si falla la autorización
    expect(mockExecutor).toHaveBeenCalledTimes(0);
  });

  it('6. Reproducción de la causa raíz: si roomIds sólo contiene Lactantes A y B, Lactantes C es rechazada', async () => {
    // Estado original en Firestore LAB: sólo Lactantes A y B
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(['room-lactantes-a', 'room-lactantes-b']));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-10-05T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    const payload = createGatewayPayload('room-lactantes-c', 'Lactantes C', 13, 18);
    const request = createMockRequest(payload);

    // Exactamente el error reportado: permission-denied / Teacher is not authorized for the requested room
    await expect(
      handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor })
    ).rejects.toThrow(
      new HttpsError('permission-denied', 'Teacher is not authorized for the requested room.')
    );

    expect(mockExecutor).toHaveBeenCalledTimes(0);
  });
});
