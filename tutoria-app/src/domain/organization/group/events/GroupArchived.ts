import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class GroupArchived extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'GroupArchived', '1.0', occurredOn, aggregateId, 'Group', metadata);
  }
}
