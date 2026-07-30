import { SystemClock } from '../../shared/kernel/Clock';
import { AggregateRoot } from '../../shared/kernel/AggregateRoot';
import { PlanningId, UserId, CenterId, GroupId } from '../../shared/value-objects/Ids';
import { PlanStatus } from './PlanStatus';
import { PlanningVersion } from './Entities';
import { AuthorSignature, ApprovalSignature, PlanningSnapshot, RejectionReason } from './ValueObjects';
import { PlanCreated, PlanReadyForReview, PlanSubmittedForReview, PlanApproved, PlanRejected, PlanReturnedForCorrection, PlanAmended } from './Events';
import { ApprovePlanCommand, RejectPlanCommand, ReturnForCorrectionCommand, AmendPlanCommand } from './Commands';
import { Result } from '../../shared/result/Result';

export class PedagogicalPlan extends AggregateRoot<PlanningId> {
  public centerId: CenterId;
  public groupId: GroupId;
  public cycleId: string;
  public validFrom: Date;
  public validUntil: Date;
  public status: PlanStatus;
  public activeVersion: PlanningVersion;
  public authorSignature?: AuthorSignature | undefined;
  public approvalSignature?: ApprovalSignature | undefined;
  public snapshot?: PlanningSnapshot | undefined;
  public rejectionReason?: RejectionReason | undefined;
  public versionHistory: PlanningVersion[];

  private constructor(id: PlanningId, centerId: CenterId, groupId: GroupId, cycleId: string, validFrom: Date, validUntil: Date) {
    super(id);
    this.centerId = centerId;
    this.groupId = groupId;
    this.cycleId = cycleId;
    this.validFrom = validFrom;
    this.validUntil = validUntil;
    this.status = PlanStatus.DRAFT;
    this.activeVersion = PlanningVersion.create('v1');
    this.versionHistory = [];
  }

  public static create(
    authorId: UserId,
    centerId: CenterId,
    groupId: GroupId,
    cycleId: string,
    validFrom: Date,
    validUntil: Date,
    idStr?: string
  ): PedagogicalPlan {
    const idResult = idStr ? PlanningId.restore(idStr) : PlanningId.restore(crypto.randomUUID());

    const plan = new PedagogicalPlan(idResult, centerId, groupId, cycleId, validFrom, validUntil);
    plan.authorSignature = AuthorSignature.create({
      signerId: authorId,
      signedAt: new SystemClock().now(),
      contextId: centerId
    });

    plan.addDomainEvent(new PlanCreated(plan.id.toString(), authorId.toString()));
    return plan;
  }

  get authorId() { return this.authorSignature?.signerId; }

  // Commands Implementation
  public readyForReview(authorId: UserId): Result<void> {
    if (this.status !== PlanStatus.DRAFT && this.status !== PlanStatus.RETURNED_FOR_CORRECTION && this.status !== PlanStatus.REJECTED) {
      return Result.fail('Plan cannot be marked ready for review in its current state.');
    }
    if (!this.authorId?.equals(authorId)) {
      return Result.fail('Only the author can mark the plan as ready for review.');
    }
    this.status = PlanStatus.READY_FOR_REVIEW;
    this.addDomainEvent(new PlanReadyForReview(this.id.toString(), this.activeVersion.versionId, authorId.toString()));
    return Result.ok();
  }

  public submitForReview(): Result<void> {
    if (this.status !== PlanStatus.READY_FOR_REVIEW) {
      return Result.fail('Plan must be ready for review before submitting.');
    }
    this.status = PlanStatus.UNDER_REVIEW;
    this.addDomainEvent(new PlanSubmittedForReview(this.id.toString(), this.centerId.toString()));
    return Result.ok();
  }

  public approve(command: ApprovePlanCommand): Result<void> {
    if (this.status !== PlanStatus.UNDER_REVIEW) {
      return Result.fail('Plan is not under review.');
    }

    // SoD Check
    if (this.authorId?.equals(command.approverId)) {
      return Result.fail('Separation of Duties (SoD) violated: Author cannot approve their own plan.');
    }

    this.status = PlanStatus.APPROVED;
    this.approvalSignature = ApprovalSignature.create({
      signerId: command.approverId,
      signedAt: new SystemClock().now(),
      contextId: command.contextId
    });

    this.snapshot = PlanningSnapshot.create({
      normativeVersion: command.normativeVersion,
      curriculumVersion: command.curriculumVersion,
      templateVersion: command.templateVersion,
      frozenAt: new SystemClock().now()
    });

    this.addDomainEvent(new PlanApproved(this.id.toString(), command.approverId.toString()));
    return Result.ok();
  }

  public reject(command: RejectPlanCommand): Result<void> {
    if (this.status !== PlanStatus.UNDER_REVIEW) {
      return Result.fail('Plan is not under review.');
    }

    if (this.authorId?.equals(command.approverId)) {
      return Result.fail('Author cannot reject their own plan.');
    }

    this.status = PlanStatus.REJECTED;
    const reasonProps = {
      reason: command.reason,
      returnedAt: new SystemClock().now(),
      reviewerId: command.approverId,
      ...(command.outcome ? { outcome: command.outcome } : {})
    };

    this.rejectionReason = RejectionReason.create(reasonProps);

    this.addDomainEvent(new PlanRejected(this.id.toString(), command.approverId.toString(), command.reason));
    return Result.ok();
  }

  public returnForCorrection(command: ReturnForCorrectionCommand): Result<void> {
    if (this.status !== PlanStatus.UNDER_REVIEW) {
      return Result.fail('Plan is not under review.');
    }

    this.status = PlanStatus.RETURNED_FOR_CORRECTION;
    this.rejectionReason = RejectionReason.create({
      reason: command.reason,
      returnedAt: new SystemClock().now(),
      reviewerId: command.approverId
    });

    this.addDomainEvent(new PlanReturnedForCorrection(this.id.toString(), command.approverId.toString(), command.reason));
    return Result.ok();
  }

  public amend(command: AmendPlanCommand): Result<void> {
    if (this.status !== PlanStatus.APPROVED) {
      return Result.fail('Only approved plans can be amended.');
    }
    if (!this.authorId?.equals(command.authorId)) {
      return Result.fail('Only the original author can amend a plan.');
    }

    this.versionHistory.push(this.activeVersion);
    const newVersionNumber = this.versionHistory.length + 1;
    this.activeVersion = this.activeVersion.cloneForAmendment(`v${newVersionNumber}`);

    this.status = PlanStatus.DRAFT;
    this.approvalSignature = undefined;
    this.snapshot = undefined;
    this.rejectionReason = undefined;

    this.addDomainEvent(new PlanAmended(this.id.toString(), this.activeVersion.versionId));
    return Result.ok();
  }
}
