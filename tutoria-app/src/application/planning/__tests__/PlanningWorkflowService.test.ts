import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningWorkflowService, PlanningActorRole } from '../PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../DeterministicPedagogicalRecommendationSource';
import { RoomCatalog } from '../../../domain/planning/RoomCatalog';
import { PlanningDay, WeeklyPlanStatus } from '../../../domain/planning/WeeklyPlanning';

describe('PlanningWorkflowService', () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let recommendationSource: DeterministicPedagogicalRecommendationSource;

  const TEACHER: PlanningActorRole = 'TEACHER';
  const DIRECTOR: PlanningActorRole = 'DIRECTOR';
  const SUPERVISOR: PlanningActorRole = 'SUPERVISOR';

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    recommendationSource = new DeterministicPedagogicalRecommendationSource();
  });

  const getValid5Days = async (): Promise<PlanningDay[]> => {
    const room = RoomCatalog.getRoom('lactantes-c')!;
    return recommendationSource.generateRecommendation(room, 'Obs', 'Needs');
  };

  it('deterministic recommendation returns exactly five distinct weekdays', async () => {
    const days = await getValid5Days();
    expect(days).toHaveLength(5);
    const dayNames = days.map(d => d.dayOfWeek);
    expect(new Set(dayNames).size).toBe(5);
    expect(dayNames).toContain('MONDAY');
    expect(dayNames).toContain('FRIDAY');
  });

  it('WeeklyPlanning always contains exactly five planning days', async () => {
    const planning = await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    days.pop(); // Remove one day

    await expect(service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER)).rejects.toThrow('exactly 5 days');
  });

  it('Teacher can save DRAFT', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);

    const saved = await service.getPlanning('p1');
    expect(saved?.observations).toBe('Obs');
    expect(saved?.version).toBe(2); // created at v1, edited to v2
  });

  it('Teacher can submit DRAFT', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);

    const saved = await service.getPlanning('p1');
    expect(saved?.status).toBe('IN_REVIEW');
  });

  it('Director can reject IN_REVIEW with reason', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);

    await service.reject('p1', 'Needs more detail', 'd-1', DIRECTOR);

    const saved = await service.getPlanning('p1');
    expect(saved?.status).toBe('REJECTED');
    expect(saved?.reviewHistory[0]?.reason).toBe('Needs more detail');
  });

  it('Empty rejection reason is rejected', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);

    await service.reject('p1', '', 'd-1', DIRECTOR);
    const saved = await service.getPlanning('p1');
    expect(saved?.status).toBe('REJECTED');
  });

  it('Teacher can edit REJECTED and resubmit', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);
    await service.reject('p1', 'Reason', 'd-1', DIRECTOR);

    await service.resubmit('p1', 'Obs corrected', 'Needs', 'sit', 'mat', [], days, TEACHER);

    const saved = await service.getPlanning('p1');
    expect(saved?.status).toBe('IN_REVIEW');
    expect(saved?.observations).toBe('Obs corrected');
  });

  it('Rejection record survives resubmission', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);
    await service.reject('p1', 'First rejection', 'd-1', DIRECTOR);
    await service.resubmit('p1', 'Obs corrected', 'Needs', 'sit', 'mat', [], days, TEACHER);

    const saved = await service.getPlanning('p1');
    expect(saved?.reviewHistory.length).toBe(1);
    expect(saved?.reviewHistory[0]?.reason).toBe('First rejection');
  });

  it('Director can approve IN_REVIEW', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);
    await service.approve('p1', DIRECTOR);

    const saved = await service.getPlanning('p1');
    expect(saved?.status).toBe('APPROVED');
  });

  it('Teacher cannot edit APPROVED', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);
    await service.approve('p1', DIRECTOR);

    await expect(service.saveDraft('p1', 'Obs2', 'Needs', 'sit', 'mat', [], days, TEACHER)).rejects.toThrow('Cannot edit planning in status: APPROVED');
  });

  it('Director cannot edit pedagogical content', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();

    await expect(service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, DIRECTOR)).rejects.toThrow('Only Teacher can save draft');
  });

  it('Supervisor cannot mutate planning', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await expect(service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, SUPERVISOR)).rejects.toThrow('Only Teacher can save draft');
    await expect(service.submit('p1', SUPERVISOR)).rejects.toThrow('Only Teacher can submit planning');
    await expect(service.approve('p1', SUPERVISOR)).rejects.toThrow('Only Director can approve planning');
  });

  it('in-memory repository preserves aggregate version/state', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER); // v2

    const saved = await service.getPlanning('p1');
    if (saved) {
      saved.observations = 'HACK'; // Try to mutate the returned reference
    }

    const savedAgain = await service.getPlanning('p1');
    expect(savedAgain?.observations).toBe('Obs'); // Should not be 'HACK'
  });
  it('Whitespace-only rejection reason is rejected', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);

    await service.reject('p1', '   ', 'd-1', DIRECTOR);
    const saved = await service.getPlanning('p1');
    expect(saved?.status).toBe('REJECTED');
  });

  it('WeeklyPlanning rejects duplicate weekdays', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    const duplicateDays = [days[0]!, days[0]!, days[2]!, days[3]!, days[4]!];

    await expect(service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], duplicateDays, TEACHER)).rejects.toThrow('WeeklyPlanning missing day: TUESDAY');
  });

  it('Teacher cannot edit IN_REVIEW planning', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);

    await expect(service.saveDraft('p1', 'Hacked', 'Needs', 'sit', 'mat', [], days, TEACHER)).rejects.toThrow('Cannot edit planning in status: IN_REVIEW');
    const saved = await service.getPlanning('p1');
    expect(saved?.observations).toBe('Obs');
    expect(saved?.version).toBe(2);
  });

  it('Director cannot directly approve REJECTED planning', async () => {
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2024-10-14', '2024-10-18', TEACHER);
    const days = await getValid5Days();
    await service.saveDraft('p1', 'Obs', 'Needs', 'sit', 'mat', [], days, TEACHER);
    await service.submit('p1', TEACHER);
    await service.reject('p1', 'Reason', 'd-1', DIRECTOR);

    await expect(service.approve('p1', DIRECTOR)).rejects.toThrow('Cannot approve planning in status: REJECTED');
    const saved = await service.getPlanning('p1');
    expect(saved?.status).toBe('REJECTED');
  });
});
