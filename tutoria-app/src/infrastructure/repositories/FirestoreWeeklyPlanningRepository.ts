import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {
  WeeklyPlanning,
  WeeklyPlanStatus,
  PlanningDay,
  WeeklyContextSnapshot,
  GranularObservation,
  ReviewRound,
} from '../../domain/planning/WeeklyPlanning';
import { WeeklyPlanningRepository } from '../../application/ports/WeeklyPlanningRepository';

/**
 * Converts a Date, Timestamp, string, or number to a Firestore Timestamp.
 * Throws an explicit error if the value is malformed.
 */
export function toFirestoreTimestamp(val: unknown): Timestamp | undefined {
  if (val === null || val === undefined) return undefined;
  if (val instanceof Timestamp) return val;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      throw new Error('Invalid Date cannot be converted to Firestore Timestamp');
    }
    return Timestamp.fromDate(val);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date value "${val}" cannot be converted to Firestore Timestamp`);
    }
    return Timestamp.fromDate(d);
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val && typeof (val as any).seconds === 'number') {
    const nanoseconds = typeof (val as any).nanoseconds === 'number' ? (val as any).nanoseconds : 0;
    return new Timestamp((val as any).seconds, nanoseconds);
  }
  throw new Error(`Cannot convert value of type "${typeof val}" to Firestore Timestamp`);
}

/**
 * Converts a Firestore Timestamp, Timestamp-like object, Date, string, or number to a JavaScript Date.
 * Throws an explicit error if the value is malformed.
 */
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

/**
 * Requires a valid date value, throwing if undefined, null, or malformed.
 */
export function toRequiredDate(val: unknown, fieldName: string): Date {
  const d = toDateOrUndefined(val);
  if (!d) {
    throw new Error(`Required date field "${fieldName}" is missing or undefined`);
  }
  return d;
}

export class FirestoreWeeklyPlanningRepository implements WeeklyPlanningRepository {
  private readonly collectionName = 'weeklyPlannings';

  public async save(planning: WeeklyPlanning): Promise<void> {
    planning.assertValidCurricularInvariants();
    planning.assertValidComplementaryInvariants();
    planning.assertValidPrioritizedPracticeInvariants();
    const docRef = doc(db, this.collectionName, planning.planningId);
    await setDoc(docRef, this.serialize(planning));
  }

  public async findById(planningId: string): Promise<WeeklyPlanning | null> {
    const docRef = doc(db, this.collectionName, planningId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return this.deserialize(snapshot.data());
  }

  public async listByTeacher(teacherId: string): Promise<WeeklyPlanning[]> {
    const q = query(collection(db, this.collectionName), where('teacherId', '==', teacherId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  public async listInReview(): Promise<WeeklyPlanning[]> {
    const q = query(collection(db, this.collectionName), where('status', '==', 'IN_REVIEW'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  public async listApproved(): Promise<WeeklyPlanning[]> {
    const q = query(collection(db, this.collectionName), where('status', '==', 'APPROVED'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  public async listClosed(): Promise<WeeklyPlanning[]> {
    const q = query(collection(db, this.collectionName), where('status', '==', 'CLOSED'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  public serialize(planning: WeeklyPlanning): DocumentData {
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
      ...(planning.closedAt ? { closedAt: toFirestoreTimestamp(planning.closedAt) } : {}),
      ...(planning.approvedBy !== undefined ? { approvedBy: planning.approvedBy } : {}),
      ...(planning.approvedAt ? { approvedAt: toFirestoreTimestamp(planning.approvedAt) } : {}),
      ...(planning.originalContext !== undefined ? { originalContext: planning.originalContext } : {}),
      granularObservations: planning.granularObservations ?? [],
      historicalRounds: planning.historicalRounds ?? [],
      reviewHistory: planning.reviewHistory.map(record => ({
        reason: record.reason,
        rejectedBy: record.rejectedBy,
        rejectedAt: toFirestoreTimestamp(record.rejectedAt),
      })),
      days: planning.days.map(day => {
        const serializedDay: Record<string, any> = {
          ...day,
        };
        if (day.teacherReviewedAt) {
          serializedDay.teacherReviewedAt = toFirestoreTimestamp(day.teacherReviewedAt);
        }
        if (day.evaluationConfirmedAt) {
          serializedDay.evaluationConfirmedAt = toFirestoreTimestamp(day.evaluationConfirmedAt);
        }
        if (day.evaluationSubmittedAt) {
          serializedDay.evaluationSubmittedAt = toFirestoreTimestamp(day.evaluationSubmittedAt);
        }
        if (day.evaluationReviewedAt) {
          serializedDay.evaluationReviewedAt = toFirestoreTimestamp(day.evaluationReviewedAt);
        }
        if (day.evaluationHistory && Array.isArray(day.evaluationHistory)) {
          serializedDay.evaluationHistory = day.evaluationHistory.map(entry => {
            const serializedEntry: Record<string, any> = { ...entry };
            if (entry.submittedAt) {
              serializedEntry.submittedAt = toFirestoreTimestamp(entry.submittedAt);
            }
            if (entry.reviewedAt) {
              serializedEntry.reviewedAt = toFirestoreTimestamp(entry.reviewedAt);
            }
            return serializedEntry;
          });
        }
        return serializedDay;
      }),
    };
  }

  public deserialize(data: DocumentData): WeeklyPlanning {
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

    planning.reviewHistory = ((data.reviewHistory || []) as Record<string, unknown>[]).map((record) => ({
      reason: record.reason as string,
      rejectedBy: record.rejectedBy as string,
      rejectedAt: toRequiredDate(record.rejectedAt, 'reviewHistory.rejectedAt'),
    }));

    planning.days = ((data.days || []) as Record<string, any>[]).map(day => {
      const deserializedDay: PlanningDay = {
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
