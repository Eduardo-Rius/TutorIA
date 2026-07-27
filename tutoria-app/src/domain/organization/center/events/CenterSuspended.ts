import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class CenterSuspended extends DomainEvent {
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
    super(eventId, 'CenterSuspended', '1.0', occurredOn, aggregateId, 'Center', metadata);
  }
}
