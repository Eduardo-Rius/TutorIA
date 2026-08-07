import { WeeklyPlanning, PlanningDay } from '../../domain/planning/WeeklyPlanning';
import { InMemoryWeeklyPlanningRepository } from '../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { RoomCatalog } from '../../domain/planning/RoomCatalog';

export type PlanningActorRole = 'TEACHER' | 'DIRECTOR' | 'SUPERVISOR';

export class PlanningWorkflowService {
  constructor(private readonly repository: InMemoryWeeklyPlanningRepository) {}

  public async createPlanning(
    planningId: string,
    daycareId: string,
    roomId: string,
    teacherId: string,
    weekStart: string,
    weekEnd: string,
    role: PlanningActorRole
  ): Promise<WeeklyPlanning> {
    if (role !== 'TEACHER') throw new Error('Only Teacher can create planning');

    const room = RoomCatalog.getRoom(roomId);
    if (!room) throw new Error('Invalid room');

    const planning = WeeklyPlanning.create(planningId, daycareId, roomId, teacherId, weekStart, weekEnd);
    await this.repository.save(planning);
    return planning;
  }

  public async saveDraft(
    planningId: string,
    observations: string,
    identifiedNeeds: string,
    curricularReferences: string[],
    days: PlanningDay[],
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== 'TEACHER') throw new Error('Only Teacher can save draft');

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.editPedagogicalContent(observations, identifiedNeeds, curricularReferences, days);
    await this.repository.save(planning);
  }

  public async submit(planningId: string, role: PlanningActorRole): Promise<void> {
    if (role !== 'TEACHER') {throw new Error('Only Teacher can submit planning');}

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.submit();
    await this.repository.save(planning);
  }

  public async reject(planningId: string, reason: string, rejectedBy: string, role: PlanningActorRole): Promise<void> {
    if (role !== 'DIRECTOR') throw new Error('Only Director can reject planning');

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.reject(reason, rejectedBy);
    await this.repository.save(planning);
  }

  public async resubmit(
    planningId: string,
    observations: string,
    identifiedNeeds: string,
    curricularReferences: string[],
    days: PlanningDay[],
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== 'TEACHER') throw new Error('Only Teacher can resubmit planning');

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    // Editing while in REJECTED state is allowed before submit
    planning.editPedagogicalContent(observations, identifiedNeeds, curricularReferences, days);
    planning.submit();
    await this.repository.save(planning);
  }

  public async approve(planningId: string, role: PlanningActorRole): Promise<void> {
    if (role !== 'DIRECTOR') {throw new Error('Only Director can approve planning');}

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.approve();
    await this.repository.save(planning);
  }

  public async getPlanning(planningId: string): Promise<WeeklyPlanning | null> {
    return this.repository.findById(planningId);
  }

  public async listTeacherPlanning(teacherId: string): Promise<WeeklyPlanning[]> {
    return this.repository.listByTeacher(teacherId);
  }

  public async listDirectorReviewQueue(role: PlanningActorRole): Promise<WeeklyPlanning[]> {
    if (role !== 'DIRECTOR') throw new Error('Unauthorized');
    return this.repository.listInReview();
  }

  public async listSupervisorApprovedPlanning(role: PlanningActorRole): Promise<WeeklyPlanning[]> {
    if (role !== 'SUPERVISOR') throw new Error('Unauthorized');
    return this.repository.listApproved();
  }
}
