import { describe, it, expect, vi } from 'vitest';
import {
  FirestoreWeeklyPlanningAdminRepository,
  toDateOrUndefined,
  toRequiredDate,
} from '../src/FirestoreWeeklyPlanningAdminRepository';
import { WeeklyPlanning } from '../../src/domain/planning/WeeklyPlanning';

describe('H1R13.3E — FirestoreWeeklyPlanningAdminRepository', () => {
  it('correctly normalizes dates from various formats', () => {
    const now = new Date('2026-10-05T12:00:00.000Z');
    expect(toDateOrUndefined(now)).toEqual(now);
    expect(toDateOrUndefined('2026-10-05T12:00:00.000Z')).toEqual(now);
    expect(toDateOrUndefined(now.getTime())).toEqual(now);
    expect(toDateOrUndefined({ toDate: () => now })).toEqual(now);
    expect(toDateOrUndefined({ seconds: 1791201600, nanoseconds: 0 })).toBeInstanceOf(Date);
    expect(toDateOrUndefined(null)).toBeUndefined();
    expect(toDateOrUndefined(undefined)).toBeUndefined();

    expect(toRequiredDate(now, 'test')).toEqual(now);
    expect(() => toRequiredDate(null, 'testField')).toThrow('Required date field "testField" is missing');
  });

  it('serializes and deserializes WeeklyPlanning preserving all invariants', () => {
    const repo = new FirestoreWeeklyPlanningAdminRepository();
    const planning = WeeklyPlanning.create(
      'plan-123',
      'daycare-1',
      'room-1',
      'teacher-1',
      '2026-10-05',
      '2026-10-09'
    );
    planning.status = 'APPROVED';
    planning.observations = 'Obs';
    planning.identifiedNeeds = 'Needs';

    const serialized = repo.serialize(planning);
    expect(serialized.planningId).toBe('plan-123');
    expect(serialized.status).toBe('APPROVED');

    const deserialized = repo.deserialize(serialized);
    expect(deserialized.planningId).toBe('plan-123');
    expect(deserialized.status).toBe('APPROVED');
    expect(deserialized.observations).toBe('Obs');
  });

  it('findById returns null for empty or missing id', async () => {
    const repo = new FirestoreWeeklyPlanningAdminRepository({
      docReader: async () => null,
    });

    expect(await repo.findById('')).toBeNull();
    expect(await repo.findById('non-existent')).toBeNull();
  });

  it('findById retrieves and deserializes planning via docReader', async () => {
    const planning = WeeklyPlanning.create(
      'plan-find-1',
      'daycare-1',
      'room-1',
      'teacher-1',
      '2026-10-05',
      '2026-10-09'
    );
    planning.status = 'APPROVED';

    const repo = new FirestoreWeeklyPlanningAdminRepository({
      docReader: async (id) => (id === 'plan-find-1' ? repo.serialize(planning) : null),
    });

    const retrieved = await repo.findById('plan-find-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.planningId).toBe('plan-find-1');
  });
  it('enforces strictly read-only behavior: save() and list queries fail closed', async () => {
    const repo = new FirestoreWeeklyPlanningAdminRepository();
    const planning = WeeklyPlanning.create(
      'plan-ro-1',
      'daycare-1',
      'room-1',
      'teacher-1',
      '2026-10-05',
      '2026-10-09'
    );

    await expect(repo.save(planning)).rejects.toThrow(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. save() is unsupported.'
    );

    await expect(repo.listByTeacher('teacher-1')).rejects.toThrow(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listByTeacher() is unsupported.'
    );

    await expect(repo.listInReview()).rejects.toThrow(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listInReview() is unsupported.'
    );

    await expect(repo.listApproved()).rejects.toThrow(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listApproved() is unsupported.'
    );

    await expect(repo.listClosed()).rejects.toThrow(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listClosed() is unsupported.'
    );
  });

  it('deserializes a representative H1R13.2 persisted document preserving all Evaluation-relevant state', () => {
    const repo = new FirestoreWeeklyPlanningAdminRepository();

    const persistedFixture: Record<string, unknown> = {
      planningId: 'plan-parity-100',
      daycareId: 'daycare-parity-1',
      roomId: 'lactantes-a',
      teacherId: 'teacher-parity-1',
      weekStart: '2026-10-05',
      weekEnd: '2026-10-09',
      status: 'APPROVED',
      observations: 'Parity test initial observations',
      identifiedNeeds: 'Parity test identified needs',
      specialSituations: 'Room adaptation note',
      availableMaterials: 'Plastic rings and blocks',
      curricularReferences: ['PEP2017-SEP'],
      version: 4,
      approvedBy: 'director-ceci',
      approvedAt: { seconds: 1791201600, nanoseconds: 0 },
      closedBy: 'director-ceci',
      closedAt: { seconds: 1791288000, nanoseconds: 0 },
      reviewHistory: [
        {
          reason: 'Initial round adjustments',
          rejectedBy: 'director-ceci',
          rejectedAt: { seconds: 1791115200, nanoseconds: 0 },
        },
      ],
      days: [
        {
          date: '2026-10-05',
          dayOfWeek: 'MONDAY',
          activities: [
            {
              activityId: 'act-1',
              category: 'Desarrollo Personal y Social',
              objective: 'Fomentar la motricidad fina y el agarre voluntario',
              description: 'Los lactantes exploran bloques suaves en tapete',
              durationMinutes: 20,
              materials: ['bloques suaves'],
              pdaReference: 'TUTORIA-PDA-0001',
              curricularTraceability: [
                {
                  pdaId: 'TUTORIA-PDA-0001',
                  catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
                },
              ],
              prospectiveObservationTarget: 'Sostiene el bloque con ambas manos',
              progression: {
                observationTarget: 'Pasa el objeto de una mano a otra',
              },
            },
          ],
          complementaryActivities: [],
          materials: ['bloques suaves'],
          evaluation: 'Los infantes respondieron activamente a la exploración',
          executionNotes: 'Actividad realizada en área central con supervisión',
          evaluationStatus: 'APPROVED',
          evaluationSubmittedAt: { seconds: 1791205200, nanoseconds: 0 },
          evaluationSubmittedBy: 'teacher-parity-1',
          evaluationReviewedAt: { seconds: 1791208800, nanoseconds: 0 },
          evaluationReviewedBy: 'director-ceci',
          evaluationDirectorComment: 'Excelente redacción narrativa pedagógica',
          evaluationHistory: [
            {
              evaluation: 'Primer borrador enviado',
              submittedAt: { seconds: 1791202000, nanoseconds: 0 },
              submittedBy: 'teacher-parity-1',
              status: 'CHANGES_REQUESTED',
              directorComment: 'Favor de precisar la interacción en tapete',
              reviewedAt: { seconds: 1791204000, nanoseconds: 0 },
              reviewedBy: 'director-ceci',
            },
          ],
          teacherReviewedAt: { seconds: 1791198000, nanoseconds: 0 },
          evaluationConfirmedAt: { seconds: 1791210000, nanoseconds: 0 },
        },
      ],
    };

    // Snapshot deep copy to prove source immutability
    const snapshotCopy = JSON.parse(JSON.stringify(persistedFixture));

    const domain = repo.deserialize(persistedFixture);

    // 1. Planning Identity & Context
    expect(domain.planningId).toBe('plan-parity-100');
    expect(domain.daycareId).toBe('daycare-parity-1');
    expect(domain.roomId).toBe('lactantes-a');
    expect(domain.teacherId).toBe('teacher-parity-1');
    expect(domain.weekStart).toBe('2026-10-05');
    expect(domain.weekEnd).toBe('2026-10-09');
    expect(domain.status).toBe('APPROVED');
    expect(domain.version).toBe(4);
    expect(domain.observations).toBe('Parity test initial observations');
    expect(domain.identifiedNeeds).toBe('Parity test identified needs');
    expect(domain.specialSituations).toBe('Room adaptation note');
    expect(domain.availableMaterials).toBe('Plastic rings and blocks');
    expect(domain.curricularReferences).toEqual(['PEP2017-SEP']);

    // 2. Closure and Approval fields
    expect(domain.approvedBy).toBe('director-ceci');
    expect(domain.approvedAt).toEqual(new Date(1791201600 * 1000));
    expect(domain.closedBy).toBe('director-ceci');
    expect(domain.closedAt).toEqual(new Date(1791288000 * 1000));

    // 3. Review History
    expect(domain.reviewHistory).toHaveLength(1);
    expect(domain.reviewHistory[0]?.reason).toBe('Initial round adjustments');
    expect(domain.reviewHistory[0]?.rejectedBy).toBe('director-ceci');
    expect(domain.reviewHistory[0]?.rejectedAt).toEqual(new Date(1791115200 * 1000));

    // 4. Days and Evaluation-relevant fields
    expect(domain.days).toHaveLength(1);
    const monday = domain.days[0]!;
    expect(monday.date).toBe('2026-10-05');
    expect(monday.dayOfWeek).toBe('MONDAY');
    expect(monday.evaluation).toBe('Los infantes respondieron activamente a la exploración');
    expect(monday.executionNotes).toBe('Actividad realizada en área central con supervisión');
    expect(monday.evaluationStatus).toBe('APPROVED');
    expect(monday.evaluationSubmittedAt).toEqual(new Date(1791205200 * 1000));
    expect(monday.evaluationSubmittedBy).toBe('teacher-parity-1');
    expect(monday.evaluationReviewedAt).toEqual(new Date(1791208800 * 1000));
    expect(monday.evaluationReviewedBy).toBe('director-ceci');
    expect(monday.evaluationDirectorComment).toBe('Excelente redacción narrativa pedagógica');
    expect(monday.teacherReviewedAt).toEqual(new Date(1791198000 * 1000));
    expect(monday.evaluationConfirmedAt).toEqual(new Date(1791210000 * 1000));

    // 5. Evaluation History
    expect(monday.evaluationHistory).toHaveLength(1);
    const hist = monday.evaluationHistory![0]!;
    expect(hist.evaluation).toBe('Primer borrador enviado');
    expect(hist.submittedAt).toEqual(new Date(1791202000 * 1000));
    expect(hist.submittedBy).toBe('teacher-parity-1');
    expect(hist.status).toBe('CHANGES_REQUESTED');
    expect(hist.directorComment).toBe('Favor de precisar la interacción en tapete');
    expect(hist.reviewedAt).toEqual(new Date(1791204000 * 1000));
    expect(hist.reviewedBy).toBe('director-ceci');

    // 6. Activities & Pedagogical Tracing
    expect(monday.activities).toHaveLength(1);
    const act = monday.activities[0]!;
    expect(act.activityId).toBe('act-1');
    expect(act.category).toBe('Desarrollo Personal y Social');
    expect(act.objective).toBe('Fomentar la motricidad fina y el agarre voluntario');
    expect(act.description).toBe('Los lactantes exploran bloques suaves en tapete');
    expect(act.durationMinutes).toBe(20);
    expect(act.materials).toEqual(['bloques suaves']);
    expect(act.pdaReference).toBe('TUTORIA-PDA-0001');
    expect(act.curricularTraceability).toEqual([
      {
        pdaId: 'TUTORIA-PDA-0001',
        catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
      },
    ]);
    expect((act as any).prospectiveObservationTarget).toBe('Sostiene el bloque con ambas manos');
    expect((act as any).progression.observationTarget).toBe('Pasa el objeto de una mano a otra');

    // 7. Source Immutability
    expect(JSON.stringify(persistedFixture)).toBe(JSON.stringify(snapshotCopy));
  });

  it('missing optional evaluation and closure fields remain undefined (no fabrication)', () => {
    const repo = new FirestoreWeeklyPlanningAdminRepository();
    const minimalFixture: Record<string, unknown> = {
      planningId: 'plan-min-1',
      daycareId: 'daycare-1',
      roomId: 'room-1',
      teacherId: 'teacher-1',
      weekStart: '2026-10-05',
      weekEnd: '2026-10-09',
      status: 'APPROVED',
      observations: '',
      identifiedNeeds: '',
      days: [
        {
          date: '2026-10-05',
          dayOfWeek: 'MONDAY',
          activities: [],
          complementaryActivities: [],
          materials: [],
        },
      ],
    };

    const domain = repo.deserialize(minimalFixture);

    expect(domain.closedAt).toBeUndefined();
    expect(domain.closedBy).toBeUndefined();
    expect(domain.approvedAt).toBeUndefined();
    expect(domain.approvedBy).toBeUndefined();
    expect(domain.reviewHistory).toEqual([]);

    const monday = domain.days[0]!;
    expect(monday.evaluation).toBeUndefined();
    expect(monday.executionNotes).toBeUndefined();
    expect(monday.evaluationStatus).toBeUndefined();
    expect(monday.evaluationSubmittedAt).toBeUndefined();
    expect(monday.evaluationSubmittedBy).toBeUndefined();
    expect(monday.evaluationReviewedAt).toBeUndefined();
    expect(monday.evaluationReviewedBy).toBeUndefined();
    expect(monday.evaluationDirectorComment).toBeUndefined();
    expect(monday.evaluationHistory).toBeUndefined();
    expect(monday.teacherReviewedAt).toBeUndefined();
    expect(monday.evaluationConfirmedAt).toBeUndefined();
  });

  it('fails safely with descriptive errors on malformed critical persisted dates', () => {
    const repo = new FirestoreWeeklyPlanningAdminRepository();

    const malformedReviewHistory = {
      planningId: 'plan-err-1',
      daycareId: 'daycare-1',
      roomId: 'room-1',
      teacherId: 'teacher-1',
      weekStart: '2026-10-05',
      weekEnd: '2026-10-09',
      reviewHistory: [
        {
          reason: 'Correction',
          rejectedBy: 'dir-1',
          rejectedAt: 'not-a-valid-date-string',
        },
      ],
    };

    expect(() => repo.deserialize(malformedReviewHistory)).toThrow(
      'Invalid date string/number: "not-a-valid-date-string"'
    );

    const malformedEvaluationHistory = {
      planningId: 'plan-err-2',
      daycareId: 'daycare-1',
      roomId: 'room-1',
      teacherId: 'teacher-1',
      weekStart: '2026-10-05',
      weekEnd: '2026-10-09',
      days: [
        {
          date: '2026-10-05',
          dayOfWeek: 'MONDAY',
          evaluationHistory: [
            {
              evaluation: 'text',
              submittedAt: 'totally-invalid-timestamp',
            },
          ],
        },
      ],
    };

    expect(() => repo.deserialize(malformedEvaluationHistory)).toThrow(
      'Invalid date string/number: "totally-invalid-timestamp"'
    );
  });
});
