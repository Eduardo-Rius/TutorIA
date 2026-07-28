import { PolicyContext } from '../PolicyContext';

export interface PlanningActivity {
  id: string;
  name: string;
  requiresObservation: boolean;
  hasObservation?: boolean;
}

export interface PlanningPolicyContext extends PolicyContext {
  validFrom: Date;
  validUntil: Date;
  schoolPeriodStart: Date;
  schoolPeriodEnd: Date;
  authorId: string;
  approverId?: string;
  activities: PlanningActivity[];
  existingPlans: Array<{ validFrom: Date; validUntil: Date }>;
}
