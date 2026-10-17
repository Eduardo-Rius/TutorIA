import { WeeklyPlanning, DirectorDraftObservation } from '../../domain/planning/WeeklyPlanning';

export interface WeeklyPlanningRepository {
  save(planning: WeeklyPlanning): Promise<void>;
  findById(planningId: string): Promise<WeeklyPlanning | null>;
  listByTeacher(teacherId: string, daycareId?: string): Promise<WeeklyPlanning[]>;
  listInReview(daycareId?: string): Promise<WeeklyPlanning[]>;
  listApproved(daycareId?: string): Promise<WeeklyPlanning[]>;
  listClosed(daycareId?: string): Promise<WeeklyPlanning[]>;

  // SR-MD-21 Phase 2 & 2B: Private Director Draft Observations & Atomic Publication
  saveDraftObservation?(planningId: string, draft: DirectorDraftObservation): Promise<void>;
  listDraftObservations?(planningId: string, directorId?: string): Promise<DirectorDraftObservation[]>;
  deleteDraftObservation?(planningId: string, activityId: string): Promise<void>;
  clearDraftObservations?(planningId: string): Promise<void>;
  savePlanningAndClearDrafts?(planning: WeeklyPlanning): Promise<void>;
}
