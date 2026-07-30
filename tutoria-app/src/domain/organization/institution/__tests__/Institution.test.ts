import { describe, it, expect } from 'vitest';
import { Institution } from '../Institution';
import { InstitutionName } from '../value-objects/InstitutionName';
import { InstitutionCode } from '../value-objects/InstitutionCode';
import { InstitutionId, TenantId } from '../../../../shared/value-objects/Ids';
import { Clock } from '../../../../shared/kernel/Clock';
import { IdGenerator } from '../../shared/IdGenerator';
import { InstitutionCreated } from '../events/InstitutionCreated';
import { InstitutionSuspended } from '../events/InstitutionSuspended';
import { InstitutionReactivated } from '../events/InstitutionReactivated';
import { InstitutionArchived } from '../events/InstitutionArchived';
import { InstitutionRenamed } from '../events/InstitutionRenamed';
import { InvalidInstitutionOperationError } from '../errors/InvalidInstitutionOperationError';

class MockClock implements Clock {
  now(): Date {
    return new Date('2026-01-01T12:00:00Z');
  }
}

class MockIdGenerator implements IdGenerator {
  generateId(): string {
    return 'event-1234';
  }
}

describe('Institution Aggregate', () => {
  const clock = new MockClock();
  const idGen = new MockIdGenerator();
  const instId = InstitutionId.create('550e8400-e29b-41d4-a716-446655440001').getValue();
  const tenantId = TenantId.create('550e8400-e29b-41d4-a716-446655440002').getValue();

  it('should create a valid institution and generate InstitutionCreated', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();

    const instRes = Institution.create(instId, tenantId, name, code, clock, idGen);
    expect(instRes.isSuccess).toBe(true);

    const inst = instRes.getValue();
    expect(inst.name.value).toBe('IMSS');
    expect(inst.code.value).toBe('IMSS-01');
    expect(inst.status.isActive()).toBe(true);
    expect(inst.tenantId.equals(tenantId)).toBe(true);

    const events = inst.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(InstitutionCreated);
    expect(events[0]!.eventId).toBe('event-1234');
    expect(events[0]!.metadata.tenantId).toBe(tenantId.toString());
  });

  it('should fail with invalid name', () => {
    const nameRes = InstitutionName.create('');
    expect(nameRes.isFailure).toBe(true);
  });

  it('should fail with invalid code', () => {
    const codeRes = InstitutionCode.create('invalid code!');
    expect(codeRes.isFailure).toBe(true);
  });

  it('should suspend and generate InstitutionSuspended', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();
    inst.pullDomainEvents();

    const suspendRes = inst.suspend(clock, idGen);
    expect(suspendRes.isSuccess).toBe(true);
    expect(inst.status.isSuspended()).toBe(true);

    const events = inst.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(InstitutionSuspended);
  });

  it('should reject double suspension', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();

    inst.suspend(clock, idGen);
    inst.pullDomainEvents();
    const prevUpdatedAt = inst.updatedAt.getTime();

    const suspendRes = inst.suspend(clock, idGen);
    expect(suspendRes.isFailure).toBe(true);
    expect(suspendRes.error!).toBeInstanceOf(InvalidInstitutionOperationError);
    expect(inst.updatedAt.getTime()).toBe(prevUpdatedAt);

    const events = inst.pullDomainEvents();
    expect(events.length).toBe(0); // No event generated
  });

  it('should reactivate a suspended institution', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();

    inst.suspend(clock, idGen);
    inst.pullDomainEvents();

    const reactivateRes = inst.reactivate(clock, idGen);
    expect(reactivateRes.isSuccess).toBe(true);
    expect(inst.status.isActive()).toBe(true);

    const events = inst.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(InstitutionReactivated);
  });

  it('should reject invalid reactivation on active institution', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();
    inst.pullDomainEvents();

    const reactivateRes = inst.reactivate(clock, idGen);
    expect(reactivateRes.isFailure).toBe(true);
    expect(inst.pullDomainEvents().length).toBe(0);
  });

  it('should rename with a different name', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();
    inst.pullDomainEvents();

    const newName = InstitutionName.create('DIF').getValue();
    const renameRes = inst.rename(newName, clock, idGen);
    expect(renameRes.isSuccess).toBe(true);
    expect(inst.name.value).toBe('DIF');

    const events = inst.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(InstitutionRenamed);
    expect((events[0] as InstitutionRenamed).oldName).toBe('IMSS');
    expect((events[0] as InstitutionRenamed).newName).toBe('DIF');
  });

  it('should reject renaming to the same name', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();
    inst.pullDomainEvents();

    const newName = InstitutionName.create('IMSS').getValue();
    const renameRes = inst.rename(newName, clock, idGen);
    expect(renameRes.isFailure).toBe(true);
    expect(inst.pullDomainEvents().length).toBe(0);
  });

  it('should reject operations on archived institution', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();

    inst.archive(clock, idGen);
    expect(inst.status.isArchived()).toBe(true);

    const suspendRes = inst.suspend(clock, idGen);
    expect(suspendRes.isFailure).toBe(true);

    const reactivateRes = inst.reactivate(clock, idGen);
    expect(reactivateRes.isFailure).toBe(true);

    const renameRes = inst.rename(InstitutionName.create('DIF').getValue(), clock, idGen);
    expect(renameRes.isFailure).toBe(true);
  });

  it('should not mutate internal dates if returned dates are mutated', () => {
    const name = InstitutionName.create('IMSS').getValue();
    const code = InstitutionCode.create('IMSS-01').getValue();
    const inst = Institution.create(instId, tenantId, name, code, clock, idGen).getValue();

    const createdAtCopy = inst.createdAt;
    createdAtCopy.setFullYear(2030);

    // The internal date should still be 2026
    expect(inst.createdAt.getFullYear()).toBe(2026);
  });
});
