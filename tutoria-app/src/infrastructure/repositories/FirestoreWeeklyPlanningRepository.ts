import { doc, getDoc, setDoc, deleteDoc, writeBatch, collection, query, where, getDocs, Timestamp, DocumentData } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';
import {
  WeeklyPlanning,
  WeeklyPlanStatus,
  PlanningDay,
  WeeklyContextSnapshot,
  GranularObservation,
  ReviewRound,
  DirectorDraftObservation,
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
  private cachedDaycareIdByUid: Map<string, string> = new Map();
  private explicitDefaultDaycareId?: string;

  public setAuthorizedDaycareId(daycareId: string): void {
    this.explicitDefaultDaycareId = daycareId;
  }

  public async resolveAuthorizedDaycareId(explicitDaycareId?: string): Promise<string | undefined> {
    if (explicitDaycareId) {
      return explicitDaycareId;
    }
    if (this.explicitDefaultDaycareId) {
      return this.explicitDefaultDaycareId;
    }
    try {
      const currentUid = auth?.currentUser?.uid;
      if (currentUid) {
        if (this.cachedDaycareIdByUid.has(currentUid)) {
          return this.cachedDaycareIdByUid.get(currentUid);
        }
        const authCtxDoc = await getDoc(doc(db, 'authorizationContexts', currentUid));
        if (authCtxDoc.exists()) {
          const data = authCtxDoc.data();
          if (Array.isArray(data?.authorizedDaycareIds) && data.authorizedDaycareIds.length > 0) {
            const daycareId = data.authorizedDaycareIds[0];
            this.cachedDaycareIdByUid.set(currentUid, daycareId);
            return daycareId;
          }
        }
      }
    } catch {
      // In offline, unauthenticated, or mock test environments, fail-safe
    }
    return undefined;
  }

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

  public async listByTeacher(teacherId: string, daycareId?: string): Promise<WeeklyPlanning[]> {
    const effectiveDaycareId = await this.resolveAuthorizedDaycareId(daycareId);
    const constraints: any[] = [where('teacherId', '==', teacherId)];
    if (effectiveDaycareId) {
      constraints.push(where('daycareId', '==', effectiveDaycareId));
    }
    const q = query(collection(db, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  public async listInReview(daycareId?: string): Promise<WeeklyPlanning[]> {
    const effectiveDaycareId = await this.resolveAuthorizedDaycareId(daycareId);
    const constraints: any[] = [where('status', '==', 'IN_REVIEW')];
    if (effectiveDaycareId) {
      constraints.push(where('daycareId', '==', effectiveDaycareId));
    }
    const q = query(collection(db, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  public async listApproved(daycareId?: string): Promise<WeeklyPlanning[]> {
    const effectiveDaycareId = await this.resolveAuthorizedDaycareId(daycareId);
    const constraints: any[] = [where('status', '==', 'APPROVED')];
    if (effectiveDaycareId) {
      constraints.push(where('daycareId', '==', effectiveDaycareId));
    }
    const q = query(collection(db, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  public async listClosed(daycareId?: string): Promise<WeeklyPlanning[]> {
    const effectiveDaycareId = await this.resolveAuthorizedDaycareId(daycareId);
    const constraints: any[] = [where('status', '==', 'CLOSED')];
    if (effectiveDaycareId) {
      constraints.push(where('daycareId', '==', effectiveDaycareId));
    }
    const q = query(collection(db, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.deserialize(doc.data()));
  }

  // SR-MD-21 Phase 2: Private Director Draft Observations Subcollection
  public async saveDraftObservation(planningId: string, draft: DirectorDraftObservation): Promise<void> {
    const currentUid = auth?.currentUser?.uid || draft.createdBy;
    const docRef = doc(db, this.collectionName, planningId, 'directorDraftObservations', draft.activityId);
    await setDoc(docRef, {
      activityId: draft.activityId,
      observation: draft.observation,
      dayOfWeek: draft.dayOfWeek ?? null,
      createdBy: currentUid,
      createdAt: toFirestoreTimestamp(draft.createdAt || new Date()),
      updatedAt: toFirestoreTimestamp(new Date()),
    });
  }

  public async listDraftObservations(planningId: string, directorId?: string): Promise<DirectorDraftObservation[]> {
    const effectiveDirectorId = directorId || auth?.currentUser?.uid;
    const constraints: any[] = [];
    if (effectiveDirectorId) {
      constraints.push(where('createdBy', '==', effectiveDirectorId));
    }
    const q = query(collection(db, this.collectionName, planningId, 'directorDraftObservations'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        activityId: data.activityId || d.id,
        observation: data.observation || '',
        dayOfWeek: data.dayOfWeek || undefined,
        createdBy: data.createdBy,
        createdAt: toDateOrUndefined(data.createdAt) || new Date(),
        updatedAt: toDateOrUndefined(data.updatedAt) || new Date(),
      };
    });
  }

  public async deleteDraftObservation(planningId: string, activityId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, planningId, 'directorDraftObservations', activityId);
    await deleteDoc(docRef);
  }

  public async clearDraftObservations(planningId: string): Promise<void> {
    const currentUid = auth?.currentUser?.uid;
    const constraints: any[] = [];
    if (currentUid) {
      constraints.push(where('createdBy', '==', currentUid));
    }
    const q = query(collection(db, this.collectionName, planningId, 'directorDraftObservations'), ...constraints);
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    for (const d of snapshot.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }

  // SR-MD-21 Phase 2B: Atomic publication and cleanup
  public async savePlanningAndClearDrafts(planning: WeeklyPlanning): Promise<void> {
    const planRef = doc(db, this.collectionName, planning.planningId);
    const currentUid = auth?.currentUser?.uid;
    const constraints: any[] = [];
    if (currentUid) {
      constraints.push(where('createdBy', '==', currentUid));
    }
    const q = query(collection(db, this.collectionName, planning.planningId, 'directorDraftObservations'), ...constraints);
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    batch.set(planRef, this.serialize(planning));
    for (const d of snapshot.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
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
            for (const k of Object.keys(serializedEntry)) {
              if (serializedEntry[k] === undefined) {
                delete serializedEntry[k];
              }
            }
            return serializedEntry;
          });
        }
        if (Array.isArray(serializedDay.activities)) {
          serializedDay.activities = serializedDay.activities.map((act: Record<string, any>) => {
            const serializedAct: Record<string, any> = { ...act };
            for (const k of Object.keys(serializedAct)) {
              if (serializedAct[k] === undefined) {
                delete serializedAct[k];
              }
            }
            return serializedAct;
          });
        }
        for (const k of Object.keys(serializedDay)) {
          if (serializedDay[k] === undefined) {
            delete serializedDay[k];
          }
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
