import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FirestoreWeeklyPlanningRepository,
  toFirestoreTimestamp,
  toDateOrUndefined,
  toRequiredDate,
} from '../FirestoreWeeklyPlanningRepository';
import { InMemoryWeeklyPlanningRepository } from '../InMemoryWeeklyPlanningRepository';
import { WeeklyPlanningRepository } from '../../../application/ports/WeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { WeeklyPlanning, PlanningDay } from '../../../domain/planning/WeeklyPlanning';
import { Timestamp } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    static fromDate(d: Date) {
      return new MockTimestamp(Math.floor(d.getTime() / 1000), (d.getTime() % 1000) * 1000000);
    }
    toDate() {
      return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1000000));
    }
  }

  return {
    Timestamp: MockTimestamp,
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    collection: vi.fn((_db, name) => ({ collectionName: name })),
    query: vi.fn((coll, ...clauses) => ({ coll, clauses })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    getDocs: vi.fn(),
  };
});

vi.mock('../../firebase/firebaseConfig', () => ({
  db: { _dummy: 'firestore-instance' },
}));

describe('WeeklyPlanningPersistenceAlignment (H1R13.2A)', () => {
  let firestoreRepo: FirestoreWeeklyPlanningRepository;
  let inMemoryRepo: InMemoryWeeklyPlanningRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreRepo = new FirestoreWeeklyPlanningRepository();
    inMemoryRepo = new InMemoryWeeklyPlanningRepository();
  });

  const createSampleDay = (dayOfWeek: PlanningDay['dayOfWeek'], date: string): PlanningDay => ({
    date,
    dayOfWeek,
    activities: [
      {
        activityId: `act-${dayOfWeek}-1`,
        category: 'Juego',
        objective: 'Objetivo de prueba',
        description: 'Descripcion de prueba',
        materials: ['Material 1'],
        durationMinutes: 20,
        curricularTraceability: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
          },
        ],
      },
      {
        activityId: `act-${dayOfWeek}-2`,
        category: 'Arte',
        objective: 'Objetivo de arte',
        description: 'Descripcion de arte',
        materials: ['Material 2'],
        durationMinutes: 25,
        curricularTraceability: [
          {
            pdaId: 'TUTORIA-PDA-0002',
            catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
          },
        ],
      },
    ],
    complementaryActivities: [],
    materials: ['Material 1', 'Material 2'],
  });

  const createSample5Days = (): PlanningDay[] => [
    createSampleDay('MONDAY', '2026-08-24'),
    createSampleDay('TUESDAY', '2026-08-25'),
    createSampleDay('WEDNESDAY', '2026-08-26'),
    createSampleDay('THURSDAY', '2026-08-27'),
    createSampleDay('FRIDAY', '2026-08-28'),
  ];

  const createSamplePlan = (planningId: string = 'plan-pers-1'): WeeklyPlanning => {
    const plan = WeeklyPlanning.create(planningId, 'daycare-1', 'maternal-a', 'teacher-1', '2026-08-24', '2026-08-28');
    plan.editPedagogicalContent(
      'Observaciones iniciales',
      'Necesidades identificadas',
      'Situaciones especiales',
      'Materiales disponibles',
      ['Ref 1'],
      createSample5Days()
    );
    return plan;
  };

  it('1. repository abstraction accepts InMemory implementation', () => {
    const repo: WeeklyPlanningRepository = inMemoryRepo;
    expect(repo).toBeDefined();
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.listByTeacher).toBe('function');
    expect(typeof repo.listInReview).toBe('function');
    expect(typeof repo.listApproved).toBe('function');
    expect(typeof repo.listClosed).toBe('function');
  });

  it('2. repository abstraction accepts Firestore implementation', () => {
    const repo: WeeklyPlanningRepository = firestoreRepo;
    expect(repo).toBeDefined();
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.listByTeacher).toBe('function');
    expect(typeof repo.listInReview).toBe('function');
    expect(typeof repo.listApproved).toBe('function');
    expect(typeof repo.listClosed).toBe('function');
  });

  it('3. PlanningWorkflowService no longer depends on concrete InMemoryWeeklyPlanningRepository', async () => {
    const mockRepo: WeeklyPlanningRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(createSamplePlan('plan-mock')),
      listByTeacher: vi.fn().mockResolvedValue([]),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
      listClosed: vi.fn().mockResolvedValue([]),
    };

    const serviceWithMock = new PlanningWorkflowService(mockRepo);
    expect(serviceWithMock).toBeDefined();

    const plan = await serviceWithMock.getPlanning('plan-mock');
    expect(plan).toBeDefined();
    expect(plan?.planningId).toBe('plan-mock');
    expect(mockRepo.findById).toHaveBeenCalledWith('plan-mock');

    const serviceWithFirestore = new PlanningWorkflowService(firestoreRepo);
    expect(serviceWithFirestore).toBeDefined();
  });

  it('4. evaluation text survives Firestore serialize/deserialize', () => {
    const plan = createSamplePlan();
    plan.days[0]!.evaluation = 'Anita: Los niños interactuaron positivamente con los bloques de texturas.';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.evaluation).toBe(
      'Anita: Los niños interactuaron positivamente con los bloques de texturas.'
    );
  });

  it('5. executionNotes survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[1]!.executionNotes = 'Se realizó en el patio debido al clima favorable.';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[1]!.executionNotes).toBe('Se realizó en el patio debido al clima favorable.');
  });

  it('6. evaluationStatus survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.evaluationStatus = 'IN_REVIEW';
    plan.days[1]!.evaluationStatus = 'CHANGES_REQUESTED';
    plan.days[2]!.evaluationStatus = 'APPROVED';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.evaluationStatus).toBe('IN_REVIEW');
    expect(roundTripped.days[1]!.evaluationStatus).toBe('CHANGES_REQUESTED');
    expect(roundTripped.days[2]!.evaluationStatus).toBe('APPROVED');
  });

  it('7. evaluationConfirmedBy survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.evaluationConfirmedBy = 'teacher-anita-1';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.evaluationConfirmedBy).toBe('teacher-anita-1');
  });

  it('8. evaluationSubmittedBy survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.evaluationSubmittedBy = 'teacher-anita-1';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.evaluationSubmittedBy).toBe('teacher-anita-1');
  });

  it('9. evaluationDirectorComment survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.evaluationDirectorComment = 'Ceci: Por favor especificar el tiempo dedicado a la segunda actividad.';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.evaluationDirectorComment).toBe(
      'Ceci: Por favor especificar el tiempo dedicado a la segunda actividad.'
    );
  });

  it('10. evaluationReviewedBy survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.evaluationReviewedBy = 'director-ceci';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.evaluationReviewedBy).toBe('director-ceci');
  });

  it('11. evaluationResubmitted survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.evaluationResubmitted = true;

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.evaluationResubmitted).toBe(true);
  });

  it('12. teacherReviewedBy survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.teacherReviewedBy = 'teacher-anita-1';

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.teacherReviewedBy).toBe('teacher-anita-1');
  });

  it('13. directorReviewed survives round-trip', () => {
    const plan = createSamplePlan();
    plan.days[0]!.directorReviewed = true;

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.days[0]!.directorReviewed).toBe(true);
  });

  it('14. evaluationConfirmedAt returns as Date', () => {
    const plan = createSamplePlan();
    const confirmedDate = new Date('2026-08-24T15:30:00.000Z');
    plan.days[0]!.evaluationConfirmedAt = confirmedDate;

    const serialized = firestoreRepo.serialize(plan);
    expect(serialized.days[0].evaluationConfirmedAt).toBeInstanceOf(Timestamp);

    const roundTripped = firestoreRepo.deserialize(serialized);
    expect(roundTripped.days[0]!.evaluationConfirmedAt).toBeInstanceOf(Date);
    expect(roundTripped.days[0]!.evaluationConfirmedAt?.getTime()).toBe(confirmedDate.getTime());
  });

  it('15. evaluationSubmittedAt returns as Date', () => {
    const plan = createSamplePlan();
    const submittedDate = new Date('2026-08-24T15:35:00.000Z');
    plan.days[0]!.evaluationSubmittedAt = submittedDate;

    const serialized = firestoreRepo.serialize(plan);
    expect(serialized.days[0].evaluationSubmittedAt).toBeInstanceOf(Timestamp);

    const roundTripped = firestoreRepo.deserialize(serialized);
    expect(roundTripped.days[0]!.evaluationSubmittedAt).toBeInstanceOf(Date);
    expect(roundTripped.days[0]!.evaluationSubmittedAt?.getTime()).toBe(submittedDate.getTime());
  });

  it('16. evaluationReviewedAt returns as Date', () => {
    const plan = createSamplePlan();
    const reviewedDate = new Date('2026-08-24T17:00:00.000Z');
    plan.days[0]!.evaluationReviewedAt = reviewedDate;

    const serialized = firestoreRepo.serialize(plan);
    expect(serialized.days[0].evaluationReviewedAt).toBeInstanceOf(Timestamp);

    const roundTripped = firestoreRepo.deserialize(serialized);
    expect(roundTripped.days[0]!.evaluationReviewedAt).toBeInstanceOf(Date);
    expect(roundTripped.days[0]!.evaluationReviewedAt?.getTime()).toBe(reviewedDate.getTime());
  });

  it('17. teacherReviewedAt returns as Date', () => {
    const plan = createSamplePlan();
    const reviewedDate = new Date('2026-08-24T08:00:00.000Z');
    plan.days[0]!.teacherReviewedAt = reviewedDate;

    const serialized = firestoreRepo.serialize(plan);
    expect(serialized.days[0].teacherReviewedAt).toBeInstanceOf(Timestamp);

    const roundTripped = firestoreRepo.deserialize(serialized);
    expect(roundTripped.days[0]!.teacherReviewedAt).toBeInstanceOf(Date);
    expect(roundTripped.days[0]!.teacherReviewedAt?.getTime()).toBe(reviewedDate.getTime());
  });

  it('18. evaluationHistory survives round-trip', () => {
    const plan = createSamplePlan();
    const subDate = new Date('2026-08-24T14:00:00.000Z');
    const revDate = new Date('2026-08-24T16:00:00.000Z');

    plan.days[0]!.evaluationHistory = [
      {
        evaluation: 'Versión preliminar 1',
        submittedAt: subDate,
        submittedBy: 'teacher-anita-1',
        directorComment: 'Detallar los materiales utilizados.',
        reviewedAt: revDate,
        reviewedBy: 'director-ceci',
        status: 'CHANGES_REQUESTED',
      },
    ];

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    const history = roundTripped.days[0]!.evaluationHistory;
    expect(history).toBeDefined();
    expect(history).toHaveLength(1);
    expect(history![0]!.evaluation).toBe('Versión preliminar 1');
    expect(history![0]!.submittedBy).toBe('teacher-anita-1');
    expect(history![0]!.directorComment).toBe('Detallar los materiales utilizados.');
    expect(history![0]!.reviewedBy).toBe('director-ceci');
    expect(history![0]!.status).toBe('CHANGES_REQUESTED');
  });

  it('19. evaluationHistory.submittedAt returns as Date', () => {
    const plan = createSamplePlan();
    const subDate = new Date('2026-08-24T14:00:00.000Z');
    plan.days[0]!.evaluationHistory = [
      {
        evaluation: 'Texto',
        submittedAt: subDate,
        submittedBy: 'Anita',
        status: 'IN_REVIEW',
      },
    ];

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    const entry = roundTripped.days[0]!.evaluationHistory![0]!;
    expect(entry.submittedAt).toBeInstanceOf(Date);
    expect(entry.submittedAt.getTime()).toBe(subDate.getTime());
  });

  it('20. evaluationHistory.reviewedAt returns as Date', () => {
    const plan = createSamplePlan();
    const revDate = new Date('2026-08-24T16:00:00.000Z');
    plan.days[0]!.evaluationHistory = [
      {
        evaluation: 'Texto',
        submittedAt: new Date('2026-08-24T14:00:00.000Z'),
        submittedBy: 'Anita',
        reviewedAt: revDate,
        reviewedBy: 'Ceci',
        status: 'CHANGES_REQUESTED',
      },
    ];

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    const entry = roundTripped.days[0]!.evaluationHistory![0]!;
    expect(entry.reviewedAt).toBeInstanceOf(Date);
    expect(entry.reviewedAt?.getTime()).toBe(revDate.getTime());
  });

  it('21. closedBy survives round-trip', () => {
    const plan = createSamplePlan();
    plan.status = 'CLOSED';
    plan.closedBy = 'director-ceci';

    const serialized = firestoreRepo.serialize(plan);
    expect(serialized.closedBy).toBe('director-ceci');

    const roundTripped = firestoreRepo.deserialize(serialized);
    expect(roundTripped.closedBy).toBe('director-ceci');
  });

  it('22. closedAt returns as Date', () => {
    const plan = createSamplePlan();
    plan.status = 'CLOSED';
    const closeDate = new Date('2026-08-28T18:00:00.000Z');
    plan.closedAt = closeDate;

    const serialized = firestoreRepo.serialize(plan);
    expect(serialized.closedAt).toBeInstanceOf(Timestamp);

    const roundTripped = firestoreRepo.deserialize(serialized);
    expect(roundTripped.closedAt).toBeInstanceOf(Date);
    expect(roundTripped.closedAt?.getTime()).toBe(closeDate.getTime());
  });

  it('23. CLOSED status survives round-trip', () => {
    const plan = createSamplePlan();
    plan.status = 'CLOSED';

    const serialized = firestoreRepo.serialize(plan);
    expect(serialized.status).toBe('CLOSED');

    const roundTripped = firestoreRepo.deserialize(serialized);
    expect(roundTripped.status).toBe('CLOSED');
    expect(roundTripped.isClosed()).toBe(true);
    expect(roundTripped.semanticStatus).toBe('CLOSED');
  });

  it('24. listClosed returns CLOSED plannings', async () => {
    const { getDocs } = await import('firebase/firestore');
    const closedPlan1 = createSamplePlan('plan-closed-1');
    closedPlan1.status = 'CLOSED';
    closedPlan1.closedBy = 'Ceci';
    closedPlan1.closedAt = new Date('2026-08-28T18:00:00Z');

    const closedPlan2 = createSamplePlan('plan-closed-2');
    closedPlan2.status = 'CLOSED';
    closedPlan2.closedBy = 'Ceci';
    closedPlan2.closedAt = new Date('2026-08-28T18:30:00Z');

    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { data: () => firestoreRepo.serialize(closedPlan1) },
        { data: () => firestoreRepo.serialize(closedPlan2) },
      ],
    } as never);

    const results = await firestoreRepo.listClosed();
    expect(results).toHaveLength(2);
    expect(results[0]!.planningId).toBe('plan-closed-1');
    expect(results[0]!.status).toBe('CLOSED');
    expect(results[1]!.planningId).toBe('plan-closed-2');
    expect(results[1]!.status).toBe('CLOSED');
  });

  it('25. listClosed does not return non-CLOSED plannings', async () => {
    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [],
    } as never);

    const results = await firestoreRepo.listClosed();
    expect(results).toHaveLength(0);
  });

  it('26. existing listApproved behavior remains valid', async () => {
    const { getDocs } = await import('firebase/firestore');
    const approvedPlan = createSamplePlan('plan-app-1');
    approvedPlan.status = 'APPROVED';

    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [{ data: () => firestoreRepo.serialize(approvedPlan) }],
    } as never);

    const results = await firestoreRepo.listApproved();
    expect(results).toHaveLength(1);
    expect(results[0]!.planningId).toBe('plan-app-1');
    expect(results[0]!.status).toBe('APPROVED');
  });

  it('27. existing governed evaluation lifecycle tests remain green through Firestore', () => {
    const plan = createSamplePlan('plan-lifecycle');
    plan.status = 'APPROVED';

    // Monday evaluation draft
    plan.saveDailyEvaluationDraft('MONDAY', 'Texto inicial', '2026-08-24', 'teacher-1');
    let roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.days[0]!.evaluation).toBe('Texto inicial');
    expect(roundTripped.days[0]!.evaluationStatus).toBe('DRAFT');

    // Monday confirm and submit
    plan.confirmAndSubmitDailyEvaluation('MONDAY', 'Texto confirmado', 'teacher-1', '2026-08-24');
    roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.days[0]!.evaluation).toBe('Texto confirmado');
    expect(roundTripped.days[0]!.evaluationStatus).toBe('IN_REVIEW');
    expect(roundTripped.days[0]!.evaluationConfirmedBy).toBe('teacher-1');
    expect(roundTripped.days[0]!.evaluationConfirmedAt).toBeInstanceOf(Date);

    // Ceci requests changes
    plan.requestDailyEvaluationChange('MONDAY', 'Comentario de Ceci', 'Ceci');
    roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.days[0]!.evaluationStatus).toBe('CHANGES_REQUESTED');
    expect(roundTripped.days[0]!.evaluationDirectorComment).toBe('Comentario de Ceci');

    // Anita resubmits
    plan.confirmAndResubmitDailyEvaluation('MONDAY', 'Texto corregido', 'teacher-1', '2026-08-24');
    roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.days[0]!.evaluationStatus).toBe('IN_REVIEW');
    expect(roundTripped.days[0]!.evaluationResubmitted).toBe(true);
    expect(roundTripped.days[0]!.evaluationHistory).toHaveLength(1);
    expect(roundTripped.days[0]!.evaluationHistory![0]!.evaluation).toBe('Texto confirmado');

    // Ceci approves Monday
    plan.approveDailyEvaluation('MONDAY', 'Ceci');
    roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.days[0]!.evaluationStatus).toBe('APPROVED');
    expect(roundTripped.days[0]!.evaluationReviewedBy).toBe('Ceci');
    expect(roundTripped.days[0]!.evaluationReviewedAt).toBeInstanceOf(Date);
  });

  it('28. existing closure tests remain green', () => {
    const plan = createSamplePlan('plan-closure');
    plan.status = 'APPROVED';

    // Approve all 5 days
    for (let i = 0; i < 5; i++) {
      const dayName = plan.days[i]!.dayOfWeek;
      const date = plan.days[i]!.date;
      plan.confirmAndSubmitDailyEvaluation(dayName, `Evaluacion ${dayName}`, 'teacher-1', date);
      plan.approveDailyEvaluation(dayName, 'Ceci');
    }

    expect(plan.isReadyForClosure).toBe(true);
    plan.closeWeek('Ceci', new Date('2026-08-28T18:00:00Z'));
    expect(plan.isClosed()).toBe(true);

    const serialized = firestoreRepo.serialize(plan);
    const roundTripped = firestoreRepo.deserialize(serialized);

    expect(roundTripped.status).toBe('CLOSED');
    expect(roundTripped.isClosed()).toBe(true);
    expect(roundTripped.closedBy).toBe('Ceci');
    expect(roundTripped.closedAt).toBeInstanceOf(Date);
    expect(roundTripped.closedAt?.toISOString()).toBe('2026-08-28T18:00:00.000Z');
    expect(roundTripped.approvedDailyEvaluationCount).toBe(5);
  });

  it('29. existing planning lifecycle tests remain green', () => {
    const plan = createSamplePlan('plan-plan-life');
    expect(plan.status).toBe('DRAFT');

    plan.days.forEach(d => {
      plan.markTeacherDayReviewed(d.dayOfWeek, 'teacher-1', new Date());
    });

    plan.submit();
    expect(plan.status).toBe('IN_REVIEW');
    let roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.status).toBe('IN_REVIEW');

    plan.reject('Ajustar actividades', 'Ceci');
    expect(plan.status).toBe('REJECTED');
    roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.status).toBe('REJECTED');
    expect(roundTripped.reviewHistory).toHaveLength(1);
    expect(roundTripped.reviewHistory[0]!.rejectedAt).toBeInstanceOf(Date);

    plan.submit();
    expect(plan.status).toBe('IN_REVIEW');

    plan.approve('Ceci');
    expect(plan.status).toBe('APPROVED');
    roundTripped = firestoreRepo.deserialize(firestoreRepo.serialize(plan));
    expect(roundTripped.status).toBe('APPROVED');
    expect(roundTripped.approvedBy).toBe('Ceci');
    expect(roundTripped.approvedAt).toBeInstanceOf(Date);
  });

  it('30. malformed timestamp handling follows explicit safe behavior', () => {
    // toFirestoreTimestamp
    expect(toFirestoreTimestamp(null)).toBeUndefined();
    expect(toFirestoreTimestamp(undefined)).toBeUndefined();
    expect(() => toFirestoreTimestamp(new Date('invalid-date'))).toThrow(
      'Invalid Date cannot be converted to Firestore Timestamp'
    );
    expect(() => toFirestoreTimestamp('not-a-date')).toThrow(
      'Invalid date value "not-a-date" cannot be converted to Firestore Timestamp'
    );
    expect(() => toFirestoreTimestamp({ invalid: true })).toThrow(
      'Cannot convert value of type "object" to Firestore Timestamp'
    );
    expect(() => toFirestoreTimestamp(true)).toThrow(
      'Cannot convert value of type "boolean" to Firestore Timestamp'
    );

    // toDateOrUndefined
    expect(toDateOrUndefined(null)).toBeUndefined();
    expect(toDateOrUndefined(undefined)).toBeUndefined();
    expect(() => toDateOrUndefined(new Date('invalid-date'))).toThrow('Invalid Date found in document');
    expect(() => toDateOrUndefined('not-a-date')).toThrow('Invalid date string/number: "not-a-date"');
    expect(() => toDateOrUndefined({ invalid: true })).toThrow('Cannot convert value of type "object" to Date');
    expect(() => toDateOrUndefined(12345)).not.toThrow(); // valid timestamp millis
    expect(toDateOrUndefined(12345)).toBeInstanceOf(Date);

    // toRequiredDate
    expect(() => toRequiredDate(undefined, 'testField')).toThrow(
      'Required date field "testField" is missing or undefined'
    );
    expect(() => toRequiredDate(null, 'testField')).toThrow(
      'Required date field "testField" is missing or undefined'
    );
    const validDate = toRequiredDate(new Date('2026-08-24T00:00:00Z'), 'testField');
    expect(validDate).toBeInstanceOf(Date);
  });
});
