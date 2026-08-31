import { WeeklyPlanning, PlanningDay, WeeklyContextSnapshot } from '../../domain/planning/WeeklyPlanning';
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
    specialSituations: string,
    availableMaterials: string,
    curricularReferences: string[],
    days: PlanningDay[],
    role: PlanningActorRole,
    originalContext?: WeeklyContextSnapshot
  ): Promise<void> {
    if (role !== 'TEACHER') throw new Error('Only Teacher can save draft');

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.editPedagogicalContent(observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, days, originalContext);
    await this.repository.save(planning);
  }

  public async updateWeeklyContext(
    planningId: string,
    observations: string,
    identifiedNeeds: string,
    specialSituations: string,
    availableMaterials: string,
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can edit weekly context");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.updateWeeklyContext(observations, identifiedNeeds, specialSituations, availableMaterials);
    await this.repository.save(planning);
  }

  public async submit(planningId: string, role: PlanningActorRole): Promise<void> {
    if (role !== 'TEACHER') {throw new Error('Only Teacher can submit planning');}

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.submit();
    await this.repository.save(planning);
  }

  public async reject(planningId: string, reason: string, rejectedBy: string, role: PlanningActorRole, granularObs?: any[]): Promise<void> {
    if (role !== 'DIRECTOR') throw new Error('Only Director can reject planning');

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.reject(reason, rejectedBy, granularObs);
    await this.repository.save(planning);
  }

  public async resubmit(
    planningId: string,
    observations: string,
    identifiedNeeds: string,
    specialSituations: string,
    availableMaterials: string,
    curricularReferences: string[],
    days: PlanningDay[],
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== 'TEACHER') throw new Error('Only Teacher can resubmit planning');

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    // Editing while in REJECTED state is allowed before submit
    planning.editPedagogicalContent(observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, days);
    planning.submit();
    await this.repository.save(planning);
  }

  public async resolveGranularObservation(planningId: string, targetId: string, role: PlanningActorRole, resolvedBy: string): Promise<void> {
    if (role !== 'DIRECTOR') throw new Error('Only Director can resolve observations');
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');
    planning.resolveGranularObservation(targetId, resolvedBy);
    await this.repository.save(planning);
  }

  public async markDirectorDayReviewed(
    planningId: string,
    dayOfWeek: PlanningDay["dayOfWeek"],
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== "DIRECTOR") throw new Error("Only Director can mark day as reviewed");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.markDirectorDayReviewed(dayOfWeek);
    await this.repository.save(planning);
  }

  public async approve(planningId: string, role: PlanningActorRole, approvedBy: string): Promise<void> {
    if (role !== 'DIRECTOR') {throw new Error('Only Director can approve planning');}

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error('Planning not found');

    planning.approve(approvedBy);
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
    if (role !== 'SUPERVISOR' && role !== 'DIRECTOR') throw new Error('Unauthorized');
    return this.repository.listApproved();
  }

  public async listSupervisorClosedPlanning(role: PlanningActorRole): Promise<WeeklyPlanning[]> {
    if (role !== 'SUPERVISOR') throw new Error('Unauthorized');
    return this.repository.listClosed();
  }
  public async saveDailyEvaluationDraft(
    planningId: string,
    dayOfWeekOrDate: string,
    evaluation: string,
    role: PlanningActorRole,
    currentDate?: string,
    teacherId?: string
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can save daily evaluation draft");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.saveDailyEvaluationDraft(dayOfWeekOrDate, evaluation, currentDate, teacherId);
    await this.repository.save(planning);
  }

  public async submitDailyEvaluation(
    planningId: string,
    dayOfWeekOrDate: string,
    evaluation: string,
    role: PlanningActorRole,
    currentDate?: string,
    teacherId?: string
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can submit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.submitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId);
    await this.repository.save(planning);
  }

  public async resubmitDailyEvaluation(
    planningId: string,
    dayOfWeekOrDate: string,
    evaluation: string,
    role: PlanningActorRole,
    currentDate?: string,
    teacherId?: string
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can resubmit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.resubmitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId);
    await this.repository.save(planning);
  }

  public async approveDailyEvaluation(
    planningId: string,
    dayOfWeekOrDate: string,
    role: PlanningActorRole,
    directorId: string = "Ceci"
  ): Promise<void> {
    if (role !== "DIRECTOR") throw new Error("Only Director can approve daily evaluation");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.approveDailyEvaluation(dayOfWeekOrDate, directorId);
    await this.repository.save(planning);
  }

  public async requestDailyEvaluationChange(
    planningId: string,
    dayOfWeekOrDate: string,
    comment: string,
    role: PlanningActorRole,
    directorId: string = "Ceci"
  ): Promise<void> {
    if (role !== "DIRECTOR") throw new Error("Only Director can request changes to daily evaluation");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.requestDailyEvaluationChange(dayOfWeekOrDate, comment, directorId);
    await this.repository.save(planning);
  }

  public async saveDailyEvaluation(
    planningId: string,
    dayOfWeekOrDate: string,
    evaluation: string,
    role: PlanningActorRole,
    currentDate?: string
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can record daily evaluation");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }
    planning.saveDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate);
    await this.repository.save(planning);
  }

  public async closeWeek(
    planningId: string,
    role: PlanningActorRole,
    directorId: string = "Ceci",
    closedAt: Date = new Date()
  ): Promise<void> {
    if (role !== "DIRECTOR") throw new Error("Only Director can formally close the week");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.closeWeek(directorId, closedAt);
    await this.repository.save(planning);
  }
}
