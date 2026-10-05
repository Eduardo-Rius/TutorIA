import { WeeklyPlanning } from '../../domain/planning/WeeklyPlanning';

export interface WeeklyPlanningRepository {
  save(planning: WeeklyPlanning): Promise<void>;
  findById(planningId: string): Promise<WeeklyPlanning | null>;
  listByTeacher(teacherId: string): Promise<WeeklyPlanning[]>;
  listInReview(): Promise<WeeklyPlanning[]>;
  listApproved(): Promise<WeeklyPlanning[]>;
  listClosed(): Promise<WeeklyPlanning[]>;
}
