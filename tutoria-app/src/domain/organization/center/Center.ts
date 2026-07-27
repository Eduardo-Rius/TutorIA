import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { CenterId, InstitutionId, TenantId } from '../../../shared/value-objects/Ids';
import { CenterName } from './value-objects/CenterName';
import { CenterCode } from './value-objects/CenterCode';
import { CenterStatus } from './value-objects/CenterStatus';
import { Clock } from '../../../shared/kernel/Clock';
import { IdGenerator } from '../shared/IdGenerator';
import { Result } from '../../../shared/result/Result';
import { InvalidCenterOperationError } from './errors/InvalidCenterOperationError';
import { CenterCreated } from './events/CenterCreated';
import { CenterRenamed } from './events/CenterRenamed';
import { CenterSuspended } from './events/CenterSuspended';
import { CenterReactivated } from './events/CenterReactivated';
import { CenterClosed } from './events/CenterClosed';

interface CenterProps {
  tenantId: TenantId;
  institutionId: InstitutionId;
  name: CenterName;
  code: CenterCode;
  status: CenterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Center extends AggregateRoot<CenterId> {
  private _tenantId: TenantId;
  private _institutionId: InstitutionId;
  private _name: CenterName;
  private _code: CenterCode;
  private _status: CenterStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: CenterId, props: CenterProps) {
    super(id);
    this._tenantId = props.tenantId;
    this._institutionId = props.institutionId;
    this._name = props.name;
    this._code = props.code;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get tenantId(): TenantId { return this._tenantId; }
  public get institutionId(): InstitutionId { return this._institutionId; }
  public get name(): CenterName { return this._name; }
  public get code(): CenterCode { return this._code; }
  public get status(): CenterStatus { return this._status; }
  public get createdAt(): Date { return new Date(this._createdAt.getTime()); }
  public get updatedAt(): Date { return new Date(this._updatedAt.getTime()); }

  public static create(
    id: CenterId,
    tenantId: TenantId,
    institutionId: InstitutionId,
    name: CenterName,
    code: CenterCode,
    clock: Clock,
    idGenerator: IdGenerator
  ): Result<Center, InvalidCenterOperationError> {
    const now = clock.now();
    const center = new Center(id, {
      tenantId,
      institutionId,
      name,
      code,
      status: CenterStatus.active(),
      createdAt: now,
      updatedAt: now
    });

    center.addDomainEvent(
      new CenterCreated(idGenerator.generateId(), id.toString(), tenantId.toString(), institutionId.toString(), name.value, code.value, now)
    );

    return Result.ok(center);
  }

  public static restore(
    id: CenterId,
    props: CenterProps
  ): Center {
    return new Center(id, props);
  }

  public rename(newName: CenterName, clock: Clock, idGenerator: IdGenerator): Result<void, InvalidCenterOperationError> {
    if (this._status.isClosed() || this._status.isArchived()) {
      return Result.fail(new InvalidCenterOperationError('Cannot rename a closed or archived center'));
    }
    if (this._name.equals(newName)) {
      return Result.fail(new InvalidCenterOperationError('New name must be different from the current name'));
    }

    const oldName = this._name.value;
    const now = clock.now();
    this._name = newName;
    this._updatedAt = now;

    this.addDomainEvent(
      new CenterRenamed(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), oldName, newName.value, now)
    );

    return Result.ok();
  }

  public suspend(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidCenterOperationError> {
    if (this._status.isSuspended()) {
      return Result.fail(new InvalidCenterOperationError('Center is already suspended'));
    }
    if (this._status.isClosed() || this._status.isArchived()) {
      return Result.fail(new InvalidCenterOperationError('Cannot suspend a closed or archived center'));
    }

    const now = clock.now();
    this._status = CenterStatus.suspended();
    this._updatedAt = now;

    this.addDomainEvent(
      new CenterSuspended(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }

  public reactivate(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidCenterOperationError> {
    if (this._status.isActive()) {
      return Result.fail(new InvalidCenterOperationError('Center is already active'));
    }
    if (this._status.isClosed() || this._status.isArchived()) {
      return Result.fail(new InvalidCenterOperationError('Cannot reactivate a closed or archived center'));
    }

    const now = clock.now();
    this._status = CenterStatus.active();
    this._updatedAt = now;

    this.addDomainEvent(
      new CenterReactivated(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }

  public close(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidCenterOperationError> {
    if (this._status.isClosed()) {
      return Result.fail(new InvalidCenterOperationError('Center is already closed'));
    }
    if (this._status.isArchived()) {
      return Result.fail(new InvalidCenterOperationError('Cannot close an archived center'));
    }

    const now = clock.now();
    this._status = CenterStatus.closed();
    this._updatedAt = now;

    this.addDomainEvent(
      new CenterClosed(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }
}
