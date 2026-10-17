import { WeeklyPlanning, PlanningDay, WeeklyContextSnapshot, ComplementaryProgramActivity, PrioritizedPractice, DirectorDraftObservation } from '../../domain/planning/WeeklyPlanning';
import { WeeklyPlanningRepository } from '../ports/WeeklyPlanningRepository';
import { RoomCatalog } from '../../domain/planning/RoomCatalog';

export type PlanningActorRole = 'TEACHER' | 'DIRECTOR' | 'SUPERVISOR';

export class PlanningWorkflowService {
  constructor(private readonly repository: WeeklyPlanningRepository) {}

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

  public async setDayComplementaryActivities(
    planningId: string,
    dayId: string,
    activities: readonly ComplementaryProgramActivity[],
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can edit complementary activities");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.setDayComplementaryActivities(dayId, activities);
    await this.repository.save(planning);
  }

  public async setDayPrioritizedPractices(
    planningId: string,
    dayId: string,
    practices: readonly PrioritizedPractice[],
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can edit prioritized practices");

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.setDayPrioritizedPractices(dayId, practices);
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

    if (planning.status !== 'IN_REVIEW') {
      throw new Error(`Cannot reject planning in status: ${planning.status}`);
    }

    if (granularObs && Array.isArray(granularObs)) {
      for (const obs of granularObs) {
        const targetId = obs.targetId;
        if (!targetId) {
          throw new Error('Observation targetId is required');
        }
        const activityExists = planning.days?.some(d =>
          (d.activities || []).some(a => a.activityId === targetId)
        );
        if (!activityExists) {
          throw new Error(`Activity '${targetId}' does not belong to planning '${planningId}'`);
        }
      }
    }

    planning.reject(reason, rejectedBy, granularObs);

    if (this.repository.savePlanningAndClearDrafts) {
      await this.repository.savePlanningAndClearDrafts(planning);
    } else {
      await this.repository.save(planning);
      if (this.repository.clearDraftObservations) {
        await this.repository.clearDraftObservations(planningId);
      }
    }
  }

  // SR-MD-21 Phase 2: Private Director Draft Observations
  public async saveDirectorDraftObservation(
    planningId: string,
    activityId: string,
    observation: string,
    directorId: string,
    role: PlanningActorRole,
    dayOfWeek?: string
  ): Promise<void> {
    if (role !== 'DIRECTOR') throw new Error('Only Director can save draft observations');
    if (!observation || !observation.trim()) throw new Error('Observation text cannot be empty');

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error(`WeeklyPlanning not found: ${planningId}`);

    if (planning.status !== 'IN_REVIEW') {
      throw new Error(`Cannot save draft observations when planning is in status: ${planning.status}`);
    }

    const activityExists = planning.days?.some(d =>
      (d.activities || []).some(a => a.activityId === activityId)
    );
    if (!activityExists) {
      throw new Error(`Activity '${activityId}' does not belong to planning '${planningId}'`);
    }

    if (dayOfWeek) {
      const targetDay = planning.days?.find(d => d.dayOfWeek === dayOfWeek || d.date === dayOfWeek);
      if (targetDay && !(targetDay.activities || []).some(a => a.activityId === activityId)) {
        throw new Error(`Activity '${activityId}' does not belong to day '${dayOfWeek}' in planning '${planningId}'`);
      }
    }

    const draft: DirectorDraftObservation = {
      activityId,
      observation: observation.trim(),
      dayOfWeek,
      createdBy: directorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.repository.saveDraftObservation) {
      await this.repository.saveDraftObservation(planningId, draft);
    }
  }

  public async listDirectorDraftObservations(
    planningId: string,
    directorId: string,
    role: PlanningActorRole
  ): Promise<DirectorDraftObservation[]> {
    if (role !== 'DIRECTOR') throw new Error('Only Director can list draft observations');
    if (this.repository.listDraftObservations) {
      return this.repository.listDraftObservations(planningId, directorId);
    }
    return [];
  }

  public async deleteDirectorDraftObservation(
    planningId: string,
    activityId: string,
    directorId: string,
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== 'DIRECTOR') throw new Error('Only Director can delete draft observations');
    if (this.repository.deleteDraftObservation) {
      await this.repository.deleteDraftObservation(planningId, activityId);
    }
  }

  public async clearDirectorDraftObservations(
    planningId: string,
    role: PlanningActorRole
  ): Promise<void> {
    if (role !== 'DIRECTOR') throw new Error('Only Director can clear draft observations');
    if (this.repository.clearDraftObservations) {
      await this.repository.clearDraftObservations(planningId);
    }
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

  public async markTeacherDayReviewed(
    planningId: string,
    dayOfWeekOrDate: string,
    role: PlanningActorRole,
    teacherId: string,
    reviewedAt?: Date,
    currentDays?: PlanningDay[]
  ): Promise<void> {
    if (role !== "TEACHER") {
      throw new Error("Only Teacher can mark a planning day as reviewed");
    }
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Teacher review requires an educator identity");
    }
    const planning = await this.repository.findById(planningId);
    if (!planning) {
      throw new Error(`WeeklyPlanning not found: ${planningId}`);
    }

    if (currentDays && currentDays.length === 5) {
      planning.editPedagogicalContent(
        planning.observations,
        planning.identifiedNeeds,
        planning.specialSituations,
        planning.availableMaterials,
        planning.curricularReferences,
        currentDays,
        planning.originalContext
      );
    }

    planning.markTeacherDayReviewed(dayOfWeekOrDate, teacherId, reviewedAt);
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

  public async listTeacherPlanning(teacherId: string, daycareId?: string): Promise<WeeklyPlanning[]> {
    return this.repository.listByTeacher(teacherId, daycareId);
  }

  public async listDirectorReviewQueue(role: PlanningActorRole, daycareId?: string): Promise<WeeklyPlanning[]> {
    if (role !== 'DIRECTOR') throw new Error('Unauthorized');
    return this.repository.listInReview(daycareId);
  }

  public async listSupervisorApprovedPlanning(role: PlanningActorRole, daycareId?: string): Promise<WeeklyPlanning[]> {
    if (role !== 'SUPERVISOR' && role !== 'DIRECTOR') throw new Error('Unauthorized');
    return this.repository.listApproved(daycareId);
  }

  public async listSupervisorClosedPlanning(role: PlanningActorRole, daycareId?: string): Promise<WeeklyPlanning[]> {
    if (role !== 'SUPERVISOR') throw new Error('Unauthorized');
    return this.repository.listClosed(daycareId);
  }
  public async confirmDailyEvaluation(
    planningId: string,
    dayOfWeekOrDate: string,
    role: PlanningActorRole,
    teacherId: string,
    confirmedAt: Date = new Date(),
    currentDate?: string
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can confirm daily evaluation");
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.confirmDailyEvaluation(dayOfWeekOrDate, teacherId.trim(), confirmedAt, currentDate);
    await this.repository.save(planning);
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

  public async confirmAndSubmitDailyEvaluation(
    planningId: string,
    dayOfWeekOrDate: string,
    evaluation: string,
    role: PlanningActorRole,
    currentDate?: string,
    teacherId?: string,
    confirmedAt: Date = new Date()
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can submit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.confirmAndSubmitDailyEvaluation(dayOfWeekOrDate, evaluation, teacherId.trim(), currentDate, confirmedAt);
    await this.repository.save(planning);
  }

  public async confirmAndResubmitDailyEvaluation(
    planningId: string,
    dayOfWeekOrDate: string,
    evaluation: string,
    role: PlanningActorRole,
    currentDate?: string,
    teacherId?: string,
    confirmedAt: Date = new Date()
  ): Promise<void> {
    if (role !== "TEACHER") throw new Error("Only Teacher can resubmit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }

    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");

    planning.confirmAndResubmitDailyEvaluation(dayOfWeekOrDate, evaluation, teacherId.trim(), currentDate, confirmedAt);
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
