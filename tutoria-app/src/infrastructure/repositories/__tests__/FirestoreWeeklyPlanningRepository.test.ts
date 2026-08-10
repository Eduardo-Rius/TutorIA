import { describe, it, expect, vi } from 'vitest';
import { FirestoreWeeklyPlanningRepository } from '../FirestoreWeeklyPlanningRepository';
import { WeeklyPlanning, PlanningDay } from '../../../domain/planning/WeeklyPlanning';
import { Timestamp } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  Timestamp: class Timestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    static fromDate(d: Date) { return new Timestamp(d.getTime() / 1000, 0); }
    toDate() { return new Date(this.seconds * 1000); }
  },
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('../../firebase/firebaseConfig', () => ({
  db: {},
}));

describe('FirestoreWeeklyPlanningRepository Serialization', () => {
  const repo = new FirestoreWeeklyPlanningRepository();

  it('1. Complete 5x5 planning serializes correctly', () => {
    const planning = WeeklyPlanning.create('p1', 'd1', 'r1', 't1', '2023-10-01', '2023-10-05');
    const days: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(dayOfWeek => ({
      date: '2023-10-01',
      dayOfWeek: dayOfWeek as PlanningDay['dayOfWeek'],
      activities: Array.from({ length: 5 }).map((_, i) => ({
        activityId: `a${i}`,
        category: 'Cat',
        objective: 'Obj',
        description: 'Desc',
        materials: ['Mat1'],
        durationMinutes: 15,
        curricularTraceability: ['Trace1']
      })),
      complementaryActivities: [],
      materials: ['Mat1']
    }));

    planning.editPedagogicalContent('Obs', 'Needs', ['Ref1'], days);
    // Add a review history record
    planning.submit();
    planning.reject('Needs more details', 'director1');

    const serialized = repo.serialize(planning);

    expect(serialized.planningId).toBe('p1');
    expect(serialized.status).toBe('REJECTED');
    expect(serialized.days.length).toBe(5);
    expect(serialized.days[0].activities.length).toBe(5);
    expect(serialized.version).toBe(2);
    expect(serialized.reviewHistory).toHaveLength(1);
    expect(serialized.reviewHistory[0].reason).toBe('Needs more details');
    expect(serialized.reviewHistory[0].rejectedAt).toBeInstanceOf(Timestamp);
  });

  it('2. Serialized planning deserializes correctly', () => {
    const now = new Date();
    const data = {
      planningId: 'p2',
      daycareId: 'd2',
      roomId: 'r2',
      teacherId: 't2',
      weekStart: 'start',
      weekEnd: 'end',
      status: 'APPROVED',
      observations: 'Obs',
      identifiedNeeds: 'Needs',
      curricularReferences: ['Ref'],
      days: [],
      version: 3,
      reviewHistory: [
        {
          reason: 'Typo',
          rejectedBy: 'dir',
          rejectedAt: Timestamp.fromDate(now)
        }
      ]
    };

    const deserialized = repo.deserialize(data) as WeeklyPlanning;

    expect(deserialized).toBeInstanceOf(WeeklyPlanning);
    expect(deserialized.planningId).toBe('p2');
    expect(deserialized.status).toBe('APPROVED');
    expect(deserialized.version).toBe(3);
    expect(deserialized.reviewHistory).toHaveLength(1);
    expect(deserialized.reviewHistory![0]!.rejectedAt.getTime()).toBe(now.getTime());
  });

  it('3. Round-trip preserves exact pedagogical content', () => {
    const original = WeeklyPlanning.create('p3', 'd3', 'r3', 't3', 'start', 'end');
    original.observations = "Keep it simple";
    original.status = 'IN_REVIEW';

    const serialized = repo.serialize(original);
    const roundTripped = repo.deserialize(serialized) as WeeklyPlanning;

    expect(roundTripped.planningId).toBe(original.planningId);
    expect(roundTripped.observations).toBe(original.observations);
    expect(roundTripped.status).toBe(original.status);
    expect(roundTripped.version).toBe(original.version);
    expect(roundTripped.days).toEqual(original.days);
  });

  it('4. Repository fetch of missing ID returns null', async () => {
    // We would need to mock getDoc to test the full findById method.
    // For now, we can verify that the contract expects null for missing data.
    // Since getDoc is mocked at module level, let's just assert the contract logic.
    // Actually, let's mock getDoc here.
    const { getDoc } = await import('firebase/firestore');
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    } as never);

    const result = await repo.findById('missing-id');
    expect(result).toBeNull();
  });
});
