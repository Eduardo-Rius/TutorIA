import { describe, it, expect } from 'vitest';
import { Group } from '../Group';
import { GroupName } from '../value-objects/GroupName';
import { GroupCode } from '../value-objects/GroupCode';
import { DevelopmentStage } from '../value-objects/DevelopmentStage';
import { AcademicCycle } from '../value-objects/AcademicCycle';
import { GroupCapacity } from '../value-objects/GroupCapacity';
import { GroupId, InstitutionId, CenterId, TenantId } from '../../../../shared/value-objects/Ids';
import { Clock } from '../../../../shared/kernel/Clock';
import { IdGenerator } from '../../shared/IdGenerator';
import { InvalidGroupOperationError } from '../errors/GroupErrors';

import { GroupCreated } from '../events/GroupCreated';
import { GroupRenamed } from '../events/GroupRenamed';
import { GroupCapacityChanged } from '../events/GroupCapacityChanged';
import { GroupSuspended } from '../events/GroupSuspended';
import { GroupReactivated } from '../events/GroupReactivated';
import { AcademicCycleClosed } from '../events/AcademicCycleClosed';
import { AcademicCycleStarted } from '../events/AcademicCycleStarted';
import { GroupArchived } from '../events/GroupArchived';

class MockClock implements Clock {
  now(): Date {
    return new Date('2026-01-01T12:00:00Z');
  }
}

class MockIdGenerator implements IdGenerator {
  generateId(): string {
    return 'event-group-123';
  }
}

describe('Group Aggregate', () => {
  const clock = new MockClock();
  const idGen = new MockIdGenerator();
  const groupId = GroupId.create('550e8400-e29b-41d4-a716-446655440010').getValue();
  const instId = InstitutionId.create('550e8400-e29b-41d4-a716-446655440001').getValue();
  const centerId = CenterId.create('550e8400-e29b-41d4-a716-446655440003').getValue();
  const tenantId = TenantId.create('550e8400-e29b-41d4-a716-446655440002').getValue();

  const createValidGroup = () => {
    const name = GroupName.create('Lactantes A').getValue();
    const code = GroupCode.create('L-A-2026').getValue();
    const stage = DevelopmentStage.create('INFANTS').getValue();
    const cycle = AcademicCycle.create('2026-2027').getValue();
    
    return Group.create(
      groupId, tenantId, instId, centerId,
      name, code, stage, 15, cycle,
      clock, idGen
    ).getValue();
  };

  it('should create a valid group and generate GroupCreated', () => {
    const group = createValidGroup();

    expect(group.name.value).toBe('Lactantes A');
    expect(group.code.value).toBe('L-A-2026');
    expect(group.stage.value).toBe('INFANTS');
    expect(group.cycle.value).toBe('2026-2027');
    expect(group.capacity.maxSeats).toBe(15);
    expect(group.capacity.occupiedSeats).toBe(0);
    expect(group.status.isActive()).toBe(true);
    
    const events = group.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(GroupCreated);
    expect(events[0]!.eventId).toBe('event-group-123');
    expect(events[0]!.metadata.tenantId).toBe(tenantId.toString());
  });

  it('should rename and generate GroupRenamed', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    const newName = GroupName.create('Lactantes A+').getValue();
    const renameRes = group.rename(newName, clock, idGen);
    
    expect(renameRes.isSuccess).toBe(true);
    expect(group.name.value).toBe('Lactantes A+');

    const events = group.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(GroupRenamed);
    expect((events[0] as GroupRenamed).oldName).toBe('Lactantes A');
  });

  it('should fail to rename to the same name', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    const newName = GroupName.create('Lactantes A').getValue();
    const renameRes = group.rename(newName, clock, idGen);
    
    expect(renameRes.isFailure).toBe(true);
  });

  it('should update max capacity', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    const changeRes = group.changeCapacity(20, clock, idGen);
    expect(changeRes.isSuccess).toBe(true);
    expect(group.capacity.maxSeats).toBe(20);

    const events = group.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(GroupCapacityChanged);
    expect((events[0] as GroupCapacityChanged).newMaxSeats).toBe(20);
  });

  it('should reject max capacity lower than occupied seats', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    group.updateOccupancy(10, clock, idGen);
    group.pullDomainEvents();

    const changeRes = group.changeCapacity(5, clock, idGen);
    expect(changeRes.isFailure).toBe(true);
    expect(changeRes.error!).toBeInstanceOf(InvalidGroupOperationError);
  });

  it('should update occupancy', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    const updateRes = group.updateOccupancy(5, clock, idGen);
    expect(updateRes.isSuccess).toBe(true);
    expect(group.capacity.occupiedSeats).toBe(5);

    const events = group.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(GroupCapacityChanged);
    expect((events[0] as GroupCapacityChanged).newOccupiedSeats).toBe(5);
  });

  it('should reject occupancy exceeding max seats', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    const updateRes = group.updateOccupancy(20, clock, idGen); // max is 15
    expect(updateRes.isFailure).toBe(true);
    expect(group.capacity.occupiedSeats).toBe(0);
  });

  it('should suspend and reactivate', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    group.suspend(clock, idGen);
    expect(group.status.isSuspended()).toBe(true);
    expect(group.pullDomainEvents()[0]!).toBeInstanceOf(GroupSuspended);

    group.reactivate(clock, idGen);
    expect(group.status.isActive()).toBe(true);
    expect(group.pullDomainEvents()[0]!).toBeInstanceOf(GroupReactivated);
  });

  it('should close academic cycle and start a new one', () => {
    const group = createValidGroup();
    group.updateOccupancy(15, clock, idGen);
    group.pullDomainEvents();

    const closeRes = group.closeAcademicCycle(clock, idGen);
    expect(closeRes.isSuccess).toBe(true);
    expect(group.status.isClosed()).toBe(true);
    expect(group.pullDomainEvents()[0]!).toBeInstanceOf(AcademicCycleClosed);

    const newCycle = AcademicCycle.create('2027-2028').getValue();
    const startRes = group.startNewAcademicCycle(newCycle, clock, idGen);
    
    expect(startRes.isSuccess).toBe(true);
    expect(group.status.isActive()).toBe(true);
    expect(group.cycle.value).toBe('2027-2028');
    expect(group.capacity.occupiedSeats).toBe(0); // Occupancy is reset for new cycle
    
    expect(group.pullDomainEvents()[0]!).toBeInstanceOf(AcademicCycleStarted);
  });

  it('should reject starting new cycle if group is not closed', () => {
    const group = createValidGroup();
    const newCycle = AcademicCycle.create('2027-2028').getValue();
    const startRes = group.startNewAcademicCycle(newCycle, clock, idGen);
    
    expect(startRes.isFailure).toBe(true);
  });

  it('should archive and prevent any further mutation', () => {
    const group = createValidGroup();
    group.pullDomainEvents();

    group.archive(clock, idGen);
    expect(group.status.isArchived()).toBe(true);
    expect(group.pullDomainEvents()[0]!).toBeInstanceOf(GroupArchived);

    expect(group.rename(GroupName.create('New').getValue(), clock, idGen).isFailure).toBe(true);
    expect(group.changeCapacity(20, clock, idGen).isFailure).toBe(true);
    expect(group.updateOccupancy(5, clock, idGen).isFailure).toBe(true);
    expect(group.suspend(clock, idGen).isFailure).toBe(true);
    expect(group.closeAcademicCycle(clock, idGen).isFailure).toBe(true);
  });

  it('should correctly handle value objects validation', () => {
    expect(DevelopmentStage.create('INVALID').isFailure).toBe(true);
    expect(AcademicCycle.create('2026-2028').isFailure).toBe(true); // non-consecutive
    expect(AcademicCycle.create('invalid').isFailure).toBe(true);
  });

  it('should not mutate internal dates', () => {
    const group = createValidGroup();
    const createdAtCopy = group.createdAt;
    createdAtCopy.setFullYear(2030);
    expect(group.createdAt.getFullYear()).toBe(2026);
  });
});
