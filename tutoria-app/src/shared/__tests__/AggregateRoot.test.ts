import { describe, it, expect } from 'vitest';
import { Entity } from '../kernel/Entity';
import { TenantId } from '../value-objects/Ids';
import { AggregateRoot } from '../kernel/AggregateRoot';
import { DomainEvent } from '../events/DomainEvent';

class TestEntity extends Entity<TenantId> {
  public constructor(id: TenantId) {
    super(id);
  }
}

class TestEvent extends DomainEvent {
  constructor(aggregateId: string) {
    super("ev1", "TestEvent", "1.0", aggregateId, "TestAggregate", { tenantId: "t1", timestamp: new Date() });
  }
}

class TestAggregate extends AggregateRoot<TenantId> {
  public constructor(id: TenantId) {
    super(id);
  }
  public doSomething() {
    this.addDomainEvent(new TestEvent(this.id.toString()));
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
    const id = TenantId.restore("550e8400-e29b-41d4-a716-446655440000");
    const agg = new TestAggregate(id);
    agg.doSomething();
    const events = agg.domainEvents;
    // events should be a copy (readonly array type) but let's verify runtime mutation doesn't affect internal array
    (events as any).push({}); 
    expect(agg.domainEvents.length).toBe(1);
  });

  it('should extract and clean events', () => {
    const id = TenantId.restore("550e8400-e29b-41d4-a716-446655440000");
    const agg = new TestAggregate(id);
    agg.doSomething();
    agg.doSomething();
    
    expect(agg.domainEvents.length).toBe(2);
    const extracted = agg.pullDomainEvents();
    expect(extracted.length).toBe(2);
    expect(agg.domainEvents.length).toBe(0);
  });
});
