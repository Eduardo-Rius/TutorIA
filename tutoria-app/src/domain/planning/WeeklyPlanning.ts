export type WeeklyPlanStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

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
  curricularTraceability: string[];
}

export interface PlanningDay {
  date: string; // ISO date string
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
  activities: PlanningActivity[];
  complementaryActivities: string[];
  materials: string[];
  evaluation?: string;
  executionNotes?: string;
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
    public approvedAt?: Date
  ) {}

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
    days: PlanningDay[]
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

    this.observations = observations;
    this.identifiedNeeds = identifiedNeeds;
    this.specialSituations = specialSituations;
    this.availableMaterials = availableMaterials;
    this.curricularReferences = curricularReferences;
    this.days = days;

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

  public submit(): void {
    if (this.status !== 'DRAFT' && this.status !== 'REJECTED') {
      throw new Error(`Cannot submit planning in status: ${this.status}`);
    }
    if (this.days.length !== 5) {
      throw new Error('WeeklyPlanning must contain exactly 5 days to be submitted');
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
      obs.status = 'RESOLVED';
      obs.resolvedBy = resolvedBy;
      obs.resolvedAt = new Date();
    }
  }
}
