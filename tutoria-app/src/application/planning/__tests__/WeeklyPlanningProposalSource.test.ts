import { describe, it, expect, vi } from 'vitest';
import {
  InvalidWeeklyPlanningProposalError,
  OFFICIAL_WEEKDAYS,
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  WeeklyPlanningProposalSource,
  WeeklyPlanningProposalService,
  validateWeeklyPlanningProposalRequest,
  validateWeeklyPlanningProposalResponse,
  validateProposedActivity,
  ProposedPlanningDay,
  ProposedActivity,
  TECHNICAL_MAX_CONTEXT_FIELD_LENGTH,
  TECHNICAL_MAX_OBJECTIVE_LENGTH,
  TECHNICAL_MAX_DESCRIPTION_LENGTH,
  TECHNICAL_MIN_DURATION_MINUTES,
  TECHNICAL_MAX_DURATION_MINUTES,
} from '../WeeklyPlanningProposalSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R11.1 — Weekly Planning Proposal Contract Foundation', () => {
  const sampleRoom: Room = {
    roomId: 'lactantes-c',
    name: 'Lactantes C',
    minAgeMonths: 13,
    maxAgeMonths: 18,
  };

  const createValidRequest = (
    overrides: Partial<WeeklyPlanningProposalRequest> = {}
  ): WeeklyPlanningProposalRequest => ({
    planningId: 'test-plan-123',
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    modality: 'DIRECT',
    room: sampleRoom,
    currentContext: {
      observations: 'Observaciones de la semana sobre exploración sensorial.',
      identifiedNeeds: 'Fortalecer el agarre de pinza y coordinación.',
      specialSituations: 'Dos lactantes en proceso de adaptación.',
      availableMaterials: 'Pelotas suaves, cascabeles, colchonetas.',
    },
    ...overrides,
  });

  const createValidActivity = (overrides: Partial<ProposedActivity> = {}): ProposedActivity => ({
    category: 'EXPERIENCIAS ARTÍSTICAS',
    objective: 'Explorar texturas y sonidos suaves con sonajas',
    description: 'Se sientan en círculo sobre la colchoneta para manipular sonajas siguiendo ritmos suaves.',
    durationMinutes: 20,
    materials: ['Sonajas', 'Colchoneta'],
    ...overrides,
  });

  const createValidResponse = (
    overrides: Partial<WeeklyPlanningProposalResponse> = {}
  ): WeeklyPlanningProposalResponse => ({
    days: OFFICIAL_WEEKDAYS.map((dayOfWeek) => ({
      dayOfWeek,
      date: '2026-08-24',
      activities: [createValidActivity()],
    })),
    ...overrides,
  });

  // =========================================================================
  // REQUIREMENT A & B: ZERO DOMAIN MUTATION ON REQUEST / PROPOSAL
  // =========================================================================
  describe('Zero Domain Mutation Invariants (Proposal != Planning)', () => {
    it('A. Creating a proposal request does not mutate WeeklyPlanning', () => {
      const plan = WeeklyPlanning.create(
        'plan-001',
        'daycare-1',
        'lactantes-c',
        'teacher-anita',
        '2026-08-24',
        '2026-08-28'
      );
      const snapshotBefore = JSON.stringify(plan);

      const request = createValidRequest({
        planningId: plan.planningId,
        room: sampleRoom,
        currentContext: {
          observations: 'Nuevas observaciones para IA',
          identifiedNeeds: 'Nuevas necesidades',
          specialSituations: 'Ninguna',
          availableMaterials: 'Bloques',
        },
      });
      validateWeeklyPlanningProposalRequest(request);

      expect(JSON.stringify(plan)).toBe(snapshotBefore);
      expect(plan.observations).toBe('');
      expect(plan.identifiedNeeds).toBe('');
    });

    it('B. Receiving a proposal response does not mutate WeeklyPlanning', async () => {
      const plan = WeeklyPlanning.create(
        'plan-001',
        'daycare-1',
        'lactantes-c',
        'teacher-anita',
        '2026-08-24',
        '2026-08-28'
      );
      const snapshotBefore = JSON.stringify(plan);

      const validResponse = createValidResponse();
      const validated = validateWeeklyPlanningProposalResponse(validResponse);

      // Verify domain plan is untouched
      expect(JSON.stringify(plan)).toBe(snapshotBefore);
      expect(plan.days.length).toBe(0);
      expect(plan.status).toBe('DRAFT');
      expect(validated.days.length).toBe(5);
    });

    it('C. Provider invocation alone cannot save to a repository', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const saveSpy = vi.spyOn(repo, 'save');

      const mockSource: WeeklyPlanningProposalSource = {
        propose: vi.fn().mockResolvedValue(createValidResponse()),
      };

      const service = new WeeklyPlanningProposalService(mockSource);
      const request = createValidRequest();

      const result = await service.getProposal(request);

      expect(mockSource.propose).toHaveBeenCalledTimes(1);
      expect(result.days.length).toBe(5);
      expect(saveSpy).not.toHaveBeenCalled();
      expect(await repo.findById('test-plan-123')).toBeNull();
    });

    it('D. Proposal response contains no planning lifecycle approval state', () => {
      const responseWithStatus: any = {
        days: createValidResponse().days,
        status: 'APPROVED',
      };
      expect(() => validateWeeklyPlanningProposalResponse(responseWithStatus)).toThrow(
        /Proposal response cannot contain lifecycle or domain aggregate field 'status'/
      );

      const responseWithApproval: any = {
        days: createValidResponse().days,
        approvedBy: 'Ceci',
        approvedAt: new Date(),
      };
      expect(() => validateWeeklyPlanningProposalResponse(responseWithApproval)).toThrow(
        /Proposal response cannot contain lifecycle or domain aggregate field 'approvedBy'/
      );

      const responseWithClosed: any = {
        days: createValidResponse().days,
        closedBy: 'Ceci',
        closedAt: new Date(),
      };
      expect(() => validateWeeklyPlanningProposalResponse(responseWithClosed)).toThrow(
        /Proposal response cannot contain lifecycle or domain aggregate field 'closedBy'/
      );
    });

    it('E. Proposal response contains no evaluation approval state', () => {
      const days = createValidResponse().days.map((d, idx) => {
        if (idx === 0) {
          return {
            ...d,
            evaluation: 'Evaluación propuesta por IA',
            evaluationStatus: 'APPROVED',
          };
        }
        return d;
      });

      expect(() => validateWeeklyPlanningProposalResponse({ days } as any)).toThrow(
        /Proposed day cannot contain evaluation, review, or institutional program field 'evaluation'/
      );
    });

    it('F. Proposal response contains no complementary institutional activities', () => {
      const days = createValidResponse().days.map((d, idx) => {
        if (idx === 0) {
          return {
            ...d,
            complementaryActivities: [
              {
                programArea: 'Inglés',
                activityName: 'Hello song',
              },
            ],
          };
        }
        return d;
      });

      expect(() => validateWeeklyPlanningProposalResponse({ days } as any)).toThrow(
        /Proposed day cannot contain evaluation, review, or institutional program field 'complementaryActivities'/
      );
    });

    it('G. Proposal response contains no prioritized practices', () => {
      const days = createValidResponse().days.map((d, idx) => {
        if (idx === 0) {
          return {
            ...d,
            prioritizedPractices: [
              {
                practiceName: 'Práctica institucional inventada',
              },
            ],
          };
        }
        return d;
      });

      expect(() => validateWeeklyPlanningProposalResponse({ days } as any)).toThrow(
        /Proposed day cannot contain evaluation, review, or institutional program field 'prioritizedPractices'/
      );
    });

    it('H. Proposal activity contains no automatic curricularTraceability selection', () => {
      const activityWithCurricular: any = createValidActivity();
      activityWithCurricular.curricularTraceability = [
        { pdaId: 'TUTORIA-PDA-0001', catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1' },
      ];

      expect(() => validateProposedActivity(activityWithCurricular)).toThrow(
        /Proposed activity cannot contain curricularTraceability/
      );

      const activityWithPdaId: any = createValidActivity();
      activityWithPdaId.pdaId = 'TUTORIA-PDA-0001';

      expect(() => validateProposedActivity(activityWithPdaId)).toThrow(
        /Proposed activity cannot contain direct PDA reference IDs/
      );
    });
  });

  // =========================================================================
  // REQUIREMENT I: MODALITY SUPPORT (DIRECT & INDIRECT)
  // =========================================================================
  describe('Modality Governance (DIRECT and INDIRECT Native Support)', () => {
    it('I.1 Both DIRECT and INDIRECT requests are valid', () => {
      const directReq = createValidRequest({ modality: 'DIRECT' });
      const indirectReq = createValidRequest({ modality: 'INDIRECT' });

      expect(() => validateWeeklyPlanningProposalRequest(directReq)).not.toThrow();
      expect(() => validateWeeklyPlanningProposalRequest(indirectReq)).not.toThrow();
    });

    it('I.2 Rejects unknown or malformed modality', () => {
      const invalidReq: any = createValidRequest({ modality: 'HYBRID' as any });
      expect(() => validateWeeklyPlanningProposalRequest(invalidReq)).toThrow(
        /Invalid modality 'HYBRID'. Must be 'DIRECT' or 'INDIRECT'/
      );
    });
  });

  // =========================================================================
  // REQUIREMENT J & K: EXACTLY FIVE CANDIDATE WEEKDAYS
  // =========================================================================
  describe('Weekday Invariants', () => {
    it('J. Exactly five candidate weekdays are required and accepted', () => {
      const response = createValidResponse();
      const validated = validateWeeklyPlanningProposalResponse(response);

      expect(validated.days.length).toBe(5);
      expect(validated.days.map((d) => d.dayOfWeek)).toEqual(OFFICIAL_WEEKDAYS);
      expect(Object.isFrozen(validated)).toBe(true);
      expect(Object.isFrozen(validated.days)).toBe(true);
    });

    it('K.1 Rejects response with fewer than 5 days', () => {
      const fourDays = createValidResponse().days.slice(0, 4);
      expect(() => validateWeeklyPlanningProposalResponse({ days: fourDays })).toThrow(
        /Proposal response must contain exactly 5 days. Received 4/
      );
    });

    it('K.2 Rejects response with more than 5 days', () => {
      const sixDays = [
        ...createValidResponse().days,
        { dayOfWeek: 'MONDAY' as const, activities: [createValidActivity()] },
      ];
      expect(() => validateWeeklyPlanningProposalResponse({ days: sixDays })).toThrow(
        /Proposal response must contain exactly 5 days. Received 6/
      );
    });

    it('K.3 Rejects duplicate weekdays in response', () => {
      const duplicateDays: ProposedPlanningDay[] = [
        { dayOfWeek: 'MONDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'MONDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'WEDNESDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'THURSDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'FRIDAY', activities: [createValidActivity()] },
      ];
      expect(() => validateWeeklyPlanningProposalResponse({ days: duplicateDays })).toThrow(
        /Duplicate proposed day for 'MONDAY' is rejected/
      );
    });

    it('K.4 Rejects response missing a required weekday (e.g. Saturday instead of Tuesday)', () => {
      const invalidDays: any[] = [
        { dayOfWeek: 'MONDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'SATURDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'WEDNESDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'THURSDAY', activities: [createValidActivity()] },
        { dayOfWeek: 'FRIDAY', activities: [createValidActivity()] },
      ];
      expect(() => validateWeeklyPlanningProposalResponse({ days: invalidDays })).toThrow(
        /Invalid weekday 'SATURDAY'/
      );
    });

    it('K.5 Rejects day with zero activities', () => {
      const emptyDayResponse: WeeklyPlanningProposalResponse = {
        days: OFFICIAL_WEEKDAYS.map((d, idx) => ({
          dayOfWeek: d,
          activities: idx === 0 ? [] : [createValidActivity()],
        })),
      };
      expect(() => validateWeeklyPlanningProposalResponse(emptyDayResponse)).toThrow(
        /Proposed day 'MONDAY' must contain at least 1 activity/
      );
    });
  });

  // =========================================================================
  // REQUIREMENT L, M, N: ACTIVITY FIELDS VALIDATION
  // =========================================================================
  describe('Activity Validation', () => {
    it('L. Invalid category fails closed', () => {
      const invalidCategoryAct: any = createValidActivity({ category: 'MATEMÁTICAS AVANZADAS' as any });
      expect(() => validateProposedActivity(invalidCategoryAct)).toThrow(
        /Invalid proposed activity category 'MATEMÁTICAS AVANZADAS'/
      );
    });

    it('L.2 Respects custom allowedCategories constraint', () => {
      const act = createValidActivity({ category: 'ACTIVACIÓN FÍSICA' });
      expect(() =>
        validateProposedActivity(act, {
          allowedCategories: ['EXPERIENCIAS ARTÍSTICAS', 'AMBIENTES DE APRENDIZAJE'],
        })
      ).toThrow(/Invalid proposed activity category 'ACTIVACIÓN FÍSICA'/);

      const validAct = createValidActivity({ category: 'EXPERIENCIAS ARTÍSTICAS' });
      expect(() =>
        validateProposedActivity(validAct, {
          allowedCategories: ['EXPERIENCIAS ARTÍSTICAS', 'AMBIENTES DE APRENDIZAJE'],
        })
      ).not.toThrow();
    });

    it('M.1 Invalid duration (zero or negative) fails closed', () => {
      const zeroDuration = createValidActivity({ durationMinutes: 0 });
      expect(() => validateProposedActivity(zeroDuration)).toThrow(/durationMinutes \(0\) must be an integer/);

      const negDuration = createValidActivity({ durationMinutes: -15 });
      expect(() => validateProposedActivity(negDuration)).toThrow(/durationMinutes \(-15\) must be an integer/);
    });

    it('M.2 Non-integer or out-of-range duration fails closed', () => {
      const floatDuration = createValidActivity({ durationMinutes: 20.5 });
      expect(() => validateProposedActivity(floatDuration)).toThrow(/durationMinutes \(20.5\) must be an integer/);

      const tooLongDuration = createValidActivity({ durationMinutes: TECHNICAL_MAX_DURATION_MINUTES + 1 });
      expect(() => validateProposedActivity(tooLongDuration)).toThrow(/durationMinutes/);

      const tooShortDuration = createValidActivity({ durationMinutes: TECHNICAL_MIN_DURATION_MINUTES - 1 });
      expect(() => validateProposedActivity(tooShortDuration)).toThrow(/durationMinutes/);
    });

    it('N.1 Blank objective fails closed', () => {
      const blankObjective = createValidActivity({ objective: '   ' });
      expect(() => validateProposedActivity(blankObjective)).toThrow(
        /Proposed activity must contain a non-empty string objective/
      );
    });

    it('N.2 Blank description fails closed', () => {
      const blankDesc = createValidActivity({ description: '' });
      expect(() => validateProposedActivity(blankDesc)).toThrow(
        /Proposed activity must contain a non-empty string description/
      );
    });

    it('N.3 Objective and description exceeding technical limits fail closed', () => {
      const longObjective = createValidActivity({ objective: 'A'.repeat(TECHNICAL_MAX_OBJECTIVE_LENGTH + 1) });
      expect(() => validateProposedActivity(longObjective)).toThrow(/objective exceeds technical maximum/);

      const longDesc = createValidActivity({ description: 'B'.repeat(TECHNICAL_MAX_DESCRIPTION_LENGTH + 1) });
      expect(() => validateProposedActivity(longDesc)).toThrow(/description exceeds technical maximum/);
    });

    it('Materials validation enforces bounded non-empty strings', () => {
      const emptyItemMaterial = createValidActivity({ materials: ['Sonajas', '   '] });
      expect(() => validateProposedActivity(emptyItemMaterial)).toThrow(
        /Each material item in proposed activity must be a non-empty string/
      );

      const tooManyMaterials = createValidActivity({
        materials: Array.from({ length: 26 }, (_, i) => `Material ${i}`),
      });
      expect(() => validateProposedActivity(tooManyMaterials)).toThrow(/materials collection exceeds maximum/);
    });
  });

  // =========================================================================
  // REQUIREMENT O: CURRENT CONTEXT AT WEEKLY LEVEL ONLY
  // =========================================================================
  describe('Context Scope & Privacy Minimization', () => {
    it('O. Current context is represented once at weekly request level, not copied into every day/activity', () => {
      const req = createValidRequest();
      validateWeeklyPlanningProposalRequest(req);

      // Context lives strictly at top-level request
      expect(req.currentContext).toBeDefined();
      expect(req.currentContext.observations).toBe('Observaciones de la semana sobre exploración sensorial.');

      // Response days have zero context duplication
      const res = createValidResponse();
      const validatedRes = validateWeeklyPlanningProposalResponse(res);

      for (const day of validatedRes.days) {
        expect((day as any).observations).toBeUndefined();
        expect((day as any).identifiedNeeds).toBeUndefined();
        expect((day as any).specialSituations).toBeUndefined();
        expect((day as any).availableMaterials).toBeUndefined();
        for (const act of day.activities) {
          expect((act as any).observations).toBeUndefined();
          expect((act as any).identifiedNeeds).toBeUndefined();
        }
      }
    });

    it('Enforces technical max length on context fields to prevent unbounded inputs', () => {
      const tooLongContext = createValidRequest({
        currentContext: {
          observations: 'X'.repeat(TECHNICAL_MAX_CONTEXT_FIELD_LENGTH + 1),
        },
      });
      expect(() => validateWeeklyPlanningProposalRequest(tooLongContext)).toThrow(
        /currentContext.observations exceeds maximum allowed length/
      );
    });

    it('Rejects invalid date ranges and room age boundaries', () => {
      const invertedDates = createValidRequest({
        weekStart: '2026-08-28',
        weekEnd: '2026-08-24',
      });
      expect(() => validateWeeklyPlanningProposalRequest(invertedDates)).toThrow(
        /weekStart \(2026-08-28\) cannot be later than weekEnd \(2026-08-24\)/
      );

      const malformedDate = createValidRequest({
        weekStart: '2026-02-31', // Not a valid calendar date
      });
      expect(() => validateWeeklyPlanningProposalRequest(malformedDate)).toThrow(/Invalid weekStart/);

      const invertedAges = createValidRequest({
        room: {
          roomId: 'r1',
          name: 'Room 1',
          minAgeMonths: 24,
          maxAgeMonths: 12,
        },
      });
      expect(() => validateWeeklyPlanningProposalRequest(invertedAges)).toThrow(
        /Room maxAgeMonths \(12\) must be an integer greater than or equal to minAgeMonths \(24\)/
      );
    });
  });

  // =========================================================================
  // SERVICE PIPELINE INTEGRATION
  // =========================================================================
  describe('WeeklyPlanningProposalService Execution Pipeline', () => {
    it('Validates request and response end-to-end through service port', async () => {
      const mockResponse = createValidResponse();
      const mockSource: WeeklyPlanningProposalSource = {
        propose: vi.fn().mockResolvedValue(mockResponse),
      };

      const service = new WeeklyPlanningProposalService(mockSource);
      const req = createValidRequest();

      const proposal = await service.getProposal(req);

      expect(mockSource.propose).toHaveBeenCalledWith(req);
      expect(proposal.days.length).toBe(5);
      expect(proposal.days[0].activities.length).toBe(1);
      expect(Object.isFrozen(proposal)).toBe(true);
    });

    it('Fails closed if the source returns malformed proposal', async () => {
      const badSource: WeeklyPlanningProposalSource = {
        propose: vi.fn().mockResolvedValue({ days: [] } as any),
      };

      const service = new WeeklyPlanningProposalService(badSource);
      const req = createValidRequest();

      await expect(service.getProposal(req)).rejects.toThrow(
        /Proposal response must contain exactly 5 days/
      );
    });
  });
});
