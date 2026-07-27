import { UserId, CenterId, GroupId } from '../../shared/value-objects/Ids';
import { ReviewOutcome } from './ValueObjects';

export interface CreatePlanCommand {
  authorId: UserId;
  centerId: CenterId;
  groupId: GroupId;
  cycleId: string;
  validFrom: Date;
  validUntil: Date;
}

export interface ReadyForReviewCommand {
  authorId: UserId;
}

export interface SubmitForReviewCommand {
  authorId: UserId;
}

export interface ApprovePlanCommand {
  approverId: UserId;
  contextId: CenterId;
  normativeVersion: string;
  curriculumVersion: string;
  templateVersion: string;
}

export interface RejectPlanCommand {
  approverId: UserId;
  reason: string;
  outcome?: ReviewOutcome;
}

export interface ReturnForCorrectionCommand {
  approverId: UserId;
  reason: string;
}

export interface AmendPlanCommand {
  authorId: UserId;
  reason: string;
}
