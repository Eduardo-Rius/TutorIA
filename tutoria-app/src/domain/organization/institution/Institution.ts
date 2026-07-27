import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { InstitutionId, TenantId } from '../../../shared/value-objects/Ids';
import { InstitutionName } from './value-objects/InstitutionName';
import { InstitutionCode } from './value-objects/InstitutionCode';
import { InstitutionStatus } from './value-objects/InstitutionStatus';
import { Clock } from '../../../shared/kernel/Clock';
import { IdGenerator } from '../shared/IdGenerator';
import { Result } from '../../../shared/result/Result';
import { InvalidInstitutionOperationError } from './errors/InvalidInstitutionOperationError';
import { InstitutionCreated } from './events/InstitutionCreated';
import { InstitutionRenamed } from './events/InstitutionRenamed';
import { InstitutionSuspended } from './events/InstitutionSuspended';
import { InstitutionReactivated } from './events/InstitutionReactivated';
import { InstitutionArchived } from './events/InstitutionArchived';

interface InstitutionProps {
  tenantId: TenantId;
  name: InstitutionName;
  code: InstitutionCode;
  status: InstitutionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Institution extends AggregateRoot<InstitutionId> {
  private _tenantId: TenantId;
  private _name: InstitutionName;
  private _code: InstitutionCode;
  private _status: InstitutionStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: InstitutionId, props: InstitutionProps) {
    super(id);
    this._tenantId = props.tenantId;
    this._name = props.name;
    this._code = props.code;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get tenantId(): TenantId { return this._tenantId; }
  public get name(): InstitutionName { return this._name; }
  public get code(): InstitutionCode { return this._code; }
  public get status(): InstitutionStatus { return this._status; }
  public get createdAt(): Date { return new Date(this._createdAt.getTime()); }
  public get updatedAt(): Date { return new Date(this._updatedAt.getTime()); }

  public static create(
    id: InstitutionId,
    tenantId: TenantId,
    name: InstitutionName,
    code: InstitutionCode,
    clock: Clock,
    idGenerator: IdGenerator
  ): Result<Institution, InvalidInstitutionOperationError> {
    const now = clock.now();
    const institution = new Institution(id, {
      tenantId,
      name,
      code,
      status: InstitutionStatus.active(),
      createdAt: now,
      updatedAt: now
    });

    institution.addDomainEvent(
      new InstitutionCreated(idGenerator.generateId(), id.toString(), tenantId.toString(), name.value, code.value, now)
    );

    return Result.ok(institution);
  }

  public static restore(
    id: InstitutionId,
    props: InstitutionProps
  ): Institution {
    return new Institution(id, props);
  }

  public rename(newName: InstitutionName, clock: Clock, idGenerator: IdGenerator): Result<void, InvalidInstitutionOperationError> {
    if (this._status.isArchived()) {
      return Result.fail(new InvalidInstitutionOperationError('Cannot rename an archived institution'));
    }
    if (this._name.equals(newName)) {
      return Result.fail(new InvalidInstitutionOperationError('New name must be different from the current name'));
    }

    const oldName = this._name.value;
    const now = clock.now();
    this._name = newName;
    this._updatedAt = now;

    this.addDomainEvent(
      new InstitutionRenamed(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), oldName, newName.value, now)
    );

    return Result.ok();
  }

  public suspend(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidInstitutionOperationError> {
    if (this._status.isSuspended()) {
      return Result.fail(new InvalidInstitutionOperationError('Institution is already suspended'));
    }
    if (this._status.isArchived()) {
      return Result.fail(new InvalidInstitutionOperationError('Cannot suspend an archived institution'));
    }

    const now = clock.now();
    this._status = InstitutionStatus.suspended();
    this._updatedAt = now;

    this.addDomainEvent(
      new InstitutionSuspended(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }

  public reactivate(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidInstitutionOperationError> {
    if (this._status.isActive()) {
      return Result.fail(new InvalidInstitutionOperationError('Institution is already active'));
    }
    if (this._status.isArchived()) {
      return Result.fail(new InvalidInstitutionOperationError('Cannot reactivate an archived institution'));
    }

    const now = clock.now();
    this._status = InstitutionStatus.active();
    this._updatedAt = now;

    this.addDomainEvent(
      new InstitutionReactivated(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }

  public archive(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidInstitutionOperationError> {
    if (this._status.isArchived()) {
      return Result.fail(new InvalidInstitutionOperationError('Institution is already archived'));
    }

    const now = clock.now();
    this._status = InstitutionStatus.archived();
    this._updatedAt = now;

    this.addDomainEvent(
      new InstitutionArchived(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }
}
