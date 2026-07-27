import { SystemClock } from '../../shared/kernel/Clock';
import { UserId, CenterId } from '../../shared/value-objects/Ids';
import { ValueObject } from '../../shared/kernel/ValueObject';

export interface PlanningSnapshotProps {
  normativeVersion: string;
  curriculumVersion: string;
  templateVersion: string;
  frozenAt: Date;
}

export class PlanningSnapshot extends ValueObject<PlanningSnapshotProps> {
  private constructor(props: PlanningSnapshotProps) {
    super(props);
  }

  public static create(props: PlanningSnapshotProps): PlanningSnapshot {
    return new PlanningSnapshot(props);
  }

  get normativeVersion() { return this.props.normativeVersion; }
  get curriculumVersion() { return this.props.curriculumVersion; }
  get templateVersion() { return this.props.templateVersion; }
  get frozenAt() { return this.props.frozenAt; }
}

export interface ReviewOutcomeProps {
  score: number;
  findings: string[];
  recommendations: string[];
  blockingIssues: string[];
  warnings: string[];
  generatedAt: Date;
  reviewProvider: string;
}

export class ReviewOutcome extends ValueObject<ReviewOutcomeProps> {
  private constructor(props: ReviewOutcomeProps) {
    super(props);
  }

  public static create(props: ReviewOutcomeProps): ReviewOutcome {
    return new ReviewOutcome(props);
  }

  get hasBlockingIssues() { return this.props.blockingIssues.length > 0; }
  get blockingIssues() { return this.props.blockingIssues; }
  get findings() { return this.props.findings; }
  get recommendations() { return this.props.recommendations; }
}

export interface RejectionReasonProps {
  reason: string;
  returnedAt: Date;
  reviewerId: UserId;
  outcome?: ReviewOutcome;
}

export class RejectionReason extends ValueObject<RejectionReasonProps> {
  private constructor(props: RejectionReasonProps) {
    super(props);
  }
  public static create(props: RejectionReasonProps): RejectionReason {
    return new RejectionReason(props);
  }
}

export interface SignatureProps {
  signerId: UserId;
  signedAt: Date;
  contextId: CenterId;
  cryptographicHash?: string;
}

export class AuthorSignature extends ValueObject<SignatureProps> {
  private constructor(props: SignatureProps) { super(props); }
  public static create(props: SignatureProps): AuthorSignature {
    return new AuthorSignature(props);
  }
  get signerId() { return this.props.signerId; }
}

export class ApprovalSignature extends ValueObject<SignatureProps> {
  private constructor(props: SignatureProps) { super(props); }
  public static create(props: SignatureProps): ApprovalSignature {
    return new ApprovalSignature(props);
  }
  get signerId() { return this.props.signerId; }
}
