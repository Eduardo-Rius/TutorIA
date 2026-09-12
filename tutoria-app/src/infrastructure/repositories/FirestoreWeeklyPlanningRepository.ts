import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { WeeklyPlanning, WeeklyPlanStatus } from '../../domain/planning/WeeklyPlanning';

export class FirestoreWeeklyPlanningRepository {
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
      curricularReferences: planning.curricularReferences,
      days: planning.days,
      version: planning.version,
      reviewHistory: planning.reviewHistory.map(record => ({
        reason: record.reason,
        rejectedBy: record.rejectedBy,
        rejectedAt: Timestamp.fromDate(record.rejectedAt),
      })),
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
    planning.observations = data.observations as string || '';
    planning.identifiedNeeds = data.identifiedNeeds as string || '';
    planning.curricularReferences = data.curricularReferences as string[] || [];
    planning.days = data.days || [];
    planning.version = data.version as number || 1;
    planning.reviewHistory = ((data.reviewHistory || []) as Record<string, unknown>[]).map((record) => ({
      reason: record.reason as string,
      rejectedBy: record.rejectedBy as string,
      rejectedAt: record.rejectedAt instanceof Timestamp
        ? record.rejectedAt.toDate()
        : new Date(record.rejectedAt as string | number),
    }));

    planning.assertValidCurricularInvariants();
    planning.assertValidComplementaryInvariants();
    planning.assertValidPrioritizedPracticeInvariants();
    return planning;
  }
}
