import { AggregateRoot } from '../../shared/kernel/AggregateRoot';
import { TenantId } from '../../shared/value-objects/Ids';
import { TenantName } from './value-objects/TenantName';
import { TenantStatus } from './value-objects/TenantStatus';
import { Clock } from '../../shared/kernel/Clock';
import { Result } from '../../shared/result/Result';
import { DomainError } from '../../shared/errors/DomainError';
import { TenantCreated } from './events/TenantCreated';
import { TenantSuspended } from './events/TenantSuspended';
import { TenantReactivated } from './events/TenantReactivated';
import { TenantRenamed } from './events/TenantRenamed';

export class InvalidTenantOperationError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid operation on Tenant: ${cause}`, 'INVALID_TENANT_OPERATION');
  }
}

interface TenantProps {
  name: TenantName;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant extends AggregateRoot<TenantId> {
  private _name: TenantName;
  private _status: TenantStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: TenantId,
    props: TenantProps
  ) {
    super(id);
    this._name = props.name;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get name(): TenantName {
    return this._name;
  }

  public get status(): TenantStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(
    id: TenantId,
    name: TenantName,
    clock: Clock
  ): Result<Tenant, InvalidTenantOperationError> {
    const now = clock.now();
    const tenant = new Tenant(id, {
      name,
      status: TenantStatus.active(),
      createdAt: now,
      updatedAt: now
    });

    tenant.addDomainEvent(new TenantCreated(id.toString(), name.value, now));
    return Result.ok(tenant);
  }

  public suspend(clock: Clock): Result<void, InvalidTenantOperationError> {
    if (this._status.isSuspended()) {
      return Result.fail(new InvalidTenantOperationError('Tenant is already suspended'));
    }
    if (this._status.isArchived()) {
      return Result.fail(new InvalidTenantOperationError('Cannot suspend an archived tenant'));
    }

    const now = clock.now();
    this._status = TenantStatus.suspended();
    this._updatedAt = now;

    this.addDomainEvent(new TenantSuspended(this.id.toString(), now));
    return Result.ok();
  }

  public reactivate(clock: Clock): Result<void, InvalidTenantOperationError> {
    if (this._status.isActive()) {
      return Result.fail(new InvalidTenantOperationError('Tenant is already active'));
    }
    if (this._status.isArchived()) {
      return Result.fail(new InvalidTenantOperationError('Cannot reactivate an archived tenant'));
    }

    const now = clock.now();
    this._status = TenantStatus.active();
    this._updatedAt = now;

    this.addDomainEvent(new TenantReactivated(this.id.toString(), now));
    return Result.ok();
  }

  public rename(newName: TenantName, clock: Clock): Result<void, InvalidTenantOperationError> {
    if (this._status.isArchived()) {
      return Result.fail(new InvalidTenantOperationError('Cannot rename an archived tenant'));
    }
    if (this._name.equals(newName)) {
      return Result.fail(new InvalidTenantOperationError('New name must be different from the current name'));
    }

    const oldName = this._name.value;
    const now = clock.now();

    this._name = newName;
    this._updatedAt = now;

    this.addDomainEvent(new TenantRenamed(this.id.toString(), oldName, newName.value, now));
    return Result.ok();
  }
}
