export type WeeklyPlanStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

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
    public curricularReferences: string[],
    public days: PlanningDay[],
    public version: number,
    public reviewHistory: RejectionRecord[] = []
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
      [],
      [],
      1
    );
  }

  public editPedagogicalContent(
    observations: string,
    identifiedNeeds: string,
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
    this.curricularReferences = curricularReferences;
    this.days = days;
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

  public approve(): void {
    if (this.status !== 'IN_REVIEW') {
      throw new Error(`Cannot approve planning in status: ${this.status}`);
    }
    this.status = 'APPROVED';
  }

  public reject(reason: string, rejectedBy: string): void {
    if (this.status !== 'IN_REVIEW') {
      throw new Error(`Cannot reject planning in status: ${this.status}`);
    }
    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason cannot be empty');
    }
    
    this.status = 'REJECTED';
    this.reviewHistory.push({
      reason: reason.trim(),
      rejectedBy,
      rejectedAt: new Date()
    });
  }
}
