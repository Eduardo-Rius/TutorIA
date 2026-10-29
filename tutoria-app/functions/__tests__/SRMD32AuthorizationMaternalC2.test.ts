import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  handleProposeWeeklyPlanning,
  type ProposeWeeklyPlanningGatewayRequest,
} from '../src/proposeWeeklyPlanning';
import {
  createFirestoreWeeklyPlanningAuthorizer,
} from '../src/FirestoreWeeklyPlanningAuthorizer';
import type { PersistedAuthorizationContextDoc } from '../src/FirestoreCurricularAIAuthorizer';
import type { WeeklyPlanningAIExecutor } from '../src/types/weeklyPlanningAI';

describe('SR-MD-32C — Autorización de IA para Maternal C2 (43–48 meses)', () => {
  const FAKE_TEACHER_UID = 'test-teacher-anita-001';
  const FAKE_DAYCARE_ID = '00000000-0000-4000-8000-000000000001';

  const ALL_ROOMS = [
    'room-lactantes-a',
    'room-lactantes-b',
    'room-lactantes-c',
    'room-maternal-a',
    'room-maternal-b1',
    'room-maternal-b2',
    'room-maternal-c1',
    'room-maternal-c2',
  ];

  const createMockAuthorizerDoc = (
    roomIds: string[] = ALL_ROOMS,
    role: string = 'TEACHER',
    active: boolean = true
  ): PersistedAuthorizationContextDoc => ({
    authUid: FAKE_TEACHER_UID,
    institutionalRole: role,
    authorizedDaycareIds: [FAKE_DAYCARE_ID],
    roomIds,
    active,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: null,
  });

  const createGatewayPayload = (
    roomId: string = 'room-maternal-c2',
    name: string = 'Maternal C2',
    minAge: number = 43,
    maxAge: number = 48
  ): ProposeWeeklyPlanningGatewayRequest => ({
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    modality: 'DIRECT',
    room: {
      roomId,
      name,
      minAgeMonths: minAge,
      maxAgeMonths: maxAge,
    },
    currentContext: {
      observations: 'Grupo de 16 niñas y niños de Maternal C2 (43 a 48 meses).',
      identifiedNeeds: 'Consolidación de conteo 1 a 10 y clasificación bivariada.',
      specialSituations: '',
      availableMaterials: 'bloques grandes de plástico lavable, recipientes plásticos amplios, colchonetas limpias',
    },
    daycareId: FAKE_DAYCARE_ID,
  });

  const createMockRequest = (payload: ProposeWeeklyPlanningGatewayRequest) => ({
    data: payload,
    auth: {
      uid: FAKE_TEACHER_UID,
      token: {
        email: 'anita@lab.tutoria.invalid',
      },
    },
  } as any);

  const createMockExecutor = (): WeeklyPlanningAIExecutor => vi.fn().mockResolvedValue({
    days: [
      {
        dayOfWeek: 'MONDAY',
        activities: Array.from({ length: 5 }, (_, i) => ({
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: `Clasificación bivariada actividad ${i + 1}`,
          description: 'Inicio: Disponer colchonetas limpias.\nDesarrollo: Clasificar bloques grandes en recipientes plásticos amplios.\nCierre: Guardar materiales.\nAdaptaciones: Respeto al ritmo.',
          durationMinutes: 15,
          materials: ['bloques grandes de plástico lavable', 'recipientes plásticos amplios'],
        })),
      },
    ],
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Maternal C2 (room-maternal-c2) se autoriza exitosamente cuando está en el documento de autorización', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(ALL_ROOMS));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    const payload = createGatewayPayload('room-maternal-c2', 'Maternal C2', 43, 48);
    const request = createMockRequest(payload);

    const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
    expect(response).toBeDefined();
    expect(mockExecutor).toHaveBeenCalledTimes(1);
    expect(mockReader).toHaveBeenCalledWith(FAKE_TEACHER_UID);
  });

  it('2. Maternal C2 resuelve compatibilidad transparente por alias (maternal-c2 en payload vs room-maternal-c2 en doc)', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(['room-maternal-c2']));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    // Payload usa el alias maternal-c2
    const payload = createGatewayPayload('maternal-c2', 'Maternal C2', 43, 48);
    const request = createMockRequest(payload);

    const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
    expect(response).toBeDefined();
    expect(mockExecutor).toHaveBeenCalledTimes(1);
  });

  it('3. Maternal C2 resuelve compatibilidad transparente por alias (room-maternal-c2 en payload vs maternal-c2 en doc)', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(['maternal-c2']));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    // Payload usa el ID canónico room-maternal-c2
    const payload = createGatewayPayload('room-maternal-c2', 'Maternal C2', 43, 48);
    const request = createMockRequest(payload);

    const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
    expect(response).toBeDefined();
    expect(mockExecutor).toHaveBeenCalledTimes(1);
  });

  it('4. REPRODUCCIÓN EXACTA DEL INCIDENTE P0: Anita con salas hasta Maternal C1 es rechazada para Maternal C2', async () => {
    // Estado previo en LAB antes de patchLabMaternalC2Authorization: salas de Lactantes A hasta Maternal C1 únicamente
    const roomsWithoutC2 = [
      'room-lactantes-a',
      'room-lactantes-b',
      'room-lactantes-c',
      'room-maternal-a',
      'room-maternal-b1',
      'room-maternal-b2',
      'room-maternal-c1',
    ];
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(roomsWithoutC2));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    const payload = createGatewayPayload('room-maternal-c2', 'Maternal C2', 43, 48);
    const request = createMockRequest(payload);

    // Exactamente el error reportado: permission-denied / Teacher is not authorized for the requested room
    await expect(
      handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor })
    ).rejects.toThrow(
      new HttpsError('permission-denied', 'Teacher is not authorized for the requested room.')
    );

    // Seguridad: el ejecutor de IA NUNCA se invoca si falla la autorización
    expect(mockExecutor).toHaveBeenCalledTimes(0);
  });

  it('5. Todas las salas previas (Lactantes A-C, Maternal A-C1) conservan su autorización intacta', async () => {
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(ALL_ROOMS));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });

    const previousRooms = [
      { roomId: 'room-lactantes-a', name: 'Lactantes A', min: 0, max: 6 },
      { roomId: 'room-lactantes-b', name: 'Lactantes B', min: 7, max: 12 },
      { roomId: 'room-lactantes-c', name: 'Lactantes C', min: 13, max: 18 },
      { roomId: 'room-maternal-a', name: 'Maternal A', min: 19, max: 24 },
      { roomId: 'room-maternal-b1', name: 'Maternal B1', min: 25, max: 30 },
      { roomId: 'room-maternal-b2', name: 'Maternal B2', min: 31, max: 36 },
      { roomId: 'room-maternal-c1', name: 'Maternal C1', min: 37, max: 42 },
    ];

    for (const room of previousRooms) {
      const mockExecutor = createMockExecutor();
      const payload = createGatewayPayload(room.roomId, room.name, room.min, room.max);
      const request = createMockRequest(payload);

      const response = await handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor });
      expect(response).toBeDefined();
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    }
  });

  it('6. Roles no autorizados (DIRECTOR, SUPERVISOR) o cuentas inactivas son rechazadas con permission-denied para Maternal C2', async () => {
    const mockDirectorDoc = createMockAuthorizerDoc(ALL_ROOMS, 'DIRECTOR', true);
    const mockInactiveDoc = createMockAuthorizerDoc(ALL_ROOMS, 'TEACHER', false);

    const directorAuthorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: vi.fn().mockResolvedValue(mockDirectorDoc),
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });
    const inactiveAuthorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: vi.fn().mockResolvedValue(mockInactiveDoc),
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });

    const payload = createGatewayPayload('room-maternal-c2', 'Maternal C2', 43, 48);
    const request = createMockRequest(payload);

    await expect(
      handleProposeWeeklyPlanning(request, { authorizer: directorAuthorizer, executor: createMockExecutor() })
    ).rejects.toThrow(
      new HttpsError('permission-denied', "Role 'DIRECTOR' is not authorized for weekly planning AI proposals. Only TEACHER is permitted.")
    );

    await expect(
      handleProposeWeeklyPlanning(request, { authorizer: inactiveAuthorizer, executor: createMockExecutor() })
    ).rejects.toThrow(
      new HttpsError('permission-denied', 'Authorization context is inactive.')
    );
  });

  it('7. La resolución de alias NO permite acceso a salas no asignadas (fail-closed estricto)', async () => {
    // Usuario asignado únicamente a Maternal C1
    const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc(['room-maternal-c1']));
    const authorizer = createFirestoreWeeklyPlanningAuthorizer({
      reader: mockReader,
      nowProvider: () => new Date('2026-08-24T12:00:00Z'),
    });
    const mockExecutor = createMockExecutor();

    // Intentar solicitar Maternal C2 (o alias maternal-c2 o sala inventada) debe ser estrictamente rechazado
    const unauthorizedRooms = ['room-maternal-c2', 'maternal-c2', 'room-maternal-a', 'room-inexistente'];

    for (const roomId of unauthorizedRooms) {
      const payload = createGatewayPayload(roomId, 'Sala no asignada', 43, 48);
      const request = createMockRequest(payload);

      await expect(
        handleProposeWeeklyPlanning(request, { authorizer, executor: mockExecutor })
      ).rejects.toThrow(
        new HttpsError('permission-denied', 'Teacher is not authorized for the requested room.')
      );
    }

    expect(mockExecutor).toHaveBeenCalledTimes(0);
  });
});
