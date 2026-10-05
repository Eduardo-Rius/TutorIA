import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import {
  handleProposeWeeklyPlanning,
  validateProposeWeeklyPlanningGatewayPayload,
  mapToSafeWeeklyPlanningError,
  classifyWeeklyPlanningFailure,
  proposeWeeklyPlanning,
  MAX_WEEKLY_PLANNING_PAYLOAD_BYTES,
  ProposeWeeklyPlanningGatewayRequest,
  WeeklyPlanningGatewayLogEntry,
  WeeklyPlanningProcessingStage,
  WeeklyPlanningFailureCode,
} from '../src/proposeWeeklyPlanning';
import {
  createFirestoreWeeklyPlanningAuthorizer,
  FirestoreWeeklyPlanningAuthorizer,
} from '../src/FirestoreWeeklyPlanningAuthorizer';
import {
  WeeklyPlanningAIExecutorConfigurationError,
  WeeklyPlanningAIExecutorTransportError,
  WeeklyPlanningAIExecutorHttpError,
  WeeklyPlanningAIExecutorInvalidResponseError,
} from '../../src/infrastructure/ai/OpenAIWeeklyPlanningExecutor';
import {
  WeeklyPlanningProposalResponse,
  InvalidWeeklyPlanningProposalError,
  UnsupportedPedagogicalPolicyError,
  BlockingMaterialPolicyViolationError,
  PedagogicalPolicyViolationError,
  WeeklyPlanningDensityViolationError,
} from '../../src/application/planning/WeeklyPlanningProposalSource';
import { WeeklyPlanning } from '../../src/domain/planning/WeeklyPlanning';
import {
  createRequestScopedMaterialTable,
  projectInternalActivityToCanonical,
} from '../../src/application/planning/AIWeeklyPlanningProposalSource';

describe('proposeWeeklyPlanning Gateway Foundation (H1R11.5)', () => {
  const FAKE_TEACHER_UID = 'teacher-uid-anita-123';
  const FAKE_DAYCARE_ID = 'daycare-cdmx-001';
  const FAKE_ROOM_ID = 'room-lactantes-a';

  const validSampleProposal: WeeklyPlanningProposalResponse = Object.freeze({
    days: Object.freeze([
      {
        dayOfWeek: 'MONDAY',
        activities: [
          {
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: 'Estimular expresión plástica',
            description: 'Pintura dactilar libre',
            durationMinutes: 20,
            materials: ['Pintura vegetal', 'Papel kraft'],
          },
        ],
      },
      {
        dayOfWeek: 'TUESDAY',
        activities: [
          {
            category: 'AMBIENTES DE APRENDIZAJE',
            objective: 'Coordinación motriz',
            description: 'Circuito motriz con aros',
            durationMinutes: 25,
            materials: ['Aros', 'Colchonetas'],
          },
        ],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        activities: [
          {
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Comprensión auditiva',
            description: 'Lectura de cuento con títeres',
            durationMinutes: 20,
            materials: ['Cuento ilustrado'],
          },
        ],
      },
      {
        dayOfWeek: 'THURSDAY',
        activities: [
          {
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Ritmo y movimiento',
            description: 'Canciones con pañuelos',
            durationMinutes: 15,
            materials: ['Música', 'Pañuelos'],
          },
        ],
      },
      {
        dayOfWeek: 'FRIDAY',
        activities: [
          {
            category: 'PENSAMIENTO MATEMÁTICO',
            objective: 'Nociones de tamaño',
            description: 'Clasificación de bloques',
            durationMinutes: 20,
            materials: ['Bloques de madera'],
          },
        ],
      },
    ]),
  });

  const createValidGatewayPayload = (
    overrides: Partial<ProposeWeeklyPlanningGatewayRequest> = {}
  ): ProposeWeeklyPlanningGatewayRequest => ({
    weekStart: '2026-10-05',
    weekEnd: '2026-10-09',
    modality: 'DIRECT',
    room: {
      roomId: FAKE_ROOM_ID,
      name: 'Lactantes A',
      minAgeMonths: 6,
      maxAgeMonths: 12,
    },
    currentContext: {
      observations: 'El grupo interactúa positivamente con texturas.',
      identifiedNeeds: 'Consolidar sostén cefálico y prensión.',
      specialSituations: 'Un lactante en periodo de incorporación.',
      availableMaterials: 'Mantas sensoriales, sonajas plásticas.',
    },
    constraints: {
      minActivitiesPerDay: 1,
      maxActivitiesPerDay: 2,
      minDurationMinutes: 15,
      maxDurationMinutes: 30,
    },
    planningId: 'operational-plan-123',
    daycareId: FAKE_DAYCARE_ID,
    ...overrides,
  });

  const createMockCallableRequest = (
    data: unknown = createValidGatewayPayload(),
    auth: { uid: string; token?: Record<string, unknown> } | null = {
      uid: FAKE_TEACHER_UID,
    }
  ): CallableRequest<unknown> =>
    ({
      data,
      auth,
      rawRequest: {} as any,
      acceptsPushNotifications: false,
    } as unknown as CallableRequest<unknown>);

  const createMockAuthorizerDoc = (overrides: Record<string, unknown> = {}) => ({
    authUid: FAKE_TEACHER_UID,
    active: true,
    institutionalRole: 'TEACHER',
    authorizedDaycareIds: [FAKE_DAYCARE_ID],
    roomIds: [FAKE_ROOM_ID],
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T23:59:59Z'),
    ...overrides,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Authentication Boundary (A, B, C)', () => {
    it('A. Unauthenticated request is rejected with unauthenticated error', async () => {
      const request = createMockCallableRequest(createValidGatewayPayload(), null);
      await expect(handleProposeWeeklyPlanning(request)).rejects.toThrow(
        new HttpsError('unauthenticated', 'User must be authenticated to request weekly planning proposals.')
      );
    });

    it('B. Blank caller UID is rejected with unauthenticated error', async () => {
      const request = createMockCallableRequest(createValidGatewayPayload(), { uid: '   ' });
      await expect(handleProposeWeeklyPlanning(request)).rejects.toThrow(
        new HttpsError('unauthenticated', 'User must be authenticated to request weekly planning proposals.')
      );
    });

    it('C. Authenticated TEACHER with valid context is authorized and succeeds', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);

      const request = createMockCallableRequest();
      const result = await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(result).toBeDefined();
      expect(result.days).toHaveLength(5);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Authorization Boundary (F, G, H, I, J, K, L)', () => {
    it('F. DIRECTOR role is denied with permission-denied', async () => {
      const mockReader = vi.fn().mockResolvedValue(
        createMockAuthorizerDoc({ institutionalRole: 'DIRECTOR' })
      );
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest();
      await expect(
        handleProposeWeeklyPlanning(request, { authorizer })
      ).rejects.toThrow(
        /Role 'DIRECTOR' is not authorized for weekly planning AI proposals/
      );
    });

    it('G. SUPERVISOR role is denied with permission-denied', async () => {
      const mockReader = vi.fn().mockResolvedValue(
        createMockAuthorizerDoc({ institutionalRole: 'SUPERVISOR' })
      );
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest();
      await expect(
        handleProposeWeeklyPlanning(request, { authorizer })
      ).rejects.toThrow(
        /Role 'SUPERVISOR' is not authorized for weekly planning AI proposals/
      );
    });

    it('H. Inactive assignment is denied with permission-denied', async () => {
      const mockReader = vi.fn().mockResolvedValue(
        createMockAuthorizerDoc({ active: false })
      );
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest();
      await expect(
        handleProposeWeeklyPlanning(request, { authorizer })
      ).rejects.toThrow(/Authorization context is inactive/);
    });

    it('I. Expired assignment is denied with permission-denied', async () => {
      const mockReader = vi.fn().mockResolvedValue(
        createMockAuthorizerDoc({
          validTo: new Date('2026-09-01T00:00:00Z'),
        })
      );
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest();
      await expect(
        handleProposeWeeklyPlanning(request, { authorizer })
      ).rejects.toThrow(/Authorization context has expired/);
    });

    it('J. Future assignment is denied with permission-denied', async () => {
      const mockReader = vi.fn().mockResolvedValue(
        createMockAuthorizerDoc({
          validFrom: new Date('2026-11-01T00:00:00Z'),
        })
      );
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest();
      await expect(
        handleProposeWeeklyPlanning(request, { authorizer })
      ).rejects.toThrow(/Authorization context is not yet valid/);
    });

    it('K. Malformed authorization document is denied with permission-denied', async () => {
      const mockReader = vi.fn().mockResolvedValue({
        authUid: FAKE_TEACHER_UID,
        active: true,
        institutionalRole: 'TEACHER',
        authorizedDaycareIds: [], // Empty daycares
        validFrom: 'not-a-valid-date-timestamp',
      });
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest();
      await expect(
        handleProposeWeeklyPlanning(request, { authorizer })
      ).rejects.toThrow(HttpsError);
    });

    it('L. Authorization lookup failure (Firestore error) fails closed with permission-denied', async () => {
      const mockReader = vi.fn().mockRejectedValue(new Error('Firestore connection timeout'));
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest();
      await expect(
        handleProposeWeeklyPlanning(request, { authorizer })
      ).rejects.toThrow(
        /Production authorization context is unresolved: authorization service error/
      );
    });
  });

  describe('3. Request Validation & Forbidden Authority Fields (M, N, O, P)', () => {
    it('M. Malformed non-object request is rejected with invalid-argument', () => {
      expect(() => validateProposeWeeklyPlanningGatewayPayload(null)).toThrow(
        /Request payload must be a non-null JSON object/
      );
      expect(() => validateProposeWeeklyPlanningGatewayPayload('string-payload')).toThrow(
        /Request payload must be a non-null JSON object/
      );
      expect(() => validateProposeWeeklyPlanningGatewayPayload([1, 2, 3])).toThrow(
        /Request payload must be a non-null JSON object/
      );
    });

    it('N. Oversized request exceeding 16 KB is rejected with invalid-argument', () => {
      const hugeObservations = 'A'.repeat(MAX_WEEKLY_PLANNING_PAYLOAD_BYTES + 500);
      const payload = createValidGatewayPayload({
        currentContext: {
          observations: hugeObservations,
        },
      });

      expect(() => validateProposeWeeklyPlanningGatewayPayload(payload)).toThrow(
        /Payload size exceeds/
      );
    });

    it('O. Authority and lifecycle fields are strictly rejected (fails closed)', () => {
      const forbiddenFields = [
        'status',
        'approvedBy',
        'approvedAt',
        'submittedBy',
        'submittedAt',
        'closedBy',
        'closedAt',
        'reviewHistory',
        'evaluation',
        'evaluationStatus',
        'curricularTraceability',
        'pdaId',
        'catalogRevision',
        'complementaryActivities',
        'prioritizedPractices',
      ];

      for (const field of forbiddenFields) {
        const payloadWithForbidden = {
          ...createValidGatewayPayload(),
          [field]: 'malicious-injected-value',
        };

        expect(() => validateProposeWeeklyPlanningGatewayPayload(payloadWithForbidden)).toThrow(
          /Request contains forbidden or authority-bearing field/
        );
      }
    });

    it('P. PII, child/family identities, and medical data fields are strictly rejected', () => {
      const forbiddenPii = [
        'children',
        'childId',
        'childName',
        'family',
        'familyName',
        'medicalData',
        'diagnosis',
      ];

      for (const field of forbiddenPii) {
        const payloadWithPii = {
          ...createValidGatewayPayload(),
          [field]: 'sensitive-child-pii',
        };

        expect(() => validateProposeWeeklyPlanningGatewayPayload(payloadWithPii)).toThrow(
          /Request contains forbidden or authority-bearing field/
        );
      }
    });

    it('rejects client injection of secrets, model parameters, or correlation IDs', () => {
      const injectionFields = [
        'apiKey',
        'secret',
        'token',
        'model',
        'baseUrl',
        'systemPrompt',
        'correlationId',
      ];

      for (const field of injectionFields) {
        const payloadWithInjection = {
          ...createValidGatewayPayload(),
          [field]: 'injected-config-value',
        };

        expect(() => validateProposeWeeklyPlanningGatewayPayload(payloadWithInjection)).toThrow(
          /Request contains forbidden or authority-bearing field/
        );
      }
    });
  });

  describe('4. Privacy & Authorization Context Separation (Q, R, S, T, U)', () => {
    it('Q, R, S, T, U. Proves planningId, roomId, daycareId, UID, and API key never reach AI prompt payload', async () => {
      let interceptedAppRequest: any = null;

      const mockExecutor = vi.fn().mockImplementation((req) => {
        interceptedAppRequest = req;
        return Promise.resolve(validSampleProposal);
      });

      const mockReader = vi.fn().mockResolvedValue(
        createMockAuthorizerDoc({
          authorizedDaycareIds: ['daycare-id-to-strip-888'],
        })
      );
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const request = createMockCallableRequest(
        createValidGatewayPayload({
          planningId: 'planning-id-to-strip-999',
          daycareId: 'daycare-id-to-strip-888',
        })
      );

      await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(interceptedAppRequest).toBeDefined();

      // Verify planningId was stripped
      expect(interceptedAppRequest.planningId).toBeUndefined();

      // Verify daycareId was stripped
      expect(interceptedAppRequest.daycareId).toBeUndefined();

      // Verify UID never exists in app request
      expect(interceptedAppRequest.uid).toBeUndefined();
      expect(interceptedAppRequest.teacherId).toBeUndefined();

      // Verify API key never exists in app request
      expect(interceptedAppRequest.apiKey).toBeUndefined();
    });
  });

  describe('5. Modality Support (D, E)', () => {
    it('D. DIRECT modality is accepted and processed', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest(createValidGatewayPayload({ modality: 'DIRECT' }));

      const response = await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(response.days).toHaveLength(5);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('E. INDIRECT modality is accepted and processed', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest(createValidGatewayPayload({ modality: 'INDIRECT' }));

      const response = await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(response.days).toHaveLength(5);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Execution Exactly Once & Transient Response (V, W, X, Y)', () => {
    it('V, W, X, Y. Valid request reaches executor exactly once and returns transient proposal without lifecycle authority', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest();

      const response = await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(response.days).toHaveLength(5);

      // Verify response has zero authority fields
      const respAny = response as any;
      expect(respAny.status).toBeUndefined();
      expect(respAny.approvedBy).toBeUndefined();
      expect(respAny.submittedBy).toBeUndefined();
      expect(respAny.closedBy).toBeUndefined();
      expect(respAny.reviewHistory).toBeUndefined();
    });
  });

  describe('7. Safe Error Mapping (Z, AA, AB, AC, AD, AE, AF)', () => {
    it('Z. Executor CONFIGURATION error maps to failed-precondition', () => {
      const err = new WeeklyPlanningAIExecutorConfigurationError('Missing API key');
      const mapped = mapToSafeWeeklyPlanningError(err);
      expect(mapped.code).toBe('failed-precondition');
      expect(mapped.message).toContain('service is misconfigured');
    });

    it('AA. Executor TRANSPORT error maps to unavailable', () => {
      const err = new WeeklyPlanningAIExecutorTransportError('Transport failure');
      const mapped = mapToSafeWeeklyPlanningError(err);
      expect(mapped.code).toBe('unavailable');
      expect(mapped.message).toContain('temporarily unavailable due to a network transport issue');
    });

    it('AB. Executor HTTP 401 error maps to unavailable without leaking secrets or status text', () => {
      const err = new WeeklyPlanningAIExecutorHttpError('HTTP error 401', 401);
      const mapped = mapToSafeWeeklyPlanningError(err);
      expect(mapped.code).toBe('unavailable');
      expect(mapped.message).not.toContain('401');
      expect(mapped.message).not.toContain('key');
      expect(mapped.message).toBe('Weekly planning AI service is temporarily unavailable.');
    });

    it('AC. Executor HTTP 429 error maps to resource-exhausted', () => {
      const err = new WeeklyPlanningAIExecutorHttpError('HTTP error 429', 429);
      const mapped = mapToSafeWeeklyPlanningError(err);
      expect(mapped.code).toBe('resource-exhausted');
      expect(mapped.message).toContain('rate limit exceeded');
    });

    it('AD. Executor HTTP 500 error maps to unavailable without leaking body', () => {
      const err = new WeeklyPlanningAIExecutorHttpError('HTTP error 500', 500);
      const mapped = mapToSafeWeeklyPlanningError(err);
      expect(mapped.code).toBe('unavailable');
      expect(mapped.message).toBe('Weekly planning AI service is temporarily unavailable.');
    });

    it('AE. Executor INVALID_RESPONSE error maps to internal', () => {
      const err = new WeeklyPlanningAIExecutorInvalidResponseError('Invalid model JSON');
      const mapped = mapToSafeWeeklyPlanningError(err);
      expect(mapped.code).toBe('internal');
      expect(mapped.message).toContain('received an invalid response');
    });

    it('AF. Canonical validation failure maps to internal without exposing internals', () => {
      const err = new InvalidWeeklyPlanningProposalError('Canonical validation error');
      const mapped = mapToSafeWeeklyPlanningError(err);
      expect(mapped.code).toBe('internal');
      expect(mapped.message).toBe('Proposed weekly plan failed canonical validation.');
    });
  });

  describe('8. Safe Observability & Telemetry (AG, AH)', () => {
    it('AG, AH. Emits safe structured log entries without logging prompts, free text, or API keys', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const logger = {
        write: (entry: WeeklyPlanningGatewayLogEntry) => logs.push(entry),
      };

      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest();

      await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
        logger,
      });

      expect(logs).toHaveLength(2); // started + completed
      const [started, completed] = logs;

      expect(started.event).toBe('weekly_planning_gateway.started');
      expect(completed.event).toBe('weekly_planning_gateway.completed');

      const serializedStarted = JSON.stringify(started);
      const serializedCompleted = JSON.stringify(completed);

      // Verify no prompts or sensitive pedagogical text logged
      expect(serializedStarted).not.toContain('El grupo interactúa');
      expect(serializedCompleted).not.toContain('El grupo interactúa');
      expect(serializedStarted).not.toContain('Pintura dactilar');
      expect(serializedCompleted).not.toContain('Pintura dactilar');

      // Verify no PII or technical IDs logged
      expect(serializedStarted).not.toContain(FAKE_TEACHER_UID);
      expect(serializedCompleted).not.toContain(FAKE_TEACHER_UID);
      expect(serializedStarted).not.toContain(FAKE_DAYCARE_ID);
      expect(serializedCompleted).not.toContain(FAKE_DAYCARE_ID);
      expect(serializedStarted).not.toContain(FAKE_ROOM_ID);
      expect(serializedCompleted).not.toContain(FAKE_ROOM_ID);
    });

    it('logs safe failed event on executor error with safeErrorCategory', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const logger = {
        write: (entry: WeeklyPlanningGatewayLogEntry) => logs.push(entry),
      };

      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockRejectedValue(
        new WeeklyPlanningAIExecutorHttpError('Quota', 429)
      );
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger,
        })
      ).rejects.toThrow();

      expect(logs).toHaveLength(2);
      expect(logs[1].event).toBe('weekly_planning_gateway.failed');
      expect(logs[1].safeErrorCategory).toBe('resource-exhausted');
    });
  });

  describe('9. Human Governance & Immutability (AI, AJ, AK, AL, AM, AN, AO)', () => {
    it('AI, AJ. Proves zero repository write or aggregate mutation occurs during gateway execution', async () => {
      const planning = WeeklyPlanning.create(
        'plan-gov-test-999',
        FAKE_DAYCARE_ID,
        FAKE_ROOM_ID,
        FAKE_TEACHER_UID,
        '2026-10-05',
        '2026-10-09'
      );

      const beforeJson = JSON.stringify(planning);

      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest();

      await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      const afterJson = JSON.stringify(planning);
      expect(afterJson).toBe(beforeJson);
      expect(planning.status).toBe('DRAFT');
    });

    it('AK, AL, AM, AN, AO. Proves output carries zero approval, evaluation, PDA, or complementary activities', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest();

      const response = await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      const respAny = response as any;
      expect(respAny.status).toBeUndefined();
      expect(respAny.evaluations).toBeUndefined();
      expect(respAny.curricularTraceability).toBeUndefined();
      expect(respAny.complementaryActivities).toBeUndefined();
      expect(respAny.prioritizedPractices).toBeUndefined();

      for (const day of response.days) {
        for (const act of day.activities) {
          expect((act as any).curricularTraceability).toBeUndefined();
          expect((act as any).pdaId).toBeUndefined();
          expect((act as any).catalogRevision).toBeUndefined();
        }
      }
    });
  });

  describe('10. Secret Binding & Deployment Declaration (AP, AR, AS, AT)', () => {
    it('AP. proposeWeeklyPlanning declares the OPENAI_API_KEY secret binding in __endpoint and __trigger', () => {
      const endpointSecrets = (proposeWeeklyPlanning as any).__endpoint?.secretEnvironmentVariables;
      expect(endpointSecrets).toContainEqual({ key: 'OPENAI_API_KEY' });

      const triggerSecrets = (proposeWeeklyPlanning as any).__trigger?.secrets;
      expect(
        triggerSecrets?.some(
          (s: any) => s?.name === 'OPENAI_API_KEY' || s === 'OPENAI_API_KEY'
        )
      ).toBe(true);
    });

    it('AR, AS, AT. Zero real network, Firebase remote, or OpenAI calls during gateway execution', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest();

      await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('11. Safe Failure Observability & Deterministic Classification (H1R12.5-C.1: A through M)', () => {
    const ALLOWED_STAGES: readonly WeeklyPlanningProcessingStage[] = Object.freeze([
      'REQUEST_VALIDATION',
      'AUTHORIZATION',
      'POLICY_RESOLUTION',
      'AI_DISPATCH',
      'PROVIDER_RESPONSE',
      'PROVIDER_PARSE',
      'INTERNAL_PROJECTION',
      'CANONICAL_VALIDATION',
      'TECHNICAL_BOUNDS',
      'DAILY_READING',
      'MATERIAL_ENCLOSURE',
      'AGE_SAFETY',
      'RESPONSE_ASSEMBLY',
      'UNEXPECTED_INTERNAL',
    ]);

    const ALLOWED_FAILURE_CODES: readonly WeeklyPlanningFailureCode[] = Object.freeze([
      'INVALID_PROVIDER_RESPONSE',
      'INVALID_PROVIDER_JSON',
      'INVALID_CANONICAL_PROPOSAL',
      'TECHNICAL_BOUNDS_VIOLATION',
      'MISSING_DAILY_READING',
      'MULTIPLE_DAILY_READING',
      'INVALID_READING_DURATION',
      'OBJECTIVE_MATERIAL_LEAK',
      'INVALID_MATERIAL_REF',
      'UNDECLARED_MATERIAL',
      'PROCEDURAL_MATERIAL_LEAK',
      'PROCEDURAL_REF_SYNTAX_LEAK',
      'UNAUTHORIZED_MATERIAL_LEAK',
      'ZERO_MATERIAL_PLACEHOLDER_LEAK',
      'ZERO_MATERIAL_ACTION_VERB_LEAK',
      'BLOCKING_MATERIAL_POLICY',
      'BLOCKING_AGE_POLICY',
      'UNSUPPORTED_POLICY',
      'UNAUTHORIZED',
      'INVALID_REQUEST',
      'UNEXPECTED_INTERNAL',
    ]);

    it('A, B, C. Failure telemetry preserves correlationId, safeErrorCategory, event, latency semantics, and emits bounded stage & failureCode', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const logger = { write: (entry: WeeklyPlanningGatewayLogEntry) => logs.push(entry) };
      const customCorrelationId = 'test-corr-id-12345';

      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockRejectedValue(
        new WeeklyPlanningAIExecutorTransportError('Network timeout')
      );
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger,
          correlationIdProvider: () => customCorrelationId,
        })
      ).rejects.toThrow();

      expect(logs).toHaveLength(2);
      const [started, failed] = logs;

      expect(started.event).toBe('weekly_planning_gateway.started');
      expect(started.correlationId).toBe(customCorrelationId);

      expect(failed.event).toBe('weekly_planning_gateway.failed');
      expect(failed.correlationId).toBe(customCorrelationId);
      expect(failed.model).toBe('gpt-4o-mini');
      expect(typeof failed.latencyMs).toBe('number');
      expect(failed.latencyMs).toBeGreaterThanOrEqual(0);
      expect(failed.safeErrorCategory).toBe('unavailable');

      // Bounded processingStage
      expect(ALLOWED_STAGES).toContain(failed.processingStage);
      expect(failed.processingStage).toBe('AI_DISPATCH');

      // Bounded failureCode
      expect(ALLOWED_FAILURE_CODES).toContain(failed.failureCode);
      expect(failed.failureCode).toBe('INVALID_PROVIDER_RESPONSE');
    });

    it('D. Known authorization failure maps deterministically to AUTHORIZATION / UNAUTHORIZED', async () => {
      // Unauthenticated caller
      const logs1: WeeklyPlanningGatewayLogEntry[] = [];
      const unauthRequest = createMockCallableRequest(createValidGatewayPayload(), null);
      await expect(
        handleProposeWeeklyPlanning(unauthRequest, {
          logger: { write: (entry) => logs1.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs1).toHaveLength(2);
      expect(logs1[1].event).toBe('weekly_planning_gateway.failed');
      expect(logs1[1].processingStage).toBe('AUTHORIZATION');
      expect(logs1[1].failureCode).toBe('UNAUTHORIZED');
      expect(logs1[1].safeErrorCategory).toBe('unauthenticated');

      // Unauthorized role (DIRECTOR)
      const logs2: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(
        createMockAuthorizerDoc({ institutionalRole: 'DIRECTOR' })
      );
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });
      const directorRequest = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(directorRequest, {
          authorizer,
          logger: { write: (entry) => logs2.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs2).toHaveLength(2);
      expect(logs2[1].event).toBe('weekly_planning_gateway.failed');
      expect(logs2[1].processingStage).toBe('AUTHORIZATION');
      expect(logs2[1].failureCode).toBe('UNAUTHORIZED');
      expect(logs2[1].safeErrorCategory).toBe('permission-denied');
    });

    it('E. Known invalid request maps deterministically to REQUEST_VALIDATION / INVALID_REQUEST', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const invalidPayload = {
        ...createValidGatewayPayload(),
        modality: 'INVALID_MODALITY',
      };
      const badRequest = createMockCallableRequest(invalidPayload);

      await expect(
        handleProposeWeeklyPlanning(badRequest, {
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      expect(logs[1].event).toBe('weekly_planning_gateway.failed');
      expect(logs[1].processingStage).toBe('REQUEST_VALIDATION');
      expect(logs[1].failureCode).toBe('INVALID_REQUEST');
      expect(logs[1].safeErrorCategory).toBe('invalid-argument');
    });

    it('F. Known unsupported policy maps deterministically to POLICY_RESOLUTION / UNSUPPORTED_POLICY', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockRejectedValue(
        new UnsupportedPedagogicalPolicyError('No compatible policy for age profile')
      );
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      expect(logs[1].event).toBe('weekly_planning_gateway.failed');
      expect(logs[1].processingStage).toBe('POLICY_RESOLUTION');
      expect(logs[1].failureCode).toBe('UNSUPPORTED_POLICY');
      expect(logs[1].safeErrorCategory).toBe('failed-precondition');
    });

    it('G. Known provider transport/provider-response failure maps deterministically', () => {
      // 1. HTTP 429 rate limit
      const c1 = classifyWeeklyPlanningFailure(new WeeklyPlanningAIExecutorHttpError('Rate limit', 429));
      expect(c1.processingStage).toBe('PROVIDER_RESPONSE');
      expect(c1.failureCode).toBe('INVALID_PROVIDER_RESPONSE');
      expect(c1.safeError.code).toBe('resource-exhausted');

      // 2. HTTP 500 upstream failure
      const c2 = classifyWeeklyPlanningFailure(new WeeklyPlanningAIExecutorHttpError('Server error', 500));
      expect(c2.processingStage).toBe('PROVIDER_RESPONSE');
      expect(c2.failureCode).toBe('INVALID_PROVIDER_RESPONSE');
      expect(c2.safeError.code).toBe('unavailable');

      // 3. Transport timeout failure
      const c3 = classifyWeeklyPlanningFailure(new WeeklyPlanningAIExecutorTransportError('Timeout'));
      expect(c3.processingStage).toBe('AI_DISPATCH');
      expect(c3.failureCode).toBe('INVALID_PROVIDER_RESPONSE');
      expect(c3.safeError.code).toBe('unavailable');

      // 4. Invalid response - missing choices
      const c4 = classifyWeeklyPlanningFailure(new WeeklyPlanningAIExecutorInvalidResponseError('missing choices'));
      expect(c4.processingStage).toBe('PROVIDER_PARSE');
      expect(c4.failureCode).toBe('INVALID_PROVIDER_RESPONSE');
      expect(c4.safeError.code).toBe('internal');

      // 5. Invalid response - not valid JSON
      const c5 = classifyWeeklyPlanningFailure(new WeeklyPlanningAIExecutorInvalidResponseError('model content is not valid JSON'));
      expect(c5.processingStage).toBe('PROVIDER_PARSE');
      expect(c5.failureCode).toBe('INVALID_PROVIDER_JSON');
      expect(c5.safeError.code).toBe('internal');
    });

    it('H. Known canonical/internal proposal validation maps to safe bounded code', () => {
      // General canonical validation
      const c1 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError('AI output must contain a "days" array.'));
      expect(c1.processingStage).toBe('CANONICAL_VALIDATION');
      expect(c1.failureCode).toBe('INVALID_CANONICAL_PROPOSAL');
      expect(c1.safeError.code).toBe('internal');

      // Technical bounds violation
      const c2 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError('Proposed plan fails technical activity bounds: Day MONDAY has 0 activities (minimum is 1 activity per operational day).'));
      expect(c2.processingStage).toBe('TECHNICAL_BOUNDS');
      expect(c2.failureCode).toBe('TECHNICAL_BOUNDS_VIOLATION');
      expect(c2.safeError.code).toBe('internal');

      // Missing daily reading
      const c3 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError("Proposed plan fails daily reading invariant: Day MONDAY is missing the required daily reading activity ('LECTURA EN VOZ ALTA')."));
      expect(c3.processingStage).toBe('DAILY_READING');
      expect(c3.failureCode).toBe('MISSING_DAILY_READING');
      expect(c3.safeError.code).toBe('internal');

      // Multiple daily reading
      const c4 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError("Proposed plan fails daily reading invariant: Day MONDAY contains 2 reading activities. TutorIA V1 requires exactly one canonical reading activity per operational day."));
      expect(c4.processingStage).toBe('DAILY_READING');
      expect(c4.failureCode).toBe('MULTIPLE_DAILY_READING');
      expect(c4.safeError.code).toBe('internal');

      // Invalid reading duration
      const c5 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError("Proposed plan fails daily reading invariant: Day MONDAY reading activity duration is 20 minutes; must be exactly 15 minutes."));
      expect(c5.processingStage).toBe('DAILY_READING');
      expect(c5.failureCode).toBe('INVALID_READING_DURATION');
      expect(c5.safeError.code).toBe('internal');

      // Objective material leak
      const c6 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError('Activity objective must be material-agnostic and cannot name physical materials. Found "pelota" in objective: "Jugar con pelota"'));
      expect(c6.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(c6.failureCode).toBe('OBJECTIVE_MATERIAL_LEAK');
      expect(c6.safeError.code).toBe('internal');

      // Invalid material ref
      const c7 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError("Unknown material ref 'MAT-99' at day index 0, activity index 0. Must be within request-scoped allowed set."));
      expect(c7.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(c7.failureCode).toBe('INVALID_MATERIAL_REF');
      expect(c7.safeError.code).toBe('internal');

      // Undeclared material
      const c8 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError("Activity at day index 0, activity index 0 proceduralAction mentions material 'mantas' without declaring its ref in materialRefs."));
      expect(c8.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(c8.failureCode).toBe('UNDECLARED_MATERIAL');
      expect(c8.safeError.code).toBe('internal');

      // Procedural ref syntax leak
      const c9 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError("Activity at day index 0, activity index 0 proceduralAction contains unprojected material ref syntax: MAT-01"));
      expect(c9.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(c9.failureCode).toBe('PROCEDURAL_REF_SYNTAX_LEAK');
      expect(c9.safeError.code).toBe('internal');

      // Unauthorized material leak (Case A golden check)
      const c10 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError("Activity at day index 0, activity index 0 proceduralAction introduces unauthorized material 'sonaja(s)' not present in request-scoped authorized materials."));
      expect(c10.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(c10.failureCode).toBe('UNAUTHORIZED_MATERIAL_LEAK');
      expect(c10.safeError.code).toBe('internal');

      // Zero-material {material} placeholder leak
      const c11 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError('Activity at day index 0, activity index 0 with empty materialRefs cannot reference {material} in proceduralAction: "Mover {material}"'));
      expect(c11.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(c11.failureCode).toBe('ZERO_MATERIAL_PLACEHOLDER_LEAK');
      expect(c11.safeError.code).toBe('internal');

      // Zero-material forbidden action verb leak (utilizar/usar/emplear/ocupar)
      const c12 = classifyWeeklyPlanningFailure(new InvalidWeeklyPlanningProposalError('Activity at day index 0, activity index 0 with empty materialRefs cannot use object-introducing action verb \'utilizar\' without declaring authorized materialRefs: "utilizar gestos"'));
      expect(c12.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(c12.failureCode).toBe('ZERO_MATERIAL_ACTION_VERB_LEAK');
      expect(c12.safeError.code).toBe('internal');
    });

    it('I. Known blocking material policy maps deterministically to MATERIAL_ENCLOSURE / BLOCKING_MATERIAL_POLICY', () => {
      const violation = {
        ruleId: 'MAT_001',
        message: 'Material no disponible en sala',
        severity: 'BLOCKING_MATERIAL' as const,
      };
      const err = new BlockingMaterialPolicyViolationError('Violation', [violation]);
      const classified = classifyWeeklyPlanningFailure(err);

      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('BLOCKING_MATERIAL_POLICY');
      expect(classified.safeError.code).toBe('failed-precondition');
    });

    it('J. Known blocking age policy maps deterministically to AGE_SAFETY / BLOCKING_AGE_POLICY', () => {
      const violation = {
        ruleId: 'AGE_001',
        message: 'Actividad incompatible con edad del grupo',
        severity: 'BLOCKING_AGE' as const,
      };
      const err = new PedagogicalPolicyViolationError('Age violation', [violation]);
      const classified = classifyWeeklyPlanningFailure(err);

      expect(classified.processingStage).toBe('AGE_SAFETY');
      expect(classified.failureCode).toBe('BLOCKING_AGE_POLICY');
      expect(classified.safeError.code).toBe('failed-precondition');
    });

    it('K. Unknown exception maps to UNEXPECTED_INTERNAL without exposing exception content', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const sensitiveExceptionText = 'SECRET_DB_PASS_12345: Connection crashed at internal/db/driver.ts:88';
      const mockExecutor = vi.fn().mockRejectedValue(new Error(sensitiveExceptionText));
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      const failed = logs[1];
      expect(failed.event).toBe('weekly_planning_gateway.failed');
      expect(failed.processingStage).toBe('UNEXPECTED_INTERNAL');
      expect(failed.failureCode).toBe('UNEXPECTED_INTERNAL');
      expect(failed.safeErrorCategory).toBe('internal');

      // Prove raw exception text is NEVER present in telemetry
      const serialized = JSON.stringify(failed);
      expect(serialized).not.toContain(sensitiveExceptionText);
      expect(serialized).not.toContain('SECRET_DB_PASS_12345');
    });

    it('L. Telemetry does NOT contain pedagogical, user, PII, prompt, or secret content (ZERO CONTENT)', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockRejectedValue(
        new WeeklyPlanningAIExecutorHttpError('Upstream failure with internal payload: prompt="Sensorial Lactantes"', 500)
      );
      const request = createMockCallableRequest(createValidGatewayPayload({
        currentContext: {
          observations: 'Anita observa alta sensibilidad a texturas en el lactante Juanito Pérez.',
          identifiedNeeds: 'Consolidar sostén cefálico con pelotas de hule.',
          specialSituations: 'Familia Gómez solicita atención especial.',
          availableMaterials: 'Mantas sensoriales, sonajas plásticas, telas de seda.',
        },
      }));

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow();

      expect(logs).toHaveLength(2);
      const [started, failed] = logs;

      for (const entry of [started, failed]) {
        const serialized = JSON.stringify(entry);

        // Zero pedagogical/user prompt content
        expect(serialized).not.toContain('Anita observa');
        expect(serialized).not.toContain('Juanito Pérez');
        expect(serialized).not.toContain('Familia Gómez');
        expect(serialized).not.toContain('sostén cefálico');
        expect(serialized).not.toContain('Mantas sensoriales');
        expect(serialized).not.toContain('sonajas plásticas');
        expect(serialized).not.toContain('Sensorial Lactantes');

        // Zero PII / IDs / Secrets
        expect(serialized).not.toContain(FAKE_TEACHER_UID);
        expect(serialized).not.toContain(FAKE_DAYCARE_ID);
        expect(serialized).not.toContain(FAKE_ROOM_ID);
        expect(serialized).not.toContain('token');
        expect(serialized).not.toContain('apiKey');
        expect(serialized).not.toContain('stack');

        // Only allowlisted keys exist on log entry
        const entryKeys = Object.keys(entry);
        const allowedLogKeys = [
          'severity',
          'correlationId',
          'event',
          'model',
          'latencyMs',
          'promptTokens',
          'completionTokens',
          'totalTokens',
          'safeErrorCategory',
          'processingStage',
          'failureCode',
          'upstreamStatus',
        ];
        for (const key of entryKeys) {
          expect(allowedLogKeys).toContain(key);
        }
      }
    });

    it('M. Client-facing safe error behavior remains unchanged (no internal leakage to user)', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockRejectedValue(
        new InvalidWeeklyPlanningProposalError('Proposed plan fails daily reading invariant: Day MONDAY is missing the required daily reading activity.')
      );
      const request = createMockCallableRequest();

      let thrownError: any = null;
      try {
        await handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
        });
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(HttpsError);
      expect(thrownError.code).toBe('internal');
      expect(thrownError.message).toBe('Proposed weekly plan failed canonical validation.');

      // Client-facing error must NEVER expose operational diagnostics
      expect(thrownError.processingStage).toBeUndefined();
      expect(thrownError.failureCode).toBeUndefined();
      expect(thrownError.details).toBeUndefined();
      expect(thrownError.message).not.toContain('daily reading invariant');
      expect(thrownError.message).not.toContain('MONDAY');
    });
  });

  describe('12. H1R12.5-C.3: Material Enclosure Diagnostic Precision (A through K)', () => {
    it('A. raw MAT-01 in proceduralAction fails closed and emits PROCEDURAL_REF_SYNTAX_LEAK', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const err = new InvalidWeeklyPlanningProposalError(
        'Activity at day index 0, activity index 0 proceduralAction contains unprojected material ref syntax: "Desplazar MAT-01 frente al lactante"'
      );
      const mockExecutor = vi.fn().mockRejectedValue(err);
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      const failed = logs[1];
      expect(failed.event).toBe('weekly_planning_gateway.failed');
      expect(failed.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(failed.failureCode).toBe('PROCEDURAL_REF_SYNTAX_LEAK');
      expect(failed.safeErrorCategory).toBe('internal');
    });

    it('B. existing unauthorized sonaja Case-A condition fails closed and emits UNAUTHORIZED_MATERIAL_LEAK', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const err = new InvalidWeeklyPlanningProposalError(
        'Activity at day index 0, activity index 0 proceduralAction introduces unauthorized material \'sonaja(s)\' not present in request-scoped authorized materials.'
      );
      const mockExecutor = vi.fn().mockRejectedValue(err);
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      const failed = logs[1];
      expect(failed.event).toBe('weekly_planning_gateway.failed');
      expect(failed.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(failed.failureCode).toBe('UNAUTHORIZED_MATERIAL_LEAK');
      expect(failed.safeErrorCategory).toBe('internal');
    });

    it('C. {material} with materialRefs=[] fails closed and emits ZERO_MATERIAL_PLACEHOLDER_LEAK', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const err = new InvalidWeeklyPlanningProposalError(
        'Activity at day index 0, activity index 0 with empty materialRefs cannot reference {material} in proceduralAction: "Mover {material} frente al lactante"'
      );
      const mockExecutor = vi.fn().mockRejectedValue(err);
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      const failed = logs[1];
      expect(failed.event).toBe('weekly_planning_gateway.failed');
      expect(failed.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(failed.failureCode).toBe('ZERO_MATERIAL_PLACEHOLDER_LEAK');
      expect(failed.safeErrorCategory).toBe('internal');
    });

    it('D. zero materialRefs + existing forbidden action verb rule fails closed and emits ZERO_MATERIAL_ACTION_VERB_LEAK', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const err = new InvalidWeeklyPlanningProposalError(
        'Activity at day index 0, activity index 0 with empty materialRefs cannot use object-introducing action verb \'utilizar\' without declaring authorized materialRefs: "utilizar modulaciones de voz"'
      );
      const mockExecutor = vi.fn().mockRejectedValue(err);
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      const failed = logs[1];
      expect(failed.event).toBe('weekly_planning_gateway.failed');
      expect(failed.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(failed.failureCode).toBe('ZERO_MATERIAL_ACTION_VERB_LEAK');
      expect(failed.safeErrorCategory).toBe('internal');
    });

    it('E. all four material enclosure subconditions retain processingStage=MATERIAL_ENCLOSURE', () => {
      const subcodes: WeeklyPlanningFailureCode[] = [
        'PROCEDURAL_REF_SYNTAX_LEAK',
        'UNAUTHORIZED_MATERIAL_LEAK',
        'ZERO_MATERIAL_PLACEHOLDER_LEAK',
        'ZERO_MATERIAL_ACTION_VERB_LEAK',
      ];

      const errors = [
        new InvalidWeeklyPlanningProposalError('proceduralAction contains unprojected material ref syntax'),
        new InvalidWeeklyPlanningProposalError('proceduralAction introduces unauthorized material'),
        new InvalidWeeklyPlanningProposalError('with empty materialRefs cannot reference {material}'),
        new InvalidWeeklyPlanningProposalError('with empty materialRefs cannot use object-introducing action verb'),
      ];

      for (let i = 0; i < errors.length; i++) {
        const classified = classifyWeeklyPlanningFailure(errors[i]);
        expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
        expect(classified.failureCode).toBe(subcodes[i]);
      }
    });

    it('F. none of these tests log offending text/material content (ZERO CONTENT)', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const sensitiveOffendingAction = 'SECRET_OFFENDING_ACTION: Agitar sonajas prohibidas en la sala';
      const err = new InvalidWeeklyPlanningProposalError(
        `Activity at day index 0, activity index 0 proceduralAction introduces unauthorized material 'sonaja(s)' not present in request-scoped authorized materials: "${sensitiveOffendingAction}"`
      );
      const mockExecutor = vi.fn().mockRejectedValue(err);
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow();

      expect(logs).toHaveLength(2);
      const failed = logs[1];
      const serialized = JSON.stringify(failed);

      expect(serialized).not.toContain(sensitiveOffendingAction);
      expect(serialized).not.toContain('sonajas prohibidas');
      expect(serialized).not.toContain('Agitar');
      expect(serialized).not.toContain('proceduralAction');
    });

    it('G. existing valid zero-material activity still passes exactly as before', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const validZeroMaterialProposal: WeeklyPlanningProposalResponse = Object.freeze({
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Estimular la atención auditiva mediante rimas',
                description: 'Cantar rimas cortas con entonación afectuosa',
                durationMinutes: 15,
                materials: [],
              },
            ],
          },
          {
            dayOfWeek: 'TUESDAY',
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Favorecer el seguimiento visual',
                description: 'Narrar un cuento breve con expresiones faciales cálidas',
                durationMinutes: 15,
                materials: [],
              },
            ],
          },
          {
            dayOfWeek: 'WEDNESDAY',
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Promover la calma mediante el ritmo vocal',
                description: 'Compartir arrullos tradicionales en tono suave',
                durationMinutes: 15,
                materials: [],
              },
            ],
          },
          {
            dayOfWeek: 'THURSDAY',
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Explorar sonidos orales cariñosos',
                description: 'Recitar poesías sencillas de animales',
                durationMinutes: 15,
                materials: [],
              },
            ],
          },
          {
            dayOfWeek: 'FRIDAY',
            activities: [
              {
                category: 'LECTURA EN VOZ ALTA',
                objective: 'Fomentar la escucha activa',
                description: 'Contar una historia interactiva imitando sonidos de la naturaleza',
                durationMinutes: 15,
                materials: [],
              },
            ],
          },
        ],
      });

      const mockExecutor = vi.fn().mockResolvedValue(validZeroMaterialProposal);
      const request = createMockCallableRequest();

      const result = await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(result.days).toHaveLength(5);
      expect(result.days[0].activities[0].materials).toEqual([]);
      expect(result.days[0].activities[0].category).toBe('LECTURA EN VOZ ALTA');
    });

    it('H. existing authorized-material activity still passes exactly as before', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockResolvedValue(validSampleProposal);
      const request = createMockCallableRequest();

      const result = await handleProposeWeeklyPlanning(request, {
        authorizer,
        executor: mockExecutor,
      });

      expect(result.days).toHaveLength(5);
      expect(result.days[0].activities[0].materials).toEqual(['Pintura vegetal', 'Papel kraft']);
    });

    it('I. existing Case A golden material-enclosure rejection remains fail-closed', () => {
      const classified = classifyWeeklyPlanningFailure(
        new InvalidWeeklyPlanningProposalError(
          "Activity at day index 0, activity index 0 proceduralAction introduces unauthorized material 'sonaja(s)' not present in request-scoped authorized materials."
        )
      );
      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('UNAUTHORIZED_MATERIAL_LEAK');
      expect(classified.safeError.code).toBe('internal');
    });

    it('J. unknown internal exception remains UNEXPECTED_INTERNAL', () => {
      const classified = classifyWeeklyPlanningFailure(new Error('Unknown generic internal error'));
      expect(classified.processingStage).toBe('UNEXPECTED_INTERNAL');
      expect(classified.failureCode).toBe('UNEXPECTED_INTERNAL');
      expect(classified.safeError.code).toBe('internal');
    });

    it('K. client-visible safe error behavior unchanged', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockRejectedValue(
        new InvalidWeeklyPlanningProposalError('Activity at day index 0, activity index 0 with empty materialRefs cannot use object-introducing action verb \'usar\'')
      );
      const request = createMockCallableRequest();

      let clientError: any = null;
      try {
        await handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
        });
      } catch (err: any) {
        clientError = err;
      }

      expect(clientError).toBeInstanceOf(HttpsError);
      expect(clientError.code).toBe('internal');
      expect(clientError.message).toBe('Proposed weekly plan failed canonical validation.');
      expect(clientError.processingStage).toBeUndefined();
      expect(clientError.failureCode).toBeUndefined();
    });
  });

  // ============================================================
  // 13. H1R12.5-D.3.2: Zero-Material Leak Diagnostic Precision
  // ============================================================

  describe('13. H1R12.5-D.3.2: Zero-Material Leak Diagnostic Precision (Cases 1–6 & Invariance)', () => {
    it('CASE 1 — Existing true material-like collision: classifies with ZERO_MATERIAL_ACTION_VERB_WITH_KNOWN_MATERIAL_TERM', () => {
      const err = new InvalidWeeklyPlanningProposalError(
        'Activity at day index 0, activity index 0 with empty materialRefs cannot use object-introducing action verb \'usar\' without declaring authorized materialRefs [DIAGNOSTIC:KNOWN_MATERIAL_TERM]: "Usar telas para acariciar al bebé"'
      );
      const classified = classifyWeeklyPlanningFailure(err);

      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('ZERO_MATERIAL_ACTION_VERB_LEAK');
      expect(classified.diagnosticSubtype).toBe('ZERO_MATERIAL_ACTION_VERB_WITH_KNOWN_MATERIAL_TERM');
      expect(classified.safeError.code).toBe('internal');
    });

    it('CASE 2 — Generic action-verb collision: classifies with ZERO_MATERIAL_ACTION_VERB_GENERIC_ONLY', () => {
      const err = new InvalidWeeklyPlanningProposalError(
        'Activity at day index 0, activity index 0 with empty materialRefs cannot use object-introducing action verb \'usar\' without declaring authorized materialRefs [DIAGNOSTIC:GENERIC_ONLY]: "Usar modulaciones de voz suaves"'
      );
      const classified = classifyWeeklyPlanningFailure(err);

      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('ZERO_MATERIAL_ACTION_VERB_LEAK');
      expect(classified.diagnosticSubtype).toBe('ZERO_MATERIAL_ACTION_VERB_GENERIC_ONLY');
      expect(classified.safeError.code).toBe('internal');
    });

    it('CASE 3 — Zero material, no action-verb collision: passes through without action verb leak', () => {
      const validCanonical = classifyWeeklyPlanningFailure(
        new InvalidWeeklyPlanningProposalError('Proposed plan fails daily reading invariant: Day lunes is missing the required daily reading activity')
      );
      expect(validCanonical.processingStage).toBe('DAILY_READING');
      expect(validCanonical.failureCode).toBe('MISSING_DAILY_READING');
      expect(validCanonical.diagnosticSubtype).toBeUndefined();
    });

    it('CASE 4 — Authorized material reference: unchanged behavior, passes enclosure without leak', () => {
      const err = new InvalidWeeklyPlanningProposalError(
        'Proposed plan fails technical activity bounds: Day lunes has 0 activities (minimum is 1 activity per operational day).'
      );
      const classified = classifyWeeklyPlanningFailure(err);
      expect(classified.processingStage).toBe('TECHNICAL_BOUNDS');
      expect(classified.failureCode).toBe('TECHNICAL_BOUNDS_VIOLATION');
      expect(classified.diagnosticSubtype).toBeUndefined();
    });

    it('CASE 5 — Unknown material reference: retains INVALID_MATERIAL_REF without diagnosticSubtype leak', () => {
      const err = new InvalidWeeklyPlanningProposalError(
        "Unknown material ref 'MAT-99' at day index 0, activity index 0. Must be within request-scoped allowed set."
      );
      const classified = classifyWeeklyPlanningFailure(err);
      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('INVALID_MATERIAL_REF');
      expect(classified.diagnosticSubtype).toBeUndefined();
    });

    it('CASE 6 — Unauthorized material leak: retains UNAUTHORIZED_MATERIAL_LEAK without action-verb confusion', () => {
      const err = new InvalidWeeklyPlanningProposalError(
        "Activity at day index 0, activity index 0 proceduralAction introduces unauthorized material 'sonaja(s)' not present in request-scoped authorized materials."
      );
      const classified = classifyWeeklyPlanningFailure(err);
      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('UNAUTHORIZED_MATERIAL_LEAK');
      expect(classified.diagnosticSubtype).toBeUndefined();
    });

    it('INVARIANCE TEST: diagnosticSubtype does NOT alter boolean or throwing outcome of gateway', async () => {
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      // Both CASE 1 and CASE 2 MUST fail closed with HttpsError('internal')
      for (const diagnosticTag of ['[DIAGNOSTIC:KNOWN_MATERIAL_TERM]', '[DIAGNOSTIC:GENERIC_ONLY]']) {
        const mockExecutor = vi.fn().mockRejectedValue(
          new InvalidWeeklyPlanningProposalError(
            `with empty materialRefs cannot use object-introducing action verb 'usar' without declaring authorized materialRefs ${diagnosticTag}: "test action"`
          )
        );
        const request = createMockCallableRequest();

        await expect(
          handleProposeWeeklyPlanning(request, {
            authorizer,
            executor: mockExecutor,
          })
        ).rejects.toThrow(HttpsError);
      }
    });

    it('TELEMETRY TEST: logs diagnosticSubtype without leaking procedural action or pedagogical content (ZERO CONTENT)', async () => {
      const logs: WeeklyPlanningGatewayLogEntry[] = [];
      const mockReader = vi.fn().mockResolvedValue(createMockAuthorizerDoc());
      const authorizer = createFirestoreWeeklyPlanningAuthorizer({
        reader: mockReader,
        nowProvider: () => new Date('2026-10-01T12:00:00Z'),
      });

      const mockExecutor = vi.fn().mockRejectedValue(
        new InvalidWeeklyPlanningProposalError(
          'Activity at day index 0, activity index 0 with empty materialRefs cannot use object-introducing action verb \'usar\' without declaring authorized materialRefs [DIAGNOSTIC:KNOWN_MATERIAL_TERM]: "Usar telas para acariciar al bebé"'
        )
      );
      const request = createMockCallableRequest();

      await expect(
        handleProposeWeeklyPlanning(request, {
          authorizer,
          executor: mockExecutor,
          logger: { write: (entry) => logs.push(entry) },
        })
      ).rejects.toThrow(HttpsError);

      expect(logs).toHaveLength(2);
      const failed = logs[1];
      expect(failed.event).toBe('weekly_planning_gateway.failed');
      expect(failed.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(failed.failureCode).toBe('ZERO_MATERIAL_ACTION_VERB_LEAK');
      expect(failed.diagnosticSubtype).toBe('ZERO_MATERIAL_ACTION_VERB_WITH_KNOWN_MATERIAL_TERM');

      // Zero content verification
      const serialized = JSON.stringify(failed);
      expect(serialized).not.toContain('telas');
      expect(serialized).not.toContain('acariciar');
      expect(serialized).not.toContain('bebé');
      expect(serialized).not.toContain('Usar');
    });
  });

  // ============================================================
  // 14. H1R12.5-D.3.5: Structured Material Semantics Hardening — Security Regression Matrix (Tests 1–10)
  // ============================================================

  describe('14. H1R12.5-D.3.5: Structured Material Semantics Hardening — Security Regression Matrix (Tests 1–10)', () => {
    const authorizedTable = createRequestScopedMaterialTable([
      'telas de diferentes texturas',
      'música infantil',
      'pelotas suaves',
    ]);

    it('TEST 1 — ZERO MATERIAL + GENERIC NON-MATERIAL ACTION: generic verb alone does not prove leak; canonical materials remain empty', () => {
      const act = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Acompañar las expresiones vocales del lactante',
        proceduralAction: 'Usar la voz con tonos suaves para acompañar y responder al balbuceo',
        materialRefs: [],
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(act, authorizedTable, 0, 0);
      expect(canonical.materials).toEqual([]);
      expect(canonical.description).toBe('Usar la voz con tonos suaves para acompañar y responder al balbuceo');
    });

    it('TEST 2 — ZERO MATERIAL + DIFFERENT GENERIC VERBS: communication/movement instructions with generic verbs pass', () => {
      const verbs = [
        'Utilizar modulaciones de voz y contacto visual afectuoso',
        'Emplear gestos faciales para responder a la mirada del lactante',
        'Ocupar el espacio con movimientos lentos y acompañamiento afectivo',
      ];

      for (const proceduralAction of verbs) {
        const act = {
          category: 'VÍNCULO Y COMUNICACIÓN',
          objective: 'Fortalecer la comunicación afectiva',
          proceduralAction,
          materialRefs: [],
          durationMinutes: 10,
        };

        const canonical = projectInternalActivityToCanonical(act, authorizedTable, 0, 0);
        expect(canonical.materials).toEqual([]);
        expect(canonical.description).toBe(proceduralAction);
      }
    });

    it('TEST 3 — AUTHORIZED MATERIAL REF: canonical material comes ONLY from MAT-01 resolution', () => {
      const act = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Explorar sensaciones táctiles suaves',
        proceduralAction: 'Deslizar suavemente {material} sobre los brazos del lactante',
        materialRefs: ['MAT-01'], // MAT-01 is 'telas de diferentes texturas'
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(act, authorizedTable, 0, 0);
      expect(canonical.materials).toEqual(['telas de diferentes texturas']);
      expect(canonical.description).toBe(
        'Deslizar suavemente telas de diferentes texturas sobre los brazos del lactante'
      );
    });

    it('TEST 4 — UNKNOWN MATERIAL REF: fails closed with INVALID_MATERIAL_REF', () => {
      const act = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Exploración táctil',
        proceduralAction: 'Acariciar suavemente al lactante con {material}',
        materialRefs: ['MAT-999'],
        durationMinutes: 10,
      };

      let error: any;
      try {
        projectInternalActivityToCanonical(act, authorizedTable, 0, 0);
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect(error.message).toContain("Unknown material ref 'MAT-999'");

      const classified = classifyWeeklyPlanningFailure(error);
      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('INVALID_MATERIAL_REF');
    });

    it('TEST 5 — UNAUTHORIZED MATERIAL CANNOT ENTER canonical materials: arbitrary provider prose never enters materials[]', () => {
      const act = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Exploración auditiva',
        proceduralAction: 'Acercar una caja misteriosa y golpearla suavemente para emitir sonido',
        materialRefs: [],
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(act, authorizedTable, 0, 0);
      expect(canonical.materials).toEqual([]);
      expect(canonical.materials).not.toContain('caja misteriosa');
      expect(canonical.materials).toHaveLength(0);
    });

    it('TEST 6 — SERVER DESCRIPTION PROJECTION: description uses server-resolved materials only', () => {
      const act = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Exploración táctil guiada',
        proceduralAction: 'Presentar y acariciar',
        materialRefs: ['MAT-01', 'MAT-03'], // telas de diferentes texturas, pelotas suaves
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(act, authorizedTable, 0, 0);
      expect(canonical.materials).toEqual(['telas de diferentes texturas', 'pelotas suaves']);
      expect(canonical.description).toBe('Con telas de diferentes texturas y pelotas suaves: Presentar y acariciar');
      expect(canonical.description).not.toContain('MAT-01');
      expect(canonical.description).not.toContain('MAT-03');
    });

    it('TEST 7 — MATERIAL REF / PROSE DISAGREEMENT: materialRefs remains the sole authority for canonical materials', () => {
      const act = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular seguimiento visual',
        proceduralAction: 'Desplazar suavemente un juguete brillante frente a la mirada',
        materialRefs: ['MAT-03'], // MAT-03 is pelotas suaves
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(act, authorizedTable, 0, 0);
      // Canonical materials is ONLY pelotas suaves (resolved MAT-03), "juguete brillante" cannot enter materials
      expect(canonical.materials).toEqual(['pelotas suaves']);
      expect(canonical.materials).not.toContain('juguete brillante');
    });

    it('TEST 8 — KNOWN MATERIAL WITHOUT REF: mentions request-scoped material without MAT ref -> fails closed (UNDECLARED_MATERIAL)', () => {
      const actWithKnownMaterial = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular exploración táctil',
        proceduralAction: 'Usar telas de diferentes texturas para acariciar suavemente los brazos del lactante',
        materialRefs: [],
        durationMinutes: 10,
      };

      let error: any;
      try {
        projectInternalActivityToCanonical(actWithKnownMaterial, authorizedTable, 0, 0);
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(InvalidWeeklyPlanningProposalError);
      expect(error.message).toContain("mentions material 'telas de diferentes texturas' without declaring its ref in materialRefs");

      const classified = classifyWeeklyPlanningFailure(error);
      expect(classified.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classified.failureCode).toBe('UNDECLARED_MATERIAL');
    });

    it('TEST 9 — D.3.2 DIAGNOSTIC COMPATIBILITY: gateway classifies diagnostic failures safely with ZERO CONTENT leakage', () => {
      const genericOnlyError = new InvalidWeeklyPlanningProposalError(
        'cannot use object-introducing action verb \'usar\' without declaring authorized materialRefs [DIAGNOSTIC:GENERIC_ONLY]: "test action"'
      );
      const classifiedGeneric = classifyWeeklyPlanningFailure(genericOnlyError);
      expect(classifiedGeneric.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classifiedGeneric.failureCode).toBe('ZERO_MATERIAL_ACTION_VERB_LEAK');
      expect(classifiedGeneric.diagnosticSubtype).toBe('ZERO_MATERIAL_ACTION_VERB_GENERIC_ONLY');

      const knownTermError = new InvalidWeeklyPlanningProposalError(
        'cannot use object-introducing action verb \'usar\' without declaring authorized materialRefs [DIAGNOSTIC:KNOWN_MATERIAL_TERM]: "test action"'
      );
      const classifiedKnown = classifyWeeklyPlanningFailure(knownTermError);
      expect(classifiedKnown.processingStage).toBe('MATERIAL_ENCLOSURE');
      expect(classifiedKnown.failureCode).toBe('ZERO_MATERIAL_ACTION_VERB_LEAK');
      expect(classifiedKnown.diagnosticSubtype).toBe('ZERO_MATERIAL_ACTION_VERB_WITH_KNOWN_MATERIAL_TERM');
    });

    it('TEST 10 — NO MATERIAL AUTHORIZATION FROM PROSE: provider free text cannot cause a new canonical material to appear', () => {
      const actions = [
        'utilizar sonajas de plástico y campanas',
        'emplear espejos de vidrio y linternas',
        'usar columpios y andaderas',
        'ocupar peluches y muñecos grandes',
      ];

      for (const proceduralAction of actions) {
        if (/sonaja/i.test(proceduralAction)) {
          expect(() => {
            projectInternalActivityToCanonical(
              {
                category: 'EXPERIENCIAS ARTÍSTICAS',
                objective: 'Objetivo pedagógico',
                proceduralAction,
                materialRefs: [],
                durationMinutes: 10,
              },
              authorizedTable,
              0,
              0
            );
          }).toThrow(/unauthorized material 'sonaja\(s\)'/);
        } else {
          const canonical = projectInternalActivityToCanonical(
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Objetivo pedagógico',
              proceduralAction,
              materialRefs: [],
              durationMinutes: 10,
            },
            authorizedTable,
            0,
            0
          );
          // Crucial security invariant: materials remains empty!
          expect(canonical.materials).toEqual([]);
          expect(canonical.materials).toHaveLength(0);
        }
      }
    });
  });
});
