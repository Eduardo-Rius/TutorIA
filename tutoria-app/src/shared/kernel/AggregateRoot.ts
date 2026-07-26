import { Entity } from './Entity';
import { EntityId } from '../ids/EntityId';
import { DomainEvent } from '../events/DomainEvent';

export abstract class AggregateRoot<TId extends EntityId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
