import { EntityId } from '../ids/EntityId';
import { Result } from '../result/Result';

function createId<T extends EntityId>(
  ctor: new (id: string) => T,
  id: string
): Result<T> {
  if (!id || id.trim().length === 0) {
    return Result.fail('ID cannot be empty');
  }
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!regex.test(id)) {
    return Result.fail('Invalid UUID format');
  }
  return Result.ok(new ctor(id));
}

export class TenantId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<TenantId> { return createId(TenantId, id); }
  public static restore(id: string): TenantId { return new TenantId(id); }
}

export class UserId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<UserId> { return createId(UserId, id); }
  public static restore(id: string): UserId { return new UserId(id); }
}

export class CenterId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<CenterId> { return createId(CenterId, id); }
  public static restore(id: string): CenterId { return new CenterId(id); }
}

export class GroupId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<GroupId> { return createId(GroupId, id); }
  public static restore(id: string): GroupId { return new GroupId(id); }
}

export class ChildId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<ChildId> { return createId(ChildId, id); }
  public static restore(id: string): ChildId { return new ChildId(id); }
}

export class PlanningId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<PlanningId> { return createId(PlanningId, id); }
  public static restore(id: string): PlanningId { return new PlanningId(id); }
}

export class RecommendationId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<RecommendationId> { return createId(RecommendationId, id); }
  public static restore(id: string): RecommendationId { return new RecommendationId(id); }
}

export class ApprovalId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<ApprovalId> { return createId(ApprovalId, id); }
  public static restore(id: string): ApprovalId { return new ApprovalId(id); }
}

export class AuditId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<AuditId> { return createId(AuditId, id); }
  public static restore(id: string): AuditId { return new AuditId(id); }
}

export class InstitutionId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<InstitutionId> { return createId(InstitutionId, id); }
  public static restore(id: string): InstitutionId { return new InstitutionId(id); }
}

export class KnowledgeSourceId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<KnowledgeSourceId> { return createId(KnowledgeSourceId, id); }
  public static restore(id: string): KnowledgeSourceId { return new KnowledgeSourceId(id); }
}

export class ObservationId extends EntityId {
  public constructor(id: string) { super(id); }
  public static create(id: string): Result<ObservationId> { return createId(ObservationId, id); }
  public static restore(id: string): ObservationId { return new ObservationId(id); }
}
