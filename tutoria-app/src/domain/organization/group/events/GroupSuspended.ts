import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class GroupSuspended extends DomainEvent {
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
    super(eventId, 'GroupSuspended', '1.0', occurredOn, aggregateId, 'Group', metadata);
  }
}
