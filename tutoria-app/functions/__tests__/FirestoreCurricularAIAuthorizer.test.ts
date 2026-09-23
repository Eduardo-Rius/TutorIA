import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FirestoreCurricularAIAuthorizer,
  createFirestoreCurricularAIAuthorizer,
  PersistedAuthorizationContextDoc,
  parseDateToMillis,
} from '../src/FirestoreCurricularAIAuthorizer';
import {
  handleRecommendCurricularPDA,
  RecommendCurricularPDAGatewayRequest,
} from '../src/recommendCurricularPDA';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

describe('H1R10.5 / H1R10.5.1 — FirestoreCurricularAIAuthorizer Strict Timestamp & Authorization', () => {
  const EVAL_TIME = new Date('2026-09-22T12:00:00.000Z');
  const nowProvider = () => EVAL_TIME;

  const validTeacherDoc: PersistedAuthorizationContextDoc = {
    authUid: 'anita-teacher-01',
    personId: '10000000-0000-4000-8000-000000000001',
    assignmentId: '20000000-0000-4000-8000-000000000001',
    institutionalRole: 'TEACHER',
    authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
    roomIds: ['room-lactantes-a', 'room-lactantes-b'],
    active: true,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validTo: null,
  };

  const validGatewayPayload: RecommendCurricularPDAGatewayRequest = {
    activityId: 'act-tactile-01',
    activityTitle: 'Exploración Táctil con Texturas Suaves',
    objective: 'Estimular el vínculo afectivo y la exploración sensorial motriz.',
    modality: 'DIRECT',
    room: {
      roomId: 'lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 13,
      maxAgeMonths: 18,
    },
    planningId: 'plan-test-01',
    dayId: 'MONDAY',
    description: 'Uso de esponjas y telas sensoriales.',
    category: 'Sensorial y Motor',
    materials: ['telas suaves', 'esponjas'],
    durationMinutes: 20,
  };

  function createCallableRequest<T>(
    data: T,
    auth?: { uid: string; token?: Record<string, unknown> }
  ): CallableRequest<T> {
    return {
      data,
      auth,
      rawRequest: {} as any,
      accepts: () => false,
    };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // Basic Core Authorization Tests
  // ============================================================

  it('1. valid active TEACHER + exactly one daycare + current validity -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue(validTeacherDoc);
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(true);
    expect(decision.reason).toBeUndefined();
    expect(reader).toHaveBeenCalledWith('anita-teacher-01');
  });

  it('2. blank UID -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue(validTeacherDoc);
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const blanks = ['', '   ', null as any, undefined as any];
    for (const blankUid of blanks) {
      const decision = await authorizer({ uid: blankUid });
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('blank');
    }
    expect(reader).not.toHaveBeenCalled();
  });

  it('3. missing authorization document -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue(null);
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'nonexistent-uid' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('unresolved');
    expect(decision.reason).toContain('not found');
  });

  it('4. active false -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({ ...validTeacherDoc, active: false });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('inactive');
  });

  it('5. DIRECTOR -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      institutionalRole: 'DIRECTOR',
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'ceci-director-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('DIRECTOR');
    expect(decision.reason).toContain('Only TEACHER is permitted');
  });

  it('6. SUPERVISOR -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      institutionalRole: 'SUPERVISOR',
      authorizedDaycareIds: ['d1', 'd2'],
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'tere-supervisor-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('SUPERVISOR');
    expect(decision.reason).toContain('Only TEACHER is permitted');
  });

  it('7. unknown role -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      institutionalRole: 'COORDINATOR',
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'unknown-role-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('COORDINATOR');
  });

  it('8. missing role -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      institutionalRole: undefined,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'no-role-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('UNKNOWN');
  });

  it('9. zero authorized daycares -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      authorizedDaycareIds: [],
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('exactly one authorized daycare');
  });

  it('10. exactly one valid daycare -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      authorizedDaycareIds: ['center-615'],
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(true);
  });

  it('11. two daycares for TEACHER -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      authorizedDaycareIds: ['center-615', 'center-616'],
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('exactly one authorized daycare');

    // Duplicate entries must also fail closed
    reader.mockResolvedValueOnce({
      ...validTeacherDoc,
      authorizedDaycareIds: ['center-615', 'center-615'],
    });
    const dupDecision = await authorizer({ uid: 'anita-teacher-01' });
    expect(dupDecision.authorized).toBe(false);
    expect(dupDecision.reason).toContain('exactly one authorized daycare');
  });

  it('12. blank daycare -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      authorizedDaycareIds: [''],
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('nonblank');
  });

  it('13. whitespace daycare -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      authorizedDaycareIds: ['   '],
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('nonblank');
  });

  it('14. authorizedDaycareIds non-array -> DENY', async () => {
    const badValues = ['center-615', null, undefined, { id: 'center-615' }, 12345];
    for (const val of badValues) {
      const reader = vi.fn().mockResolvedValue({
        ...validTeacherDoc,
        authorizedDaycareIds: val as any,
      });
      const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

      const decision = await authorizer({ uid: 'anita-teacher-01' });

      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('exactly one authorized daycare');
    }
  });

  // ============================================================
  // Strict Timestamp Policy & Hardening Tests (H1R10.5.1)
  // ============================================================

  it('15. valid Date validFrom -> ALLOW when otherwise valid', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(true);
  });

  it('16. Timestamp-like validFrom with toMillis -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: { toMillis: () => new Date('2026-01-01T00:00:00.000Z').getTime() },
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(true);
  });

  it('17. Timestamp-like validFrom with toDate -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(true);
  });

  it('18. string validFrom -> DENY (strictly unpersisted type)', async () => {
    const stringDates = [
      '2026-01-01T00:00:00.000Z',
      '2026-01-01',
      'Thu, 01 Jan 2026 00:00:00 GMT',
    ];
    for (const str of stringDates) {
      const reader = vi.fn().mockResolvedValue({
        ...validTeacherDoc,
        validFrom: str as any,
      });
      const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

      const decision = await authorizer({ uid: 'anita-teacher-01' });
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('malformed');
    }
  });

  it('19. number validFrom -> DENY (strictly unpersisted type)', async () => {
    const epochNumbers = [1767225600000, 0, 1600000000];
    for (const num of epochNumbers) {
      const reader = vi.fn().mockResolvedValue({
        ...validTeacherDoc,
        validFrom: num as any,
      });
      const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

      const decision = await authorizer({ uid: 'anita-teacher-01' });
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('malformed');
    }
  });

  it('20. boolean validFrom -> DENY', async () => {
    for (const bool of [true, false]) {
      const reader = vi.fn().mockResolvedValue({
        ...validTeacherDoc,
        validFrom: bool as any,
      });
      const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

      const decision = await authorizer({ uid: 'anita-teacher-01' });
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('malformed');
    }
  });

  it('21. plain object validFrom -> DENY', async () => {
    const plainObjects = [{}, { date: '2026-01-01' }, { seconds: 12345, nanoseconds: 0 }];
    for (const obj of plainObjects) {
      const reader = vi.fn().mockResolvedValue({
        ...validTeacherDoc,
        validFrom: obj as any,
      });
      const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

      const decision = await authorizer({ uid: 'anita-teacher-01' });
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('malformed');
    }
  });

  it('22. toMillis returning NaN -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: { toMillis: () => NaN },
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('malformed');
  });

  it('23. toMillis returning Infinity -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: { toMillis: () => Infinity },
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('malformed');
  });

  it('24. toMillis throwing sensitive error -> DENY without leaking sensitive value', async () => {
    const sensitive = 'TIMESTAMP_PRIVATE_DETAIL_DO_NOT_EXPOSE';
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: {
        toMillis: () => {
          throw new Error(sensitive);
        },
      },
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('malformed');
    expect(decision.reason).not.toContain(sensitive);
    expect(JSON.stringify(decision)).not.toContain(sensitive);
  });

  it('25. toDate returning Invalid Date -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: { toDate: () => new Date('invalid') },
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('malformed');
  });

  it('26. toDate throwing sensitive error -> DENY without leaking sensitive value', async () => {
    const sensitive = 'TIMESTAMP_PRIVATE_DETAIL_DO_NOT_EXPOSE';
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: {
        toDate: () => {
          throw new Error(sensitive);
        },
      },
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('malformed');
    expect(decision.reason).not.toContain(sensitive);
    expect(JSON.stringify(decision)).not.toContain(sensitive);
  });

  it('27. validTo null -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validTo: null,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(true);
  });

  it('28. validTo undefined -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validTo: undefined,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(true);
  });

  it('29. string non-null validTo -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validTo: '2026-12-31T00:00:00.000Z' as any,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('validTo timestamp is malformed');
  });

  it('30. number non-null validTo -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validTo: 1767225600000 as any,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('validTo timestamp is malformed');
  });

  it('31. malformed Timestamp-like validTo -> DENY', async () => {
    const sensitive = 'TIMESTAMP_PRIVATE_DETAIL_DO_NOT_EXPOSE';
    const badValidToCases = [
      { toMillis: () => NaN },
      { toMillis: () => Infinity },
      {
        toMillis: () => {
          throw new Error(sensitive);
        },
      },
      { toDate: () => new Date('invalid') },
      {
        toDate: () => {
          throw new Error(sensitive);
        },
      },
      {},
    ];

    for (const badTo of badValidToCases) {
      const reader = vi.fn().mockResolvedValue({
        ...validTeacherDoc,
        validTo: badTo as any,
      });
      const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

      const decision = await authorizer({ uid: 'anita-teacher-01' });
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('validTo timestamp is malformed');
      expect(decision.reason).not.toContain(sensitive);
      expect(JSON.stringify(decision)).not.toContain(sensitive);
    }
  });

  it('32. Invalid Date from nowProvider -> DENY', async () => {
    const badClocks = [
      () => new Date('invalid'),
      () => new Date(NaN),
      () => 'not-a-date' as any,
      () => null as any,
      () => {
        throw new Error('CLOCK_FAILURE');
      },
    ];

    for (const badClock of badClocks) {
      const reader = vi.fn().mockResolvedValue(validTeacherDoc);
      const authorizer = createFirestoreCurricularAIAuthorizer({
        reader,
        nowProvider: badClock,
      });

      const decision = await authorizer({ uid: 'anita-teacher-01' });
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('clock');
    }
  });

  // ============================================================
  // Date Boundary Tests
  // ============================================================

  it('33. validFrom == now -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: EVAL_TIME,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(true);

    // Timestamp duck typing
    reader.mockResolvedValueOnce({
      ...validTeacherDoc,
      validFrom: { toMillis: () => EVAL_TIME.getTime() },
    });
    const tsDecision = await authorizer({ uid: 'anita-teacher-01' });
    expect(tsDecision.authorized).toBe(true);
  });

  it('34. validFrom > now -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validFrom: new Date(EVAL_TIME.getTime() + 1000), // 1 second after EVAL_TIME
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('not yet valid');
  });

  it('35. validTo == now -> ALLOW', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validTo: EVAL_TIME,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(true);

    // Timestamp duck typing
    reader.mockResolvedValueOnce({
      ...validTeacherDoc,
      validTo: { toDate: () => EVAL_TIME },
    });
    const tsDecision = await authorizer({ uid: 'anita-teacher-01' });
    expect(tsDecision.authorized).toBe(true);
  });

  it('36. validTo < now -> DENY', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      validTo: new Date(EVAL_TIME.getTime() - 1), // 1 ms before EVAL_TIME
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });
    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('expired');
  });

  // ============================================================
  // Infrastructure Failure & Error Sanitization Tests
  // ============================================================

  it('37. Firestore reader failure -> fail closed without leaking details', async () => {
    const sensitiveErrorMsg = 'FIRESTORE_PRIVATE_DETAIL_DO_NOT_EXPOSE';
    const reader = vi.fn().mockRejectedValue(new Error(sensitiveErrorMsg));
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });

    const decision = await authorizer({ uid: 'anita-teacher-01' });

    expect(decision.authorized).toBe(false);
    expect(decision.reason).toContain('unresolved');
    expect(decision.reason).not.toContain(sensitiveErrorMsg);
    expect(JSON.stringify(decision)).not.toContain(sensitiveErrorMsg);
  });

  it('38. forged role in pedagogical payload cannot authorize caller', async () => {
    const forgedPayload = {
      ...validGatewayPayload,
      role: 'TEACHER',
      institutionalRole: 'TEACHER',
      isAdmin: true,
    };

    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      institutionalRole: 'DIRECTOR',
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });
    const mockExecutor = vi.fn();

    const req = createCallableRequest(forgedPayload, { uid: 'attacker-director-uid' });

    await expect(
      handleRecommendCurricularPDA(req, { authorizer, executor: mockExecutor })
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(mockExecutor).not.toHaveBeenCalled();
  });

  it('39. forged center in pedagogical payload cannot authorize caller', async () => {
    const forgedPayload = {
      ...validGatewayPayload,
      authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
      daycareId: '00000000-0000-4000-8000-000000000001',
    };

    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      authorizedDaycareIds: ['center-a', 'center-b'], // 2 centers -> DENY
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });
    const mockExecutor = vi.fn();

    const req = createCallableRequest(forgedPayload, { uid: 'anita-teacher-01' });

    await expect(
      handleRecommendCurricularPDA(req, { authorizer, executor: mockExecutor })
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(mockExecutor).not.toHaveBeenCalled();
  });

  it('40. authorization denial prevents executor invocation', async () => {
    const reader = vi.fn().mockResolvedValue({
      ...validTeacherDoc,
      active: false,
    });
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });
    const mockExecutor = vi.fn().mockResolvedValue([]);

    const req = createCallableRequest(validGatewayPayload, { uid: 'anita-teacher-01' });

    await expect(
      handleRecommendCurricularPDA(req, { authorizer, executor: mockExecutor })
    ).rejects.toThrow(HttpsError);

    expect(mockExecutor).toHaveBeenCalledTimes(0);
  });

  it('41. Firestore failure prevents executor invocation and does not leak private details', async () => {
    const sensitiveErrorMsg = 'TIMESTAMP_PRIVATE_DETAIL_DO_NOT_EXPOSE';
    const reader = vi.fn().mockRejectedValue(new Error(sensitiveErrorMsg));
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });
    const mockExecutor = vi.fn().mockResolvedValue([]);

    const req = createCallableRequest(validGatewayPayload, { uid: 'anita-teacher-01' });

    let caughtError: unknown;
    try {
      await handleRecommendCurricularPDA(req, { authorizer, executor: mockExecutor });
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(HttpsError);
    expect((caughtError as HttpsError).code).toBe('permission-denied');
    expect((caughtError as HttpsError).message).not.toContain(sensitiveErrorMsg);
    expect(mockExecutor).toHaveBeenCalledTimes(0);
  });

  it('42. successful authorization permits executor invocation exactly once', async () => {
    const reader = vi.fn().mockResolvedValue(validTeacherDoc);
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });
    const mockExecutor = vi.fn().mockResolvedValue([
      {
        reference: {
          pdaId: 'TUTORIA-PDA-0001',
          catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
        },
        rationale: 'Adecuado para el desarrollo motor fino.',
      },
    ]);

    const req = createCallableRequest(validGatewayPayload, { uid: 'anita-teacher-01' });

    const response = await handleRecommendCurricularPDA(req, {
      authorizer,
      executor: mockExecutor,
    });

    expect(mockExecutor).toHaveBeenCalledTimes(1);
    expect(response.recommendations).toHaveLength(1);
    expect(response.recommendations[0].pdaId).toBe('TUTORIA-PDA-0001');
  });

  it('43. no authorization identity is passed into OpenAI pedagogical request', async () => {
    const reader = vi.fn().mockResolvedValue(validTeacherDoc);
    const authorizer = createFirestoreCurricularAIAuthorizer({ reader, nowProvider });
    const mockExecutor = vi.fn().mockResolvedValue([]);

    const req = createCallableRequest(validGatewayPayload, { uid: 'anita-teacher-01' });

    await handleRecommendCurricularPDA(req, { authorizer, executor: mockExecutor });

    expect(mockExecutor).toHaveBeenCalledTimes(1);
    const passedPayload = mockExecutor.mock.calls[0][0] as Record<string, unknown>;

    // Sensitive identity fields must NEVER exist in pedagogical request
    expect(passedPayload).not.toHaveProperty('uid');
    expect(passedPayload).not.toHaveProperty('authUid');
    expect(passedPayload).not.toHaveProperty('personId');
    expect(passedPayload).not.toHaveProperty('assignmentId');
    expect(passedPayload).not.toHaveProperty('institutionalRole');
    expect(passedPayload).not.toHaveProperty('authorizedDaycareIds');
    expect(passedPayload).not.toHaveProperty('roomIds');
    expect(passedPayload).not.toHaveProperty('tokenClaims');

    // Only pedagogical fields are passed
    expect(passedPayload.activityId).toBe('act-tactile-01');
    expect(passedPayload.activityTitle).toBe('Exploración Táctil con Texturas Suaves');
    expect(passedPayload.objective).toBe('Estimular el vínculo afectivo y la exploración sensorial motriz.');
    expect(passedPayload.modality).toBe('DIRECT');
    expect(passedPayload.room).toEqual({
      roomId: 'lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 13,
      maxAgeMonths: 18,
    });
  });
});
