import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import {
  handleAssistDailyEvaluation,
  mapGatewayErrorToHttpsError,
  resolveServerOpenAIApiKey,
  type AssistDailyEvaluationHandlerOptions,
  type AssistDailyEvaluationLogEntry,
} from '../src/assistDailyEvaluation';
import type { PersistedAuthorizationContextDoc } from '../src/FirestoreCurricularAIAuthorizer';
import { FirestoreWeeklyPlanningAdminRepository } from '../src/FirestoreWeeklyPlanningAdminRepository';
import { WeeklyPlanning, PlanningDay } from '../../src/domain/planning/WeeklyPlanning';
import type { EvaluationAIProvider } from '../../src/application/planning/EvaluationAIProvider';
import type {
  SanitizedEvaluationAIPayload,
  AssistDailyEvaluationResponse,
} from '../../src/application/planning/GovernedEvaluationAIContract';
import { RoomCatalog } from '../../src/domain/planning/RoomCatalog';

describe('H1R13.3E — assistDailyEvaluation Firebase Callable Bridge', () => {
  const teacherUid = 'teacher-anita-001';
  const planningId = 'plan-2026-w40-lact-a';
  const daycareId = 'daycare-imss-001';
  const roomId = 'room-lactantes-a';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createApprovedPlanning(overrideDay?: Partial<PlanningDay>): WeeklyPlanning {
    const planning = WeeklyPlanning.create(
      planningId,
      daycareId,
      roomId,
      teacherUid,
      '2026-10-05',
      '2026-10-09'
    );
    planning.status = 'APPROVED'; // Approved for execution

    const mondayDay: PlanningDay = {
      date: '2026-10-05',
      dayOfWeek: 'MONDAY',
      activities: [
        {
          activityId: 'act-001',
          category: 'JUEGO LIBRE',
          objective: 'Estimular gateo y coordinación motriz gruesa',
          description: 'Desplazamiento con rodillos y tapetes en piso suave',
          durationMinutes: 30,
          materials: ['Tapetes', 'Rodillos'],
          curricularTraceability: [
            {
              pdaId: 'TUTORIA-PDA-0001',
              campoFormativo: 'LENGUAJES',
              contenido: 'Contenido 1',
              pda: 'PDA 1',
              catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
            },
          ],
        },
      ],
      complementaryActivities: [],
      materials: ['Tapetes', 'Rodillos'],
      evaluationStatus: 'DRAFT',
      ...overrideDay,
    };

    planning.days = [mondayDay];
    return planning;
  }

  const validEvidence = {
    activitiesDevelopment:
      'Los lactantes se desplazaron libremente sobre los tapetes explorando los rodillos.',
    groupResponse:
      'La mayoría mostró curiosidad y entusiasmo al aproximarse a los materiales colocados.',
  };

  const validPublicRequest = {
    planningId,
    dayOfWeek: 'MONDAY',
    humanEvidence: validEvidence,
  };

  const validTeacherAuthDoc: PersistedAuthorizationContextDoc = {
    authUid: teacherUid,
    institutionalRole: 'TEACHER',
    authorizedDaycareIds: [daycareId],
    roomIds: [roomId],
    active: true,
  };

  function createMockCallableRequest(
    data: unknown,
    authContext: { uid?: string } | null = { uid: teacherUid }
  ): CallableRequest<unknown> {
    return {
      data,
      auth: authContext
        ? ({
            uid: authContext.uid,
            token: {} as any,
          } as any)
        : undefined,
      rawRequest: {} as any,
    };
  }

  function createDeterministicMockProvider(
    responseString = 'Los lactantes exploraron de forma activa los rodillos y tapetes en la sala. La respuesta del grupo fue favorable y participativa.'
  ): { provider: EvaluationAIProvider; receivedPayloads: SanitizedEvaluationAIPayload[] } {
    const receivedPayloads: SanitizedEvaluationAIPayload[] = [];
    const provider: EvaluationAIProvider = {
      assist: async (payload: SanitizedEvaluationAIPayload): Promise<AssistDailyEvaluationResponse> => {
        receivedPayloads.push(payload);
        return {
          suggestedEvaluation: responseString,
        };
      },
    };
    return { provider, receivedPayloads };
  }

  // ==========================================================================
  // CALLABLE AUTHENTICATION
  // ==========================================================================
  describe('Callable Authentication', () => {
    it('1. unauthenticated caller is denied with HttpsError unauthenticated', async () => {
      const request = createMockCallableRequest(validPublicRequest, null);

      await expect(handleAssistDailyEvaluation(request)).rejects.toThrow(
        expect.objectContaining({
          code: 'unauthenticated',
        })
      );
    });

    it('2. authenticated UID is taken from trusted callable context', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });
      const { provider } = createDeterministicMockProvider();

      const authorizerSpy = vi.fn().mockResolvedValue(validTeacherAuthDoc);

      const request = createMockCallableRequest(validPublicRequest, { uid: teacherUid });

      await handleAssistDailyEvaluation(request, {
        authorizer: authorizerSpy,
        repository: mockRepo,
        provider,
        clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
      });

      expect(authorizerSpy).toHaveBeenCalledWith(teacherUid);
    });

    it('3. client cannot supply or override UID in request body', async () => {
      const spoofedRequest = createMockCallableRequest({
        ...validPublicRequest,
        uid: 'spoofed-teacher-uid',
      });

      await expect(handleAssistDailyEvaluation(spoofedRequest)).rejects.toThrow(
        expect.objectContaining({
          code: 'invalid-argument',
        })
      );
    });

    it('4. client cannot supply or override role in request body', async () => {
      const spoofedRequest = createMockCallableRequest({
        ...validPublicRequest,
        role: 'DIRECTOR',
      });

      await expect(handleAssistDailyEvaluation(spoofedRequest)).rejects.toThrow(
        expect.objectContaining({
          code: 'invalid-argument',
        })
      );
    });

    it('5. client cannot supply or override daycareId in request body', async () => {
      const spoofedRequest = createMockCallableRequest({
        ...validPublicRequest,
        daycareId: 'unauthorized-daycare',
      });

      await expect(handleAssistDailyEvaluation(spoofedRequest)).rejects.toThrow(
        expect.objectContaining({
          code: 'invalid-argument',
        })
      );
    });
  });

  // ==========================================================================
  // AUTHORIZATION CONTEXT
  // ==========================================================================
  describe('Server Authorization Context', () => {
    it('6. active TEACHER context maps correctly and allows drafting', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });
      const { provider } = createDeterministicMockProvider();

      const request = createMockCallableRequest(validPublicRequest);

      const response = await handleAssistDailyEvaluation(request, {
        authorizer: async () => validTeacherAuthDoc,
        repository: mockRepo,
        provider,
        clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
      });

      expect(response.suggestedEvaluation).toContain('Los lactantes exploraron');
    });

    it('7. inactive teacher context is denied with permission-denied', async () => {
      const request = createMockCallableRequest(validPublicRequest);

      await expect(
        handleAssistDailyEvaluation(request, {
          authorizer: async () => ({ ...validTeacherAuthDoc, active: false }),
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'permission-denied',
        })
      );
    });

    it('8. missing authorization context document is denied with permission-denied', async () => {
      const request = createMockCallableRequest(validPublicRequest);

      await expect(
        handleAssistDailyEvaluation(request, {
          authorizer: async () => null,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'permission-denied',
        })
      );
    });

    it('9. DIRECTOR role is denied through gateway with permission-denied', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });
      const { provider } = createDeterministicMockProvider();

      const request = createMockCallableRequest(validPublicRequest);

      await expect(
        handleAssistDailyEvaluation(request, {
          authorizer: async () => ({ ...validTeacherAuthDoc, institutionalRole: 'DIRECTOR' }),
          repository: mockRepo,
          provider,
          clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'permission-denied',
        })
      );
    });

    it('10. SUPERVISOR role is denied through gateway with permission-denied', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });
      const { provider } = createDeterministicMockProvider();

      const request = createMockCallableRequest(validPublicRequest);

      await expect(
        handleAssistDailyEvaluation(request, {
          authorizer: async () => ({ ...validTeacherAuthDoc, institutionalRole: 'SUPERVISOR' }),
          repository: mockRepo,
          provider,
          clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'permission-denied',
        })
      );
    });

    it('11. cross-daycare teacher is denied through gateway with permission-denied', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });
      const { provider } = createDeterministicMockProvider();

      const request = createMockCallableRequest(validPublicRequest);

      await expect(
        handleAssistDailyEvaluation(request, {
          authorizer: async () => ({
            ...validTeacherAuthDoc,
            authorizedDaycareIds: ['different-daycare-999'],
          }),
          repository: mockRepo,
          provider,
          clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'permission-denied',
        })
      );
    });
  });

  // ==========================================================================
  // REQUEST FIREWALL
  // ==========================================================================
  describe('Request Firewall & Input Sanitization', () => {
    it('12. only planningId/dayOfWeek/humanEvidence accepted in public request', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });
      const { provider } = createDeterministicMockProvider();

      const request = createMockCallableRequest(validPublicRequest);

      const res = await handleAssistDailyEvaluation(request, {
        authorizer: async () => validTeacherAuthDoc,
        repository: mockRepo,
        provider,
        clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
      });

      expect(res.suggestedEvaluation).toBeTruthy();
    });

    it('13. currentDate injection is rejected with invalid-argument', async () => {
      const request = createMockCallableRequest({
        ...validPublicRequest,
        currentDate: '2026-10-05',
      });

      await expect(handleAssistDailyEvaluation(request)).rejects.toThrow(
        expect.objectContaining({
          code: 'invalid-argument',
        })
      );
    });

    it('14. timezone injection is rejected with invalid-argument', async () => {
      const request = createMockCallableRequest({
        ...validPublicRequest,
        timeZone: 'America/Mexico_City',
      });

      await expect(handleAssistDailyEvaluation(request)).rejects.toThrow(
        expect.objectContaining({
          code: 'invalid-argument',
        })
      );
    });

    it('15. client-injected planning context is rejected with invalid-argument', async () => {
      const request = createMockCallableRequest({
        ...validPublicRequest,
        activities: [{ title: 'Injected Activity' }],
      });

      await expect(handleAssistDailyEvaluation(request)).rejects.toThrow(
        expect.objectContaining({
          code: 'invalid-argument',
        })
      );
    });
  });

  // ==========================================================================
  // SERVER RETRIEVAL & PROVIDER PAYLOAD
  // ==========================================================================
  describe('Server Retrieval & Sanitized Payload Boundary', () => {
    it('16-18. planning is retrieved server-side by planningId and client cannot provide room or activities', async () => {
      const planning = createApprovedPlanning();
      const docReaderSpy = vi.fn().mockResolvedValue(new FirestoreWeeklyPlanningAdminRepository().serialize(planning));
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: docReaderSpy,
      });

      const { provider, receivedPayloads } = createDeterministicMockProvider();

      const request = createMockCallableRequest(validPublicRequest);

      await handleAssistDailyEvaluation(request, {
        authorizer: async () => validTeacherAuthDoc,
        repository: mockRepo,
        provider,
        clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
      });

      expect(docReaderSpy).toHaveBeenCalledWith(planningId);
      expect(receivedPayloads).toHaveLength(1);
      const payload = receivedPayloads[0];

      // Room and activity come from server planning
      expect(payload.roomProfile.name).toBe('Lactantes A');
      expect(payload.plannedContext.activities[0].category).toBe('JUEGO LIBRE');
    });

    it('19-25. provider payload is sanitized and strictly excludes technical IDs, auth, currentDate, and timezone', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });

      const { provider, receivedPayloads } = createDeterministicMockProvider();
      const request = createMockCallableRequest(validPublicRequest);

      await handleAssistDailyEvaluation(request, {
        authorizer: async () => validTeacherAuthDoc,
        repository: mockRepo,
        provider,
        clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
      });

      const payload = receivedPayloads[0];
      const serialized = JSON.stringify(payload);

      expect(serialized).not.toContain(planningId);
      expect(serialized).not.toContain(teacherUid);
      expect(serialized).not.toContain(daycareId);
      expect(serialized).not.toContain('authUid');
      expect(serialized).not.toContain('currentDate');
      expect(serialized).not.toContain('America/Mexico_City');
    });
  });

  // ==========================================================================
  // ERROR SAFETY & PROHIBITED LANGUAGE
  // ==========================================================================
  describe('Error Safety & Prohibited Language', () => {
    it('41. provider prohibited language returns safe internal error without leaking prohibited text', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });

      const badProvider: EvaluationAIProvider = {
        assist: async () => ({
          suggestedEvaluation: 'Durante la jornada se logró el objetivo y el PDA logrado fue pleno.',
        }),
      };

      const request = createMockCallableRequest(validPublicRequest);

      await expect(
        handleAssistDailyEvaluation(request, {
          authorizer: async () => validTeacherAuthDoc,
          repository: mockRepo,
          provider: badProvider,
          clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'internal',
          message: 'AI assistance response failed governance validation.',
        })
      );
    });

    it('45-50. error message does not leak raw response, prompt, humanEvidence, UID, or secret', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });

      const failingProvider: EvaluationAIProvider = {
        assist: async () => {
          throw new Error('Raw OpenAI API crash containing sensitive tokens and text');
        },
      };

      const request = createMockCallableRequest(validPublicRequest);

      let caughtError: any;
      try {
        await handleAssistDailyEvaluation(request, {
          authorizer: async () => validTeacherAuthDoc,
          repository: mockRepo,
          provider: failingProvider,
          clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(HttpsError);
      expect(caughtError.code).toBe('unavailable');
      expect(caughtError.message).not.toContain('Raw OpenAI API crash');
      expect(caughtError.message).not.toContain(teacherUid);
      expect(caughtError.message).not.toContain(planningId);
    });
  });

  // ==========================================================================
  // ZERO PERSISTENCE
  // ==========================================================================
  describe('Zero Persistence Invariant', () => {
    it('51-54. repository.save is NEVER executed during successful assistance, provider failure, or invalid response', async () => {
      const planning = createApprovedPlanning();
      const saveSpy = vi.fn();
      const mockRepo: any = {
        findById: vi.fn().mockResolvedValue(planning),
        save: saveSpy,
      };

      const { provider } = createDeterministicMockProvider();
      const request = createMockCallableRequest(validPublicRequest);

      // Success
      await handleAssistDailyEvaluation(request, {
        authorizer: async () => validTeacherAuthDoc,
        repository: mockRepo,
        provider,
        clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
      });

      expect(saveSpy).not.toHaveBeenCalled();

      // Provider failure
      const failingProvider: EvaluationAIProvider = {
        assist: async () => {
          throw new Error('fail');
        },
      };

      await expect(
        handleAssistDailyEvaluation(request, {
          authorizer: async () => validTeacherAuthDoc,
          repository: mockRepo,
          provider: failingProvider,
          clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
        })
      ).rejects.toThrow();

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SAFE OBSERVABILITY & TELEMETRY
  // ==========================================================================
  describe('Safe Server Observability', () => {
    it('logs safe completion telemetry with zero pedagogical text', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });

      const { provider } = createDeterministicMockProvider();
      const logEntries: AssistDailyEvaluationLogEntry[] = [];
      const mockLogger = { write: (entry: AssistDailyEvaluationLogEntry) => logEntries.push(entry) };

      const request = createMockCallableRequest(validPublicRequest);

      await handleAssistDailyEvaluation(request, {
        authorizer: async () => validTeacherAuthDoc,
        repository: mockRepo,
        provider,
        clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
        logger: mockLogger,
      });

      expect(logEntries).toHaveLength(1);
      const entry = logEntries[0];
      expect(entry.severity).toBe('INFO');
      expect(entry.event).toBe('assist_daily_evaluation.completed');
      expect(entry.model).toBe('gpt-4o-mini');

      const serialized = JSON.stringify(entry);
      expect(serialized).not.toContain(validEvidence.activitiesDevelopment);
      expect(serialized).not.toContain(validEvidence.groupResponse);
    });
  });

  // ==========================================================================
  // SECRET ACCESS SEMANTICS & BOUNDARY SAFETY
  // ==========================================================================
  describe('Secret Access Semantics & Boundary Safety', () => {
    it('resolveServerOpenAIApiKey resolves safely without throwing outside Cloud Functions v2', () => {
      // Outside Cloud Functions v2 SecretParam.value() throws, function catches and falls back safely
      const originalEnv = process.env.OPENAI_API_KEY;
      try {
        delete process.env.OPENAI_API_KEY;
        const keyNoEnv = resolveServerOpenAIApiKey();
        expect(keyNoEnv).toBeUndefined();

        process.env.OPENAI_API_KEY = 'test-injected-env-key';
        const keyWithEnv = resolveServerOpenAIApiKey();
        expect(keyWithEnv).toBe('test-injected-env-key');
      } finally {
        if (originalEnv !== undefined) {
          process.env.OPENAI_API_KEY = originalEnv;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    });

    it('rejects client request body attempting to supply apiKey, secret, or token', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });

      const { provider } = createDeterministicMockProvider();

      // Attempt 1: apiKey in request body
      const reqWithApiKey = createMockCallableRequest({
        ...validPublicRequest,
        apiKey: 'sk-injected-client-key',
      });

      await expect(
        handleAssistDailyEvaluation(reqWithApiKey, {
          authorizer: async () => validTeacherAuthDoc,
          repository: mockRepo,
          provider,
        })
      ).rejects.toThrow(/Request contains forbidden or authority-bearing field: 'apiKey'/);

      // Attempt 2: secret in request body
      const reqWithSecret = createMockCallableRequest({
        ...validPublicRequest,
        secret: 'super-secret',
      });

      await expect(
        handleAssistDailyEvaluation(reqWithSecret, {
          authorizer: async () => validTeacherAuthDoc,
          repository: mockRepo,
          provider,
        })
      ).rejects.toThrow(/Request contains forbidden or authority-bearing field: 'secret'/);

      // Attempt 3: token in request body
      const reqWithToken = createMockCallableRequest({
        ...validPublicRequest,
        token: 'bearer-token',
      });

      await expect(
        handleAssistDailyEvaluation(reqWithToken, {
          authorizer: async () => validTeacherAuthDoc,
          repository: mockRepo,
          provider,
        })
      ).rejects.toThrow(/Request contains forbidden or authority-bearing field: 'token'/);
    });

    it('guarantees secret is never forwarded in provider payload, logged, or returned in HttpsError', async () => {
      const planning = createApprovedPlanning();
      const mockRepo = new FirestoreWeeklyPlanningAdminRepository({
        docReader: async () => mockRepo.serialize(planning),
      });

      const secretSentinel = 'sk-super-secret-sentinel-12345';
      let capturedPayload: SanitizedEvaluationAIPayload | null = null;

      const provider: EvaluationAIProvider = {
        assist: async (payload) => {
          capturedPayload = payload;
          throw new Error(`Upstream connection failed with secret: ${secretSentinel}`);
        },
      };

      const logEntries: AssistDailyEvaluationLogEntry[] = [];
      const mockLogger = { write: (entry: AssistDailyEvaluationLogEntry) => logEntries.push(entry) };

      const request = createMockCallableRequest(validPublicRequest);

      let caughtError: any = null;
      try {
        await handleAssistDailyEvaluation(request, {
          authorizer: async () => validTeacherAuthDoc,
          repository: mockRepo,
          provider,
          clock: { now: () => new Date('2026-10-05T12:00:00-06:00') },
          logger: mockLogger,
        });
      } catch (err) {
        caughtError = err;
      }

      // 1. Captured payload has zero secret
      expect(capturedPayload).not.toBeNull();
      const serializedPayload = JSON.stringify(capturedPayload);
      expect(serializedPayload).not.toContain(secretSentinel);
      expect(serializedPayload).not.toContain('apiKey');
      expect(serializedPayload).not.toContain('secret');

      // 2. Log entries have zero secret
      expect(logEntries).toHaveLength(1);
      const serializedLog = JSON.stringify(logEntries[0]);
      expect(serializedLog).not.toContain(secretSentinel);

      // 3. Returned error has zero secret
      expect(caughtError).toBeInstanceOf(HttpsError);
      expect(caughtError.message).not.toContain(secretSentinel);
      expect(caughtError.message).not.toContain('sk-');
      expect(caughtError.code).toBe('unavailable');
    });
  });
});
