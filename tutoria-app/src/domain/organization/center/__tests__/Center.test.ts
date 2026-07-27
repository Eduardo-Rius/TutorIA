import { describe, it, expect } from 'vitest';
import { Center } from '../Center';
import { CenterName } from '../value-objects/CenterName';
import { CenterCode } from '../value-objects/CenterCode';
import { CenterId, InstitutionId, TenantId } from '../../../../shared/value-objects/Ids';
import { Clock } from '../../../../shared/kernel/Clock';
import { IdGenerator } from '../../shared/IdGenerator';
import { CenterCreated } from '../events/CenterCreated';
import { CenterSuspended } from '../events/CenterSuspended';
import { CenterReactivated } from '../events/CenterReactivated';
import { CenterClosed } from '../events/CenterClosed';
import { CenterRenamed } from '../events/CenterRenamed';
import { InvalidCenterOperationError } from '../errors/InvalidCenterOperationError';

class MockClock implements Clock {
  now(): Date {
    return new Date('2026-01-01T12:00:00Z');
  }
}

class MockIdGenerator implements IdGenerator {
  generateId(): string {
    return 'event-center-123';
  }
}

describe('Center Aggregate', () => {
  const clock = new MockClock();
  const idGen = new MockIdGenerator();
  const centerId = CenterId.create('550e8400-e29b-41d4-a716-446655440003').getValue();
  const instId = InstitutionId.create('550e8400-e29b-41d4-a716-446655440001').getValue();
  const tenantId = TenantId.create('550e8400-e29b-41d4-a716-446655440002').getValue();

  it('should create a valid center and generate CenterCreated', () => {
    const name = CenterName.create('Guarderia 001').getValue();
    const code = CenterCode.create('U-001').getValue();

    const centerRes = Center.create(centerId, tenantId, instId, name, code, clock, idGen);
    expect(centerRes.isSuccess).toBe(true);

    const center = centerRes.getValue();
    expect(center.name.value).toBe('Guarderia 001');
    expect(center.code.value).toBe('U-001');
    expect(center.status.isActive()).toBe(true);
    expect(center.tenantId.equals(tenantId)).toBe(true);
    expect(center.institutionId.equals(instId)).toBe(true);

    const events = center.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(CenterCreated);
    expect(events[0]!.eventId).toBe('event-center-123');
    expect(events[0]!.metadata.tenantId).toBe(tenantId.toString());
  });

  it('should suspend and generate CenterSuspended', () => {
    const name = CenterName.create('Guarderia 001').getValue();
    const code = CenterCode.create('U-001').getValue();
    const center = Center.create(centerId, tenantId, instId, name, code, clock, idGen).getValue();
    center.pullDomainEvents();

    const suspendRes = center.suspend(clock, idGen);
    expect(suspendRes.isSuccess).toBe(true);
    expect(center.status.isSuspended()).toBe(true);

    const events = center.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0]!).toBeInstanceOf(CenterSuspended);
  });

  it('should reject double suspension', () => {
    const name = CenterName.create('Guarderia 001').getValue();
    const code = CenterCode.create('U-001').getValue();
    const center = Center.create(centerId, tenantId, instId, name, code, clock, idGen).getValue();
    center.suspend(clock, idGen);
    center.pullDomainEvents();

    const suspendRes = center.suspend(clock, idGen);
    expect(suspendRes.isFailure).toBe(true);
    expect(suspendRes.error!).toBeInstanceOf(InvalidCenterOperationError);
  });

  it('should reactivate a suspended center', () => {
    const name = CenterName.create('Guarderia 001').getValue();
    const code = CenterCode.create('U-001').getValue();
    const center = Center.create(centerId, tenantId, instId, name, code, clock, idGen).getValue();
    center.suspend(clock, idGen);
    center.pullDomainEvents();

    const reactivateRes = center.reactivate(clock, idGen);
    expect(reactivateRes.isSuccess).toBe(true);
    expect(center.status.isActive()).toBe(true);
  });

  it('should reject reactivation of an active center', () => {
    const name = CenterName.create('Guarderia 001').getValue();
    const code = CenterCode.create('U-001').getValue();
    const center = Center.create(centerId, tenantId, instId, name, code, clock, idGen).getValue();

    const reactivateRes = center.reactivate(clock, idGen);
    expect(reactivateRes.isFailure).toBe(true);
  });

  it('should close the center and prevent further modifications', () => {
    const name = CenterName.create('Guarderia 001').getValue();
    const code = CenterCode.create('U-001').getValue();
    const center = Center.create(centerId, tenantId, instId, name, code, clock, idGen).getValue();
    center.pullDomainEvents();

    const closeRes = center.close(clock, idGen);
    expect(closeRes.isSuccess).toBe(true);
    expect(center.status.isClosed()).toBe(true);
    expect(center.pullDomainEvents()[0]).toBeInstanceOf(CenterClosed);

    const suspendRes = center.suspend(clock, idGen);
    expect(suspendRes.isFailure).toBe(true);

    const reactivateRes = center.reactivate(clock, idGen);
    expect(reactivateRes.isFailure).toBe(true);

    const renameRes = center.rename(CenterName.create('New Name').getValue(), clock, idGen);
    expect(renameRes.isFailure).toBe(true);
  });

  it('should not mutate internal dates if returned dates are mutated', () => {
    const name = CenterName.create('Guarderia 001').getValue();
    const code = CenterCode.create('U-001').getValue();
    const center = Center.create(centerId, tenantId, instId, name, code, clock, idGen).getValue();
    
    const createdAtCopy = center.createdAt;
    createdAtCopy.setFullYear(2030);

    expect(center.createdAt.getFullYear()).toBe(2026);
  });
});
