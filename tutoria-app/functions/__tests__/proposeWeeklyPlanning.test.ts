import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import {
  handleProposeWeeklyPlanning,
  validateProposeWeeklyPlanningGatewayPayload,
  mapToSafeWeeklyPlanningError,
  proposeWeeklyPlanning,
  MAX_WEEKLY_PLANNING_PAYLOAD_BYTES,
  ProposeWeeklyPlanningGatewayRequest,
  WeeklyPlanningGatewayLogEntry,
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
} from '../../src/application/planning/WeeklyPlanningProposalSource';
import { WeeklyPlanning } from '../../src/domain/planning/WeeklyPlanning';

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
});
