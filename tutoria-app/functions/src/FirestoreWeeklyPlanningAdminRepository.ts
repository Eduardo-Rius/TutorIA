import type { Firestore } from 'firebase-admin/firestore';
import { getProductionFirestore } from './FirestoreCurricularAIAuthorizer';
import {
  WeeklyPlanning,
  WeeklyPlanStatus,
  PlanningDay,
  WeeklyContextSnapshot,
  GranularObservation,
  ReviewRound,
} from '../../src/domain/planning/WeeklyPlanning';
import type { WeeklyPlanningRepository } from '../../src/application/ports/WeeklyPlanningRepository';

// ============================================================================
// DATE CONVERSION HELPERS
// ============================================================================

export function toDateOrUndefined(val: unknown): Date | undefined {
  if (val === null || val === undefined) return undefined;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      throw new Error('Invalid Date found in document');
    }
    return val;
  }
  if (typeof val === 'object' && val !== null && typeof (val as any).toDate === 'function') {
    const d = (val as any).toDate();
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      throw new Error('Timestamp.toDate() produced invalid Date');
    }
    return d;
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val && typeof (val as any).seconds === 'number') {
    const seconds = (val as any).seconds;
    const nanoseconds = typeof (val as any).nanoseconds === 'number' ? (val as any).nanoseconds : 0;
    return new Date(seconds * 1000 + nanoseconds / 1000000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date string/number: "${val}"`);
    }
    return d;
  }
  throw new Error(`Cannot convert value of type "${typeof val}" to Date`);
}

export function toRequiredDate(val: unknown, fieldName: string): Date {
  const d = toDateOrUndefined(val);
  if (!d) {
    throw new Error(`Required date field "${fieldName}" is missing or undefined`);
  }
  return d;
}

// ============================================================================
// SERVER REPOSITORY OPTIONS
// ============================================================================

export type WeeklyPlanningDocReader = (
  planningId: string
) => Promise<Record<string, unknown> | null | undefined>;

export interface FirestoreWeeklyPlanningAdminRepositoryOptions {
  readonly db?: Firestore | undefined;
  readonly docReader?: WeeklyPlanningDocReader | undefined;
}

// ============================================================================
// ADMIN FIRESTORE REPOSITORY IMPLEMENTATION
// ============================================================================

export class FirestoreWeeklyPlanningAdminRepository implements WeeklyPlanningRepository {
  private readonly collectionName = 'weeklyPlannings';
  private readonly customDb?: Firestore | undefined;
  private readonly docReader?: WeeklyPlanningDocReader | undefined;

  constructor(options: FirestoreWeeklyPlanningAdminRepositoryOptions = {}) {
    this.customDb = options.db;
    this.docReader = options.docReader;
  }

  private getDb(): Firestore {
    return this.customDb ?? getProductionFirestore();
  }

  public async findById(planningId: string): Promise<WeeklyPlanning | null> {
    if (!planningId || typeof planningId !== 'string' || !planningId.trim()) {
      return null;
    }

    const cleanId = planningId.trim();

    if (this.docReader) {
      const data = await this.docReader(cleanId);
      if (!data) return null;
      return this.deserialize(data);
    }

    const db = this.getDb();
    const docSnap = await db.collection(this.collectionName).doc(cleanId).get();
    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data() as Record<string, unknown>;
    return this.deserialize(data);
  }

  public async save(_planning: WeeklyPlanning): Promise<void> {
    throw new Error(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. save() is unsupported.'
    );
  }

  public async listByTeacher(_teacherId: string): Promise<WeeklyPlanning[]> {
    throw new Error(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listByTeacher() is unsupported.'
    );
  }

  public async listInReview(): Promise<WeeklyPlanning[]> {
    throw new Error(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listInReview() is unsupported.'
    );
  }

  public async listApproved(): Promise<WeeklyPlanning[]> {
    throw new Error(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listApproved() is unsupported.'
    );
  }

  public async listClosed(): Promise<WeeklyPlanning[]> {
    throw new Error(
      'FirestoreWeeklyPlanningAdminRepository is strictly read-only for Evaluation AI. listClosed() is unsupported.'
    );
  }

  public serialize(planning: WeeklyPlanning): Record<string, unknown> {
    return {
      planningId: planning.planningId,
      daycareId: planning.daycareId,
      roomId: planning.roomId,
      teacherId: planning.teacherId,
      weekStart: planning.weekStart,
      weekEnd: planning.weekEnd,
      status: planning.status,
      observations: planning.observations,
      identifiedNeeds: planning.identifiedNeeds,
      specialSituations: planning.specialSituations ?? '',
      availableMaterials: planning.availableMaterials ?? '',
      curricularReferences: planning.curricularReferences,
      version: planning.version,
      ...(planning.closedBy !== undefined ? { closedBy: planning.closedBy } : {}),
      ...(planning.closedAt ? { closedAt: planning.closedAt } : {}),
      ...(planning.approvedBy !== undefined ? { approvedBy: planning.approvedBy } : {}),
      ...(planning.approvedAt ? { approvedAt: planning.approvedAt } : {}),
      ...(planning.originalContext !== undefined ? { originalContext: planning.originalContext } : {}),
      granularObservations: planning.granularObservations ?? [],
      historicalRounds: planning.historicalRounds ?? [],
      reviewHistory: planning.reviewHistory.map((record) => ({
        reason: record.reason,
        rejectedBy: record.rejectedBy,
        rejectedAt: record.rejectedAt,
      })),
      days: planning.days.map((day) => ({
        ...day,
      })),
    };
  }

  public deserialize(data: Record<string, unknown>): WeeklyPlanning {
    const planning = WeeklyPlanning.create(
      data.planningId as string,
      data.daycareId as string,
      data.roomId as string,
      data.teacherId as string,
      data.weekStart as string,
      data.weekEnd as string
    );

    planning.status = data.status as WeeklyPlanStatus;
    planning.observations = (data.observations as string) || '';
    planning.identifiedNeeds = (data.identifiedNeeds as string) || '';
    planning.specialSituations = (data.specialSituations as string) || '';
    planning.availableMaterials = (data.availableMaterials as string) || '';
    planning.curricularReferences = (data.curricularReferences as string[]) || [];
    planning.version = (data.version as number) || 1;

    if (data.closedBy !== undefined) {
      planning.closedBy = data.closedBy as string;
    }
    if (data.closedAt !== undefined) {
      planning.closedAt = toDateOrUndefined(data.closedAt);
    }
    if (data.approvedBy !== undefined) {
      planning.approvedBy = data.approvedBy as string;
    }
    if (data.approvedAt !== undefined) {
      planning.approvedAt = toDateOrUndefined(data.approvedAt);
    }
    if (data.originalContext !== undefined) {
      planning.originalContext = data.originalContext as WeeklyContextSnapshot;
    }
    if (data.granularObservations !== undefined) {
      planning.granularObservations = data.granularObservations as GranularObservation[];
    }
    if (data.historicalRounds !== undefined) {
      planning.historicalRounds = data.historicalRounds as ReviewRound[];
    }

    planning.reviewHistory = (((data.reviewHistory as unknown[]) || []) as Record<string, unknown>[]).map((record) => ({
      reason: record.reason as string,
      rejectedBy: record.rejectedBy as string,
      rejectedAt: toRequiredDate(record.rejectedAt, 'reviewHistory.rejectedAt'),
    }));

    planning.days = (((data.days as unknown[]) || []) as Record<string, any>[]).map((day) => {
      const deserializedDay: PlanningDay = {
        date: typeof day.date === 'string' ? day.date : '',
        dayOfWeek: day.dayOfWeek ?? 'MONDAY',
        activities: Array.isArray(day.activities) ? day.activities : [],
        complementaryActivities: Array.isArray(day.complementaryActivities) ? day.complementaryActivities : [],
        materials: Array.isArray(day.materials) ? day.materials : [],
        ...day,
      };
      if (day.teacherReviewedAt !== undefined) {
        deserializedDay.teacherReviewedAt = toDateOrUndefined(day.teacherReviewedAt);
      }
      if (day.evaluationConfirmedAt !== undefined) {
        deserializedDay.evaluationConfirmedAt = toDateOrUndefined(day.evaluationConfirmedAt);
      }
      if (day.evaluationSubmittedAt !== undefined) {
        deserializedDay.evaluationSubmittedAt = toDateOrUndefined(day.evaluationSubmittedAt);
      }
      if (day.evaluationReviewedAt !== undefined) {
        deserializedDay.evaluationReviewedAt = toDateOrUndefined(day.evaluationReviewedAt);
      }
      if (day.evaluationHistory !== undefined) {
        deserializedDay.evaluationHistory = Array.isArray(day.evaluationHistory)
          ? day.evaluationHistory.map((entry: any) => {
              const deserializedEntry: any = { ...entry };
              deserializedEntry.submittedAt = toRequiredDate(entry.submittedAt, 'evaluationHistory.submittedAt');
              if (entry.reviewedAt !== undefined) {
                deserializedEntry.reviewedAt = toDateOrUndefined(entry.reviewedAt);
              }
              return deserializedEntry;
            })
          : undefined;
      }
      return deserializedDay;
    });

    planning.assertValidCurricularInvariants();
    planning.assertValidComplementaryInvariants();
    planning.assertValidPrioritizedPracticeInvariants();
    return planning;
  }
}
