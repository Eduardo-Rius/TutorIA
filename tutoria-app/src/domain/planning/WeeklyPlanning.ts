import type { CurricularPDAReference } from './CurricularPDAReference';
import { validateCurricularPDAReferences } from './CurricularPDAReference';
import {
  ComplementaryProgramActivity,
  validateComplementaryProgramActivities,
  InvalidComplementaryActivityError,
} from './ComplementaryProgramActivity';
import {
  PrioritizedPractice,
  validatePrioritizedPractices,
  InvalidPrioritizedPracticeError,
} from './PrioritizedPractice';

export type { CurricularPDAReference, ComplementaryProgramActivity, PrioritizedPractice };
export {
  validateComplementaryProgramActivities,
  InvalidComplementaryActivityError,
  validatePrioritizedPractices,
  InvalidPrioritizedPracticeError,
};

export interface WeeklyContextSnapshot {
  observations: string;
  identifiedNeeds: string;
  specialSituations: string;
  availableMaterials: string;
}

export type WeeklyPlanStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'APPROVED_FOR_EXECUTION' | 'REJECTED' | 'CLOSED';

export interface GranularObservation {
  targetId: string;
  observation: string;
  originalContent: string;
  currentContent?: string;
  status: 'PENDING_CORRECTION' | 'CHANGED_BY_EDUCATOR' | 'RESOLVED';
  reviewer: string;
  timestamp: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface ReviewRound {
  roundId: string;
  sequenceNumber: number;
  timestamp: Date;
  observations: GranularObservation[];
}

export interface RejectionRecord {
  reason: string;
  rejectedBy: string;
  rejectedAt: Date;
}

export interface PlanningActivity {
  activityId: string;
  category: string;
  objective: string;
  description: string;
  materials: string[];
  durationMinutes: number;
  curricularTraceability: CurricularPDAReference[];
}

// ComplementaryProgramActivity is imported and re-exported from ./ComplementaryProgramActivity

export type DailyEvaluationStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";

export interface DailyEvaluationHistoryEntry {
  evaluation: string;
  submittedAt: Date;
  submittedBy: string;
  directorComment?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  status: DailyEvaluationStatus;
}

export interface PlanningDay {
  date: string; // ISO date string
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
  activities: PlanningActivity[];
  complementaryActivities: ComplementaryProgramActivity[];
  prioritizedPractices?: PrioritizedPractice[];
  materials: string[];
  evaluation?: string;
  executionNotes?: string;
  directorReviewed?: boolean;
  evaluationStatus?: DailyEvaluationStatus;
  evaluationSubmittedAt?: Date;
  evaluationSubmittedBy?: string;
  evaluationDirectorComment?: string;
  evaluationReviewedAt?: Date;
  evaluationReviewedBy?: string;
  evaluationResubmitted?: boolean;
  evaluationHistory?: DailyEvaluationHistoryEntry[];
}

export class WeeklyPlanning {
  constructor(
    public readonly planningId: string,
    public readonly daycareId: string,
    public readonly roomId: string,
    public readonly teacherId: string,
    public readonly weekStart: string,
    public readonly weekEnd: string,
    public status: WeeklyPlanStatus,
    public observations: string,
    public identifiedNeeds: string,
    public specialSituations: string,
    public availableMaterials: string,
    public curricularReferences: string[],
        public granularObservations: GranularObservation[] = [],
    public days: PlanningDay[],
    public version: number,
    public reviewHistory: RejectionRecord[] = [],
    public historicalRounds: ReviewRound[] = [],
    public approvedBy?: string,
    public approvedAt?: Date,
    public originalContext?: WeeklyContextSnapshot,
    public closedBy?: string,
    public closedAt?: Date
  ) {
    WeeklyPlanning.validateCurricularInvariants(this.days);
    WeeklyPlanning.validateComplementaryInvariants(this.days);
    WeeklyPlanning.validatePrioritizedPracticeInvariants(this.days);
  }

  public assertValidCurricularInvariants(): void {
    WeeklyPlanning.validateCurricularInvariants(this.days);
  }

  public assertValidComplementaryInvariants(): void {
    WeeklyPlanning.validateComplementaryInvariants(this.days);
  }

  public assertValidPrioritizedPracticeInvariants(): void {
    WeeklyPlanning.validatePrioritizedPracticeInvariants(this.days);
  }

  public static validatePrioritizedPracticeInvariants(days: readonly PlanningDay[]): void {
    if (!days || !Array.isArray(days)) return;
    for (const day of days) {
      if (day && Array.isArray(day.prioritizedPractices)) {
        validatePrioritizedPractices(day.prioritizedPractices);
      }
    }
  }

  public static validateCurricularInvariants(days: readonly PlanningDay[]): void {
    if (!days || !Array.isArray(days)) return;
    for (const day of days) {
      if (day && Array.isArray(day.activities)) {
        for (const activity of day.activities) {
          if (activity && activity.curricularTraceability) {
            validateCurricularPDAReferences(activity.curricularTraceability);
          }
        }
      }
    }
  }

  public static validateComplementaryInvariants(days: readonly PlanningDay[]): void {
    if (!days || !Array.isArray(days)) return;
    for (const day of days) {
      if (day && Array.isArray(day.complementaryActivities)) {
        validateComplementaryProgramActivities(day.complementaryActivities);
      }
    }
  }

  public static create(
    planningId: string,
    daycareId: string,
    roomId: string,
    teacherId: string,
    weekStart: string,
    weekEnd: string
  ): WeeklyPlanning {
    return new WeeklyPlanning(
      planningId,
      daycareId,
      roomId,
      teacherId,
      weekStart,
      weekEnd,
      'DRAFT',
      '',
      '',
      '',
      '',
            [],
      [],
      [],
      1,
      [],
      []
    );
  }

  public editPedagogicalContent(
    observations: string,
    identifiedNeeds: string,
    specialSituations: string,
    availableMaterials: string,
    curricularReferences: string[],
    days: PlanningDay[],
    originalContext?: WeeklyContextSnapshot
  ): void {
    if (this.status !== 'DRAFT' && this.status !== 'REJECTED') {
      throw new Error(`Cannot edit planning in status: ${this.status}`);
    }

    if (days.length !== 5) {
      throw new Error('WeeklyPlanning must contain exactly 5 days');
    }

    const expectedDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const actualDays = days.map(d => d.dayOfWeek);
    for (const d of expectedDays) {
      if (!actualDays.includes(d as PlanningDay['dayOfWeek'])) {
        throw new Error(`WeeklyPlanning missing day: ${d}`);
      }
    }

    // Enforce canonical curricular, complementary, and prioritized practice invariants atomically before mutating state
    WeeklyPlanning.validateCurricularInvariants(days);
    WeeklyPlanning.validateComplementaryInvariants(days);
    WeeklyPlanning.validatePrioritizedPracticeInvariants(days);

    if (!this.originalContext) {
      if (originalContext) {
        this.originalContext = { ...originalContext };
      } else if (observations || identifiedNeeds || specialSituations || availableMaterials) {
        this.originalContext = {
          observations,
          identifiedNeeds,
          specialSituations,
          availableMaterials
        };
      }
    }

    this.observations = observations;
    this.identifiedNeeds = identifiedNeeds;
    this.specialSituations = specialSituations;
    this.availableMaterials = availableMaterials;
    this.curricularReferences = curricularReferences;

    // Preserving director review state across rounds for days with no activity changes
    const updatedDays: PlanningDay[] = [];
    for (const newDay of days) {
      const oldDay = this.days.find(d => d.dayOfWeek === newDay.dayOfWeek);
      if (oldDay) {
        const oldActs = JSON.stringify(oldDay.activities || []);
        const newActs = JSON.stringify(newDay.activities || []);
        const hasActivitiesChanged = oldActs !== newActs;
        updatedDays.push({
          ...newDay,
          directorReviewed: hasActivitiesChanged ? false : Boolean(oldDay.directorReviewed)
        });
      } else {
        updatedDays.push(newDay);
      }
    }
    this.days = updatedDays;

    // Update granular observations status
    for (const obs of this.granularObservations) {
      if (obs.status === 'PENDING_CORRECTION' || obs.status === 'CHANGED_BY_EDUCATOR') {
        // find activity
        let found = false;
        for (const d of this.days) {
          const act = d.activities.find(a => a.activityId === obs.targetId);
          if (act) {
            found = true;
            if (act.description !== obs.originalContent) {
              obs.currentContent = act.description;
              obs.status = 'CHANGED_BY_EDUCATOR';
            } else {
              obs.currentContent = '';
              obs.status = 'PENDING_CORRECTION';
            }
            break;
          }
        }
      }
    }

    this.version += 1;
  }

  public setActivityCurricularTraceability(
    dayOfWeekOrDate: string,
    activityId: string,
    references: readonly CurricularPDAReference[]
  ): void {
    if (this.status !== 'DRAFT' && this.status !== 'REJECTED') {
      throw new Error(`Cannot edit curricular traceability in status: ${this.status}`);
    }

    const targetDay = this.days.find(
      (d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate
    );
    if (!targetDay) {
      throw new Error(`Day not found: ${dayOfWeekOrDate}`);
    }

    const targetActivity = (targetDay.activities || []).find(
      (a) => a.activityId === activityId
    );
    if (!targetActivity) {
      throw new Error(`Activity '${activityId}' not found in day ${dayOfWeekOrDate}`);
    }

    // Atomic validation of references before mutating activity
    validateCurricularPDAReferences(references);

    targetActivity.curricularTraceability = [...references];
  }

  /**
   * Replaces the full complementary-activity selection/content for ONE PlanningDay.
   * Human-governed operation for institutional program instructions.
   */
  public setDayComplementaryActivities(
    dayId: string,
    activities: readonly ComplementaryProgramActivity[]
  ): void {
    if (this.status !== 'DRAFT' && this.status !== 'REJECTED') {
      throw new Error(`Cannot edit complementary activities in status: ${this.status}`);
    }

    const targetDay = this.days.find(
      (d) => d.dayOfWeek === dayId || d.date === dayId
    );
    if (!targetDay) {
      throw new Error(`Day not found: ${dayId}`);
    }

    // Atomic validation before mutation
    const validated = validateComplementaryProgramActivities(activities);
    targetDay.complementaryActivities = validated;
  }

  /**
   * Replaces the full prioritized-practices collection for ONE PlanningDay.
   * Human-governed operation for institutional instructions / mentoring.
   */
  public setDayPrioritizedPractices(
    dayId: string,
    practices: readonly PrioritizedPractice[]
  ): void {
    if (this.status !== 'DRAFT' && this.status !== 'REJECTED') {
      throw new Error(`Cannot edit prioritized practices in status: ${this.status}`);
    }

    const targetDay = this.days.find(
      (d) => d.dayOfWeek === dayId || d.date === dayId
    );
    if (!targetDay) {
      throw new Error(`Day not found: ${dayId}`);
    }

    // Atomic validation before mutation
    const validated = validatePrioritizedPractices(practices);
    targetDay.prioritizedPractices = validated;
  }

  public submit(): void {
    if (this.status !== 'DRAFT' && this.status !== 'REJECTED') {
      throw new Error(`Cannot submit planning in status: ${this.status}`);
    }
    if (this.days.length !== 5) {
      throw new Error('WeeklyPlanning must contain exactly 5 days to be submitted');
    }
    const daysWithNoActivities = this.days.filter(d => !d.activities || d.activities.length === 0);
    if (daysWithNoActivities.length > 0) {
      throw new Error('All 5 days must contain activities to be submitted');
    }
    this.status = 'IN_REVIEW';
  }

  private archiveCurrentObservations() {
    this.historicalRounds.push({
      roundId: `round-${Date.now()}-${this.historicalRounds.length + 1}`,
      sequenceNumber: this.historicalRounds.length + 1,
      timestamp: new Date(),
      observations: JSON.parse(JSON.stringify(this.granularObservations))
    });
  }

  public approve(approvedBy: string): void {
    if (this.status !== 'IN_REVIEW') {
      throw new Error(`Cannot approve planning in status: ${this.status}`);
    }
    if (this.granularObservations.length > 0) {
      this.archiveCurrentObservations();
    }
    this.status = 'APPROVED';
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
  }

  public get semanticStatus(): 'DRAFT' | 'IN_REVIEW' | 'APPROVED_FOR_EXECUTION' | 'REJECTED' | 'CLOSED' {
    if (this.status === 'CLOSED') {
      return 'CLOSED';
    }
    if (this.status === 'APPROVED' || this.status === 'APPROVED_FOR_EXECUTION') {
      return 'APPROVED_FOR_EXECUTION';
    }
    return this.status;
  }

  public isApprovedForExecution(): boolean {
    return this.status === 'APPROVED' || this.status === 'APPROVED_FOR_EXECUTION';
  }

  public get approvedDailyEvaluationCount(): number {
    return this.days.filter(d => d.evaluationStatus === 'APPROVED').length;
  }

  public get isReadyForClosure(): boolean {
    return this.isApprovedForExecution() && this.days.length === 5 && this.days.every(d => d.evaluationStatus === 'APPROVED');
  }

  public isClosed(): boolean {
    return this.status === 'CLOSED';
  }

  public closeWeek(directorId: string = 'Ceci', closedAt: Date = new Date()): void {
    if (this.status === 'CLOSED') {
      throw new Error('Weekly planning is already CLOSED');
    }
    if (!this.isReadyForClosure) {
      throw new Error(`Cannot close week: only ${this.approvedDailyEvaluationCount}/5 daily evaluations are approved`);
    }
    this.status = 'CLOSED';
    this.closedBy = directorId;
    this.closedAt = closedAt;
  }

  public reject(reason: string, rejectedBy: string, newGranularObs?: GranularObservation[]): void {
    if (this.status !== 'IN_REVIEW') {
      throw new Error(`Cannot reject planning in status: ${this.status}`);
    }

    if (this.granularObservations.length > 0) {
      this.archiveCurrentObservations();
    }

    this.status = 'REJECTED';
    this.reviewHistory.push({
      reason: reason ? reason.trim() : 'Se requieren ajustes',
      rejectedBy,
      rejectedAt: new Date()
    });

    if (newGranularObs && newGranularObs.length > 0) {
      for (const newObs of newGranularObs) {
        const existingIdx = this.granularObservations.findIndex(o => o.targetId === newObs.targetId);
        if (existingIdx >= 0) {
           const existing = this.granularObservations[existingIdx]!;
           existing.originalContent = existing.currentContent || existing.originalContent;
           existing.currentContent = '';
           existing.observation = newObs.observation;
           existing.status = 'PENDING_CORRECTION';
           existing.reviewer = newObs.reviewer || rejectedBy;
           existing.timestamp = new Date();
           delete existing.resolvedBy;
           delete existing.resolvedAt;
        } else {
           this.granularObservations.push({
             ...newObs,
             reviewer: newObs.reviewer || rejectedBy,
             timestamp: new Date()
           });
        }
      }
    }
  }

  public resolveGranularObservation(targetId: string, resolvedBy: string): void {
    const obs = this.granularObservations.find(o => o.targetId === targetId);
    if (obs) {
      obs.status = "RESOLVED";
      obs.resolvedBy = resolvedBy;
      obs.resolvedAt = new Date();
    }
    for (const d of this.days) {
      if (d.activities.some(a => a.activityId === targetId)) {
        const hasPending = this.granularObservations.some(o =>
          (o.status === "PENDING_CORRECTION" || o.status === "CHANGED_BY_EDUCATOR") &&
          d.activities.some(a => a.activityId === o.targetId)
        );
        if (!hasPending) {
          d.directorReviewed = true;
        }
        break;
      }
    }
  }
  public setOriginalContext(snapshot: WeeklyContextSnapshot): void {
    if (!this.originalContext) {
      this.originalContext = { ...snapshot };
    }
  }

  public updateWeeklyContext(
    observations: string,
    identifiedNeeds: string,
    specialSituations: string,
    availableMaterials: string
  ): void {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot edit weekly context in status: ${this.status}`);
    }
    if (!this.originalContext) {
      this.originalContext = {
        observations: this.observations,
        identifiedNeeds: this.identifiedNeeds,
        specialSituations: this.specialSituations,
        availableMaterials: this.availableMaterials
      };
    }
    this.observations = observations;
    this.identifiedNeeds = identifiedNeeds;
    this.specialSituations = specialSituations;
    this.availableMaterials = availableMaterials;
    this.version += 1;
  }

  public hasContextChanged(): boolean {
    if (!this.originalContext) return false;
    return (
      (this.observations || "").trim() !== (this.originalContext.observations || "").trim() ||
      (this.identifiedNeeds || "").trim() !== (this.originalContext.identifiedNeeds || "").trim() ||
      (this.specialSituations || "").trim() !== (this.originalContext.specialSituations || "").trim() ||
      (this.availableMaterials || "").trim() !== (this.originalContext.availableMaterials || "").trim()
    );
  }

    public markDirectorDayReviewed(dayOfWeek: PlanningDay["dayOfWeek"]): void {
    const day = this.days.find(d => d.dayOfWeek === dayOfWeek);
    if (day) {
      day.directorReviewed = true;
    }
  }

      public isDirectorDayReviewed(dayOfWeek: PlanningDay["dayOfWeek"]): boolean {
    const day = this.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!day) return false;

    // Days with educator corrections waiting for director re-review are NOT reviewed
    const hasUnresolvedCorrection = this.granularObservations.some(o =>
      o.status === "CHANGED_BY_EDUCATOR" &&
      day.activities.some(a => a.activityId === o.targetId)
    );
    if (hasUnresolvedCorrection) {
      return false;
    }

    // Days with pending or resolved observations that were reviewed by director
    const hasObs = this.granularObservations.some(o =>
      day.activities.some(a => a.activityId === o.targetId)
    );
    if (hasObs && this.status === "IN_REVIEW") {
      // In review round, if not CHANGED_BY_EDUCATOR, it is reviewed with observation
      return true;
    }

    return Boolean(day.directorReviewed);
  }

  public getReviewedDirectorDaysCount(): number {
    return this.days.filter(d => this.isDirectorDayReviewed(d.dayOfWeek)).length;
  }

  public getDayDate(day: PlanningDay): string {
    const dayOffsets: Record<string, number> = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4
    };

    if (this.weekStart && dayOffsets[day.dayOfWeek] !== undefined) {
      const [y, m, d] = this.weekStart.split("-").map(Number);
      if (y && m && d) {
        const targetDate = new Date(Date.UTC(y, m - 1, d + dayOffsets[day.dayOfWeek]));
        return targetDate.toISOString().split("T")[0];
      }
    }

    if (day.date) {
      return day.date;
    }

    return "";
  }

    public getDaySpanishName(dayOfWeek: string): string {
    const names: Record<string, string> = {
      MONDAY: "Lunes",
      TUESDAY: "Martes",
      WEDNESDAY: "Miércoles",
      THURSDAY: "Jueves",
      FRIDAY: "Viernes"
    };
    return names[dayOfWeek] || dayOfWeek;
  }

  public isDayDateReached(dayOfWeekOrDate: string, currentDate?: string): boolean {
    if (this.status !== "APPROVED" || !currentDate) return false;
    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) return false;
    const targetDay = this.days[targetIndex]!;
    const targetDayDate = this.getDayDate(targetDay);
    if (!targetDayDate) return false;
    return currentDate >= targetDayDate;
  }

  public isDayEvaluationSubmitted(day: PlanningDay): boolean {
    if (!day.evaluation || !day.evaluation.trim()) return false;
    if (day.evaluationStatus === "DRAFT") return false;
    return (
      day.evaluationStatus === "IN_REVIEW" ||
      day.evaluationStatus === "APPROVED" ||
      day.evaluationStatus === "CHANGES_REQUESTED" ||
      !day.evaluationStatus
    );
  }

  public canEvaluateDay(dayOfWeekOrDate: string, currentDate?: string): boolean {
    if (this.status !== "APPROVED") return false;
    if (!currentDate) return false;

    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) return false;

    const targetDay = this.days[targetIndex]!;
    const targetDayDate = this.getDayDate(targetDay);
    if (!targetDayDate) return false;

    // 1. Future date check
    if (currentDate < targetDayDate) return false;

    // 2. Chronological check: all prior days must be submitted
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i]!;
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        return false;
      }
    }

    return true;
  }

  public getNextEvaluableDay(currentDate?: string): PlanningDay | null {
    if (this.status !== "APPROVED" || !currentDate) return null;

    for (const day of this.days) {
      const dayDate = this.getDayDate(day);
      if (!dayDate) continue;
      if (currentDate < dayDate) {
        break; // Reached future date
      }
      if (!this.isDayEvaluationSubmitted(day)) {
        return day;
      }
    }
    return null;
  }

  public getEvaluationStatus(dayOfWeekOrDate: string, currentDate?: string): {
    isEligible: boolean;
    isFuture: boolean;
    isChronologicallyBlocked: boolean;
    blockingDay?: PlanningDay;
    dayDate: string;
  } {
    const notEligibleResult = {
      isEligible: false,
      isFuture: false,
      isChronologicallyBlocked: false,
      dayDate: ""
    };

    if (this.status !== "APPROVED" || !currentDate) return notEligibleResult;

    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) return notEligibleResult;

    const targetDay = this.days[targetIndex]!;
    const dayDate = this.getDayDate(targetDay);
    if (!dayDate) return notEligibleResult;

    // Future check
    if (currentDate < dayDate) {
      return {
        isEligible: false,
        isFuture: true,
        isChronologicallyBlocked: false,
        dayDate
      };
    }

    // Chronological check: prior day must be submitted
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i]!;
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        return {
          isEligible: false,
          isFuture: false,
          isChronologicallyBlocked: true,
          blockingDay: priorDay,
          dayDate
        };
      }
    }

    return {
      isEligible: true,
      isFuture: false,
      isChronologicallyBlocked: false,
      dayDate
    };
  }

  public saveDailyEvaluationDraft(
    dayOfWeekOrDate: string,
    evaluation: string,
    currentDate: string,
    teacherId?: string
  ): void {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation is only permitted when planning is APPROVED (current status: ${this.status})`);
    }

    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }

    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }

    const targetDay = this.days[targetIndex]!;
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }

    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }

    if (targetDay.evaluationStatus === "IN_REVIEW" || targetDay.evaluationStatus === "APPROVED") {
      throw new Error("Cannot edit evaluation once submitted or approved");
    }

    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i]!;
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        throw new Error(
          `Cannot evaluate ${dayOfWeekOrDate} before completing evaluation for earlier day ${priorDay.dayOfWeek}`
        );
      }
    }

    targetDay.evaluation = evaluation;
    if (targetDay.evaluationStatus !== "CHANGES_REQUESTED") {
      targetDay.evaluationStatus = "DRAFT";
    }
    targetDay.date = effectiveDayDate || targetDay.date;
  }

  public resubmitDailyEvaluation(
    dayOfWeekOrDate: string,
    evaluation: string,
    currentDate: string,
    teacherId?: string
  ): void {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation resubmission is only permitted when planning is APPROVED (current status: ${this.status})`);
    }

    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }

    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }

    const targetDay = this.days[targetIndex]!;
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }

    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }

    if (targetDay.evaluationStatus !== "CHANGES_REQUESTED") {
      throw new Error(`Cannot resubmit daily evaluation that is not in CHANGES_REQUESTED status (current status: ${targetDay.evaluationStatus || "DRAFT"})`);
    }

    if (!evaluation || !evaluation.trim()) {
      throw new Error("Cannot resubmit empty daily evaluation");
    }

    if (!targetDay.evaluationHistory) {
      targetDay.evaluationHistory = [];
    }
    targetDay.evaluationHistory.push({
      evaluation: targetDay.evaluation || "",
      submittedAt: targetDay.evaluationSubmittedAt || new Date(),
      submittedBy: targetDay.evaluationSubmittedBy || teacherId || "Anita",
      directorComment: targetDay.evaluationDirectorComment,
      reviewedAt: targetDay.evaluationReviewedAt,
      reviewedBy: targetDay.evaluationReviewedBy,
      status: "CHANGES_REQUESTED"
    });

    targetDay.evaluation = evaluation.trim();
    targetDay.evaluationStatus = "IN_REVIEW";
    targetDay.evaluationResubmitted = true;
    targetDay.evaluationSubmittedAt = new Date();
    targetDay.evaluationSubmittedBy = teacherId || targetDay.evaluationSubmittedBy || "Anita";
    targetDay.date = effectiveDayDate || targetDay.date;
  }

  public submitDailyEvaluation(
    dayOfWeekOrDate: string,
    evaluation: string,
    currentDate: string,
    teacherId?: string
  ): void {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation is only permitted when planning is APPROVED (current status: ${this.status})`);
    }

    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }

    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }

    const targetDay = this.days[targetIndex]!;
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }

    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }

    if (targetDay.evaluationStatus === "IN_REVIEW" || targetDay.evaluationStatus === "APPROVED" || targetDay.evaluationStatus === "CHANGES_REQUESTED") {
      throw new Error("Cannot submit already submitted evaluation");
    }

    if (!evaluation || !evaluation.trim()) {
      throw new Error("Cannot submit empty daily evaluation");
    }

    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i]!;
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        throw new Error(
          `Cannot evaluate ${dayOfWeekOrDate} before completing evaluation for earlier day ${priorDay.dayOfWeek}`
        );
      }
    }

    targetDay.evaluation = evaluation.trim();
    targetDay.evaluationStatus = "IN_REVIEW";
    targetDay.evaluationSubmittedAt = new Date();
    targetDay.evaluationSubmittedBy = teacherId || "Anita";
    targetDay.date = effectiveDayDate || targetDay.date;
  }

  public approveDailyEvaluation(dayOfWeekOrDate: string, directorId: string = "Ceci"): void {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation review is only permitted when planning is APPROVED (current status: ${this.status})`);
    }

    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }

    const targetDay = this.days[targetIndex]!;
    if (targetDay.evaluationStatus !== "IN_REVIEW") {
      throw new Error(`Cannot approve daily evaluation with status ${targetDay.evaluationStatus || "DRAFT"}`);
    }

    targetDay.evaluationStatus = "APPROVED";
    targetDay.evaluationResubmitted = false;
    targetDay.evaluationReviewedBy = directorId;
    targetDay.evaluationReviewedAt = new Date();
  }

  public requestDailyEvaluationChange(dayOfWeekOrDate: string, comment: string, directorId: string = "Ceci"): void {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation review is only permitted when planning is APPROVED (current status: ${this.status})`);
    }

    const targetIndex = this.days.findIndex(d => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }

    const targetDay = this.days[targetIndex]!;
    if (targetDay.evaluationStatus !== "IN_REVIEW") {
      throw new Error(`Cannot request changes for daily evaluation with status ${targetDay.evaluationStatus || "DRAFT"}`);
    }

    if (!comment || !comment.trim()) {
      throw new Error("Director comment is required when requesting changes to daily evaluation");
    }

    targetDay.evaluationStatus = "CHANGES_REQUESTED";
    targetDay.evaluationResubmitted = false;
    targetDay.evaluationDirectorComment = comment.trim();
    targetDay.evaluationReviewedBy = directorId;
    targetDay.evaluationReviewedAt = new Date();
  }

  public saveDailyEvaluation(dayOfWeekOrDate: string, evaluation: string, currentDate: string, teacherId?: string): void {
    this.submitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId);
  }
}
