import { WeeklyPlanning } from "../../domain/planning/WeeklyPlanning";

export class InMemoryWeeklyPlanningRepository {
  private data: Map<string, WeeklyPlanning> = new Map();

  private hydrate(serialized: string): WeeklyPlanning {
    const clone = Object.assign(
      WeeklyPlanning.create("", "", "", "", "", ""),
      JSON.parse(serialized)
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

  public async listByTeacher(teacherId: string): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => p.teacherId === teacherId)
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }

  public async listInReview(): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => p.status === "IN_REVIEW")
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }

  public async listApproved(): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => p.status === "APPROVED" || p.status === "APPROVED_FOR_EXECUTION" || p.status === "CLOSED")
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }

  public async listClosed(): Promise<WeeklyPlanning[]> {
    return Array.from(this.data.values())
      .filter(p => p.status === "CLOSED")
      .map(p => {
        const serialized = JSON.stringify(p);
        return this.hydrate(serialized);
      });
  }
}
