import { describe, it, expect } from 'vitest';
import { Tenant } from '../Tenant';
import { TenantName, InvalidTenantNameError } from '../value-objects/TenantName';
import { TenantId } from '../../../shared/value-objects/Ids';
import { Clock } from '../../../shared/kernel/Clock';
import { TenantCreated } from '../events/TenantCreated';
import { TenantSuspended } from '../events/TenantSuspended';
import { TenantReactivated } from '../events/TenantReactivated';
import { TenantRenamed } from '../events/TenantRenamed';
import { InvalidTenantOperationError } from '../Tenant';

class MockClock implements Clock {
  now(): Date {
    return new Date('2026-01-01T12:00:00Z');
  }
}

describe('Tenant Aggregate', () => {
  const clock = new MockClock();
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should create a valid tenant', () => {
    const idRes = TenantId.create(validUUID);
    const nameRes = TenantName.create('IMSS');

    expect(idRes.isSuccess).toBe(true);
    expect(nameRes.isSuccess).toBe(true);

    const tenantRes = Tenant.create(idRes.getValue(), nameRes.getValue(), clock);
    expect(tenantRes.isSuccess).toBe(true);

    const tenant = tenantRes.getValue();
    expect(tenant.name.value).toBe('IMSS');
    expect(tenant.status.isActive()).toBe(true);
    expect(tenant.createdAt.toISOString()).toBe('2026-01-01T12:00:00.000Z');

    const events = tenant.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(TenantCreated);
  });

  it('should fail with empty name', () => {
    const nameRes = TenantName.create('   ');
    expect(nameRes.isFailure).toBe(true);
    expect(nameRes.error).toBeInstanceOf(InvalidTenantNameError);
  });

  it('should allow suspension', () => {
    const id = TenantId.create(validUUID).getValue();
    const name = TenantName.create('IMSS').getValue();
    const tenant = Tenant.create(id, name, clock).getValue();
    tenant.pullDomainEvents(); // clear creation event

    const suspendRes = tenant.suspend(clock);
    expect(suspendRes.isSuccess).toBe(true);
    expect(tenant.status.isSuspended()).toBe(true);

    const events = tenant.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(TenantSuspended);
  });

  it('should reject double suspension', () => {
    const id = TenantId.create(validUUID).getValue();
    const name = TenantName.create('IMSS').getValue();
    const tenant = Tenant.create(id, name, clock).getValue();

    tenant.suspend(clock);
    const suspendRes = tenant.suspend(clock); // Second time

    expect(suspendRes.isFailure).toBe(true);
    expect(suspendRes.error).toBeInstanceOf(InvalidTenantOperationError);
  });

  it('should allow reactivation after suspension', () => {
    const id = TenantId.create(validUUID).getValue();
    const name = TenantName.create('IMSS').getValue();
    const tenant = Tenant.create(id, name, clock).getValue();

    tenant.suspend(clock);
    tenant.pullDomainEvents();

    const reactivateRes = tenant.reactivate(clock);
    expect(reactivateRes.isSuccess).toBe(true);
    expect(tenant.status.isActive()).toBe(true);

    const events = tenant.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(TenantReactivated);
  });

  it('should reject invalid reactivation', () => {
    const id = TenantId.create(validUUID).getValue();
    const name = TenantName.create('IMSS').getValue();
    const tenant = Tenant.create(id, name, clock).getValue();

    // Already active
    const reactivateRes = tenant.reactivate(clock);
    expect(reactivateRes.isFailure).toBe(true);
    expect(reactivateRes.error).toBeInstanceOf(InvalidTenantOperationError);
  });

  it('should allow renaming with a different name', () => {
    const id = TenantId.create(validUUID).getValue();
    const name = TenantName.create('IMSS').getValue();
    const tenant = Tenant.create(id, name, clock).getValue();
    tenant.pullDomainEvents();

    const newName = TenantName.create('DIF').getValue();
    const renameRes = tenant.rename(newName, clock);

    expect(renameRes.isSuccess).toBe(true);
    expect(tenant.name.value).toBe('DIF');

    const events = tenant.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(TenantRenamed);
    expect((events[0] as TenantRenamed).oldName).toBe('IMSS');
    expect((events[0] as TenantRenamed).newName).toBe('DIF');
  });

  it('should reject renaming to the exact same name', () => {
    const id = TenantId.create(validUUID).getValue();
    const name = TenantName.create('IMSS').getValue();
    const tenant = Tenant.create(id, name, clock).getValue();

    const newName = TenantName.create('IMSS').getValue();
    const renameRes = tenant.rename(newName, clock);

    expect(renameRes.isFailure).toBe(true);
    expect(renameRes.error).toBeInstanceOf(InvalidTenantOperationError);
  });
});
