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

export type PlanningDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export interface DailyPedagogicalPlanProps {
  day: PlanningDay;
}

export class DailyPedagogicalPlan extends ValueObject<DailyPedagogicalPlanProps> {
  private constructor(props: DailyPedagogicalPlanProps) { super(props); }
  public static create(props: DailyPedagogicalPlanProps): DailyPedagogicalPlan {
    return new DailyPedagogicalPlan(props);
  }
  get day() { return this.props.day; }
}

import { Result } from '../../shared/result/Result';

import { ProvisionModality } from '../organization/daycare/value-objects/ProvisionModality';

export type PlanningInstrumentTypeEnum = 'GROUP_PLANNING';

export interface PlanningInstrumentTypeProps {
  value: PlanningInstrumentTypeEnum;
}

export class PlanningInstrumentType extends ValueObject<PlanningInstrumentTypeProps> {
  private constructor(props: PlanningInstrumentTypeProps) { super(props); }
  public static create(value: string): Result<PlanningInstrumentType> {
    if (value !== 'GROUP_PLANNING') {
      return Result.fail('Invalid instrument type. Must be GROUP_PLANNING.');
    }
    return Result.ok(new PlanningInstrumentType({ value: value as PlanningInstrumentTypeEnum }));
  }
  get value() { return this.props.value; }
}

export interface InstitutionalContractRefProps {
  provisionModality: ProvisionModality;
  instrumentType: PlanningInstrumentType;
  documentCode: string;
  contractVersion: string;
}

export class InstitutionalContractRef extends ValueObject<InstitutionalContractRefProps> {
  private constructor(props: InstitutionalContractRefProps) { super(props); }
  public static create(props: InstitutionalContractRefProps): Result<InstitutionalContractRef> {
    if (!props.documentCode || props.documentCode.trim() === '') {
      return Result.fail('Document code is required');
    }
    if (!props.contractVersion || props.contractVersion.trim() === '') {
      return Result.fail('Contract version is required');
    }
    return Result.ok(new InstitutionalContractRef({
      ...props,
      documentCode: props.documentCode.trim(),
      contractVersion: props.contractVersion.trim()
    }));
  }
  get provisionModality() { return this.props.provisionModality; }
  get instrumentType() { return this.props.instrumentType; }
  get documentCode() { return this.props.documentCode; }
  get contractVersion() { return this.props.contractVersion; }
}

export interface CurricularFrameworkRefProps {
  frameworkId: string;
  frameworkVersion: string;
}

export class CurricularFrameworkRef extends ValueObject<CurricularFrameworkRefProps> {
  private constructor(props: CurricularFrameworkRefProps) { super(props); }
  public static create(props: CurricularFrameworkRefProps): Result<CurricularFrameworkRef> {
    if (!props.frameworkId || props.frameworkId.trim() === '') {
      return Result.fail('Framework ID is required');
    }
    if (!props.frameworkVersion || props.frameworkVersion.trim() === '') {
      return Result.fail('Framework version is required');
    }
    return Result.ok(new CurricularFrameworkRef({
      ...props,
      frameworkId: props.frameworkId.trim(),
      frameworkVersion: props.frameworkVersion.trim()
    }));
  }
  get frameworkId() { return this.props.frameworkId; }
  get frameworkVersion() { return this.props.frameworkVersion; }
}


export interface PedagogicalContentProps {
  dailyPlans: ReadonlyArray<DailyPedagogicalPlan>;
}

export class PedagogicalContent extends ValueObject<PedagogicalContentProps> {
  private constructor(props: PedagogicalContentProps) { super(props); }

  public static create(dailyPlans: DailyPedagogicalPlan[]): Result<PedagogicalContent> {
    if (dailyPlans.length !== 5) {
      return Result.fail('Pedagogical content must contain exactly 5 daily plans.');
    }

    const days = dailyPlans.map(dp => dp.day);
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== 5) {
      return Result.fail('Pedagogical content must not contain duplicate days.');
    }

    const expectedDays: PlanningDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    for (const expected of expectedDays) {
      if (!uniqueDays.has(expected)) {
        return Result.fail(`Pedagogical content is missing day: ${expected}`);
      }
    }

    return Result.ok(new PedagogicalContent({ dailyPlans: Object.freeze([...dailyPlans]) as ReadonlyArray<DailyPedagogicalPlan> }));
  }

  public static createEmpty(): PedagogicalContent {
    return new PedagogicalContent({
      dailyPlans: Object.freeze([
        DailyPedagogicalPlan.create({ day: 'MONDAY' }),
        DailyPedagogicalPlan.create({ day: 'TUESDAY' }),
        DailyPedagogicalPlan.create({ day: 'WEDNESDAY' }),
        DailyPedagogicalPlan.create({ day: 'THURSDAY' }),
        DailyPedagogicalPlan.create({ day: 'FRIDAY' })
      ]) as ReadonlyArray<DailyPedagogicalPlan>
    });
  }

  get dailyPlans() { return this.props.dailyPlans; }
}
