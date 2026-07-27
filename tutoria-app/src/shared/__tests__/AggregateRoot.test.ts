import { describe, it, expect } from 'vitest';
import { Entity } from '../kernel/Entity';
import { TenantId } from '../value-objects/Ids';
import { AggregateRoot } from '../kernel/AggregateRoot';
import { DomainEvent } from '../events/DomainEvent';
import { Clock } from '../kernel/Clock';

class FixedClock implements Clock {
  now(): Date {
    return new Date('2026-01-01T00:00:00Z');
  }
}

class TestEntity extends Entity<TenantId> {
  public constructor(id: TenantId) {
    super(id);
  }
}

class TestEvent extends DomainEvent {
  constructor(aggregateId: string, occurredOn: Date) {
    super("ev1", "TestEvent", "1.0", occurredOn, aggregateId, "TestAggregate", { tenantId: "t1", timestamp: occurredOn });
  }
}

class TestAggregate extends AggregateRoot<TenantId> {
  public constructor(id: TenantId) {
    super(id);
  }
  public doSomething(clock: Clock) {
    this.addDomainEvent(new TestEvent(this.id.toString(), clock.now()));
  }
}

describe('Entity and AggregateRoot', () => {
  it('should evaluate equality based on ID', () => {
    const id = TenantId.restore("550e8400-e29b-41d4-a716-446655440000");
    const e1 = new TestEntity(id);
    const e2 = new TestEntity(id);
    expect(e1.equals(e2)).toBe(true);
  });

  it('events should not be modifiable externally', () => {
    const clock = new FixedClock();
    const id = TenantId.restore("550e8400-e29b-41d4-a716-446655440000");
    const agg = new TestAggregate(id);
    agg.doSomething(clock);
    const events = agg.domainEvents;

    // We try to push to the array, which should fail if it is frozen or a copy.
    // In our implementation, getter returns a copy, so the internal array is safe.
    try {
      (events as unknown as Array<unknown>).push({});
    } catch (e) {
      // Ignored
    }

    expect(agg.domainEvents.length).toBe(1);
  });

  it('should extract and clean events', () => {
    const clock = new FixedClock();
    const id = TenantId.restore("550e8400-e29b-41d4-a716-446655440000");
    const agg = new TestAggregate(id);
    agg.doSomething(clock);
    agg.doSomething(clock);

    expect(agg.domainEvents.length).toBe(2);
    const extracted = agg.pullDomainEvents();
    expect(extracted.length).toBe(2);

    // Verifying time determinism
    expect(extracted[0]?.occurredOn.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(extracted[1]?.occurredOn.toISOString()).toBe('2026-01-01T00:00:00.000Z');

    expect(agg.domainEvents.length).toBe(0);
  });
});
