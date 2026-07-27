import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { GroupId, InstitutionId, CenterId, TenantId } from '../../../shared/value-objects/Ids';
import { GroupName } from './value-objects/GroupName';
import { GroupCode } from './value-objects/GroupCode';
import { DevelopmentStage } from './value-objects/DevelopmentStage';
import { AcademicCycle } from './value-objects/AcademicCycle';
import { GroupCapacity } from './value-objects/GroupCapacity';
import { GroupStatus } from './value-objects/GroupStatus';
import { Clock } from '../../../shared/kernel/Clock';
import { IdGenerator } from '../shared/IdGenerator';
import { Result } from '../../../shared/result/Result';
import { InvalidGroupOperationError } from './errors/GroupErrors';

import { GroupCreated } from './events/GroupCreated';
import { GroupRenamed } from './events/GroupRenamed';
import { GroupCapacityChanged } from './events/GroupCapacityChanged';
import { GroupSuspended } from './events/GroupSuspended';
import { GroupReactivated } from './events/GroupReactivated';
import { AcademicCycleClosed } from './events/AcademicCycleClosed';
import { AcademicCycleStarted } from './events/AcademicCycleStarted';
import { GroupArchived } from './events/GroupArchived';

interface GroupProps {
  tenantId: TenantId;
  institutionId: InstitutionId;
  centerId: CenterId;
  name: GroupName;
  code: GroupCode;
  stage: DevelopmentStage;
  cycle: AcademicCycle;
  capacity: GroupCapacity;
  status: GroupStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Group extends AggregateRoot<GroupId> {
  private _tenantId: TenantId;
  private _institutionId: InstitutionId;
  private _centerId: CenterId;
  private _name: GroupName;
  private _code: GroupCode;
  private _stage: DevelopmentStage;
  private _cycle: AcademicCycle;
  private _capacity: GroupCapacity;
  private _status: GroupStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: GroupId, props: GroupProps) {
    super(id);
    this._tenantId = props.tenantId;
    this._institutionId = props.institutionId;
    this._centerId = props.centerId;
    this._name = props.name;
    this._code = props.code;
    this._stage = props.stage;
    this._cycle = props.cycle;
    this._capacity = props.capacity;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get tenantId(): TenantId { return this._tenantId; }
  public get institutionId(): InstitutionId { return this._institutionId; }
  public get centerId(): CenterId { return this._centerId; }
  public get name(): GroupName { return this._name; }
  public get code(): GroupCode { return this._code; }
  public get stage(): DevelopmentStage { return this._stage; }
  public get cycle(): AcademicCycle { return this._cycle; }
  public get capacity(): GroupCapacity { return this._capacity; }
  public get status(): GroupStatus { return this._status; }
  public get createdAt(): Date { return new Date(this._createdAt.getTime()); }
  public get updatedAt(): Date { return new Date(this._updatedAt.getTime()); }

  public static create(
    id: GroupId,
    tenantId: TenantId,
    institutionId: InstitutionId,
    centerId: CenterId,
    name: GroupName,
    code: GroupCode,
    stage: DevelopmentStage,
    maxSeats: number,
    cycle: AcademicCycle,
    clock: Clock,
    idGenerator: IdGenerator
  ): Result<Group, InvalidGroupOperationError> {
    const capacityRes = GroupCapacity.create(maxSeats, 0);
    if (capacityRes.isFailure) {
      return Result.fail(new InvalidGroupOperationError(capacityRes.error!.message));
    }

    const now = clock.now();
    const group = new Group(id, {
      tenantId,
      institutionId,
      centerId,
      name,
      code,
      stage,
      cycle,
      capacity: capacityRes.getValue(),
      status: GroupStatus.active(),
      createdAt: now,
      updatedAt: now
    });

    group.addDomainEvent(
      new GroupCreated(
        idGenerator.generateId(),
        id.toString(),
        tenantId.toString(),
        institutionId.toString(),
        centerId.toString(),
        name.value,
        code.value,
        stage.value,
        maxSeats,
        cycle.value,
        now
      )
    );

    return Result.ok(group);
  }

  public static restore(
    id: GroupId,
    props: GroupProps
  ): Group {
    return new Group(id, props);
  }

  public rename(newName: GroupName, clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
    if (this._status.isArchived()) {
      return Result.fail(new InvalidGroupOperationError('Cannot rename an archived group'));
    }
    if (this._name.equals(newName)) {
      return Result.fail(new InvalidGroupOperationError('New name must be different from the current name'));
    }

    const oldName = this._name.value;
    const now = clock.now();
    this._name = newName;
    this._updatedAt = now;

    this.addDomainEvent(
      new GroupRenamed(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), oldName, newName.value, now)
    );

    return Result.ok();
  }

  public changeCapacity(newMaxSeats: number, clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
    if (this._status.isArchived()) {
      return Result.fail(new InvalidGroupOperationError('Cannot change capacity of an archived group'));
    }
    
    if (newMaxSeats === this._capacity.maxSeats) {
        return Result.ok();
    }

    const capacityRes = GroupCapacity.create(newMaxSeats, this._capacity.occupiedSeats);
    if (capacityRes.isFailure) {
      return Result.fail(new InvalidGroupOperationError(capacityRes.error!.message));
    }

    const oldCapacity = this._capacity;
    const now = clock.now();
    this._capacity = capacityRes.getValue();
    this._updatedAt = now;

    this.addDomainEvent(
      new GroupCapacityChanged(
        idGenerator.generateId(),
        this.id.toString(),
        this._tenantId.toString(),
        oldCapacity.maxSeats,
        newMaxSeats,
        oldCapacity.occupiedSeats,
        oldCapacity.occupiedSeats,
        now
      )
    );

    return Result.ok();
  }

  public updateOccupancy(newOccupancy: number, clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
     if (this._status.isArchived() || this._status.isClosed()) {
        return Result.fail(new InvalidGroupOperationError('Cannot update occupancy of an archived or closed group'));
     }
     
     if (newOccupancy === this._capacity.occupiedSeats) {
         return Result.ok();
     }

     const capacityRes = GroupCapacity.create(this._capacity.maxSeats, newOccupancy);
     if (capacityRes.isFailure) {
         return Result.fail(new InvalidGroupOperationError(capacityRes.error!.message));
     }

     const oldCapacity = this._capacity;
     const now = clock.now();
     this._capacity = capacityRes.getValue();
     this._updatedAt = now;

     this.addDomainEvent(
        new GroupCapacityChanged(
          idGenerator.generateId(),
          this.id.toString(),
          this._tenantId.toString(),
          oldCapacity.maxSeats,
          oldCapacity.maxSeats,
          oldCapacity.occupiedSeats,
          newOccupancy,
          now
        )
      );
  
      return Result.ok();
  }

  public suspend(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
    if (this._status.isSuspended()) {
      return Result.fail(new InvalidGroupOperationError('Group is already suspended'));
    }
    if (this._status.isClosed() || this._status.isArchived()) {
      return Result.fail(new InvalidGroupOperationError('Cannot suspend a closed or archived group'));
    }

    const now = clock.now();
    this._status = GroupStatus.suspended();
    this._updatedAt = now;

    this.addDomainEvent(
      new GroupSuspended(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }

  public reactivate(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
    if (this._status.isActive()) {
      return Result.fail(new InvalidGroupOperationError('Group is already active'));
    }
    if (this._status.isClosed() || this._status.isArchived()) {
      return Result.fail(new InvalidGroupOperationError('Cannot reactivate a closed or archived group'));
    }

    const now = clock.now();
    this._status = GroupStatus.active();
    this._updatedAt = now;

    this.addDomainEvent(
      new GroupReactivated(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }

  public closeAcademicCycle(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
    if (this._status.isClosed()) {
      return Result.fail(new InvalidGroupOperationError('Group academic cycle is already closed'));
    }
    if (this._status.isArchived()) {
      return Result.fail(new InvalidGroupOperationError('Cannot close academic cycle of an archived group'));
    }

    const now = clock.now();
    this._status = GroupStatus.closed();
    this._updatedAt = now;

    this.addDomainEvent(
      new AcademicCycleClosed(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), this._cycle.value, now)
    );

    return Result.ok();
  }

  public startNewAcademicCycle(newCycle: AcademicCycle, clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
    if (!this._status.isClosed()) {
        return Result.fail(new InvalidGroupOperationError('Cannot start a new academic cycle if the group is not closed'));
    }
    if (this._cycle.equals(newCycle)) {
        return Result.fail(new InvalidGroupOperationError('New academic cycle must be different from the previous one'));
    }

    const now = clock.now();
    this._cycle = newCycle;
    this._status = GroupStatus.active();
    this._capacity = GroupCapacity.create(this._capacity.maxSeats, 0).getValue(); // Reset occupancy
    this._updatedAt = now;

    this.addDomainEvent(
        new AcademicCycleStarted(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), newCycle.value, now)
    );

    return Result.ok();
  }

  public archive(clock: Clock, idGenerator: IdGenerator): Result<void, InvalidGroupOperationError> {
    if (this._status.isArchived()) {
      return Result.fail(new InvalidGroupOperationError('Group is already archived'));
    }

    const now = clock.now();
    this._status = GroupStatus.archived();
    this._updatedAt = now;

    this.addDomainEvent(
      new GroupArchived(idGenerator.generateId(), this.id.toString(), this._tenantId.toString(), now)
    );

    return Result.ok();
  }
}
