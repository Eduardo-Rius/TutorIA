import { WeeklyPlanning, DirectorDraftObservation } from "../../domain/planning/WeeklyPlanning";
import { WeeklyPlanningRepository } from "../../application/ports/WeeklyPlanningRepository";

export class InMemoryWeeklyPlanningRepository implements WeeklyPlanningRepository {
  private data: Map<string, WeeklyPlanning> = new Map();
  private draftObservations: Map<string, Map<string, DirectorDraftObservation>> = new Map();

  private hydrate(serialized: string): WeeklyPlanning {
    const parsed = JSON.parse(serialized);
    if (parsed.approvedAt) parsed.approvedAt = new Date(parsed.approvedAt);
    if (parsed.closedAt) parsed.closedAt = new Date(parsed.closedAt);
    const clone = Object.assign(
      WeeklyPlanning.create("", "", "", "", "", ""),
      parsed
    );
    clone.assertValidCurricularInvariants();
    clone.assertValidComplementaryInvariants();
    clone.assertValidPrioritizedPracticeInvariants();
    return clone;
  }

  public async save(planning: WeeklyPlanning): Promise<void> {
    planning.assertValidCurricularInvariants();
    planning.assertValidComplementaryInvariants();
    planning.assertValidPrioritizedPracticeInvariants();
    // Clone to ensure no reference modification outside repo
    const serialized = JSON.stringify(planning);
    const clone = this.hydrate(serialized);
    this.data.set(planning.planningId, clone);
  }

  public async findById(planningId: string): Promise<WeeklyPlanning | null> {
    const existing = this.data.get(planningId);
    if (!existing) return null;
    const serialized = JSON.stringify(existing);
    return this.hydrate(serialized);
  }

  public async listByTeacher(teacherId: string, daycareId?: string): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => p.teacherId === teacherId && (!daycareId || p.daycareId === daycareId))
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }

  public async listInReview(daycareId?: string): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => p.status === "IN_REVIEW" && (!daycareId || p.daycareId === daycareId))
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }

  public async listApproved(daycareId?: string): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => (p.status === "APPROVED" || p.status === "APPROVED_FOR_EXECUTION" || p.status === "CLOSED") && (!daycareId || p.daycareId === daycareId))
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }

  public async listClosed(daycareId?: string): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => p.status === "CLOSED" && (!daycareId || p.daycareId === daycareId))
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }

  // SR-MD-21 Phase 2: Private Director Draft Observations
  public async saveDraftObservation(planningId: string, draft: DirectorDraftObservation): Promise<void> {
    if (!this.draftObservations.has(planningId)) {
      this.draftObservations.set(planningId, new Map());
    }
    const planDrafts = this.draftObservations.get(planningId)!;
    planDrafts.set(draft.activityId, {
      ...draft,
      createdAt: new Date(draft.createdAt || Date.now()),
      updatedAt: new Date(draft.updatedAt || Date.now()),
    });
  }

  public async listDraftObservations(planningId: string, directorId?: string): Promise<DirectorDraftObservation[]> {
    const planDrafts = this.draftObservations.get(planningId);
    if (!planDrafts) return [];
    return Array.from(planDrafts.values())
      .filter(d => !directorId || d.createdBy === directorId)
      .map(d => ({
        ...d,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      }));
  }

  public async deleteDraftObservation(planningId: string, activityId: string): Promise<void> {
    const planDrafts = this.draftObservations.get(planningId);
    if (planDrafts) {
      planDrafts.delete(activityId);
    }
  }

  public async clearDraftObservations(planningId: string): Promise<void> {
    this.draftObservations.delete(planningId);
  }

  public async savePlanningAndClearDrafts(planning: WeeklyPlanning): Promise<void> {
    await this.save(planning);
    await this.clearDraftObservations(planning.planningId);
  }
}
