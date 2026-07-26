import { EntityId } from '../ids/EntityId';
import { Result } from '../result/Result';
import { InvalidEntityIdError } from '../errors/InvalidEntityIdError';

function checkValidity(id: string): string | null {
  if (!id || id.trim().length === 0) return 'ID cannot be empty';
  if (!EntityId['isValidUUID'](id)) return 'Invalid UUID format';
  return null;
}

export class TenantId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<TenantId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('TenantId', err));
    return Result.ok(new TenantId(id));
  }
  public static restore(id: string): TenantId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('TenantId', err);
    return new TenantId(id);
  }
}

export class UserId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<UserId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('UserId', err));
    return Result.ok(new UserId(id));
  }
  public static restore(id: string): UserId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('UserId', err);
    return new UserId(id);
  }
}

export class CenterId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<CenterId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('CenterId', err));
    return Result.ok(new CenterId(id));
  }
  public static restore(id: string): CenterId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('CenterId', err);
    return new CenterId(id);
  }
}

export class GroupId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<GroupId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('GroupId', err));
    return Result.ok(new GroupId(id));
  }
  public static restore(id: string): GroupId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('GroupId', err);
    return new GroupId(id);
  }
}

export class ChildId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<ChildId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('ChildId', err));
    return Result.ok(new ChildId(id));
  }
  public static restore(id: string): ChildId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('ChildId', err);
    return new ChildId(id);
  }
}

export class PlanningId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<PlanningId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('PlanningId', err));
    return Result.ok(new PlanningId(id));
  }
  public static restore(id: string): PlanningId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('PlanningId', err);
    return new PlanningId(id);
  }
}

export class RecommendationId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<RecommendationId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('RecommendationId', err));
    return Result.ok(new RecommendationId(id));
  }
  public static restore(id: string): RecommendationId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('RecommendationId', err);
    return new RecommendationId(id);
  }
}

export class ApprovalId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<ApprovalId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('ApprovalId', err));
    return Result.ok(new ApprovalId(id));
  }
  public static restore(id: string): ApprovalId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('ApprovalId', err);
    return new ApprovalId(id);
  }
}

export class AuditId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<AuditId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('AuditId', err));
    return Result.ok(new AuditId(id));
  }
  public static restore(id: string): AuditId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('AuditId', err);
    return new AuditId(id);
  }
}

export class InstitutionId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<InstitutionId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('InstitutionId', err));
    return Result.ok(new InstitutionId(id));
  }
  public static restore(id: string): InstitutionId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('InstitutionId', err);
    return new InstitutionId(id);
  }
}

export class KnowledgeSourceId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<KnowledgeSourceId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('KnowledgeSourceId', err));
    return Result.ok(new KnowledgeSourceId(id));
  }
  public static restore(id: string): KnowledgeSourceId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('KnowledgeSourceId', err);
    return new KnowledgeSourceId(id);
  }
}

export class ObservationId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<ObservationId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('ObservationId', err));
    return Result.ok(new ObservationId(id));
  }
  public static restore(id: string): ObservationId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('ObservationId', err);
    return new ObservationId(id);
  }
}

export class EvaluationId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<EvaluationId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('EvaluationId', err));
    return Result.ok(new EvaluationId(id));
  }
  public static restore(id: string): EvaluationId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('EvaluationId', err);
    return new EvaluationId(id);
  }
}

export class RoomId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(id: string): Result<RoomId, InvalidEntityIdError> {
    const err = checkValidity(id);
    if (err) return Result.fail(new InvalidEntityIdError('RoomId', err));
    return Result.ok(new RoomId(id));
  }
  public static restore(id: string): RoomId {
    const err = checkValidity(id);
    if (err) throw new InvalidEntityIdError('RoomId', err);
    return new RoomId(id);
  }
}
